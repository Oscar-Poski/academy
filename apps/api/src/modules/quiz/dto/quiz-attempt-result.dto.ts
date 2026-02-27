export interface QuizAttemptResultDto {
  attemptId: string;
  userId: string;
  sectionId: string;
  sectionVersionId: string;
  attemptNo: number;
  score: number;
  maxScore: number;
  passed: boolean;
  submittedAt: string;
  feedback: Array<{
    questionId: string;
    isCorrect: boolean;
    awardedPoints: number;
    expectedOption: string;
    selectedOption: string | null;
    explanation: string | null;
  }>;
}
