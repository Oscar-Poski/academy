import { describe, expect, it } from 'vitest';
import {
  getSectionPrimaryActionLabel,
  getSectionStatusClassName,
  getSectionStatusLabel
} from '@/src/lib/catalog/presentation';

describe('catalog presentation helpers', () => {
  it('maps section status labels deterministically', () => {
    expect(getSectionStatusLabel('not_started')).toBe('Sin comenzar');
    expect(getSectionStatusLabel('in_progress')).toBe('En progreso');
    expect(getSectionStatusLabel('completed')).toBe('Completada');
  });

  it('maps section status class names deterministically', () => {
    expect(getSectionStatusClassName('not_started')).toBe('progressBadge progressBadge--notStarted');
    expect(getSectionStatusClassName('in_progress')).toBe('progressBadge progressBadge--inProgress');
    expect(getSectionStatusClassName('completed')).toBe('progressBadge progressBadge--completed');
  });

  it('maps primary action labels deterministically', () => {
    expect(getSectionPrimaryActionLabel('not_started')).toBe('Comenzar');
    expect(getSectionPrimaryActionLabel('in_progress')).toBe('Continuar');
    expect(getSectionPrimaryActionLabel('completed')).toBe('Repasar');
  });
});
