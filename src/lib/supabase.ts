import { createClient } from '@supabase/supabase-js';

const getStoredItem = (key: string): string => {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const rawEnvUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.SUPABASE_URL;
const rawEnvKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.SUPABASE_ANON_KEY;

const rawUrl = (rawEnvUrl && rawEnvUrl !== 'undefined' && rawEnvUrl.trim() !== '') 
  ? rawEnvUrl 
  : getStoredItem('custom_supabase_url');

const rawKey = (rawEnvKey && rawEnvKey !== 'undefined' && rawEnvKey.trim() !== '') 
  ? rawEnvKey 
  : getStoredItem('custom_supabase_anon_key');

// Check if valid credentials are provided
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  typeof rawKey === 'string' &&
  rawKey.trim() !== '' &&
  rawKey !== 'your-anon-key' &&
  !rawKey.includes('X-X-X-X') &&
  rawKey !== 'undefined'
);

export const saveCustomCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('custom_supabase_url', url.trim());
      localStorage.setItem('custom_supabase_anon_key', key.trim());
      window.location.reload();
    } catch (e) {
      console.error('Failed to save Supabase credentials:', e);
    }
  }
};

export const clearCustomCredentials = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('custom_supabase_url');
      localStorage.removeItem('custom_supabase_anon_key');
      window.location.reload();
    } catch (e) {
      console.error('Failed to clear credentials:', e);
    }
  }
};

const formatUrl = (url: string | undefined): string => {
  if (!url || url === 'undefined' || url.trim() === '') {
    return 'https://placeholder-project.supabase.co';
  }
  let formatted = url.trim();
  if (formatted.startsWith('postgresql://') || formatted.includes(':5432')) {
    const match1 = formatted.match(/db\.([^.]+)\.supabase\.co/);
    const match2 = formatted.match(/@([^:]+)\.supabase\.co/);
    const projectId = (match1 && match1[1]) || (match2 && match2[1]);
    if (projectId) return `https://${projectId}.supabase.co`;
  }
  if (!formatted.startsWith('http')) formatted = `https://${formatted}`;
  return formatted.replace(/\/+$/, '');
};

const supabaseUrl = formatUrl(rawUrl);
// Provide a structurally valid fallback string so createClient does NOT throw a fatal exception
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.empty_fallback_key';
const supabaseAnonKey = (rawKey && rawKey.trim() !== '' && rawKey !== 'undefined') ? rawKey.trim() : fallbackKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
