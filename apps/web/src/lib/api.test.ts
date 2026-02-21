import { describe, expect, it, vi } from 'vitest';
import { getApiHealth } from './api';

describe('getApiHealth', () => {
  it('returns unreachable when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    await expect(getApiHealth()).resolves.toEqual({ status: 'unreachable' });

    vi.unstubAllGlobals();
  });
});
