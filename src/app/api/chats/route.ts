// src/app/api/chats/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  console.log("Sesja w GET /api/chats:", JSON.stringify(session, null, 2));
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
  }

  try {
    // Już nie sprawdzamy, czy użytkownik istnieje, ponieważ założyliśmy, że został dodany skryptem SQL
    const chats = await prisma.chat.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Błąd podczas pobierania czatów:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas pobierania czatów' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  console.log("Sesja w POST /api/chats:", JSON.stringify(session, null, 2));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
  }

  try {
    const { title = "Nowa konwersacja" } = await request.json();
    
    const chat = await prisma.chat.create({
      data: {
        title,
        userId: session.user.id,
      },
    });

    console.log("Utworzono nowy czat:", chat);
    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Błąd podczas tworzenia czatu:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas tworzenia czatu' }, { status: 500 });
  }
}