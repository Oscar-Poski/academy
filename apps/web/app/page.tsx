import { APP_NAME } from '@academy/shared';
import { getApiHealth } from '@/src/lib/api';

export default async function HomePage() {
  const health = await getApiHealth();

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Monorepo scaffold is running.</p>
      <p>
        API health: <strong>{health.status}</strong>
      </p>
    </main>
  );
}
