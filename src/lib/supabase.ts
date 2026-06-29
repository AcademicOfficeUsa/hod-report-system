import { createClient, SupabaseClient } from '@supabase/Bolt Database-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let Bolt Database: SupabaseClient | null = null;
let configError: string | null = null;

if (supabaseUrl && supabaseAnonKey) {
  Bolt Database = createClient(supabaseUrl, supabaseAnonKey);
} else {
  configError = 'Supabase configuration is missing. Please check your environment variables.';
}

export { Bolt Database, configError };
export type { };
