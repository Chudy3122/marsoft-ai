'use client';

// src/components/Header.tsx
import React from 'react';
import Image from 'next/image';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 py-3 px-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative h-10 w-40 mr-3">
            <Image 
              src="/MarsoftAI.png" 
              alt="MarsoftAI Logo" 
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold text-gray-800">Asystent projektów UE</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Szukaj..."
              className="bg-gray-100 rounded-full py-2 px-4 pr-10 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="absolute right-3 top-2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <button className="bg-indigo-50 text-indigo-600 rounded-full p-2 hover:bg-indigo-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
            <span className="text-sm font-medium">U</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;