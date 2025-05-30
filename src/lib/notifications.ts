// src/lib/notifications.ts
import { PrismaClient, Task, Milestone, Project, User } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

interface TaskWithRelations extends Task {
  project: Project & {
    user: User;
  };
}

interface MilestoneWithRelations extends Milestone {
  project: Project & {
    user: User;
  };
}

interface NotificationData {
  email: string;
  name: string;
  itemType: 'zadanie' | 'kamień milowy';
  itemName: string;
  projectName: string;
  deadline: Date;
}

// Konfiguracja transportera poczty
const transporter = nodemailer.createTransport({
  // Konfiguracja serwera SMTP
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

export async function checkUpcomingDeadlines(): Promise<void> {
  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(now.getDate() + 3);
  
  // Znajdź wszystkie zadania z terminem w ciągu najbliższych 3 dni
  const upcomingTasks = await prisma.task.findMany({
    where: {
      endDate: {
        gte: now,
        lte: threeDaysFromNow
      },
      reminderSent: false
    },
    include: {
      project: {
        include: {
          user: true
        }
      }
    }
  }) as TaskWithRelations[];
  
  // Znajdź wszystkie kamienie milowe z terminem w ciągu najbliższych 3 dni
  const upcomingMilestones = await prisma.milestone.findMany({
    where: {
      dueDate: {
        gte: now,
        lte: threeDaysFromNow
      },
      completed: false,
      reminderSent: false
    },
    include: {
      project: {
        include: {
          user: true
        }
      }
    }
  }) as MilestoneWithRelations[];
  
  // Wyślij powiadomienia dla zadań
  for (const task of upcomingTasks) {
    try {
      await sendDeadlineNotification({
        email: task.project.user.email,
        name: task.project.user.name || task.project.user.email,
        itemType: 'zadanie',
        itemName: task.name,
        projectName: task.project.name,
        deadline: task.endDate
      });
      
      // Oznacz, że powiadomienie zostało wysłane
      await prisma.task.update({
        where: { id: task.id },
        data: { reminderSent: true }
      });
    } catch (error) {
      console.error(`Błąd podczas wysyłania powiadomienia dla zadania ${task.id}:`, error);
    }
  }
  
  // Wyślij powiadomienia dla kamieni milowych
  for (const milestone of upcomingMilestones) {
    try {
      await sendDeadlineNotification({
        email: milestone.project.user.email,
        name: milestone.project.user.name || milestone.project.user.email,
        itemType: 'kamień milowy',
        itemName: milestone.title,
        projectName: milestone.project.name,
        deadline: milestone.dueDate
      });
      
      // Oznacz, że powiadomienie zostało wysłane
      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { reminderSent: true }
      });
    } catch (error) {
      console.error(`Błąd podczas wysyłania powiadomienia dla kamienia milowego ${milestone.id}:`, error);
    }
  }
}

async function sendDeadlineNotification({
  email,
  name,
  itemType,
  itemName,
  projectName,
  deadline
}: NotificationData): Promise<void> {
  const daysUntilDeadline = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  const mailOptions = {
    from: `"MarsoftAI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Przypomnienie: zbliża się termin ${itemType === 'zadanie' ? 'zadania' : 'kamienia milowego'} w projekcie ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <div style="background-color: #a3cd39; padding: 10px; color: white; font-weight: bold; font-size: 18px;">
          MarsoftAI - Przypomnienie o terminie
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Witaj ${name},</p>
          <p>Przypominamy, że zbliża się termin ${itemType} w projekcie <strong>${projectName}</strong>:</p>
          <div style="background-color: #f9fafb; padding: 15px; margin: 15px 0; border-left: 4px solid #a3cd39;">
            <p style="margin: 0;"><strong>${itemName}</strong></p>
            <p style="margin: 5px 0 0 0;">Termin: ${deadline.toLocaleDateString('pl-PL')}</p>
            <p style="margin: 5px 0 0 0;">Pozostało dni: ${daysUntilDeadline}</p>
          </div>
          <p>Zaloguj się do aplikacji MarsoftAI, aby zobaczyć szczegóły i zaktualizować status.</p>
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p>Ta wiadomość została wygenerowana automatycznie. Nie odpowiadaj na nią.</p>
          </div>
        </div>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
}