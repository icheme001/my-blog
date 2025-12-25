import "dotenv/config";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl); // Debug

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to use Supabase like pg pool
export const query = async (text, params) => {
  // This is a temporary wrapper - we'll convert queries to Supabase format
  throw new Error('Use supabase client directly for now');
};

export default supabase;