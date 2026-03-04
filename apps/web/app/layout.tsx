import React from 'react';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AppHeader } from '@/src/components/auth/AppHeader';
import { AppFooter } from '@/src/components/shell/AppFooter';
import { getSessionProfile } from '@/src/lib/auth/get-session-profile.server';
import './globals.css';

export const metadata: Metadata = {
  title: 'Academy MVP',
  description: 'Plataforma de aprendizaje estilo HTB'
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap'
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-ui',
  display: 'swap'
});

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionProfile = await getSessionProfile();
  return (
    <html lang="es-MX" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <body>
        <a href="#app-main-content" className="skipLink">
          Ir al contenido
        </a>
        <div className="appShell">
          <AppHeader sessionProfile={sessionProfile} />
          <div id="app-main-content" className="appContent">
            {children}
          </div>
          <AppFooter sessionProfile={sessionProfile} />
        </div>
      </body>
    </html>
  );
}
