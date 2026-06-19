// src/app/staff/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Laptop, Ticket, ClipboardCheck, LogOut, Menu, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const verifyStaff = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', user.email)
        .single();

      if (!userProfile || userProfile.role !== 'staff') {
        router.replace('/login');
        return;
      }
      setIsCheckingAuth(false);
    };
    verifyStaff();
  }, [router]);

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans">
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 z-50 flex flex-col md:translate-x-0 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center px-6 border-b border-gray-100"><img src="/logo.png" alt="Logo" className="h-10 w-auto" /></div>
        <nav className="flex-1 p-4 space-y-2">
            {[ { name: 'Dashboard', href: '/staff', icon: LayoutDashboard }, { name: 'My Assets', href: '/staff/assets', icon: Laptop }, { name: 'My Tickets', href: '/staff/tickets', icon: Ticket }, { name: 'Inspections', href: '/staff/inspections', icon: ClipboardCheck } ].map(link => (
                <Link key={link.name} href={link.href} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold ${pathname === link.href ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}>
                    <link.icon size={20} /> {link.name}
                </Link>
            ))}
        </nav>
        <div className="p-6 border-t border-gray-100 text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">© 2026 AINODEART</p></div>
        <div className="p-4 border-t border-gray-100"><button onClick={() => { supabase.auth.signOut(); router.replace('/login'); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-gray-500 font-bold text-sm"><LogOut size={20} /> Logout</button></div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}