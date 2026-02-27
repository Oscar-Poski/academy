export interface InsufficientCreditsErrorDto {
  code: 'insufficient_credits';
  message: 'Insufficient credits';
  required: number;
  balance: number;
}
