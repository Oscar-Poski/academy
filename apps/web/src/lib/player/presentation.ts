import type { SectionProgressStatus } from '@/src/lib/progress-types';

type FormatSectionMetaInput = {
  lessonBlockCount: number;
  estimatedSeconds?: number | null;
  completionPct?: number | null;
};

type FormatSectionMetaOutput = {
  completionLabel: string | null;
  lessonBlockLabel: string;
  durationLabel: string | null;
};

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

export function formatSectionMeta({
  lessonBlockCount,
  estimatedSeconds,
  completionPct
}: FormatSectionMetaInput): FormatSectionMetaOutput {
  const completionLabel =
    typeof completionPct === 'number' && Number.isFinite(completionPct)
      ? `${completionPct}% complete`
      : null;
  const lessonBlockLabel = `${lessonBlockCount} ${lessonBlockCount === 1 ? 'block' : 'blocks'}`;
  const minutes =
    typeof estimatedSeconds === 'number' && estimatedSeconds > 0
      ? Math.max(1, Math.ceil(estimatedSeconds / 60))
      : null;

  return {
    completionLabel,
    lessonBlockLabel,
    durationLabel: minutes ? `${minutes} min read` : null
  };
}
