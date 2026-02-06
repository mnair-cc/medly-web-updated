import { nextApiClient } from "@/app/_lib/utils/axiosHelper";
import { Collection, Folder, Document } from "@/app/types/content";

export class ContentFetcher {
  async fetchCollections(): Promise<Collection[]> {
    const response = await nextApiClient.get<Collection[]>("/open/collections");
    return response.data;
  }

  async fetchFolders(): Promise<Folder[]> {
    const response = await nextApiClient.get<Folder[]>("/open/folders");
    return response.data;
  }

  async fetchDocuments(): Promise<Document[]> {
    const response = await nextApiClient.get<Document[]>("/open/documents");
    return response.data;
  }

  async fetchAllContent(): Promise<{
    collections: Collection[];
    folders: Folder[];
    documents: Document[];
  }> {
    const [collections, folders, documents] = await Promise.all([
      this.fetchCollections(),
      this.fetchFolders(),
      this.fetchDocuments(),
    ]);

    return { collections, folders, documents };
  }
}
