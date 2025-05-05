// components/RenameDialog.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface RenameDialogProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export default function RenameDialog({ isOpen, currentName, onClose, onRename }: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    setName(currentName);
  }, [isOpen, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onRename(name.trim());
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      ></div>
      
      <div 
        className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-lg flex flex-col"
        style={{ borderLeft: '1px solid #e5e7eb' }}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-md font-medium text-gray-800">Zmień nazwę konwersacji</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nazwa
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            placeholder="Wpisz nazwę konwersacji"
          />
        </div>
        
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
          >
            Anuluj
          </button>
          
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none"
            style={{ backgroundColor: '#a3cd39' }}
          >
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}