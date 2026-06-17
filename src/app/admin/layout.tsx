'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, PackageSearch, Settings, 
  LogOut, Menu, X, ClipboardCheck, BarChart3 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Professional Navigation Links - Inspections & Reports Restored!
  const navLinks = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Staff / Users', href: '/admin/staff', icon: Users },
    { name: 'Asset Inventory', href: '/admin/assets', icon: PackageSearch },
    { name: 'Inspections', href: '/admin/inspections', icon: ClipboardCheck },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* ========================================== */}
      {/* DESKTOP SIDEBAR                            */}
      {/* ========================================== */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-100 shadow-sm z-10">
        {/* LOGO SECTION */}
        <div className="h-20 flex items-center px-8 border-b border-gray-50">
          <img 
            src="/logo.png" 
            alt="Company Logo" 
            className="h-10 w-auto object-contain" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<span class="text-2xl font-black text-teal-600">Logo Error</span>');
            }} 
          />
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            // Exact match for dashboard, partial match for others (e.g. /admin/assets/new)
            const isActive = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
            
            return (
              <Link key={link.name} href={link.href} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 font-bold text-sm ${
                isActive 
                  ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100/50' // Active State (Matches Logo Color)
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'            // Inactive State
              }`}>
                <Icon size={20} className={isActive ? 'text-teal-600' : 'text-gray-400'} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT BUTTON */}
        <div className="p-4 border-t border-gray-50">
          <Link href="/login" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-600 font-bold text-sm transition-colors">
            <LogOut size={20} />
            Logout
          </Link>
        </div>
      </aside>

      {/* ========================================== */}
      {/* MOBILE HEADER & MENU                       */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Mobile Top Header */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
          <img src="/logo.png" alt="Company Logo" className="h-8 w-auto object-contain" />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 bg-gray-50 rounded-xl">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Slide-out Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 lg:hidden" />
              <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }} className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-40 lg:hidden flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                  <img src="/logo.png" alt="Company Logo" className="h-8 w-auto object-contain" />
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
                    return (
                      <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${isActive ? 'bg-teal-50 text-teal-700 border border-teal-100/50' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Icon size={20} className={isActive ? 'text-teal-600' : 'text-gray-400'} />
                        {link.name}
                      </Link>
                    );
                  })}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ========================================== */}
        {/* MAIN PAGE CONTENT                          */}
        {/* ========================================== */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
