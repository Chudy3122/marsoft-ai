// src/app/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import ChatComponent from '@/components/ChatComponent';

export const dynamic = 'force-dynamic'; // Dodaj tę linię

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }
  
  return <ChatComponent />;
}