'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, Ticket, ClipboardCheck,
  LogOut, Menu, X, ChevronDown 
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient'; // Ensure this path is correct

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [staffUser, setStaffUser] = useState({
    name: 'Loading...',
    empCode: '...', // Added this
    initials: '...',
    email: '...'
  });
  
  const pathname = usePathname();
  const router = useRouter();

  // FETCH DATA DIRECTLY FROM SUPABASE
  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email) {
        // Query database using the logged-in email
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, employee_code') // Ensure column name matches your DB
          .eq('email', user.email)
          .single();

        if (data) {
          const fullName = data.full_name || 'Staff Member';
          
          // Calculate Initials
          const nameParts = fullName.trim().split(' ');
          let initials = 'SM';
          if (nameParts.length > 1) {
            initials = nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0);
          } else {
            initials = fullName.substring(0, 2);
          }

          setStaffUser({
            name: fullName,
            empCode: data.employee_code || 'N/A', // Using database value
            initials: initials.toUpperCase(),
            email: user.email
          });
        }
      }
    }

    fetchUserData();
  }, []);

  const navLinks = [
    { name: 'Dashboard', href: '/staff', icon: LayoutDashboard },
    { name: 'My Assets', href: '/staff/assets', icon: Laptop },
    { name: 'My Tickets', href: '/staff/tickets', icon: Ticket },
    { name: 'Inspections', href: '/staff/inspections', icon: ClipboardCheck },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans">
      
      {/* MOBILE HEADER - Branding Removed */}
      <div className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg">
          <Menu size={24} />
        </button>
      </div>

      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 z-50 flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* SIDEBAR HEADER - Branding Removed */}
        <div className="h-20 flex items-center px-6 border-b border-gray-100 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/staff' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link key={link.name} href={link.href} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Icon size={20} /> {link.name}
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM PROFILE WIDGET - Added Emp Code */}
        <div className="p-4 border-t border-gray-100 relative shrink-0">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-black text-sm">
                {staffUser.initials}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-extrabold text-gray-900 truncate">{staffUser.name}</p>
                <p className="text-[11px] font-bold text-blue-600 truncate">EMP: {staffUser.empCode}</p>
              </div>
            </div>
            <ChevronDown size={16} className="text-gray-500" />
          </button>
        </div>
      </aside>

      <main className="flex-1 w-full max-w-7xl mx-auto md:p-8 p-4 relative h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}