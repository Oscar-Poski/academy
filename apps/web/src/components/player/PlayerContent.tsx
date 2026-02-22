import Link from 'next/link';
import type { SectionLessonBlock, SectionNavigation } from '@/src/lib/content-types';
import type { SectionProgress, SectionProgressStatus } from '@/src/lib/progress-types';
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
  sectionProgress?: SectionProgress | null;
};

function getStatusLabel(status: SectionProgressStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'not_started':
    default:
      return 'Not Started';
  }
}

function getStatusClassName(status: SectionProgressStatus): string {
  switch (status) {
    case 'completed':
      return 'progressBadge progressBadge--completed';
    case 'in_progress':
      return 'progressBadge progressBadge--inProgress';
    case 'not_started':
    default:
      return 'progressBadge progressBadge--notStarted';
  }
}

export function PlayerContent({
  breadcrumb,
  lessonBlocks,
  navigation,
  sectionProgress
}: PlayerContentProps) {
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
        {sectionProgress ? (
          <div className="playerHeaderMeta">
            <span className={getStatusClassName(sectionProgress.status)}>
              {getStatusLabel(sectionProgress.status)}
            </span>
            <span className="playerHeaderMetaText">{sectionProgress.completionPct}% complete</span>
          </div>
        ) : null}
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
