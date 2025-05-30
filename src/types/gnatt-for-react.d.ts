// src/types/gantt-for-react.d.ts
declare module 'gantt-for-react' {
  import React from 'react';

  export interface GanttTask {
    id: string;
    name: string;
    start: Date;
    end: Date;
    progress: number; // Usunięto znak zapytania, czyniąc pole wymaganym
    dependencies: string[]; // Usunięto znak zapytania, czyniąc pole wymaganym
    [key: string]: any;
  }

  export interface GanttProps {
    tasks: GanttTask[];
    viewMode?: 'Hour' | 'Day' | 'Week' | 'Month' | 'Year';
    onClick?: (task: GanttTask) => void;
    onDoubleClick?: (task: GanttTask) => void;
    onTaskUpdate?: (task: GanttTask) => void; // Funkcja callback może być asynchroniczna
    columnWidth?: number;
    listCellWidth?: string;
    timeStep?: number;
    customPopupHtml?: (task: GanttTask) => string;
    [key: string]: any;
  }

  const ReactGantt: React.FC<GanttProps>;
  export default ReactGantt;
}