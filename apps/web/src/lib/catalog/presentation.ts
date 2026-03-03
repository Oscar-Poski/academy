import type { SectionProgressStatus } from '@/src/lib/progress-types';
import { microcopy } from '@/src/lib/copy/microcopy';

export function getSectionStatusLabel(status: SectionProgressStatus): string {
  switch (status) {
    case 'completed':
      return microcopy.catalog.status.completed;
    case 'in_progress':
      return microcopy.catalog.status.inProgress;
    case 'not_started':
    default:
      return microcopy.catalog.status.notStarted;
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
      return microcopy.catalog.actions.review;
    case 'in_progress':
      return microcopy.catalog.actions.continue;
    case 'not_started':
    default:
      return microcopy.catalog.actions.start;
  }
}
