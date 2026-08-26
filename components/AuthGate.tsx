'use client';

import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../lib/db/supabase';

export function AuthGate({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin'|'signup'>('signin');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage('Working…');
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: typeof window === 'undefined' ? undefined : window.location.href }
        });
    if (result.error) setMessage(result.error.message);
    else if (result.data.session) setMessage('Signed in.');
    else setMessage('Account created. Check your email if confirmation is required.');
  }

  if (loading) return <main className="auth-shell"><div className="auth-card"><h1>Ice Cream Inventory</h1><p>Loading secure operator access…</p></div></main>;
  if (session) return <>{children}</>;

  return <main className="auth-shell"><section className="auth-card">
    <p className="eyebrow">SDSU DAIRY PLANT PILOT</p>
    <h1>Ice Cream Inventory</h1>
    <p>Sign in before viewing or changing plant inventory.</p>
    <form onSubmit={submit} className="auth-form">
      <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="operator@example.com"/></label>
      <label>Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
      <button className="primary" type="submit">{mode==='signin'?'Sign in':'Create operator account'}</button>
    </form>
    {message&&<div className="notice">{message}</div>}
    <button className="link-button" onClick={()=>{setMode(mode==='signin'?'signup':'signin');setMessage('')}}>{mode==='signin'?'First time? Create operator account':'Already have an account? Sign in'}</button>
  </section></main>;
}
