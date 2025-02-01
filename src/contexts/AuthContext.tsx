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

// Rate limiting configuration
const RATE_LIMIT = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
};

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'individual' | 'church' | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Rate limiting state
  const [rateLimitState, setRateLimitState] = useState<Record<string, RateLimitState>>({});

  const checkRateLimit = (identifier: string): boolean => {
    const now = Date.now();
    const state = rateLimitState[identifier] || { attempts: 0, lastAttempt: 0, lockedUntil: null };

    // Check if account is locked
    if (state.lockedUntil && now < state.lockedUntil) {
      const remainingMinutes = Math.ceil((state.lockedUntil - now) / 60000);
      toast.error(`Account temporarily locked. Please try again in ${remainingMinutes} minutes or reset your password.`);
      return false;
    }

    // Reset attempts if last attempt was more than lockout duration ago
    if (now - state.lastAttempt > RATE_LIMIT.lockoutDuration) {
      state.attempts = 0;
    }

    return true;
  };

  const updateRateLimit = (identifier: string, success: boolean) => {
    const now = Date.now();
    const state = rateLimitState[identifier] || { attempts: 0, lastAttempt: 0, lockedUntil: null };

    if (success) {
      // Reset on successful login
      delete rateLimitState[identifier];
      setRateLimitState({ ...rateLimitState });
      return;
    }

    // Update failed attempts
    state.attempts += 1;
    state.lastAttempt = now;

    // Lock account if max attempts exceeded
    if (state.attempts >= RATE_LIMIT.maxAttempts) {
      state.lockedUntil = now + RATE_LIMIT.lockoutDuration;
      toast.error(`Account temporarily locked for security. Please try again in 15 minutes or reset your password.`);
    }

    setRateLimitState({ ...rateLimitState, [identifier]: state });
  };

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

  const signIn = async (identifier: string, password: string) => {
    try {
      // Check rate limiting
      if (!checkRateLimit(identifier)) {
        return;
      }

      // First check if the identifier exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.eq.${identifier},username.eq.${identifier}`)
        .single();

      if (profileError || !profileData) {
        updateRateLimit(identifier, false);
        throw new Error('This email address is not registered. Please sign up or try a different email.');
      }

      // Attempt sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profileData.id,
        password,
      });

      if (signInError) {
        updateRateLimit(identifier, false);
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect password. Please try again.');
        }
        throw signInError;
      }

      // Success
      updateRateLimit(identifier, true);
      toast.success('Successfully signed in');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred');
      }
      throw error;
    }
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
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;
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
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(`${newUser.id}/profile.jpg`, profileImage);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(uploadData.path);

          avatarUrl = publicUrl;
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

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all local storage
      localStorage.clear();
      
      // Navigate to home page
      navigate('/', { replace: true });
      toast.success('Successfully signed out');
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