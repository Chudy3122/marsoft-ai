// src/app/calendar/page.tsx
'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface CalendarEvent {
  id: string;
  title: string;
  start?: string;
  end?: string;
  date?: string;
  backgroundColor: string;
  borderColor: string;
  allDay?: boolean;
  extendedProps: {
    type: 'task' | 'milestone';
    description?: string;
    progress?: number;
    projectName: string;
  };
}

export default function ProjectCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  useEffect(() => {
    fetchCalendarEvents();
  }, []);
  
  const fetchCalendarEvents = async () => {
    try {
      const response = await fetch('/api/calendar-events');
      const data = await response.json();
      
      // Przekształcenie zadań i kamieni milowych na format wydarzeń kalendarza
      const calendarEvents: CalendarEvent[] = [
        // Zadania jako wydarzenia z przedziałem czasowym
        ...data.tasks.map((task: any) => ({
          id: `task-${task.id}`,
          title: task.name,
          start: task.startDate,
          end: task.endDate,
          backgroundColor: '#a3cd39',
          borderColor: '#a3cd39',
          extendedProps: {
            type: 'task' as const,
            description: task.description,
            progress: task.progress,
            projectName: task.project.name
          }
        })),
        // Kamienie milowe jako wydarzenia jednodniowe
        ...data.milestones.map((milestone: any) => ({
          id: `milestone-${milestone.id}`,
          title: milestone.title,
          date: milestone.dueDate,
          backgroundColor: milestone.completed ? '#4caf50' : '#ff9800',
          borderColor: milestone.completed ? '#4caf50' : '#ff9800',
          allDay: true,
          extendedProps: {
            type: 'milestone' as const,
            description: milestone.description,
            projectName: milestone.project.name
          }
        }))
      ];
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Błąd podczas pobierania wydarzeń kalendarza:', error);
    }
  };
  
  // Obsługa kliknięcia w wydarzenie
  const handleEventClick = (info: any) => {
    const event = info.event;
    const props = event.extendedProps;
    
    // Wyświetl szczegóły wydarzenia w modalu
    alert(`
      Nazwa: ${event.title}
      Projekt: ${props.projectName}
      Typ: ${props.type === 'task' ? 'Zadanie' : 'Kamień milowy'}
      Opis: ${props.description || 'Brak opisu'}
      ${props.type === 'task' ? `Postęp: ${props.progress}%` : ''}
    `);
  };
  
  return (
    <div className="calendar-container">
      <h1>Kalendarz projektów</h1>
      
      <div style={{ height: '700px' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          eventClick={handleEventClick}
          locale="pl"
          firstDay={1} // Poniedziałek jako pierwszy dzień tygodnia
        />
      </div>
    </div>
  );
}