// src/lib/gantt-service.ts
import { PrismaClient } from '@prisma/client';
import { getOpenAIResponseWithWebSearch } from './openai-service';

const prisma = new PrismaClient();

interface GeneratedTask {
  name: string;
  duration: number;
  dependencies?: string[];
  description: string;
}

/**
 * Funkcja do generowania harmonogramu Gantta na podstawie opisu projektu
 * @param description Opis projektu
 * @param projectId ID projektu
 * @returns Tablica wygenerowanych zadań
 */
export const generateGanttFromDescription = async (description: string, projectId: string) => {
  try {
    const promptContent = `
    Jako ekspert w zarządzaniu projektami UE, na podstawie poniższego opisu projektu wygeneruj listę zadań, 
    które powinny być zrealizowane w ramach tego projektu. Dla każdego zadania określ:
    1. Nazwę zadania
    2. Szacowany czas trwania (w dniach)
    3. Zależności od innych zadań (jeśli występują)
    4. Krótki opis zadania
    
    Zwróć odpowiedź WYŁĄCZNIE w formie JSON, w następującym formacie:
    { "tasks": [ 
      { 
        "name": "Nazwa zadania", 
        "duration": 10, 
        "dependencies": ["Nazwa innego zadania"], 
        "description": "Opis zadania" 
      },
      ...
    ] }
    
    Opis projektu: ${description}
    `;
    
    // Użyj istniejącej funkcji getOpenAIResponseWithWebSearch zamiast bezpośredniego dostępu do OpenAI
    const responseText = await getOpenAIResponseWithWebSearch(promptContent, [], true);
    
    // Wyodrębnij JSON z odpowiedzi tekstowej
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Nie udało się uzyskać poprawnej odpowiedzi JSON z AI');
    }
    
    const jsonText = responseText.substring(jsonStart, jsonEnd);
    const parsedResponse = JSON.parse(jsonText);
    
    if (!parsedResponse.tasks || !Array.isArray(parsedResponse.tasks)) {
      throw new Error('Nieprawidłowy format odpowiedzi z AI');
    }
    
    const tasks = parsedResponse.tasks as GeneratedTask[];
    
    // Konwersja na format odpowiedni do zapisania w bazie danych
    const projectStartDate = new Date();
    let currentDate = new Date(projectStartDate);
    
    const formattedTasks = tasks.map((task: GeneratedTask) => {
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + task.duration);
      
      currentDate = new Date(endDate);
      
      return {
        name: task.name,
        description: task.description,
        startDate,
        endDate,
        dependencies: task.dependencies || [],
        projectId: projectId
      };
    });
    
    // Zapisz zadania w bazie danych
    await Promise.all(formattedTasks.map((task: any) => 
      prisma.task.create({ data: task })
    ));
    
    return formattedTasks;
  } catch (error) {
    console.error('Błąd podczas generowania harmonogramu:', error);
    throw error;
  }
};