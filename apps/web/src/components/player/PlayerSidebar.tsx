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
        {pathTree.modules.map((module) => (
          <section key={module.id} className="playerTreeModule">
            <div className="playerTreeModuleHeader">
              <Link className="playerTreeModuleLink" href={`/modules/${module.id}`}>
                {module.title}
              </Link>
            </div>
            <ul className="playerTreeSectionList">
              {module.sections.map((section) => {
                const isActive = section.id === currentSectionId;
                return (
                  <li key={section.id}>
                    <Link
                      className={`playerTreeSectionLink${isActive ? ' isActive' : ''}`}
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
        ))}
      </nav>
    </aside>
  );
}
