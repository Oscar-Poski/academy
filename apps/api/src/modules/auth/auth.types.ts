export interface AuthPrincipal {
  sub: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthPrincipal;
}
