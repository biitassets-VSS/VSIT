'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LogOut, ClipboardCheck, Ticket, 
  Loader2, Bell, X, CheckCircle2, AlertTriangle
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

  useEffect(() => {
    // 🟢 DYNAMIC THEME OBSERVER: Instantly syncs Navbar with Dark Mode Toggle
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    syncTheme(); // Run on mount

    // Watch for class changes on HTML tag triggered by external toggle
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

  const theme = {
    bgApp: isDarkMode ? 'bg-[#09090b]' : 'bg-[#F8FAFC]', 
    bgHeader: isDarkMode ? 'bg-[#121212]' : 'bg-white',
    border: isDarkMode ? 'border-zinc-800' : 'border-slate-200',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-800', 
    textMuted: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    hoverBg: isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50',
    dropdownBg: isDarkMode ? 'bg-[#121212]' : 'bg-white',
    dropdownHeader: isDarkMode ? 'bg-zinc-900' : 'bg-slate-50',
  };

  if (layoutCrash) return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 font-mono">
      <div className="text-center space-y-4">
        <AlertTriangle size={48} className="text-rose-500 mx-auto" />
        <p className="text-rose-400 max-w-lg">{layoutCrash}</p>
      </div>
    </div>
  );

  if (isCheckingAuth) return (
    <div className={`min-h-screen ${theme.bgApp} flex flex-col items-center justify-center`}>
      <Loader2 className="w-10 h-10 text-[#F97316] animate-spin mb-4" />
      <p className={`text-xs font-bold uppercase tracking-widest ${theme.textMuted}`}>Verifying Access...</p>
    </div>
  );

  const unreadTotal = notifications.filter(n => !n.is_read).length + liveTicketCount + liveInspCount;

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-300 ${theme.bgApp} ${theme.textMain} relative`}>
      
      {/* 🟢 TOAST NOTIFICATION POPUP */}
      {activeAlert && (
        <div className={`fixed top-20 right-6 z-[100] w-80 border shadow-2xl rounded-2xl p-5 animate-in slide-in-from-right-8 fade-in duration-300 ${theme.dropdownBg} ${theme.border}`}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse ring-4 ring-[#F97316]/20"></span>
              <h4 className="text-[11px] font-bold text-[#F97316] uppercase tracking-widest">{activeAlert.type} ALERT</h4>
            </div>
            <button onClick={() => setActiveAlert(null)} className={`${theme.textMuted} hover:${theme.textMain} transition-colors`}><X size={16}/></button>
          </div>
          <h3 className={`font-semibold text-sm ${theme.textMain}`}>{activeAlert.title}</h3>
          <p className={`text-xs mt-1 leading-relaxed ${theme.textMuted}`}>{activeAlert.message}</p>
        </div>
      )}

      {/* 🌟 FULL-WIDTH TOP HEADER BAR */}
      <header className={`h-16 flex items-center justify-between px-4 md:px-8 border-b shadow-sm shrink-0 sticky top-0 z-40 transition-colors duration-300 ${theme.bgHeader} ${theme.border}`}>
        
        {/* Top Left: Logo */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center cursor-pointer transition-transform hover:scale-105 active:scale-95">
            {/* 🔴 FILTERS REMOVED: Logo will natively render exactly as uploaded */}
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions" 
              className="h-8 w-auto object-contain" 
              onError={(e) => { e.currentTarget.style.display = 'none'; }} 
            />
          </Link>
        </div>

        {/* Top Right: Bell & Logout */}
        <div className="flex items-center gap-3 ml-auto relative">
          
          {/* Notifications Bell */}
          <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${isNotifOpen ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6]' : `${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-[#8B5CF6] hover:border-[#8B5CF6]/50' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-[#8B5CF6] hover:border-[#8B5CF6]/50'}`}`}>
              <Bell size={18} className={unreadTotal > 0 ? 'animate-pulse' : ''} />
              {unreadTotal > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F97316] text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 shadow-sm ${isDarkMode ? 'border-zinc-900' : 'border-white'}`}>
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className={`absolute top-[calc(100%+12px)] right-0 w-80 sm:w-96 rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-top-2 fade-in ${theme.dropdownBg} ${theme.border}`}>
                <div className={`p-4 border-b flex justify-between items-center shrink-0 ${theme.dropdownHeader} ${theme.border}`}>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textMain}`}>Notifications</h3>
                  {unreadTotal > 0 && <span className="text-[10px] font-bold text-[#F97316] bg-[#F97316]/10 px-2 py-0.5 rounded-md">{unreadTotal} New</span>}
                </div>
                
                <div className="overflow-y-auto custom-scrollbar flex-1">
                  {(liveTicketCount === 0 && liveInspCount === 0 && notifications.length === 0) ? (
                    <div className={`p-8 text-center space-y-2 ${theme.textMuted}`}>
                      <CheckCircle2 size={32} className="mx-auto opacity-40" />
                      <p className="text-xs font-bold uppercase tracking-widest">You're all caught up!</p>
                    </div>
                  ) : (
                    <div className={`divide-y ${isDarkMode ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                      {liveTicketCount > 0 && (
                        <Link href="/admin/tickets" onClick={() => { setIsNotifOpen(false); setLiveTicketCount(0); }} className={`block p-4 transition-colors cursor-pointer group ${isDarkMode ? 'bg-[#8B5CF6]/5 hover:bg-[#8B5CF6]/10' : 'bg-[#f3e8ff]/50 hover:bg-[#f3e8ff]'}`}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center shrink-0"><Ticket size={14}/></div>
                            <div>
                              <h4 className="text-xs font-bold text-[#8B5CF6]">New Tickets Received</h4>
                              <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>Staff members have submitted {liveTicketCount} new support ticket(s).</p>
                            </div>
                          </div>
                        </Link>
                      )}
                      {liveInspCount > 0 && (
                        <Link href="/admin/inspections" onClick={() => { setIsNotifOpen(false); setLiveInspCount(0); }} className={`block p-4 transition-colors cursor-pointer group ${isDarkMode ? 'bg-[#F97316]/5 hover:bg-[#F97316]/10' : 'bg-[#fff7ed]/50 hover:bg-[#fff7ed]'}`}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#F97316]/20 text-[#F97316] flex items-center justify-center shrink-0"><ClipboardCheck size={14}/></div>
                            <div>
                              <h4 className="text-xs font-bold text-[#F97316]">New Inspections Submitted</h4>
                              <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>There are {liveInspCount} new hardware audits awaiting your review.</p>
                            </div>
                          </div>
                        </Link>
                      )}
                      
                      {notifications.map(n => (
                        <div key={n.id} className={`p-4 transition-colors ${n.is_read ? 'opacity-50' : theme.dropdownBg} ${theme.hoverBg}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className={`text-xs font-bold ${theme.textMain}`}>{n.title}</h4>
                              <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>{n.message}</p>
                              <span className="text-[10px] text-zinc-500 mt-2 block font-medium">{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                            {!n.is_read && (
                              <button onClick={() => markAsRead(n.id)} className="w-2 h-2 bg-[#8B5CF6] rounded-full shrink-0 shadow-sm shadow-[#8B5CF6]/50 cursor-pointer hover:scale-150 transition-transform" title="Mark as read" />
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

          {/* SMART HOVER LOGOUT BUTTON */}
          <div className="relative group">
            <button 
              onClick={handleLogout}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30' : 'bg-white border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200'}`}
              title="Secure Logout"
            >
              <LogOut size={18} strokeWidth={2.5} />
            </button>

            {/* Tooltip visible strictly on hover showing Login User Email and Name */}
            <div className={`absolute right-0 top-full mt-2 hidden group-hover:flex flex-col p-3.5 rounded-2xl shadow-xl z-50 min-w-[210px] text-left border pointer-events-none animate-in fade-in zoom-in-95 duration-150 ${isDarkMode ? 'bg-[#18181b] border-zinc-800 text-white' : 'bg-slate-900 border-slate-800 text-white'}`}>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#F97316]">Logged in as</span>
              <span className="text-xs font-bold truncate mt-0.5">{adminProfile.name}</span>
              <span className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{adminProfile.email}</span>
            </div>
          </div>

        </div>
      </header>

      {/* FULL-WIDTH PAGE CONTENT INJECTION */}
      <main className={`flex-1 overflow-y-auto relative transition-colors duration-300 ${theme.bgApp}`}>
        <div className={`${theme.textMain} h-full`}>
          {children}
        </div>
      </main>

    </div>
  );
}