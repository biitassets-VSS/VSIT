'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);

  // Initialize theme
  useEffect(() => {
    const isSystemDark = document.documentElement.classList.contains('dark') || true;
    setIsDark(isSystemDark);
    if (isSystemDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

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

      const isAdminEmail = email.trim().toLowerCase() === 'lakhwinder.bi@outlook.com';
      const isActuallyAdmin = profile?.role === 'admin' || isAdminEmail;

      if (!isActuallyAdmin) {
        await supabase.auth.signOut();
        throw new Error('Not authorized for Admin access.');
      }

      localStorage.setItem('vsit_admin_session', JSON.stringify(profile || authData.user));

      setTimeout(() => {
        window.location.href = '/admin';
      }, 400);

    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 md:p-8 font-sans antialiased transition-colors duration-500 ${isDark ? 'bg-[#09090b]' : 'bg-slate-50'}`}>
      
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        aria-label="Toggle Dark Mode"
        className={`absolute top-6 right-6 p-3 rounded-full backdrop-blur-md border shadow-sm transition-all duration-300 z-50 ${isDark ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-orange-500/50' : 'bg-white/80 border-slate-200 text-slate-500 hover:text-orange-400 hover:border-orange-300'}`}
      >
        {isDark ? <Sun size={20} className="stroke-[2.5]" /> : <Moon size={20} className="stroke-[2.5]" />}
      </button>

      <div className="relative w-full max-w-[440px]">
        
        {/* Neon Orange Glow Effect */}
        <div className={`absolute -inset-1 rounded-[2.5rem] blur-2xl opacity-40 animate-pulse transition-colors duration-700 ${isDark ? 'bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600' : 'bg-gradient-to-r from-orange-300 via-amber-300 to-orange-300'}`}></div>
        
        {/* Main Glass Card */}
        <div className={`relative rounded-[2rem] p-8 sm:p-10 border shadow-2xl flex flex-col items-center transition-colors duration-500 ${isDark ? 'bg-[#121212]/95 backdrop-blur-2xl border-zinc-800' : 'bg-white/95 backdrop-blur-2xl border-white shadow-orange-900/5'}`}>
          
          {/* Smart Logo Container */}
          <div className={`mb-8 p-4 rounded-2xl w-full flex justify-center transition-colors duration-500 ${isDark ? 'bg-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] border border-white/5' : 'bg-transparent'}`}>
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solution Logo" 
              className="h-12 sm:h-14 w-auto object-contain drop-shadow-md"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          
          {/* Typography Header */}
          <div className="w-full text-center mb-8">
            <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-[0.25em] mb-2 text-orange-400">
              Virtual Staffing Solution
            </h2>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2.5 transition-colors ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              Admin Portal
            </h1>
            <p className={`text-sm sm:text-base font-medium transition-colors ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Secure system management registry
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`w-full p-4 mb-6 rounded-xl flex items-start gap-3 border text-left transition-colors ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="w-full space-y-5 text-left">
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-widest transition-colors ml-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Admin Email</label>
              <div className="relative">
                <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@virtualstaffing.com"
                  className={`w-full pl-12 pr-4 py-4 rounded-xl text-sm sm:text-base font-semibold outline-none transition-all border ${isDark ? 'bg-[#18181b] border-zinc-700 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 placeholder:text-zinc-600' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-slate-400'}`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-widest transition-colors ml-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Password</label>
              <div className="relative">
                <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full pl-12 pr-4 py-4 rounded-xl text-sm sm:text-base font-semibold outline-none transition-all border ${isDark ? 'bg-[#18181b] border-zinc-700 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 placeholder:text-zinc-600' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-slate-400'}`}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-6 rounded-xl text-sm font-extrabold uppercase tracking-widest flex items-center justify-center gap-3 text-white bg-orange-400 hover:bg-orange-600 shadow-[0_4px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_25px_rgba(249,115,22,0.4)] transition-all disabled:opacity-70 active:scale-[0.98]">
              {loading ? <><Loader2 size={20} className="animate-spin" /> Authenticating...</> : <>Secure Login <ArrowRight size={18} className="stroke-[2.5]" /></>}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}