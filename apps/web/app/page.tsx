import { getPaths } from '@/src/lib/api-clients/content.client';
import { getContinueLearning } from '@/src/lib/api-clients/progress.server';
import { getSessionProfile } from '@/src/lib/auth/get-session-profile.server';
import { FeaturedCourses, HomeHero } from '@/src/components/home';
import { microcopy } from '@/src/lib/copy/microcopy';
import { getStartLearningCandidate } from '@/src/lib/onboarding/get-start-learning-candidate.server';
import { InlineNotice } from '@/src/components/state';
import { actionClassName, Container } from '@/src/components/ui';
import Link from 'next/link';
import React from 'react';

export default async function HomePage() {
  const [sessionProfile, featuredPathsResult] = await Promise.all([
    getSessionProfile(),
    getPaths()
      .then((paths) => paths.slice(0, 3))
      .catch(() => null)
  ]);
  const featuredUnavailable = featuredPathsResult === null;
  const featuredPaths = featuredPathsResult ?? [];

  let continueLearning = null;
  let startLearningCandidate = null;

  if (sessionProfile.authenticated) {
    [continueLearning, startLearningCandidate] = await Promise.all([
      getContinueLearning().catch(() => null),
      getStartLearningCandidate().catch(() => null)
    ]);
  }

  const continueCtaClassName = actionClassName({
    variant: 'primary',
    size: 'md',
    className: 'homeContinueLink'
  });

  return (
    <Container as="main" size="content" className="homeLanding">
      <HomeHero authenticated={sessionProfile.authenticated} />
      <FeaturedCourses courses={featuredPaths} unavailable={featuredUnavailable} />
      {sessionProfile.authenticated ? (
        <section className="homeCard homePersonalizedStrip">
          <h2>{microcopy.home.sectionTitle}</h2>
          {continueLearning ? (
            <div className="homeContinueCard">
              <p className="homeContinuePath">
                {continueLearning.pathTitle} / {continueLearning.moduleTitle}
              </p>
              <p className="homeContinueSection">{continueLearning.sectionTitle}</p>
              <Link className={continueCtaClassName} href={`/learn/${continueLearning.sectionId}`}>
                {continueLearning.source === 'resume' ? microcopy.home.resumeSection : microcopy.home.startLearning}
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
              <p className="homeContinueMuted homeOnboardingHint">{microcopy.home.onboardingHint}</p>
              <Link className={continueCtaClassName} href={`/learn/${startLearningCandidate.sectionId}`}>
                {microcopy.home.onboardingCta}
              </Link>
            </div>
          ) : (
            <InlineNotice className="homeContinueMuted" message={microcopy.home.fallback} />
          )}
        </section>
      ) : null}
    </Container>
  );
}
