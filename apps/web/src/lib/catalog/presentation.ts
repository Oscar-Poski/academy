import type { SectionProgressStatus } from '@/src/lib/progress-types';

export function getSectionStatusLabel(status: SectionProgressStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'not_started':
    default:
      return 'Not Started';
  }
}

export function getSectionStatusClassName(status: SectionProgressStatus): string {
  switch (status) {
    case 'completed':
      return 'progressBadge progressBadge--completed';
    case 'in_progress':
      return 'progressBadge progressBadge--inProgress';
    case 'not_started':
    default:
      return 'progressBadge progressBadge--notStarted';
  }
}

export function getSectionPrimaryActionLabel(status: SectionProgressStatus): string {
  switch (status) {
    case 'completed':
      return 'Review';
    case 'in_progress':
      return 'Continue';
    case 'not_started':
    default:
      return 'Start';
  }
}
