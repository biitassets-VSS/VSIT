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
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm h-16 flex items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full flex justify-between items-center">
          
          {/* LEFT SIDE: Hamburger & Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Menu size={24} />
            </button>

            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions" 
              className="h-8 sm:h-10 object-contain rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            
            <span className="text-blue-600 font-extrabold text-xs tracking-widest border-l border-gray-200 pl-3 py-1 ml-1 hidden sm:block">
              STAFF PORTAL
            </span>
          </div>

          {/* RIGHT SIDE: User Profile & LOGOUT BUTTON */}
          <div className="flex items-center gap-4">
            
            {/* User Name & Avatar */}
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:block text-sm font-semibold text-gray-700">
                Staff User
              </span>
              <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shadow-sm">
                SU
              </div>
            </div>

            {/* Divider Line */}
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

            {/* Logout Button moved here! */}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut size={18} />
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
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '-100%' }} 
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 flex flex-col border-r border-gray-200"
            >
              <div className="p-5 flex items-center justify-between border-b border-gray-100">
                <span className="text-lg font-bold text-gray-900">Menu</span>
                <button 
                  onClick={() => setIsSidebarOpen(false)} 
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={20} /> {link.name}
                    </Link>
                  );
                })}
              </div>
              
              {/* Note: The bottom section is completely removed here, giving you a clean sidebar! */}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PAGE CONTENT */}
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
