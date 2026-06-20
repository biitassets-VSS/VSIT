'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Lock, Mail, ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw new Error(authError.message);

      // 2. Fetch User Role from Profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('email', email.trim())
        .maybeSingle();

      if (profileError) console.warn("Profile fetch issue:", profileError);

      const userRole = profile?.role || 'staff'; // Default to staff if no role assigned

      // Save name for quick loading on dashboards
      if (profile?.name) localStorage.setItem('userName', profile.name);
      localStorage.setItem('userEmail', email.trim());

      // 3. Route to the correct dashboard!
      if (userRole === 'admin') {
        router.push('/admin'); // Admin goes to Admin Dashboard
      } else if (userRole === 'guest') {
        router.push('/staff?mode=demo'); // Guest goes to Staff Dashboard in Demo Mode
      } else {
        router.push('/staff'); // Normal Staff goes to normal Staff Dashboard
      }

    } catch (error: any) {
      setErrorMsg(error.message || "Invalid Email or Password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-[32px] shadow-xl border border-gray-100 p-8 sm:p-10">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#006456] rounded-2xl flex items-center justify-center shadow-md">
            <ShieldCheck size={32} className="text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-center text-[#002B49] mb-2">VSIT Assets Portal</h1>
        <p className="text-sm font-bold text-gray-500 text-center mb-8">Sign in to your workspace</p>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold mb-6 text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-wide">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="name@vsit.com"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#006456] outline-none text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#006456] outline-none text-sm font-bold transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-[#002B49] hover:bg-[#001d33] text-white font-black text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs font-bold text-gray-400">Restricted Access. Authorized personnel only.</p>
        </div>

      </div>
    </div>
  );
}