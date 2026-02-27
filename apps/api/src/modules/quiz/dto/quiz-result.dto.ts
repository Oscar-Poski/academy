export interface QuizResultDto {
  sectionId: string;
  hasAttempt: boolean;
  latestAttempt: {
    attemptId: string;
    attemptNo: number;
    sectionVersionId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    submittedAt: string;
  } | null;
}
