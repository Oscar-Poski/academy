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
    questionType: 'mcq' | 'short_answer';
    isCorrect: boolean;
    awardedPoints: number;
    expectedOption: string | null;
    acceptedAnswers: string[] | null;
    expectedPattern: string | null;
    selectedOption: string | null;
    answerText: string | null;
    explanation: string | null;
  }>;
}
