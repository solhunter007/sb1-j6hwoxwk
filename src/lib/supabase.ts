import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key) => {
        try {
          const item = localStorage.getItem(key);
          return item;
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Handle storage error silently
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Handle storage error silently
        }
      }
    }
  },
  cookies: {
    name: 'sb-auth',
    lifetime: 60 * 60 * 24 * 7, // 7 days
    domain: window.location.hostname,
    path: '/',
    sameSite: 'Strict'
  }
});