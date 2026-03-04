import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentApiError, getPath } from '@/src/lib/api-clients/content.client';
import { getPathProgress } from '@/src/lib/api-clients/progress.server';
import { getSessionProfile } from '@/src/lib/auth/get-session-profile.server';
import { microcopy } from '@/src/lib/copy/microcopy';
import { PathModuleCard } from '@/src/components/catalog';
import { InlineNotice } from '@/src/components/state';
import { Badge, Card, Container, Section, Stack } from '@/src/components/ui';

type PathPageProps = {
  params: {
    pathId: string;
  };
};

export default async function PathPage({ params }: PathPageProps) {
  try {
    const [sessionProfile, path, pathProgress] = await Promise.all([
      getSessionProfile(),
      getPath(params.pathId, { includeUserContext: true }),
      getPathProgress(params.pathId).catch(() => null)
    ]);
    const isAuthenticated = sessionProfile.authenticated;
    const moduleProgressById = new Map(
      (pathProgress?.modules ?? []).map((moduleProgress) => [moduleProgress.moduleId, moduleProgress])
    );

    return (
      <Container as="main" size="content" className="pathPage">
        <Stack gap="lg" className="pathPageStack">
          <Section as="section" spacing="sm" className="pathSection pathSection--hero">
            <Card as="header" className="pageHeader playerCard catalogHero pathHero" padding="none">
              <div className="pathHeroSummary">
                <p className="pageEyebrow">{microcopy.catalog.pathLabel}</p>
                <h1>{path.title}</h1>
                {path.description ? <p className="pageDescription">{path.description}</p> : null}
              </div>
              <div className="pageMetaRow catalogHeroMeta pathHeroMeta">
                {isAuthenticated && pathProgress ? (
                  <>
                    <Badge tone="info" size="sm" className="progressBadge">
                      {microcopy.catalog.pathProgress}
                    </Badge>
                    <span className="pageProgressSummary">
                      {pathProgress.completionPct}% {microcopy.catalog.progress.completeSuffix} ·{' '}
                      {pathProgress.completedModules}/{pathProgress.totalModules} {microcopy.catalog.progress.modulesWord}
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
                    <Link className="catalogAuthPromptLink" href={`/login?next=/paths/${params.pathId}`}>
                      {microcopy.catalog.logInCta}
                    </Link>
                  </p>
                )}
              </div>
            </Card>
          </Section>

          <Section as="section" spacing="sm" className="pathSection pathSection--modules">
            <Stack className="pathModulesStack" gap="md">
              {path.modules.map((module) => (
                <PathModuleCard
                  key={module.id}
                  module={module}
                  moduleProgress={moduleProgressById.get(module.id)}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </Stack>
          </Section>
        </Stack>
      </Container>
    );
  } catch (error) {
    if (error instanceof ContentApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
