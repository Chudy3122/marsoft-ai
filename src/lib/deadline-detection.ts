// src/lib/deadline-detection.ts
import { PrismaClient, Document, Project, Task, Milestone } from '@prisma/client';
import { getOpenAIResponseWithWebSearch } from './openai-service';

const prisma = new PrismaClient();

interface DetectedDeadline {
  description: string;
  date: string;
  type: string;
  confidence: number;
  context: string;
}

interface DeadlineDetectionResult {
  success: boolean;
  error?: string;
  project?: Project;
  createdItems?: Array<{
    type: 'task' | 'milestone';
    id: string;
    name?: string;
    title?: string;
    startDate?: Date;
    endDate?: Date;
    date?: Date;
  }>;
  totalDetected?: number;
  totalCreated?: number;
}

export async function detectDeadlinesInDocument(documentId: string): Promise<DeadlineDetectionResult> {
  try {
    // Pobierz dokument z bazy danych
    let userId: string | null = null;
    let documentContent: string | null = null;
    let documentTitle: string = 'Nowy projekt';
    
    // Najpierw spróbuj znaleźć dokument w czatach
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { chat: true }
    });
    
    // Jeśli znaleziono dokument w czatach
    if (document && document.chat) {
      userId = document.chat.userId;
      documentContent = document.content;
      documentTitle = document.title;
    } else {
      // Jeśli nie znaleziono w czatach, spróbuj w bibliotece wiedzy
      const knowledgeDocument = await prisma.knowledgeDocument.findUnique({
        where: { id: documentId },
        include: { category: true }
      });
      
      if (!knowledgeDocument) {
        return { success: false, error: 'Dokument nie został znaleziony' };
      }
      
      // Pobierz id użytkownika (właściciela)
      const user = await prisma.user.findFirst({
        where: { role: 'user' }
      });
      
      if (!user) {
        return { success: false, error: 'Nie znaleziono żadnego użytkownika w systemie' };
      }
      
      userId = user.id;
      documentContent = knowledgeDocument.content;
      documentTitle = knowledgeDocument.title;
    }
    
    if (!documentContent || !userId) {
      return { success: false, error: 'Dokument nie zawiera treści lub brak właściciela' };
    }
    
    // Przygotuj zapytanie do AI
    const promptContent = `
    Przeanalizuj poniższy dokument i wyodrębnij wszystkie terminy, deadline'y i ważne daty związane z projektem. 
    Zwróć odpowiedź w formacie JSON zawierającym tablicę obiektów. Każdy obiekt powinien zawierać następujące pola:
    - description: Opis wydarzenia/zadania
    - date: Data w formacie YYYY-MM-DD
    - type: Typ terminu (np. "Kamień milowy", "Deadline", "Rozpoczęcie zadania", "Zakończenie zadania")
    - confidence: Poziom pewności w skali 1-5, gdzie 5 oznacza absolutną pewność
    - context: Fragment tekstu, w którym znaleziono informację o terminie
    
    Zwróć WYŁĄCZNIE JSON w następującym formacie:
    { "deadlines": [ { opis_obiektu1 }, { opis_obiektu2 }, ... ] }
    
    Dokument do analizy:
    ${documentContent.substring(0, 4000)}
    `;
    
    // Użyj istniejącej funkcji do komunikacji z OpenAI
    const responseText = await getOpenAIResponseWithWebSearch(promptContent, [], true);
    
    // Parsuj wynik JSON z tekstu odpowiedzi
    // Najpierw znajdź początek i koniec JSON w tekście
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      return { success: false, error: 'Nie udało się uzyskać poprawnej odpowiedzi JSON' };
    }
    
    const jsonText = responseText.substring(jsonStart, jsonEnd);
    let detectedDeadlines;
    try {
     detectedDeadlines = JSON.parse(jsonText) as { deadlines: DetectedDeadline[] };
   } catch (e) {
     return { success: false, error: 'Nie udało się sparsować odpowiedzi JSON' };
   }
   
   // Sprawdź czy mamy poprawny format
   if (!detectedDeadlines.deadlines || !Array.isArray(detectedDeadlines.deadlines)) {
     return { success: false, error: 'Nie udało się poprawnie wykryć terminów w dokumencie' };
   }
   
   // Utwórz projekt, jeśli jeszcze nie istnieje
   let projectName = documentTitle;
   if (projectName.length > 100) {
     projectName = projectName.substring(0, 97) + '...';
   }
   
   let project = await prisma.project.findFirst({
     where: {
       userId: userId,
       name: projectName
     }
   });
   
   if (!project) {
     // Znajdź najwcześniejszą i najpóźniejszą datę wśród wykrytych terminów
     const dates = detectedDeadlines.deadlines
       .map(deadline => new Date(deadline.date))
       .filter(date => !isNaN(date.getTime()));
     
     const startDate = dates.length > 0 
       ? new Date(Math.min(...dates.map(d => d.getTime()))) 
       : new Date();
     
     const endDate = dates.length > 0
       ? new Date(Math.max(...dates.map(d => d.getTime())))
       : new Date(startDate);
     endDate.setMonth(endDate.getMonth() + 6); // Dodaj 6 miesięcy, jeśli brak konkretnej daty końcowej
     
     project = await prisma.project.create({
       data: {
         name: projectName,
         description: `Projekt wygenerowany automatycznie na podstawie dokumentu "${documentTitle}"`,
         startDate,
         endDate,
         userId: userId
       }
     });
   }
   
   // Dodaj wykryte terminy jako zadania lub kamienie milowe
   const createdItems: DeadlineDetectionResult['createdItems'] = [];
   
   for (const deadline of detectedDeadlines.deadlines) {
     if (deadline.confidence >= 3) { // Dodaj tylko terminy o wysokim poziomie pewności
       const date = new Date(deadline.date);
       
       if (isNaN(date.getTime())) {
         continue; // Pomiń, jeśli data jest nieprawidłowa
       }
       
       if (deadline.type === 'Kamień milowy') {
         // Dodaj kamień milowy
         const milestone = await prisma.milestone.create({
           data: {
             title: deadline.description,
             description: `Kontekst: "${deadline.context}"`,
             dueDate: date,
             projectId: project.id
           }
         });
         
         createdItems.push({
           type: 'milestone',
           id: milestone.id,
           title: milestone.title,
           date: milestone.dueDate
         });
       } else {
         // Dodaj zadanie
         const endDate = new Date(date);
         endDate.setDate(endDate.getDate() + 1); // Domyślnie zadanie trwa 1 dzień
         
         const task = await prisma.task.create({
           data: {
             name: deadline.description,
             description: `Kontekst: "${deadline.context}"`,
             startDate: date,
             endDate,
             projectId: project.id
           }
         });
         
         createdItems.push({
           type: 'task',
           id: task.id,
           name: task.name,
           startDate: task.startDate,
           endDate: task.endDate
         });
       }
     }
   }
   
   return {
     success: true,
     project,
     createdItems,
     totalDetected: detectedDeadlines.deadlines.length,
     totalCreated: createdItems.length
   };
 } catch (error) {
   console.error('Błąd podczas wykrywania terminów w dokumencie:', error);
   return { success: false, error: 'Wystąpił błąd podczas analizy dokumentu' };
 }
}