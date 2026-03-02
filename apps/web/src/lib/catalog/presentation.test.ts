import { describe, expect, it } from 'vitest';
import {
  getSectionPrimaryActionLabel,
  getSectionStatusClassName,
  getSectionStatusLabel
} from '@/src/lib/catalog/presentation';

describe('catalog presentation helpers', () => {
  it('maps section status labels deterministically', () => {
    expect(getSectionStatusLabel('not_started')).toBe('Not Started');
    expect(getSectionStatusLabel('in_progress')).toBe('In Progress');
    expect(getSectionStatusLabel('completed')).toBe('Completed');
  });

  it('maps section status class names deterministically', () => {
    expect(getSectionStatusClassName('not_started')).toBe('progressBadge progressBadge--notStarted');
    expect(getSectionStatusClassName('in_progress')).toBe('progressBadge progressBadge--inProgress');
    expect(getSectionStatusClassName('completed')).toBe('progressBadge progressBadge--completed');
  });

  it('maps primary action labels deterministically', () => {
    expect(getSectionPrimaryActionLabel('not_started')).toBe('Start');
    expect(getSectionPrimaryActionLabel('in_progress')).toBe('Continue');
    expect(getSectionPrimaryActionLabel('completed')).toBe('Review');
  });
});
