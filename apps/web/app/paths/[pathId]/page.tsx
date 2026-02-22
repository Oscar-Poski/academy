import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentApiError, getPath } from '@/src/lib/api-clients/content.client';

type PathPageProps = {
  params: {
    pathId: string;
  };
};

export default async function PathPage({ params }: PathPageProps) {
  try {
    const path = await getPath(params.pathId);

    return (
      <main className="pageShell">
        <header className="pageHeader playerCard">
          <p className="pageEyebrow">Path</p>
          <h1>{path.title}</h1>
          {path.description ? <p className="pageDescription">{path.description}</p> : null}
        </header>

        <div className="pageStack">
          {path.modules.map((module) => (
            <section key={module.id} className="playerCard pageCard">
              <div className="pageCardHeader">
                <h2>{module.title}</h2>
                <Link className="pageActionLink" href={`/modules/${module.id}`}>
                  Open Module
                </Link>
              </div>

              {module.sections.length === 0 ? (
                <p className="pageMuted">No sections in this module yet.</p>
              ) : (
                <ul className="pageList">
                  {module.sections.map((section) => (
                    <li key={section.id} className="pageListItem">
                      <Link href={`/learn/${section.id}`}>{section.title}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof ContentApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
