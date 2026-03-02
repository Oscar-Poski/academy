import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getPaths, getPath } = vi.hoisted(() => ({
  getPaths: vi.fn(),
  getPath: vi.fn()
}));

vi.mock('@/src/lib/api-clients/content.client', () => ({
  getPaths,
  getPath
}));

import { getStartLearningCandidate } from './get-start-learning-candidate.server';

describe('getStartLearningCandidate', () => {
  beforeEach(() => {
    getPaths.mockReset();
    getPath.mockReset();
  });

  it('returns first unlocked section from first available module', async () => {
    getPaths.mockResolvedValue([{ id: 'p1' }]);
    getPath.mockResolvedValue({
      id: 'p1',
      title: 'Path One',
      modules: [
        {
          id: 'm1',
          title: 'Module One',
          sections: [{ id: 's1', title: 'Section One' }]
        }
      ]
    });

    await expect(getStartLearningCandidate()).resolves.toEqual({
      pathId: 'p1',
      pathTitle: 'Path One',
      moduleId: 'm1',
      moduleTitle: 'Module One',
      sectionId: 's1',
      sectionTitle: 'Section One'
    });
  });

  it('skips locked modules and locked sections', async () => {
    getPaths.mockResolvedValue([{ id: 'p1' }]);
    getPath.mockResolvedValue({
      id: 'p1',
      title: 'Path One',
      modules: [
        {
          id: 'm-locked',
          title: 'Locked Module',
          lock: { isLocked: true },
          sections: [{ id: 's-locked-ignored', title: 'Ignored' }]
        },
        {
          id: 'm2',
          title: 'Module Two',
          sections: [
            { id: 's-locked', title: 'Locked Section', lock: { isLocked: true } },
            { id: 's2', title: 'Section Two' }
          ]
        }
      ]
    });

    await expect(getStartLearningCandidate()).resolves.toEqual({
      pathId: 'p1',
      pathTitle: 'Path One',
      moduleId: 'm2',
      moduleTitle: 'Module Two',
      sectionId: 's2',
      sectionTitle: 'Section Two'
    });
  });

  it('falls through to next path when current path has no unlocked content', async () => {
    getPaths.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    getPath
      .mockResolvedValueOnce({
        id: 'p1',
        title: 'Path One',
        modules: [
          {
            id: 'm1',
            title: 'Module One',
            lock: { isLocked: true },
            sections: [{ id: 's1', title: 'Section One' }]
          }
        ]
      })
      .mockResolvedValueOnce({
        id: 'p2',
        title: 'Path Two',
        modules: [
          {
            id: 'm2',
            title: 'Module Two',
            sections: [{ id: 's2', title: 'Section Two' }]
          }
        ]
      });

    await expect(getStartLearningCandidate()).resolves.toEqual({
      pathId: 'p2',
      pathTitle: 'Path Two',
      moduleId: 'm2',
      moduleTitle: 'Module Two',
      sectionId: 's2',
      sectionTitle: 'Section Two'
    });
  });

  it('returns null when no paths exist or all sections are locked', async () => {
    getPaths.mockResolvedValue([]);
    await expect(getStartLearningCandidate()).resolves.toBeNull();

    getPaths.mockResolvedValue([{ id: 'p1' }]);
    getPath.mockResolvedValue({
      id: 'p1',
      title: 'Path One',
      modules: [
        {
          id: 'm1',
          title: 'Module One',
          sections: [{ id: 's1', title: 'Section One', lock: { isLocked: true } }]
        }
      ]
    });

    await expect(getStartLearningCandidate()).resolves.toBeNull();
  });

  it('skips per-path failures and continues scanning', async () => {
    getPaths.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    getPath.mockRejectedValueOnce(new Error('path fetch failed')).mockResolvedValueOnce({
      id: 'p2',
      title: 'Path Two',
      modules: [
        {
          id: 'm2',
          title: 'Module Two',
          sections: [{ id: 's2', title: 'Section Two' }]
        }
      ]
    });

    await expect(getStartLearningCandidate()).resolves.toEqual({
      pathId: 'p2',
      pathTitle: 'Path Two',
      moduleId: 'm2',
      moduleTitle: 'Module Two',
      sectionId: 's2',
      sectionTitle: 'Section Two'
    });
  });

  it('propagates getPaths failure', async () => {
    getPaths.mockRejectedValue(new Error('paths failed'));
    await expect(getStartLearningCandidate()).rejects.toThrow('paths failed');
  });
});
