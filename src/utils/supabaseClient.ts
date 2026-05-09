// Optional Supabase client.
//
// Sync is disabled by default. The app works completely offline with no
// Supabase project. To enable cloud backup/sync, set these in `.env.local`:
//
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...
//
// When either is missing, every helper here is a no-op and `getSupabase()`
// returns null. UI surfaces sync state via `isSyncConfigured()`.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

let client: SupabaseClient | null = null;
if (url && anonKey) {
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function getSupabase(): SupabaseClient | null {
  return client;
}

export function isSyncConfigured(): boolean {
  return client !== null;
}

export function getPublicSupabaseUrl(): string | null {
  return url || null;
}
