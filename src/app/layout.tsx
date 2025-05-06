// src/app/layout.tsx
import './globals.css';
import 'github-markdown-css/github-markdown.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { SessionProvider } from '@/components/SessionProvider';
import { authOptions } from "@/lib/auth";


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MarsoftAI - Asystent projektów UE',
  description: 'Inteligentny asystent dla projektów UE',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="pl">
      <body className={inter.className}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}