import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });
    if (error) throw error;
  };

  const signIn = async (identifier: string, password: string) => {
    try {
      // Check if identifier is an email (contains @)
      const isEmail = identifier.includes('@');
      
      if (isEmail) {
        // First, check if the email exists
        const { data: emailCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', identifier)
          .maybeSingle();

        if (!emailCheck) {
          throw new Error('Email does not exist. Please check your email address or create a new account.');
        }

        // Attempt to sign in with email
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });

        if (error) {
          throw new Error('The email/username or password you entered is incorrect. Please try again.');
        }
      } else {
        // If it's not an email, assume it's a username
        // First, query the profiles table to get the email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', identifier)
          .maybeSingle();

        if (profileError || !profile) {
          throw new Error('The email/username or password you entered is incorrect. Please try again.');
        }

        // Now sign in with the email
        const { error } = await supabase.auth.signInWithPassword({
          email: profile.id,
          password,
        });

        if (error) {
          throw new Error('The email/username or password you entered is incorrect. Please try again.');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred. Please try again.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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