import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || (import.meta as any).env.SUPABASE_URL;
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.SUPABASE_ANON_KEY;

const DEFAULT_URL = 'https://volhbvmslrtydzvtdamc.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbGhidm1zbHJ0eWR6dnRkYW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI5OTY0MDAsImV4cCI6MjAyODU3MjQwMH0.X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X';

// Ensure URL is a valid Supabase URL
const formatUrl = (url: string | undefined) => {
  if (!url || url === 'undefined' || url.includes('your-project-id')) return DEFAULT_URL;
  
  let formatted = url.trim();
  
  // ERROR DETECTION: If user pasted a postgresql connection string
  if (formatted.startsWith('postgresql://') || formatted.includes(':5432')) {
    // Pattern 1: db.[id].supabase.co
    const match1 = formatted.match(/db\.([^.]+)\.supabase\.co/);
    // Pattern 2: [id].supabase.co
    const match2 = formatted.match(/@([^:]+)\.supabase\.co/);
    
    const projectId = (match1 && match1[1]) || (match2 && match2[1]);
    
    if (projectId) {
      const fixedUrl = `https://${projectId}.supabase.co`;
      console.warn('--- SUPABASE CONFIGURATION NOTE ---');
      console.warn('You used a "Database Connection String" (postgresql://) in your settings.');
      console.warn('I have automatically converted it to the correct API URL:', fixedUrl);
      console.warn('SECURITY WARNING: Your connection string contains your database password. For safety, please update VITE_SUPABASE_URL in your Render settings to the URL above.');
      console.warn('-----------------------------------');
      return fixedUrl;
    }
    
    console.error('SUPABASE ERROR: Invalid URL format. Please use the "Project API URL" (https://...) from Supabase settings.');
    return DEFAULT_URL;
  }

  if (!formatted.startsWith('http')) formatted = `https://${formatted}`;
  formatted = formatted.replace(/\/+$/, '');
  return formatted;
};

const supabaseUrl = formatUrl(rawUrl);
const supabaseAnonKey = (rawKey && rawKey.length > 20 && rawKey !== 'your-anon-key' && rawKey !== 'undefined') 
  ? rawKey.trim() 
  : DEFAULT_KEY;

// Debug logging for the user (visible in F12 console)
if ((import.meta as any).env.PROD) {
  console.log('--- Supabase Config Check ---');
  console.log('URL Source:', rawUrl ? 'Environment Variable' : 'Fallback Default');
  console.log('Key Source:', (rawKey && rawKey.length > 20) ? 'Environment Variable' : 'Fallback Default');
  if (!rawUrl || !rawKey) {
    console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in Render settings!');
  }
  console.log('-----------------------------');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log configuration status (without exposing full keys)
const buildTime = '2026-04-13 11:00 AM'; // Manual timestamp to track updates
console.log(`[${buildTime}] Supabase initialized with URL: ${supabaseUrl.substring(0, 25)}...`);
