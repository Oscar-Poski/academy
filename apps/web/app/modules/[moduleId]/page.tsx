import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentApiError, getModule } from '@/src/lib/api-clients/content.client';
import { getModuleProgress } from '@/src/lib/api-clients/progress.server';
import { getSessionProfile } from '@/src/lib/auth/get-session-profile.server';
import type { ModuleSectionProgressItem } from '@/src/lib/progress-types';
import { microcopy } from '@/src/lib/copy/microcopy';
import { ModuleSectionRow } from '@/src/components/catalog';
import { InlineNotice } from '@/src/components/state';
import { Card, Container } from '@/src/components/ui';

type ModulePageProps = {
  params: {
    moduleId: string;
  };
};

export default async function ModulePage({ params }: ModulePageProps) {
  try {
    const [sessionProfile, module, moduleProgress] = await Promise.all([
      getSessionProfile(),
      getModule(params.moduleId, { includeUserContext: true }),
      getModuleProgress(params.moduleId).catch(() => null)
    ]);
    const isAuthenticated = sessionProfile.authenticated;
    const sectionProgressById = new Map(
      (moduleProgress?.sections ?? []).map((sectionProgress) => [sectionProgress.sectionId, sectionProgress])
    );

    return (
      <Container as="main" size="content">
        <Card as="header" className="pageHeader playerCard catalogHero" padding="none">
          <p className="pageEyebrow">{microcopy.catalog.moduleLabel}</p>
          <h1>{module.title}</h1>
          {module.description ? <p className="pageDescription">{module.description}</p> : null}
          {module.lock?.isLocked ? (
            <div className="pageMetaRow">
              <span className="lockBadge lockBadge--locked">{microcopy.catalog.locked}</span>
              <span className="pageLockedReason">
                {module.lock.reasons[0] ?? microcopy.catalog.lockedReasonFallback}
              </span>
            </div>
          ) : null}
          <div className="pageMetaRow catalogHeroMeta">
            {isAuthenticated && moduleProgress ? (
              <>
                <span className="progressBadge">{microcopy.catalog.moduleProgress}</span>
                <span className="pageProgressSummary">
                  {moduleProgress.completionPct}% {microcopy.catalog.progress.completeSuffix} ·{' '}
                  {moduleProgress.completedSections}/{moduleProgress.totalSections}{' '}
                  {microcopy.catalog.progress.sectionsWord}
                </span>
              </>
            ) : isAuthenticated ? (
              <InlineNotice
                className="pageProgressNotice catalogMutedNotice"
                message={microcopy.catalog.progressUnavailable}
              />
            ) : (
              <p className="catalogAuthPrompt">
                {microcopy.catalog.logInToTrackProgress}{' '}
                <Link className="catalogAuthPromptLink" href={`/login?next=/modules/${params.moduleId}`}>
                  {microcopy.catalog.logInCta}
                </Link>
              </p>
            )}
          </div>
        </Card>

        <Card as="section" className="playerCard pageCard catalogModuleBody" padding="md">
          <h2>{microcopy.catalog.sectionsLabel}</h2>
          {module.sections.length === 0 ? (
            <InlineNotice className="catalogMutedNotice" message={microcopy.catalog.emptyModuleSections} />
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
                    isAuthenticated={isAuthenticated}
                  />
                );
              })}
            </ul>
          )}
        </Card>
      </Container>
    );
  } catch (error) {
    if (error instanceof ContentApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
