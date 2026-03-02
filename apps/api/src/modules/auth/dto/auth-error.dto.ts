export interface AuthErrorDto {
  code:
    | 'invalid_credentials'
    | 'unauthorized'
    | 'forbidden'
    | 'email_in_use'
    | 'invalid_registration_input'
    | 'weak_password'
    | 'rate_limited';
  message: string;
}

export interface AuthRateLimitedErrorDto extends AuthErrorDto {
  code: 'rate_limited';
  retry_after_seconds: number;
}

export interface WeakPasswordErrorDto extends AuthErrorDto {
  code: 'weak_password';
}
