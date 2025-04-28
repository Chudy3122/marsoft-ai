// src/components/Navigation.tsx
'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/">
                <Image
                  src="/MarsoftAI.png"
                  alt="MarsoftAI Logo"
                  width={40}
                  height={40}
                  className="h-10 w-10"
                />
              </Link>
              <span className="ml-2 text-xl font-semibold text-gray-800">
                MarsoftAI
              </span>
            </div>
          </div>

          {session && session.user && (
            <div className="flex items-center">
              <div className="relative ml-3">
                <div>
                  <button
                    type="button"
                    className="flex items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    id="user-menu-button"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <span className="sr-only">Otwórz menu użytkownika</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white">
                      {session.user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="ml-2 text-gray-700">
                      {session.user.name}
                      {session.user.role === 'admin' && (
                        <span className="ml-1 text-xs text-green-600">
                          (Admin)
                        </span>
                      )}
                    </span>
                  </button>
                </div>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    tabIndex={-1}
                  >
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      tabIndex={-1}
                      id="user-menu-item-0"
                    >
                      Twój profil
                    </Link>
                    {session.user.role === 'admin' && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        tabIndex={-1}
                        id="user-menu-item-1"
                      >
                        Panel administratora
                      </Link>
                    )}
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      tabIndex={-1}
                      id="user-menu-item-2"
                    >
                      Wyloguj się
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}