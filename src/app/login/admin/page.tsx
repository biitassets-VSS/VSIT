'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Mail, Lock, ArrowRight, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);

  // Initialize theme
  useEffect(() => {
    const isSystemDark = document.documentElement.classList.contains('dark') || true; // Defaulting to dark
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
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 font-sans antialiased transition-colors duration-500 ${isDark ? 'bg-[#09090b]' : 'bg-slate-50'}`}>
      
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-2.5 rounded-full backdrop-blur-md border transition-all duration-300 ${isDark ? 'bg-white/10 border-white/10 text-zinc-400 hover:text-white hover:bg-white/20' : 'bg-black/5 border-black/10 text-slate-500 hover:text-slate-900 hover:bg-black/10'}`}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="relative w-full max-w-[420px]">
        
        {/* Glow Effect */}
        <div className={`absolute -inset-1 rounded-[2.5rem] blur-xl opacity-50 animate-pulse transition-colors duration-700 ${isDark ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-blue-200 to-indigo-200'}`}></div>
        
        {/* Main Glass Card */}
        <div className={`relative rounded-[2rem] p-8 md:p-10 border shadow-2xl flex flex-col items-center transition-colors duration-500 ${isDark ? 'bg-[#121212]/95 backdrop-blur-xl border-zinc-800' : 'bg-white/95 backdrop-blur-xl border-white shadow-blue-900/5'}`}>
          
          {/* Smart Logo Container - Ensures readability in both themes */}
          <div className={`mb-6 p-3 rounded-2xl transition-colors duration-500 ${isDark ? 'bg-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]' : 'bg-transparent'}`}>
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solution Logo" 
              className="h-10 w-auto object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          
          <div className="w-full text-center mb-8">
            <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 transition-colors ${isDark ? 'text-blue-500' : 'text-blue-600'}`}>
              Virtual Staffing Solution
            </h2>
            <h1 className={`text-2xl font-bold tracking-tight mb-2 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Admin Portal
            </h1>
            <p className={`text-sm font-medium transition-colors ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              System management & secure registry
            </p>
          </div>

          {error && (
            <div className={`w-full p-4 mb-6 rounded-xl flex items-start gap-3 border text-left transition-colors ${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-4 text-left">
            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Admin Email</label>
              <div className="relative">
                <Mail size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@virtualstaffing.com"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all border ${isDark ? 'bg-[#09090b] border-zinc-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'}`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Password</label>
              <div className="relative">
                <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all border ${isDark ? 'bg-[#09090b] border-zinc-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'}`}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className={`w-full py-4 mt-4 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 text-white shadow-lg transition-all disabled:opacity-70 ${isDark ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>Secure Login <ArrowRight size={16} /></>}
            </button>
          </form>
          
        </div>
      </div>

      {/* Page-Level Copyright Footer */}
      <div className={`absolute bottom-6 text-[11px] font-semibold tracking-wider transition-colors duration-500 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
        Copyright © {new Date().getFullYear()} AinodeArt
      </div>
    </div>
  );
}