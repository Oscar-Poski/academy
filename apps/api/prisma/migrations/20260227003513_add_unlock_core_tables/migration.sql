-- CreateEnum
CREATE TYPE "UnlockScopeType" AS ENUM ('path', 'module', 'section');

-- CreateEnum
CREATE TYPE "UnlockRuleType" AS ENUM ('prereq_sections', 'quiz_pass', 'credits', 'min_level');

-- CreateTable
CREATE TABLE "unlock_rules" (
    "id" TEXT NOT NULL,
    "scope_type" "UnlockScopeType" NOT NULL,
    "scope_id" TEXT NOT NULL,
    "rule_type" "UnlockRuleType" NOT NULL,
    "rule_config_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unlock_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_unlocks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope_type" "UnlockScopeType" NOT NULL,
    "scope_id" TEXT NOT NULL,
    "reason" TEXT,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unlock_rules_scope_type_scope_id_is_active_idx" ON "unlock_rules"("scope_type", "scope_id", "is_active");

-- CreateIndex
CREATE INDEX "unlock_rules_rule_type_idx" ON "unlock_rules"("rule_type");

-- CreateIndex
CREATE INDEX "unlock_rules_priority_idx" ON "unlock_rules"("priority");

-- CreateIndex
CREATE INDEX "user_unlocks_scope_type_scope_id_idx" ON "user_unlocks"("scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "user_unlocks_user_id_unlocked_at_idx" ON "user_unlocks"("user_id", "unlocked_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_unlocks_user_id_scope_type_scope_id_key" ON "user_unlocks"("user_id", "scope_type", "scope_id");

-- AddForeignKey
ALTER TABLE "user_unlocks" ADD CONSTRAINT "user_unlocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
