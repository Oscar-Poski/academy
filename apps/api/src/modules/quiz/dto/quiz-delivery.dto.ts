export interface QuizDeliveryQuestionDto {
  id: string;
  type: 'mcq' | 'short_answer';
  prompt: string;
  options: string[] | null;
  points: number;
  sortOrder: number;
}

export interface QuizDeliveryDto {
  sectionId: string;
  sectionVersionId: string;
  questions: QuizDeliveryQuestionDto[];
}
