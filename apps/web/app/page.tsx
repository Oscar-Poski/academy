import { getPaths } from '@/src/lib/api-clients/content.client';
import { getContinueLearning } from '@/src/lib/api-clients/progress.server';
import { getSessionProfile } from '@/src/lib/auth/get-session-profile.server';
import { FeaturedCourses, HomeHero, HomePersonalizedStrip } from '@/src/components/home';
import { getStartLearningCandidate } from '@/src/lib/onboarding/get-start-learning-candidate.server';
import { Container, Section, Stack } from '@/src/components/ui';
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

  return (
    <Container as="main" size="content" className="homeLanding">
      <Stack gap="lg" className="homeStack">
        <Section as="div" spacing="sm" className="homeSection homeSection--hero">
          <HomeHero authenticated={sessionProfile.authenticated} />
        </Section>
        <Section as="div" spacing="sm" className="homeSection homeSection--featured">
          <FeaturedCourses courses={featuredPaths} unavailable={featuredUnavailable} />
        </Section>
        {sessionProfile.authenticated ? (
          <Section as="section" spacing="sm" className="homeSection homeCard homePersonalizedStrip">
            <HomePersonalizedStrip continueLearning={continueLearning} startLearningCandidate={startLearningCandidate} />
          </Section>
        ) : null}
      </Stack>
    </Container>
  );
}
