import { APP_NAME } from '@academy/shared';
import { getApiHealth } from '@/src/lib/api';
import { getContinueLearning } from '@/src/lib/api-clients/progress.server';
import { requireAuthSession } from '@/src/lib/auth/require-auth-session.server';
import { getStartLearningCandidate } from '@/src/lib/onboarding/get-start-learning-candidate.server';
import { InlineNotice } from '@/src/components/state';
import Link from 'next/link';
import React from 'react';

export default async function HomePage() {
  await requireAuthSession('/');
  const [health, continueLearning, startLearningCandidate] = await Promise.all([
    getApiHealth(),
    getContinueLearning().catch(() => null),
    getStartLearningCandidate().catch(() => null)
  ]);

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
        ) : startLearningCandidate ? (
          <div className="homeContinueCard homeOnboardingCard">
            <p className="homeContinuePath">
              {startLearningCandidate.pathTitle} / {startLearningCandidate.moduleTitle}
            </p>
            <p className="homeContinueSection homeOnboardingTitle">
              {startLearningCandidate.sectionTitle}
            </p>
            <p className="homeContinueMuted homeOnboardingHint">
              You are all set. Start your first section.
            </p>
            <Link className="homeContinueLink" href={`/learn/${startLearningCandidate.sectionId}`}>
              Start your first section
            </Link>
          </div>
        ) : (
          <InlineNotice
            className="homeContinueMuted"
            message="Learning recommendations are temporarily unavailable."
          />
        )}
      </section>
    </main>
  );
}
