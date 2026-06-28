'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Shield, 
  Users, 
  User, 
  Mail, 
  Lock, 
  MonitorSmartphone, 
  ArrowLeft, 
  Loader2,
  Sparkles
} from 'lucide-react';

// 🌟 NEON THEME ENGINE
const themes = {
  Admin: {
    glow: 'bg-orange-500/40',
    button: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/40',
    text: 'text-orange-600',
    icon: 'text-orange-500',
    ring: 'focus:border-orange-500 focus:ring-orange-500/20',
    badge: 'bg-orange-50 text-orange-600 border-orange-100',
  },
  Staff: {
    glow: 'bg-purple-500/40',
    button: 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/40',
    text: 'text-purple-600',
    icon: 'text-purple-500',
    ring: 'focus:border-purple-500 focus:ring-purple-500/20',
    badge: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  Guest: {
    glow: 'bg-emerald-500/40',
    button: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/40',
    text: 'text-emerald-600',
    icon: 'text-emerald-500',
    ring: 'focus:border-emerald-500 focus:ring-emerald-500/20',
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  }
};

export default function RootLoginPage() {
  const router = useRouter();
  
  // UI State
  const [activeRole, setActiveRole] = useState<'Admin' | 'Staff' | 'Guest'>('Admin');
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const activeTheme = themes[activeRole];

  // 1. Check for existing sessions securely (No looping)
  useEffect(() => {
    const checkSession = async () => {
      const staffSession = localStorage.getItem('vsit_staff_session');
      const adminSession = localStorage.getItem('vsit_admin_session');
      const guestSession = localStorage.getItem('isGuestSession');

      if (adminSession) {
        router.replace('/admin');
      } else if (staffSession || guestSession === 'true') {
        router.replace('/staff');
      } else {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  // 2. Handle Login Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 🌟 GUEST MODE BYPASS (Zero Database Contact)
      if (activeRole === 'Guest') {
        // We create a fake session payload so the Staff Dashboard 
        // doesn't crash when it looks for user data.
        const mockGuestSession = {
          id: 'guest-mock-uuid',
          email: 'demo_user@virtualstaffing.com',
          name: 'Demo Guest User',
          emp_id: 'DEMO-001',
          role: 'guest'
        };
        
        localStorage.setItem('isGuestSession', 'true');
        localStorage.setItem('vsit_staff_session', JSON.stringify(mockGuestSession));
        
        // Simulate network delay for effect
        setTimeout(() => {
          router.push('/staff');
        }, 800);
        return;
      }

      // REAL DATABASE AUTHENTICATION (Admin & Staff)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;
      if (profile?.status === 'Disabled') throw new Error('Account disabled by administrator.');

      const isAdminEmail = email.trim().toLowerCase() === 'lakhwinder.bi@outlook.com';
      const isActuallyAdmin = profile?.role === 'admin' || isAdminEmail;

      if (activeRole === 'Admin' && !isActuallyAdmin) {
        throw new Error('Not authorized for Admin access.');
      }

      if (isActuallyAdmin && activeRole === 'Admin') {
        localStorage.setItem('vsit_admin_session', JSON.stringify(profile || authData.user));
        router.push('/admin');
      } else {
        localStorage.setItem('vsit_staff_session', JSON.stringify(profile || authData.user));
        router.push('/staff');
      }

    } catch (err: any) {
      setError(err.message || 'Invalid login credentials.');
      setLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* THE GLOWING NEON AURA */}
      <div className="relative w-full max-w-md">
        <div className={`absolute inset-0 blur-[60px] rounded-[40px] z-0 pointer-events-none scale-110 transition-colors duration-700 ${activeTheme.glow}`} />
        
        <div className="bg-white rounded-[32px] p-8 sm:p-10 shadow-xl border border-white/80 relative z-10 text-center">
          
          {/* Logo & Header */}
          <div className="mb-6">
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions Logo" 
              className="h-16 mx-auto mb-5 object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-tight transition-colors">
              Virtual Staffing Solutions
            </h1>
            
            <div className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full border transition-colors duration-500 ${activeTheme.badge}`}>
              <MonitorSmartphone size={14} className="stroke-[2.5]" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest">
                IT Assets and Staff Management
              </span>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 mb-8 border border-slate-100">
            {(['Admin', 'Staff', 'Guest'] as const).map((role) => {
              const isActive = activeRole === role;
              let Icon = User;
              if (role === 'Admin') Icon = Shield;
              if (role === 'Staff') Icon = Users;
              if (role === 'Guest') Icon = Sparkles;

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setActiveRole(role);
                    setError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    isActive 
                      ? `bg-white shadow-sm border border-slate-200/50 ${themes[role].text}` 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                  }`}
                >
                  <Icon size={14} className={isActive ? themes[role].icon : 'text-slate-400'} />
                  {role}
                </button>
              );
            })}
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5 text-left relative">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 text-center animate-in fade-in zoom-in-95">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${activeRole === 'Guest' ? activeTheme.icon : 'text-slate-400'}`} size={18} />
                <input 
                  type="email" 
                  required
                  disabled={activeRole === 'Guest'}
                  value={activeRole === 'Guest' ? 'demo_user@virtualstaffing.com' : email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none transition-all placeholder:text-slate-400 ${activeTheme.ring} ${activeRole === 'Guest' ? 'text-emerald-700 bg-emerald-50/50 cursor-not-allowed' : 'text-slate-900'}`}
                  placeholder={activeRole === 'Admin' ? 'admin@virtualstaffing.com' : 'staff@virtualstaffing.com'}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${activeRole === 'Guest' ? activeTheme.icon : 'text-slate-400'}`} size={18} />
                <input 
                  type="password" 
                  required
                  disabled={activeRole === 'Guest'}
                  value={activeRole === 'Guest' ? 'demopassword123' : password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none transition-all placeholder:text-slate-400 ${activeTheme.ring} ${activeRole === 'Guest' ? 'text-emerald-700 bg-emerald-50/50 cursor-not-allowed tracking-widest' : 'text-slate-900'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {activeRole === 'Guest' && (
              <p className="text-[11px] font-bold text-emerald-600 text-center bg-emerald-50 py-2 rounded-lg border border-emerald-100 animate-in slide-in-from-bottom-2">
                Simulated Sandbox Mode. Database is bypassed.
              </p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 text-white rounded-2xl text-sm font-bold shadow-lg transition-all duration-500 flex justify-center items-center gap-2 disabled:opacity-70 mt-2 ${activeTheme.button}`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : `Sign in as ${activeRole}`}
            </button>
          </form>

          {/* Back to Home Link */}
          <button className="mt-8 flex items-center justify-center gap-2 mx-auto text-slate-400 hover:text-slate-600 transition-colors text-sm font-semibold">
            <ArrowLeft size={16} /> Back to Home
          </button>

        </div>
      </div>

      {/* Credit Footer */}
      <div className="mt-8 text-sm font-semibold text-slate-500 relative z-10 transition-colors duration-500">
        Design by <span className={`font-bold transition-colors duration-500 ${activeTheme.text}`}>Ainodeat</span>
      </div>

    </div>
  );
}
