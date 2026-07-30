'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Mail, Lock, ArrowRight, MonitorDown, Users } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        localStorage.setItem('vsit_staff_session', JSON.stringify(data.user));
        toast.success("Login Successful!");
        router.push('/staff');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* 🌟 BASE WRAPPER: Completely transparent so the Layout's light-orange (#FFF4E6) background bleeds through perfectly */
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-transparent selection:bg-purple-500/30">
      <Toaster position="top-right" toastOptions={{ className: 'bg-white/80 backdrop-blur-xl border border-white/60 text-slate-800 font-bold rounded-2xl shadow-xl' }} />

      {/* 🌟 AMBIENT GLOW ENGINE (Specifically for Login Page depth) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vh] bg-purple-500/10 blur-[120px] rounded-full mix-blend-multiply" />
      </div>

      {/* 🌟 PREMIUM ULTRA GLASS LOGIN CARD */}
      <div className="w-full max-w-md mx-4 bg-white/40 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-white/60 shadow-[0_15px_50px_rgba(0,0,0,0.05)] relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/logo.png" alt="Virtual Staffing Solutions" className="h-10 mb-6 drop-shadow-sm" />
          
          <div className="w-16 h-16 bg-purple-100/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-purple-600 mb-5 shadow-inner border border-purple-200/50">
            <Users size={28} />
          </div>
          
          <h2 className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-1">Virtual Staffing Solution</h2>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Portal</h1>
          <p className="text-xs font-semibold text-slate-500 mt-2">View hardware & sign agreements</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Employee Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@virtualstaffing.com" 
                className="w-full pl-11 pr-4 py-3.5 bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white/80 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••" 
                className="w-full pl-11 pr-4 py-3.5 bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white/80 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 transition-all shadow-inner"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 mt-2 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/25 cursor-pointer disabled:opacity-70 border border-purple-500/50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <>Access Portal <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>

      {/* 🌟 BOTTOM LEFT: Glass "Download App" Button */}
      <div className="absolute bottom-6 left-6 z-20">
        <a 
          href="/downloads/VSIT-Desktop-App.exe" 
          download
          className="flex items-center gap-2.5 px-5 py-3 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 text-white rounded-2xl text-xs font-bold transition-all hover:bg-slate-800 hover:scale-105 shadow-[0_8px_30px_rgba(0,0,0,0.15)] cursor-pointer"
        >
          <MonitorDown size={16} className="text-purple-400" />
          Download Desktop App (.exe)
        </a>
      </div>

      {/* 🌟 BOTTOM RIGHT: Fixed Readability Watermark */}
      <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
        <div className="px-4 py-2 bg-orange-900/10 backdrop-blur-2xl border border-orange-900/10 rounded-full shadow-sm">
          <span className="text-[10px] font-black tracking-widest uppercase text-orange-950/60 drop-shadow-sm">
            Designed by AinodeArt
          </span>
        </div>
      </div>

    </div>
  );
}