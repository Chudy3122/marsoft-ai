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
    
    // Dodaj lub aktualizuj nowego użytkownika Jerzy
    const jerzy = await prisma.user.upsert({
      where: { id: '3' },
      update: {
        name: 'Jerzy',
        email: 'jerzy.szyndler@itcomplete.pl',
        password: 'J2024@2025!',
        role: 'user'
      },
      create: {
        id: '3',
        name: 'Jerzy',
        email: 'jerzy.szyndler@itcomplete.pl',
        password: 'J2024@2025!',
        role: 'user'
      }
    });
    
    // Dodaj lub aktualizuj nowych użytkowników z różnymi hasłami
    const piotr = await prisma.user.upsert({
      where: { email: 'piotr.niziol@itcomplete.pl' },
      update: {
        name: 'Piotr Nizioł',
        password: 'Piotr#2024Secure',
        role: 'user'
      },
      create: {
        name: 'Piotr Nizioł',
        email: 'piotr.niziol@itcomplete.pl',
        password: 'Piotr#2024Secure',
        role: 'user'
      }
    });
    
    const pawel = await prisma.user.upsert({
      where: { email: 'pawel.zmudzki@itcomplete.pl' },
      update: {
        name: 'Paweł Żmudzki',
        password: 'Pawel$Z2024!',
        role: 'user'
      },
      create: {
        name: 'Paweł Żmudzki',
        email: 'pawel.zmudzki@itcomplete.pl',
        password: 'Pawel$Z2024!',
        role: 'user'
      }
    });
    
    const ewelina = await prisma.user.upsert({
      where: { email: 'ewelina.pcion@itcomplete.pl' },
      update: {
        name: 'Ewelina Pcion',
        password: 'Ewe&Pcion2024*',
        role: 'user'
      },
      create: {
        name: 'Ewelina Pcion',
        email: 'ewelina.pcion@itcomplete.pl',
        password: 'Ewe&Pcion2024*',
        role: 'user'
      }
    });
    
    const izabela = await prisma.user.upsert({
      where: { email: 'izabela.kula@itcomplete.pl' },
      update: {
        name: 'Izabela Kula',
        password: 'Izabela@K2024!',
        role: 'user'
      },
      create: {
        name: 'Izabela Kula',
        email: 'izabela.kula@itcomplete.pl',
        password: 'Izabela@K2024!',
        role: 'user'
      }
    });
    
    const katarzyna = await prisma.user.upsert({
      where: { email: 'katarzyna.skijko@itcomplete.pl' },
      update: {
        name: 'Katarzyna Skijko',
        password: 'Kasia%Ski2024#',
        role: 'user'
      },
      create: {
        name: 'Katarzyna Skijko',
        email: 'katarzyna.skijko@itcomplete.pl',
        password: 'Kasia%Ski2024#',
        role: 'user'
      }
    });
    
    console.log('Dodano użytkowników:', { 
      admin, 
      user, 
      jerzy
    });
    
    console.log('Dodano nowych użytkowników z unikalnym hasłami:');
    console.log('Piotr Nizioł - hasło: Piotr#2024Secure');
    console.log('Paweł Żmudzki - hasło: Pawel$Z2024!');
    console.log('Ewelina Pcion - hasło: Ewe&Pcion2024*');
    console.log('Izabela Kula - hasło: Izabela@K2024!');
    console.log('Katarzyna Skijko - hasło: Kasia%Ski2024#');
    
    // Sprawdź, czy użytkownicy zostali dodani
    const allUsers = await prisma.user.findMany();
    console.log('Liczba użytkowników w bazie:', allUsers.length);
    console.log('Adresy email wszystkich użytkowników:', allUsers.map(user => user.email));
    
  } catch (error) {
    console.error('Błąd podczas dodawania użytkowników:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addUsers();