'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Package, Users, ClipboardCheck, 
  BarChart, Settings, LogOut, Menu, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// RESTORED REPORTS TAB HERE
const sidebarLinks = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Assets', href: '/admin/assets', icon: Package },
  { name: 'Inspections', href: '/admin/inspections', icon: ClipboardCheck },
  { name: 'Staff & Users', href: '/admin/staff', icon: Users },
  { name: 'Reports', href: '/admin/reports', icon: BarChart }, 
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col md:flex-row font-sans selection:bg-teal-100 selection:text-teal-900">
      
      {/* MOBILE TOP NAVIGATION BAR */}
      <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <Link href="/admin" className="flex items-center gap-2">
          {/* Logo - Original Colors */}
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
          <span className="font-black text-lg tracking-tight text-gray-900">VSIT<span className="text-teal-600">.</span></span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {/* MOBILE BACKDROP OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 md:hidden" />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 shadow-2xl md:shadow-none flex flex-col transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Sidebar Header with Original Logo */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-gray-50">
          <Link href="/admin" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain group-hover:scale-105 transition-transform" onError={(e) => e.currentTarget.style.display = 'none'} />
            <span className="text-xl font-black tracking-tight text-gray-900">VSIT<span className="text-teal-600">.</span></span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-hide">
          <p className="px-4 text-[10px] font-black uppercase tracking-wider text-gray-400 mb-4">Main Menu</p>
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
            return (
              <Link key={link.name} href={link.href} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group ${isActive ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <link.icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-teal-600 transition-colors'} />
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* User / Logout */}
        <div className="p-4 border-t border-gray-50">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-2xl transition-all group">
            <LogOut size={20} className="text-red-400 group-hover:text-red-600 transition-colors" /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-full md:max-w-[calc(100vw-18rem)] overflow-x-hidden p-4 sm:p-6 lg:p-8 relative">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
