import { describe, expect, it } from 'vitest';
import {
  getAuthErrorMessage,
  getErrorMessageFromPayload,
  getErrorMessageFromUnknown
} from './error-messages';

describe('error message mapping', () => {
  it('maps known auth codes to web-owned copy', () => {
    const message = getAuthErrorMessage(
      {
        code: 'invalid_credentials',
        message: 'Backend message that should not be shown'
      },
      'fallback'
    );

    expect(message).toBe('Invalid email or password.');
  });

  it('appends deterministic retry suffix for rate_limited payloads', () => {
    const message = getAuthErrorMessage(
      {
        code: 'rate_limited',
        message: 'ignored',
        retry_after_seconds: 12
      },
      'fallback'
    );

    expect(message).toBe('Too many auth attempts. Try again later. Try again in 12 seconds.');
  });

  it('returns fallback for unknown payload code', () => {
    const message = getErrorMessageFromPayload(
      {
        code: 'unknown_error',
        message: 'unmapped'
      },
      'fallback'
    );

    expect(message).toBe('fallback');
  });

  it('returns fallback for malformed payload', () => {
    expect(getErrorMessageFromPayload('bad', 'fallback')).toBe('fallback');
  });

  it('supports unknown error objects that wrap payload', () => {
    const message = getErrorMessageFromUnknown(
      {
        payload: {
          code: 'internal_error',
          message: 'ignored'
        }
      },
      'fallback'
    );

    expect(message).toBe('Something went wrong. Please try again.');
  });
});
