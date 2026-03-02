import { APP_NAME } from '@academy/shared';
import { getApiHealth } from '@/src/lib/api';
import { getContinueLearning } from '@/src/lib/api-clients/progress.server';
import { requireAuthSession } from '@/src/lib/auth/require-auth-session.server';
import Link from 'next/link';

export default async function HomePage() {
  await requireAuthSession('/');
  const health = await getApiHealth();
  const continueLearning = await getContinueLearning().catch(() => null);

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Monorepo scaffold is running.</p>
      <p>
        API health: <strong>{health.status}</strong>
      </p>
      <section className="homeCard">
        <h2>Continue learning</h2>
        {continueLearning ? (
          <div className="homeContinueCard">
            <p className="homeContinuePath">
              {continueLearning.pathTitle} / {continueLearning.moduleTitle}
            </p>
            <p className="homeContinueSection">{continueLearning.sectionTitle}</p>
            <Link className="homeContinueLink" href={`/learn/${continueLearning.sectionId}`}>
              {continueLearning.source === 'resume' ? 'Resume section' : 'Start learning'}
            </Link>
          </div>
        ) : (
          <p className="homeContinueMuted">Continue learning is temporarily unavailable.</p>
        )}
      </section>
    </main>
  );
}
