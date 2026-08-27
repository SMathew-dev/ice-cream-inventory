import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://atttqdrndjlelrrlupkw.supabase.co';
const SUPABASE_KEY='sb_publishable_Juq6FUFvX8ZT2BUd_C7T-g_6Tlyy0tL';

export const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    storageKey:'ice-cream-ops-auth'
  }
});
