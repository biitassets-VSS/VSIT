'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* MOBILE HAMBURGER BUTTON */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white shadow-sm z-50 p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg text-gray-900">Admin Panel</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-900 p-2 bg-gray-100 rounded-lg"
        >
          {/* Hamburger Icon */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* SIDEBAR (Hidden on mobile unless toggled) */}
      <aside className={`
        fixed md:static top-[60px] md:top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:block">
          <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
        </div>
        <nav className="flex flex-col gap-2 p-4">
          {/* Dashboard Link */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">
            <span>📊</span> Dashboard
          </Link>
          {/* Staff Link */}
          <Link href="/admin/staff" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">
            <span>👥</span> Staff Members
          </Link>
          {/* Add more links as needed */}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 mt-[60px] md:mt-0 w-full overflow-x-hidden">
        {children}
      </main>
      
    </div>
  );
}
