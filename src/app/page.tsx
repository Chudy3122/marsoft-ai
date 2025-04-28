// src/app/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from "@/lib/auth";
import ChatComponent from '@/components/ChatComponent';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  // Dodaj logowanie, aby sprawdzić, co dzieje się z sesją
  console.log("Home page - session check:", session ? "Session exists" : "No session");
  
  if (!session) {
    console.log("Redirecting to login page");
    return redirect('/login');
  }
  
  return <ChatComponent />;
}