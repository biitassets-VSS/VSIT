'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🚨 REMOVED the useEffect that was forcing light mode and breaking your theme!

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
    // 🌟 Pure transparent wrapper. NO background colors to mess up your layout.
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 font-sans antialiased relative">
      
      <div className="relative w-full max-w-md z-10">
        
        {/* 🌟 TIGHT, SUBTLE GLOW: Removed the massive blur that was ruining the screen background. */}
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/30 via-purple-500/30 to-orange-500/30 rounded-[2.5rem] blur-xl opacity-50"></div>
        
        {/* 🌟 PURE GLASS CARD: Proper contrast for both light and dark mode without muddy gray */}
        <div className="relative bg-white/40 dark:bg-black/30 backdrop-blur-[24px] rounded-[2rem] p-8 md:p-10 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
          
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solution Logo" 
            className="h-12 w-auto mb-5 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <div className="w-16 h-16 bg-purple-500/15 dark:bg-purple-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 text-purple-700 dark:text-purple-400 border border-purple-500/20 shadow-sm">
            <Users size={28} />
          </div>
          
          <h2 className="text-sm font-black uppercase tracking-widest text-purple-700 dark:text-purple-400 mb-1">Virtual Staffing Solution</h2>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">Staff Portal</h1>
          <p className="text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300 mb-8">View hardware & sign agreements</p>

          {error && (
            <div className="w-full p-4 mb-6 rounded-xl flex items-start gap-3 bg-rose-500/15 backdrop-blur-md border border-rose-500/30 text-rose-700 dark:text-rose-400 text-left shadow-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Employee Email</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                {/* 🌟 GLASS INPUTS: Properly tinted for light and dark modes */}
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@virtualstaffing.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/80 dark:border-white/10 focus:bg-white/90 dark:focus:bg-black/60 focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/20 text-slate-900 dark:text-white placeholder:text-slate-500 shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Password</label>
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/80 dark:border-white/10 focus:bg-white/90 dark:focus:bg-black/60 focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/20 text-slate-900 dark:text-white placeholder:text-slate-500 shadow-inner"
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