'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, PackageSearch, Settings, 
  LogOut, Menu, X, ClipboardCheck, BarChart3, Ticket, Loader2, ChevronDown 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AdminProfile {
  name: string;
  email: string;
  initials: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    name: 'Loading...',
    email: '...',
    initials: 'AD'
  });

  // SECURITY & PROFILE FETCH
  useEffect(() => {
    const verifyAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, email, role')
        .eq('email', user.email)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        router.replace('/staff/dashboard');
        return;
      }

      // Calculate Initials for Avatar
      const fullName = userProfile.name || 'Administrator';
      const nameParts = fullName.trim().split(' ');
      let initials = 'AD';
      if (nameParts.length > 1 && nameParts[0] && nameParts[nameParts.length - 1]) {
        initials = nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0);
      } else if (fullName.length > 1) {
        initials = fullName.substring(0, 2);
      }

      setAdminProfile({
        name: fullName,
        email: user.email || '',
        initials: initials.toUpperCase()
      });

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
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-gray-900/60 z-40 lg:hidden backdrop-blur-sm" />
      )}

      {/* SIDEBAR (Desktop & Mobile) */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-100 shadow-sm z-50 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* LOGO HEADER */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-50 shrink-0">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* MENU TABS */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                  isActive 
                    ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100/50' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-orange-500' : 'text-gray-400'} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* USER ID PROFILE & LOGOUT */}
        <div className="p-4 border-t border-gray-50 relative shrink-0">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)} 
            className={`w-full flex items-center justify-between p-2 rounded-2xl transition-all ${isProfileOpen ? 'bg-orange-50 ring-2 ring-orange-100' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 border border-orange-300 flex items-center justify-center text-white font-black text-sm shadow-sm">
                {adminProfile.initials}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-extrabold text-gray-900 leading-tight truncate">{adminProfile.name}</p>
                <p className="text-[11px] font-bold text-orange-600 truncate">{adminProfile.email}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* LOGOUT DROPDOWN */}
          {isProfileOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={18} /> Logout Securely
              </button>
            </div>
          )}
        </div>
      {/* MAIN DASHBOARD CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* MOBILE TOP HEADER */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 shadow-sm shrink-0">
          <img src="/logo.png" alt="Logo" className="h-8" />
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-500 hover:bg-orange-50 hover:text-orange-600 rounded-lg">
            <Menu size={24} />
          </button>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
        </main>
      </div>
      
    </div>
    {/* FLOATING COPYRIGHT AT BOTTOM RIGHT */}
      <div className="fixed bottom-4 right-6 z-50 pointer-events-none">
        <p className="text-[11px] font-medium text-gray-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
          Design by <span className="text-blue-600 font-bold tracking-wide">AinodeArt</span>
        </p>
      </div>
  );
}