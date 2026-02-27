-- CreateEnum
CREATE TYPE "XpEventType" AS ENUM ('section_complete', 'quiz_pass', 'streak', 'manual');

-- CreateEnum
CREATE TYPE "XpSourceType" AS ENUM ('section', 'quiz_attempt', 'system', 'manual');

-- CreateTable
CREATE TABLE "xp_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" "XpEventType" NOT NULL,
    "source_type" "XpSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "xp_delta" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_levels" (
    "user_id" TEXT NOT NULL,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_levels_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xp_events_idempotency_key_key" ON "xp_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "xp_events_user_id_created_at_idx" ON "xp_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "xp_events_event_type_created_at_idx" ON "xp_events"("event_type", "created_at");

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
