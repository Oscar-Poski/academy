import Link from 'next/link';
import React from 'react';
import type { ContinueLearning } from '@/src/lib/progress-types';
import type { StartLearningCandidate } from '@/src/lib/onboarding/get-start-learning-candidate.server';
import { microcopy } from '@/src/lib/copy/microcopy';
import { InlineNotice } from '@/src/components/state';
import { actionClassName, Card } from '@/src/components/ui';

type HomePersonalizedStripProps = {
  continueLearning: ContinueLearning | null;
  startLearningCandidate: StartLearningCandidate | null;
};

export function HomePersonalizedStrip({ continueLearning, startLearningCandidate }: HomePersonalizedStripProps) {
  const continueCtaClassName = actionClassName({
    variant: 'primary',
    size: 'md',
    className: 'homeContinueLink'
  });

  return (
    <>
      <header className="homeSectionHeader">
        <h2 className="homeSectionTitle">{microcopy.home.sectionTitle}</h2>
      </header>
      {continueLearning ? (
        <Card as="div" className="homeContinueCard" padding="none">
          <p className="homeContinuePath">
            {continueLearning.pathTitle} / {continueLearning.moduleTitle}
          </p>
          <p className="homeContinueSection">{continueLearning.sectionTitle}</p>
          <Link className={continueCtaClassName} href={`/learn/${continueLearning.sectionId}`}>
            {continueLearning.source === 'resume' ? microcopy.home.resumeSection : microcopy.home.startLearning}
          </Link>
        </Card>
      ) : startLearningCandidate ? (
        <Card as="div" className="homeContinueCard homeOnboardingCard" padding="none">
          <p className="homeContinuePath">
            {startLearningCandidate.pathTitle} / {startLearningCandidate.moduleTitle}
          </p>
          <p className="homeContinueSection homeOnboardingTitle">{startLearningCandidate.sectionTitle}</p>
          <p className="homeContinueMuted homeOnboardingHint">{microcopy.home.onboardingHint}</p>
          <Link className={continueCtaClassName} href={`/learn/${startLearningCandidate.sectionId}`}>
            {microcopy.home.onboardingCta}
          </Link>
        </Card>
      ) : (
        <InlineNotice className="homeContinueMuted" message={microcopy.home.fallback} />
      )}
    </>
  );
}
