export interface UnlockDecisionDto {
  moduleId: string;
  isUnlocked: boolean;
  reasons: string[];
  requiresCredits: boolean;
  creditsCost: number;
}
