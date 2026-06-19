'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, ClipboardCheck, 
  LogOut, Menu, X, Loader2, ChevronDown, Ticket, PlusCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface StaffProfile {
  name: string;
  email: string;
  initials: string;
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [staffProfile, setStaffProfile] = useState<StaffProfile>({
    name: 'Loading...',
    email: '...',
    initials: 'ST'
  });

  useEffect(() => {
    const verifyStaff = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, email, role')
        .eq('email', user.email)
        .single();

      if (!userProfile || userProfile.role !== 'staff') {
        router.replace('/login');
        return;
      }

      const fullName = userProfile.name || 'Staff Member';
      const nameParts = fullName.trim().split(' ');
      let initials = 'ST';
      if (nameParts.length > 1 && nameParts[0] && nameParts[nameParts.length - 1]) {
        initials = nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0);
      } else if (fullName.length > 1) {
        initials = fullName.substring(0, 2);
      }

      setStaffProfile({
        name: fullName,
        email: user.email || '',
        initials: initials.toUpperCase()
      });

      setIsCheckingAuth(false);
    };
    verifyStaff();
  }, [router]);

  const navLinks = [
    { name: 'Dashboard', href: '/staff', icon: LayoutDashboard },
    { name: 'My Assets', href: '/staff/assets', icon: Laptop },
    { name: 'My Inspections', href: '/staff/inspections', icon: ClipboardCheck },
    { name: 'IT Tickets', href: '/staff/tickets', icon: Ticket },
    { name: 'Asset Requests', href: '/staff/requests', icon: PlusCircle }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.replace('/login');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans relative">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-gray-900/60 z-40 lg:hidden backdrop-blur-sm" />
      )}

      {/* SIDEBAR (Copyright Removed) */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-100 shadow-sm z-50 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-50 shrink-0">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/staff' ? pathname === '/staff' : pathname.startsWith(link.href);
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-50 relative shrink-0 mb-2">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)} 
            className={`w-full flex items-center justify-between p-2 rounded-2xl transition-all ${isProfileOpen ? 'bg-blue-50 ring-2 ring-blue-100' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-300 flex items-center justify-center text-white font-black text-sm shadow-sm">
                {staffProfile.initials}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-extrabold text-gray-900 leading-tight truncate">{staffProfile.name}</p>
                <p className="text-[11px] font-bold text-blue-600 truncate">{staffProfile.email}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={18} /> Logout Securely
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 shadow-sm shrink-0">
          <img src="/logo.png" alt="Logo" className="h-8" />
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto relative">
            {children}
        </main>
      </div>

      {/* FLOATING COPYRIGHT AT BOTTOM RIGHT */}
      <div className="fixed bottom-4 right-6 z-40 pointer-events-none">
        <p className="text-[11px] font-medium text-gray-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
          Design by <span className="text-orange-500 font-bold tracking-wide">AinodeArt</span>
        </p>
      </div>

    </div>
  );
}