'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, Ticket, ClipboardCheck,
  LogOut, Menu, X, ChevronDown, Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; // Using your existing client!

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [staffUser, setStaffUser] = useState({
    name: 'Loading...',
    empCode: '...', 
    initials: 'SM',
    email: '...'
  });

  // SECURITY & DATA FETCHING
  useEffect(() => {
    const verifyStaff = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('staff')
        .select('name, emp_code, email, role')
        .eq('email', user.email)
        .single();

      if (!userProfile || userProfile.role !== 'Staff') {
        if (userProfile?.role === 'Admin') {
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

      // Set real data for the UI
      setStaffUser({
        name: fullName,
        empCode: userProfile.emp_code || 'N/A',
        initials: initials.toUpperCase(),
        email: user.email
      });

      // Remove loading screen
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

  // Show loading screen while checking database role
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
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg">
          <Menu size={24} />
        </button>
      </div>

      {/* MOBILE BACKDROP */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-gray-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 z-50 flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-20 flex items-center px-6 border-b border-gray-100 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <p className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/staff' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link 
                key={link.name} href={link.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} /> {link.name}
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM PROFILE WIDGET (Populated by live DB data) */}
        <div className="p-4 border-t border-gray-100 relative shrink-0">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`w-full flex items-center justify-between p-2 rounded-2xl transition-all ${isProfileOpen ? 'bg-blue-50 ring-2 ring-blue-200' : 'hover:bg-gray-50'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center text-blue-800 font-black text-sm shadow-sm">
                {staffUser.initials}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-extrabold text-gray-900 leading-tight truncate">{staffUser.name}</p>
                <p className="text-[11px] font-bold text-blue-600 truncate">EMP: {staffUser.empCode}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* CSS Animation Dropdown */}
          {isProfileOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 p-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                <LogOut size={18} /> Logout securely
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 w-full max-w-7xl mx-auto md:p-8 p-4 relative h-screen overflow-y-auto">
        {/* We use React.cloneElement to safely pass the staffUser data down to the children (like the dashboard) */}
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, { staffUser });
          }
          return child;
        })}
      </main>
    </div>
  );
}