'use client';

// AuthProvider — Single Chokepoint für Supabase-Session (S85).
// Vorher: main.tsx (Gate + PageContent) und TopNav hätten je einen eigenen
// supabase.auth.getSession() + onAuthStateChange()-Listener gehalten (3
// unabhängige Kopien derselben Abfrage). Jetzt: ein Listener, Context-Broadcast.
//
// session-Typ bewusst dreiwertig, wie im ursprünglichen Gate-Code:
//   undefined = Auth-Check läuft noch (kurzer lokaler Check)
//   null      = geprüft, kein User eingeloggt
//   Session   = eingeloggt
// Konsumenten, die zwischen "lädt" und "ausgeloggt" unterscheiden müssen
// (bisher nur Gate), prüfen weiterhin explizit auf undefined.

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type SessionState = any | null | undefined;

interface AuthContextValue {
  session: SessionState;
}

const AuthContext = createContext<AuthContextValue>({ session: undefined });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
