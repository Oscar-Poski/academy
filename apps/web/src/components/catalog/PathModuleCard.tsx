import React from 'react';
import Link from 'next/link';
import type { PathTreeModule } from '@/src/lib/content-types';
import type { PathModuleProgressItem } from '@/src/lib/progress-types';
import { CatalogLockNotice } from './CatalogLockNotice';
import { CatalogProgressChip } from './CatalogProgressChip';

type PathModuleCardProps = {
  module: PathTreeModule;
  moduleProgress?: PathModuleProgressItem;
};

export function PathModuleCard({ module, moduleProgress }: PathModuleCardProps) {
  const isLocked = module.lock?.isLocked === true;
  const lockReason = module.lock?.reasons[0] ?? 'Locked';

  return (
    <section className="playerCard pageCard catalogModuleCard">
      <header className="catalogModuleHeader">
        <div>
          <h2>{module.title}</h2>
          {isLocked ? <CatalogLockNotice reason={lockReason} /> : null}
          {moduleProgress ? (
            <div className="pageMetaRow">
              <CatalogProgressChip
                label={`${moduleProgress.completionPct}% · ${moduleProgress.completedSections}/${moduleProgress.totalSections} sections`}
              />
            </div>
          ) : null}
        </div>
        {isLocked ? (
          <span className="catalogPrimaryCta isDisabled" aria-disabled="true">
            Locked
          </span>
        ) : (
          <Link className="catalogPrimaryCta" href={`/modules/${module.id}`}>
            Open module
          </Link>
        )}
      </header>

      {module.sections.length === 0 ? (
        <p className="catalogMutedNotice">No sections in this module yet.</p>
      ) : (
        <ul className="catalogSectionList">
          {module.sections.map((section) => {
            const sectionLocked = section.lock?.isLocked === true;
            const sectionLockReason = section.lock?.reasons[0] ?? 'Locked';

            return (
              <li key={section.id} className="catalogSectionRow">
                <div className="catalogSectionMain">
                  <p>{section.title}</p>
                  {sectionLocked ? <CatalogLockNotice reason={sectionLockReason} /> : null}
                </div>
                <div className="catalogSectionActions">
                  {sectionLocked ? (
                    <span className="catalogPrimaryCta isDisabled" aria-disabled="true">
                      Locked
                    </span>
                  ) : (
                    <Link className="catalogPrimaryCta" href={`/learn/${section.id}`}>
                      Start
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
