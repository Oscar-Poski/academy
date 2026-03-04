import React from 'react';
import Link from 'next/link';
import { actionClassName } from '@/src/components/ui';
import type { PathListItem } from '@/src/lib/content-types';
import { microcopy } from '@/src/lib/copy/microcopy';
import { InlineNotice } from '@/src/components/state';

type FeaturedCoursesProps = {
  courses: PathListItem[];
  unavailable: boolean;
};

export function FeaturedCourses({ courses, unavailable }: FeaturedCoursesProps) {
  const viewAllClassName = actionClassName({
    variant: 'secondary',
    size: 'sm',
    className: 'appAuthAction'
  });
  const pathCtaClassName = actionClassName({
    variant: 'primary',
    size: 'sm',
    className: 'catalogPrimaryCta homeFeaturedCta'
  });

  return (
    <section className="homeFeatured">
      <div className="homeFeaturedHeader">
        <div>
          <h2>{microcopy.home.featured.title}</h2>
          <p className="pageDescription">{microcopy.home.featured.subtitle}</p>
        </div>
        <Link className={viewAllClassName} href="/courses">
          {microcopy.home.featured.viewAll}
        </Link>
      </div>
      {unavailable ? (
        <InlineNotice className="homeContinueMuted" message={microcopy.home.featured.unavailable} />
      ) : courses.length === 0 ? (
        <InlineNotice className="homeContinueMuted" message={microcopy.home.featured.empty} />
      ) : (
        <div className="homeFeaturedGrid" aria-label={microcopy.home.featured.title}>
          {courses.map((course) => (
            <article key={course.id} className="playerCard pageCard homeFeaturedCard">
              <h3 className="homeFeaturedCardTitle">{course.title}</h3>
              {course.description ? (
                <p className="homeFeaturedMeta">{course.description}</p>
              ) : (
                <p className="homeFeaturedMeta">{microcopy.home.featured.descriptionFallback}</p>
              )}
              <Link className={pathCtaClassName} href={`/paths/${course.id}`}>
                {microcopy.home.featured.viewPath}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
