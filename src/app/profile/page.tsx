'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { useState } from 'react';

export default function ProfilePage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    },
  });

  // Używamy opcjonalnego łańcuchowania aby obsłużyć możliwy undefined
  const [name, setName] = useState(session?.user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (status === 'loading') {
    return <div>Ładowanie...</div>;
  }

  // Jeśli już dotarliśmy tutaj, to sesja powinna istnieć, ale dodajmy dodatkowe sprawdzenie
  if (!session || !session.user) {
    redirect('/login');
    return null; // To nigdy nie zostanie wykonane z powodu przekierowania, ale TypeScript tego wymaga
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
  
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nie udało się zapisać zmian');
      }
  
      setSaveSuccess(true);
    } catch (error) {
      console.error('Błąd podczas zapisywania profilu:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Profil użytkownika
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Edytuj swoje dane osobowe i preferencje
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Adres email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={session.user.email || ''}
                    disabled
                    className="block w-full cursor-not-allowed rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Adresu email nie można zmienić
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Imię i nazwisko
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Rola
                </label>
                <div className="mt-1">
                  <input
                    id="role"
                    name="role"
                    type="text"
                    value={session.user.role === 'admin' ? 'Administrator' : 'Użytkownik'}
                    disabled
                    className="block w-full cursor-not-allowed rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                {saveSuccess && (
                  <p className="mr-4 self-center text-sm text-green-600">
                    Zmiany zostały zapisane!
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300"
                >
                  {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}