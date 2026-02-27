import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentApiError, getPath } from '@/src/lib/api-clients/content.client';
import { getPathProgress } from '@/src/lib/api-clients/progress.client';

type PathPageProps = {
  params: {
    pathId: string;
  };
};

export default async function PathPage({ params }: PathPageProps) {
  try {
    const [path, pathProgress] = await Promise.all([
      getPath(params.pathId, { includeUserContext: true }),
      getPathProgress(params.pathId).catch(() => null)
    ]);
    const moduleProgressById = new Map(
      (pathProgress?.modules ?? []).map((moduleProgress) => [moduleProgress.moduleId, moduleProgress])
    );

    return (
      <main className="pageShell">
        <header className="pageHeader playerCard">
          <p className="pageEyebrow">Path</p>
          <h1>{path.title}</h1>
          {path.description ? <p className="pageDescription">{path.description}</p> : null}
          <div className="pageMetaRow">
            {pathProgress ? (
              <>
                <span className="progressBadge">Path Progress</span>
                <span className="pageProgressSummary">
                  {pathProgress.completionPct}% complete · {pathProgress.completedModules}/
                  {pathProgress.totalModules} modules
                </span>
              </>
            ) : (
              <p className="pageProgressNotice">
                Progress indicators unavailable (API or temp user not configured).
              </p>
            )}
          </div>
        </header>

        <div className="pageStack">
          {path.modules.map((module) => (
            <section key={module.id} className="playerCard pageCard">
              <div className="pageCardHeader">
                <div>
                  <h2>{module.title}</h2>
                  {module.lock?.isLocked ? (
                    <div className="pageMetaRow">
                      <span className="lockBadge lockBadge--locked">Locked</span>
                      <span className="pageLockedReason">{module.lock.reasons[0] ?? 'Locked'}</span>
                    </div>
                  ) : null}
                  {(() => {
                    const moduleProgress = moduleProgressById.get(module.id);
                    if (!moduleProgress) {
                      return null;
                    }

                    return (
                      <div className="pageMetaRow">
                        <span className="progressBadge">
                          {moduleProgress.completionPct}% · {moduleProgress.completedSections}/
                          {moduleProgress.totalSections} sections
                        </span>
                      </div>
                    );
                  })()}
                </div>
                {module.lock?.isLocked ? (
                  <span className="pageActionLink isDisabled" aria-disabled="true">
                    Open Module
                  </span>
                ) : (
                  <Link className="pageActionLink" href={`/modules/${module.id}`}>
                    Open Module
                  </Link>
                )}
              </div>

              {module.sections.length === 0 ? (
                <p className="pageMuted">No sections in this module yet.</p>
              ) : (
                <ul className="pageList">
                  {module.sections.map((section) => (
                    <li key={section.id} className="pageListItem">
                      {section.lock?.isLocked ? (
                        <div className="lockedText">
                          <span>{section.title}</span>
                          <span className="lockBadge lockBadge--locked">Locked</span>
                        </div>
                      ) : (
                        <Link href={`/learn/${section.id}`}>{section.title}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof ContentApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
