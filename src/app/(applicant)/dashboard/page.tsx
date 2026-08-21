'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  User, Keyboard, FileText, ArrowRight, Lock, 
  CheckCircle2, Clock, Loader2
} from 'lucide-react';

export default function ApplicantDashboard() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Get active session phone number
  const activePhone = typeof window !== 'undefined' ? localStorage.getItem('vsit_applicant_token') : null;

  // 🌟 THEME SYNC
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
  }, []);

  // 🌟 REAL-TIME DATABASE SYNC
  useEffect(() => {
    if (!activePhone) {
      router.push('/apply');
      return;
    }

    fetchProfile();

    // Listen for HR Admin approving the profile in real-time!
    const channel = supabase.channel(`applicant_${activePhone}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: `whatsapp_number=eq.${activePhone}`
      }, (payload) => {
        setProfile(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePhone, router]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('whatsapp_number', activePhone)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.log("No profile found yet, user is new.");
    } finally {
      setIsLoading(false);
    }
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFF9F2]',
    glassCard: isDarkMode 
      ? 'bg-zinc-950/60 backdrop-blur-3xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.6)]' 
      : 'bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_8px_30px_rgba(31,38,135,0.07)]',
    glassItem: isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white/50 border border-white/80',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  if (isLoading) {
    return <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;
  }

  // 🌟 WORKFLOW LOGIC (Matches HR Dashboard)
  const isProfileComplete = profile?.status && profile.status !== 'Profile Incomplete';
  const isApproved = profile?.status === 'Approved' || profile?.status === 'Demo Assigned' || profile?.status === 'Selected';
  const isDemoAssigned = profile?.status === 'Demo Assigned' || profile?.status === 'Selected';

  return (
    <div className={`min-h-screen relative w-full flex flex-col p-4 md:p-8 overflow-hidden transition-colors duration-1000 ${theme.bg}`}>
      
      {/* Ambient Background */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-orange-500/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none z-0" />

      <div className="w-full max-w-6xl mx-auto relative z-10 space-y-6">
        
        {/* 🌟 TOP WELCOME BANNER */}
        <div className={`w-full ${theme.glassCard} rounded-4xl p-6 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-4`}>
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme.textMain}`}>
              Welcome to VSIT
            </h1>
            <p className={`text-sm font-semibold mt-1 ${theme.textSub}`}>
              Applicant ID: <span className="font-mono text-orange-500">{activePhone}</span>
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Application Status</p>
            <p className={`text-lg font-black mt-1 ${
              profile?.status === 'Selected' ? 'text-emerald-500' :
              profile?.status === 'Rejected' ? 'text-rose-500' :
              'text-orange-500'
            }`}>
              {profile?.status || 'In Progress'}
            </p>
          </div>
        </div>

        {/* 🌟 MODULE CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* MODULE 1: PROFILE SETUP */}
          <div className={`p-6 rounded-4xl ${theme.glassCard} flex flex-col justify-between min-h-70 relative overflow-hidden group`}>
            <div>
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20 mb-6">
                <User size={28} />
              </div>
              <h2 className={`text-xl font-bold ${theme.textMain}`}>Profile Setup</h2>
              
              <div className="flex justify-between items-end mt-6 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Progress</span>
                <span className="text-xs font-black text-orange-500">{isProfileComplete ? '100%' : '0%'}</span>
              </div>
              <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full bg-orange-500 rounded-full transition-all duration-1000 ${isProfileComplete ? 'w-full' : 'w-0'}`} />
              </div>
            </div>

            {isProfileComplete ? (
              <div className={`w-full py-3.5 mt-6 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center border border-orange-500/20 bg-orange-500/5 text-orange-500 flex items-center justify-center gap-2`}>
                {profile?.status === 'Pending Review' ? <><Clock size={14}/> Under Review</> : <><CheckCircle2 size={14}/> Completed</>}
              </div>
            ) : (
              <button onClick={() => router.push('/profile-setup')} className={`w-full py-3.5 mt-6 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center border border-orange-500/20 bg-transparent hover:bg-orange-500 hover:text-white transition-all text-orange-500 flex items-center justify-center gap-2 cursor-pointer`}>
                Start Module <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* MODULE 2: TYPING TEST */}
          <div className={`p-6 rounded-4xl ${theme.glassCard} flex flex-col justify-between min-h-70 relative overflow-hidden group ${!isApproved ? 'opacity-70' : ''}`}>
            {!isApproved && <Lock size={16} className={`absolute top-8 right-8 ${theme.textSub}`} />}
            
            <div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border mb-6 ${isApproved ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : `bg-black/5 dark:bg-white/5 border-transparent ${theme.textSub}`}`}>
                <Keyboard size={28} />
              </div>
              <h2 className={`text-xl font-bold ${theme.textMain}`}>Typing Test</h2>
              
              <div className="flex justify-between items-end mt-6 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Progress</span>
                <span className={`text-xs font-black ${isApproved ? 'text-blue-500' : theme.textSub}`}>{profile?.status === 'Test Completed' || profile?.wpm > 0 ? '100%' : '0%'}</span>
              </div>
              <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full bg-blue-500 rounded-full transition-all duration-1000 ${profile?.status === 'Test Completed' || profile?.wpm > 0 ? 'w-full' : 'w-0'}`} />
              </div>
            </div>

            {!isApproved ? (
              <div className={`w-full py-3.5 mt-6 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center border bg-black/5 dark:bg-white/5 ${theme.textSub} border-transparent`}>
                Locked by HR
              </div>
            ) : profile?.status === 'Test Completed' || profile?.wpm > 0 ? (
              <div className={`w-full py-3.5 mt-6 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center border border-blue-500/20 bg-blue-500/5 text-blue-500 flex items-center justify-center gap-2`}>
                <CheckCircle2 size={14}/> Completed
              </div>
            ) : (
              <button onClick={() => router.push('/typing-test')} className={`w-full py-3.5 mt-6 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center border border-blue-500/20 bg-transparent hover:bg-blue-500 hover:text-white transition-all text-blue-500 flex items-center justify-center gap-2 cursor-pointer`}>
                Start Test <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* MODULE 3: DEMO TASK */}
          <div className={`p-6 rounded-4xl ${theme.glassCard} flex flex-col justify-between min-h-70 relative overflow-hidden group ${!isDemoAssigned ? 'opacity-70' : ''}`}>
            {!isDemoAssigned && <Lock size={16} className={`absolute top-8 right-8 ${theme.textSub}`} />}
            
            <div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border mb-6 ${isDemoAssigned ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : `bg-black/5 dark:bg-white/5 border-transparent ${theme.textSub}`}`}>
                <FileText size={28} />
              </div>
              <h2 className={`text-xl font-bold ${theme.textMain}`}>Demo Task</h2>
              
              <div className="flex justify-between items-end mt-6 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Progress</span>
                <span className={`text-xs font-black ${isDemoAssigned ? 'text-purple-500' : theme.textSub}`}>0%</span>
              </div>
              <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full bg-purple-500 rounded-full transition-all duration-1000 w-0`} />
              </div>
            </div>

            {!isDemoAssigned ? (
              <div className={`w-full py-3.5 mt-6 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center border bg-black/5 dark:bg-white/5 ${theme.textSub} border-transparent`}>
                Locked by HR
              </div>
            ) : (
              <button onClick={() => router.push('/demo-task')} className={`w-full py-3.5 mt-6 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center border border-purple-500/20 bg-transparent hover:bg-purple-500 hover:text-white transition-all text-purple-500 flex items-center justify-center gap-2 cursor-pointer`}>
                View Demo Task <ArrowRight size={14} />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}