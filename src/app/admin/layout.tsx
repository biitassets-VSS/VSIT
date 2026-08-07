'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LogOut, ClipboardCheck, Ticket, 
  Loader2, Bell, X, CheckCircle2, AlertTriangle,
  Megaphone, Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AdminProfile {
  name: string;
  email: string;
  initials: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [layoutCrash, setLayoutCrash] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any>(null);
  
  const [liveTicketCount, setLiveTicketCount] = useState(0);
  const [liveInspCount, setLiveInspCount] = useState(0);
  
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    name: 'Loading...', email: '...', initials: 'AD'
  });

  // 🌟 AUTOMATIC THEME SYNCHRONIZATION (No manual toggle button needed)
  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
    };
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    let notifChannel: any;
    let ticketChannel: any;
    let inspChannel: any;

    const verifyAdmin = async () => {
      try {
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
          initials: profileName.substring(0, 2).toUpperCase()
        });
        
        setIsCheckingAuth(false);
        fetchNotifications();

        try {
          notifChannel = supabase.channel(`admin_notifs_${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: "target_role=eq.admin" }, (payload) => {
              const newNotif = payload.new;
              setNotifications(current => [newNotif, ...current]);
              triggerPopup(newNotif.title, newNotif.message, 'System');
            }).subscribe();
        } catch (e) {}

        try {
          ticketChannel = supabase.channel(`admin_tickets_${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
              setLiveTicketCount(prev => prev + 1);
              triggerPopup('New Ticket Raised', `A staff member submitted: ${payload.new.title}`, 'Ticket');
            }).subscribe();
        } catch (e) {}

        try {
          inspChannel = supabase.channel(`admin_inspections_${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inspections' }, () => {
              setLiveInspCount(prev => prev + 1);
              triggerPopup('Compliance Alert', 'A new hardware inspection was submitted for review.', 'Inspection');
            }).subscribe();
        } catch (e) {}

      } catch (fatalError: any) {
        setLayoutCrash(fatalError.message || String(fatalError));
        setIsCheckingAuth(false);
      }
    };

    verifyAdmin();

    return () => {
      observer.disconnect();
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (ticketChannel) supabase.removeChannel(ticketChannel);
      if (inspChannel) supabase.removeChannel(inspChannel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase.from('notifications').select('*').eq('target_role', 'admin').order('created_at', { ascending: false }).limit(40);
      if (data) setNotifications(data);
    } catch(e) {}
  };

  const triggerPopup = (title: string, message: string, type: string) => {
    setActiveAlert({ title, message, type });
    setTimeout(() => setActiveAlert(null), 6000); 
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(current => current.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.clear();
    router.replace('/');
  };

  // 🌟 MAC OS 2026 PREMIUM GLASS THEME DICTIONARY
  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFF9F2]',
    glassHeader: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border-b border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-[40px] backdrop-saturate-[1.5] border-b border-white/70 shadow-[0_16px_40px_rgba(31,38,135,0.05)]',
    glassPanel: isDarkMode 
      ? 'bg-zinc-900/85 backdrop-blur-3xl border border-zinc-700/80 shadow-2xl shadow-black' 
      : 'bg-white/85 backdrop-blur-3xl border border-slate-200/90 shadow-2xl shadow-slate-300/50',
    buttonGlass: isDarkMode
      ? 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/80'
      : 'bg-white/60 border border-slate-200 text-slate-700 hover:bg-white',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-800', 
    textMuted: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    hoverBg: isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50',
  };

  if (layoutCrash) return (
    <div className={`flex-1 ${theme.bg} flex items-center justify-center p-6 font-sans z-50 transition-colors duration-1000`}>
      <div className="text-center space-y-4">
        <AlertTriangle size={48} className="text-rose-500 mx-auto" />
        <p className="text-rose-500 font-semibold max-w-lg">{layoutCrash}</p>
      </div>
    </div>
  );

  if (isCheckingAuth) return (
    <div className={`flex-1 flex flex-col items-center justify-center z-50 transition-colors duration-1000 ${theme.bg}`}>
      <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
      <p className={`text-xs font-bold uppercase tracking-widest ${theme.textMuted}`}>Verifying Access...</p>
    </div>
  );

  const unreadTotal = notifications.filter(n => !n.is_read).length + liveTicketCount + liveInspCount;

  return (
    <div className={`flex-1 flex flex-col relative w-full min-h-screen transition-colors duration-1000 ${theme.bg}`}>
      
      {/* 🌟 GLOBAL BACKGROUND ORBS (Handles entire app background glow) */}
      <div className="fixed top-[-5%] left-[-5%] w-[45vw] h-[45vh] bg-orange-500/20 dark:bg-orange-600/10 blur-[120px] rounded-full pointer-events-none z-0 transition-all duration-1000" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[45vw] h-[45vh] bg-purple-500/20 dark:bg-purple-700/10 blur-[120px] rounded-full pointer-events-none z-0 transition-all duration-1000" />

      {/* 🟢 TOAST NOTIFICATION POPUP (Glass Design) */}
      {activeAlert && (
        <div className={`fixed top-20 right-6 z-100 w-80 rounded-2xl p-5 animate-in slide-in-from-right-8 fade-in duration-300 ${theme.glassPanel}`}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse ring-4 ring-orange-500/20"></span>
              <h4 className="text-[11px] font-bold text-orange-500 uppercase tracking-widest">{activeAlert.type} ALERT</h4>
            </div>
            <button onClick={() => setActiveAlert(null)} className={`${theme.textMuted} hover:${theme.textMain} transition-colors cursor-pointer`}><X size={16}/></button>
          </div>
          <h3 className={`font-semibold text-sm ${theme.textMain}`}>{activeAlert.title}</h3>
          <p className={`text-xs mt-1.5 leading-relaxed font-medium ${theme.textMuted}`}>{activeAlert.message}</p>
        </div>
      )}

      {/* 🌟 FULL-WIDTH TOP HEADER BAR (FROSTED GLASS) */}
      <header className={`h-16 sm:h-20 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-40 transition-colors duration-500 ${theme.glassHeader}`}>
        
        {/* Top Left: Logo */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center cursor-pointer transition-transform hover:scale-105 active:scale-95">
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions" 
              className="h-8 sm:h-10 w-auto object-contain drop-shadow-sm" 
              onError={(e) => { e.currentTarget.style.display = 'none'; }} 
            />
          </Link>
        </div>

        {/* Top Right: Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 ml-auto relative">
          
          <button 
            onClick={() => window.dispatchEvent(new Event('open-broadcast-modal'))}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all duration-200 cursor-pointer active:scale-95 border border-orange-400"
            title="Broadcast Announcement to Staff"
          >
            <Megaphone size={16} className="shrink-0" />
            <span>Announcement</span>
          </button>

          <Link 
            href="/admin/settings"
            className={`hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${theme.buttonGlass}`}
            title="System Settings"
          >
            <Settings size={16} className="shrink-0" />
            <span>Settings</span>
          </Link>

          {/* Notifications Bell */}
          <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative p-2.5 rounded-xl transition-all cursor-pointer ${isNotifOpen ? 'bg-purple-500/10 border-purple-500/30 text-purple-500' : theme.buttonGlass}`}>
              <Bell size={18} className={unreadTotal > 0 ? 'animate-pulse' : ''} />
              {unreadTotal > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border shadow-sm ${isDarkMode ? 'border-zinc-900' : 'border-white'}`}>
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </button>

            {/* Notification Dropdown (Glass Panel) */}
            {isNotifOpen && (
              <div className={`absolute top-[calc(100%+12px)] right-0 w-80 sm:w-96 rounded-3xl overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-top-2 fade-in ${theme.glassPanel}`}>
                <div className={`p-4 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200/60 bg-slate-50/50'}`}>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textMain}`}>Notifications</h3>
                  {unreadTotal > 0 && <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">{unreadTotal} New</span>}
                </div>
                
                <div className="overflow-y-auto custom-scrollbar flex-1">
                  {(liveTicketCount === 0 && liveInspCount === 0 && notifications.length === 0) ? (
                    <div className={`p-8 text-center space-y-2 ${theme.textMuted}`}>
                      <CheckCircle2 size={32} className="mx-auto opacity-40" />
                      <p className="text-xs font-bold uppercase tracking-widest">You're all caught up!</p>
                    </div>
                  ) : (
                    <div className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200/50'}`}>
                      {liveTicketCount > 0 && (
                        <Link href="/admin/tickets" onClick={() => { setIsNotifOpen(false); setLiveTicketCount(0); }} className={`block p-4 transition-colors cursor-pointer group ${isDarkMode ? 'bg-purple-500/5 hover:bg-purple-500/10' : 'bg-purple-50/50 hover:bg-purple-50'}`}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-500 flex items-center justify-center shrink-0"><Ticket size={14}/></div>
                            <div>
                              <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400">New Tickets Received</h4>
                              <p className={`text-[11px] font-medium mt-0.5 ${theme.textMuted}`}>Staff members have submitted {liveTicketCount} new support ticket(s).</p>
                            </div>
                          </div>
                        </Link>
                      )}
                      {liveInspCount > 0 && (
                        <Link href="/admin/inspections" onClick={() => { setIsNotifOpen(false); setLiveInspCount(0); }} className={`block p-4 transition-colors cursor-pointer group ${isDarkMode ? 'bg-orange-500/5 hover:bg-orange-500/10' : 'bg-orange-50/50 hover:bg-orange-50'}`}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-500 flex items-center justify-center shrink-0"><ClipboardCheck size={14}/></div>
                            <div>
                              <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400">New Inspections Submitted</h4>
                              <p className={`text-[11px] font-medium mt-0.5 ${theme.textMuted}`}>There are {liveInspCount} new hardware audits awaiting your review.</p>
                            </div>
                          </div>
                        </Link>
                      )}
                      
                      {notifications.map(n => (
                        <div key={n.id} className={`p-4 transition-colors ${n.is_read ? 'opacity-50' : ''} ${theme.hoverBg}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className={`text-xs font-bold ${theme.textMain}`}>{n.title}</h4>
                              <p className={`text-[11px] font-medium mt-0.5 ${theme.textMuted}`}>{n.message}</p>
                              <span className={`text-[10px] font-semibold mt-2 block ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                            {!n.is_read && (
                              <button onClick={() => markAsRead(n.id)} className="w-2.5 h-2.5 bg-purple-500 rounded-full shrink-0 shadow-sm shadow-purple-500/50 cursor-pointer hover:scale-150 transition-transform" title="Mark as read" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logout Button (Icon only with Tooltip) */}
          <div className="relative group">
            <button 
              onClick={handleLogout}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border ${isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 shadow-sm'}`}
              title="Secure Logout"
            >
              <LogOut size={18} className="translate-x-px" />
            </button>

            {/* Tooltip visible strictly on hover showing Login User Email and Name */}
            <div className={`absolute right-0 top-full mt-2 hidden group-hover:flex flex-col p-4 rounded-2xl shadow-xl z-50 min-w-50 text-left border pointer-events-none animate-in fade-in zoom-in-95 duration-150 ${theme.glassPanel}`}>
              <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500 mb-1">Logged in as</span>
              <span className={`text-sm font-bold truncate ${theme.textMain}`}>{adminProfile.name}</span>
              <span className={`text-xs font-medium truncate mt-0.5 ${theme.textMuted}`}>{adminProfile.email}</span>
            </div>
          </div>

        </div>
      </header>

      {/* 🌟 MAIN CONTENT INJECTION */}
      <main className="flex-1 w-full max-w-400 mx-auto relative z-10 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {children}
      </main>

    </div>
  );
}