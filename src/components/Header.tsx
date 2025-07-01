// src/components/Header.tsx - NAPRAWIONA SKŁADNIA
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

const Header: React.FC = () => {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
          
          {/* 🔥 NAPRAWIONA SEKCJA UŻYTKOWNIKA */}
          {session?.user ? (
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {/* Avatar z inicjałem */}
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {session.user.name?.charAt(0).toUpperCase() || 
                     session.user.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                
                {/* Nazwa użytkownika */}
                <span className="text-gray-700 font-medium">
                  {session.user.name || session.user.email?.split('@')[0] || 'Użytkownik'}
                  {session.user.role === 'admin' && (
                    <span className="ml-1 text-xs text-indigo-600 font-normal">
                      (Admin)
                    </span>
                  )}
                </span>
                
                {/* Strzałka dropdown */}
                <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-2 text-sm text-gray-500 border-b">
                    {session.user.email}
                  </div>
                  
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Twój profil
                  </Link>
                  
                  {session.user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Panel administratora
                    </Link>
                  )}
                  
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Wyloguj się
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Zaloguj się
            </Link>
          )}
        </div>
      </div>
      
      {/* 🔥 DEBUGOWANIE - usuń po naprawie */}
      {process.env.NODE_ENV === 'development' && session?.user && (
        <div className="text-xs text-gray-500 mt-2 px-2 bg-yellow-100 rounded">
          🔍 DEBUG: name="{session.user.name}" email="{session.user.email}" role="{session.user.role}"
        </div>
      )}
    </header>
  );
};

export default Header;