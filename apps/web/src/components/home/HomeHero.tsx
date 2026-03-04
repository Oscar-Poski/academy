import React from 'react';
import Link from 'next/link';
import { actionClassName } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';

type HomeHeroProps = {
  authenticated: boolean;
};

export function HomeHero({ authenticated }: HomeHeroProps) {
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
    <section className="playerCard homeHero" aria-label={microcopy.home.hero.title}>
      <div className="homeHeroInner">
        <p className="homeHeroEyebrow">{microcopy.home.hero.eyebrow}</p>
        <h1 className="homeHeroTitle">{microcopy.home.hero.title}</h1>
        <p className="homeHeroSubtitle">{microcopy.home.hero.subtitle}</p>
        <div className="homeHeroActions">
          <Link className={primaryCtaClassName} href="/courses">
            {microcopy.home.hero.primaryCta}
          </Link>
          <Link className={secondaryCtaClassName} href={authenticated ? '/' : '/login'}>
            {authenticated ? microcopy.home.hero.secondaryCtaAuth : microcopy.home.hero.secondaryCtaAnon}
          </Link>
        </div>
      </div>
    </section>
  );
}
