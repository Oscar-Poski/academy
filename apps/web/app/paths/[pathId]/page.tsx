import React from 'react';
import { notFound } from 'next/navigation';
import { ContentApiError, getPath } from '@/src/lib/api-clients/content.client';
import { getPathProgress } from '@/src/lib/api-clients/progress.server';
import { microcopy } from '@/src/lib/copy/microcopy';
import { PathModuleCard } from '@/src/components/catalog';
import { InlineNotice } from '@/src/components/state';

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
        <header className="pageHeader playerCard catalogHero">
          <p className="pageEyebrow">{microcopy.catalog.pathLabel}</p>
          <h1>{path.title}</h1>
          {path.description ? <p className="pageDescription">{path.description}</p> : null}
          <div className="pageMetaRow catalogHeroMeta">
            {pathProgress ? (
              <>
                <span className="progressBadge">{microcopy.catalog.pathProgress}</span>
                <span className="pageProgressSummary">
                  {pathProgress.completionPct}% complete · {pathProgress.completedModules}/
                  {pathProgress.totalModules} modules
                </span>
              </>
            ) : (
              <InlineNotice
                className="pageProgressNotice catalogMutedNotice"
                message={microcopy.catalog.progressUnavailable}
              />
            )}
          </div>
        </header>

        <div className="pageStack catalogStack">
          {path.modules.map((module) => (
            <PathModuleCard
              key={module.id}
              module={module}
              moduleProgress={moduleProgressById.get(module.id)}
            />
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
