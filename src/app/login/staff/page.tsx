'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note: If you want the dark theme to work, you might want to remove this useEffect eventually.
  // Right now, it forces the app out of dark mode on load, which can cause color clashes if your OS is in dark mode.
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
      
      <div className="relative w-full max-w-md z-10">
        
        {/* 🌟 AMBIENT GLOW: Softer, wider spread to illuminate the glass */}
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-400/30 via-purple-400/30 to-orange-400/30 rounded-[3rem] blur-3xl opacity-80"></div>
        
        {/* 🌟 FIXED MAIN CARD: Pure transparent frosted glass (bg-white/10), no more muddy dark colors */}
        <div className="relative bg-white/10 dark:bg-black/20 backdrop-blur-3xl rounded-[2rem] p-8 md:p-10 border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
          
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solution Logo" 
            className="h-12 w-auto mb-5 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <div className="w-16 h-16 bg-purple-500/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 text-purple-600 border border-purple-500/20 shadow-[0_8px_24px_rgba(168,85,247,0.15)]">
            <Users size={28} />
          </div>
          
          <h2 className="text-sm font-black uppercase tracking-widest text-purple-600 mb-1">Virtual Staffing Solution</h2>
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
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/70 transition-colors group-focus-within:text-purple-600" />
                {/* 🌟 FIXED INPUTS: bg-white/10 ensures it is clear glass, not solid gray */}
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@virtualstaffing.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 focus:bg-white/20 dark:focus:bg-white/10 focus:border-purple-400/60 focus:ring-4 focus:ring-purple-400/20 text-slate-900 dark:text-zinc-100 placeholder:text-slate-500/70 shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Password</label>
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/70 transition-colors group-focus-within:text-purple-600" />
                {/* 🌟 FIXED INPUTS: bg-white/10 ensures it is clear glass, not solid gray */}
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 focus:bg-white/20 dark:focus:bg-white/10 focus:border-purple-400/60 focus:ring-4 focus:ring-purple-400/20 text-slate-900 dark:text-zinc-100 placeholder:text-slate-500/70 shadow-inner"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-purple-600/90 backdrop-blur-md hover:bg-purple-600 border border-purple-500/50 shadow-[0_8px_24px_rgba(168,85,247,0.3)] transition-all duration-300 disabled:opacity-70 cursor-pointer">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>Access Portal <ArrowRight size={16} /></>}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}