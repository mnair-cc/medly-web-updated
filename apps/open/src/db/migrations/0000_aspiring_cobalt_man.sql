-- Baseline migration for open_platform tables
-- Made idempotent with IF NOT EXISTS for safe deployment on existing databases

-- Tables
CREATE TABLE IF NOT EXISTS "open_platform_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"auth_provider_id" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "open_platform_user_auth_provider_id_key" UNIQUE("auth_provider_id")
);

CREATE TABLE IF NOT EXISTS "open_platform_collection" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"auth_provider_id" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "open_platform_folder" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);

CREATE TABLE IF NOT EXISTS "open_platform_document" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"folder_id" uuid,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);

CREATE TABLE IF NOT EXISTS "open_platform_chat_thread" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"collection_id" uuid NOT NULL,
	"document_ids" uuid[]
);

-- Foreign keys (using DO blocks to check if they exist)
DO $$ BEGIN
	ALTER TABLE "open_platform_collection" ADD CONSTRAINT "open_platform_collection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."open_platform_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "open_platform_folder" ADD CONSTRAINT "open_platform_folder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."open_platform_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "open_platform_folder" ADD CONSTRAINT "open_platform_folder_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."open_platform_collection"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "open_platform_document" ADD CONSTRAINT "open_platform_document_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."open_platform_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "open_platform_document" ADD CONSTRAINT "open_platform_document_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."open_platform_collection"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "open_platform_document" ADD CONSTRAINT "open_platform_document_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."open_platform_folder"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "open_platform_chat_thread" ADD CONSTRAINT "open_platform_chat_message_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."open_platform_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "open_platform_chat_thread" ADD CONSTRAINT "fk_op_chat_thread_collection_id" FOREIGN KEY ("collection_id") REFERENCES "public"."open_platform_collection"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "ix_open_platform_collection_user_id" ON "open_platform_collection" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "ix_open_platform_collection_auth_provider_id" ON "open_platform_collection" USING btree ("auth_provider_id");
CREATE INDEX IF NOT EXISTS "ix_open_platform_folder_user_id" ON "open_platform_folder" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "ix_open_platform_folder_collection_id" ON "open_platform_folder" USING btree ("collection_id");
CREATE INDEX IF NOT EXISTS "ix_open_platform_document_user_id" ON "open_platform_document" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "ix_open_platform_document_collection_id" ON "open_platform_document" USING btree ("collection_id");
CREATE INDEX IF NOT EXISTS "ix_open_platform_document_folder_id" ON "open_platform_document" USING btree ("folder_id");
CREATE INDEX IF NOT EXISTS "ix_open_platform_chat_thread_user_id" ON "open_platform_chat_thread" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "ix_open_platform_chat_thread_collection_id" ON "open_platform_chat_thread" USING btree ("collection_id");
