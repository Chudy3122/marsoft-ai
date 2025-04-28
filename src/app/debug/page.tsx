// src/app/debug/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [cookies, setCookies] = useState<string>('');

  useEffect(() => {
    setCookies(document.cookie);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Strona diagnostyczna</h1>
      
      <h2>Status sesji: {status}</h2>
      
      <h3>Dane sesji:</h3>
      <pre>{JSON.stringify(session, null, 2)}</pre>
      
      <h3>Cookies:</h3>
      <pre>{cookies}</pre>
      
      <p>
        <a href="/">Strona główna</a> | 
        <a href="/login">Logowanie</a>
      </p>
    </div>
  );
}