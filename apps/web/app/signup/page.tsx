import { Suspense } from 'react';
import { SignupForm } from '@/src/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <main className="pageShell">
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
