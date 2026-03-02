import type { Metadata } from 'next';
import { AppHeader } from '@/src/components/auth/AppHeader';
import { getSessionProfile } from '@/src/lib/auth/get-session-profile.server';
import './globals.css';

export const metadata: Metadata = {
  title: 'Academy MVP',
  description: 'HTB-style learning platform scaffold'
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionProfile = await getSessionProfile();
  return (
    <html lang="en">
      <body>
        <div className="appShell">
          <AppHeader sessionProfile={sessionProfile} />
          <div className="appContent">{children}</div>
        </div>
      </body>
    </html>
  );
}
