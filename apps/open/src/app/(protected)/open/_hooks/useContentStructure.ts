import {
  Collection,
  CollectionContent,
  Document,
  Folder,
  SourceReference,
} from "@/app/(protected)/open/_types/content";
import { ContentFetcher } from "@/app/(protected)/open/fetchers/ContentFetcher";
import { ContentPersister } from "@/app/(protected)/open/persisters/ContentPersister";
import { suggestDocumentParentLocation } from "@/app/(protected)/open/_utils/documentHelpers";
import { useCallback, useEffect, useRef, useState } from "react";
import { uuidv7 } from "uuidv7";

interface PendingUpdate {
  type: "collection" | "folder" | "document";
  id: string;
  data: Partial<Collection> | Partial<Folder> | Partial<Document>;
  timestamp: number;
}

export function useContentStructure() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const persisterRef = useRef(new ContentPersister());
  const fetcherRef = useRef(new ContentFetcher());

  // Fetch data function (extracted for reuse)
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetcherRef.current.fetchAllContent();
      setCollections(data.collections);
      setFolders(data.folders);
      setDocuments(data.documents);
    } catch (err) {
      console.error("Error fetching content:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch content");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (pendingUpdates.length === 0) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Group updates by type and ID, merging data from all updates
        // This ensures that collectionId/folderId from moveDocument isn't overwritten
        // by a subsequent reorderDocuments call that only includes position
        const groupedUpdates = pendingUpdates.reduce(
          (acc, update) => {
            const key = `${update.type}:${update.id}`;
            const existing = acc[key];
            if (!existing) {
              acc[key] = update;
            } else {
              // Merge data, keeping existing values if new ones are undefined
              acc[key] = {
                ...existing,
                data: { ...existing.data, ...update.data },
                timestamp: Math.max(existing.timestamp, update.timestamp),
              };
            }
            return acc;
          },
          {} as Record<string, PendingUpdate>,
        );

        // Prepare batch updates
        const batchUpdates: {
          collections?: Array<{ id: string; position: number }>;
          folders?: Array<{ id: string; position: number }>;
          documents?: Array<{
            id: string;
            position: number;
            collectionId?: string;
            folderId?: string | null;
          }>;
        } = {};

        for (const update of Object.values(groupedUpdates)) {
          if (update.type === "collection" && "position" in update.data) {
            if (!batchUpdates.collections) batchUpdates.collections = [];
            batchUpdates.collections.push({
              id: update.id,
              position: update.data.position as number,
            });
          } else if (update.type === "folder" && "position" in update.data) {
            if (!batchUpdates.folders) batchUpdates.folders = [];
            batchUpdates.folders.push({
              id: update.id,
              position: update.data.position as number,
            });
          } else if (update.type === "document") {
            if (!batchUpdates.documents) batchUpdates.documents = [];
            const docData = update.data as Partial<Document>;
            batchUpdates.documents.push({
              id: update.id,
              position: docData.position ?? 0,
              collectionId: docData.collectionId,
              folderId: docData.folderId,
            });
          }
        }

        await persisterRef.current.batchUpdatePositions(batchUpdates);
        setPendingUpdates([]);
      } catch (error) {
        console.error("Error saving content updates:", error);
      }
    }, 200);
  }, [pendingUpdates]);

  useEffect(() => {
    debouncedSave();
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [debouncedSave]);

  // Get all content for a collection (folders + root documents)
  const getCollectionContent = useCallback(
    (collectionId: string): CollectionContent => {
      const collectionFolders = folders
        .filter((f) => f.collectionId === collectionId)
        .sort((a, b) => a.position - b.position);

      const rootDocuments = documents
        .filter((d) => d.collectionId === collectionId && d.folderId === null)
        .sort((a, b) => a.position - b.position);

      return {
        folders: collectionFolders,
        documents: rootDocuments,
      };
    },
    [folders, documents],
  );

  // Get all documents in a folder
  const getFolderDocuments = useCallback(
    (folderId: string): Document[] => {
      return documents
        .filter((d) => d.folderId === folderId)
        .sort((a, b) => a.position - b.position);
    },
    [documents],
  );

  // Move a document to a new location
  const moveDocument = useCallback(
    (
      docId: string,
      targetCollectionId: string,
      targetFolderId: string | null,
      newPosition: number,
    ) => {
      setDocuments((prev) => {
        const doc = prev.find((d) => d.id === docId);
        if (!doc) return prev;

        const oldCollectionId = doc.collectionId;
        const oldFolderId = doc.folderId;

        // Update the moved document
        const updatedDocs = prev.map((d) => {
          if (d.id === docId) {
            return {
              ...d,
              collectionId: targetCollectionId,
              folderId: targetFolderId,
              position: newPosition,
              updatedAt: Date.now(),
            };
          }
          return d;
        });

        // Recalculate positions in the target container
        const targetDocs = updatedDocs
          .filter(
            (d) =>
              d.collectionId === targetCollectionId &&
              d.folderId === targetFolderId,
          )
          .sort((a, b) => a.position - b.position);

        // Reassign sequential positions
        const reorderedDocs = updatedDocs.map((d) => {
          const targetIndex = targetDocs.findIndex((td) => td.id === d.id);
          if (targetIndex !== -1) {
            return { ...d, position: targetIndex };
          }
          return d;
        });

        // If moved from different container, recalculate old container positions
        if (
          oldCollectionId !== targetCollectionId ||
          oldFolderId !== targetFolderId
        ) {
          const oldDocs = reorderedDocs
            .filter(
              (d) =>
                d.collectionId === oldCollectionId &&
                d.folderId === oldFolderId &&
                d.id !== docId,
            )
            .sort((a, b) => a.position - b.position);

          const finalDocs = reorderedDocs.map((d) => {
            const oldIndex = oldDocs.findIndex((od) => od.id === d.id);
            if (oldIndex !== -1) {
              return { ...d, position: oldIndex };
            }
            return d;
          });

          // Queue updates for saving
          setPendingUpdates((prev) => [
            ...prev,
            ...finalDocs.map((d) => ({
              type: "document" as const,
              id: d.id,
              data: {
                position: d.position,
                collectionId: d.collectionId,
                folderId: d.folderId,
              },
              timestamp: Date.now(),
            })),
          ]);

          return finalDocs;
        }

        // Queue updates for saving
        setPendingUpdates((prev) => [
          ...prev,
          ...reorderedDocs.map((d) => ({
            type: "document" as const,
            id: d.id,
            data: {
              position: d.position,
              collectionId: d.collectionId,
              folderId: d.folderId,
            },
            timestamp: Date.now(),
          })),
        ]);

        return reorderedDocs;
      });
    },
    [],
  );

  // Reorder documents within the same container
  const reorderDocuments = useCallback(
    (containerId: string, orderedDocIds: string[], isFolder: boolean) => {
      setDocuments((prev) => {
        const updated = prev.map((d) => {
          const newIndex = orderedDocIds.indexOf(d.id);
          if (newIndex !== -1) {
            // Check if document belongs to this container
            const belongsToContainer = isFolder
              ? d.folderId === containerId
              : d.collectionId === containerId && d.folderId === null;

            if (belongsToContainer) {
              return { ...d, position: newIndex, updatedAt: Date.now() };
            }
          }
          return d;
        });

        // Queue updates for saving
        setPendingUpdates((prev) => [
          ...prev,
          ...updated
            .filter((d) => orderedDocIds.includes(d.id))
            .map((d) => ({
              type: "document" as const,
              id: d.id,
              data: { position: d.position },
              timestamp: Date.now(),
            })),
        ]);

        return updated;
      });
    },
    [],
  );

  // Update positions for mixed folder/document order
  const updateMixedOrder = useCallback(
    (collectionId: string, orderedIds: string[]) => {
      // Update folder positions
      setFolders((prev) => {
        const updated = prev.map((f) => {
          if (f.collectionId === collectionId) {
            const newIndex = orderedIds.indexOf(f.id);
            if (newIndex !== -1) {
              return { ...f, position: newIndex, updatedAt: Date.now() };
            }
          }
          return f;
        });

        // Queue updates for saving
        setPendingUpdates((prev) => [
          ...prev,
          ...updated
            .filter(
              (f) =>
                f.collectionId === collectionId && orderedIds.includes(f.id),
            )
            .map((f) => ({
              type: "folder" as const,
              id: f.id,
              data: { position: f.position },
              timestamp: Date.now(),
            })),
        ]);

        return updated;
      });

      // Update document positions
      setDocuments((prev) => {
        const updated = prev.map((d) => {
          if (d.collectionId === collectionId && d.folderId === null) {
            const newIndex = orderedIds.indexOf(d.id);
            if (newIndex !== -1) {
              return { ...d, position: newIndex, updatedAt: Date.now() };
            }
          }
          return d;
        });

        // Queue updates for saving
        setPendingUpdates((prev) => [
          ...prev,
          ...updated
            .filter(
              (d) =>
                d.collectionId === collectionId &&
                d.folderId === null &&
                orderedIds.includes(d.id),
            )
            .map((d) => ({
              type: "document" as const,
              id: d.id,
              data: { position: d.position },
              timestamp: Date.now(),
            })),
        ]);

        return updated;
      });
    },
    [folders, documents],
  );

  // Add a new collection
  const addCollection = useCallback(
    async (name: string, color?: string, icon?: string) => {
      const timestamp = Date.now();
      const newCollection: Collection = {
        id: uuidv7(),
        name,
        position: collections.length,
        primaryColor: color,
        icon,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // COMMENTED OUT: Default "Getting started" folder and "Intro to Medly" document
      // const gettingStartedFolder: Folder = {
      //   id: `folder-${timestamp}`,
      //   collectionId: newCollection.id,
      //   name: "Getting started",
      //   position: 0,
      //   createdAt: timestamp,
      //   updatedAt: timestamp,
      // };
      //
      // const defaultDocument: Document = {
      //   id: `document-${timestamp}`,
      //   collectionId: newCollection.id,
      //   folderId: gettingStartedFolder.id,
      //   name: "Intro to Medly",
      //   position: 0,
      //   createdAt: timestamp,
      //   updatedAt: timestamp,
      //   thumbnailUrl:
      //     "https://firebasestorage.googleapis.com/v0/b/medly-staging.firebasestorage.app/o/public%2Fintro_to_medly_thumbnail.png?alt=media&token=8608bf5d-d6bb-4406-be16-1939faed6dcf",
      //   thumbnailPath: "",
      //   storageUrl:
      //     "https://firebasestorage.googleapis.com/v0/b/medly-staging.firebasestorage.app/o/public%2Fmedly_pre_lecture.pdf?alt=media&token=b4506e5b-5be4-4006-89aa-6f0595e59d05",
      //   storagePath: "",
      //   originalUrl: "",
      // };

      // Optimistically update UI
      setCollections((prev) => [...prev, newCollection]);
      // setFolders((prev) => [...prev, gettingStartedFolder]);
      // setDocuments((prev) => [...prev, defaultDocument]);

      // Save to Firebase
      try {
        await persisterRef.current.saveCollection(newCollection, true);
        // await persisterRef.current.saveCollectionWithDocument(
        //   newCollection,
        //   defaultDocument,
        // );
        // await persisterRef.current.saveFolder(gettingStartedFolder, true);
      } catch (error) {
        console.error("Error adding collection:", error);
        // Revert on error
        setCollections((prev) => prev.filter((c) => c.id !== newCollection.id));
        // setFolders((prev) =>
        //   prev.filter((f) => f.id !== gettingStartedFolder.id),
        // );
        // setDocuments((prev) => prev.filter((d) => d.id !== defaultDocument.id));
        throw error;
      }

      return newCollection;
    },
    [collections.length],
  );

  // Rename a collection
  const renameCollection = useCallback(
    async (collectionId: string, newName: string) => {
      const oldName = collections.find((c) => c.id === collectionId)?.name;
      if (!oldName) return;

      // Optimistically update UI
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId
            ? { ...c, name: newName, updatedAt: Date.now() }
            : c,
        ),
      );

      try {
        await persisterRef.current.renameCollection(collectionId, newName);
      } catch (error) {
        console.error("Error renaming collection:", error);
        // Revert on error
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId ? { ...c, name: oldName } : c,
          ),
        );
        throw error;
      }
    },
    [collections],
  );

  // Rename a folder
  const renameFolder = useCallback(
    async (folderId: string, newName: string) => {
      const oldName = folders.find((f) => f.id === folderId)?.name;
      if (!oldName) return;

      // Optimistically update UI
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId
            ? { ...f, name: newName, updatedAt: Date.now() }
            : f,
        ),
      );

      try {
        await persisterRef.current.renameFolder(folderId, newName);
      } catch (error) {
        console.error("Error renaming folder:", error);
        // Revert on error
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? { ...f, name: oldName } : f)),
        );
        throw error;
      }
    },
    [folders],
  );

  // Add a new folder
  const addFolder = useCallback(
    async (
      collectionId: string,
      name: string,
      type?: "assignment",
      position?: number,
      deadline?: string,
      weighting?: number
    ) => {
      const timestamp = Date.now();
      const newFolderId = uuidv7();
      const existingFolders = folders.filter((f) => f.collectionId === collectionId);
      const newFolder: Folder = {
        id: newFolderId,
        collectionId,
        name,
        position: position ?? existingFolders.length,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(type && { type }),
        ...(deadline && { deadline }),
        ...(weighting !== undefined && { weighting }),
      };

      // Optimistic update
      setFolders((prev) => [...prev, newFolder]);

      try {
        await persisterRef.current.saveFolder(newFolder, true);
        return newFolder;
      } catch (error) {
        console.error("Error adding folder:", error);
        setFolders((prev) => prev.filter((f) => f.id !== newFolderId));
        throw error;
      }
    },
    [folders],
  );

  // Update a folder (name, deadline, weighting, isExpanded)
  const updateFolder = useCallback(
    async (
      folderId: string,
      updates: { name?: string; deadline?: string; weighting?: number; isExpanded?: boolean }
    ) => {
      const oldFolder = folders.find((f) => f.id === folderId);
      if (!oldFolder) return;

      // Optimistic update
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, ...updates, updatedAt: Date.now() } : f
        ),
      );

      try {
        await persisterRef.current.updateFolder(folderId, updates);
      } catch (error) {
        console.error("Error updating folder:", error);
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? oldFolder : f))
        );
        throw error;
      }
    },
    [folders],
  );

  // Toggle folder expansion state (fire-and-forget, no error handling needed)
  const setFolderExpanded = useCallback(
    (folderId: string, isExpanded: boolean) => {
      // Optimistic update only - fire and forget to backend
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, isExpanded } : f
        ),
      );
      // Fire and forget - don't await, don't handle errors
      persisterRef.current.updateFolder(folderId, { isExpanded }).catch(() => {
        // Silently ignore - expansion state is not critical
      });
    },
    [],
  );

  // Batch update folder expansion states (for collapse all except first)
  const setFoldersExpanded = useCallback(
    (updates: Array<{ folderId: string; isExpanded: boolean }>) => {
      // Optimistic update
      setFolders((prev) =>
        prev.map((f) => {
          const update = updates.find((u) => u.folderId === f.id);
          return update ? { ...f, isExpanded: update.isExpanded } : f;
        }),
      );
      // Fire and forget - persist each update
      updates.forEach(({ folderId, isExpanded }) => {
        persisterRef.current.updateFolder(folderId, { isExpanded }).catch(() => {
          // Silently ignore
        });
      });
    },
    [],
  );

  // Rename a document
  const renameDocument = useCallback(
    async (documentId: string, newName: string) => {
      console.log("🔄 renameDocument called in useContentStructure:", {
        documentId,
        newName,
      });
      const existingDoc = documents.find((d) => d.id === documentId);
      console.log("📋 Current document name:", existingDoc?.name);

      if (!existingDoc) {
        console.warn("❌ Document not found in documents array:", documentId);
        return;
      }
      const oldName = existingDoc.name;

      // Optimistically update UI
      console.log("🔄 Optimistically updating UI");
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === documentId
            ? { ...d, name: newName, updatedAt: Date.now() }
            : d,
        ),
      );

      try {
        console.log("💾 Calling persisterRef.current.renameDocument");
        await persisterRef.current.renameDocument(documentId, newName);
        console.log("✅ Document renamed successfully");
      } catch (error) {
        console.error("❌ Error renaming document:", error);
        // Revert on error
        setDocuments((prev) =>
          prev.map((d) => (d.id === documentId ? { ...d, name: oldName } : d)),
        );
        throw error;
      }
    },
    [documents],
  );

  // Group two documents into a new folder at the collection root
  const groupDocumentsIntoFolder = useCallback(
    async (
      targetDocumentId: string,
      draggedDocumentId: string,
      collectionId: string,
      insertIndex: number,
    ) => {
      const timestamp = Date.now();
      const newFolderId = uuidv7();
      const newFolder: Folder = {
        id: newFolderId,
        collectionId,
        name: "New folder",
        position: insertIndex,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Capture previous states for potential rollback
      const prevDocs = documents;
      const targetDocPrev = documents.find((d) => d.id === targetDocumentId);
      const draggedDocPrev = documents.find((d) => d.id === draggedDocumentId);
      if (!targetDocPrev || !draggedDocPrev) {
        throw new Error("Documents not found to group");
      }

      // Optimistically add folder
      setFolders((prev) => [...prev, newFolder]);

      // Move documents under new folder with defined order: target first, then dragged
      setDocuments((prev) => {
        const updatedDocs = prev.map((d) => {
          if (d.id === targetDocumentId) {
            return {
              ...d,
              folderId: newFolderId,
              collectionId,
              position: 0,
              updatedAt: timestamp,
            };
          }
          if (d.id === draggedDocumentId) {
            return {
              ...d,
              folderId: newFolderId,
              collectionId,
              position: 1,
              updatedAt: timestamp,
            };
          }
          return d;
        });

        // If dragged document came from a folder, re-sequence that folder's remaining documents
        if (draggedDocPrev.folderId !== null) {
          const oldFolderId = draggedDocPrev.folderId;
          const oldCollectionId = draggedDocPrev.collectionId;
          const remainingOldFolderDocs = updatedDocs
            .filter(
              (d) =>
                d.collectionId === oldCollectionId &&
                d.folderId === oldFolderId &&
                d.id !== draggedDocumentId,
            )
            .sort((a, b) => a.position - b.position);

          remainingOldFolderDocs.forEach((doc, idx) => {
            const idxInAll = updatedDocs.findIndex((d) => d.id === doc.id);
            if (idxInAll !== -1) {
              updatedDocs[idxInAll] = {
                ...updatedDocs[idxInAll],
                position: idx,
              };
            }
          });

          // Queue updates for those re-sequenced documents
          setPendingUpdates((prevPending) => [
            ...prevPending,
            ...remainingOldFolderDocs.map((doc, idx) => ({
              type: "document" as const,
              id: doc.id,
              data: { position: idx },
              timestamp,
            })),
          ]);
        }

        return updatedDocs;
      });

      // Queue updates for debounced save
      setPendingUpdates((prev) => [
        ...prev,
        {
          type: "document",
          id: targetDocumentId,
          data: { position: 0, collectionId, folderId: newFolderId },
          timestamp,
        },
        {
          type: "document",
          id: draggedDocumentId,
          data: { position: 1, collectionId, folderId: newFolderId },
          timestamp,
        },
      ]);

      try {
        // Persist folder creation immediately (force POST)
        await persisterRef.current.saveFolder(newFolder, true);
      } catch (error) {
        console.error("Error creating folder:", error);
        // Rollback optimistic changes
        setFolders((prev) => prev.filter((f) => f.id !== newFolderId));
        setDocuments(prevDocs);
        throw error;
      }

      return newFolder;
    },
    [documents, setDocuments, setFolders],
  );

  // Upload a document with PDF file
  const uploadDocument = useCallback(
    async (
      file: File,
      selectedCollection: string | null,
      overrides?: {
        collectionId?: string;
        folderId?: string | null;
        position?: number;
      },
    ) => {
      try {
        // Use "New Document" initially - title will be updated after PDF loads
        const title = "New Document";
        const defaultParent = suggestDocumentParentLocation(
          collections,
          folders,
          selectedCollection,
        );
        const collectionId =
          overrides?.collectionId ?? defaultParent.collectionId;
        const folderId =
          overrides?.folderId !== undefined
            ? overrides.folderId
            : defaultParent.folderId;

        // Get position for new document
        let position: number;
        if (typeof overrides?.position === "number") {
          position = overrides.position;
        } else if (folderId === null) {
          // Root level: count both folders and root documents in the collection
          const rootFolders = folders.filter((f) => f.collectionId === collectionId);
          const rootDocs = documents.filter(
            (d) => d.collectionId === collectionId && d.folderId === null,
          );
          position = rootFolders.length + rootDocs.length;
        } else {
          // Inside a folder: count only documents in that folder
          const folderDocs = documents.filter(
            (d) => d.collectionId === collectionId && d.folderId === folderId,
          );
          position = folderDocs.length;
        }

        // Create temporary document for optimistic update
        const timestamp = Date.now();
        const tempDocument: Document = {
          id: `temp-${timestamp}`,
          collectionId,
          folderId,
          name: title,
          position,
          createdAt: timestamp,
          updatedAt: timestamp,
          isLoading: true, // Document is loading during upload + AI organization
          // No storageUrl yet - will be added by API
        };

        // Optimistically add document to UI
        setDocuments((prev) => [...prev, tempDocument]);

        // Upload file via API
        const formData = new FormData();
        formData.append("file", file);
        formData.append("collectionId", collectionId);
        if (folderId) formData.append("folderId", folderId);
        formData.append("name", title);
        formData.append("position", position.toString());

        const response = await fetch("/api/open/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const uploadedDocument = await response.json();

        // Replace temporary document with real one (keep isLoading: true until AI finishes)
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === tempDocument.id
              ? {
                  id: uploadedDocument.id,
                  collectionId: uploadedDocument.collectionId,
                  folderId: uploadedDocument.folderId,
                  name: uploadedDocument.name,
                  storageUrl: uploadedDocument.storageUrl,
                  storagePath: uploadedDocument.storagePath,
                  thumbnailUrl: uploadedDocument.thumbnailUrl,
                  thumbnailPath: uploadedDocument.thumbnailPath,
                  position: uploadedDocument.position,
                  type: uploadedDocument.type,
                  label: uploadedDocument.label,
                  isPlaceholder: uploadedDocument.isPlaceholder,
                  isLoading: true, // Keep loading until AI organization completes
                  createdAt: uploadedDocument.createdAt,
                  updatedAt: uploadedDocument.updatedAt,
                  allPagesText: uploadedDocument.allPagesText,
                }
              : d,
          ),
        );

        return uploadedDocument;
      } catch (error) {
        console.error("Error uploading document:", error);
        // Remove temporary document on error
        setDocuments((prev) => prev.filter((d) => !d.id.startsWith("temp-")));
        throw error;
      }
    },
    [collections, folders, documents],
  );

  // Upload into an existing placeholder document
  const uploadIntoPlaceholder = useCallback(
    async (placeholderId: string, file: File): Promise<Document> => {
      const placeholder = documents.find((d) => d.id === placeholderId);
      if (!placeholder) {
        throw new Error("Placeholder document not found");
      }
      if (!placeholder.isPlaceholder) {
        throw new Error("Document is not a placeholder");
      }

      // Optimistically update: mark as no longer placeholder (will show loading state)
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === placeholderId
            ? { ...d, isPlaceholder: false, updatedAt: Date.now() }
            : d,
        ),
      );

      try {
        // Upload file via API
        const formData = new FormData();
        formData.append("file", file);
        formData.append("placeholderId", placeholderId);

        const response = await fetch("/api/open/documents/upload-into-placeholder", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const uploadedDocument = await response.json();

        // Replace placeholder with full document data
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === placeholderId
              ? {
                  ...d,
                  storageUrl: uploadedDocument.storageUrl,
                  storagePath: uploadedDocument.storagePath,
                  isPlaceholder: false,
                  updatedAt: uploadedDocument.updatedAt,
                  allPagesText: uploadedDocument.allPagesText,
                }
              : d,
          ),
        );

        return uploadedDocument;
      } catch (error) {
        console.error("Error uploading into placeholder:", error);
        // Revert: mark as placeholder again
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === placeholderId ? { ...d, isPlaceholder: true } : d,
          ),
        );
        throw error;
      }
    },
    [documents],
  );

  // Delete a document
  const deleteDocument = useCallback(
    async (documentId: string): Promise<Document | null> => {
      const documentToDelete = documents.find((d) => d.id === documentId);
      if (!documentToDelete) {
        console.warn("Document not found:", documentId);
        return null;
      }

      // Optimistically remove from UI
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));

      try {
        await persisterRef.current.deleteDocument(documentId);
        console.log("Document deleted successfully:", documentId);
        return documentToDelete;
      } catch (error) {
        console.error("Error deleting document:", error);
        // Revert on error
        setDocuments((prev) => [...prev, documentToDelete]);
        throw error;
      }
    },
    [documents],
  );

  // Delete a folder and all documents within it
  const deleteFolder = useCallback(
    async (folderId: string) => {
      const folderToDelete = folders.find((f) => f.id === folderId);
      if (!folderToDelete) {
        console.warn("Folder not found:", folderId);
        return;
      }

      // Find all documents in this folder
      const documentsInFolder = documents.filter(
        (d) => d.folderId === folderId,
      );

      // Optimistically remove folder and documents from UI
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setDocuments((prev) => prev.filter((d) => d.folderId !== folderId));

      try {
        await persisterRef.current.deleteFolder(folderId);
        console.log("Folder and contents deleted successfully:", folderId);
      } catch (error) {
        console.error("Error deleting folder:", error);
        // Revert on error
        setFolders((prev) => [...prev, folderToDelete]);
        setDocuments((prev) => [...prev, ...documentsInFolder]);
        throw error;
      }
    },
    [folders, documents],
  );

  // Delete a collection and all folders and documents within it
  const deleteCollection = useCallback(
    async (collectionId: string) => {
      const collectionToDelete = collections.find((c) => c.id === collectionId);
      if (!collectionToDelete) {
        console.warn("Collection not found:", collectionId);
        return;
      }

      // Find all folders and documents in this collection
      const foldersInCollection = folders.filter(
        (f) => f.collectionId === collectionId,
      );
      const documentsInCollection = documents.filter(
        (d) => d.collectionId === collectionId,
      );

      // Optimistically remove collection, folders, and documents from UI
      setCollections((prev) => prev.filter((c) => c.id !== collectionId));
      setFolders((prev) => prev.filter((f) => f.collectionId !== collectionId));
      setDocuments((prev) =>
        prev.filter((d) => d.collectionId !== collectionId),
      );

      try {
        await persisterRef.current.deleteCollection(collectionId);
        console.log(
          "Collection and contents deleted successfully:",
          collectionId,
        );
      } catch (error) {
        console.error("Error deleting collection:", error);
        // Revert on error
        setCollections((prev) => [...prev, collectionToDelete]);
        setFolders((prev) => [...prev, ...foldersInCollection]);
        setDocuments((prev) => [...prev, ...documentsInCollection]);
        throw error;
      }
    },
    [collections, folders, documents],
  );

  // Create a practice document linked to source(s)
  const createPracticeDocument = useCallback(
    async (
      sourceReferences: SourceReference[],
      collectionId: string,
      folderId: string | null,
      position: number,
      name: string,
    ): Promise<Document> => {
      const timestamp = Date.now();
      const tempId = `temp-practice-${timestamp}`;

      // Create temporary document for optimistic update
      const tempDocument: Document = {
        id: tempId,
        collectionId,
        folderId,
        name,
        position,
        type: "practice",
        label: "practice",
        sourceReferences,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Optimistically add document to UI
      setDocuments((prev) => [...prev, tempDocument]);

      try {
        // Create via API
        const response = await fetch("/api/open/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collectionId,
            folderId,
            name,
            position,
            type: "practice",
            label: "practice",
            sourceReferences,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create practice document");
        }

        const createdDocument = await response.json();

        // Replace temp document with real one
        const realDocument: Document = {
          id: createdDocument.id,
          collectionId: createdDocument.collectionId,
          folderId: createdDocument.folderId,
          name: createdDocument.name,
          position: createdDocument.position,
          type: createdDocument.type,
          label: createdDocument.label || "practice",
          sourceReferences: createdDocument.sourceReferences,
          createdAt: createdDocument.createdAt,
          updatedAt: createdDocument.updatedAt,
        };

        setDocuments((prev) =>
          prev.map((d) => (d.id === tempId ? realDocument : d)),
        );

        return realDocument;
      } catch (error) {
        console.error("Error creating practice document:", error);
        // Remove temp document on error
        setDocuments((prev) => prev.filter((d) => d.id !== tempId));
        throw error;
      }
    },
    [],
  );

  // Create a flashcard document linked to source(s)
  const createFlashcardDocument = useCallback(
    async (
      sourceReferences: SourceReference[],
      collectionId: string,
      folderId: string | null,
      position: number,
      name: string,
    ): Promise<Document> => {
      const timestamp = Date.now();
      const tempId = `temp-flashcards-${timestamp}`;

      // Create temporary document for optimistic update
      const tempDocument: Document = {
        id: tempId,
        collectionId,
        folderId,
        name,
        position,
        type: "flashcards",
        label: "flashcards",
        sourceReferences,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Optimistically add document to UI
      setDocuments((prev) => [...prev, tempDocument]);

      try {
        // Create via API
        const response = await fetch("/api/open/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collectionId,
            folderId,
            name,
            position,
            type: "flashcards",
            label: "flashcards",
            sourceReferences,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create flashcard document");
        }

        const createdDocument = await response.json();

        // Replace temp document with real one
        const realDocument: Document = {
          id: createdDocument.id,
          collectionId: createdDocument.collectionId,
          folderId: createdDocument.folderId,
          name: createdDocument.name,
          position: createdDocument.position,
          type: createdDocument.type,
          label: createdDocument.label || "flashcards",
          sourceReferences: createdDocument.sourceReferences,
          createdAt: createdDocument.createdAt,
          updatedAt: createdDocument.updatedAt,
        };

        setDocuments((prev) =>
          prev.map((d) => (d.id === tempId ? realDocument : d)),
        );

        return realDocument;
      } catch (error) {
        console.error("Error creating flashcard document:", error);
        // Remove temp document on error
        setDocuments((prev) => prev.filter((d) => d.id !== tempId));
        throw error;
      }
    },
    [],
  );

  // Create a notes document (optionally with source references)
  const createNotesDocument = useCallback(
    async (
      collectionId: string,
      folderId: string | null,
      position: number,
      name: string,
      sourceReferences?: SourceReference[],
    ): Promise<Document> => {
      const timestamp = Date.now();
      const tempId = `temp-notes-${timestamp}`;

      // Create temporary document for optimistic update
      const tempDocument: Document = {
        id: tempId,
        collectionId,
        folderId,
        name,
        position,
        type: "notes",
        sourceReferences,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Optimistically add document to UI
      setDocuments((prev) => [...prev, tempDocument]);

      try {
        // Create via API
        const response = await fetch("/api/open/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collectionId,
            folderId,
            name,
            position,
            type: "notes",
            sourceReferences,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create notes document");
        }

        const createdDocument = await response.json();

        // Replace temp document with real one
        const realDocument: Document = {
          id: createdDocument.id,
          collectionId: createdDocument.collectionId,
          folderId: createdDocument.folderId,
          name: createdDocument.name,
          position: createdDocument.position,
          type: createdDocument.type,
          sourceReferences: createdDocument.sourceReferences,
          createdAt: createdDocument.createdAt,
          updatedAt: createdDocument.updatedAt,
        };

        setDocuments((prev) =>
          prev.map((d) => (d.id === tempId ? realDocument : d)),
        );

        return realDocument;
      } catch (error) {
        console.error("Error creating notes document:", error);
        // Remove temp document on error
        setDocuments((prev) => prev.filter((d) => d.id !== tempId));
        throw error;
      }
    },
    [],
  );

  // Set loading state on a document (used by AI organization to clear loading after processing)
  const setDocumentLoading = useCallback(
    (documentId: string, loading: boolean) => {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === documentId ? { ...d, isLoading: loading } : d,
        ),
      );
    },
    [],
  );

  // Update lastViewedAt timestamp for a document
  const updateLastViewed = useCallback(
    async (documentId: string) => {
      const now = Date.now();
      // Optimistic update
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === documentId ? { ...d, lastViewedAt: now } : d,
        ),
      );
      // Persist to backend
      try {
        await fetch(`/api/open/documents/${documentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastViewedAt: now }),
        });
      } catch {
        // Fail silently - local state is already updated
      }
    },
    [],
  );

  return {
    collections,
    folders,
    documents,
    isLoading,
    error,
    refetch: fetchData,
    getCollectionContent,
    getFolderDocuments,
    moveDocument,
    reorderDocuments,
    updateMixedOrder,
    addCollection,
    renameCollection,
    renameFolder,
    addFolder,
    updateFolder,
    setFolderExpanded,
    setFoldersExpanded,
    renameDocument,
    deleteDocument,
    deleteFolder,
    deleteCollection,
    groupDocumentsIntoFolder,
    uploadDocument,
    uploadIntoPlaceholder,
    createPracticeDocument,
    createFlashcardDocument,
    createNotesDocument,
    setDocumentLoading,
    updateLastViewed,
  };
}
