// prisma/seed.ts
// Ten skrypt można uruchomić za pomocą: npx ts-node prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  try {
    // Utwórz lub zaktualizuj użytkownika Admin
    const admin = await prisma.user.upsert({
      where: { email: 'admin@marsoft.pl' },
      update: {},
      create: {
        id: uuidv4(),
        name: 'Admin',
        email: 'admin@marsoft.pl',
        password: 'admin123', // W produkcji należy używać haszowania!
        role: 'admin'
      }
    });

    // Utwórz lub zaktualizuj zwykłego użytkownika
    const user = await prisma.user.upsert({
      where: { email: 'user@marsoft.pl' },
      update: {},
      create: {
        id: uuidv4(),
        name: 'User',
        email: 'user@marsoft.pl',
        password: 'test123', // W produkcji należy używać haszowania!
        role: 'user'
      }
    });

    console.log('Utworzeni użytkownicy:');
    console.log(`- Admin: ${admin.name} (${admin.id})`);
    console.log(`- User: ${user.name} (${user.id})`);
  } catch (error) {
    console.error('Błąd podczas tworzenia użytkowników:', error);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });