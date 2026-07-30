'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark'); 
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;
      if (profile?.status === 'Disabled') throw new Error('Account disabled by administrator.');

      localStorage.setItem('vsit_staff_session', JSON.stringify(profile || authData.user));

      setTimeout(() => {
        window.location.href = '/staff';
      }, 400);

    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 font-sans antialiased relative overflow-hidden">
      
      {/* 🌟 THE LIGHT ENGINE: These hidden glowing orbs sit behind the card. 
          Without these, the black layout background turns the glass into muddy gray. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[500px] pointer-events-none z-0 opacity-60 dark:opacity-40 flex justify-between items-center">
        <div className="w-[350px] h-[350px] bg-orange-500 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="w-[350px] h-[350px] bg-purple-600 rounded-full blur-[120px] mix-blend-screen"></div>
      </div>
      
      <div className="relative w-full max-w-md z-10">
        
        {/* 🌟 ULTRA PREMIUM GLASS CARD: 2% Opacity (0.02) to ensure it is crystal clear, not muddy */}
        <div className="relative bg-white/[0.05] dark:bg-white/[0.02] backdrop-blur-[40px] rounded-[2rem] p-8 md:p-10 border border-white/[0.2] dark:border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
          
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solution Logo" 
            className="h-12 w-auto mb-5 object-contain drop-shadow-md"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <div className="w-16 h-16 bg-purple-500/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-inner">
            <Users size={28} />
          </div>
          
          <h2 className="text-sm font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1">Virtual Staffing Solution</h2>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-slate-900 dark:text-zinc-100">Staff Portal</h1>
          <p className="text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-400 mb-8">View hardware & sign agreements</p>

          {error && (
            <div className="w-full p-4 mb-6 rounded-xl flex items-start gap-3 bg-rose-500/10 backdrop-blur-md border border-rose-500/20 text-rose-600 dark:text-rose-400 text-left shadow-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Employee Email</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/70 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                {/* 🌟 PURE GLASS INPUTS: Changed to deeply transparent black (bg-black/30) with delicate white borders */}
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@virtualstaffing.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-black/[0.05] dark:bg-black/[0.3] backdrop-blur-xl border border-black/10 dark:border-white/[0.08] focus:bg-transparent dark:focus:bg-black/[0.5] focus:border-purple-500/80 focus:ring-4 focus:ring-purple-500/20 text-slate-900 dark:text-zinc-100 placeholder:text-slate-500/70 shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Password</label>
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/70 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                {/* 🌟 PURE GLASS INPUTS: Changed to deeply transparent black (bg-black/30) with delicate white borders */}
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-black/[0.05] dark:bg-black/[0.3] backdrop-blur-xl border border-black/10 dark:border-white/[0.08] focus:bg-transparent dark:focus:bg-black/[0.5] focus:border-purple-500/80 focus:ring-4 focus:ring-purple-500/20 text-slate-900 dark:text-zinc-100 placeholder:text-slate-500/70 shadow-inner"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-purple-600/90 backdrop-blur-md hover:bg-purple-500 border border-purple-400/50 shadow-[0_4px_24px_rgba(168,85,247,0.4)] transition-all duration-300 disabled:opacity-70 cursor-pointer">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>Access Portal <ArrowRight size={16} /></>}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}