import { describe, expect, it, vi } from 'vitest';
import { BrowserUnlockApiError, evaluateModuleUnlock } from './unlocks.browser';

describe('unlocks.browser client', () => {
  it('returns parsed evaluate payload on success', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          moduleId: 'module-1',
          isUnlocked: true,
          reasons: [],
          requiresCredits: false,
          creditsCost: 0
        }),
        { status: 200 }
      )
    );

    const payload = await evaluateModuleUnlock('module-1');

    expect(payload).toEqual({
      moduleId: 'module-1',
      isUnlocked: true,
      reasons: [],
      requiresCredits: false,
      creditsCost: 0
    });
    expect(fetchSpy).toHaveBeenCalledWith('/api/unlocks/modules/module-1/evaluate', {
      method: 'POST',
      cache: 'no-store'
    });

    fetchSpy.mockRestore();
  });

  it('throws typed error on non-2xx response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'unauthorized' }), { status: 401 })
    );

    await expect(evaluateModuleUnlock('module-1')).rejects.toBeInstanceOf(BrowserUnlockApiError);

    fetchSpy.mockRestore();
  });
});
