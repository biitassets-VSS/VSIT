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
    <div className="min-h-screen w-full bg-transparent flex items-center justify-center p-4 sm:p-8 font-sans antialiased relative overflow-hidden selection:bg-purple-500/30">
      <Toaster position="top-center" toastOptions={{ className: 'bg-white/95 backdrop-blur-xl border border-white/80 text-slate-900 font-bold rounded-2xl shadow-xl' }} />

      <div className="relative w-full max-w-md z-10">
        
        {/* 🌟 PURE WHITE FROSTED GLASS CARD: No black colors allowed! */}
        <div className="relative bg-white/70 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col items-center text-center ring-1 ring-slate-900/5">
          
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solution Logo" 
            className="h-10 w-auto mb-6 object-contain drop-shadow-sm"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <div className="w-16 h-16 bg-purple-100/80 rounded-2xl flex items-center justify-center mb-5 text-purple-600 border border-purple-200 shadow-inner">
            <Users size={28} />
          </div>
          
          <h2 className="text-[10px] font-black uppercase tracking-widest text-purple-700 mb-1.5">Virtual Staffing Solution</h2>
          
          {/* Maximum contrast text for absolute readability */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-slate-900">Staff Portal</h1>
          <p className="text-xs font-bold tracking-wide text-slate-600 mb-8">View hardware & sign agreements</p>

          {error && (
            <div className="w-full p-4 mb-6 rounded-2xl flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-left shadow-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-700 ml-1 block">Employee Email</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                
                {/* Crisp, frosted white inputs */}
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@virtualstaffing.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-white/60 border border-white/80 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-900 placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-700 ml-1 block">Password</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                
                {/* Crisp, frosted white inputs */}
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all bg-white/60 border border-white/80 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-900 placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-4 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700 shadow-md transition-all duration-300 disabled:opacity-70 cursor-pointer">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>Access Portal <ArrowRight size={16} /></>}
            </button>
          </form>
          
        </div>
      </div>

      {/* 🌟 BOTTOM LEFT: Light Frosted Glass Button (No Black) */}
      <div className="absolute bottom-6 left-6 z-20">
        <a 
          href="/downloads/VSIT-Desktop-App.exe" 
          download
          className="flex items-center gap-2.5 px-5 py-3.5 bg-white/80 backdrop-blur-xl border border-white/80 text-purple-700 rounded-xl text-xs font-bold transition-all hover:bg-white hover:scale-105 shadow-md cursor-pointer"
        >
          <MonitorDown size={16} className="text-purple-600" />
          Download Desktop App (.exe)
        </a>
      </div>

    </div>
  );
}