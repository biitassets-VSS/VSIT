'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Mail, 
  Lock, 
  ShieldAlert, 
  Users, 
  User, 
  ArrowLeft, 
  Monitor, 
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Admin' | 'Staff' | 'Guest'>('Admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear any existing sessions when hitting the login page
  useEffect(() => {
    supabase.auth.signOut();
    localStorage.removeItem('vsit_staff_session');
    localStorage.removeItem('user');
    localStorage.removeItem('isGuestSession');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Guest Login Logic
      if (activeTab === 'Guest') {
        localStorage.setItem('isGuestSession', 'true');
        router.push('/staff');
        return;
      }

      // 2. Admin & Staff Supabase Authentication
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Route based on selected tab
        if (activeTab === 'Admin') {
          router.push('/admin');
        } else {
          localStorage.setItem('vsit_staff_session', data.user.email || '');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FB] font-sans relative overflow-hidden px-4">
      
      {/* Central Login Card with Orange Glow */}
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-[#FF8A00] blur-[80px] opacity-20 rounded-[3rem] -z-10 transform scale-105" />
        
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-orange-500/10">
          
          {/* Logo & Header Section */}
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions Logo" 
              className="h-16 mx-auto mb-4 object-contain"
              onError={(e) => {
                // Fallback if logo.png is missing
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Fallback text if image doesn't load */}
            <h1 className="text-2xl font-black text-[#0A192F] tracking-tight">
              Virtual Staffing Solutions
            </h1>
            
            <div className="flex items-center justify-center gap-2 mt-4 text-[#FF8A00] bg-[#FFF4EA] px-4 py-2 rounded-full text-[11px] font-black tracking-widest uppercase border border-[#FFE4C4] mx-auto w-fit">
              <Monitor size={14} />
              IT ASSETS AND STAFF MANAGEMENT
            </div>
          </div>

          {/* Role Selector Tabs */}
          <div className="flex bg-[#F4F7FB] rounded-2xl p-1.5 mb-6 border border-slate-100">
            {(['Admin', 'Staff', 'Guest'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const Icon = tab === 'Admin' ? ShieldAlert : tab === 'Staff' ? Users : User;
              
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-white text-[#FF8A00] shadow-sm border border-slate-100' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon size={14} /> {tab}
                </button>
              );
            })}
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="mb-6 flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {activeTab !== 'Guest' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#4A5568] mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@virtualstaffing.com"
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/10 focus:bg-[#F0F4FA]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A5568] mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/10"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-sm font-medium text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                You are logging in as a Guest.<br/>No password required.
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-[#FF8A00] hover:bg-[#E67C00] text-white py-4 rounded-xl text-sm font-black transition-all shadow-[0_8px_20px_-6px_rgba(255,138,0,0.5)] flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : `Sign in as ${activeTab}`}
            </button>
          </form>

          {/* Back to Home Link */}
          <div className="mt-8 text-center">
            <button className="flex items-center justify-center gap-2 mx-auto text-xs font-bold text-[#A0AEC0] hover:text-slate-700 transition-colors">
              <ArrowLeft size={14} /> Back to Home
            </button>
          </div>

        </div>
      </div>

      {/* Footer Text */}
      <div className="mt-8 text-xs font-medium text-slate-500 z-10 relative">
        Design by <span className="font-bold text-[#FF8A00]">Ainodeat</span>
      </div>
    </div>
  );
}