import React from 'react';
import Link from 'next/link';
import { getPath, getPaths } from '@/src/lib/api-clients/content.client';
import type { PathListItem } from '@/src/lib/content-types';
import { microcopy } from '@/src/lib/copy/microcopy';
import { InlineNotice } from '@/src/components/state';
import { Container } from '@/src/components/ui';

type CoursesPathCardView = {
  id: string;
  title: string;
  description: string | null;
  modulesCount: number | null;
  sectionsCount: number | null;
};

function toFallbackCard(path: PathListItem): CoursesPathCardView {
  return {
    id: path.id,
    title: path.title,
    description: path.description,
    modulesCount: null,
    sectionsCount: null
  };
}

async function buildCourseCards(paths: PathListItem[]): Promise<CoursesPathCardView[]> {
  const settled = await Promise.allSettled(
    paths.map(async (path) => {
      const fullPath = await getPath(path.id);
      const modulesCount = fullPath.modules.length;
      const sectionsCount = fullPath.modules.reduce((sum, module) => sum + module.sections.length, 0);

      return {
        id: path.id,
        title: path.title,
        description: path.description,
        modulesCount,
        sectionsCount
      } satisfies CoursesPathCardView;
    })
  );

  return paths.map((path, index) => {
    const result = settled[index];
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return toFallbackCard(path);
  });
}

export default async function CoursesPage() {
  let cards: CoursesPathCardView[] = [];
  let unavailable = false;

  try {
    const paths = await getPaths();
    cards = await buildCourseCards(paths);
  } catch {
    unavailable = true;
  }

  return (
    <Container as="main" size="content" className="coursesShell">
      <header className="pageHeader playerCard catalogHero">
        <p className="pageEyebrow">{microcopy.nav.courses}</p>
        <h1>{microcopy.courses.title}</h1>
        <p className="pageDescription">{microcopy.courses.subtitle}</p>
      </header>

      {unavailable ? (
        <InlineNotice className="coursesMutedNotice" message={microcopy.courses.unavailable} />
      ) : cards.length === 0 ? (
        <InlineNotice className="coursesMutedNotice" message={microcopy.courses.empty} />
      ) : (
        <section className="coursesGrid" aria-label={microcopy.courses.title}>
          {cards.map((card) => (
            <article key={card.id} className="playerCard pageCard coursesCard">
              <div className="coursesCardHeader">
                <h2 className="coursesCardTitle">{card.title}</h2>
              </div>
              {card.description ? <p className="coursesCardDescription">{card.description}</p> : null}
              <div className="coursesCardMeta">
                {card.modulesCount === null || card.sectionsCount === null ? (
                  <span className="coursesMutedNotice">{microcopy.courses.countUnavailable}</span>
                ) : (
                  <>
                    <span className="progressBadge">
                      {card.modulesCount} {microcopy.courses.modulesCountLabel}
                    </span>
                    <span className="progressBadge">
                      {card.sectionsCount} {microcopy.courses.sectionsCountLabel}
                    </span>
                  </>
                )}
              </div>
              <Link className="catalogPrimaryCta coursesCardCta" href={`/paths/${card.id}`}>
                {microcopy.courses.openPath}
              </Link>
            </article>
          ))}
        </section>
      )}
    </Container>
  );
}
