import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string, userType: string, profileImage?: string) => Promise<void>;
  signOut: () => Promise<void>;
  userType: 'individual' | 'church' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'individual' | 'church' | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if (session?.user) {
          setUserType(session.user.user_metadata.user_type);
          handleAuthRedirect(session.user.user_metadata.user_type);
        }
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (!session) {
          // Clear all local storage on logout
          localStorage.clear();
          setUser(null);
          setUserType(null);
          navigate('/');
        } else {
          setUser(session.user);
          setUserType(session.user.user_metadata.user_type);
          handleAuthRedirect(session.user.user_metadata.user_type);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuthRedirect = (type: string) => {
    // Don't redirect if already on auth page or if explicitly navigating somewhere
    if (location.pathname === '/auth' || location.state?.from) {
      const destination = location.state?.from || getDefaultRoute(type);
      navigate(destination, { replace: true });
      return;
    }

    // Don't redirect if already on a valid route for the user type
    if (isValidRouteForUserType(location.pathname, type)) {
      return;
    }

    // Redirect to default route
    navigate(getDefaultRoute(type), { replace: true });
  };

  const getDefaultRoute = (type: string): string => {
    switch (type) {
      case 'church':
        return '/church/dashboard';
      case 'individual':
        return '/feed';
      default:
        return '/';
    }
  };

  const isValidRouteForUserType = (path: string, type: string): boolean => {
    if (type === 'church') {
      return path.startsWith('/church/') || path === '/feed' || path.startsWith('/sermon-notes/');
    }
    if (type === 'individual') {
      return path === '/feed' || path.startsWith('/sermon-notes/') || path.startsWith('/profile/');
    }
    return false;
  };

  const signUp = async (
    email: string, 
    password: string, 
    username: string, 
    fullName: string,
    userType: string,
    profileImage?: string
  ) => {
    try {
      // First check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) throw new Error('Username is already taken');

      // Sign up the user
      const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            user_type: userType,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!newUser) throw new Error('Failed to create account');

      let avatarUrl = null;

      // If we have a profile image, upload it
      if (profileImage) {
        try {
          avatarUrl = await uploadProfileImage(newUser.id, profileImage);
        } catch (error) {
          console.error('Error uploading profile image:', error);
          toast.error('Failed to upload profile image, but account was created');
        }
      }

      // Update the profile with the avatar URL if we have one
      if (avatarUrl) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', newUser.id);

        if (updateError) {
          console.error('Error updating profile with avatar:', updateError);
        }
      }

      toast.success('Account created successfully!');
      handleAuthRedirect(userType);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create account');
      }
      throw error;
    }
  };

  const signIn = async (identifier: string, password: string) => {
    try {
      // Check if identifier is an email (contains @)
      const isEmail = identifier.includes('@');
      
      if (isEmail) {
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });

        if (error) {
          throw new Error('Invalid email or password');
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
          throw new Error('Invalid username or password');
        }

        // Now sign in with the email
        const { error } = await supabase.auth.signInWithPassword({
          email: profile.id,
          password,
        });

        if (error) {
          throw new Error('Invalid username or password');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all local storage
      localStorage.clear();
      
      // Navigate to home page
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      // Clear state even on error
      setUser(null);
      setUserType(null);
      localStorage.clear();
      navigate('/', { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, userType }}>
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