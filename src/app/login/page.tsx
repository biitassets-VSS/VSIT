'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { ShieldAlert, Users, Mail, Lock, MonitorSmartphone, ArrowLeft, UserCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'admin' | 'staff' | 'guest'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error('Invalid email or password.');

      // 2. Fetch User Role from 'profiles' table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found. Please contact Admin.');
      }

      // 3. Secure Redirect based on verified database role
      if (profile.role === 'admin') {
        router.push('/admin');
      } else if (profile.role === 'staff') {
        router.push('/staff');
      } else {
        router.push('/guest');
      }

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
      <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: 0.15 }} className="w-full max-w-[460px] relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 rounded-[2.2rem] blur-md opacity-75 animate-pulse"></div>

        <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 sm:p-10">
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-8">
            <div className="w-full flex justify-center mb-4">
              <img src="/logo.png" alt="Virtual Staffing Solutions" className="h-20 sm:h-24 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight text-center">Virtual Staffing Solutions</h1>
            <div className="flex items-center justify-center gap-2 mt-2 bg-orange-50 px-4 py-1.5 rounded-full border border-orange-100">
              <MonitorSmartphone size={16} className="text-orange-500" />
              <p className="text-orange-600 font-bold text-xs uppercase tracking-wider">IT Assets Management</p>
            </div>
          </motion.div>

          {/* Toggle Switches (Logic only, UI retained) */}
          <motion.div variants={itemVariants} className="flex bg-[#F4F5F7] p-1.5 rounded-xl mb-6">
            <button type="button" onClick={() => setLoginType('admin')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${loginType === 'admin' ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500'}`}>
              <ShieldAlert size={16} /> Admin
            </button>
            <button type="button" onClick={() => setLoginType('staff')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${loginType === 'staff' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>
              <Users size={16} /> Staff
            </button>
            <button type="button" onClick={() => setLoginType('guest')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${loginType === 'guest' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500'}`}>
              <UserCircle size={16} /> Guest
            </button>
          </motion.div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center font-bold">
              {error}
            </motion.div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 transition-all text-sm font-medium" placeholder="admin@virtualstaffing.com" />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 transition-all text-sm font-medium" placeholder="••••••••" />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <button type="submit" disabled={isLoading} className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : `Sign in as ${loginType}`}
              </button>
            </motion.div>
          </form>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center mt-8">
        <p className="text-sm font-medium text-gray-500">Design by <span className="text-orange-500 font-bold">Ainodeart</span></p>
      </motion.div>
    </div>
  );
}