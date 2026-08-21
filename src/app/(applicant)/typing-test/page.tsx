'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Keyboard, Timer, Loader2, Activity, Target, CheckCircle2 } from 'lucide-react';

const SAMPLE_TEXT = "Virtual Staffing Solutions provides top-tier talent for global enterprises. In today's fast-paced digital economy, the ability to adapt and communicate effectively is paramount. Our team ensures that every candidate undergoes rigorous testing to verify their technical proficiency, typing speed, and communication skills. Success requires dedication, precision, and continuous learning.";

export default function TypingTestPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Typing Test State
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Live Metrics
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activePhone = typeof window !== 'undefined' ? localStorage.getItem('vsit_applicant_token') : null;

  // 🌟 THEME & AUTH SYNC
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);

    if (!activePhone) {
      router.push('/apply');
      return;
    }

    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('id, status').eq('whatsapp_number', activePhone).single();
      if (data) setProfile(data);
      setIsLoading(false);
    };
    fetchProfile();
  }, [activePhone, router]);

  // 🌟 TIMER & LIVE METRICS LOGIC
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
        calculateLiveMetrics();
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleFinishTest();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, userInput]);

  const calculateLiveMetrics = () => {
    const timeElapsed = 60 - timeLeft;
    if (timeElapsed > 0) {
      const wordsTyped = userInput.length / 5;
      setLiveWpm(Math.round((wordsTyped / timeElapsed) * 60));
    }

    let correctChars = 0;
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === SAMPLE_TEXT[i]) correctChars++;
    }
    setLiveAcc(userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100);
  };

  const handleStartTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isActive && !isFinished && e.target.value.length > 0) {
      setIsActive(true);
    }
    setUserInput(e.target.value);
  };

  // 🌟 CALCULATE & SUBMIT RESULTS
  const handleFinishTest = async () => {
    setIsFinished(true);
    setIsSubmitting(true);

    const finalWpm = liveWpm;
    const finalAcc = liveAcc;

    try {
      // 1. Save to typing_tests table
      await supabase.from('typing_tests').insert({
        profile_id: profile.id,
        wpm: finalWpm,
        accuracy: finalAcc
      });

      // 2. Update Profile Status
      await supabase.from('profiles').update({ status: 'Test Completed' }).eq('id', profile.id);

      // 3. Return to Dashboard
      setTimeout(() => router.push('/dashboard'), 2500);

    } catch (error) {
      alert("Error saving test. Please contact support.");
      setIsSubmitting(false);
    }
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#050505]' : 'bg-[#F8FAFC]', // Softer backgrounds for eye comfort
    glassPanel: isDarkMode 
      ? 'bg-white/5 backdrop-blur-[80px] border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.8)]' 
      : 'bg-white/60 backdrop-blur-[80px] border border-white/50 shadow-[0_32px_80px_rgba(31,38,135,0.05)]',
    glassPill: isDarkMode ? 'bg-black/40 border border-white/10' : 'bg-white/80 border border-slate-200',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-500' : 'text-slate-400',
  };

  if (isLoading) return <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>;

  return (
    <div className={`min-h-screen flex items-center justify-center relative p-4 md:p-8 overflow-hidden transition-colors duration-1000 ${theme.bg}`}>
      
      {/* 🌟 SOFT AMBIENT ORBS FOR LIQUID GLASS EFFECT */}
      <div className="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      <div className="w-full max-w-5xl h-full max-h-[90vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-700">
        
        {/* 🌟 TOP TELEMETRY BAR */}
        <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-4 mb-6 px-2">
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shadow-inner">
              <Keyboard size={24} />
            </div>
            <div>
              <h1 className={`text-xl md:text-2xl font-black tracking-tight ${theme.textMain}`}>Official Typing Test</h1>
              <p className={`text-xs md:text-sm font-semibold mt-0.5 ${theme.textSub}`}>Focus on accuracy. The timer starts when you type.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            {/* Live WPM */}
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl ${theme.glassPill}`}>
              <Activity size={18} className="text-blue-500" />
              <div className="flex flex-col">
                <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Live Speed</span>
                <span className={`text-lg font-black leading-none ${theme.textMain}`}>{liveWpm} <span className="text-xs font-semibold opacity-50">WPM</span></span>
              </div>
            </div>
            
            {/* Live Accuracy */}
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl ${theme.glassPill}`}>
              <Target size={18} className="text-emerald-500" />
              <div className="flex flex-col">
                <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Accuracy</span>
                <span className={`text-lg font-black leading-none ${theme.textMain}`}>{liveAcc}%</span>
              </div>
            </div>

            {/* Timer */}
            <div className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl border transition-colors duration-500 ${
              timeLeft <= 10 && isActive 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]' 
                : `${theme.glassPill} ${theme.textMain}`
            }`}>
              <Timer size={20} className={timeLeft <= 10 && isActive ? 'animate-pulse' : ''} />
              <span className="font-mono text-2xl font-black tracking-wider">0:{timeLeft.toString().padStart(2, '0')}</span>
            </div>
          </div>

        </div>

        {/* 🌟 MAIN LIQUID GLASS TYPING ARENA */}
        <div className={`flex-1 w-full rounded-[2.5rem] flex flex-col overflow-hidden relative ${theme.glassPanel}`}>
          
          {/* Reference Text Display (EYE COMFORT MODE) */}
          <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar select-none relative z-10">
            <p className={`font-mono text-xl md:text-2xl leading-[2.2] tracking-wide break-words`}>
              {SAMPLE_TEXT.split('').map((char, index) => {
                let colorClass = theme.textSub; // Untyped (Soft Gray)
                let bgClass = '';
                
                if (index < userInput.length) {
                  if (userInput[index] === char) {
                    colorClass = isDarkMode ? 'text-emerald-400' : 'text-emerald-600'; // Correct
                  } else {
                    colorClass = 'text-rose-500';
                    bgClass = 'bg-rose-500/20 rounded-[4px] border-b-2 border-rose-500'; // Incorrect
                  }
                } else if (index === userInput.length && isActive) {
                  // Active Cursor position
                  bgClass = isDarkMode ? 'bg-blue-500/30 rounded-[4px] border-b-2 border-blue-500 animate-pulse' : 'bg-blue-500/20 rounded-[4px] border-b-2 border-blue-500 animate-pulse';
                  colorClass = theme.textMain;
                }

                return (
                  <span key={index} className={`transition-colors duration-75 ${colorClass} ${bgClass}`}>
                    {char}
                  </span>
                );
              })}
            </p>
          </div>

          {/* Hidden but focusable overlay input for mobile & physical keyboards */}
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={handleStartTyping}
            disabled={isFinished || isSubmitting}
            autoFocus
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text resize-none"
          />

          {/* 🌟 BOTTOM INSTRUCTION / SUBMISSION BAR */}
          <div className={`shrink-0 p-6 md:p-8 flex items-center justify-between border-t ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-white/30 bg-white/40'}`}>
            {!isFinished ? (
              <p className={`text-sm font-semibold flex items-center gap-2 ${theme.textSub}`}>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> 
                Start typing anywhere on the screen to begin.
              </p>
            ) : (
              <div className="w-full flex items-center justify-between">
                <p className="text-sm font-bold text-emerald-500 flex items-center gap-2">
                  <CheckCircle2 size={18} /> Test Complete!
                </p>
                {isSubmitting && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Saving to HR...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}