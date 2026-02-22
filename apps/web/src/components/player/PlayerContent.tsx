import Link from 'next/link';
import type { SectionLessonBlock, SectionNavigation } from '@/src/lib/content-types';
import { LessonBlockRenderer } from './LessonBlockRenderer';

type Breadcrumb = {
  pathId: string;
  pathTitle: string;
  moduleId: string;
  moduleTitle: string;
  sectionTitle: string;
};

type PlayerContentProps = {
  breadcrumb: Breadcrumb;
  lessonBlocks: SectionLessonBlock[];
  navigation: SectionNavigation;
};

export function PlayerContent({ breadcrumb, lessonBlocks, navigation }: PlayerContentProps) {
  return (
    <section className="playerContent">
      <header className="playerHeader playerCard">
        <nav className="playerBreadcrumb" aria-label="Breadcrumb">
          <Link href={`/paths/${breadcrumb.pathId}`}>{breadcrumb.pathTitle}</Link>
          <span className="playerBreadcrumbSep">/</span>
          <Link href={`/modules/${breadcrumb.moduleId}`}>{breadcrumb.moduleTitle}</Link>
          <span className="playerBreadcrumbSep">/</span>
          <span aria-current="page">{breadcrumb.sectionTitle}</span>
        </nav>
        <h1 className="playerSectionTitle">{breadcrumb.sectionTitle}</h1>
      </header>

      <div className="playerBlocks">
        {lessonBlocks.length === 0 ? (
          <div className="playerCard playerEmptyState">No lesson blocks available for this section yet.</div>
        ) : (
          lessonBlocks.map((block) => (
            <div key={block.id} className="playerBlockItem">
              <LessonBlockRenderer block={block} />
            </div>
          ))
        )}
      </div>

      <footer className="playerFooter playerCard">
        {navigation.prevSectionId ? (
          <Link className="playerNavBtn" href={`/learn/${navigation.prevSectionId}`}>
            Previous Section
          </Link>
        ) : (
          <span className="playerNavBtn isDisabled" aria-disabled="true">
            Previous Section
          </span>
        )}

        {navigation.nextSectionId ? (
          <Link className="playerNavBtn" href={`/learn/${navigation.nextSectionId}`}>
            Next Section
          </Link>
        ) : (
          <span className="playerNavBtn isDisabled" aria-disabled="true">
            Next Section
          </span>
        )}
      </footer>
    </section>
  );
}
