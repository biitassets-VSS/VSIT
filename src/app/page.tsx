'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Lock, Shield, Users, User as UserIcon, Monitor, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  // 🧭 Re-wired UI State
  const [activeTab, setActiveTab] = useState<'admin' | 'staff' | 'guest'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Custom error state designed to trigger your exact screenshot's pink box
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanPass = password.trim();

      // 1. Query your visible profiles ledger directly
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .eq('password', cleanPass)
        .maybeSingle();

      if (error) throw error;

      // 2. Trigger your exact screenshot wording if typo'd!
      if (!user) {
        throw new Error("User profile not found. Please contact Administrator.");
      }

      if (user.status === 'Disabled') {
        throw new Error("This account has been locked. Please contact Administrator.");
      }

      // 3. Tab-based Routing & Session Stamping
      if (activeTab === 'admin') {
        // Verify this person actually holds an Admin or Officer rank
        const isUpperManagement = user.role?.toLowerCase().includes('admin') || 
                                  user.department?.toLowerCase().includes('admin') || 
                                  user.role?.toLowerCase().includes('developer');
        
        if (!isUpperManagement) {
          throw new Error("This profile does not hold Administrator clearance.");
        }

        localStorage.setItem('vsit_admin_session', JSON.stringify(user));
        router.push('/admin');

      } else if (activeTab === 'staff') {
        
        // Save Meenakshi's profile locally so the dashboard can look up her equipment!
        localStorage.setItem('vsit_staff_session', JSON.stringify({
          id: user.id,
          name: user.full_name || user.name,
          email: user.email,
          emp_code: user.emp_code,
          department: user.department,
          role: user.role
        }));

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
      
      {/* 🚀 THE RESTORED SOFT-GLOW HALO CARD */}
      <div className="w-full max-w-[440px] bg-white rounded-[36px] p-8 sm:p-10 shadow-[0_0_60px_-15px_rgba(79,70,229,0.25)] border border-indigo-50/50 flex flex-col items-center">
        
        {/* Logo Graphic Placement */}
        <div className="mb-2">
          {/* Note: Update "/logo.png" to your exact logo file path inside your /public folder */}
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solutions Logo" 
            className="h-16 w-auto object-contain"
            onError={(e) => {
              // Fallback text rendering just in case your logo image fails to load
              e.currentTarget.style.display = 'none';
              document.getElementById('logo-text-fallback')!.style.display = 'block';
            }} 
          />
          <div id="logo-text-fallback" className="hidden text-2xl font-black tracking-tighter text-[#EA580C]">
            VIRTUAL <span className="text-gray-800">STAFFING</span>
          </div>
        </div>

        {/* Main Header */}
        <h1 className="text-[22px] font-black text-gray-900 tracking-tight mt-1">
          Virtual Staffing Solutions
        </h1>

        {/* Subtitle Pill Badge */}
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50/80 border border-blue-100 text-blue-600 text-[11px] font-black tracking-wider uppercase">
          <Monitor size={13} className="text-blue-500" />
          <span>IT Assets Management System</span>
        </div>

        {/* 🚀 THE 3-WAY ROLE SWITCHER */}
        <div className="w-full mt-7 p-1.5 bg-[#F4F4F5] rounded-2xl flex items-center justify-between gap-1">
          {[
            { id: 'admin', label: 'Admin', icon: <Shield size={14}/> },
            { id: 'staff', label: 'Staff', icon: <Users size={14}/> },
            { id: 'guest', label: 'Guest', icon: <UserIcon size={14}/> },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id} type="button"
                onClick={() => { setActiveTab(tab.id as any); setErrorMsg(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-white text-blue-600 shadow-sm font-black' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 🚀 THE RESTORED PINK ERROR BOX */}
        {errorMsg && (
          <div className="w-full mt-6 p-4 bg-rose-50/50 border border-rose-200 rounded-2xl text-center animate-in fade-in duration-200">
            <span className="bg-gray-200/80 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded">
              {errorMsg}
            </span>
          </div>
        )}

        {/* INPUT FORM */}
        <form onSubmit={handleAuthSubmit} className="w-full mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5 text-left pl-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-4 text-gray-400" />
              <input 
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Students_app05@outlook.com" 
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5 text-left pl-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-4 text-gray-400" />
              <input 
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="•••••••••••" 
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.99] text-white rounded-2xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              {loading ? 'Authenticating...' : `Sign in as ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            </button>
          </div>
        </form>

        {/* Footer Link */}
        <button 
          type="button" 
          onClick={() => router.push('/')} 
          className="mt-8 flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> <span>Back to Home</span>
        </button>

      </div>

      <div className="mt-6 text-center text-xs font-bold text-gray-400">
        Design by <span className="text-orange-500">AinedeArt</span>
      </div>

    </div>
  );
}