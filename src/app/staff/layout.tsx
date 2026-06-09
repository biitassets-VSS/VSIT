'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserCircle, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();

  // Mock User Data (Including Email for the dropdown)
  const staffUser = {
    name: 'Lakhwinder Singh',
    department: 'IT Department',
    email: 'lakhwinder@virtualstaffing.com', // Login Email added here
    initials: 'LS'
  };

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      
      {/* TOP MENU BAR */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm h-[72px] px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="w-full max-w-7xl flex justify-between items-center h-full">
          
          {/* LEFT SIDE: Logo & Portal Name ONLY */}
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions" 
              className="h-10 sm:h-12 object-contain rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-blue-600 font-extrabold text-xs tracking-widest border-l-2 border-gray-200 pl-3 py-1 hidden sm:block">
              STAFF PORTAL
            </span>
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
                  className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                >
                  {/* USER DETAILS HEADER INSIDE DROPDOWN */}
                  <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                    <p className="text-sm font-extrabold text-gray-900 truncate">
                      {staffUser.name}
                    </p>
                    <p className="text-xs font-medium text-gray-500 truncate mt-0.5">
                      {staffUser.email}
                    </p>
                  </div>

                  {/* ACTION LINKS */}
                  <div className="p-2">
                    <Link 
                      href="/staff/profile" 
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <UserCircle size={18} />
                      View Profile
                    </Link>
                    
                    <div className="h-px bg-gray-100 my-1 mx-2"></div>
                    
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

      {/* PAGE CONTENT */}
      <main className="flex-1 w-full max-w-7xl mx-auto md:p-6 p-4 relative">
        {children}
      </main>
    </div>
  );
}
