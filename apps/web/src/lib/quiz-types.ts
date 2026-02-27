export type QuizQuestionType = 'mcq' | 'short_answer';

export type QuizDeliveryQuestion = {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options: string[] | null;
  points: number;
  sortOrder: number;
};

export type QuizDelivery = {
  sectionId: string;
  sectionVersionId: string;
  questions: QuizDeliveryQuestion[];
};

export type QuizSubmissionAnswer = {
  question_id: string;
  selected_option?: string;
  answer_text?: string;
};

export type QuizSubmissionRequest = {
  answers: QuizSubmissionAnswer[];
};

export type QuizAttemptFeedback = {
  questionId: string;
  questionType: QuizQuestionType;
  isCorrect: boolean;
  awardedPoints: number;
  expectedOption: string | null;
  acceptedAnswers: string[] | null;
  expectedPattern: string | null;
  selectedOption: string | null;
  answerText: string | null;
  explanation: string | null;
};

export type QuizAttemptResult = {
  attemptId: string;
  userId: string;
  sectionId: string;
  sectionVersionId: string;
  attemptNo: number;
  score: number;
  maxScore: number;
  passed: boolean;
  submittedAt: string;
  feedback: QuizAttemptFeedback[];
};
