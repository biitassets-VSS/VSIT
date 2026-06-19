'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, Ticket, ClipboardCheck,
  LogOut, Menu, X, ChevronDown, Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface StaffUser {
  name: string;
  empCode: string;
  initials: string;
  email: string;
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [staffUser, setStaffUser] = useState<StaffUser>({
    name: 'Loading...',
    empCode: '...', 
    initials: 'SM',
    email: ''
  });

  useEffect(() => {
    const verifyStaff = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/login');
        return;
      }

      // Fetch from 'profiles' table with correct lowercase roles
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('name, emp_code, email, role')
        .eq('email', user.email)
        .single();

      if (error || !userProfile || userProfile.role !== 'staff') {
        if (userProfile?.role === 'admin') {
          router.replace('/admin');
        } else {
          router.replace('/login');
        }
        return;
      }

      // Calculate Initials
      const fullName = userProfile.name || 'Staff Member';
      const nameParts = fullName.trim().split(' ');
      let initials = 'SM';
      if (nameParts.length > 1 && nameParts[0] && nameParts[nameParts.length - 1]) {
        initials = nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0);
      } else if (fullName.length > 1) {
        initials = fullName.substring(0, 2);
      }

      setStaffUser({
        name: fullName,
        empCode: userProfile.emp_code || 'N/A',
        initials: initials.toUpperCase(),
        email: user.email || ''
      });

      setIsCheckingAuth(false);
    };

    verifyStaff();
  }, [router]);

  const navLinks = [
    { name: 'Dashboard', href: '/staff', icon: LayoutDashboard },
    { name: 'My Assets', href: '/staff/assets', icon: Laptop },
    { name: 'My Tickets', href: '/staff/tickets', icon: Ticket },
    { name: 'Inspections', href: '/staff/inspections', icon: ClipboardCheck },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.replace('/login');
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans">
      {/* ... (Keep the rest of your JSX exactly the same as provided in the previous step) ... */}
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-40">
        <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg">
          <Menu size={24} />
        </button>
      </div>

      <aside className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 z-50 flex flex-col md:translate-x-0 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center px-6 border-b border-gray-100 justify-between">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/staff' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link key={link.name} href={link.href} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Icon size={20} /> {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-600 font-bold text-sm">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {React.Children.map(children, child => React.isValidElement(child) ? React.cloneElement(child, { staffUser } as any) : child)}
      </main>
    </div>
  );
}