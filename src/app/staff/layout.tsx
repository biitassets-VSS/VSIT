'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, Ticket, 
  LogOut, Menu, X, ChevronDown, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();

  const staffUser = {
    name: 'Lakhwinder Singh',
    role: 'Staff Member',
    initials: 'LS'
  };

  const navLinks = [
    { name: 'Dashboard', href: '/staff', icon: LayoutDashboard },
    { name: 'My Assets', href: '/staff/assets', icon: Laptop },
    { name: 'My Tickets', href: '/staff/tickets', icon: Ticket },
  ];

  const handleLogout = () => router.push('/');

  const checkIsActive = (href: string) => {
    if (href === '/staff') return pathname === '/staff'; 
    return pathname.startsWith(href); 
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {/* LOGO FIX HERE */}
          <img src="/logo.png" alt="VSS" className="h-8 w-8 object-contain" />
          <div className="flex flex-col">
            <span className="font-black text-gray-900 text-xs leading-tight">Virtual Staffing Solution</span>
            <span className="text-blue-600 font-black text-[10px] tracking-widest uppercase">Staff Portal</span>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg">
          <Menu size={24} />
        </button>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <AnimatePresence>
        {(isSidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 768) && (
          <>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-gray-900/60 z-40 md:hidden backdrop-blur-sm"
              />
            )}

            <motion.aside 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 z-50 flex flex-col shadow-2xl md:shadow-none ${!isSidebarOpen ? 'hidden md:flex' : 'flex'}`}
            >
              <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {/* LOGO FIX HERE */}
                  <img src="/logo.png" alt="VSS Logo" className="h-10 w-10 object-contain p-1 bg-gray-50 rounded-xl border border-gray-100" />
                  <div>
                    <h1 className="font-black text-gray-900 text-sm leading-tight">Virtual Staffing<br/>Solution</h1>
                    <p className="text-[10px] font-extrabold text-blue-600 tracking-widest uppercase mt-0.5">Staff Portal</p>
                  </div>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                <p className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
                {navLinks.map((link) => {
                  const isActive = checkIsActive(link.href);
                  const Icon = link.icon;
                  return (
                    <Link 
                      key={link.name} href={link.href} onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                        isActive ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} /> {link.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-gray-100 relative">
                <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`w-full flex items-center justify-between p-2 rounded-2xl transition-all ${isProfileOpen ? 'bg-blue-50 ring-2 ring-blue-200' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center text-blue-800 font-black text-sm shadow-sm">
                      {staffUser.initials}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-extrabold text-gray-900 leading-tight">{staffUser.name}</p>
                      <p className="text-[11px] font-bold text-blue-600">{staffUser.role}</p>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 p-2">
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                        <LogOut size={18} /> Logout securely
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-7xl mx-auto md:p-8 p-4 relative h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
