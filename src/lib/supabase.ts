import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://volhbvmslrtydzvtdamc.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_T4wHRYOj22LCowqKFO6cpw_DNV-6XE6';

if (supabaseAnonKey === 'MISSING_KEY' || supabaseAnonKey === 'sb_publishable_T4wHRYOj22LCowqKFO6cpw_DNV-6XE6') {
  console.info('SUPABASE: Using provided Publishable Key.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
