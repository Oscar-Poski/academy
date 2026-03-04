import React from 'react';
import Link from 'next/link';
import { actionClassName } from '@/src/components/ui';
import type { ModuleDetailSection } from '@/src/lib/content-types';
import type { SectionProgressStatus } from '@/src/lib/progress-types';
import { microcopy } from '@/src/lib/copy/microcopy';
import { getSectionPrimaryActionLabel } from '@/src/lib/catalog/presentation';
import { CatalogLockNotice } from './CatalogLockNotice';
import { CatalogProgressChip } from './CatalogProgressChip';

type ModuleSectionRowProps = {
  section: ModuleDetailSection;
  status: SectionProgressStatus;
  completionPct?: number;
  showProgress: boolean;
  isAuthenticated: boolean;
};

export function ModuleSectionRow({
  section,
  status,
  completionPct,
  showProgress,
  isAuthenticated
}: ModuleSectionRowProps) {
  const isLocked = section.lock?.isLocked === true;
  const actionLabel = getSectionPrimaryActionLabel(status);
  const lockReason = section.lock?.reasons[0] ?? microcopy.catalog.lockedReasonFallback;
  const sectionActionClassName = actionClassName({
    variant: 'primary',
    size: 'sm',
    className: 'catalogPrimaryCta'
  });
  const lockedActionClassName = actionClassName({
    variant: 'primary',
    size: 'sm',
    disabled: true,
    className: 'catalogPrimaryCta isDisabled'
  });

  return (
    <li className="catalogSectionRow">
      <div className="catalogSectionMain">
        <p>{section.title}</p>
        {isLocked ? <CatalogLockNotice reason={lockReason} /> : null}
      </div>
      <div className="catalogSectionActions">
        {showProgress ? <CatalogProgressChip status={status} /> : null}
        {showProgress && status === 'in_progress' ? (
          <CatalogProgressChip label={`${completionPct ?? 0}%`} />
        ) : null}
        {isLocked ? (
          <span
            className={lockedActionClassName}
            aria-disabled="true"
            role="note"
            aria-label={`${microcopy.catalog.lockedAriaPrefix} ${lockReason}`}
            title={lockReason}
          >
            {microcopy.catalog.locked}
          </span>
        ) : (
          <Link
            href={isAuthenticated ? `/learn/${section.id}` : `/login?next=/learn/${section.id}`}
            className={sectionActionClassName}
          >
            {isAuthenticated ? actionLabel : microcopy.catalog.logInToStartSection}
          </Link>
        )}
      </div>
    </li>
  );
}
