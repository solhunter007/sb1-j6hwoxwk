import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string, userType: string, profileImage?: string) => Promise<void>;
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

  const uploadProfileImage = async (userId: string, base64Image: string): Promise<string> => {
    // Remove the data:image/jpeg;base64, prefix
    const base64Data = base64Image.split(',')[1];
    const fileName = `${userId}/profile.jpg`;

    // Convert base64 to Uint8Array
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }

    // Upload the image
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, bytes, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload profile image');
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
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
      const { data: { user }, error } = await supabase.auth.signUp({
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

      if (error) throw error;
      if (!user) throw new Error('Failed to create account');

      let avatarUrl = null;

      // If we have a profile image, upload it
      if (profileImage) {
        try {
          avatarUrl = await uploadProfileImage(user.id, profileImage);
        } catch (error) {
          console.error('Error uploading profile image:', error);
          toast.error('Failed to upload profile image');
        }
      }

      // Update the profile with the avatar URL if we have one
      if (avatarUrl) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating profile with avatar:', updateError);
        }
      }

      toast.success('Account created successfully!');
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