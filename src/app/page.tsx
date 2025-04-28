import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import ChatComponent from '@/components/ChatComponent';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  // Jeśli nie ma sesji, przekieruj na stronę logowania
  if (!session) {
    redirect('/login');
  }
  
  // Jeśli sesja istnieje, renderuj komponent czatu
  return (
    <main className="flex min-h-screen flex-col">
      <ChatComponent />
    </main>
  );
}