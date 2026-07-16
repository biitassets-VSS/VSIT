'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, PackageSearch, Settings, 
  LogOut, Menu, X, ClipboardCheck, BarChart3, Ticket, 
  Loader2, Bell, ChevronDown, AlertTriangle, CheckCircle2,
  Moon, Sun
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AdminProfile {
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
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') setIsDarkMode(true);

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
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (ticketChannel) supabase.removeChannel(ticketChannel);
      if (inspChannel) supabase.removeChannel(inspChannel);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('vsit_theme', newTheme ? 'dark' : 'light');
  };

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

  // 🖤 CARBON BLACK & CRISP WHITE THEME PALETTE
  const theme = {
    bgApp: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-slate-50', 
    bgSidebar: isDarkMode ? 'bg-[#121212]' : 'bg-white',
    bgHeader: isDarkMode ? 'bg-[#121212]/90' : 'bg-white/90',
    border: isDarkMode ? 'border-[#27272a]' : 'border-slate-200',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-800', 
    textMuted: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    hoverBg: isDarkMode ? 'hover:bg-[#1e1e24]' : 'hover:bg-slate-50',
    dropdownBg: isDarkMode ? 'bg-[#18181b]' : 'bg-white',
    dropdownHeader: isDarkMode ? 'bg-[#121212]' : 'bg-slate-50',
    activeLinkBg: isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50/80 border-orange-200/50',
  };

  if (layoutCrash) return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 font-mono"><p className="text-red-400 max-w-lg">{layoutCrash}</p></div>
  );

  if (isCheckingAuth) return <div className={`min-h-screen ${theme.bgApp} flex items-center justify-center`}><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const unreadTotal = notifications.filter(n => !n.is_read).length + liveTicketCount + liveInspCount;

  return (
    <div className={`min-h-screen flex font-sans antialiased transition-colors duration-500 ${theme.bgApp} ${theme.textMain} relative`}>
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" />}

      {/* 🚀 LIVE POPUP TOAST */}
      {activeAlert && (
        <div className={`fixed top-20 right-6 z-[100] w-80 border shadow-2xl rounded-2xl p-5 animate-in slide-in-from-right-8 fade-in duration-300 ${theme.dropdownBg} ${theme.border}`}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ring-4 ring-blue-500/20"></span>
              <h4 className="text-[11px] font-bold text-blue-500 uppercase tracking-widest">{activeAlert.type} ALERT</h4>
            </div>
            <button onClick={() => setActiveAlert(null)} className={`${theme.textMuted} hover:${theme.textMain} transition-colors`}><X size={16}/></button>
          </div>
          <h3 className={`font-semibold text-sm ${theme.textMain}`}>{activeAlert.title}</h3>
          <p className={`text-xs mt-1 leading-relaxed ${theme.textMuted}`}>{activeAlert.message}</p>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 border-r shadow-sm z-50 flex flex-col transition-transform duration-300 ${theme.bgSidebar} ${theme.border} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className={`h-16 flex items-center justify-between px-6 border-b shrink-0 ${theme.border}`}>
          <img src="/logo.png" alt="Logo" className={`h-8 w-auto object-contain ${isDarkMode ? 'brightness-200 grayscale-[20%]' : ''}`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <button onClick={() => setIsMobileMenuOpen(false)} className={`lg:hidden p-2 rounded-full ${theme.textMuted} ${theme.hoverBg}`}><X size={20} /></button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
            { name: 'Staff / Users', href: '/admin/staff', icon: Users },
            { name: 'Asset Inventory', href: '/admin/assets', icon: PackageSearch },
            { name: 'Inspections', href: '/admin/inspections', icon: ClipboardCheck, badge: liveInspCount },
            { name: 'Return Requests', href: '/admin/returns', icon: LogOut },
            { name: 'Tickets', href: '/admin/tickets', icon: Ticket, badge: liveTicketCount }, 
            { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
            { name: 'Settings', href: '/admin/settings', icon: Settings },
          ].map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
            return (
              <Link key={link.name} href={link.href} onClick={() => { setIsMobileMenuOpen(false); if(link.name === 'Tickets') setLiveTicketCount(0); if(link.name === 'Inspections') setLiveInspCount(0); }} 
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-[13px] border ${isActive ? `${theme.activeLinkBg} text-orange-500` : `border-transparent ${theme.textMuted} ${theme.hoverBg} hover:${theme.textMain}`}`}>
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-orange-500' : theme.textMuted} /> {link.name}
                </div>
                {link.badge && link.badge > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">{link.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t relative shrink-0 ${theme.border} ${theme.dropdownHeader}`}>
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`w-full flex items-center justify-between p-2 rounded-xl transition-all border border-transparent ${theme.hoverBg}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">{adminProfile.initials}</div>
              <div className="text-left overflow-hidden">
                <p className={`text-sm font-semibold truncate ${theme.textMain}`}>{adminProfile.name}</p>
                <p className="text-[11px] font-medium tracking-wide uppercase text-orange-500 truncate">Administrator</p>
              </div>
            </div>
            <ChevronDown size={16} className={`${theme.textMuted} shrink-0 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isProfileOpen && (
            <div className={`absolute bottom-[calc(100%+8px)] left-4 right-4 rounded-xl shadow-xl border p-2 z-50 animate-in slide-in-from-bottom-2 fade-in ${theme.dropdownBg} ${theme.border}`}>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"><LogOut size={16} /> Secure Logout</button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* TOP HEADER */}
        <header className={`h-16 backdrop-blur-md border-b flex items-center justify-between lg:justify-end px-6 shadow-sm shrink-0 relative z-40 transition-colors duration-500 ${theme.bgHeader} ${theme.border}`}>
          <button onClick={() => setIsMobileMenuOpen(true)} className={`p-2 rounded-lg lg:hidden cursor-pointer transition-colors ${theme.textMuted} ${theme.hoverBg}`}><Menu size={24} /></button>

          <div className="flex items-center gap-4 ml-auto relative">
            
            {/* 🌙 Theme Toggle Button */}
            <button onClick={toggleTheme} className={`p-2 rounded-xl border shadow-sm transition-all duration-300 cursor-pointer ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-amber-400 hover:bg-[#27272a]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} title="Toggle Dark Mode">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            {/* 🔔 THE BELL DROPDOWN TRAY */}
            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative p-2.5 rounded-xl border transition-colors cursor-pointer ${isNotifOpen ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : `${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:bg-[#27272a]' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'}`}`}>
                <Bell size={20} className={unreadTotal > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''} />
                {unreadTotal > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">{unreadTotal > 9 ? '9+' : unreadTotal}</span>}
              </button>

              {isNotifOpen && (
                <div className={`absolute top-[calc(100%+12px)] right-0 w-80 sm:w-96 rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-top-2 fade-in ${theme.dropdownBg} ${theme.border}`}>
                  <div className={`p-4 border-b flex justify-between items-center shrink-0 ${theme.dropdownHeader} ${theme.border}`}>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme.textMain}`}>Notifications</h3>
                    {unreadTotal > 0 && <span className="text-[10px] font-medium text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">{unreadTotal} New</span>}
                  </div>
                  
                  <div className="overflow-y-auto custom-scrollbar flex-1">
                    {(liveTicketCount === 0 && liveInspCount === 0 && notifications.length === 0) ? (
                      <div className={`p-8 text-center space-y-2 ${theme.textMuted}`}>
                        <CheckCircle2 size={32} className="mx-auto opacity-40" />
                        <p className="text-xs font-medium uppercase tracking-widest">You're all caught up!</p>
                      </div>
                    ) : (
                      <div className={`divide-y ${isDarkMode ? 'divide-[#27272a]' : 'divide-slate-100'}`}>
                        {liveTicketCount > 0 && (
                          <Link href="/admin/tickets" onClick={() => { setIsNotifOpen(false); setLiveTicketCount(0); }} className={`block p-4 transition-colors cursor-pointer group ${isDarkMode ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-blue-50/50 hover:bg-blue-50'}`}>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0"><Ticket size={14}/></div>
                              <div>
                                <h4 className="text-xs font-semibold text-blue-500">New Tickets Received</h4>
                                <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>Staff members have submitted {liveTicketCount} new support ticket(s).</p>
                              </div>
                            </div>
                          </Link>
                        )}
                        {liveInspCount > 0 && (
                          <Link href="/admin/inspections" onClick={() => { setIsNotifOpen(false); setLiveInspCount(0); }} className={`block p-4 transition-colors cursor-pointer group ${isDarkMode ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'bg-amber-50/50 hover:bg-amber-50'}`}>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0"><ClipboardCheck size={14}/></div>
                              <div>
                                <h4 className="text-xs font-semibold text-amber-500">New Inspections Submitted</h4>
                                <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>There are {liveInspCount} new hardware audits awaiting your review.</p>
                              </div>
                            </div>
                          </Link>
                        )}
                        
                        {notifications.map(n => (
                          <div key={n.id} className={`p-4 transition-colors ${n.is_read ? 'opacity-50' : theme.dropdownBg} ${theme.hoverBg}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className={`text-xs font-semibold ${theme.textMain}`}>{n.title}</h4>
                                <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>{n.message}</p>
                                <span className="text-[10px] text-zinc-500 mt-2 block">{new Date(n.created_at).toLocaleString()}</span>
                              </div>
                              {!n.is_read && (
                                <button onClick={() => markAsRead(n.id)} className="w-2 h-2 bg-blue-500 rounded-full shrink-0 shadow-sm shadow-blue-500/50 cursor-pointer hover:scale-150 transition-transform" title="Mark as read" />
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

          </div>
        </header>

        {/* PAGE INJECTION */}
        <main className={`flex-1 overflow-y-auto relative transition-colors duration-500 ${theme.bgApp}`}>
          <div className={`${theme.textMain} h-full`}>
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}