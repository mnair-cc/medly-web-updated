import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Open Platform User - the root entity for all open platform data
export const openPlatformUser = pgTable(
  "open_platform_user",
  {
    id: uuid().primaryKey().notNull(),
    authProviderId: text("auth_provider_id").notNull(),
    data: jsonb().default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }),
  },
  (table) => [
    unique("open_platform_user_auth_provider_id_key").on(table.authProviderId),
  ],
);

// Open Platform Collection - groups of documents owned by a user
export const openPlatformCollection = pgTable(
  "open_platform_collection",
  {
    id: uuid().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    data: jsonb().default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }),
    authProviderId: text("auth_provider_id").notNull(),
  },
  (table) => [
    index("ix_open_platform_collection_auth_provider_id").using(
      "btree",
      table.authProviderId.asc().nullsLast().op("text_ops"),
    ),
    index("ix_open_platform_collection_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [openPlatformUser.id],
      name: "open_platform_collection_user_id_fkey",
    }).onDelete("cascade"),
  ],
);

// Open Platform Folder - organizes documents within a collection
export const openPlatformFolder = pgTable(
  "open_platform_folder",
  {
    id: uuid().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    collectionId: uuid("collection_id").notNull(),
    data: jsonb().default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }),
  },
  (table) => [
    index("ix_open_platform_folder_collection_id").using(
      "btree",
      table.collectionId.asc().nullsLast().op("uuid_ops"),
    ),
    index("ix_open_platform_folder_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [openPlatformUser.id],
      name: "open_platform_folder_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.collectionId],
      foreignColumns: [openPlatformCollection.id],
      name: "open_platform_folder_collection_id_fkey",
    }).onDelete("cascade"),
  ],
);

// Open Platform Document - user-uploaded documents
export const openPlatformDocument = pgTable(
  "open_platform_document",
  {
    id: uuid().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    collectionId: uuid("collection_id").notNull(),
    folderId: uuid("folder_id"),
    data: jsonb().default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }),
  },
  (table) => [
    index("ix_open_platform_document_collection_id").using(
      "btree",
      table.collectionId.asc().nullsLast().op("uuid_ops"),
    ),
    index("ix_open_platform_document_folder_id").using(
      "btree",
      table.folderId.asc().nullsLast().op("uuid_ops"),
    ),
    index("ix_open_platform_document_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [openPlatformUser.id],
      name: "open_platform_document_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.collectionId],
      foreignColumns: [openPlatformCollection.id],
      name: "open_platform_document_collection_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.folderId],
      foreignColumns: [openPlatformFolder.id],
      name: "open_platform_document_folder_id_fkey",
    }).onDelete("set null"),
  ],
);

// Open Platform Chat Thread - AI chat threads linked to collections/documents
export const openPlatformChatThread = pgTable(
  "open_platform_chat_thread",
  {
    id: uuid().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    data: jsonb().default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    collectionId: uuid("collection_id").notNull(),
    documentIds: uuid("document_ids").array(),
  },
  (table) => [
    index("ix_open_platform_chat_thread_collection_id").using(
      "btree",
      table.collectionId.asc().nullsLast().op("uuid_ops"),
    ),
    index("ix_open_platform_chat_thread_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [openPlatformUser.id],
      name: "open_platform_chat_message_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.collectionId],
      foreignColumns: [openPlatformCollection.id],
      name: "fk_op_chat_thread_collection_id",
    }).onDelete("cascade"),
  ],
);
