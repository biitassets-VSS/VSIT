'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LogOut, ClipboardCheck, Ticket, 
  Loader2, Bell, X, CheckCircle2, AlertTriangle,
  Megaphone, Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { AnimatePresence } from 'framer-motion';

interface AdminProfile {
  name: string;
  email: string;
  initials: string;
  role?: string;
}

const timeAgo = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return `Yesterday`;
  return `${days}d ago`;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); 
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [layoutCrash, setLayoutCrash] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    name: 'Loading...', email: '...', initials: 'AD', role: 'admin'
  });

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
    };
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const verifyAdmin = async () => {
      try {
        if (window.location.pathname === '/admin/login') {
          setIsCheckingAuth(false);
          return;
        }

        const rawSession = localStorage.getItem('vsit_admin_session') || 
                           localStorage.getItem('vsit_staff_session') || 
                           localStorage.getItem('user');
        
        if (!rawSession) {
          setLayoutCrash("REASON: localStorage has no login session tokens.");
          setIsCheckingAuth(false);
          return; 
        }

        let activeUser: any = {};
        try {
          activeUser = JSON.parse(rawSession);
        } catch (parseCrash) {
          if (typeof rawSession === 'string' && rawSession.includes('@')) {
            activeUser = { email: rawSession, name: rawSession.split('@')[0], role: 'admin' };
          } else {
            throw new Error(`Failed to parse session token: "${rawSession}"`);
          }
        }

        const profileName = activeUser.name || activeUser.full_name || activeUser.email?.split('@')[0] || 'Administrator';
        
        setAdminProfile({
          name: profileName,
          email: activeUser.email || 'admin@vsit.com',
          initials: profileName.substring(0, 2).toUpperCase(),
          role: activeUser.role || localStorage.getItem('portal_role') || 'admin'
        });
        
        setIsCheckingAuth(false);
      } catch (fatalError: any) {
        setLayoutCrash(fatalError.message || String(fatalError));
        setIsCheckingAuth(false);
      }
    };

    verifyAdmin();
    return () => observer.disconnect();
  }, []);

  // 🌟 REAL-TIME NOTIFICATIONS SYNC
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase.from('notifications')
        .select('*')
        .eq('target_role', 'admin')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    };

    if (!isCheckingAuth && !layoutCrash) {
      fetchNotifications();
      
      const adminChannel = supabase.channel('admin-layout-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_role=eq.admin` }, (payload) => {
           setNotifications(prev => [payload.new, ...prev].slice(0, 20));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `target_role=eq.admin` }, (payload) => {
           setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
        })
        .subscribe();
      
      return () => { supabase.removeChannel(adminChannel); };
    }
  }, [isCheckingAuth, layoutCrash]);

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.clear();
    router.replace('/');
  };

  const handleTriggerAnnouncement = () => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('open-broadcast-modal');
      window.dispatchEvent(event);
      if ((window as any).openBroadcastModal) {
        (window as any).openBroadcastModal();
      }
    }
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFF9F2]',
    glassHeader: isDarkMode 
      ? 'bg-zinc-900/30 backdrop-blur-3xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-2xl border-b border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)]',
    buttonGlass: isDarkMode
      ? 'bg-white/5 backdrop-blur-xl border border-white/10 text-zinc-300 hover:bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all'
      : 'bg-white/40 backdrop-blur-xl border border-white/60 text-slate-700 hover:bg-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.02)] transition-all',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-800', 
    textMuted: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  if (pathname === '/admin/login') {
    return <div className={`min-h-screen transition-colors duration-1000 ${theme.bg}`}>{children}</div>;
  }

  if (layoutCrash) return (
    <div className={`flex-1 ${theme.bg} flex items-center justify-center p-6 font-sans z-50 transition-colors duration-1000`}><AlertTriangle size={48} className="text-rose-500" /></div>
  );

  if (isCheckingAuth) return (
    <div className={`flex-1 flex flex-col items-center justify-center z-50 transition-colors duration-1000 ${theme.bg}`}><Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" /></div>
  );

  const isHRPortal = pathname.includes('hr-analytics');

  return (
    <div className={`flex-1 flex flex-col relative w-full min-h-screen transition-colors duration-1000 ${theme.bg}`}>
      
      <div className="fixed top-[-5%] left-[-5%] w-[45vw] h-[45vh] bg-orange-500/20 dark:bg-orange-600/10 blur-[120px] rounded-full pointer-events-none z-0 transition-all duration-1000" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[45vw] h-[45vh] bg-purple-500/20 dark:bg-purple-700/10 blur-[120px] rounded-full pointer-events-none z-0 transition-all duration-1000" />

      <header className={`h-20 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-40 transition-colors duration-500 ${theme.glassHeader}`}>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center cursor-pointer transition-transform duration-300 hover:scale-[1.03] active:scale-95">
            <img src="/logo.png" alt="Logo" className="h-10 sm:h-12 w-auto object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 ml-auto relative">
          
          {!isHRPortal && adminProfile.role !== 'hr_admin' && (
            <>
              <button 
                onClick={handleTriggerAnnouncement}
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.4)] cursor-pointer active:scale-95 border border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all"
              >
                <Megaphone size={16} /> <span>Announcement</span>
              </button>
              <Link href="/admin/settings" className={`hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest cursor-pointer active:scale-95 ${theme.buttonGlass}`}>
                <Settings size={16} /> <span>Settings</span>
              </Link>
            </>
          )}

          {/* 🌟 NOTIFICATIONS BELL */}
          <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)} 
              className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 ${isNotifOpen ? 'bg-orange-500/10 border border-orange-500/50 text-orange-600 shadow-inner' : theme.buttonGlass}`}
            >
              <Bell size={18} strokeWidth={2.5} className={unreadCount > 0 ? 'animate-pulse text-orange-500' : ''} />
              
              {/* 🌟 FIXED BADGE COLOR: Orange Gradient instead of harsh Red/Black */}
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-gradient-to-tr from-orange-500 to-purple-600 text-white text-[10px] font-black rounded-full border border-white/40 shadow-[0_2px_8px_rgba(249,115,22,0.6)] z-10">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <div className={`absolute top-14 right-0 w-80 sm:w-96 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col z-50 backdrop-blur-3xl border ${isDarkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white/60 border-white/80'}`}>
                  <div className="p-5 border-b border-white/20 bg-white/40 flex justify-between items-center">
                    <h3 className={`text-xs font-black uppercase tracking-widest ${theme.textMain}`}>Alerts & Updates</h3>
                    <button 
                      onClick={async () => {
                        // Gather IDs so the update firmly writes to the DB without silently failing on RLS scopes
                        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
                        if (unreadIds.length > 0) {
                          const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
                          if (!error) {
                            setNotifications(prev => prev.map(n => ({...n, is_read: true})));
                          }
                        }
                      }} 
                      className="text-[9px] font-bold text-orange-600 uppercase tracking-widest cursor-pointer hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar flex flex-col bg-white/20">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs font-semibold text-slate-500">No recent alerts.</div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-5 border-b border-white/20 transition-all hover:bg-white/50 cursor-pointer ${notif.is_read ? 'opacity-60' : 'bg-orange-50/40'}`} onClick={async () => {
                           if (!notif.is_read) {
                             const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
                             if (!error) {
                               setNotifications(prev => prev.map(n => n.id === notif.id ? {...n, is_read: true} : n));
                             }
                           }
                        }}>
                          <div className="flex justify-between items-start mb-1.5">
                            <span className={`text-[11px] font-bold uppercase tracking-widest ${notif.is_read ? theme.textMain : 'text-orange-600'}`}>{notif.title}</span>
                            {!notif.is_read && <span className="w-2 h-2 rounded-full bg-orange-500 mt-1 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />}
                          </div>
                          <p className={`text-[13px] font-medium leading-snug ${theme.textMuted}`}>{notif.message}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-2.5 uppercase tracking-widest">{timeAgo(notif.created_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative group/logout flex items-center">
            <button onClick={handleLogout} className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] border ${isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' : 'bg-white/40 border-white/60 text-rose-600 hover:bg-rose-50 backdrop-blur-md hover:border-rose-200'}`}>
              <LogOut size={18} strokeWidth={2.5} className="translate-x-px" />
            </button>
            
            <div className={`absolute top-full right-0 mt-3 p-4 rounded-3xl w-64 opacity-0 invisible group-hover/logout:opacity-100 group-hover/logout:visible transition-all duration-300 transform origin-top-right scale-95 group-hover/logout:scale-100 shadow-[0_12px_40px_rgba(0,0,0,0.15)] border ${isDarkMode ? 'bg-zinc-900/90 border-white/10' : 'bg-white/80 backdrop-blur-2xl border-white/60'} z-50`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-purple-600 flex items-center justify-center text-white text-lg font-black shadow-md shrink-0">
                  {adminProfile.initials}
                </div>
                <div className="min-w-0">
                  <p className={`text-[13px] font-black uppercase tracking-widest truncate ${theme.textMain}`}>{adminProfile.name}</p>
                  <p className={`text-[10px] font-bold truncate mt-0.5 ${theme.textMuted}`}>{adminProfile.email}</p>
                </div>
              </div>
              <div className={`w-full border-t my-3 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}></div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center flex items-center justify-center gap-1.5"><LogOut size={14} strokeWidth={2.5}/> Click to Log Out</p>
            </div>
          </div>

        </div>
      </header>

      <main className="flex-1 w-full max-w-screen-2xl mx-auto relative z-10 overflow-x-hidden p-3 sm:p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}