import { auth } from "@/auth";
import {
  collectionRepo,
  folderRepo,
  documentRepo,
} from "@/db/repositories";
import type { CollectionData, FolderData, DocumentData } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";
import { uuidv7 } from "uuidv7";
import type {
  ExtractedSyllabus,
  CreateStructureRequest,
  CreateStructureResponse,
  WeekItemType,
} from "@/app/(protected)/open/onboarding/_types/syllabus";

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateStructureResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { status: "error", error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: CreateStructureRequest = await request.json();
    const { syllabus, syllabusStoragePath } = body;

    if (!syllabus || !syllabus.moduleName) {
      return NextResponse.json(
        { status: "error", error: "Syllabus data with moduleName is required" },
        { status: 400 }
      );
    }

    // Get existing collections count for position
    const existingCollections = await collectionRepo.findAll(session.user.id);
    const collectionPosition = existingCollections.length;

    // 1. Create Collection
    const collectionData: CollectionData = {
      name: syllabus.moduleName,
      position: collectionPosition,
      syllabus: syllabus, // Store full syllabus data
    };

    const collection = await collectionRepo.create(
      session.user.id,
      collectionData,
      uuidv7()
    );
    const collectionId = collection.id;

    // 2. Create Folders for each week
    const folderIds: string[] = [];
    for (let i = 0; i < syllabus.weeks.length; i++) {
      const week = syllabus.weeks[i];
      const folderId = uuidv7();

      const folderData: FolderData = {
        name: `Week ${week.weekNumber}: ${week.title}`,
        position: i,
      };

      await folderRepo.create(session.user.id, collectionId, folderData, folderId);
      folderIds.push(folderId);
    }

    // 3. Create Documents
    let docPosition = 0;

    // Root docs: Syllabus PDF (if uploaded)
    if (syllabusStoragePath) {
      const syllabusDocId = uuidv7();
      const syllabusDocData: DocumentData = {
        name: "Syllabus",
        type: "document",
        label: "syllabus",
        storagePath: syllabusStoragePath,
        position: docPosition++,
        isPlaceholder: false,
      };
      await documentRepo.create(
        session.user.id,
        collectionId,
        syllabusDocData,
        null,
        syllabusDocId
      );
    }

    // Create Assignment Folders (instead of root documents)
    const assignmentFolderIds: string[] = [];
    for (let i = 0; i < syllabus.assignments.length; i++) {
      const assignment = syllabus.assignments[i];
      const assignmentFolderId = uuidv7();
      assignmentFolderIds.push(assignmentFolderId);

      // Create assignment folder with type, deadline, and weighting
      const assignmentFolderData: FolderData = {
        name: assignment.title,
        position: folderIds.length + i, // After week folders
        type: "assignment",
        ...(assignment.dueDate && { deadline: assignment.dueDate }),
        ...(assignment.weighting !== undefined && {
          weighting: assignment.weighting,
        }),
      };

      await folderRepo.create(
        session.user.id,
        collectionId,
        assignmentFolderData,
        assignmentFolderId
      );

      // Create notes document inside the assignment folder
      const pageNotes = formatAssignmentNotes(assignment);
      const assignmentNotesDocId = uuidv7();

      const assignmentNotesDocData: DocumentData = {
        name: "Assignment Brief",
        type: "notes",
        label: "assignment",
        position: 0,
        isPlaceholder: false,
        pageNotes,
      };

      await documentRepo.create(
        session.user.id,
        collectionId,
        assignmentNotesDocData,
        assignmentFolderId,
        assignmentNotesDocId
      );
    }

    // Root docs: Syllabus-level readings
    if (syllabus.readings) {
      for (let i = 0; i < syllabus.readings.length; i++) {
        const reading = syllabus.readings[i];
        const readingDocId = uuidv7();

        const readingDocData: DocumentData = {
          name: reading.title,
          type: "document",
          label: "reading",
          position: docPosition++,
          isPlaceholder: true,
        };

        await documentRepo.create(
          session.user.id,
          collectionId,
          readingDocData,
          null,
          readingDocId
        );
      }
    }

    // Folder docs: Week items
    for (let weekIndex = 0; weekIndex < syllabus.weeks.length; weekIndex++) {
      const week = syllabus.weeks[weekIndex];
      const folderId = folderIds[weekIndex];

      if (week.items) {
        for (let itemIndex = 0; itemIndex < week.items.length; itemIndex++) {
          const item = week.items[itemIndex];
          const itemDocId = uuidv7();

          const { docType, label, isPlaceholder } = getDocTypeForWeekItem(
            item.type
          );

          const itemDocData: DocumentData = {
            name: item.title,
            type: docType,
            label,
            position: itemIndex,
            isPlaceholder,
          };

          await documentRepo.create(
            session.user.id,
            collectionId,
            itemDocData,
            folderId,
            itemDocId
          );
        }
      }
    }

    return NextResponse.json({
      status: "success",
      collectionId,
    });
  } catch (error) {
    console.error("Error creating syllabus structure:", error);
    return NextResponse.json(
      { status: "error", error: "Failed to create structure" },
      { status: 500 }
    );
  }
}

function getDocTypeForWeekItem(itemType: WeekItemType): {
  docType: "document" | "notes";
  label: string;
  isPlaceholder: boolean;
} {
  switch (itemType) {
    case "lecture":
      return { docType: "document", label: "slides", isPlaceholder: true };
    case "seminar":
    case "lab":
    case "recitation":
      return { docType: "notes", label: "notes", isPlaceholder: false };
    case "reading":
      return { docType: "document", label: "reading", isPlaceholder: true };
    default:
      return { docType: "notes", label: "notes", isPlaceholder: false };
  }
}

function formatAssignmentNotes(assignment: {
  title: string;
  description?: string;
  dueDate?: string;
  weighting?: number;
  type?: string;
}): string {
  const lines: string[] = [];

  lines.push(`# ${assignment.title}`);
  lines.push("");

  if (assignment.description) {
    lines.push(assignment.description);
    lines.push("");
  }

  if (assignment.dueDate || assignment.weighting || assignment.type) {
    lines.push("## Details");
    lines.push("");
    if (assignment.dueDate) {
      lines.push(`**Due Date:** ${assignment.dueDate}`);
    }
    if (assignment.weighting) {
      lines.push(`**Weighting:** ${assignment.weighting}%`);
    }
    if (assignment.type) {
      lines.push(`**Type:** ${assignment.type}`);
    }
  }

  return lines.join("\n");
}
