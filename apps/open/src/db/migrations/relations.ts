import { relations } from "drizzle-orm/relations";
import { openPlatformUser, openPlatformFolder, openPlatformCollection, openPlatformDocument, openPlatformChatThread } from "./schema";

export const openPlatformFolderRelations = relations(openPlatformFolder, ({one, many}) => ({
	openPlatformUser: one(openPlatformUser, {
		fields: [openPlatformFolder.userId],
		references: [openPlatformUser.id]
	}),
	openPlatformCollection: one(openPlatformCollection, {
		fields: [openPlatformFolder.collectionId],
		references: [openPlatformCollection.id]
	}),
	openPlatformDocuments: many(openPlatformDocument),
}));

export const openPlatformUserRelations = relations(openPlatformUser, ({many}) => ({
	openPlatformFolders: many(openPlatformFolder),
	openPlatformDocuments: many(openPlatformDocument),
	openPlatformChatThreads: many(openPlatformChatThread),
	openPlatformCollections: many(openPlatformCollection),
}));

export const openPlatformCollectionRelations = relations(openPlatformCollection, ({one, many}) => ({
	openPlatformFolders: many(openPlatformFolder),
	openPlatformDocuments: many(openPlatformDocument),
	openPlatformChatThreads: many(openPlatformChatThread),
	openPlatformUser: one(openPlatformUser, {
		fields: [openPlatformCollection.userId],
		references: [openPlatformUser.id]
	}),
}));

export const openPlatformDocumentRelations = relations(openPlatformDocument, ({one}) => ({
	openPlatformUser: one(openPlatformUser, {
		fields: [openPlatformDocument.userId],
		references: [openPlatformUser.id]
	}),
	openPlatformCollection: one(openPlatformCollection, {
		fields: [openPlatformDocument.collectionId],
		references: [openPlatformCollection.id]
	}),
	openPlatformFolder: one(openPlatformFolder, {
		fields: [openPlatformDocument.folderId],
		references: [openPlatformFolder.id]
	}),
}));

export const openPlatformChatThreadRelations = relations(openPlatformChatThread, ({one}) => ({
	openPlatformUser: one(openPlatformUser, {
		fields: [openPlatformChatThread.userId],
		references: [openPlatformUser.id]
	}),
	openPlatformCollection: one(openPlatformCollection, {
		fields: [openPlatformChatThread.collectionId],
		references: [openPlatformCollection.id]
	}),
}));