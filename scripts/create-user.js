// scripts/create-user.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUser(name, email, password, role = 'user') {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    // Sprawdź czy użytkownik już istnieje
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      console.log(`Użytkownik ${email} już istnieje.`);
      return existingUser;
    }
    
    // Utwórz nowego użytkownika
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });
    
    console.log(`Utworzono użytkownika: ${user.email} z rolą: ${user.role}`);
    return user;
  } catch (error) {
    console.error('Błąd podczas tworzenia użytkownika:', error);
  }
}

async function main() {
  // Możesz tutaj dodawać użytkowników
  await createUser('Administrator', 'admin@marsoft.pl', 'admin123', 'admin');
  await createUser('Użytkownik Testowy', 'user@marsoft.pl', 'test123', 'user');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });