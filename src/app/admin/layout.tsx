'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, LayoutDashboard, Laptop, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Assets', href: '/admin/assets', icon: Laptop },
    { name: 'Staff', href: '/admin/staff', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      
      {/* GLOBAL TOP NAVBAR */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm h-16 flex items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            {/* Hamburger Menu for Sidebar */}
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <Menu size={24} />
            </button>

            {/* YOUR ACTUAL COMPANY LOGO */}
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions" 
              className="h-8 sm:h-10 object-contain rounded" 
            />
            
            <span className="text-blue-600 font-extrabold text-xs tracking-widest border-l border-gray-200 pl-3 py-1 ml-1">
              ADMIN PORTAL
            </span>
          </div>

          <div className="flex items-center">
             <div className="h-9 w-9 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-gray-700 font-bold text-xs">
              AD
            </div>
          </div>
        </div>
      </nav>

      {/* VERTICAL SLIDING SIDEBAR (DRAWER) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 flex flex-col border-r border-gray-200"
            >
              <div className="p-5 flex items-center justify-between border-b border-gray-100">
                <span className="text-lg font-bold text-gray-900">Admin Menu</span>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link 
                      key={link.name} href={link.href} onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Icon size={20} /> {link.name}
                    </Link>
                  );
                })}
              </div>

              <div className="p-4 border-t border-gray-100">
                <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut size={20} /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
