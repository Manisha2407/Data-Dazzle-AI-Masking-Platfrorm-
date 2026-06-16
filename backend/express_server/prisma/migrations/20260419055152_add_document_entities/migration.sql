/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "redaction_method" AS ENUM ('mask', 'hash', 'remove', 'fake');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('processing', 'complete', 'failed');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(10) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "original_file_path" VARCHAR(500) NOT NULL,
    "redacted_file_path" VARCHAR(500),
    "redaction_method" "redaction_method" NOT NULL,
    "status" "document_status" NOT NULL DEFAULT 'processing',
    "entity_counts" JSONB,
    "total_entities" INTEGER,
    "processing_time_ms" INTEGER,
    "confidence_threshold" INTEGER NOT NULL DEFAULT 70,
    "entity_types_selected" JSONB,
    "preserve_formatting" BOOLEAN NOT NULL DEFAULT false,
    "indexed_to_es" BOOLEAN NOT NULL DEFAULT false,
    "es_indexed_at" TIMESTAMP(3),
    "original_deleted" BOOLEAN NOT NULL DEFAULT false,
    "original_delete_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_entities" (
    "id" SERIAL NOT NULL,
    "document_id" INTEGER NOT NULL,
    "entity_text" VARCHAR(500) NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "start_pos" INTEGER NOT NULL,
    "end_pos" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_tracking" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "documents_user_id_idx" ON "documents"("user_id");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_original_delete_at_idx" ON "documents"("original_delete_at");

-- CreateIndex
CREATE INDEX "documents_created_at_idx" ON "documents"("created_at");

-- CreateIndex
CREATE INDEX "document_entities_document_id_idx" ON "document_entities"("document_id");

-- CreateIndex
CREATE INDEX "document_entities_entity_type_idx" ON "document_entities"("entity_type");

-- CreateIndex
CREATE INDEX "document_entities_document_id_entity_type_idx" ON "document_entities"("document_id", "entity_type");

-- CreateIndex
CREATE INDEX "upload_tracking_user_id_uploaded_at_idx" ON "upload_tracking"("user_id", "uploaded_at");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_entities" ADD CONSTRAINT "document_entities_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_tracking" ADD CONSTRAINT "upload_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
