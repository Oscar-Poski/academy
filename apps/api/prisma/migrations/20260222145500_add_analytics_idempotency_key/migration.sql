-- AlterTable
ALTER TABLE "analytics_events"
ADD COLUMN "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "analytics_events_idempotency_key_key"
ON "analytics_events"("idempotency_key");
