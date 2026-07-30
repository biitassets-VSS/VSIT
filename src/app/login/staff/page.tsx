'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Mail, Lock, ArrowRight, MonitorDown, Users, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function StaffLoginPage() {
  const router = useRouter();
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
      <Toaster position="top-center" toastOptions={{ className: 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold rounded-2xl shadow-xl' }} />

      <div className="relative w-full max-w-md z-10">
        
        {/* 🌟 HIGH READABILITY FROSTED ACRYLIC CARD */}
        <div className="relative bg-white/85 dark:bg-zinc-900/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-white/60 dark:border-white/10 shadow-2xl flex flex-col items-center text-center ring-1 ring-slate-900/5 dark:ring-white/5">
          
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solution Logo" 
            className="h-10 w-auto mb-6 object-contain drop-shadow-sm"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <div className="w-16 h-16 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center mb-5 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/30 shadow-inner">
            <Users size={28} />
          </div>
          
          <h2 className="text-[10px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-400 mb-1.5">Virtual Staffing Solution</h2>
          
          {/* Maximum contrast text for readability */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-slate-900 dark:text-white">Staff Portal</h1>
          <p className="text-xs font-bold tracking-wide text-slate-600 dark:text-slate-400 mb-8">View hardware & sign agreements</p>

          {error && (
            <div className="w-full p-4 mb-6 rounded-2xl flex items-start gap-3 bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-left shadow-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-5 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Employee Email</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                
                {/* Clean, high-contrast input fields */}
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@virtualstaffing.com"
                  className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm font-bold outline-none transition-all bg-white dark:bg-black/40 border border-slate-200 dark:border-white/20 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Password</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400" />
                
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm font-bold outline-none transition-all bg-white dark:bg-black/40 border border-slate-200 dark:border-white/20 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 shadow-sm"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700 border border-purple-500 shadow-lg shadow-purple-600/25 transition-all duration-300 disabled:opacity-70 cursor-pointer">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>Access Portal <ArrowRight size={16} /></>}
            </button>
          </form>
          
        </div>
      </div>

      {/* 🌟 BOTTOM LEFT: Solid dark button to guarantee readability */}
      <div className="absolute bottom-6 left-6 z-20">
        <a 
          href="/downloads/VSIT-Desktop-App.exe" 
          download
          className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-900 dark:bg-white/10 backdrop-blur-xl border border-slate-800 dark:border-white/20 text-white rounded-2xl text-xs font-bold transition-all hover:bg-slate-800 dark:hover:bg-white/20 hover:scale-105 shadow-xl cursor-pointer ring-1 ring-white/10"
        >
          <MonitorDown size={16} className="text-purple-400" />
          Download Desktop App (.exe)
        </a>
      </div>

    </div>
  );
}