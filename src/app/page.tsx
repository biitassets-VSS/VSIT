'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, Mail, Lock, MonitorSmartphone, ArrowLeft, UserCircle } from 'lucide-react';

export default function LoginPage() {
  // 1. Added 'guest' to the type definition
  const [loginType, setLoginType] = useState<'admin' | 'staff' | 'guest'>('admin');
  
  // 2. Added states for secure login handling
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  // 3. Updated to an async function to handle secure login practices
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // ⚠️ Replace this timeout with your actual API authentication call (e.g., fetch, axios, or NextAuth)
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      if (!email || !password) {
        throw new Error('Please enter both email and password.');
      }

      // Mock secure token storage (In production, use HTTP-only cookies if possible)
      localStorage.setItem('authToken', 'your_secure_jwt_token_here');
      localStorage.setItem('userRole', loginType);

      // Route based on the selected role
      if (loginType === 'admin') {
        router.push('/admin'); 
      } else if (loginType === 'staff') {
        router.push('/staff'); 
      } else {
        router.push('/guest'); // Routes to guest dashboard
      }

    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
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
        className="w-full max-w-[460px] relative" // Slightly widened to fit 3 buttons nicely
      >
        {/* ORANGE GLOWING BORDER EFFECT */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 rounded-[2.2rem] blur-md opacity-75 animate-pulse"></div>

        {/* MAIN LOGIN CARD */}
        <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 sm:p-10">
          
          {/* HEADER SECTION */}
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-8">
            <div className="w-full flex justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Virtual Staffing Solutions" 
                className="h-20 sm:h-24 w-auto object-contain drop-shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight text-center">
              Virtual Staffing Solutions
            </h1>
            
            <div className="flex items-center justify-center gap-2 mt-2 bg-orange-50 px-4 py-1.5 rounded-full border border-orange-100">
              <MonitorSmartphone size={16} className="text-orange-500" />
              <p className="text-orange-600 font-bold text-xs uppercase tracking-wider">
                IT Assets and Staff Management
              </p>
            </div>
          </motion.div>

          {/* 3-WAY TOGGLE SWITCH (Admin / Staff / Guest) */}
          <motion.div variants={itemVariants} className="flex bg-[#F4F5F7] p-1.5 rounded-xl mb-6 relative">
            <button
              type="button"
              onClick={() => { setLoginType('admin'); setError(''); }}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${
                loginType === 'admin' 
                  ? 'bg-white text-orange-600 shadow-md transform scale-100' 
                  : 'text-gray-500 hover:text-gray-700 transform scale-95 hover:bg-gray-200/50'
              }`}
            >
              <ShieldAlert size={16} className={loginType === 'admin' ? 'text-orange-600' : 'text-gray-400'} />
              Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginType('staff'); setError(''); }}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${
                loginType === 'staff' 
                  ? 'bg-white text-blue-600 shadow-md transform scale-100' 
                  : 'text-gray-500 hover:text-gray-700 transform scale-95 hover:bg-gray-200/50'
              }`}
            >
              <Users size={16} className={loginType === 'staff' ? 'text-blue-600' : 'text-gray-400'} />
              Staff
            </button>
            <button
              type="button"
              onClick={() => { setLoginType('guest'); setError(''); }}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${
                loginType === 'guest' 
                  ? 'bg-white text-emerald-600 shadow-md transform scale-100' 
                  : 'text-gray-500 hover:text-gray-700 transform scale-95 hover:bg-gray-200/50'
              }`}
            >
              <UserCircle size={16} className={loginType === 'guest' ? 'text-emerald-600' : 'text-gray-400'} />
              Guest
            </button>
          </motion.div>

          {/* ERROR MESSAGE DISPLAY */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center font-medium">
              {error}
            </motion.div>
          )}

          {/* LOGIN FORM */}
          <form className="space-y-5" onSubmit={handleLogin}>
            
            {/* EMAIL INPUT */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                <input 
                  required 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder={
                    loginType === 'admin' ? "admin@virtualstaffing.com" : 
                    loginType === 'staff' ? "staff@virtualstaffing.com" : 
                    "guest@virtualstaffing.com"
                  }
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 transition-all text-gray-900 text-sm font-medium disabled:opacity-50" 
                />
              </div>
            </motion.div>

            {/* PASSWORD INPUT */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                <input 
                  required 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="••••••••" 
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 transition-all text-gray-900 text-sm font-medium disabled:opacity-50" 
                />
              </div>
            </motion.div>

            {/* SUBMIT BUTTON */}
            <motion.div variants={itemVariants} whileHover={!isLoading ? { scale: 1.02 } : {}} whileTap={!isLoading ? { scale: 0.98 } : {}}>
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed ${
                  loginType === 'admin' 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/30 hover:from-orange-600 hover:to-amber-600' 
                    : loginType === 'staff'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/30 hover:from-blue-700 hover:to-indigo-700'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-600'
                }`}
              >
                {isLoading 
                  ? 'Authenticating...' 
                  : `Sign in as ${loginType.charAt(0).toUpperCase() + loginType.slice(1)}`
                }
              </button>
            </motion.div>
          </form>

          {/* BACK TO HOME LINK */}
          <motion.div variants={itemVariants} className="mt-8 text-center">
            <button 
              onClick={() => router.push('/')}
              className="text-sm text-gray-400 hover:text-gray-700 font-semibold flex items-center justify-center gap-2 mx-auto transition-colors"
            >
              <ArrowLeft size={16} /> Back to Home
            </button>
          </motion.div>

        </div>
      </motion.div>

      {/* FOOTER CREDIT */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.8 }}
        className="text-center mt-8 relative z-10"
      >
        <p className="text-sm font-medium text-gray-500">
          Design by <span className="text-orange-500 font-bold tracking-wide">Ainodeat</span>
        </p>
      </motion.div>

    </div>
  );
}