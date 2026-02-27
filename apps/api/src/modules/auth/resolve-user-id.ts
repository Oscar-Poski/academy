import type { AuthenticatedRequest } from './auth.types';

export function resolveUserIdFromRequest(
  request: AuthenticatedRequest,
  xUserIdHeader?: string
): string | undefined {
  if (request.user?.sub) {
    return request.user.sub;
  }

  if (typeof xUserIdHeader !== 'string') {
    return undefined;
  }

  const trimmed = xUserIdHeader.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
