'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, Mail, Lock, ArrowRight, Loader2, AlertCircle, Download, Monitor } from 'lucide-react';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remove dark mode class for the white theme (if you want to force light mode, keep this. 
  // If you want the new premium dark mode glass to work, you can remove this useEffect eventually)
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
        
        {/* 🌟 PREMIUM GLOW: Softer ambient diffusion behind the glass */}
        <div className="absolute -inset-1 bg-linear-to-r from-orange-400/20 via-purple-400/20 to-orange-400/20 rounded-[2.5rem] blur-2xl opacity-60"></div>
        
        {/* 🌟 MAIN CARD: Removed solid dark backgrounds. Now ultra-premium transparent glass in BOTH themes */}
        <div className="relative bg-white/20 dark:bg-black/10 backdrop-blur-3xl rounded-4xl p-8 md:p-10 border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col items-center text-center transition-all duration-500">
          
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
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-slate-800 dark:text-zinc-100">Staff Portal</h1>
          <p className="text-sm font-semibold tracking-wide text-slate-600/80 dark:text-slate-400 mb-8">View hardware & sign agreements</p>

          {error && (
            <div className="w-full p-4 mb-6 rounded-xl flex items-start gap-3 bg-rose-500/10 backdrop-blur-md border border-rose-500/20 text-rose-600 dark:text-rose-400 text-left shadow-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Employee Email</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/70 dark:text-slate-400 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                {/* 🌟 INPUTS: Removed solid gray `bg-gray-800`. Now pure glass (`dark:bg-white/5`) */}
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@virtualstaffing.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/50 dark:border-white/10 focus:bg-white/60 dark:focus:bg-white/10 focus:border-purple-400/50 focus:ring-4 focus:ring-purple-400/10 text-slate-800 dark:text-zinc-100 placeholder:text-slate-500/70 dark:placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Password</label>
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/70 dark:text-slate-400 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                {/* 🌟 INPUTS: Removed solid gray `bg-gray-800`. Now pure glass (`dark:bg-white/5`) */}
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/50 dark:border-white/10 focus:bg-white/60 dark:focus:bg-white/10 focus:border-purple-400/50 focus:ring-4 focus:ring-purple-400/10 text-slate-800 dark:text-zinc-100 placeholder:text-slate-500/70 dark:placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-purple-600/90 backdrop-blur-md hover:bg-purple-600 border border-purple-500/50 shadow-[0_8px_24px_rgba(168,85,247,0.3)] transition-all duration-300 disabled:opacity-70 cursor-pointer">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>Access Portal <ArrowRight size={16} /></>}
            </button>
          </form>
          
        </div>
      </div>

      {/* 🌟 WINDOWS APP DOWNLOAD: Solid background completely removed. */}
      <div className="fixed bottom-5 left-6 z-999">
        <a
          href="https://github.com/biitassets-VSS/VSIT/releases/download/v0.1.0/Virtual.Staffing.Portal.Setup.0.1.0.exe"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-transparent backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-slate-800 dark:text-zinc-100 text-xs font-bold rounded-full transition-all duration-300 hover:bg-white/20 dark:hover:bg-white/5 hover:scale-105 group cursor-pointer"
          title="Download Virtual Staffing Solutions Windows App (.exe)"
        >
          <Monitor size={15} className="text-purple-600 dark:text-purple-400 group-hover:animate-pulse shrink-0" />
          <span className="hidden sm:inline">Download Desktop App (.exe)</span>
          <span className="sm:hidden">App (.exe)</span>
          <Download size={14} className="opacity-70 shrink-0" />
        </a>
      </div>

    </div>
  );
}