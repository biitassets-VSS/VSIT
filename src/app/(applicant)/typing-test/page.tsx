'use client';

import React, { useState, useEffect } from 'react';
import { Keyboard, Timer, Target, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SAMPLE_TEXT = "Virtual Staffing Solutions requires exceptional accuracy and speed for data processing roles. This test will evaluate your baseline typing capabilities under a standard five-minute constraint. Maintain your focus, prioritize accuracy over raw speed, and ensure proper capitalization and punctuation.";

export default function TypingTestPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 Minutes
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsFinished(true);
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isActive && !isFinished) setIsActive(true);
    if (!isFinished) setUserInput(e.target.value);
  };

  // Metrics Calculation
  const wordsTyped = userInput.trim().split(/\s+/).filter(w => w.length > 0).length;
  const timeElapsedMin = (300 - timeLeft) / 60;
  const wpm = timeElapsedMin > 0 ? Math.round(wordsTyped / timeElapsedMin) : 0;
  
  let errors = 0;
  const targetChars = SAMPLE_TEXT.slice(0, userInput.length).split('');
  userInput.split('').forEach((char, i) => { if (char !== targetChars[i]) errors++; });
  const accuracy = userInput.length > 0 ? Math.max(0, Math.round(((userInput.length - errors) / userInput.length) * 100)) : 100;

  const theme = {
    glassCard: isDarkMode ? 'bg-zinc-950/60 backdrop-blur-3xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]' : 'bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_16px_40px_rgba(31,38,135,0.07)]',
    glassItem: isDarkMode ? 'bg-white/5 backdrop-blur-2xl border border-white/10' : 'bg-white/50 backdrop-blur-2xl border border-white/80',
    inputBg: isDarkMode ? 'bg-black/50 border border-white/20 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  return (
    <div className="min-h-screen p-6 sm:p-10 relative z-10 flex flex-col items-center justify-center">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className={`w-full max-w-4xl ${theme.glassCard} rounded-4xl p-8 relative overflow-hidden`}>
        {isFinished ? (
          <div className="text-center space-y-6 animate-in zoom-in-95">
            <CheckCircle2 size={64} className="text-emerald-500 mx-auto" />
            <h2 className={`text-3xl font-black ${theme.textMain}`}>Test Completed</h2>
            
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div className={`p-4 rounded-3xl ${theme.glassItem}`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Speed</p><p className="text-2xl font-black text-blue-500">{wpm} <span className="text-sm">WPM</span></p></div>
              <div className={`p-4 rounded-3xl ${theme.glassItem}`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Accuracy</p><p className="text-2xl font-black text-emerald-500">{accuracy}%</p></div>
              <div className={`p-4 rounded-3xl ${theme.glassItem}`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Errors</p><p className="text-2xl font-black text-rose-500">{errors}</p></div>
            </div>

            <button onClick={() => router.push('/dashboard')} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all mx-auto block mt-8">
              Save & Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/20 pb-4">
              <h1 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}><Keyboard className="text-blue-500"/> Live Typing Assessment</h1>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono ${isActive ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : theme.glassItem} ${theme.textMain}`}>
                  <Timer size={16}/> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-3xl text-lg leading-relaxed font-medium select-none ${theme.glassItem} ${theme.textSub}`}>
              {SAMPLE_TEXT}
            </div>

            <textarea 
              value={userInput}
              onChange={handleChange}
              placeholder="Start typing here to begin the timer..."
              className={`w-full h-40 p-6 rounded-3xl text-lg font-medium outline-none resize-none ${theme.inputBg}`}
              spellCheck="false"
              autoComplete="off"
            />
          </div>
        )}
      </div>
    </div>
  );
}