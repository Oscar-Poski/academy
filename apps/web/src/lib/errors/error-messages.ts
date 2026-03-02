import type { AuthApiError } from '@/src/lib/auth/types';

type ErrorPayload = {
  code?: unknown;
  message?: unknown;
  retry_after_seconds?: unknown;
};

function readObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getRateLimitedSuffix(payload: ErrorPayload): string {
  if (payload.code !== 'rate_limited' || typeof payload.retry_after_seconds !== 'number') {
    return '';
  }
  return ` Try again in ${payload.retry_after_seconds} seconds.`;
}

export function getAuthErrorMessage(payload: AuthApiError | null, fallback: string): string {
  if (!payload) {
    return fallback;
  }
  return `${payload.message}${getRateLimitedSuffix(payload)}`;
}

export function getErrorMessageFromPayload(payload: unknown, fallback: string): string {
  const parsed = readObject(payload) as ErrorPayload | null;
  if (!parsed || typeof parsed.code !== 'string' || typeof parsed.message !== 'string') {
    return fallback;
  }
  return `${parsed.message}${getRateLimitedSuffix(parsed)}`;
}

export function getErrorMessageFromUnknown(error: unknown, fallback: string): string {
  const parsed = readObject(error);
  if (!parsed) {
    return fallback;
  }

  if ('payload' in parsed) {
    return getErrorMessageFromPayload(parsed.payload, fallback);
  }

  return getErrorMessageFromPayload(error, fallback);
}
