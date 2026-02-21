-- CreateEnum
CREATE TYPE "SectionVersionStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "LessonBlockType" AS ENUM ('markdown', 'callout', 'code', 'quiz', 'checklist');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paths" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "path_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "credits_cost" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "has_quiz" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_versions" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "SectionVersionStatus" NOT NULL DEFAULT 'draft',
    "change_log" TEXT,
    "published_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_blocks" (
    "id" TEXT NOT NULL,
    "section_version_id" TEXT NOT NULL,
    "block_order" INTEGER NOT NULL,
    "block_type" "LessonBlockType" NOT NULL,
    "content_json" JSONB NOT NULL,
    "estimated_seconds" INTEGER,

    CONSTRAINT "lesson_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "paths_slug_key" ON "paths"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "modules_slug_key" ON "modules"("slug");

-- CreateIndex
CREATE INDEX "modules_path_id_idx" ON "modules"("path_id");

-- CreateIndex
CREATE UNIQUE INDEX "sections_slug_key" ON "sections"("slug");

-- CreateIndex
CREATE INDEX "sections_module_id_idx" ON "sections"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "section_versions_section_id_version_number_key" ON "section_versions"("section_id", "version_number");

-- CreateIndex
CREATE INDEX "section_versions_section_id_status_idx" ON "section_versions"("section_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "section_versions_one_published_per_section"
ON "section_versions" ("section_id")
WHERE "status" = 'published'::"SectionVersionStatus";

-- CreateIndex
CREATE UNIQUE INDEX "lesson_blocks_section_version_id_block_order_key" ON "lesson_blocks"("section_version_id", "block_order");

-- CreateIndex
CREATE INDEX "lesson_blocks_section_version_id_idx" ON "lesson_blocks"("section_version_id");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_versions" ADD CONSTRAINT "section_versions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_section_version_id_fkey" FOREIGN KEY ("section_version_id") REFERENCES "section_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
