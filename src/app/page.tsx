'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, Mail, Lock, MonitorSmartphone, UserCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function RootPage() {
  const [loginType, setLoginType] = useState<'admin' | 'staff' | 'guest'>('staff');
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
      const cleanEmail = email.trim().toLowerCase();

      // ✨ GUEST ACCESSIBILITY INTERCEPTOR
      if (loginType === 'guest') {
        if (cleanEmail === 'guest@vsit.com' && password === 'guest123') {
          localStorage.setItem('isGuestSession', 'true');
          localStorage.setItem('userEmail', 'guest@vsit.com');
          localStorage.setItem('userName', 'Demo Guest User');
          router.push('/staff'); 
          return;
        } else {
          throw new Error('Invalid Guest credentials. Use guest@vsit.com / guest123');
        }
      }

      if (!email || !password) {
        throw new Error('Please enter both email and password.');
      }

      // STANDARD AUTHENTICATION FOR LIVE ADMIN/STAFF
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim(),
      });

      if (authError) throw new Error('Invalid email or password.');
      if (!authData?.user) throw new Error('Authentication returned an empty session.');

      localStorage.setItem('userEmail', cleanEmail);
      localStorage.setItem('userName', 'Staff Member');

      if (cleanEmail === 'lakhwinder.bi@outlook.com' || loginType === 'admin') {
        router.push('/admin'); 
      } else {
        router.push('/staff'); 
      }

    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
      
      <motion.div 
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.15 }}
        className="w-full max-w-[460px] relative"
      >
        <div className={`absolute -inset-0.5 rounded-[2.2rem] blur-md opacity-75 animate-pulse transition-colors duration-500 ${
          loginType === 'admin' ? 'bg-gradient-to-r from-orange-500 via-orange-300 to-amber-500' :
          loginType === 'staff' ? 'bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-500' :
          'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500'
        }`}></div>

        <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 sm:p-10">
          
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-8">
            <div className="w-full flex justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Virtual Staffing Solutions" 
                className="h-20 sm:h-24 w-auto object-contain drop-shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/Logo.png';
                }}
              />
            </div>
            
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight text-center">
              Virtual Staffing Solutions
            </h1>
            
            <div className={`flex items-center justify-center gap-2 mt-2 px-4 py-1.5 rounded-full border transition-colors duration-300 ${
              loginType === 'admin' ? 'bg-orange-50 border-orange-100' :
              loginType === 'staff' ? 'bg-blue-50 border-blue-100' :
              'bg-emerald-50 border-emerald-100'
            }`}>
              <MonitorSmartphone size={16} className={
                loginType === 'admin' ? 'text-orange-500' : loginType === 'staff' ? 'text-blue-500' : 'text-emerald-500'
              } />
              <p className={`font-bold text-xs uppercase tracking-wider ${
                loginType === 'admin' ? 'text-orange-600' : loginType === 'staff' ? 'text-blue-600' : 'text-emerald-600'
              }`}>
                IT Assets Management System
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="flex bg-[#F4F5F7] p-1.5 rounded-xl mb-6 relative">
            <button
              type="button"
              onClick={() => { setLoginType('admin'); setError(''); }}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${
                loginType === 'admin' ? 'bg-white text-orange-600 shadow-md font-extrabold' : 'text-gray-500 hover:text-gray-700 font-bold'
              }`}
            >
              <ShieldAlert size={16} className={loginType === 'admin' ? 'text-orange-600' : 'text-gray-400'} />
              Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginType('staff'); setError(''); }}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${
                loginType === 'staff' ? 'bg-white text-blue-600 shadow-md font-extrabold' : 'text-gray-500 hover:text-gray-700 font-bold'
              }`}
            >
              <Users size={16} className={loginType === 'staff' ? 'text-blue-600' : 'text-gray-400'} />
              Staff
            </button>
            <button
              type="button"
              onClick={() => { setLoginType('guest'); setError(''); }}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${
                loginType === 'guest' ? 'bg-white text-emerald-600 shadow-md font-extrabold' : 'text-gray-500 hover:text-gray-700 font-bold'
              }`}
            >
              <UserCircle size={16} className={loginType === 'guest' ? 'text-emerald-600' : 'text-gray-400'} />
              Guest
            </button>
          </motion.div>

          {/* PUBLIC DEMO DETAILS BANNER */}
          {loginType === 'guest' && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center animate-in fade-in zoom-in-95 duration-200">
              <p className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-1">💡 Public Demo Account Info</p>
              <p className="text-xs font-semibold text-gray-600">Email: <span className="font-bold text-gray-900 select-all">guest@vsit.com</span></p>
              <p className="text-xs font-semibold text-gray-600">Password: <span className="font-bold text-gray-900 select-all">guest123</span></p>
            </div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center font-medium">
              {error}
            </motion.div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  required 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={loginType === 'guest' ? "guest@vsit.com" : "name@virtualstaffing.com"}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white text-gray-900 text-sm font-medium focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  required 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={loginType === 'guest' ? "guest123" : "••••••••"} 
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white text-gray-900 text-sm font-medium focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
                />
              </div>
            </div>

            <motion.div variants={itemVariants} whileHover={!isLoading ? { scale: 1.02 } : {}} whileTap={!isLoading ? { scale: 0.98 } : {}}>
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white transition-all disabled:opacity-70 ${
                  loginType === 'admin' ? 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/20' : 
                  loginType === 'staff' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/20' : 
                  'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/20'
                }`}
              >
                {isLoading ? <><Loader2 className="animate-spin" size={18} /> Authenticating...</> : `Sign in as ${loginType.charAt(0).toUpperCase() + loginType.slice(1)}`}
              </button>
            </motion.div>
          </form>

        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center mt-8 relative z-10">
        <p className="text-sm font-medium text-gray-500">
          Design by <span className="text-orange-500 font-bold tracking-wide">AinodeArt</span>
        </p>
      </motion.div>
    </div>
  );
}