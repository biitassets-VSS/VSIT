'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Shield, Users, PlayCircle, Mail, Lock, 
  ArrowRight, Loader2, Sparkles, AlertCircle 
} from 'lucide-react';

export default function MultiRoleLoginPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeRole, setActiveRole] = useState<'admin' | 'staff' | 'demo'>('admin');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🌟 SYNC THEME
  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // 🎨 THEME DICTIONARY
  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-slate-50',
    card: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200/60',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    inputBg: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a] focus:border-blue-500 text-zinc-100' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900',
  };

  // 🚀 DYNAMIC ROLE CONFIGURATION
  const roleConfig = {
    admin: {
      title: 'Admin Portal',
      subtitle: 'System management and hardware registry access',
      icon: <Shield size={18} />,
      color: 'blue',
      btnColor: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
      tabActive: isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200',
      endpoint: '/admin',
    },
    staff: {
      title: 'Staff Portal',
      subtitle: 'View your assigned assets and sign agreements',
      icon: <Users size={18} />,
      color: 'emerald',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20',
      tabActive: isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      endpoint: '/staff',
    },
    demo: {
      title: 'Demo Access',
      subtitle: 'Explore the system with read-only permissions',
      icon: <PlayCircle size={18} />,
      color: 'purple',
      btnColor: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20',
      tabActive: isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200',
      endpoint: '/demo',
    }
  };

  const current = roleConfig[activeRole];

  // 🔐 AUTHENTICATION HANDLER
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. DEMO LOGIN LOGIC (No password required, instant access)
      if (activeRole === 'demo') {
        setTimeout(() => {
          router.push(current.endpoint);
        }, 800);
        return;
      }

      // 2. ADMIN & STAFF LOGIN LOGIC (Supabase Auth)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 3. OPTIONAL: Verify Role in Database
      // You can check the user's profile here to ensure a Staff member isn't logging into the Admin tab
      /*
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (activeRole === 'admin' && profile.role !== 'admin') {
        throw new Error("Unauthorized: You do not have administrator privileges.");
      }
      */

      // 4. Route to the correct dashboard based on the tab selected
      router.push(current.endpoint);

    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
      setLoading(false);
    }
  };

  // Switch tabs safely
  const handleTabSwitch = (role: 'admin' | 'staff' | 'demo') => {
    setActiveRole(role);
    setError(null);
    if (role === 'demo') {
      setEmail('demo@virtualstaffing.com');
      setPassword('readonly');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-4 font-sans antialiased transition-colors duration-300`}>
      
      <div className={`w-full max-w-lg ${theme.card} rounded-[2rem] border shadow-2xl overflow-hidden flex flex-col`}>
        
        {/* HEADER & BRANDING */}
        <div className={`p-8 md:p-10 border-b flex flex-col items-center text-center ${isDarkMode ? 'border-[#27272a] bg-[#0a0a0a]/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20 text-white">
            <Sparkles size={28} />
          </div>
          <h1 className={`text-2xl font-bold tracking-tight mb-2 ${theme.textMain}`}>Virtual Staffing Solutions</h1>
          <p className={`text-sm font-semibold tracking-wide ${theme.textSub}`}>{current.subtitle}</p>
        </div>

        <div className="p-8 md:p-10 space-y-8">
          
          {/* ROLE SELECTOR TABS */}
          <div className={`flex p-1.5 rounded-2xl border ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-slate-100/50 border-slate-200'}`}>
            {(['admin', 'staff', 'demo'] as const).map((role) => (
              <button
                key={role}
                onClick={() => handleTabSwitch(role)}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all border ${
                  activeRole === role 
                    ? roleConfig[role].tabActive
                    : `border-transparent ${theme.textSub} hover:text-${roleConfig[role].color}-500 ${isDarkMode ? 'hover:bg-[#18181b]' : 'hover:bg-slate-200/50'}`
                }`}
              >
                {roleConfig[role].icon}
                <span className="hidden sm:inline">{role}</span>
              </button>
            ))}
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className={`p-4 rounded-xl flex items-start gap-3 border ${isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'} animate-in fade-in duration-200`}>
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleAuthSubmit} className="space-y-5 animate-in fade-in duration-300">
            
            <div className="space-y-1.5">
              <label className={`text-[10px] font-semibold uppercase tracking-widest ${theme.textSub}`}>Work Email Address</label>
              <div className="relative">
                <Mail size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={activeRole === 'demo' || loading}
                  placeholder={`Enter your ${activeRole} email...`}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg} ${activeRole === 'demo' ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-semibold uppercase tracking-widest ${theme.textSub}`}>Secure Password</label>
              <div className="relative">
                <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={activeRole === 'demo' || loading}
                  placeholder="••••••••••••"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg} ${activeRole === 'demo' ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-lg transition-all ${current.btnColor} ${loading ? 'opacity-80 cursor-wait' : ''}`}
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Authenticating...</>
                ) : (
                  <>Access {current.title} <ArrowRight size={16} /></>
                )}
              </button>
            </div>

          </form>
          
        </div>

        {/* FOOTER */}
        <div className={`py-6 text-center border-t ${isDarkMode ? 'border-[#27272a] bg-[#0a0a0a]' : 'border-slate-100 bg-slate-50'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${theme.textSub}`}>
            Secure Internal Access • Virtual Staffing Solutions
          </p>
        </div>

      </div>
    </div>
  );
}