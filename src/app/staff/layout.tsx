'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, ClipboardCheck, 
  LogOut, Menu, X, Loader2, ChevronDown, Ticket, PlusCircle, Bell, Trash2, History, AlertTriangle
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

  // 🌟 NEW: Non-blocking Floating Toasts State
  const [toasts, setToasts] = useState<any[]>([]);

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
      
      // Hard redirect if they shouldn't be here
      if (!sessionString) {
        window.location.href = '/'; 
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

  // 🌟 HELPER: Show multiple non-blocking toast alerts at the same time
  const showToastAlert = (notification: any) => {
    const toastId = notification.id || String(Date.now());
    setToasts(prev => [...prev, { ...notification, toastId }]);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 8000);
  };

  const removeToastAlert = (toastId: string) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  };

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
          
          // 🌟 Show non-blocking floating toast (allows multiple simultaneously)
          showToastAlert(payload.new);
          
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
    window.location.href = '/';
  };

  const markNotificationAsRead = async (notificationId: string) => {
    // Optimistically remove from UI
    setNotifications((prev) => prev.filter(n => n.id !== notificationId));
    // Update DB
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  };

  if (isCheckingAuth) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans relative overflow-hidden">
      
      {/* 🌟 FLOATING TOAST NOTIFICATIONS CONTAINER */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.toastId} 
            className="pointer-events-auto bg-white border-l-4 border-rose-500 shadow-2xl rounded-2xl p-4 w-[340px] sm:w-[400px] flex gap-3 animate-in slide-in-from-right-8 fade-in duration-300"
          >
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div className="flex-1 pr-2">
              <h4 className="text-sm font-bold text-slate-900 leading-tight">{toast.title}</h4>
              <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToastAlert(toast.toastId)} 
              className="text-slate-400 hover:text-rose-600 transition-colors shrink-0 self-start p-1"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)} 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity" 
        />
      )}

      {/* 🚀 SLIM PROFESSIONAL SIDEBAR */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200/70 z-50 flex flex-col transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Sleek Logo Area */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 shrink-0">
          <img src="/logo.png" alt="Logo" className="h-7 w-auto" />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto custom-scrollbar">
          {[
            { name: 'Dashboard', href: '/staff', icon: LayoutDashboard },
            { name: 'My Assets', href: '/staff/assets', icon: Laptop },
            { name: 'My Inspections', href: '/staff/inspections', icon: ClipboardCheck },
            { name: 'IT Tickets', href: '/staff/tickets', icon: Ticket },
            { name: 'Asset Requests', href: '/staff/requests', icon: PlusCircle },
            { name: 'Replacement Log', href: '/staff/replacements', icon: History }
          ].map((link) => {
            const Icon = link.icon;
            // Strict matching for root Dashboard, partial for sub-pages
            const isActive = link.href === '/staff' ? pathname === '/staff' : pathname.startsWith(link.href);
            
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                onClick={() => setIsMobileMenuOpen(false)} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${
                  isActive 
                    ? 'bg-orange-50 text-orange-700 font-semibold shadow-sm border border-orange-100/50' 
                    : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={`${isActive ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} /> 
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Compact Profile Widget */}
        <div className="p-3 border-t border-slate-100 shrink-0 relative bg-slate-50/50">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)} 
            className="w-full flex items-center justify-between p-2 rounded-lg transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-orange-500 to-orange-400 flex items-center justify-center text-white font-bold text-xs shadow-sm border border-orange-600/20">
                {staffProfile.initials}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{staffProfile.name}</p>
                <p className="text-[10px] font-medium text-slate-500 truncate">{staffProfile.email}</p>
              </div>
            </div>
            <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-xl border border-slate-200/80 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors">
                <LogOut size={14} /> Secure Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 🚀 MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F8FAFC]">
        
        {/* Sleek Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/70 shrink-0 flex items-center justify-between px-4 lg:px-6 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 lg:hidden rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              <Menu size={20} />
            </button>
            <h2 className="text-sm lg:text-base font-bold text-slate-800 tracking-tight hidden sm:block">
              Virtual Staffing Solutions | Staff Dasboard
            </h2>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {/* NOTIFICATIONS DROPDOWN */}
            {isNotifOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Alerts & Notices</h3>
                  {notifications.length > 0 && (
                    <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md border border-orange-200">
                      {notifications.length} New
                    </span>
                  )}
                </div>
                
                <div className="max-h-[320px] overflow-y-auto custom-scrollbar bg-white">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-slate-400 flex flex-col items-center gap-2">
                      <Bell size={24} className="opacity-20" />
                      <span className="text-xs font-medium">You're all caught up!</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors group relative flex gap-3">
                          <div className="mt-0.5 shrink-0 text-rose-500">
                            <AlertTriangle size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 pr-6">{notif.title}</p>
                            <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed pr-2">{notif.message}</p>
                          </div>
                          <button 
                            onClick={() => markNotificationAsRead(notif.id)}
                            className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors p-1"
                            title="Dismiss"
                          >
                            <X size={14} />
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

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8 relative custom-scrollbar">
          {/* Constrain max width for better readability on ultrawide monitors */}
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}