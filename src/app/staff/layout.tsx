'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, LayoutDashboard, Laptop, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Mock User Data (Later, you will fetch this from your database/backend)
  const staffUser = {
    name: 'Lakhwinder Singh',
    department: 'IT Department',
    initials: 'LS'
  };

  // Navigation Links for Staff
  const navLinks = [
    { name: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
    { name: 'My Assets', href: '/staff/assets', icon: Laptop },
    { name: 'Profile', href: '/staff/profile', icon: UserCircle },
  ];

  const handleLogout = () => {
    // Redirect to the main login page
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      
      {/* GLOBAL TOP NAVBAR */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm h-[72px] flex items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full flex justify-between items-center">
          
          {/* LEFT SIDE: Hamburger & Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <Menu size={24} />
            </button>

            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions" 
              className="h-10 sm:h-12 object-contain rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            
            <span className="text-blue-600 font-extrabold text-xs tracking-widest border-l-2 border-gray-200 pl-3 py-1 ml-2 hidden md:block">
              STAFF PORTAL
            </span>
          </div>

          {/* RIGHT SIDE: Welcome, Profile & Logout */}
          <div className="flex items-center gap-4 sm:gap-6">
            
            {/* User Info Area */}
            <div className="flex items-center gap-3">
              
              {/* Text Block: Welcome + Department (Hidden on very small mobile screens to save space) */}
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-extrabold text-gray-800">
                  Welcome, {staffUser.name}
                </span>
                <span className="text-xs font-semibold text-blue-600">
                  {staffUser.department}
                </span>
              </div>

              {/* Avatar Initial Circle */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-sm shadow-sm">
                {staffUser.initials}
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all active:scale-95"
            >
              <LogOut size={18} strokeWidth={2.5} />
              <span className="hidden sm:block">Logout</span>
            </button>
            
          </div>
        </div>
      </nav>

      {/* VERTICAL SLIDING SIDEBAR (DRAWER) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-gray-900/60 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '-100%' }} 
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 flex flex-col border-r border-gray-200"
            >
              <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                <span className="text-lg font-black text-gray-900">Menu</span>
                <button 
                  onClick={() => setIsSidebarOpen(false)} 
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link 
                      key={link.name} 
                      href={link.href} 
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} /> {link.name}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PAGE CONTENT */}
      <main className="flex-1 w-full relative">
        {children}
      </main>
    </div>
  );
}
