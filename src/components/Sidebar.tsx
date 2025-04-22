'use client';

// src/components/Sidebar.tsx
import React from 'react';
import Image from 'next/image';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'chat', label: 'Chat', icon: 'chat' },
    { id: 'templates', label: 'Szablony dokumentów', icon: 'template' },
    { id: 'upload', label: 'Wgraj dokument', icon: 'upload' }
  ];
  
  // Historia ostatnich projektów (przykładowe dane)
  const recentProjects = [
    { id: 'proj1', name: 'Wniosek projektowy EFS', date: 'Dzisiaj' },
    { id: 'proj2', name: 'Harmonogram szkoleniowy', date: 'Wczoraj' },
    { id: 'proj3', name: 'Budżet projektu EFRR', date: 'Previous 7 Days' }
  ];
  
  return (
    <div className="w-64 h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col">
      {/* Logo w sidebarze */}
      <div className="p-6 border-b border-gray-200">
        <div className="relative h-10 w-40 mx-auto">
          <Image 
            src="/MarsoftAI.png" 
            alt="MarsoftAI" 
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
      </div>
      
      {/* Sekcja z głównym menu */}
      <div className="p-3">
        <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wider px-3 py-2">
          Menu główne
        </div>
        <nav>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center mb-2 transition-all ${
                activeTab === item.id 
                  ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className={`mr-3 ${activeTab === item.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                {item.icon === 'chat' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                )}
                {item.icon === 'template' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                    <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                )}
                {item.icon === 'upload' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Sekcja z ostatnimi projektami */}
      <div className="p-3 mt-2">
        <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wider px-3 py-2">
          Ostatnio używane
        </div>
        <div className="space-y-1">
          {recentProjects.map(project => (
            <button
              key={project.id}
              className="w-full text-left px-4 py-2 rounded-xl flex items-center text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="truncate w-44">{project.name}</div>
                <div className="text-xs text-gray-500">{project.date}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Usunięto przycisk Wersja Pro z dolnej części */}
    </div>
  );
};

export default Sidebar;