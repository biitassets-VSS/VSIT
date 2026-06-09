'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, X, Users, Laptop, ClipboardCheck, BarChart3, 
  UserCircle, LogOut, ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Mock Admin Data
  const adminUser = {
    name: 'Admin User',
    role: 'System Administrator',
    email: 'admin@virtualstaffing.com',
    initials: 'AU'
  };

  // Admin Navigation Links
  const navLinks = [
    { name: 'Staff', href: '/admin/staff', icon: Users },
    { name: 'Assets', href: '/admin/assets', icon: Laptop },
    { name: 'Inspection', href: '/admin/inspection', icon: ClipboardCheck },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  ];

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col font-sans">
      
      {/* TOP NAVIGATION BAR */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm h-[72px] px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="w-full max-w-[1400px] flex justify-between items-center h-full">
          
          {/* LEFT SIDE: Mobile Hamburger & Logo */}
          <div className="flex items-center gap-4 lg:gap-8">
            
            {/* Mobile Hamburger Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              <Menu size={24} />
            </button>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Virtual Staffing Solutions" 
                className="h-10 sm:h-12 object-contain rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-orange-600 font-extrabold text-xs tracking-widest border-l-2 border-gray-200 pl-3 py-1 hidden sm:block">
                ADMIN PORTAL
              </span>
            </div>

            {/* DESKTOP NAVIGATION LINKS (Hidden on Mobile) */}
            <div className="hidden lg:flex items-center gap-1.5 ml-4">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link 
                    key={link.name} 
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive 
                        ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100/50' 
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

          {/* RIGHT SIDE: Admin Profile Dropdown */}
          <div className="relative">
            {/* Invisible backdrop to close dropdown */}
            {isProfileOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
            )}

            {/* Profile Button */}
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex items-center gap-3 p-1.5 pr-3 rounded-2xl transition-all relative z-50 ${
                isProfileOpen ? 'bg-gray-100 ring-2 ring-gray-200' : 'hover:bg-gray-50'
              }`}
            >
              {/* Text Block (Hidden on tiny screens to prevent layout breaking) */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-extrabold text-gray-800">
                  {adminUser.name}
                </span>
                <span className="text-xs font-semibold text-orange-600">
                  {adminUser.role}
                </span>
              </div>

              {/* Avatar Initial Circle */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-black text-sm shadow-sm">
                {adminUser.initials}
              </div>

              <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                >
                  {/* ADMIN DETAILS HEADER */}
                  <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                    <p className="text-sm font-extrabold text-gray-900 truncate">
                      {adminUser.name}
                    </p>
                    <p className="text-xs font-medium text-gray-500 truncate mt-0.5">
                      {adminUser.email}
                    </p>
                  </div>

                  {/* ACTION LINKS */}
                  <div className="p-2">
                    <Link 
                      href="/admin/profile" 
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
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

      {/* MOBILE SLIDING MENU (Drawer) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Dark Overlay */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-gray-900/60 z-50 lg:hidden backdrop-blur-sm"
            />
            {/* Side Drawer */}
            <motion.div 
              initial={{ x: '-100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '-100%' }} 
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 flex flex-col border-r border-gray-200 lg:hidden"
            >
              <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                <span className="text-orange-600 font-extrabold tracking-wider text-sm">ADMIN MENU</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {navLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  const Icon = link.icon;
                  return (
                    <Link 
                      key={link.name} 
                      href={link.href} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                        isActive 
                          ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100/50' 
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
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 relative">
        {children}
      </main>
    </div>
  );
}
