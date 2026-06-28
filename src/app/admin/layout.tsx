'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, Laptop, ClipboardCheck, Settings, FileText,
  LogOut, Menu, X, Loader2, ChevronDown, ShieldCheck, Ticket
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AdminProfile {
  id: string;
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
    id: '',
    name: 'Loading...',
    email: '...',
    initials: 'AD'
  });

  // 1. Authenticate and build Admin profile
  useEffect(() => {
    const verifyAdmin = async () => {
      // Look for the EXACT key the login page sets for Admins
      const sessionString = localStorage.getItem('vsit_admin_session');
      
      if (!sessionString) {
        window.location.replace('/'); 
        return; 
      }

      let activeUser: any = {};
      try {
        activeUser = JSON.parse(sessionString);
      } catch (e) {
        activeUser = { 
          email: sessionString, 
          name: sessionString.split('@')[0] 
        };
      }

      const profileName = activeUser.name || activeUser.full_name || 'System Administrator';
      const initials = profileName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'AD';
      const userId = activeUser.id || activeUser.email || String(Date.now());

      setAdminProfile({
        id: userId, 
        name: profileName,
        email: activeUser.email || 'admin@vsit.com',
        initials: initials
      });
      
      setIsCheckingAuth(false);
    };
    
    verifyAdmin();
  }, [router]);

  // 🌟 FIX: Instant Logout (Wipe memory first, force redirect immediately)
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    supabase.auth.signOut().catch(() => {}); // Fire and forget
    window.location.replace('/');
  };

  if (isCheckingAuth) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans relative">
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm" />}

      {/* ADMIN SIDEBAR */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-slate-900 text-slate-300 z-50 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Admin Branding */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800 shrink-0 gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-white font-black tracking-tight leading-tight">Admin Console</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">VSIT Management</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 mt-2">Core</div>
          {[
            { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
            { name: 'Staff Directory', href: '/admin/staff', icon: Users },
            { name: 'Hardware Fleet', href: '/admin/assets', icon: Laptop },
          ].map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
            return (
              <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${isActive ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500'} /> {link.name}
              </Link>
            );
          })}

          <div className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 mt-6">Operations</div>
          {[
            { name: 'Audit Reports', href: '/admin/inspections', icon: ClipboardCheck },
            { name: 'Service Tickets', href: '/admin/tickets', icon: Ticket },
            { name: 'System Logs', href: '/admin/reports', icon: FileText },
          ].map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${isActive ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500'} /> {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Admin Profile Dropdown */}
        <div className="p-4 border-t border-slate-800 shrink-0 mb-2">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-full flex items-center justify-between p-2 rounded-xl transition-all hover:bg-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-orange-500 font-bold text-sm">{adminProfile.initials}</div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-bold text-white leading-tight truncate">{adminProfile.name}</p>
                <p className="text-xs font-semibold text-slate-500 truncate">{adminProfile.email}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isProfileOpen && (
            <div className="absolute bottom-20 left-4 right-4 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-2 z-50">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"><LogOut size={16} /> Secure Logout</button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-20 bg-white border-b border-slate-100 shrink-0 flex items-center justify-between px-4 lg:px-8 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 lg:hidden rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100">
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Admin Workspace</h2>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto relative bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}