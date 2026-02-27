export interface CompleteSectionGatingErrorDto {
  code: 'completion_blocked';
  reasons: string[];
  requiresQuizPass: boolean;
  requiresUnlock: boolean;
}
