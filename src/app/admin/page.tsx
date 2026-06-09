'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* LOGO CONTAINER */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black p-6 rounded-2xl shadow-lg flex justify-center mb-8 border border-gray-800"
        >
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solutions" 
            className="h-16 object-contain"
          />
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-6">
            Sign in to your account
          </h2>
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email address</label>
              <input required type="email" placeholder="Enter your email" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input required type="password" placeholder="••••••••" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm" />
            </div>

            <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
              Sign In
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
