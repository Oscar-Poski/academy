const API_BASE_URL =
  process.env.API_BASE_URL && process.env.API_BASE_URL.trim().length > 0
    ? process.env.API_BASE_URL
    : 'http://localhost:3001';

export type HealthResponse = {
  status: string;
};

export async function getApiHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });

    if (!response.ok) {
      return { status: 'unreachable' };
    }

    return (await response.json()) as HealthResponse;
  } catch {
    return { status: 'unreachable' };
  }
}
