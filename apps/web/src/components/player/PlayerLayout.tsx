import type { PathTree, SectionLessonBlock, SectionNavigation } from '@/src/lib/content-types';
import type { SectionProgress } from '@/src/lib/progress-types';
import { PlayerContent } from './PlayerContent';
import { PlayerSidebar } from './PlayerSidebar';

type PlayerLayoutProps = {
  pathTree: PathTree;
  currentSectionId: string;
  currentModuleId: string;
  sectionTitle: string;
  lessonBlocks: SectionLessonBlock[];
  navigation: SectionNavigation;
  sectionProgress?: SectionProgress | null;
};

export function PlayerLayout({
  pathTree,
  currentSectionId,
  currentModuleId,
  sectionTitle,
  lessonBlocks,
  navigation,
  sectionProgress
}: PlayerLayoutProps) {
  const moduleTitle =
    pathTree.modules.find((module) => module.id === currentModuleId)?.title ?? 'Module';

  return (
    <div className="playerLayoutShell">
      <div className="playerLayout">
        <PlayerSidebar pathTree={pathTree} currentSectionId={currentSectionId} />
        <PlayerContent
          currentSectionId={currentSectionId}
          breadcrumb={{
            pathId: pathTree.id,
            pathTitle: pathTree.title,
            moduleId: currentModuleId,
            moduleTitle,
            sectionTitle
          }}
          lessonBlocks={lessonBlocks}
          navigation={navigation}
          sectionProgress={sectionProgress}
        />
      </div>
    </div>
  );
}
