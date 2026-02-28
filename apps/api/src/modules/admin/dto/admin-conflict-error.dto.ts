export type PublishConflictReason =
  | 'target_not_draft'
  | 'empty_lesson_blocks'
  | 'quiz_required_but_missing_questions';

export interface AdminPublishConflictErrorDto {
  code: 'publish_conflict';
  message: 'Section version cannot be published';
  reason: PublishConflictReason;
  sectionId: string;
  versionId: string;
}
