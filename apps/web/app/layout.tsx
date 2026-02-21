import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Academy MVP',
  description: 'HTB-style learning platform scaffold'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
