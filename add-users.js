// add-users.js - Uruchom przez: node add-users.js
// Ten skrypt można wykonać zamiast bezpośredniego skryptu SQL

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addUsers() {
  try {
    console.log('Dodawanie użytkowników do bazy danych...');
    
    // Dodaj lub aktualizuj użytkownika Admin
    const admin = await prisma.user.upsert({
      where: { id: '1' },
      update: {
        name: 'Admin',
        email: 'admin@marsoft.pl',
        password: 'admin123',
        role: 'admin'
      },
      create: {
        id: '1',
        name: 'Admin',
        email: 'admin@marsoft.pl',
        password: 'admin123',
        role: 'admin'
      }
    });
    
    // Dodaj lub aktualizuj użytkownika User
    const user = await prisma.user.upsert({
      where: { id: '2' },
      update: {
        name: 'User',
        email: 'user@marsoft.pl',
        password: 'test123',
        role: 'user'
      },
      create: {
        id: '2',
        name: 'User',
        email: 'user@marsoft.pl',
        password: 'test123',
        role: 'user'
      }
    });
    
    console.log('Dodano użytkowników:', { admin, user });
    
    // Sprawdź, czy użytkownicy zostali dodani
    const allUsers = await prisma.user.findMany();
    console.log('Wszyscy użytkownicy w bazie:', allUsers);
    
  } catch (error) {
    console.error('Błąd podczas dodawania użytkowników:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addUsers();