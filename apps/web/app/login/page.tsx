import { Suspense } from 'react';
import { LoginForm } from '@/src/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="pageShell">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
