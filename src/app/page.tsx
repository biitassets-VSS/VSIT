'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Lock, ShieldAlert, Users, User, ArrowLeft, Monitor, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Admin' | 'Staff' | 'Guest'>('Admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const themes = {
    Admin: { glow: 'bg-[#FF8A00]', button: 'bg-[#FF8A00] hover:bg-[#E67C00]', shadow: 'shadow-[0_8px_20px_-6px_rgba(255,138,0,0.5)]', badgeText: 'text-[#FF8A00]', badgeBg: 'bg-[#FFF4EA] border-[#FFE4C4]', focusRing: 'focus:border-[#FF8A00] focus:ring-[#FF8A00]/10', activeTab: 'text-[#FF8A00]' },
    Staff: { glow: 'bg-[#8B5CF6]', button: 'bg-[#8B5CF6] hover:bg-[#7C3AED]', shadow: 'shadow-[0_8px_20px_-6px_rgba(139,92,246,0.5)]', badgeText: 'text-[#8B5CF6]', badgeBg: 'bg-[#F5F3FF] border-[#EDE9FE]', focusRing: 'focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/10', activeTab: 'text-[#8B5CF6]' },
    Guest: { glow: 'bg-[#10B981]', button: 'bg-[#10B981] hover:bg-[#059669]', shadow: 'shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)]', badgeText: 'text-[#10B981]', badgeBg: 'bg-[#ECFDF5] border-[#D1FAE5]', focusRing: 'focus:border-[#10B981] focus:ring-[#10B981]/10', activeTab: 'text-[#10B981]' }
  };

  const currentTheme = themes[activeTab];

  useEffect(() => {
    supabase.auth.signOut();
    localStorage.clear();
  }, []);

  const handleTabChange = (tab: 'Admin' | 'Staff' | 'Guest') => {
    setActiveTab(tab);
    setError('');
    if (tab === 'Guest') { setEmail('guest@vss.com'); setPassword('vss@123'); } 
    else { setEmail(''); setPassword(''); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 🌟 CRITICAL FIX: Clean the inputs to prevent mobile keyboard auto-capitalization bugs
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    try {
      // 1. Guest Fast-Track
      if (activeTab === 'Guest' && cleanEmail === 'guest@vss.com' && cleanPassword === 'vss@123') {
        localStorage.setItem('isGuestSession', 'true');
        localStorage.setItem('vsit_staff_session', 'guest@vss.com');
        router.push('/staff');
        return;
      }

      // 2. Official Supabase Auth (Using polished, clean credentials)
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password: cleanPassword 
      });

      if (authError) {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        const userEmail = data.user.email?.toLowerCase().trim();

        // 3. Strict Admin Gatekeeper
        if (activeTab === 'Admin') {
          if (userEmail === 'lakhwinder.bi@outlook.com') {
            router.push('/admin');
          } else {
            await supabase.auth.signOut();
            localStorage.clear();
            setError('Access Denied: Only designated Admins can access this portal.');
          }
        } else if (activeTab === 'Staff') {
          localStorage.setItem('vsit_staff_session', userEmail || '');
          router.push('/staff');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FB] font-sans relative overflow-hidden px-4 transition-colors duration-500">
      <div className="relative z-10 w-full max-w-[420px]">
        <div className={`absolute inset-0 ${currentTheme.glow} blur-[80px] opacity-20 rounded-[3rem] -z-10 transform scale-105 transition-all duration-700`} />
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
          
          <div className="text-center mb-8 relative z-10">
            <img src="/logo.png" alt="Virtual Staffing Solutions Logo" className="h-16 mx-auto mb-4 object-contain transition-transform hover:scale-105 duration-300" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <h1 className="text-2xl font-black text-[#0A192F] tracking-tight">Virtual Staffing Solutions</h1>
            <div className={`flex items-center justify-center gap-2 mt-4 px-4 py-2 rounded-full text-[11px] font-black tracking-widest uppercase border mx-auto w-fit transition-colors duration-500 ${currentTheme.badgeText} ${currentTheme.badgeBg}`}>
              <Monitor size={14} /> IT ASSETS AND STAFF MANAGEMENT
            </div>
          </div>

          <div className="flex bg-[#F4F7FB] rounded-2xl p-1.5 mb-6 border border-slate-100 relative z-10">
            {(['Admin', 'Staff', 'Guest'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const Icon = tab === 'Admin' ? ShieldAlert : tab === 'Staff' ? Users : User;
              return (
                <button key={tab} type="button" onClick={() => handleTabChange(tab)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${isActive ? `bg-white shadow-sm border border-slate-100 ${themes[tab].activeTab}` : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                  <Icon size={14} /> {tab}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-bold text-[#4A5568] mb-2 transition-colors">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={activeTab === 'Admin' ? 'admin@virtualstaffing.com' : 'employee@virtualstaffing.com'} className={`w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none transition-all focus:bg-[#F0F4FA] ${currentTheme.focusRing}`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A5568] mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" className={`w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none transition-all ${currentTheme.focusRing}`} />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className={`w-full mt-2 py-4 rounded-xl text-sm font-black text-white transition-all duration-500 flex items-center justify-center gap-2 ${currentTheme.button} ${currentTheme.shadow}`}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : `Sign in as ${activeTab}`}
            </button>
          </form>

          <div className="mt-8 text-center relative z-10">
            <button className="flex items-center justify-center gap-2 mx-auto text-xs font-bold text-[#A0AEC0] hover:text-slate-700 transition-colors"><ArrowLeft size={14} /> Back to Home</button>
          </div>
        </div>
      </div>
      <div className="mt-8 text-xs font-medium text-slate-500 z-10 relative">Design by <span className={`font-bold transition-colors duration-500 ${currentTheme.activeTab}`}>Ainodeat</span></div>
    </div>
  );
}