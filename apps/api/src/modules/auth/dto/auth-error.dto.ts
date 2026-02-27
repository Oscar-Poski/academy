export interface AuthErrorDto {
  code: 'invalid_credentials' | 'unauthorized' | 'forbidden';
  message: string;
}
