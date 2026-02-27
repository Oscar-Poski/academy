export interface QuizSubmissionDto {
  answers: Array<{
    question_id: string;
    selected_option?: string;
    answer_text?: string;
  }>;
}
