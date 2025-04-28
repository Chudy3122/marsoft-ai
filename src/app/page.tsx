// src/app/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import ChatComponent from '@/components/ChatComponent';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  // Zamiast robić redirect, możemy renderować komponent bezpośrednio
  // Middleware już zajmie się przekierowaniem niezalogowanych użytkowników
  return <ChatComponent />;
}