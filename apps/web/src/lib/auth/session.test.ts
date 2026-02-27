import { describe, expect, it, vi } from 'vitest';
import {
  clearSessionTokensOnStore,
  getSessionCookieOptions,
  readSessionTokensFromStore,
  setSessionTokensOnStore
} from './session';

describe('session helpers', () => {
  it('reads tokens when both cookies exist', () => {
    const store = {
      get(name: string) {
        if (name === 'academy_access_token') {
          return { value: 'access-token' };
        }

        if (name === 'academy_refresh_token') {
          return { value: 'refresh-token' };
        }

        return undefined;
      }
    };

    expect(readSessionTokensFromStore(store)).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    });
  });

  it('returns null when one cookie is missing', () => {
    const store = {
      get(name: string) {
        if (name === 'academy_access_token') {
          return { value: 'access-token' };
        }

        return undefined;
      }
    };

    expect(readSessionTokensFromStore(store)).toBeNull();
  });

  it('sets and clears both cookies', () => {
    const set = vi.fn();
    const del = vi.fn();
    const store = {
      get() {
        return undefined;
      },
      set,
      delete: del
    };

    setSessionTokensOnStore(store, { accessToken: 'a', refreshToken: 'r' });
    clearSessionTokensOnStore(store);

    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenNthCalledWith(
      1,
      'academy_access_token',
      'a',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
    );
    expect(set).toHaveBeenNthCalledWith(
      2,
      'academy_refresh_token',
      'r',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
    );
    expect(del).toHaveBeenCalledWith('academy_access_token');
    expect(del).toHaveBeenCalledWith('academy_refresh_token');
  });

  it('uses secure cookies in production only', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(getSessionCookieOptions().secure).toBe(true);

    vi.stubEnv('NODE_ENV', 'development');
    expect(getSessionCookieOptions().secure).toBe(false);

    vi.unstubAllEnvs();
  });
});
