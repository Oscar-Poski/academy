import { describe, expect, it } from 'vitest';
import {
  getAuthErrorMessage,
  getErrorMessageFromPayload,
  getErrorMessageFromUnknown,
  getReasonMessage
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

    expect(message).toBe('Correo o contraseña incorrectos.');
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

    expect(message).toBe('Demasiados intentos de autenticación. Intenta más tarde. Intenta de nuevo en 12 segundos.');
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

    expect(message).toBe('Algo salió mal. Intenta de nuevo.');
  });

  it('maps known dynamic unlock and completion reasons to spanish copy', () => {
    expect(getReasonMessage('Pass quiz before completing this section.')).toBe(
      'Aprueba el quiz antes de completar esta sección.'
    );
    expect(getReasonMessage('Redeem credits to unlock module: m1')).toBe(
      'Canjea créditos para desbloquear el módulo: m1'
    );
    expect(getReasonMessage('Reach level 3 to unlock module: mod-2')).toBe(
      'Alcanza el nivel 3 para desbloquear el módulo: mod-2'
    );
  });

  it('keeps unknown dynamic reasons as fallback raw text', () => {
    expect(getReasonMessage('custom_unmapped_reason')).toBe('custom_unmapped_reason');
  });
});
