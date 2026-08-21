'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Keyboard, FileCheck, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { useApplicantStore } from '@/store/useApplicantStore';

export default function ApplicantDashboard() {
  const router = useRouter();
  const { whatsappNumber, profileCompletionPct } = useApplicantStore();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
  }, []);

  const theme = {
    glassCard: isDarkMode ? 'bg-zinc-950/60 backdrop-blur-3xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]' : 'bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_16px_40px_rgba(31,38,135,0.07)]',
    glassItem: isDarkMode ? 'bg-white/5 backdrop-blur-2xl border border-white/10' : 'bg-white/50 backdrop-blur-2xl border border-white/80',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  const modules = [
    { title: 'Profile Setup', icon: <User size={24}/>, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', pct: profileCompletionPct, link: '/profile-setup', locked: false },
    { title: 'Typing Test', icon: <Keyboard size={24}/>, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', pct: 0, link: '/typing-test', locked: profileCompletionPct < 100 },
    { title: 'Demo Task', icon: <FileCheck size={24}/>, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', pct: 0, link: '/demo-task', locked: true }, // Locked until HR activates
  ];

  return (
    <div className="min-h-screen p-6 sm:p-10 relative z-10">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-orange-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto space-y-8">
        <div className={`${theme.glassCard} rounded-4xl p-6 md:p-8 flex justify-between items-center`}>
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${theme.textMain}`}>Welcome to VSIT</h1>
            <p className={`text-sm font-semibold mt-1 ${theme.textSub}`}>Applicant ID: {whatsappNumber}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Application Status</p>
            <p className="text-sm font-bold text-orange-500 mt-1">In Progress</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((mod, idx) => (
            <div key={idx} className={`${theme.glassCard} rounded-4xl p-6 flex flex-col relative overflow-hidden group transition-transform hover:-translate-y-1`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${mod.bg} ${mod.border} border ${mod.color}`}>
                  {mod.icon}
                </div>
                {mod.locked ? <Lock size={20} className={theme.textSub} /> : (mod.pct === 100 ? <CheckCircle2 size={24} className="text-emerald-500"/> : null)}
              </div>
              
              <h3 className={`text-lg font-bold ${theme.textMain}`}>{mod.title}</h3>
              
              <div className="mt-4 mb-6">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                  <span className={theme.textSub}>Progress</span>
                  <span className={mod.color}>{mod.pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${mod.locked ? 'bg-slate-500' : 'bg-current ' + mod.color}`} style={{ width: `${mod.pct}%` }} />
                </div>
              </div>

              <button 
                onClick={() => !mod.locked && router.push(mod.link)}
                disabled={mod.locked}
                className={`mt-auto w-full py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mod.locked ? `${theme.glassItem} opacity-50 cursor-not-allowed text-slate-500` : `bg-white/20 dark:bg-white/10 hover:bg-white/40 dark:hover:bg-white/20 ${theme.textMain} border border-white/20 cursor-pointer shadow-sm`}`}
              >
                {mod.locked ? 'Locked by HR' : (mod.pct === 100 ? 'Review' : 'Start Module')}
                {!mod.locked && <ArrowRight size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}