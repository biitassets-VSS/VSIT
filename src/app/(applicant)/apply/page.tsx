'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApplicantStore } from '@/store/useApplicantStore';
import { MessageCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

export default function ApplyLogin() {
  const router = useRouter();
  const login = useApplicantStore((state) => state.login);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const theme = {
    glassCard: isDarkMode ? 'bg-zinc-950/60 backdrop-blur-3xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]' : 'bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_16px_40px_rgba(31,38,135,0.07)]',
    inputBg: isDarkMode ? 'bg-black/50 border border-white/20 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'bg-white/60 border border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep('OTP'); }, 1500); 
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      
      // 🌟 FIX: Injecting applicant session token into localStorage
      localStorage.setItem('vsit_applicant_token', phone);
      
      login(phone);
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-6 overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className={`w-full max-w-md p-8 sm:p-10 rounded-4xl flex flex-col items-center text-center ${theme.glassCard}`}>
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 mb-6 shadow-inner">
          <MessageCircle size={36} className="text-emerald-500" />
        </div>
        
        <h2 className={`text-2xl font-bold tracking-tight ${theme.textMain}`}>Applicant Portal</h2>
        <p className={`text-xs font-semibold mt-2 mb-8 ${theme.textSub}`}>Secure login via WhatsApp to track your application.</p>

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="w-full space-y-5">
            <div className="text-left">
              <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain}`}>WhatsApp Number</label>
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={`w-full p-4 rounded-2xl text-sm font-semibold outline-none ${theme.inputBg}`} placeholder="+91 9876543210" />
            </div>
            <button type="submit" disabled={loading || !phone} className="w-full py-4 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all bg-linear-to-r from-emerald-500 to-emerald-600 hover:shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Send OTP <ArrowRight size={16}/></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="w-full space-y-5 animate-in fade-in slide-in-from-right-4">
            <div className="text-left">
              <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain}`}>Enter 6-Digit OTP</label>
              <input required type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} className={`w-full p-4 rounded-2xl text-center text-2xl font-black tracking-[0.5em] outline-none ${theme.inputBg}`} placeholder="------" />
            </div>
            <button type="submit" disabled={loading || otp.length < 6} className="w-full py-4 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all bg-linear-to-r from-blue-500 to-indigo-600 hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Verify & Login <CheckCircle2 size={16}/></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}