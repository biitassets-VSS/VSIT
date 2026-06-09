'use client';

import React from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      {/* GLOBAL ADMIN TOP NAVBAR */}
      <nav className="bg-black border-b border-gray-800 px-6 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions" 
              className="h-10 sm:h-12 object-contain" 
            />
            <span className="hidden sm:block text-orange-500 font-bold tracking-widest text-xs border-l border-gray-700 pl-4">
              ADMIN PORTAL
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-sm font-semibold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ADMIN PAGE CONTENT GOES HERE */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
