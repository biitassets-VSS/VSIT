'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, Mail, Lock, MonitorSmartphone, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'admin' | 'staff'>('admin');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 👇 CORRECTED ROUTING: Push directly to /admin or /staff
    if (loginType === 'admin') {
      router.push('/admin'); 
    } else {
      router.push('/staff'); 
    }
  };

  // Animation variants for smooth loading
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
        className="w-full max-w-[420px] relative"
      >
        {/* 🔥 ORANGE GLOWING BORDER EFFECT 🔥 */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 rounded-[2.2rem] blur-md opacity-75 animate-pulse"></div>

        {/* MAIN LOGIN CARD */}
        <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 sm:p-10">
          
          {/* HEADER SECTION */}
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-8">
            
            {/* ADJUSTED LOGO FOR PERFECT READABILITY */}
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
            
            {/* EXACT SLOGAN */}
            <div className="flex items-center justify-center gap-2 mt-2 bg-orange-50 px-4 py-1.5 rounded-full border border-orange-100">
              <MonitorSmartphone size={16} className="text-orange-500" />
              <p className="text-orange-600 font-bold text-xs uppercase tracking-wider">
                IT Assets and Staff Management
              </p>
            </div>
          </motion.div>

          {/* TOGGLE SWITCH WITH ICONS */}
          <motion.div variants={itemVariants} className="flex bg-[#F4F5F7] p-1.5 rounded-xl mb-8 relative">
            <button
              type="button"
              onClick={() => setLoginType('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all duration-300 ${
                loginType === 'admin' 
                  ? 'bg-white text-orange-600 shadow-md transform scale-100' 
                  : 'text-gray-500 hover:text-gray-700 transform scale-95 hover:bg-gray-200/50'
              }`}
            >
              <ShieldAlert size={18} className={loginType === 'admin' ? 'text-orange-600' : 'text-gray-400'} />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setLoginType('staff')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all duration-300 ${
                loginType === 'staff' 
                  ? 'bg-white text-blue-600 shadow-md transform scale-100' 
                  : 'text-gray-500 hover:text-gray-700 transform scale-95 hover:bg-gray-200/50'
              }`}
            >
              <Users size={18} className={loginType === 'staff' ? 'text-blue-600' : 'text-gray-400'} />
              Staff
            </button>
          </motion.div>

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
                  placeholder={loginType === 'admin' ? "admin@virtualstaffing.com" : "staff@virtualstaffing.com"}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 transition-all text-gray-900 text-sm font-medium" 
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
                  placeholder="••••••••" 
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 transition-all text-gray-900 text-sm font-medium" 
                />
              </div>
            </motion.div>

            {/* SUBMIT BUTTON */}
            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button 
                type="submit" 
                className={`w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white transition-all ${
                  loginType === 'admin' 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/30 hover:from-orange-600 hover:to-amber-600' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/30 hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                Sign in as {loginType === 'admin' ? 'Admin' : 'Staff'}
              </button>
            </motion.div>
          </form>

          {/* BACK TO HOME LINK */}
          <motion.div variants={itemVariants} className="mt-8 text-center">
            <button className="text-sm text-gray-400 hover:text-gray-700 font-semibold flex items-center justify-center gap-2 mx-auto transition-colors">
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
  