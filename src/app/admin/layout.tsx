'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // This function closes the menu automatically when a link is tapped on a mobile phone
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* 📱 MOBILE HAMBURGER HEADER (Only visible on phones) */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white shadow-sm z-50 p-4 flex justify-between items-center h-[60px]">
        <h1 className="font-bold text-lg text-gray-900">Admin Panel</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-900 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? (
            /* Close "X" Icon */
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            /* Hamburger Icon */
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* 🖥️ SIDEBAR MENU (Hidden on phone unless hamburger is clicked, always visible on desktop) */}
      <aside className={`
        fixed md:sticky top-[60px] md:top-0 left-0 h-[calc(100vh-60px)] md:h-screen w-64 bg-white border-r border-gray-200 z-40 transition-transform duration-300 ease-in-out overflow-y-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:block border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
        </div>
        
        {/* ALL YOUR TABS RESTORED HERE */}
        <nav className="flex flex-col gap-2 p-4">
          <Link href="/admin/dashboard" onClick={closeMenu} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            <span>📊</span> Dashboard
          </Link>
          
          <Link href="/admin/assets" onClick={closeMenu} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            <span>📦</span> Assets
          </Link>

          <Link href="/admin/inspections" onClick={closeMenu} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            <span>🔍</span> Inspections
          </Link>
          
          <Link href="/admin/staff" onClick={closeMenu} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            <span>👥</span> Staff Members
          </Link>

          <Link href="/admin/reports" onClick={closeMenu} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            <span>📈</span> Reports
          </Link>
        </nav>
      </aside>

      {/* 🌑 DARK BACKGROUND OVERLAY (For mobile phones when menu is open) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={closeMenu}
        ></div>
      )}

      {/* 📄 MAIN PAGE CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 mt-[60px] md:mt-0 w-full overflow-x-hidden">
        {children}
      </main>
      
    </div>
  );
}
