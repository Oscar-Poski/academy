import Link from 'next/link';
import type { PathTree } from '@/src/lib/content-types';

type PlayerSidebarProps = {
  pathTree: PathTree;
  currentSectionId: string;
};

export function PlayerSidebar({ pathTree, currentSectionId }: PlayerSidebarProps) {
  return (
    <aside className="playerSidebar" aria-label="Course navigation">
      <div className="playerSidebarHeader">
        <div className="playerSidebarEyebrow">Path</div>
        <h2 className="playerSidebarTitle">{pathTree.title}</h2>
      </div>

      <nav className="playerTree">
        {pathTree.modules.map((module) => {
          const isActiveModule = module.sections.some((section) => section.id === currentSectionId);

          return (
            <section
              key={module.id}
              className={`playerTreeModule${isActiveModule ? ' playerSidebarActiveModule' : ''}`}
            >
              <div className="playerTreeModuleHeader">
                {module.lock?.isLocked ? (
                  <div className="playerTreeModuleLink isLocked">
                    <span>{module.title}</span>
                    <span className="lockBadge lockBadge--locked">Locked</span>
                  </div>
                ) : (
                  <Link className="playerTreeModuleLink" href={`/modules/${module.id}`}>
                    {module.title}
                  </Link>
                )}
                {module.lock?.isLocked ? (
                  <p className="pageLockedReason">{module.lock.reasons[0] ?? 'Locked'}</p>
                ) : null}
              </div>
              <ul className="playerTreeSectionList">
                {module.sections.map((section) => {
                  const isActive = section.id === currentSectionId;
                  if (section.lock?.isLocked) {
                    return (
                      <li key={section.id}>
                        <div
                          className={`playerTreeSectionLink isLocked${isActive ? ' isActive playerSidebarActiveSection' : ''}`}
                        >
                          <span>{section.title}</span>
                          <span className="lockBadge lockBadge--locked">Locked</span>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={section.id}>
                      <Link
                        className={`playerTreeSectionLink${isActive ? ' isActive playerSidebarActiveSection' : ''}`}
                        href={`/learn/${section.id}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {section.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
