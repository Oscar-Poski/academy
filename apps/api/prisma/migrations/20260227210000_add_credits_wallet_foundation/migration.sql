-- CreateEnum
CREATE TYPE "CreditEventType" AS ENUM ('grant', 'spend', 'adjust');

-- CreateTable
CREATE TABLE "credit_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" "CreditEventType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credits" (
    "user_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credits_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_events_idempotency_key_key" ON "credit_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "credit_events_user_id_created_at_idx" ON "credit_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "credit_events_event_type_created_at_idx" ON "credit_events"("event_type", "created_at");

-- AddConstraint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_balance_non_negative" CHECK ("balance" >= 0);

-- AddForeignKey
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
