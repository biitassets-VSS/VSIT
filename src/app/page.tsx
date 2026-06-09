'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  // State to manage the toggle switch
  const [loginType, setLoginType] = useState<'staff' | 'admin'>('staff');
  const router = useRouter();

  // Handle the form submission to route to the correct dashboard
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginType === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/staff/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* LOGO AND SLOGAN AREA */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center mb-8"
        >
          {/* Your Logo Image */}
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solutions" 
            className="h-20 w-auto object-contain mb-4 drop-shadow-sm" 
          />
          {/* Slogan added here */}
          <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center uppercase">
            IT Assets Management
          </h1>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-3xl sm:px-10 border border-gray-100">
          
          {/* ADMIN / STAFF TOGGLE SWITCH */}
          <div className="flex bg-gray-100 p-1.5 rounded-xl mb-8">
            <button
              type="button"
              onClick={() => setLoginType('staff')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                loginType === 'staff' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Staff Login
            </button>
            <button
              type="button"
              onClick={() => setLoginType('admin')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                loginType === 'admin' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Admin Login
            </button>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">
              {loginType === 'admin' ? 'Admin Access' : 'Staff Access'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Please sign in to your account
            </p>
          </div>

          {/* LOGIN FORM */}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email address</label>
              <input 
                required 
                type="email" 
                placeholder="lakhwinder@vss.com" 
                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900 bg-white" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input 
                required 
                type="password" 
                placeholder="••••••••" 
                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900 bg-white" 
              />
            </div>

            <button 
              type="submit" 
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Sign In as {loginType === 'admin' ? 'Admin' : 'Staff'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
