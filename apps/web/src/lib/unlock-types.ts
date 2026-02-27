export type UnlockDecision = {
  moduleId: string;
  isUnlocked: boolean;
  reasons: string[];
  requiresCredits: boolean;
  creditsCost: number;
};
