import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.ts';

export const admin: SupabaseClient = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'app' },
});
