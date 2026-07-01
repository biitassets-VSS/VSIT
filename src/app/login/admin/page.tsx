'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark'); 
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // Listen for Supabase to confirm the session is written to storage
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          authListener.subscription.unsubscribe();
          window.location.href = '/admin';
        }
      });

      // Fallback timeout just in case the event fires too fast
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans antialiased">
      <div className="relative w-full max-w-md">
        
        {/* ORANGE NEON GLOW */}
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 rounded-[2.5rem] blur-md opacity-75 animate-pulse"></div>
        
        <div className="relative bg-[#121212] rounded-[2rem] p-8 md:p-10 border border-[#27272a] shadow-2xl flex flex-col items-center text-center">
          
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solution Logo" 
            className="h-12 w-auto mb-5 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <div className="w-16 h-16 bg-orange-600/20 rounded-2xl flex items-center justify-center mb-4 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.5)]">
            <Shield size={28} />
          </div>
          
          <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 mb-1">Virtual Staffing Solution</h2>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-zinc-100">Admin Portal</h1>
          <p className="text-sm font-semibold tracking-wide text-zinc-400 mb-8">System management & registry access</p>

          {error && (
            <div className="w-full p-4 mb-6 rounded-xl flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-left">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Admin Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@virtualstaffing.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-[#0a0a0a] border border-[#27272a] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-zinc-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-[#0a0a0a] border border-[#27272a] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-zinc-100"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-orange-600 hover:bg-orange-700 shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all disabled:opacity-70">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>Secure Login <ArrowRight size={16} /></>}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}