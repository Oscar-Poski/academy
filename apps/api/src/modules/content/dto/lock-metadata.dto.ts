export interface ContentLockMetadataDto {
  isLocked: boolean;
  reasons: string[];
  requiresCredits: boolean;
  creditsCost: number;
}
