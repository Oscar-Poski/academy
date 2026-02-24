import type { PostAnalyticsEventRequest, PostAnalyticsEventResponse } from '@/src/lib/analytics-types';

const ANALYTICS_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : 'http://localhost:3001';

export async function postAnalyticsEvent(
  body: PostAnalyticsEventRequest
): Promise<PostAnalyticsEventResponse> {
  const response = await fetch(`${ANALYTICS_API_BASE_URL}/v1/analytics/events`, {
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
