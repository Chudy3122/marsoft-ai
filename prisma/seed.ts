// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Usuń istniejących użytkowników (tylko do testów)
  await prisma.user.deleteMany();

  // Stwórz użytkownika administratora
  const adminPassword = await hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Administrator',
      email: 'admin@marsoft.pl',
      password: adminPassword,
      role: 'admin',
    },
  });
  console.log(`Utworzono administratora: ${admin.email}`);

  // Stwórz zwykłego użytkownika
  const userPassword = await hash('test123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Użytkownik Testowy',
      email: 'user@marsoft.pl',
      password: userPassword,
      role: 'user',
    },
  });
  console.log(`Utworzono użytkownika: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });