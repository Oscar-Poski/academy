import { redirect } from 'next/navigation';
import { getSessionProfile } from './get-session-profile.server';

export type AuthenticatedSessionUser = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
};

export async function requireAuthSession(nextPath: string): Promise<AuthenticatedSessionUser> {
  const profile = await getSessionProfile();
  if (!profile.authenticated) {
    const encodedNext = encodeURIComponent(nextPath);
    redirect(`/login?next=${encodedNext}`);
  }

  return profile.user;
}
