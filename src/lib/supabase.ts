import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.SUPABASE_URL;
const rawKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.SUPABASE_ANON_KEY;

// Check if valid credentials are provided
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  typeof rawKey === 'string' &&
  rawKey.trim() !== '' &&
  rawKey !== 'your-anon-key' &&
  rawKey !== 'undefined'
);

const formatUrl = (url: string | undefined) => {
  if (!url || url === 'undefined') return 'https://volhbvmslrtydzvtdamc.supabase.co';
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
const supabaseAnonKey = rawKey?.trim() || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
