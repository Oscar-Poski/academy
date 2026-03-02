import React from 'react';
import { notFound } from 'next/navigation';
import { PlayerLayout } from '@/src/components/player/PlayerLayout';
import { ContentApiError, getModule, getPath, getSection } from '@/src/lib/api-clients/content.client';
import { postAnalyticsEvent } from '@/src/lib/api-clients/analytics.server';
import { requireAuthSession } from '@/src/lib/auth/require-auth-session.server';
import { startSectionProgress } from '@/src/lib/api-clients/progress.server';
import { getQuizDelivery } from '@/src/lib/api-clients/quiz.server';

type LearnPageProps = {
  params: {
    sectionId: string;
  };
};

export default async function LearnPage({ params }: LearnPageProps) {
  await requireAuthSession(`/learn/${params.sectionId}`);

  try {
    const section = await getSection(params.sectionId, { includeUserContext: true });

    // API currently returns moduleId in section payload, but not pathId.
    // Path fetch must wait until module payload resolves.
    const [module, sectionProgress, quizDelivery] = await Promise.all([
      getModule(section.moduleId, { includeUserContext: true }),
      startSectionProgress(section.id).catch(() => null),
      getQuizDelivery(section.id)
    ]);
    const [pathTree] = await Promise.all([getPath(module.pathId, { includeUserContext: true })]);

    if (sectionProgress) {
      await postAnalyticsEvent({
        event_name: 'section_start',
        occurred_at: new Date().toISOString(),
        idempotency_key: `section_start:${sectionProgress.id}`,
        user_id: sectionProgress.userId,
        path_id: module.pathId,
        module_id: module.id,
        section_id: section.id,
        section_version_id: sectionProgress.sectionVersionId,
        payload_json: {
          source: 'learn_page'
        }
      }).catch(() => null);
    }

    return (
      <PlayerLayout
        pathTree={pathTree}
        currentSectionId={section.id}
        currentModuleId={module.id}
        sectionTitle={section.title}
        lessonBlocks={section.lessonBlocks}
        navigation={section.navigation}
        sectionProgress={sectionProgress}
        quizDelivery={quizDelivery}
      />
    );
  } catch (error) {
    if (error instanceof ContentApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
