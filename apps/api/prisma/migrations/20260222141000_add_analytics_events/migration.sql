-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "event_name" TEXT NOT NULL,
    "path_id" TEXT,
    "module_id" TEXT,
    "section_id" TEXT,
    "section_version_id" TEXT,
    "payload_json" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_event_name_occurred_at_idx"
ON "analytics_events"("event_name", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_occurred_at_idx"
ON "analytics_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_section_id_occurred_at_idx"
ON "analytics_events"("section_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_module_id_occurred_at_idx"
ON "analytics_events"("module_id", "occurred_at");
