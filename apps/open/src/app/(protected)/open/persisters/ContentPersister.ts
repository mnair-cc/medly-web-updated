import { nextApiClient } from "@/app/_lib/utils/axiosHelper";
import { Collection, Folder, Document } from "@/app/types/content";

export class ContentPersister {
  async saveCollection(collection: Partial<Collection>, isNew = false): Promise<void> {
    if (isNew || !collection.id) {
      await nextApiClient.post("/open/collections", collection);
    } else {
      await nextApiClient.put(`/open/collections/${collection.id}`, collection);
    }
  }

  async saveFolder(folder: Partial<Folder>, isNew = false): Promise<void> {
    if (isNew || !folder.id) {
      await nextApiClient.post("/open/folders", folder);
    } else {
      await nextApiClient.put(`/open/folders/${folder.id}`, folder);
    }
  }

  async saveDocument(document: Partial<Document>, isNew = false): Promise<void> {
    if (isNew || !document.id) {
      await nextApiClient.post("/open/documents", document);
    } else {
      await nextApiClient.put(`/open/documents/${document.id}`, document);
    }
  }

  async saveCollectionWithDocument(
    collection: Partial<Collection>,
    document: Partial<Document>
  ): Promise<void> {
    await Promise.all([
      this.saveCollection(collection, true),
      this.saveDocument(document, true),
    ]);
  }

  async updateDocumentPosition(
    documentId: string,
    collectionId: string,
    folderId: string | null,
    position: number
  ): Promise<void> {
    await nextApiClient.put(`/open/documents/${documentId}`, {
      collectionId,
      folderId,
      position,
    });
  }

  async updateFolderPosition(folderId: string, position: number): Promise<void> {
    await nextApiClient.put(`/open/folders/${folderId}`, {
      position,
    });
  }

  async updateCollectionPosition(collectionId: string, position: number): Promise<void> {
    await nextApiClient.put(`/open/collections/${collectionId}`, {
      position,
    });
  }

  async renameCollection(collectionId: string, newName: string): Promise<void> {
    await nextApiClient.put(`/open/collections/${collectionId}`, { name: newName });
  }

  async renameFolder(folderId: string, newName: string): Promise<void> {
    await nextApiClient.put(`/open/folders/${folderId}`, { name: newName });
  }

  async updateFolder(
    folderId: string,
    updates: { name?: string; deadline?: string; weighting?: number; isExpanded?: boolean }
  ): Promise<void> {
    await nextApiClient.put(`/open/folders/${folderId}`, updates);
  }

  async renameDocument(documentId: string, newName: string): Promise<void> {
    await nextApiClient.put(`/open/documents/${documentId}`, { name: newName });
  }

  async deleteDocument(documentId: string): Promise<void> {
    await nextApiClient.delete(`/open/documents/${documentId}`);
  }

  async deleteFolder(folderId: string): Promise<void> {
    await nextApiClient.delete(`/open/folders/${folderId}`);
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await nextApiClient.delete(`/open/collections/${collectionId}`);
  }

  async batchUpdatePositions(updates: {
    collections?: Array<{ id: string; position: number }>;
    folders?: Array<{ id: string; position: number }>;
    documents?: Array<{ id: string; position: number; collectionId?: string; folderId?: string | null }>;
  }): Promise<void> {
    const promises: Promise<void>[] = [];

    if (updates.collections) {
      for (const item of updates.collections) {
        promises.push(this.updateCollectionPosition(item.id, item.position));
      }
    }

    if (updates.folders) {
      for (const item of updates.folders) {
        promises.push(this.updateFolderPosition(item.id, item.position));
      }
    }

    if (updates.documents) {
      for (const item of updates.documents) {
        if (item.collectionId !== undefined && item.folderId !== undefined) {
          promises.push(
            this.updateDocumentPosition(item.id, item.collectionId, item.folderId, item.position)
          );
        } else {
          promises.push(
            nextApiClient.put(`/open/documents/${item.id}`, { position: item.position })
          );
        }
      }
    }

    await Promise.all(promises);
  }
}
