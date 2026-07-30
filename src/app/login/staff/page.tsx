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
      
      {/* 🌟 VIBRANT LIGHT ENGINE: Brighter, pure colors with no mix-blend modes to ensure they penetrate the glass */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] pointer-events-none z-0 flex justify-between items-center opacity-80 dark:opacity-60">
        <div className="w-[300px] h-[300px] bg-orange-500/80 rounded-full blur-[100px]"></div>
        <div className="w-[300px] h-[300px] bg-purple-600/80 rounded-full blur-[100px]"></div>
      </div>
      
      <div className="relative w-full max-w-md z-10">
        
        {/* 🌟 TRUE MAC OS GLASS CARD: Extremely low opacity white + high blur + crisp border */}
        <div className="relative bg-white/[0.02] dark:bg-white/[0.01] backdrop-blur-[32px] rounded-[24px] p-8 md:p-10 border border-white/[0.15] dark:border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col items-center text-center">
          
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solution Logo" 
            className="h-12 w-auto mb-5 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-inner">
            <Users size={28} />
          </div>
          
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 mb-1.5">Virtual Staffing Solution</h2>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">Staff Portal</h1>
          <p className="text-sm font-medium tracking-wide text-slate-600 dark:text-slate-300 mb-8">View hardware & sign agreements</p>

          {error && (
            <div className="w-full p-4 mb-6 rounded-xl flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-left">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-5 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Employee Email</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/80 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                
                {/* 🌟 FIXED INPUTS: Removed backdrop-blur. Used bg-white/[0.03] instead of bg-black. */}
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@virtualstaffing.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium outline-none transition-all bg-white/[0.04] dark:bg-white/[0.03] border border-white/[0.1] dark:border-white/[0.05] focus:bg-white/[0.08] dark:focus:bg-white/[0.06] focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/20 text-slate-900 dark:text-white placeholder:text-slate-500/80"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Password</label>
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/80 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                
                {/* 🌟 FIXED INPUTS: Removed backdrop-blur. Used bg-white/[0.03] instead of bg-black. */}
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium outline-none transition-all bg-white/[0.04] dark:bg-white/[0.03] border border-white/[0.1] dark:border-white/[0.05] focus:bg-white/[0.08] dark:focus:bg-white/[0.06] focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/20 text-slate-900 dark:text-white placeholder:text-slate-500/80"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-4 rounded-xl text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-purple-600/90 hover:bg-purple-500 border border-purple-400/30 shadow-[0_4px_20px_rgba(168,85,247,0.4)] transition-all duration-300 disabled:opacity-70 cursor-pointer">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>Access Portal <ArrowRight size={16} /></>}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}