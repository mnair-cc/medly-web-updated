import { useState, useCallback, useEffect, useRef } from 'react';
import { uuidv7 } from "uuidv7";
import { Collection, Folder, Document, CollectionContent } from '@/app/types/content';
import { ContentFetcher } from '../fetchers/ContentFetcher';
import { ContentPersister } from '../persisters/ContentPersister';
import { suggestDocumentParentLocation } from '../utils/documentHelpers';

interface PendingUpdate {
  type: 'collection' | 'folder' | 'document';
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
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch content');
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
        // Group updates by type and ID, keeping only the newest
        const groupedUpdates = pendingUpdates.reduce(
          (acc, update) => {
            const key = `${update.type}:${update.id}`;
            const existing = acc[key];
            if (!existing || update.timestamp >= existing.timestamp) {
              acc[key] = update;
            }
            return acc;
          },
          {} as Record<string, PendingUpdate>
        );

        // Prepare batch updates
        const batchUpdates: {
          collections?: Array<{ id: string; position: number }>;
          folders?: Array<{ id: string; position: number }>;
          documents?: Array<{ id: string; position: number; collectionId?: string; folderId?: string | null }>;
        } = {};

        for (const update of Object.values(groupedUpdates)) {
          if (update.type === 'collection' && 'position' in update.data) {
            if (!batchUpdates.collections) batchUpdates.collections = [];
            batchUpdates.collections.push({
              id: update.id,
              position: update.data.position as number,
            });
          } else if (update.type === 'folder' && 'position' in update.data) {
            if (!batchUpdates.folders) batchUpdates.folders = [];
            batchUpdates.folders.push({
              id: update.id,
              position: update.data.position as number,
            });
          } else if (update.type === 'document') {
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
        console.error('Error saving content updates:', error);
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
    [folders, documents]
  );

  // Get all documents in a folder
  const getFolderDocuments = useCallback(
    (folderId: string): Document[] => {
      return documents
        .filter((d) => d.folderId === folderId)
        .sort((a, b) => a.position - b.position);
    },
    [documents]
  );

  // Move a document to a new location
  const moveDocument = useCallback(
    (
      docId: string,
      targetCollectionId: string,
      targetFolderId: string | null,
      newPosition: number
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
              d.folderId === targetFolderId
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
                d.id !== docId
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
              type: 'document' as const,
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
            type: 'document' as const,
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
    []
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
              type: 'document' as const,
              id: d.id,
              data: { position: d.position },
              timestamp: Date.now(),
            })),
        ]);

        return updated;
      });
    },
    []
  );

  // Update positions for mixed folder/document order
  const updateMixedOrder = useCallback(
    (collectionId: string, orderedIds: string[]) => {
      const folderIdSet = new Set(folders.filter(f => f.collectionId === collectionId).map(f => f.id));
      const documentIdSet = new Set(documents.filter(d => d.collectionId === collectionId && d.folderId === null).map(d => d.id));

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
            .filter((f) => f.collectionId === collectionId && orderedIds.includes(f.id))
            .map((f) => ({
              type: 'folder' as const,
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
            .filter((d) => d.collectionId === collectionId && d.folderId === null && orderedIds.includes(d.id))
            .map((d) => ({
              type: 'document' as const,
              id: d.id,
              data: { position: d.position },
              timestamp: Date.now(),
            })),
        ]);

        return updated;
      });
    },
    [folders, documents]
  );

  // Add a new collection
  const addCollection = useCallback(async (name: string, color?: string, icon?: string) => {
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

    // Create default "Getting started" folder
    const gettingStartedFolder: Folder = {
      id: uuidv7(),
      collectionId: newCollection.id,
      name: 'Getting started',
      position: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Create default "Intro to Medly" document inside the folder
    const defaultDocument: Document = {
      id: uuidv7(),
      collectionId: newCollection.id,
      folderId: gettingStartedFolder.id,
      name: 'Intro to Medly',
      position: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      thumbnailUrl: 'https://firebasestorage.googleapis.com/v0/b/medly-staging.firebasestorage.app/o/public%2Fintro_to_medly_thumbnail.png?alt=media&token=8608bf5d-d6bb-4406-be16-1939faed6dcf',
      thumbnailPath: '',
      storageUrl: 'https://firebasestorage.googleapis.com/v0/b/medly-staging.firebasestorage.app/o/public%2Fmedly_pre_lecture.pdf?alt=media&token=b4506e5b-5be4-4006-89aa-6f0595e59d05',
      storagePath: '',
      originalUrl: '',
    };

    // Optimistically update UI
    setCollections((prev) => [...prev, newCollection]);
    setFolders((prev) => [...prev, gettingStartedFolder]);
    setDocuments((prev) => [...prev, defaultDocument]);

    // Save to Firebase
    try {
      await persisterRef.current.saveCollectionWithDocument(newCollection, defaultDocument);
      await persisterRef.current.saveFolder(gettingStartedFolder, true);
    } catch (error) {
      console.error('Error adding collection:', error);
      // Revert all on error
      setCollections((prev) => prev.filter((c) => c.id !== newCollection.id));
      setFolders((prev) => prev.filter((f) => f.id !== gettingStartedFolder.id));
      setDocuments((prev) => prev.filter((d) => d.id !== defaultDocument.id));
      throw error;
    }

    return newCollection;
  }, [collections.length]);

  // Rename a collection
  const renameCollection = useCallback(async (collectionId: string, newName: string) => {
    const oldName = collections.find(c => c.id === collectionId)?.name;
    if (!oldName) return;

    // Optimistically update UI
    setCollections((prev) =>
      prev.map((c) => c.id === collectionId ? { ...c, name: newName, updatedAt: Date.now() } : c)
    );

    try {
      await persisterRef.current.renameCollection(collectionId, newName);
    } catch (error) {
      console.error('Error renaming collection:', error);
      // Revert on error
      setCollections((prev) =>
        prev.map((c) => c.id === collectionId ? { ...c, name: oldName } : c)
      );
      throw error;
    }
  }, [collections]);

  // Rename a folder
  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    const oldName = folders.find(f => f.id === folderId)?.name;
    if (!oldName) return;

    // Optimistically update UI
    setFolders((prev) =>
      prev.map((f) => f.id === folderId ? { ...f, name: newName, updatedAt: Date.now() } : f)
    );

    try {
      await persisterRef.current.renameFolder(folderId, newName);
    } catch (error) {
      console.error('Error renaming folder:', error);
      // Revert on error
      setFolders((prev) =>
        prev.map((f) => f.id === folderId ? { ...f, name: oldName } : f)
      );
      throw error;
    }
  }, [folders]);

  // Rename a document
  const renameDocument = useCallback(async (documentId: string, newName: string) => {
    console.log('🔄 renameDocument called in useContentStructure:', { documentId, newName });
    const oldName = documents.find(d => d.id === documentId)?.name;
    console.log('📋 Current document name:', oldName);

    if (!oldName) {
      console.warn('❌ Document not found in documents array:', documentId);
      return;
    }

    // Optimistically update UI
    console.log('🔄 Optimistically updating UI');
    setDocuments((prev) =>
      prev.map((d) => d.id === documentId ? { ...d, name: newName, updatedAt: Date.now() } : d)
    );

    try {
      console.log('💾 Calling persisterRef.current.renameDocument');
      await persisterRef.current.renameDocument(documentId, newName);
      console.log('✅ Document renamed successfully');
    } catch (error) {
      console.error('❌ Error renaming document:', error);
      // Revert on error
      setDocuments((prev) =>
        prev.map((d) => d.id === documentId ? { ...d, name: oldName } : d)
      );
      throw error;
    }
  }, [documents]);

  // Group two documents into a new folder at the collection root
  const groupDocumentsIntoFolder = useCallback(async (
    targetDocumentId: string,
    draggedDocumentId: string,
    collectionId: string,
    insertIndex: number
  ) => {
    const timestamp = Date.now();
    const newFolderId = uuidv7();
    const newFolder: Folder = {
      id: newFolderId,
      collectionId,
      name: 'New folder',
      position: insertIndex,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Capture previous states for potential rollback
    const prevDocs = documents;
    const targetDocPrev = documents.find(d => d.id === targetDocumentId);
    const draggedDocPrev = documents.find(d => d.id === draggedDocumentId);
    if (!targetDocPrev || !draggedDocPrev) {
      throw new Error('Documents not found to group');
    }

    // Optimistically add folder
    setFolders((prev) => [...prev, newFolder]);

    // Move documents under new folder with defined order: target first, then dragged
    setDocuments((prev) => {
      const updatedDocs = prev.map((d) => {
        if (d.id === targetDocumentId) {
          return { ...d, folderId: newFolderId, collectionId, position: 0, updatedAt: timestamp };
        }
        if (d.id === draggedDocumentId) {
          return { ...d, folderId: newFolderId, collectionId, position: 1, updatedAt: timestamp };
        }
        return d;
      });

      // If dragged document came from a folder, re-sequence that folder's remaining documents
      if (draggedDocPrev.folderId !== null) {
        const oldFolderId = draggedDocPrev.folderId;
        const oldCollectionId = draggedDocPrev.collectionId;
        const remainingOldFolderDocs = updatedDocs
          .filter(d => d.collectionId === oldCollectionId && d.folderId === oldFolderId && d.id !== draggedDocumentId)
          .sort((a, b) => a.position - b.position);

        remainingOldFolderDocs.forEach((doc, idx) => {
          const idxInAll = updatedDocs.findIndex(d => d.id === doc.id);
          if (idxInAll !== -1) {
            updatedDocs[idxInAll] = { ...updatedDocs[idxInAll], position: idx };
          }
        });

        // Queue updates for those re-sequenced documents
        setPendingUpdates((prevPending) => ([
          ...prevPending,
          ...remainingOldFolderDocs.map((doc, idx) => ({
            type: 'document' as const,
            id: doc.id,
            data: { position: idx },
            timestamp,
          })),
        ]));
      }

      return updatedDocs;
    });

    // Queue updates for debounced save
    setPendingUpdates((prev) => [
      ...prev,
      {
        type: 'document',
        id: targetDocumentId,
        data: { position: 0, collectionId, folderId: newFolderId },
        timestamp,
      },
      {
        type: 'document',
        id: draggedDocumentId,
        data: { position: 1, collectionId, folderId: newFolderId },
        timestamp,
      },
    ]);

    try {
      // Persist folder creation immediately (force POST)
      await persisterRef.current.saveFolder(newFolder, true);
    } catch (error) {
      console.error('Error creating folder:', error);
      // Rollback optimistic changes
      setFolders((prev) => prev.filter((f) => f.id !== newFolderId));
      setDocuments(prevDocs);
      throw error;
    }

    return newFolder;
  }, [documents, setDocuments, setFolders]);

  // Upload a document with PDF file
  const uploadDocument = useCallback(async (
    file: File,
    selectedCollection: string | null,
    overrides?: { collectionId?: string; folderId?: string | null; position?: number }
  ) => {
    try {
      // Use "New Document" initially - title will be updated after PDF loads
      const title = "New Document";
      const defaultParent = suggestDocumentParentLocation(
        collections,
        folders,
        selectedCollection
      );
      const collectionId = overrides?.collectionId ?? defaultParent.collectionId;
      const folderId = overrides?.folderId !== undefined ? overrides.folderId : defaultParent.folderId;

      // Get documents in target location to determine position
      const targetDocs = documents.filter(
        (d) => d.collectionId === collectionId && d.folderId === folderId
      );
      const position = typeof overrides?.position === 'number' ? overrides.position : targetDocs.length;

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
        // No storageUrl yet - will be added by API
      };

      // Optimistically add document to UI
      setDocuments((prev) => [...prev, tempDocument]);

      // Upload file via API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('collectionId', collectionId);
      if (folderId) formData.append('folderId', folderId);
      formData.append('name', title);
      formData.append('position', position.toString());

      const response = await fetch('/api/open/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadedDocument = await response.json();

      // Replace temporary document with real one
      setDocuments((prev) =>
        prev.map((d) => (d.id === tempDocument.id ? {
          id: uploadedDocument.id,
          collectionId: uploadedDocument.collectionId,
          folderId: uploadedDocument.folderId,
          name: uploadedDocument.name,
          storageUrl: uploadedDocument.storageUrl,
          storagePath: uploadedDocument.storagePath,
          thumbnailUrl: uploadedDocument.thumbnailUrl,
          thumbnailPath: uploadedDocument.thumbnailPath,
          position: uploadedDocument.position,
          createdAt: uploadedDocument.createdAt,
          updatedAt: uploadedDocument.updatedAt,
        } : d))
      );

      return uploadedDocument;
    } catch (error) {
      console.error('Error uploading document:', error);
      // Remove temporary document on error
      setDocuments((prev) => prev.filter((d) => !d.id.startsWith('temp-')));
      throw error;
    }
  }, [collections, folders, documents]);

  // Delete a document
  const deleteDocument = useCallback(async (documentId: string): Promise<Document | null> => {
    const documentToDelete = documents.find(d => d.id === documentId);
    if (!documentToDelete) {
      console.warn('Document not found:', documentId);
      return null;
    }

    // Optimistically remove from UI
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));

    try {
      await persisterRef.current.deleteDocument(documentId);
      console.log('Document deleted successfully:', documentId);
      return documentToDelete;
    } catch (error) {
      console.error('Error deleting document:', error);
      // Revert on error
      setDocuments((prev) => [...prev, documentToDelete]);
      throw error;
    }
  }, [documents]);

  // Delete a folder and all documents within it
  const deleteFolder = useCallback(async (folderId: string) => {
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete) {
      console.warn('Folder not found:', folderId);
      return;
    }

    // Find all documents in this folder
    const documentsInFolder = documents.filter(d => d.folderId === folderId);

    // Optimistically remove folder and documents from UI
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setDocuments((prev) => prev.filter((d) => d.folderId !== folderId));

    try {
      await persisterRef.current.deleteFolder(folderId);
      console.log('Folder and contents deleted successfully:', folderId);
    } catch (error) {
      console.error('Error deleting folder:', error);
      // Revert on error
      setFolders((prev) => [...prev, folderToDelete]);
      setDocuments((prev) => [...prev, ...documentsInFolder]);
      throw error;
    }
  }, [folders, documents]);

  // Delete a collection and all folders and documents within it
  const deleteCollection = useCallback(async (collectionId: string) => {
    const collectionToDelete = collections.find(c => c.id === collectionId);
    if (!collectionToDelete) {
      console.warn('Collection not found:', collectionId);
      return;
    }

    // Find all folders and documents in this collection
    const foldersInCollection = folders.filter(f => f.collectionId === collectionId);
    const documentsInCollection = documents.filter(d => d.collectionId === collectionId);

    // Optimistically remove collection, folders, and documents from UI
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
    setFolders((prev) => prev.filter((f) => f.collectionId !== collectionId));
    setDocuments((prev) => prev.filter((d) => d.collectionId !== collectionId));

    try {
      await persisterRef.current.deleteCollection(collectionId);
      console.log('Collection and contents deleted successfully:', collectionId);
    } catch (error) {
      console.error('Error deleting collection:', error);
      // Revert on error
      setCollections((prev) => [...prev, collectionToDelete]);
      setFolders((prev) => [...prev, ...foldersInCollection]);
      setDocuments((prev) => [...prev, ...documentsInCollection]);
      throw error;
    }
  }, [collections, folders, documents]);

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
    renameDocument,
    deleteDocument,
    deleteFolder,
    deleteCollection,
    groupDocumentsIntoFolder,
    uploadDocument,
  };
}
