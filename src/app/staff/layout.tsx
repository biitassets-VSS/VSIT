'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, ClipboardCheck, 
  LogOut, Menu, X, Loader2, ChevronDown, Ticket, PlusCircle, Bell, History, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface StaffProfile {
  id: string;
  name: string;
  email: string;
  initials: string;
}

interface AlertRecord {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [alertHistory, setAlertHistory] = useState<AlertRecord[]>([]);
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

  // 2. 🚨 REALTIME NOTIFICATION & HISTORY ENGINE
  useEffect(() => {
    if (!staffProfile.id || staffProfile.id === 'guest-mock-uuid') return;

    // Fetch initial missed notifications
    const fetchMissedNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      
      if (data) {
        const dismissed = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
        const validNotifs = data.filter(n => {
          if (dismissed.includes(n.id)) return false;
          const target = String(n.target_user || '').trim().toLowerCase();
          const isGlobal = target === '' || target === 'null' || target === 'undefined' || ['all', 'broadcast', 'everyone', 'staff', 'all_staff'].includes(target);
          const isPersonal = target === String(staffProfile.id).toLowerCase() || target === staffProfile.email.toLowerCase();
          return isGlobal || isPersonal;
        });

        const historyRecords = validNotifs.map(n => ({
          id: n.id,
          title: n.title || 'System Alert',
          message: n.message,
          time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        }));
        setAlertHistory(historyRecords);
      }
    };
    
    fetchMissedNotifications();

    // Listen for incoming live notifications
    const notificationSubscription = supabase
      .channel('staff-layout-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new;
          const target = String(n.target_user || '').trim().toLowerCase();
          const isGlobal = target === '' || target === 'null' || target === 'undefined' || ['all', 'broadcast', 'everyone', 'staff', 'all_staff'].includes(target);
          const isPersonal = target === String(staffProfile.id).toLowerCase() || target === staffProfile.email.toLowerCase();
          
          if (isGlobal || isPersonal) {
            const timeStr = new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const toastId = n.id || String(Date.now());
            
            // 1. Show Floating Toast (Auto dismisses after 12 seconds)
            setToasts(prev => [...prev, { id: toastId, title: n.title || 'System Alert', message: n.message }]);
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== toastId));
            }, 12000);

            // 2. Add to Persistent History Dropdown
            setAlertHistory(prev => {
              if (prev.some(existing => existing.id === n.id)) return prev;
              return [{ id: toastId, title: n.title || 'System Alert', message: n.message, time: timeStr, read: false }, ...prev].slice(0, 50);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationSubscription);
    };
  }, [staffProfile.id, staffProfile.email]);

  const toggleNotifDropdown = () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen) {
      // Mark all as read locally when opening the dropdown so the red badge goes away
      setAlertHistory(prev => prev.map(a => ({ ...a, read: true })));
    }
  };

  const dismissHistoryAlert = async (id: string) => {
    // Remove from UI History immediately
    setAlertHistory(prev => prev.filter(a => a.id !== id));
    
    // Mark as dismissed locally to prevent re-fetching
    const dismissed = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
    if (!dismissed.includes(id)) { 
      dismissed.push(id); 
      localStorage.setItem('dismissed_broadcasts', JSON.stringify(dismissed)); 
    }

    // Delete/Update in Supabase
    await supabase.from('notifications').update({ is_read: true }).eq('id', id).catch(() => {});
    await supabase.from('notifications').delete().eq('id', id).catch(() => {});
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.clear();
    window.location.href = '/';
  };

  if (isCheckingAuth) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
    </div>
  );

  const unreadCount = alertHistory.filter(a => !a.read).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans relative overflow-hidden">
      
      {/* 🌟 FLOATING TOAST NOTIFICATIONS CONTAINER */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className="pointer-events-auto bg-white border-l-4 border-rose-500 shadow-2xl rounded-2xl p-4 w-[340px] sm:w-[400px] flex gap-3 animate-in slide-in-from-right-8 fade-in duration-300"
          >
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div className="flex-1 pr-2 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 leading-tight truncate">{toast.title}</h4>
              <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed break-words">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} 
              className="text-slate-400 hover:text-rose-600 transition-colors shrink-0 self-start p-1 rounded-lg hover:bg-slate-100"
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
              Virtual Staffing Solutions | Staff Dashboard
            </h2>
          </div>

          <div className="relative">
            {/* 🌟 THE UNIFIED HEADER BELL */}
            <button 
              onClick={toggleNotifDropdown}
              className="relative p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm cursor-pointer"
              title="Session Alerts History"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* NOTIFICATIONS HISTORY DROPDOWN */}
            {isNotifOpen && (
              <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <History size={14} className="text-purple-600"/> Session Alerts History
                  </h3>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-white">
                  {alertHistory.length === 0 ? (
                    <div className="px-4 py-10 text-center text-slate-400 flex flex-col items-center gap-2">
                      <Bell size={24} className="opacity-20" />
                      <span className="text-xs font-medium">No alerts recorded yet.</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {alertHistory.map((notif) => {
                        const isError = (notif.title || '').toLowerCase().includes('error') || (notif.title || '').toLowerCase().includes('cancel') || (notif.title || '').toLowerCase().includes('fail');
                        
                        return (
                          <div key={notif.id} className={`p-4 hover:bg-slate-50 transition-colors group relative flex gap-3 ${isError ? 'bg-rose-50/30' : ''}`}>
                            <div className={`mt-0.5 shrink-0 ${isError ? 'text-rose-500' : 'text-orange-500'}`}>
                              <AlertTriangle size={16} />
                            </div>
                            <div className="flex-1 pr-6 min-w-0">
                              <div className="flex justify-between items-start mb-0.5">
                                <p className={`text-xs font-bold truncate ${isError ? 'text-rose-700' : 'text-slate-900'}`}>{notif.title}</p>
                                <span className="text-[9px] font-bold text-slate-400">{notif.time}</span>
                              </div>
                              <p className={`text-[11px] mt-1.5 leading-relaxed break-words ${isError ? 'font-medium text-rose-600' : 'text-slate-500'}`}>
                                {notif.message}
                              </p>
                            </div>
                            <button 
                              onClick={() => dismissHistoryAlert(notif.id)}
                              className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors p-1 bg-white border border-slate-100 rounded-md shadow-sm"
                              title="Delete from History"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8 relative custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}