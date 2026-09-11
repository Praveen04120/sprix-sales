import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { HiringProvider } from '@/context/HiringContext';
import ToastContainer from '@/components/common/ToastContainer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sprix — Hiring Command Center',
  description: 'Internal candidate hiring-management platform for Sprix. Target: 8 hires/week.',
  icons: {
    icon: '/sprix-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <HiringProvider>
          {children}
          <ToastContainer />
        </HiringProvider>
      </body>
    </html>
  );
}
