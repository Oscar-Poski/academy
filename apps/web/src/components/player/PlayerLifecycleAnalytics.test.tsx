import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerLifecycleAnalytics } from './PlayerLifecycleAnalytics';

const postAnalyticsEventKeepalive = vi.fn();

vi.mock('@/src/lib/api-clients/analytics.browser', () => ({
  postAnalyticsEventKeepalive: (...args: unknown[]) => postAnalyticsEventKeepalive(...args)
}));

describe('PlayerLifecycleAnalytics', () => {
  beforeEach(() => {
    postAnalyticsEventKeepalive.mockReset();
    postAnalyticsEventKeepalive.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  function renderLifecycle(isCompleted = false) {
    return render(
      <PlayerLifecycleAnalytics
        userId="user-1"
        pathId="path-1"
        moduleId="module-1"
        sectionId="section-1"
        sectionVersionId="version-1"
        sessionKey="progress-1"
        isCompleted={isCompleted}
      />
    );
  }

  it('emits player_exit and player_dropoff once for incomplete session end', () => {
    renderLifecycle(false);

    window.dispatchEvent(new Event('pagehide'));

    expect(postAnalyticsEventKeepalive).toHaveBeenCalledTimes(2);
    expect(postAnalyticsEventKeepalive).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event_name: 'player_exit',
        user_id: 'user-1',
        section_id: 'section-1'
      })
    );
    expect(postAnalyticsEventKeepalive).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event_name: 'player_dropoff',
        user_id: 'user-1',
        section_id: 'section-1'
      })
    );
  });

  it('emits player_exit only for completed session end', () => {
    renderLifecycle(true);

    window.dispatchEvent(new Event('pagehide'));

    expect(postAnalyticsEventKeepalive).toHaveBeenCalledTimes(1);
    expect(postAnalyticsEventKeepalive).toHaveBeenCalledWith(
      expect.objectContaining({ event_name: 'player_exit' })
    );
  });

  it('does not double-send on duplicate end signals', () => {
    renderLifecycle(false);

    window.dispatchEvent(new Event('pagehide'));
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden'
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(postAnalyticsEventKeepalive).toHaveBeenCalledTimes(2);
  });

  it('cleanup triggers lifecycle emission if no prior end signal', () => {
    const view = renderLifecycle(false);

    view.unmount();

    expect(postAnalyticsEventKeepalive).toHaveBeenCalledTimes(2);
  });
});
