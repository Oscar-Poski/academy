import { notFound } from 'next/navigation';
import { PlayerLayout } from '@/src/components/player/PlayerLayout';
import { ContentApiError, getModule, getPath, getSection } from '@/src/lib/api-clients/content.client';

type LearnPageProps = {
  params: {
    sectionId: string;
  };
};

export default async function LearnPage({ params }: LearnPageProps) {
  try {
    const section = await getSection(params.sectionId);

    // API currently returns moduleId in section payload, but not pathId.
    // Path fetch must wait until module payload resolves.
    const module = await getModule(section.moduleId);
    const [pathTree] = await Promise.all([getPath(module.pathId)]);

    return (
      <PlayerLayout
        pathTree={pathTree}
        currentSectionId={section.id}
        currentModuleId={module.id}
        sectionTitle={section.title}
        lessonBlocks={section.lessonBlocks}
        navigation={section.navigation}
      />
    );
  } catch (error) {
    if (error instanceof ContentApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
