'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, Mail, Lock, ArrowRight, Loader2, AlertCircle, Download, Monitor } from 'lucide-react';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remove dark mode class for the white theme
  useEffect(() => {
    document.documentElement.classList.remove('dark'); 
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (authError) throw authError;

      // 2. Fetch the user's profile to check if they are disabled
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;
      if (profile?.status === 'Disabled') throw new Error('Account disabled by administrator.');

      // 3. 🌟 THE CRITICAL FIX: Set the exact local storage key your Staff layout expects
      localStorage.setItem('vsit_staff_session', JSON.stringify(profile || authData.user));

      // 4. Force a hard redirect so the layout reads the fresh local storage data
      setTimeout(() => {
        window.location.href = '/staff';
      }, 400);

    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4 font-sans antialiased relative overflow-hidden">
      
      <div className="relative w-full max-w-md z-10">
        
        {/* 🌟 PURPLE NEON GLOW EFFECT */}
        <div className="absolute -inset-1 bg-linear-to-r from-purple-500 via-fuchsia-400 to-purple-500 rounded-[2.5rem] blur-xl opacity-60 animate-pulse"></div>
        
        {/* MAIN CARD (WHITE THEME) */}
        <div className="relative bg-white rounded-4xl p-8 md:p-10 border border-white/80 shadow-2xl flex flex-col items-center text-center">
          
          {/* COMPANY LOGO */}
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solution Logo" 
            className="h-12 w-auto mb-5 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          {/* PURPLE ICON */}
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 text-purple-600 border border-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Users size={28} />
          </div>
          
          <h2 className="text-sm font-black uppercase tracking-widest text-purple-600 mb-1">Virtual Staffing Solution</h2>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-slate-900">Staff Portal</h1>
          <p className="text-sm font-semibold tracking-wide text-slate-500 mb-8">View hardware & sign agreements</p>

          {error && (
            <div className="w-full p-4 mb-6 rounded-xl flex items-start gap-3 bg-rose-50 border border-rose-100 text-rose-600 text-left">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Employee Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@virtualstaffing.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-white border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-white border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700 shadow-[0_4px_20px_rgba(168,85,247,0.4)] transition-all disabled:opacity-70 cursor-pointer">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>Access Portal <ArrowRight size={16} /></>}
            </button>
          </form>
          
        </div>
      </div>

      {/* 💻 WINDOWS APP DOWNLOAD BUTTON (Only on Login Page) */}
      <div className="fixed bottom-4 left-5 z-50">
        <a
          href="https://github.com/biitassets-VSS/VSIT/releases/download/v0.1.0/Virtual.Staffing.Portal.Setup.0.1.0.exe"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 border border-slate-700 group cursor-pointer"
          title="Download Virtual Staffing Solutions Windows App (.exe)"
        >
          <Monitor size={15} className="text-purple-400 group-hover:animate-pulse shrink-0" />
          <span className="hidden sm:inline">Download Desktop App (.exe)</span>
          <span className="sm:hidden">App (.exe)</span>
          <Download size={14} className="opacity-80 shrink-0" />
        </a>
      </div>

    </div>
  );
}