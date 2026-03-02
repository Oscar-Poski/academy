import React from 'react';
import type { SectionProgressStatus } from '@/src/lib/progress-types';
import { getSectionStatusClassName, getSectionStatusLabel } from '@/src/lib/catalog/presentation';

type CatalogProgressChipProps =
  | {
      label: string;
      status?: never;
    }
  | {
      status: SectionProgressStatus;
      label?: never;
    };

export function CatalogProgressChip(props: CatalogProgressChipProps) {
  if (typeof props.status === 'string') {
    return <span className={getSectionStatusClassName(props.status)}>{getSectionStatusLabel(props.status)}</span>;
  }

  return <span className="progressBadge">{props.label}</span>;
}
