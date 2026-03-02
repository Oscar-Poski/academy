import { describe, expect, it } from 'vitest';
import {
  formatSectionMeta,
  getSectionStatusClassName,
  getSectionStatusLabel
} from '@/src/lib/player/presentation';

describe('player presentation helpers', () => {
  it('maps status label and class deterministically', () => {
    expect(getSectionStatusLabel('not_started')).toBe('Not Started');
    expect(getSectionStatusLabel('in_progress')).toBe('In Progress');
    expect(getSectionStatusLabel('completed')).toBe('Completed');

    expect(getSectionStatusClassName('not_started')).toBe('progressBadge progressBadge--notStarted');
    expect(getSectionStatusClassName('in_progress')).toBe('progressBadge progressBadge--inProgress');
    expect(getSectionStatusClassName('completed')).toBe('progressBadge progressBadge--completed');
  });

  it('formats section metadata consistently', () => {
    expect(
      formatSectionMeta({
        lessonBlockCount: 2,
        estimatedSeconds: 130,
        completionPct: 45
      })
    ).toEqual({
      completionLabel: '45% complete',
      lessonBlockLabel: '2 blocks',
      durationLabel: '3 min read'
    });
  });

  it('handles zero or missing duration/completion', () => {
    expect(
      formatSectionMeta({
        lessonBlockCount: 1,
        estimatedSeconds: 0,
        completionPct: null
      })
    ).toEqual({
      completionLabel: null,
      lessonBlockLabel: '1 block',
      durationLabel: null
    });
  });
});
