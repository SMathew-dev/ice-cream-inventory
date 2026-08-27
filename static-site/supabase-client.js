import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://atttqdrndjlelrrlupkw.supabase.co';
const SUPABASE_KEY='sb_publishable_Juq6FUFvX8ZT2BUd_C7T-g_6Tlyy0tL';

// app.js owns automatic token refresh. Secondary modules share this client
// without starting a second refresh timer against the same stored session.
export const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:false,
    detectSessionInUrl:false
  }
});

export async function requireSession(){
  const {data,error}=await sb.auth.getSession();
  if(error)throw error;
  if(!data.session)throw new Error('Your operator session is not ready. Sign in again.');
  return data.session;
}
