import React from 'react';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { SignupForm } from '@/src/components/auth/SignupForm';
import { PageSkeleton } from '@/src/components/state';
import { Container, Section, Stack } from '@/src/components/ui';
import { getSessionProfile } from '@/src/lib/auth/get-session-profile.server';
import { safeNextPath } from '@/src/lib/auth/safe-next-path';
import { microcopy } from '@/src/lib/copy/microcopy';

type SignupPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const sessionProfile = await getSessionProfile();
  if (sessionProfile.authenticated) {
    const nextParam = Array.isArray(searchParams?.next) ? searchParams?.next[0] : searchParams?.next;
    redirect(safeNextPath(nextParam, '/'));
  }

  return (
    <Container as="main" size="content" className="authPage authPage--signup">
      <Stack gap="lg" className="authPageStack">
        <Section as="section" spacing="sm" className="authShell authShell--signup">
          <header className="authShellHeader">
            <p className="authShellEyebrow">{microcopy.auth.headings.signUp}</p>
          </header>
          <Suspense fallback={<PageSkeleton variant="auth" />}>
            <SignupForm />
          </Suspense>
        </Section>
      </Stack>
    </Container>
  );
}
