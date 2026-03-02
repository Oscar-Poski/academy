import { getPath, getPaths } from '@/src/lib/api-clients/content.client';

export type StartLearningCandidate = {
  pathId: string;
  pathTitle: string;
  moduleId: string;
  moduleTitle: string;
  sectionId: string;
  sectionTitle: string;
};

export async function getStartLearningCandidate(): Promise<StartLearningCandidate | null> {
  const paths = await getPaths();

  for (const pathItem of paths) {
    let pathTree;
    try {
      pathTree = await getPath(pathItem.id, { includeUserContext: true });
    } catch {
      continue;
    }

    for (const module of pathTree.modules) {
      if (module.lock?.isLocked) {
        continue;
      }

      for (const section of module.sections) {
        if (section.lock?.isLocked) {
          continue;
        }

        return {
          pathId: pathTree.id,
          pathTitle: pathTree.title,
          moduleId: module.id,
          moduleTitle: module.title,
          sectionId: section.id,
          sectionTitle: section.title
        };
      }
    }
  }

  return null;
}
