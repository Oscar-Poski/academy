import React from 'react';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/src/components/auth/LoginForm';
import { PageSkeleton } from '@/src/components/state';
import { Container, Section, Stack } from '@/src/components/ui';
import { getSessionProfile } from '@/src/lib/auth/get-session-profile.server';
import { safeNextPath } from '@/src/lib/auth/safe-next-path';
import { microcopy } from '@/src/lib/copy/microcopy';

type LoginPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sessionProfile = await getSessionProfile();
  if (sessionProfile.authenticated) {
    const nextParam = Array.isArray(searchParams?.next) ? searchParams?.next[0] : searchParams?.next;
    redirect(safeNextPath(nextParam, '/'));
  }

  return (
    <Container as="main" size="content" className="authPage authPage--login">
      <Stack gap="lg" className="authPageStack">
        <Section as="section" spacing="sm" className="authShell authShell--login">
          <header className="authShellHeader">
            <p className="authShellEyebrow">{microcopy.auth.headings.logIn}</p>
          </header>
          <Suspense fallback={<PageSkeleton variant="auth" />}>
            <LoginForm />
          </Suspense>
        </Section>
      </Stack>
    </Container>
  );
}
