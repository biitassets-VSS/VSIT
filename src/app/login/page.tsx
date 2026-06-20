'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Lock, Mail, Loader2 } from 'lucide-react';

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
      const cleanEmail = email.trim().toLowerCase();

      // 1. Authenticate with Supabase Auth Core
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim(),
      });

      if (authError) throw new Error(authError.message);
      if (!authData?.user) throw new Error("Authentication failed.");

      // 2. Bypass the profile table query entirely to avoid the 406 database mismatch!
      localStorage.setItem('userEmail', cleanEmail);
      localStorage.setItem('userName', 'Staff Member');

      // 3. Simple routing based directly on the login email prefix
      if (cleanEmail === 'lakhwinder.bi@outlook.com') {
        router.push('/admin');
      } else {
        router.push('/staff');
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
        
        <h1 className="text-2xl font-black text-center text-[#002B49] mb-2">Virtual Staffing Solutions</h1>
        <p className="text-sm font-bold text-gray-500 text-center mb-8">IT Assets Management System</p>

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
                placeholder="Students_app05@outlook.com"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold transition-all"
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
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In as Staff'}
          </button>
        </form>
      </div>
    </div>
  );
}