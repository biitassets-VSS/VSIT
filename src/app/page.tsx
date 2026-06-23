'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanPassword = password.trim();

      // Query the profiles directory directly
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .eq('password', cleanPassword)
        .maybeSingle();

      if (error) throw error;

      if (!userProfile) {
        throw new Error("Invalid email or password. Please try again.");
      }

      if (userProfile.status === 'Disabled') {
        throw new Error("Your network access has been disabled by an Administrator.");
      }

      // Success! Save the user session locally
      localStorage.setItem('vsit_staff_session', JSON.stringify({
        id: userProfile.id,
        name: userProfile.full_name,
        email: userProfile.email,
        emp_code: userProfile.emp_code,
        department: userProfile.department,
        role: userProfile.role
      }));

      // Route them to their workspace
      router.push('/staff/dashboard');

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10 space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-[#002B49] uppercase tracking-widest">Staff Portal</h1>
          <p className="text-sm font-bold text-gray-400">Enter your credentials to access your workspace</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-rose-800">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleStaffLogin} className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Mail size={13} className="text-gray-400"/> Company Email
            </label>
            <input 
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="name@vsit.com" 
              className="w-full p-4 bg-[#F0F4F8] rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#002B49]/20 transition-all placeholder:text-gray-400" 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Lock size={13} className="text-gray-400"/> Password
            </label>
            <input 
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••" 
              className="w-full p-4 bg-[#F0F4F8] rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#002B49]/20 transition-all placeholder:text-gray-400" 
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#002B49]/20 transition-all cursor-pointer active:scale-[0.98]"
            >
              <span>{loading ? 'Authenticating...' : 'Secure Login'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}