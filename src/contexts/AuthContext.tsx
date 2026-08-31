import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, configError } from '../lib/supabase';
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
  const [error, setError] = useState<string | null>(configError);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    if (!supabase) return;

    // 1. Try to fetch existing profile
    const { data: existing, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return;
    }

    if (existing) {
      setProfile(existing);
      return;
    }

    // 2. No profile yet — try to auto-create one by matching the auth email to a department HOD
    const { data: userData } = await supabase.auth.getUser();
    const authEmail = userData?.user?.email;
    if (!authEmail) return;

    const { data: dept } = await supabase
      .from('departments')
      .select('*')
      .eq('hod_email', authEmail)
      .maybeSingle();

    if (dept) {
      const newProfile = {
        id: userId,
        email: authEmail,
        full_name: dept.hod_name,
        role: 'hod' as const,
        department_id: dept.id,
      };
      const { data: inserted, error: insertError } = await supabase
        .from('user_profiles')
        .insert(newProfile)
        .select()
        .maybeSingle();

      if (insertError) {
        console.error('Error auto-creating profile:', insertError);
      } else if (inserted) {
        setProfile(inserted);
        return;
      }
    }

    // 3. Fallback: build a minimal profile from auth user metadata
    const meta = userData?.user?.user_metadata;
    setProfile({
      id: userId,
      email: authEmail,
      full_name: meta?.full_name || authEmail.split('@')[0],
      role: meta?.role || 'hod',
      department_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    departmentId?: string
  ) => {
    if (!supabase) throw new Error('Supabase not configured');
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      throw error;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email,
          full_name: fullName,
          role,
          department_id: departmentId || null
        });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        throw profileError;
      }
    }

    setLoading(false);
  };

  const signOut = async () => {
    if (!supabase) return;
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
