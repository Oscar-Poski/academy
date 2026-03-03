import { describe, expect, it } from 'vitest';
import {
  formatSectionMeta,
  getSectionStatusClassName,
  getSectionStatusLabel
} from '@/src/lib/player/presentation';

describe('player presentation helpers', () => {
  it('maps status label and class deterministically', () => {
    expect(getSectionStatusLabel('not_started')).toBe('Sin comenzar');
    expect(getSectionStatusLabel('in_progress')).toBe('En progreso');
    expect(getSectionStatusLabel('completed')).toBe('Completada');

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
      completionLabel: '45% completado',
      lessonBlockLabel: '2 bloques',
      durationLabel: '3 min de lectura'
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
      lessonBlockLabel: '1 bloque',
      durationLabel: null
    });
  });
});
