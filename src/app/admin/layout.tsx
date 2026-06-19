'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, PackageSearch, Settings, 
  LogOut, Menu, X, ClipboardCheck, BarChart3, Ticket, Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // SECURITY CHECK
  useEffect(() => {
    const verifyAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', user.email)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        router.replace('/staff/dashboard');
        return;
      }
      setIsCheckingAuth(false);
    };
    verifyAdmin();
  }, [router]);

  const navLinks = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Staff / Users', href: '/admin/staff', icon: Users },
    { name: 'Asset Inventory', href: '/admin/assets', icon: PackageSearch },
    { name: 'Inspections', href: '/admin/inspections', icon: ClipboardCheck },
    { name: 'Tickets', href: '/admin/tickets', icon: Ticket }, 
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.replace('/login');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-100 shadow-sm z-10">
        <div className="h-20 flex items-center px-8 border-b border-gray-50">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
            return (
              <Link key={link.name} href={link.href} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${isActive ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100/50' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Icon size={20} className={isActive ? 'text-teal-600' : 'text-gray-400'} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* COPYRIGHT SECTION */}
        <div className="p-6 border-t border-gray-50 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">© 2026 AINODEART</p>
        </div>

        <div className="p-4 border-t border-gray-50">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-600 font-bold text-sm">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 shadow-sm">
            <img src="/logo.png" alt="Logo" className="h-8" />
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><Menu /></button>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
            {/* DUPLICATE WELCOME MESSAGE REMOVED. YOUR DASHBOARD PAGE WILL NOW HANDLE THE WELCOME TITLE. */}
            {children}
        </main>
      </div>
    </div>
  );
}