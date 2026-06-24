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
    id: '', name: 'Loading...', email: '...', initials: 'ST'
  });

  useEffect(() => {
    let activeChannel: any; // 👈 FIX: Allow React to clean up the channel properly

    const verifyStaff = async () => {
      try {
        const isGuest = localStorage.getItem('isGuestSession') === 'true';
        if (isGuest) {
          setStaffProfile({ id: 'guest-mock-uuid', name: 'Demo Guest User', email: 'guest@vsit.com', initials: 'GS' });
          setIsCheckingAuth(false);
          return;
        }

        const rawSession = localStorage.getItem('vsit_staff_session') || localStorage.getItem('vsit_admin_session') || localStorage.getItem('user');
        if (!rawSession) { router.replace('/'); return; }

        let activeUser: any = {};
        try { activeUser = JSON.parse(rawSession); } 
        catch (e) {
          if (typeof rawSession === 'string' && rawSession.includes('@')) {
            activeUser = { email: rawSession, name: rawSession.split('@')[0] };
          } else { throw new Error("Unreadable session format"); }
        }

        const profileName = activeUser.name || activeUser.full_name || activeUser.email?.split('@')[0] || 'Staff Member';
        const safeUserId = activeUser.id || activeUser.emp_code || activeUser.email || 'staff-default-id';

        setStaffProfile({
          id: safeUserId, 
          name: profileName,
          email: activeUser.email || 'staff@vsit.com',
          initials: profileName.substring(0, 2).toUpperCase()
        });
        
        setIsCheckingAuth(false);
        fetchNotifications(safeUserId);

        // 🚀 FIX: Unique channel name prevents Supabase double-render crashes
        activeChannel = supabase
          .channel(`staff_notifs_${Date.now()}`)
          .on('postgres_changes', { 
            event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_user=eq.${safeUserId}` 
          }, (payload) => {
            setNotifications(current => [payload.new, ...current]);
          })
          .subscribe();

      } catch (fatalError) {
        console.error("Staff Layout rejected session:", fatalError);
        router.replace('/');
      }
    };
    
    verifyStaff();

    // 🚀 FIX: Provide cleanup to React
    return () => {
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, [router]);

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase.from('notifications').select('*').eq('target_user', userId).order('created_at', { ascending: false }).limit(20);
    if (data) setNotifications(data);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(current => current.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.clear();
    document.cookie = "vsit_auth=; path=/; max-age=0";
    document.cookie = "vsit_role=; path=/; max-age=0";
    router.replace('/');
  };

  if (isCheckingAuth) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans relative">
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm" />}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-slate-100 z-50 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-20 flex items-center px-6 border-b border-slate-50 shrink-0">
          <img src="/logo.png" alt="Logo" className="h-9 w-auto" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
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
              <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                <Icon size={20} className={isActive ? 'text-orange-500' : 'text-slate-400'} /> {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-50 shrink-0 mb-2">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-full flex items-center justify-between p-2 rounded-xl transition-all hover:bg-slate-50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">{staffProfile.initials}</div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-bold text-slate-900 leading-tight truncate">{staffProfile.name}</p>
                <p className="text-xs font-semibold text-orange-600 truncate">{staffProfile.email}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isProfileOpen && (
            <div className="absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-lg border border-slate-100 p-2 z-50">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"><LogOut size={16} /> Logout</button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-40">
          <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-orange-50 rounded-lg cursor-pointer"><Menu size={22} /></button>
          <div className="flex items-center gap-4 ml-auto">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">
              <Bell size={20} />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}