-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('mcq', 'short_answer');

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "section_version_id" TEXT NOT NULL,
    "block_id" TEXT,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options_json" JSONB,
    "answer_key_json" JSONB NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "section_version_id" TEXT NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER NOT NULL,
    "max_score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "grading_details_json" JSONB NOT NULL,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempt_answers" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer_json" JSONB NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "awarded_points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quiz_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_section_version_id_sort_order_idx" ON "questions"("section_version_id", "sort_order");

-- CreateIndex
CREATE INDEX "questions_block_id_idx" ON "questions"("block_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_section_id_submitted_at_idx" ON "quiz_attempts"("user_id", "section_id", "submitted_at");

-- CreateIndex
CREATE INDEX "quiz_attempts_section_version_id_idx" ON "quiz_attempts"("section_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempts_user_id_section_id_attempt_no_key" ON "quiz_attempts"("user_id", "section_id", "attempt_no");

-- CreateIndex
CREATE INDEX "quiz_attempt_answers_attempt_id_idx" ON "quiz_attempt_answers"("attempt_id");

-- CreateIndex
CREATE INDEX "quiz_attempt_answers_question_id_idx" ON "quiz_attempt_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempt_answers_attempt_id_question_id_key" ON "quiz_attempt_answers"("attempt_id", "question_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_section_version_id_fkey" FOREIGN KEY ("section_version_id") REFERENCES "section_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "lesson_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_section_version_id_fkey" FOREIGN KEY ("section_version_id") REFERENCES "section_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
