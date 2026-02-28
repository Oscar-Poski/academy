import type { PostAnalyticsEventRequest, PostAnalyticsEventResponse } from '@/src/lib/analytics-types';

export async function postAnalyticsEvent(
  body: PostAnalyticsEventRequest
): Promise<PostAnalyticsEventResponse> {
  const response = await fetch('/api/analytics/events', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Analytics API request failed: ${response.status}`);
  }

  return (await response.json()) as PostAnalyticsEventResponse;
}

export async function postAnalyticsEventKeepalive(body: PostAnalyticsEventRequest): Promise<void> {
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    const sent = navigator.sendBeacon('/api/analytics/events', blob);
    if (sent) {
      return;
    }
  }

  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      keepalive: true,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch {
    // Best-effort unload telemetry
  }
}
