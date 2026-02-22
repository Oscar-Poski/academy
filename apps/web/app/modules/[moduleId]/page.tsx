import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentApiError, getModule } from '@/src/lib/api-clients/content.client';
import { getModuleProgress } from '@/src/lib/api-clients/progress.client';
import type { ModuleSectionProgressItem, SectionProgressStatus } from '@/src/lib/progress-types';

type ModulePageProps = {
  params: {
    moduleId: string;
  };
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

export default async function ModulePage({ params }: ModulePageProps) {
  try {
    const [module, moduleProgress] = await Promise.all([
      getModule(params.moduleId),
      getModuleProgress(params.moduleId).catch(() => null)
    ]);
    const sectionProgressById = new Map(
      (moduleProgress?.sections ?? []).map((sectionProgress) => [sectionProgress.sectionId, sectionProgress])
    );

    return (
      <main className="pageShell">
        <header className="pageHeader playerCard">
          <p className="pageEyebrow">Module</p>
          <h1>{module.title}</h1>
          {module.description ? <p className="pageDescription">{module.description}</p> : null}
          <div className="pageMetaRow">
            {moduleProgress ? (
              <>
                <span className="progressBadge">Module Progress</span>
                <span className="pageProgressSummary">
                  {moduleProgress.completionPct}% complete · {moduleProgress.completedSections}/
                  {moduleProgress.totalSections} sections
                </span>
              </>
            ) : (
              <p className="pageProgressNotice">
                Progress indicators unavailable (API or temp user not configured).
              </p>
            )}
          </div>
        </header>

        <section className="playerCard pageCard">
          <h2>Sections</h2>
          {module.sections.length === 0 ? (
            <p className="pageMuted">No sections available yet.</p>
          ) : (
            <ul className="pageList">
              {module.sections.map((section) => {
                const progress: ModuleSectionProgressItem | undefined = sectionProgressById.get(section.id);
                const status = progress?.status ?? 'not_started';
                const completionPct = progress?.completionPct ?? 0;

                if (!moduleProgress) {
                  return (
                    <li key={section.id} className="pageListItem">
                      <Link href={`/learn/${section.id}`}>{section.title}</Link>
                    </li>
                  );
                }

                return (
                  <li key={section.id} className="pageListItem">
                    <div className="pageListRow">
                      <div className="pageListRowMain">
                        <Link href={`/learn/${section.id}`}>{section.title}</Link>
                      </div>
                      <div className="pageListRowMeta">
                        <span className={getStatusClassName(status)}>{getStatusLabel(status)}</span>
                        {status === 'in_progress' ? (
                          <span className="progressBadge">{completionPct}%</span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    );
  } catch (error) {
    if (error instanceof ContentApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
