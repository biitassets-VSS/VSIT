'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Laptop, UserCircle, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Mock User Data (Later, fetch this from your database)
  const staffUser = {
    name: 'Lakhwinder Singh',
    department: 'IT Department',
    initials: 'LS'
  };

  // Main Navigation Links for Top Menu
  const navLinks = [
    { name: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
    { name: 'My Assets', href: '/staff/assets', icon: Laptop },
  ];

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      
      {/* TOP MENU BAR */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm h-[72px] px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="w-full max-w-7xl flex justify-between items-center h-full">
          
          {/* LEFT SIDE: Logo & Main Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Virtual Staffing Solutions" 
                className="h-10 sm:h-12 object-contain rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-blue-600 font-extrabold text-xs tracking-widest border-l-2 border-gray-200 pl-3 py-1 hidden lg:block">
                STAFF PORTAL
              </span>
            </div>

            {/* Horizontal Links (Top Menu Bar) */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link 
                    key={link.name} 
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} /> 
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE: Clickable Profile Dropdown */}
          <div className="relative">
            {/* Invisible backdrop to close dropdown when clicking outside */}
            {isProfileOpen && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsProfileOpen(false)}
              ></div>
            )}

            {/* Profile Button */}
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex items-center gap-3 p-1.5 pr-3 rounded-2xl transition-all relative z-50 ${
                isProfileOpen ? 'bg-gray-100 ring-2 ring-gray-200' : 'hover:bg-gray-50'
              }`}
            >
              {/* Text Block: Welcome + Department */}
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-extrabold text-gray-800">
                  {staffUser.name}
                </span>
                <span className="text-xs font-semibold text-blue-600">
                  {staffUser.department}
                </span>
              </div>

              {/* Avatar Initial Circle */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-sm shadow-sm">
                {staffUser.initials}
              </div>

              {/* Dropdown Arrow */}
              <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Box */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                >
                  <div className="p-3">
                    <Link 
                      href="/staff/profile" 
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <UserCircle size={18} />
                      My Profile
                    </Link>
                    
                    <div className="h-px bg-gray-100 my-2"></div>
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <LogOut size={18} />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVIGATION (Visible only on very small screens since top menu is hidden) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-bold transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* PAGE CONTENT */}
      <main className="flex-1 w-full max-w-7xl mx-auto md:p-6 p-4 pb-24 md:pb-6 relative">
        {children}
      </main>
    </div>
  );
}
