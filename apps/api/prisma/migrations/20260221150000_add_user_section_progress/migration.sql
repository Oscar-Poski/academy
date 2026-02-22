-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('not_started', 'in_progress', 'completed');

-- CreateTable
CREATE TABLE "user_section_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "section_version_id" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'not_started',
    "started_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completion_pct" INTEGER NOT NULL DEFAULT 0,
    "last_block_order" INTEGER,
    "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_section_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_section_progress_user_id_section_id_key"
ON "user_section_progress"("user_id", "section_id");

-- CreateIndex
CREATE INDEX "user_section_progress_user_id_status_last_seen_at_idx"
ON "user_section_progress"("user_id", "status", "last_seen_at");

-- CreateIndex
CREATE INDEX "user_section_progress_section_id_idx"
ON "user_section_progress"("section_id");

-- CreateIndex
CREATE INDEX "user_section_progress_section_version_id_idx"
ON "user_section_progress"("section_version_id");

-- AddForeignKey
ALTER TABLE "user_section_progress"
ADD CONSTRAINT "user_section_progress_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_section_progress"
ADD CONSTRAINT "user_section_progress_section_id_fkey"
FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_section_progress"
ADD CONSTRAINT "user_section_progress_section_version_id_fkey"
FOREIGN KEY ("section_version_id") REFERENCES "section_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
