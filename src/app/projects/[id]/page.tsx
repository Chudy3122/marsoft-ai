// src/app/projects/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
// Pamiętaj, że konieczne może być zainstalowanie biblioteki gantt-for-react
// @ts-ignore - ignorujemy brak typów dla tej biblioteki
import ReactGantt from 'gantt-for-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
}

interface Task {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  progress: number;
  dependencies: string[];
  projectId: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  completed: boolean;
  projectId: string;
}

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [ganttData, setGanttData] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);
  
  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/projects');
          return;
        }
        throw new Error('Problem z pobraniem szczegółów projektu');
      }
      
      const data = await response.json();
      setProject(data.project);
      setTasks(data.tasks || []);
      setMilestones(data.milestones || []);
      
      // Formatowanie danych dla wykresu Gantta
      const ganttTasks = data.tasks.map((task: Task) => ({
        id: task.id,
        name: task.name,
        start: new Date(task.startDate),
        end: new Date(task.endDate),
        progress: task.progress,
        dependencies: task.dependencies
      }));
      
      setGanttData(ganttTasks);
    } catch (error) {
      console.error('Błąd podczas pobierania szczegółów projektu:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Funkcja do aktualizacji zadania po przeciągnięciu na wykresie
  const handleTaskUpdate = (updatedTask: GanttTask) => {
    // Funkcja wrappująca async
    (async () => {
      try {
        await fetch(`/api/tasks/${updatedTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: updatedTask.start,
            endDate: updatedTask.end,
            progress: updatedTask.progress
          })
        });
        
        // Odświeżenie zadań
        fetchProjectDetails();
      } catch (error) {
        console.error('Błąd podczas aktualizacji zadania:', error);
      }
    })();
  };
  
  // Funkcja do przełączania statusu kamienia milowego
  const handleMilestoneToggle = async (milestoneId: string, completed: boolean) => {
    try {
      await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      
      // Odświeżenie projektu
      fetchProjectDetails();
    } catch (error) {
      console.error('Błąd podczas aktualizacji kamienia milowego:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ 
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderRadius: '50%',
          borderTopColor: '#a3cd39',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '16px', color: '#6b7280' }}>Ładowanie projektu...</p>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#ef4444' }}>
          Nie znaleziono projektu
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Projekt o podanym identyfikatorze nie istnieje lub nie masz do niego dostępu.
        </p>
        <Link 
          href="/projects"
          style={{
            padding: '8px 16px',
            backgroundColor: '#a3cd39',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          Powrót do projektów
        </Link>
      </div>
    );
  }
  
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link 
              href="/projects"
              style={{ 
                color: '#6b7280', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px'
              }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Projekty
            </Link>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
            {project.name}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            {formatDate(project.startDate)} - {formatDate(project.endDate)}
            {project.description && ` • ${project.description}`}
          </p>
        </div>
        
        <div>
          <button
            onClick={() => {
              // Logika dodawania nowego zadania
              router.push(`/projects/${projectId}/tasks/new`);
            }}
            style={{
              padding: '8px 12px',
              marginRight: '8px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Dodaj zadanie
          </button>
          
          <button
            onClick={() => {
              // Logika dodawania nowego kamienia milowego
              router.push(`/projects/${projectId}/milestones/new`);
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#a3cd39',
              color: 'white',
              border: '1px solid #93b935',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M18 6l-6-4-6 4"></path>
              <path d="M6 6v12l6 4 6-4V6"></path>
            </svg>
            Dodaj kamień milowy
          </button>
        </div>
      </div>
      
      {/* Zakładki */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <button 
          style={{
            padding: '12px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: '2px solid #a3cd39',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111827',
            cursor: 'pointer'
          }}
        >
          Wykres Gantta
        </button>
        <button 
          style={{
            padding: '12px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: '2px solid transparent',
            fontSize: '14px',
            color: '#6b7280',
            cursor: 'pointer'
          }}
          onClick={() => alert('Funkcjonalność w przygotowaniu')}
        >
          Kamienie milowe
        </button>
        <button 
          style={{
            padding: '12px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: '2px solid transparent',
            fontSize: '14px',
            color: '#6b7280',
            cursor: 'pointer'
          }}
          onClick={() => alert('Funkcjonalność w przygotowaniu')}
        >
          Zadania
        </button>
      </div>
      
      {/* Wykres Gantta */}
      {tasks.length === 0 ? (
        <div style={{ 
          padding: '40px 0',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px dashed #d1d5db'
        }}>
          <div style={{ 
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(163, 205, 57, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#a3cd39" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M14 9C14 9 15 9 16 9.5C16 9.5 17 10 18 11"></path>
              <path d="M9 9H13"></path>
              <path d="M9 11H9.5"></path>
              <path d="M9 5H13"></path>
              <path d="M9 3H13"></path>
              <path d="M10 16L8 18L11 21L17 15"></path>
              <path d="M18 2H6C5.43 2 5 2.43 5 3V21C5 21.57 5.43 22 6 22H18C18.57 22 19 21.57 19 21V3C19 2.43 18.57 2 18 2Z"></path>
            </svg>
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
            Brak zadań
          </h2>
          <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto 16px' }}>
            Dodaj zadania, aby zobaczyć wykres Gantta dla tego projektu.
          </p>
          <button
            onClick={() => router.push(`/projects/${projectId}/tasks/new`)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#a3cd39',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Dodaj nowe zadanie
          </button>
        </div>
      ) : (
        <div style={{ height: '500px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          {/* Tu powinien być komponent wykresu Gantta, ale ze względu na błąd typowania można użyć tymczasowej implementacji */}
          <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '12px' }}>Lista zadań</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ 
                    backgroundColor: '#f9fafb', 
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: '12px',
                    color: '#6b7280',
                    textAlign: 'left'
                  }}>
                    <th style={{ padding: '10px' }}>Zadanie</th>
                    <th style={{ padding: '10px' }}>Data rozpoczęcia</th>
                    <th style={{ padding: '10px' }}>Data zakończenia</th>
                    <th style={{ padding: '10px' }}>Postęp</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px', fontSize: '14px' }}>{task.name}</td>
                      <td style={{ padding: '10px', fontSize: '14px' }}>{formatDate(task.startDate)}</td>
                      <td style={{ padding: '10px', fontSize: '14px' }}>{formatDate(task.endDate)}</td>
                      <td style={{ padding: '10px', fontSize: '14px' }}>
                        <div style={{ 
                          width: '100%', 
                          height: '8px', 
                          backgroundColor: '#f3f4f6',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${task.progress}%`,
                            backgroundColor: '#a3cd39',
                            borderRadius: '4px'
                          }}></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '12px' }}>Kamienie milowe</h3>
              {milestones.length === 0 ? (
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '6px', 
                  fontSize: '14px',
                  color: '#6b7280',
                  textAlign: 'center'
                }}>
                  Brak kamieni milowych. 
                  <button 
                    onClick={() => router.push(`/projects/${projectId}/milestones/new`)}
                    style={{
                      marginLeft: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#a3cd39',
                      fontWeight: 500,
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    Dodaj kamień milowy
                  </button>
                </div>
              ) : (
                <div>
                  {milestones.map(milestone => (
                    <div 
                      key={milestone.id} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 10px',
                        borderBottom: '1px solid #e5e7eb'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={milestone.completed} 
                        onChange={() => handleMilestoneToggle(milestone.id, !milestone.completed)}
                        style={{ 
                          marginRight: '10px',
                          width: '16px',
                          height: '16px',
                          accentColor: '#a3cd39'
                        }} 
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '14px',
                          fontWeight: milestone.completed ? 400 : 500,
                          color: milestone.completed ? '#9ca3af' : '#111827',
                          textDecoration: milestone.completed ? 'line-through' : 'none'
                        }}>
                          {milestone.title}
                        </div>
                        {milestone.description && (
                          <div style={{ 
                            fontSize: '13px',
                            color: '#6b7280',
                            marginTop: '2px'
                          }}>
                            {milestone.description}
                          </div>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: '13px',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="14" 
                          height="14" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        {formatDate(milestone.dueDate)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}