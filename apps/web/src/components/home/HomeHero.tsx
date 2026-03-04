import React from 'react';
import Link from 'next/link';
import { actionClassName, Card } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';

type HomeHeroProps = {
  authenticated: boolean;
};

export function HomeHero({ authenticated }: HomeHeroProps) {
  const title = `${microcopy.home.hero.titleLead} ${microcopy.home.hero.titleAccent} ${microcopy.home.hero.titleTail}`;
  const primaryCtaClassName = actionClassName({
    variant: 'primary',
    size: 'sm',
    className: 'catalogPrimaryCta homeFeaturedCta'
  });
  const secondaryCtaClassName = actionClassName({
    variant: 'secondary',
    size: 'sm',
    className: 'appAuthAction'
  });

  return (
    <Card as="section" className="playerCard homeHero" padding="none" aria-label={microcopy.home.hero.title}>
      <div className="homeHeroInner">
        <p className="homeHeroEyebrow">{microcopy.home.hero.eyebrow}</p>
        <h1 className="homeHeroTitle" aria-label={title}>
          {microcopy.home.hero.titleLead} <span className="homeHeroTitleAccent">{microcopy.home.hero.titleAccent}</span>{' '}
          {microcopy.home.hero.titleTail}
        </h1>
        <p className="homeHeroSubtitle">{microcopy.home.hero.subtitle}</p>
        <ul className="homeHeroSupportList" aria-label={microcopy.home.hero.proofLabel}>
          {microcopy.home.hero.supportingPoints.map((point) => (
            <li key={point} className="homeHeroSupportItem">
              {point}
            </li>
          ))}
        </ul>
        <p className="homeHeroProof">{microcopy.home.hero.proofLabel}</p>
        <div className="homeHeroActions">
          <Link className={primaryCtaClassName} href="/courses">
            {microcopy.home.hero.primaryCta}
          </Link>
          <Link className={secondaryCtaClassName} href={authenticated ? '/' : '/login'}>
            {authenticated ? microcopy.home.hero.secondaryCtaAuth : microcopy.home.hero.secondaryCtaAnon}
          </Link>
        </div>
      </div>
    </Card>
  );
}
