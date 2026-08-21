'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
  }, []);

  const theme = {
    glassCard: isDarkMode 
      ? 'bg-zinc-950/60 backdrop-blur-3xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]' 
      : 'bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_16px_40px_rgba(31,38,135,0.07)]',
    inputBg: isDarkMode 
      ? 'bg-black/50 border border-white/20 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all' 
      : 'bg-white/60 border border-slate-300 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    // MOCK LOGIN SIMULATION
    setTimeout(() => {
      // 🌟 PERMANENT FIX: Match layout.tsx exact expectations
      const mockUser = {
        email: email || 'admin@vsit.com',
        name: 'HR Admin',
        role: 'admin'
      };
      
      localStorage.setItem('vsit_admin_session', JSON.stringify(mockUser));
      localStorage.setItem('portal_role', 'hr_admin');
      
      router.push('/admin/settings');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-6 overflow-hidden">
      
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-orange-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className={`w-full max-w-md p-8 sm:p-10 rounded-4xl flex flex-col items-center text-center ${theme.glassCard} animate-in fade-in zoom-in-95 duration-500`}>
        
        <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/30 mb-6 shadow-inner">
          <ShieldCheck size={36} className="text-purple-500" />
        </div>
        
        <h2 className={`text-2xl font-bold tracking-tight ${theme.textMain}`}>Admin Gateway</h2>
        <p className={`text-xs font-semibold mt-2 mb-8 ${theme.textSub}`}>Authorized HR & IT Personnel Only</p>

        {errorMsg && (
          <div className="w-full p-3 mb-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-bold text-rose-500">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="w-full space-y-5">
          <div className="text-left relative">
            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain}`}>Official Email</label>
            <div className="relative">
              <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
              <input 
                required 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className={`w-full pl-11 pr-4 py-4 rounded-2xl text-sm font-semibold outline-none ${theme.inputBg}`} 
                placeholder="admin@vsit.com" 
              />
            </div>
          </div>

          <div className="text-left relative">
            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain}`}>Password</label>
            <div className="relative">
              <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
              <input 
                required 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className={`w-full pl-11 pr-4 py-4 rounded-2xl text-sm font-semibold outline-none ${theme.inputBg}`} 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !email || !password} 
            className="w-full py-4 mt-4 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-[0_4px_20px_rgba(147,51,234,0.4)] active:scale-95 transition-all bg-linear-to-r from-purple-600 to-indigo-600 hover:shadow-purple-500/30 disabled:opacity-50 flex items-center justify-center gap-2 border border-purple-400"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Authenticate <ArrowRight size={16}/></>}
          </button>
        </form>
      </div>
    </div>
  );
}