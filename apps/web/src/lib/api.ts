import { getApiBaseUrl } from '@/src/lib/auth/constants';

export type HealthResponse = {
  status: string;
};

export async function getApiHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/health`, { cache: 'no-store' });

    if (!response.ok) {
      return { status: 'unreachable' };
    }

    return (await response.json()) as HealthResponse;
  } catch {
    return { status: 'unreachable' };
  }
}
