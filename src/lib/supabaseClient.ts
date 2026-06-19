// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// The || '' ensures the app doesn't instantly crash if variables are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// This creates one single, persistent connection
export const supabase = createClient(supabaseUrl, supabaseAnonKey);