import React from 'react';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/src/components/auth/LoginForm';
import { PageSkeleton } from '@/src/components/state';
import { Container } from '@/src/components/ui';
import { getSessionProfile } from '@/src/lib/auth/get-session-profile.server';
import { safeNextPath } from '@/src/lib/auth/safe-next-path';

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
    <Container as="main" size="content">
      <Suspense fallback={<PageSkeleton variant="auth" />}>
        <LoginForm />
      </Suspense>
    </Container>
  );
}
