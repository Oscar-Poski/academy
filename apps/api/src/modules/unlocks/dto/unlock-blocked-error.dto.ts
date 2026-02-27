export interface UnlockBlockedErrorDto {
  code: 'unlock_blocked';
  message: 'Module unlock prerequisites are not met';
  reasons: string[];
}
