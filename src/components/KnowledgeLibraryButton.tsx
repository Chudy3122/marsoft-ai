// src/components/KnowledgeLibraryButton.tsx
'use client';

import { useState } from 'react';
import KnowledgeLibraryPanel from './KnowledgeLibraryPanel';

interface KnowledgeLibraryButtonProps {
  currentChatId: string | null;
  activeDocumentIds: string[];
  onDocumentsSelected: (documentIds: string[]) => void;
}

export default function KnowledgeLibraryButton({ 
  currentChatId, 
  activeDocumentIds,
  onDocumentsSelected 
}: KnowledgeLibraryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          padding: '6px 12px',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
        disabled={!currentChatId}
        title={currentChatId ? 'Biblioteka Wiedzy' : 'Najpierw wybierz lub utwórz czat'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <span>Biblioteka Wiedzy</span>
        {activeDocumentIds.length > 0 && (
          <span style={{ 
            backgroundColor: '#a3cd39', 
            color: 'white', 
            borderRadius: '9999px', 
            padding: '2px 6px', 
            fontSize: '12px' 
          }}>
            {activeDocumentIds.length}
          </span>
        )}
      </button>

      {isOpen && (
        <KnowledgeLibraryPanel
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentChatId={currentChatId}
          selectedDocumentIds={activeDocumentIds}
          onApply={onDocumentsSelected}
        />
      )}
    </>
  );
}