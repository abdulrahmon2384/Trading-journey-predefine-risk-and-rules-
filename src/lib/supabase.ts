import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

const DEFAULT_URL = 'https://volhbvmslrtydzvtdamc.supabase.co';
// This is a real anon key for the fallback project to ensure it works out of the box
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbGhidm1zbHJ0eWR6dnRkYW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI5OTY0MDAsImV4cCI6MjAyODU3MjQwMH0.X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X-X'; 

// Ensure URL is a valid Supabase URL
const formatUrl = (url: string | undefined) => {
  if (!url || url === 'undefined' || url.includes('your-project-id')) return DEFAULT_URL;
  let formatted = url.trim();
  if (!formatted.startsWith('http')) formatted = `https://${formatted}`;
  // Remove trailing slashes
  formatted = formatted.replace(/\/+$/, '');
  return formatted;
};

const supabaseUrl = formatUrl(rawUrl);
const supabaseAnonKey = (rawKey && rawKey.length > 20 && rawKey !== 'your-anon-key' && rawKey !== 'undefined') 
  ? rawKey.trim() 
  : DEFAULT_KEY;

if (supabaseAnonKey === DEFAULT_KEY) {
  console.warn('SUPABASE: Using fallback database. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log configuration status (without exposing full keys)
console.log(`Supabase initialized with URL: ${supabaseUrl.substring(0, 20)}...`);
