'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Mail, Lock, ArrowRight, MonitorDown, Users, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 🌟 1. ADDED: Check if Supabase already has a saved active session
    // If they are already logged in, bypass the login screen completely.
    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = '/staff';
      }
    };
    checkActiveSession();

    // 🌟 2. Existing "Remember Me" logic (autofills inputs if they manually logged out)
    const savedEmail = localStorage.getItem('vsit_staff_saved_email');
    const savedPass = localStorage.getItem('vsit_staff_saved_pass');
    if (savedEmail && savedPass) {
      setEmail(savedEmail);
      setPassword(savedPass);
      setRememberMe(true);
    }
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

      if (rememberMe) {
        localStorage.setItem('vsit_staff_saved_email', email.trim());
        localStorage.setItem('vsit_staff_saved_pass', password);
      } else {
        localStorage.removeItem('vsit_staff_saved_email');
        localStorage.removeItem('vsit_staff_saved_pass');
      }

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

      <div className="relative w-full max-w-lg z-10">
        
        <div className="relative bg-white/35 backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-12 border border-white/60 shadow-[0_15px_50px_rgba(0,0,0,0.05)] flex flex-col items-center text-center ring-1 ring-white/80">
          
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solution Logo" 
            className="h-16 sm:h-20 w-auto mb-6 object-contain drop-shadow-sm"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <div className="w-20 h-20 bg-white/50 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 text-purple-600 border border-white/80 shadow-sm">
            <Users size={32} />
          </div>
          
          <h2 className="text-xs font-black uppercase tracking-widest text-purple-700 mb-2 drop-shadow-sm">Virtual Staffing Solution</h2>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 text-slate-900">Staff Portal</h1>
          <p className="text-sm font-bold tracking-wide text-slate-600 mb-8">View hardware & sign agreements</p>

          {error && (
            <div className="w-full p-4 mb-8 rounded-2xl flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-left shadow-sm">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-6 text-left">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-800 ml-1 block drop-shadow-sm">Employee Email</label>
              <div className="relative group">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-purple-600" />
                
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@virtualstaffing.com"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl text-base font-semibold outline-none transition-all bg-white/60 backdrop-blur-md border border-white/80 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 text-slate-900 placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-800 ml-1 block drop-shadow-sm">Password</label>
              <div className="relative group">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-purple-600" />
                
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-12 pr-12 py-4 rounded-2xl text-base font-semibold outline-none transition-all bg-white/60 backdrop-blur-md border border-white/80 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 text-slate-900 placeholder:text-slate-400 shadow-sm"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors focus:outline-none cursor-pointer"
                  tabIndex={-1} 
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center mt-2 ml-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 bg-white/60 cursor-pointer accent-purple-600"
                />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors drop-shadow-sm">
                  Remember login on this computer
                </span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-6 rounded-2xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/25 transition-all duration-300 disabled:opacity-70 cursor-pointer">
              {loading ? <><Loader2 size={20} className="animate-spin" /> Authenticating...</> : <>Access Portal <ArrowRight size={18} /></>}
            </button>
          </form>
          
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-20">
        <a 
          href="https://github.com/biitassets-VSS/VSIT/releases/download/v0.1.0/Virtual.Staffing.Portal.Setup.0.1.0.exe" 
          download
          className="flex items-center gap-2.5 px-6 py-4 bg-white/50 backdrop-blur-2xl border border-white/80 text-purple-800 rounded-2xl text-sm font-bold transition-all hover:bg-white/80 hover:scale-105 shadow-md cursor-pointer"
        >
          <MonitorDown size={18} className="text-purple-600" />
          Download Desktop App (.exe)
        </a>
      </div>

    </div>
  );
}