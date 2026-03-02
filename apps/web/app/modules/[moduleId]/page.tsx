import React from 'react';
import { notFound } from 'next/navigation';
import { ContentApiError, getModule } from '@/src/lib/api-clients/content.client';
import { getModuleProgress } from '@/src/lib/api-clients/progress.server';
import type { ModuleSectionProgressItem } from '@/src/lib/progress-types';
import { ModuleSectionRow } from '@/src/components/catalog';
import { InlineNotice } from '@/src/components/state';

type ModulePageProps = {
  params: {
    moduleId: string;
  };
};

export default async function ModulePage({ params }: ModulePageProps) {
  try {
    const [module, moduleProgress] = await Promise.all([
      getModule(params.moduleId, { includeUserContext: true }),
      getModuleProgress(params.moduleId).catch(() => null)
    ]);
    const sectionProgressById = new Map(
      (moduleProgress?.sections ?? []).map((sectionProgress) => [sectionProgress.sectionId, sectionProgress])
    );

    return (
      <main className="pageShell">
        <header className="pageHeader playerCard catalogHero">
          <p className="pageEyebrow">Module</p>
          <h1>{module.title}</h1>
          {module.description ? <p className="pageDescription">{module.description}</p> : null}
          {module.lock?.isLocked ? (
            <div className="pageMetaRow">
              <span className="lockBadge lockBadge--locked">Locked</span>
              <span className="pageLockedReason">{module.lock.reasons[0] ?? 'Locked'}</span>
            </div>
          ) : null}
          <div className="pageMetaRow catalogHeroMeta">
            {moduleProgress ? (
              <>
                <span className="progressBadge">Module Progress</span>
                <span className="pageProgressSummary">
                  {moduleProgress.completionPct}% complete · {moduleProgress.completedSections}/
                  {moduleProgress.totalSections} sections
                </span>
              </>
            ) : (
              <InlineNotice
                className="pageProgressNotice catalogMutedNotice"
                message="Progress indicators unavailable right now."
              />
            )}
          </div>
        </header>

        <section className="playerCard pageCard catalogModuleBody">
          <h2>Sections</h2>
          {module.sections.length === 0 ? (
            <InlineNotice className="catalogMutedNotice" message="No sections available yet." />
          ) : (
            <ul className="catalogSectionList">
              {module.sections.map((section) => {
                const progress: ModuleSectionProgressItem | undefined = sectionProgressById.get(section.id);
                const status = progress?.status ?? 'not_started';
                const completionPct = progress?.completionPct ?? 0;
                return (
                  <ModuleSectionRow
                    key={section.id}
                    section={section}
                    status={status}
                    completionPct={completionPct}
                    showProgress={Boolean(moduleProgress)}
                  />
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
