'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, ClipboardCheck, 
  LogOut, Menu, X, Loader2, ChevronDown, Ticket, PlusCircle, Bell
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface StaffProfile {
  id: string;
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
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [staffProfile, setStaffProfile] = useState<StaffProfile>({
    id: '',
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
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const profileName = userProfile?.full_name || userProfile?.name || 'Mohit Bahuguna';
      const userInitials = profileName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'ST';

      setStaffProfile({
        id: user.id, 
        name: profileName,
        email: user.email || 'students_app05@outlook.com',
        initials: userInitials
      });
      
      setIsCheckingAuth(false);
      fetchNotifications(user.id);

      const channel = supabase
        .channel('staff_notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `target_user=eq.${user.id}` 
        }, (payload) => {
          setNotifications(current => [payload.new, ...current]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };
    verifyStaff();
  }, [router]);

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_user', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(current => current.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.replace('/login');
  };

  if (isCheckingAuth) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#ff9800] animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans relative">
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-gray-900/60 z-40 lg:hidden backdrop-blur-sm" />}

      {/* SIDEBAR */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-100 shadow-sm z-50 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-50 shrink-0">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {[
            { name: 'Dashboard', href: '/staff', icon: LayoutDashboard },
            { name: 'My Assets', href: '/staff/assets', icon: Laptop },
            { name: 'My Inspections', href: '/staff/inspections', icon: ClipboardCheck },
            { name: 'IT Tickets', href: '/staff/tickets', icon: Ticket },
            { name: 'Asset Requests', href: '/staff/requests', icon: PlusCircle }
          ].map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/staff' ? pathname === '/staff' : pathname.startsWith(link.href);
            return (
              <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${isActive ? 'bg-orange-50 text-[#ff9800] shadow-sm border border-orange-100/50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Icon size={20} className={isActive ? 'text-[#ff9800]' : 'text-gray-400'} /> {link.name}
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM USER PROFILE CONTROL ONLY */}
        <div className="p-4 border-t border-gray-50 relative shrink-0 mb-2">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-full flex items-center justify-between p-2 rounded-2xl transition-all hover:bg-gray-50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-11 w-11 shrink-0 rounded-full bg-[#ff9800] flex items-center justify-center text-white font-black text-[15px] shadow-sm">{staffProfile.initials}</div>
              <div className="text-left overflow-hidden">
                <p className="text-[15px] font-bold text-[#0f172a] leading-tight truncate">{staffProfile.name}</p>
                <p className="text-[13px] font-semibold text-[#f97316] truncate mt-0.5">{staffProfile.email}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isProfileOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={18} /> Logout</button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN LAYOUT BODY */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* UNIFIED TOP NAVIGATION CORNER BAR */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 shadow-sm shrink-0 relative z-40">
          {/* Mobile hamburger menu (hidden on desktop) */}
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-500 hover:bg-orange-50 hover:text-[#ff9800] rounded-xl lg:hidden">
            <Menu size={24} />
          </button>

          {/* Logo placeholder for mobile header alignment */}
          <img src="/logo.png" alt="Logo" className="h-8 lg:hidden" />

          {/* Top Right Bell Action (Unified for both screen types) */}
          <div className="flex items-center gap-4 ml-auto relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)} 
              className="relative p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100 text-gray-600 hover:text-[#ff9800]"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown Box */}
            {isNotifOpen && (
              <div className="absolute top-[115%] right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 max-h-96 overflow-y-auto">
                <div className="p-2 border-b border-gray-50 mb-2 flex justify-between items-center">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Recent Alerts</h3>
                  {unreadCount > 0 && <span className="bg-[#ff9800] text-white text-[10px] font-black px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-center text-gray-500 py-6 font-medium">No new notifications.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-3 rounded-xl cursor-pointer transition-colors mb-1 ${n.is_read ? 'bg-white opacity-60' : 'bg-orange-50/50 border border-orange-100/60'}`}>
                      <p className="text-[10px] font-bold text-[#ff9800] mb-0.5 uppercase tracking-wider">{n.type}</p>
                      <p className="text-xs font-black text-gray-900">{n.title}</p>
                      <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto relative bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}