import React from 'react';
import Link from 'next/link';
import { actionClassName, Card } from '@/src/components/ui';
import type { PathTreeModule } from '@/src/lib/content-types';
import type { PathModuleProgressItem } from '@/src/lib/progress-types';
import { microcopy } from '@/src/lib/copy/microcopy';
import { CatalogLockNotice } from './CatalogLockNotice';
import { CatalogProgressChip } from './CatalogProgressChip';

type PathModuleCardProps = {
  module: PathTreeModule;
  moduleProgress?: PathModuleProgressItem;
  isAuthenticated: boolean;
};

export function PathModuleCard({ module, moduleProgress, isAuthenticated }: PathModuleCardProps) {
  const isLocked = module.lock?.isLocked === true;
  const lockReason = module.lock?.reasons[0] ?? microcopy.catalog.lockedReasonFallback;
  const openModuleClassName = actionClassName({
    variant: 'primary',
    size: 'sm',
    className: 'catalogPrimaryCta'
  });
  const lockedCtaClassName = actionClassName({
    variant: 'primary',
    size: 'sm',
    disabled: true,
    className: 'catalogPrimaryCta isDisabled'
  });
  const sectionActionClassName = actionClassName({
    variant: 'primary',
    size: 'sm',
    className: 'catalogPrimaryCta'
  });

  return (
    <Card as="section" className="playerCard pageCard catalogModuleCard" padding="md" interactive>
      <header className="catalogModuleHeader">
        <div>
          <h2>{module.title}</h2>
          {isLocked ? <CatalogLockNotice reason={lockReason} /> : null}
          {moduleProgress ? (
            <div className="pageMetaRow">
              <CatalogProgressChip
                label={`${moduleProgress.completionPct}% · ${moduleProgress.completedSections}/${moduleProgress.totalSections} ${microcopy.catalog.progress.sectionsWord}`}
              />
            </div>
          ) : null}
        </div>
        {isLocked ? (
          <span
            className={lockedCtaClassName}
            aria-disabled="true"
            role="note"
            aria-label={`${microcopy.catalog.lockedAriaPrefix} ${lockReason}`}
            title={lockReason}
          >
            {microcopy.catalog.locked}
          </span>
        ) : (
          <Link className={openModuleClassName} href={`/modules/${module.id}`}>
            {microcopy.catalog.openModule}
          </Link>
        )}
      </header>

      {module.sections.length === 0 ? (
        <p className="catalogMutedNotice">{microcopy.catalog.noSectionsInModuleYet}</p>
      ) : (
        <ul className="catalogSectionList">
          {module.sections.map((section) => {
            const sectionLocked = section.lock?.isLocked === true;
            const sectionLockReason = section.lock?.reasons[0] ?? microcopy.catalog.lockedReasonFallback;

            return (
              <li key={section.id} className="catalogSectionRow">
                <div className="catalogSectionMain">
                  <p>{section.title}</p>
                  {sectionLocked ? <CatalogLockNotice reason={sectionLockReason} /> : null}
                </div>
                <div className="catalogSectionActions">
                  {sectionLocked ? (
                    <span
                      className={lockedCtaClassName}
                      aria-disabled="true"
                      role="note"
                      aria-label={`${microcopy.catalog.lockedAriaPrefix} ${sectionLockReason}`}
                      title={sectionLockReason}
                    >
                      {microcopy.catalog.locked}
                    </span>
                  ) : (
                    <Link
                      className={sectionActionClassName}
                      href={isAuthenticated ? `/learn/${section.id}` : `/login?next=/learn/${section.id}`}
                    >
                      {isAuthenticated ? microcopy.catalog.start : microcopy.catalog.logInToStartSection}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
