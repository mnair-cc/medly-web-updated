import { auth } from "@/auth";
import { reorganizeFolders } from "@/app/(protected)/open/_ai/reorganizeFolders";
import { NextRequest, NextResponse } from "next/server";
import { documentRepo, folderRepo } from "@/db/repositories";

interface ReorganizeRequest {
  collectionId: string;
  collectionName: string;
  organizationPrompt?: string; // Optional custom prompt
}

/**
 * POST /api/open/documents/reorganize-collection
 * Reorganizes the entire folder structure of a collection using AI
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collectionId, collectionName, organizationPrompt } =
      (await request.json()) as ReorganizeRequest;

    console.log('[API Reorganize] Request received for collection:', collectionName);

    if (!collectionId || !collectionName) {
      return NextResponse.json(
        { error: "Missing collection information" },
        { status: 400 }
      );
    }

    // Get current folder structure (with user validation)
    console.log('[API Reorganize] Fetching data for collectionId:', collectionId);
    console.log('[API Reorganize] User ID:', session.user.id);

    const [folders, documents] = await Promise.all([
      folderRepo.findByCollectionId(session.user.id, collectionId),
      documentRepo.findByCollectionId(session.user.id, collectionId),
    ]);

    console.log('[API Reorganize] Raw data from DB:', {
      folders: folders.map(f => ({ id: f.id, name: f.name, type: f.type })),
      documents: documents.map(d => ({ id: d.id, name: d.name, folderId: d.folderId, collectionId: d.collectionId })),
    });

    console.log('[API Reorganize] Current structure:', {
      folders: folders.length,
      documents: documents.length,
    });

    // Group documents by folder
    const folderMap = new Map<string | null, typeof documents[0][]>();
    documents.forEach(doc => {
      const key = doc.folderId;
      if (!folderMap.has(key)) {
        folderMap.set(key, []);
      }
      folderMap.get(key)!.push(doc);
    });

    console.log('[API Reorganize] Folder map:', {
      nullFolder: folderMap.get(null)?.length || 0,
      folderIds: Array.from(folderMap.keys()),
    });

    // Build context for AI
    const context = {
      collectionName,
      folders: folders.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        documents: (folderMap.get(f.id) || []).map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          contentPreview: d.extractedText?.slice(0, 500),
        })),
      })),
      rootDocuments: (folderMap.get(null) || []).map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        contentPreview: d.extractedText?.slice(0, 500),
      })),
      organizationPrompt,
    };

    console.log('[API Reorganize] Context built:', {
      folderCount: context.folders.length,
      rootDocCount: context.rootDocuments.length,
      folders: context.folders.map(f => ({ name: f.name, docCount: f.documents.length })),
      rootDocs: context.rootDocuments.map(d => d.name),
    });

    // Get AI reorganization suggestion
    console.log('[API Reorganize] Calling AI with context...');
    const reorganized = await reorganizeFolders(context);

    console.log('[API Reorganize] AI suggested structure:', {
      folders: reorganized.folders.length,
      rootDocuments: reorganized.rootDocuments.length,
    });

    // Build the reorganization operations
    const operations = {
      // Folders to create (new folder names that don't exist)
      foldersToCreate: [] as string[],
      // Documents to move (documentId -> new folderId or null for root)
      documentsToMove: new Map<string, string | null>(),
      // Folders to delete (empty after reorganization)
      foldersToDelete: [] as string[],
    };

    // Map folder names to existing folder IDs
    const existingFoldersByName = new Map(
      folders.map(f => [f.name.toLowerCase(), f.id])
    );

    // Map of new folder names to their IDs (either existing or to be created)
    const folderNameToId = new Map<string, string>();

    // Process reorganized folders
    for (const folder of reorganized.folders) {
      let folderId: string;

      // Check if folder already exists (case-insensitive)
      const existingId = existingFoldersByName.get(folder.name.toLowerCase());
      if (existingId) {
        folderId = existingId;
        folderNameToId.set(folder.name, existingId);
      } else {
        // Need to create this folder
        operations.foldersToCreate.push(folder.name);
        // Generate a temporary ID for tracking (will be replaced by actual ID after creation)
        folderId = `new_${folder.name}`;
        folderNameToId.set(folder.name, folderId);
      }

      // Track document moves into this folder
      for (const doc of folder.documents) {
        operations.documentsToMove.set(doc.id, folderId);
      }
    }

    // Process root documents
    for (const doc of reorganized.rootDocuments) {
      operations.documentsToMove.set(doc.id, null);
    }

    // Identify folders that will be empty after reorganization
    const usedFolderIds = new Set<string>();
    operations.documentsToMove.forEach((folderId) => {
      if (folderId && !folderId.startsWith("new_")) {
        usedFolderIds.add(folderId);
      }
    });

    // Mark unused folders for deletion
    for (const folder of folders) {
      if (!usedFolderIds.has(folder.id) &&
          !Array.from(folderNameToId.values()).includes(folder.id)) {
        operations.foldersToDelete.push(folder.id);
      }
    }

    const response = {
      status: "success",
      reorganization: {
        structure: reorganized,
        operations: {
          foldersToCreate: operations.foldersToCreate,
          documentsToMove: Array.from(operations.documentsToMove.entries()).map(
            ([docId, folderId]) => ({ documentId: docId, targetFolderId: folderId })
          ),
          foldersToDelete: operations.foldersToDelete,
        },
      },
    };

    console.log('[API Reorganize] Final operations:', {
      foldersToCreate: response.reorganization.operations.foldersToCreate,
      documentsToMove: response.reorganization.operations.documentsToMove.length,
      foldersToDelete: response.reorganization.operations.foldersToDelete,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error reorganizing collection:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}