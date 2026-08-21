'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileCheck, Upload, Save, Loader2, ArrowLeft } from 'lucide-react';

export default function DemoTaskPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
  }, []);

  const theme = {
    glassCard: isDarkMode ? 'bg-zinc-950/60 backdrop-blur-3xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]' : 'bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_16px_40px_rgba(31,38,135,0.07)]',
    glassItem: isDarkMode ? 'bg-white/5 backdrop-blur-2xl border border-white/10' : 'bg-white/50 backdrop-blur-2xl border border-white/80',
    inputBg: isDarkMode ? 'bg-black/50 border border-white/20 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20' : 'bg-white border border-slate-300 text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      alert("Task submitted successfully for HR Review!");
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen p-6 sm:p-10 relative z-10 flex flex-col items-center justify-center">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className={`w-full max-w-3xl ${theme.glassCard} rounded-4xl p-8`}>
        
        <div className="flex justify-between items-center border-b border-white/20 pb-4 mb-6">
          <h1 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}><FileCheck className="text-purple-500"/> Demo Assignment</h1>
          <button onClick={() => router.push('/dashboard')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${theme.glassItem} ${theme.textMain}`}>Back</button>
        </div>

        <div className={`p-6 rounded-3xl mb-6 ${theme.glassItem} border-l-4 border-l-purple-500`}>
          <h3 className={`text-lg font-bold mb-2 ${theme.textMain}`}>Create a React Dashboard UI</h3>
          <p className={`text-sm font-medium ${theme.textSub}`}>Please create a simple React functional component using Tailwind CSS that displays a user profile card. Zip your project folder and upload it below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`p-10 border-2 border-dashed ${isDarkMode ? 'border-white/20 bg-white/5' : 'border-slate-300 bg-white/40'} rounded-3xl transition-colors flex flex-col items-center justify-center gap-4 hover:border-purple-500/50`}>
            <Upload size={48} className="text-purple-500" />
            <div className="text-center">
              <p className={`text-sm font-bold ${theme.textMain}`}>Upload Project File (.ZIP)</p>
            </div>
            <input required type="file" accept=".zip,.rar" className={`mt-2 text-xs font-bold cursor-pointer transition-all file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-bold file:cursor-pointer ${theme.textMain} file:bg-purple-500 file:text-white hover:file:opacity-90`} />
          </div>

          <div>
            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain}`}>Submission Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className={`w-full p-4 rounded-2xl text-sm outline-none resize-none h-24 ${theme.inputBg}`} placeholder="Add any comments for the reviewer..." />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-[0_4px_20px_rgba(147,51,234,0.4)] transition-all flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Submit Demo Task
          </button>
        </form>
      </div>
    </div>
  );
}