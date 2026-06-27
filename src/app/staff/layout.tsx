'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, ClipboardCheck, 
  LogOut, Menu, X, Loader2, ChevronDown, Ticket, PlusCircle, Bell, Trash2
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

  // 1. Authenticate and build profile
  useEffect(() => {
    const verifyStaff = async () => {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setStaffProfile({ id: 'guest-mock-uuid', name: 'Demo Guest User', email: 'guest@vsit.com', initials: 'GS' });
        setIsCheckingAuth(false);
        return;
      }

      const sessionString = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      
      if (!sessionString) {
        router.replace('/'); 
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

      const profileName = activeUser.name || activeUser.full_name || 'Staff Member';
      const initials = profileName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'ST';
      const userId = activeUser.id || activeUser.email || String(Date.now());

      setStaffProfile({
        id: userId, 
        name: profileName,
        email: activeUser.email || 'staff@vsit.com',
        initials: initials
      });
      
      setIsCheckingAuth(false);
    };
    
    verifyStaff();
  }, [router]);

  // 2. 🚨 REALTIME NOTIFICATION ENGINE
  useEffect(() => {
    if (!staffProfile.id || staffProfile.id === 'guest-mock-uuid') return;

    // Fetch initial missed notifications
    const fetchMissedNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('target_user', staffProfile.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      
      if (data) setNotifications(data);
    };
    
    fetchMissedNotifications();

    // Tune the antenna to the Realtime channel
    const notificationSubscription = supabase
      .channel('staff-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `target_user=eq.${staffProfile.id}`, // Only listen for MY alerts
        },
        (payload) => {
          console.log('Realtime Alert Received!', payload.new);
          
          // Show browser alert instantly
          alert(`🚨 NEW ALERT: ${payload.new.title}\n\n${payload.new.message}`);
          
          // Add to the bell dropdown instantly
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationSubscription);
    };
  }, [staffProfile.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.clear();
    router.replace('/');
  };

  const markNotificationAsRead = async (notificationId: string) => {
    // Optimistically remove from UI
    setNotifications((prev) => prev.filter(n => n.id !== notificationId));
    // Update DB
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  };

  if (isCheckingAuth) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans relative">
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm" />}

      {/* SIDEBAR */}
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
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={16} /> Logout</button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* TOP HEADER WITH BELL */}
        <header className="h-20 bg-white border-b border-slate-100 shrink-0 flex items-center justify-between px-4 lg:px-8 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 lg:hidden rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100">
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-black text-slate-800 tracking-tight hidden sm:block">Staff Portal</h2>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border border-slate-100 shadow-sm"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 border-2 border-white text-white flex items-center justify-center text-[9px] font-black rounded-full animate-bounce">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* NOTIFICATIONS DROPDOWN */}
            {isNotifOpen && (
              <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alerts</h3>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{notifications.length} New</span>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-xs font-semibold">
                      You are all caught up!
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors group">
                          <p className="text-xs font-black text-slate-900 mb-1">{notif.title}</p>
                          <p className="text-xs text-slate-500 leading-relaxed mb-3">{notif.message}</p>
                          <button 
                            onClick={() => markNotificationAsRead(notif.id)}
                            className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            <Trash2 size={12} /> Mark as Read
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}