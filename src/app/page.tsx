'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Lock, Shield, Users, User as UserIcon, Monitor, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'admin' | 'staff' | 'guest'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanPass = password.trim();

      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .eq('password', cleanPass)
        .maybeSingle();

      if (error) throw error;

      if (!user) {
        throw new Error("User profile not found. Please contact Administrator.");
      }

      if (user.status === 'Disabled') {
        throw new Error("This account has been locked. Please contact Administrator.");
      }

      // ==========================================
      // 🚀 THE PHANTOM SESSION GENERATOR
      // ==========================================
      
      // 1. Safely extract your live Supabase Project Reference ID
      let projectRef = 'supabase';
      try {
        const liveUrl = (supabase as any)?.supabaseUrl;
        if (liveUrl) projectRef = new URL(liveUrl).hostname.split('.')[0];
      } catch (e) {}

      const nativeAuthKey = `sb-${projectRef}-auth-token`;

      // 2. Craft a mathematically perfect Supabase Auth payload
      const phantomSession = {
        access_token: "vss-auth-token-" + user.id,
        token_type: "bearer",
        expires_in: 86400,
        refresh_token: "vss-refresh-token-" + user.id,
        user: {
          id: user.id,
          aud: "authenticated",
          role: "authenticated",
          email: user.email,
          phone: user.phone || "",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {
            full_name: user.full_name || user.name,
            department: user.department,
            emp_code: user.emp_code,
            role: user.role
          },
          identities: [],
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        expires_at: Math.floor(Date.now() / 1000) + 86400
      };

      // 3. Inject it into the native Supabase storage vault
      localStorage.setItem(nativeAuthKey, JSON.stringify(phantomSession));
      localStorage.setItem('supabase.auth.token', JSON.stringify(phantomSession));

      // 4. Inject standard Web Dossiers
      const webDossier = {
        id: user.id,
        name: user.full_name || user.name || 'Staff Member',
        email: user.email,
        emp_code: user.emp_code,
        department: user.department,
        role: user.role
      };

      localStorage.setItem('vsit_staff_session', JSON.stringify(webDossier));
      localStorage.setItem('staff_session', JSON.stringify(webDossier));
      localStorage.setItem('user', JSON.stringify(webDossier));

      // 5. Force-feed the Next.js Server Cookies
      const encodedSession = encodeURIComponent(JSON.stringify(phantomSession));
      document.cookie = `${nativeAuthKey}=${encodedSession}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `sb-access-token=${user.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `vsit_auth=true; path=/; max-age=86400; SameSite=Lax`;

      // ==========================================
      // ROUTING EXECUTION
      // ==========================================

      if (activeTab === 'admin') {
        const isUpperManagement = user.role?.toLowerCase().includes('admin') || 
                                  user.department?.toLowerCase().includes('admin') || 
                                  user.role?.toLowerCase().includes('developer');
        if (!isUpperManagement) throw new Error("This profile does not hold Administrator clearance.");

        localStorage.setItem('vsit_admin_session', JSON.stringify(user));
        router.push('/admin');
      } else if (activeTab === 'staff') {
        router.push('/staff/dashboard');
      } else {
        router.push('/guest');
      }

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F1F5F9] p-4 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-[440px] bg-white rounded-[36px] p-8 sm:p-10 shadow-[0_0_60px_-15px_rgba(79,70,229,0.25)] border border-indigo-50/50 flex flex-col items-center">
        
        <div className="mb-2">
          <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; document.getElementById('logo-text-fallback')!.style.display = 'block'; }} />
          <div id="logo-text-fallback" className="hidden text-2xl font-black tracking-tighter text-[#EA580C]">VIRTUAL <span className="text-gray-800">STAFFING</span></div>
        </div>

        <h1 className="text-[22px] font-black text-gray-900 tracking-tight mt-1">Virtual Staffing Solutions</h1>

        <div className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50/80 border border-blue-100 text-blue-600 text-[11px] font-black tracking-wider uppercase">
          <Monitor size={13} className="text-blue-500" />
          <span>IT Assets Management System</span>
        </div>

        <div className="w-full mt-7 p-1.5 bg-[#F4F4F5] rounded-2xl flex items-center justify-between gap-1">
          {[
            { id: 'admin', label: 'Admin', icon: <Shield size={14}/> },
            { id: 'staff', label: 'Staff', icon: <Users size={14}/> },
            { id: 'guest', label: 'Guest', icon: <UserIcon size={14}/> },
          ].map((tab) => (
            <button
              key={tab.id} type="button" onClick={() => { setActiveTab(tab.id as any); setErrorMsg(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {tab.icon} <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="w-full mt-6 p-4 bg-rose-50/50 border border-rose-200 rounded-2xl text-center animate-in fade-in duration-200">
            <span className="bg-gray-200/80 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="w-full mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5 text-left pl-1">Email Address</label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-4 text-gray-400" />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Students_app05@outlook.com" className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"/>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5 text-left pl-1">Password</label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-4 text-gray-400" />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="•••••••••••" className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"/>
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.99] text-white rounded-2xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-indigo-500/25 cursor-pointer">
              {loading ? 'Authenticating...' : `Sign in as ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            </button>
          </div>
        </form>

        <button type="button" onClick={() => router.push('/')} className="mt-8 flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
          <ArrowLeft size={14} /> <span>Back to Home</span>
        </button>

      </div>
      <div className="mt-6 text-center text-xs font-bold text-gray-400">Design by <span className="text-orange-500">AinedeArt</span></div>
    </div>
  );
}