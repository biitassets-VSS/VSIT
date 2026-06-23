'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

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
      // 1. Clean the input to match the Admin Dashboard format perfectly
      const cleanEmail = email.toLowerCase().trim();
      const cleanPassword = password.trim();

      // 2. Query the profiles directory directly
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .eq('password', cleanPassword)
        .maybeSingle(); // Prevents crashes if no user is found

      if (error) throw error;

      // 3. Security Checks
      if (!userProfile) {
        throw new Error("Invalid email or password. Please try again.");
      }

      if (userProfile.status === 'Disabled') {
        throw new Error("Your network access has been disabled by an Administrator.");
      }

      // 4. Success! Save the user session locally so the dashboard knows who is logged in
      localStorage.setItem('vsit_staff_session', JSON.stringify({
        id: userProfile.id,
        name: userProfile.full_name,
        email: userProfile.email,
        emp_code: userProfile.emp_code,
        department: userProfile.department,
        role: userProfile.role
      }));

      // 5. Route them to their workspace
      router.push('/staff/dashboard');

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-[#002B49] uppercase tracking-wider">Staff Portal</h1>
          <p className="text-sm font-bold text-gray-400">Enter your credentials to access your workspace</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-rose-800">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleStaffLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5"><Mail size={12}/> Company Email</label>
            <input 
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="name@vsit.com" 
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all" 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5"><Lock size={12}/> Password</label>
            <input 
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all" 
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full py-4 mt-2 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <LogIn size={16} />
            <span>{loading ? 'Authenticating...' : 'Secure Login'}</span>
          </button>
        </form>

      </div>
    </div>
  );
}