import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile, UserRole } from '../lib/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole, departmentId?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isHod: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Retries briefly in case the DB trigger that creates the profile
  // hasn't committed yet by the time this is called.
  const fetchProfile = async (userId: string, attempt = 0): Promise<void> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      setError(error.message);
      return;
    }

    if (!data && attempt < 5) {
      // Profile not created yet — wait briefly and retry.
      await new Promise((resolve) => setTimeout(resolve, 300));
      return fetchProfile(userId, attempt + 1);
    }

    setProfile(data);
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      throw error;
    }
    // onAuthStateChange handles setUser/setProfile/setLoading(false) from here.
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    departmentId?: string
  ) => {
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          department_id: departmentId ?? null,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      throw error;
    }

    if (!data.user) {
      setLoading(false);
      throw new Error('Sign up did not return a user.');
    }

    // The user_profiles row is created server-side by a DB trigger
    // (see handle_new_user() in your Supabase SQL editor) — no manual
    // insert here, so there's no race against onAuthStateChange's
    // fetchProfile call. If data.session is present (email confirmation
    // disabled), onAuthStateChange will fire and fetchProfile will
    // retry until the trigger's insert is visible.
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const isAdmin = profile?.role === 'assistant_deputy'
    || profile?.role === 'deputy'
    || profile?.role === 'headmaster';
  const isHod = profile?.role === 'hod';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      isAdmin,
      isHod
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
