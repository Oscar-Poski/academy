import type { SectionProgressStatus } from '@/src/lib/progress-types';
import { microcopy } from '@/src/lib/copy/microcopy';

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
      return microcopy.player.status.completed;
    case 'in_progress':
      return microcopy.player.status.inProgress;
    case 'not_started':
    default:
      return microcopy.player.status.notStarted;
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
      ? `${completionPct}% ${microcopy.player.meta.completedSuffix}`
      : null;
  const lessonBlockLabel = `${lessonBlockCount} ${
    lessonBlockCount === 1 ? microcopy.player.meta.blockSingular : microcopy.player.meta.blockPlural
  }`;
  const minutes =
    typeof estimatedSeconds === 'number' && estimatedSeconds > 0
      ? Math.max(1, Math.ceil(estimatedSeconds / 60))
      : null;

  return {
    completionLabel,
    lessonBlockLabel,
    durationLabel: minutes ? `${minutes} ${microcopy.player.meta.readTimeSuffix}` : null
  };
}
