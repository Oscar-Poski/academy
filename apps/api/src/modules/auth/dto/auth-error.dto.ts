export interface AuthErrorDto {
  code: 'invalid_credentials' | 'unauthorized';
  message: string;
}
