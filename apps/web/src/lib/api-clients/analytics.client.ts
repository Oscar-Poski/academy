import type { PostAnalyticsEventRequest, PostAnalyticsEventResponse } from '@/src/lib/analytics-types';
import { getApiBaseUrl } from '@/src/lib/auth/constants';

export async function postAnalyticsEvent(
  body: PostAnalyticsEventRequest
): Promise<PostAnalyticsEventResponse> {
  const response = await fetch(`${getApiBaseUrl()}/v1/analytics/events`, {
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
