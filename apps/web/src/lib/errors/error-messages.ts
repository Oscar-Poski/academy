import type { AuthApiError } from '@/src/lib/auth/types';
import { getKnownErrorMessage, getKnownReasonMessage, microcopy } from '@/src/lib/copy/microcopy';

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
  return ` ${microcopy.errors.rateLimitedSuffixPrefix} ${payload.retry_after_seconds} ${microcopy.errors.rateLimitedSuffixSeconds}.`;
}

export function getAuthErrorMessage(payload: AuthApiError | null, fallback: string): string {
  if (!payload) {
    return fallback;
  }
  const knownMessage = getKnownErrorMessage(payload.code);
  if (!knownMessage) {
    return fallback;
  }

  return `${knownMessage}${getRateLimitedSuffix(payload)}`;
}

export function getErrorMessageFromPayload(payload: unknown, fallback: string): string {
  const parsed = readObject(payload) as ErrorPayload | null;
  if (!parsed) {
    return fallback;
  }

  const knownMessage = getKnownErrorMessage(parsed.code);
  if (!knownMessage) {
    return fallback;
  }

  return `${knownMessage}${getRateLimitedSuffix(parsed)}`;
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

export function getReasonMessage(reason: unknown): string {
  return getKnownReasonMessage(reason) ?? (typeof reason === 'string' ? reason : '');
}
