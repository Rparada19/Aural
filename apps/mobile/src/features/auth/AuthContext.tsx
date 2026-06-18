import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type ProfileStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

type AdminRole = 'coordinator' | 'csr' | 'visitor_rep' | null;

interface ProfileLite {
  id: string;
  full_name: string;
  status: ProfileStatus;
  is_admin: boolean;
  role: string;
  admin_role: AdminRole;
  linked_visitor_id: string | null;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: ProfileLite | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileLite | null>(null);

  async function loadProfile(uid: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, status, is_admin, role, admin_role, linked_visitor_id')
      .eq('id', uid)
      .single();
    setProfile((data as ProfileLite) ?? null);
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) await loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }
  async function refresh() {
    if (session?.user) await loadProfile(session.user.id);
  }

  return (
    <AuthContext.Provider value={{ loading, session, profile, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
