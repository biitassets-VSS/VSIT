'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen w-full bg-transparent flex items-center justify-center p-4 font-sans antialiased relative overflow-hidden selection:bg-purple-500/30">
      
      {/* 🌟 VIBRANT AMBIENT LIGHT ENGINE: 
          Massive, highly blurred orbs positioned exactly like your screenshot 
          to create the perfect dark-glass refraction. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        {/* Left Orange Glow */}
        <div className="absolute left-[10%] w-[40vw] h-[60vh] bg-orange-500/30 dark:bg-orange-600/20 blur-[120px] rounded-full mix-blend-screen transition-all duration-1000" />
        {/* Right Purple Glow */}
        <div className="absolute right-[10%] w-[40vw] h-[60vh] bg-purple-600/30 dark:bg-purple-700/20 blur-[120px] rounded-full mix-blend-screen transition-all duration-1000" />
      </div>
      
      <div className="relative w-full max-w-md z-10">
        
        {/* 🌟 TRUE MAC OS 2026 GLASS CARD: Deep blur, high transparency, crisp delicate borders */}
        <div className="relative bg-white/20 dark:bg-white/5 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col items-center text-center ring-1 ring-black/5 dark:ring-white/5">
          
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solution Logo" 
            className="h-10 w-auto mb-6 object-contain drop-shadow-md"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <div className="w-16 h-16 bg-purple-500/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-5 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-inner">
            <Users size={28} />
          </div>
          
          <h2 className="text-[10px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-400 mb-1.5 drop-shadow-sm">Virtual Staffing Solution</h2>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-slate-900 dark:text-white">Staff Portal</h1>
          <p className="text-xs font-bold tracking-wide text-slate-600 dark:text-slate-400 mb-8">View hardware & sign agreements</p>

          {error && (
            <div className="w-full p-4 mb-6 rounded-2xl flex items-start gap-3 bg-rose-500/10 backdrop-blur-md border border-rose-500/20 text-rose-700 dark:text-rose-400 text-left shadow-inner">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-5 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Employee Email</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                
                {/* Frosted Glass Inputs */}
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@virtualstaffing.com"
                  className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm font-bold outline-none transition-all bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 focus:bg-white/60 dark:focus:bg-white/10 focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/15 text-slate-900 dark:text-white placeholder:text-slate-500/70 dark:placeholder:text-white/30 shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Password</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                
                {/* Frosted Glass Inputs */}
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm font-bold outline-none transition-all bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 focus:bg-white/60 dark:focus:bg-white/10 focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/15 text-slate-900 dark:text-white placeholder:text-slate-500/70 dark:placeholder:text-white/30 shadow-inner"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 text-white bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border border-purple-400/30 shadow-[0_8px_20px_rgba(147,51,234,0.3)] transition-all duration-300 disabled:opacity-70 cursor-pointer">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>Access Portal <ArrowRight size={16} /></>}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}