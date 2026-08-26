import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://atttqdrndjlelrrlupkw.supabase.co';
const fallbackPublishableKey = 'sb_publishable_Juq6FUFvX8ZT2BUd_C7T-g_6Tlyy0tL';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackPublishableKey;

export function isSupabaseConfigured() {
  return Boolean(url && publishableKey);
}

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!url || !publishableKey) throw new Error('Supabase is not configured.');
  if (!browserClient) {
    browserClient = createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  return browserClient;
}
