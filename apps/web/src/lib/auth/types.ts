export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthApiError = {
  code: 'invalid_credentials' | 'unauthorized' | 'forbidden';
  message: string;
};

export type LoginApiResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
};

export type LoginRequestBody = {
  email: string;
  password: string;
};
