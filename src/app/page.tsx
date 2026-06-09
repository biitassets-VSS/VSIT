'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* CLEAN, WHITE LOGO CONTAINER */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          {/* Added rounded corners and subtle shadow so if your logo has a black background, it looks like a clean card */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200">
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions" 
              className="h-14 sm:h-16 w-auto object-contain rounded-lg"
              onError={(e) => {
                // Failsafe in case logo.png isn't found
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-3xl sm:px-10 border border-gray-100">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-6">
            Sign in to your account
          </h2>
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email address</label>
              <input required type="email" placeholder="lakhwinder@vss.com" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input required type="password" placeholder="••••••••" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900" />
            </div>

            <button type="submit" className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              Sign In
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
