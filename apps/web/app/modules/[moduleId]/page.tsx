import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentApiError, getModule } from '@/src/lib/api-clients/content.client';

type ModulePageProps = {
  params: {
    moduleId: string;
  };
};

export default async function ModulePage({ params }: ModulePageProps) {
  try {
    const module = await getModule(params.moduleId);

    return (
      <main className="pageShell">
        <header className="pageHeader playerCard">
          <p className="pageEyebrow">Module</p>
          <h1>{module.title}</h1>
          {module.description ? <p className="pageDescription">{module.description}</p> : null}
        </header>

        <section className="playerCard pageCard">
          <h2>Sections</h2>
          {module.sections.length === 0 ? (
            <p className="pageMuted">No sections available yet.</p>
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
      </main>
    );
  } catch (error) {
    if (error instanceof ContentApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
