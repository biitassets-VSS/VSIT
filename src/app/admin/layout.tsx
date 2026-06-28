'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, PackageSearch, Settings, 
  LogOut, Menu, X, ClipboardCheck, BarChart3, Ticket, 
  Loader2, Bell, ChevronDown, AlertTriangle, CheckCircle2 
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
  
  // 🚨 THE ANTI-BOUNCE SCREEN FREEZER
  const [layoutCrash, setLayoutCrash] = useState<string | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any>(null);
  
  // Direct Table Counters
  const [liveTicketCount, setLiveTicketCount] = useState(0);
  const [liveInspCount, setLiveInspCount] = useState(0);
  
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    name: 'Loading...', email: '...', initials: 'AD'
  });

  useEffect(() => {
    let notifChannel: any;
    let ticketChannel: any;
    let inspChannel: any;

    const verifyAdmin = async () => {
      try {
        const rawSession = localStorage.getItem('vsit_admin_session') || 
                           localStorage.getItem('vsit_staff_session') || 
                           localStorage.getItem('user');
        
        // 🌟 FIX: Hard redirect if no session is found, preventing the loading trap!
        if (!rawSession) {
          window.location.href = '/';
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

        // 🚀 1. LISTEN TO NOTIFICATIONS TABLE (Legacy support)
        try {
          notifChannel = supabase.channel(`admin_notifs_${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: "target_role=eq.admin" }, (payload) => {
              const newNotif = payload.new;
              setNotifications(current => [newNotif, ...current]);
              triggerPopup(newNotif.title, newNotif.message, 'System');
            }).subscribe();
        } catch (e) {}

        // 🚀 2. DIRECT TICKET LISTENER
        try {
          ticketChannel = supabase.channel(`admin_tickets_${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
              setLiveTicketCount(prev => prev + 1);
              triggerPopup('New Ticket Raised', `A staff member submitted: ${payload.new.title}`, 'Ticket');
            }).subscribe();
        } catch (e) {}

        // 🚀 3. DIRECT INSPECTION LISTENER
        try {
          inspChannel = supabase.channel(`admin_inspections_${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inspections' }, () => {
              setLiveInspCount(prev => prev + 1);
              triggerPopup('Compliance Alert', 'A new hardware inspection was submitted for review.', 'Inspection');
            }).subscribe();
        } catch (e) {}

      } catch (fatalError: any) {
        console.error("Layout Crashed:", fatalError);
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

  // 🌟 FIX: Using window.location.href ensures Next.js dumps cache and unmounts the layout safely.
  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.clear();
    window.location.href = '/'; 
  };

  // 🚨 TRAP DISPLAY 
  if (layoutCrash) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-mono">
        <div className="max-w-xl w-full bg-red-500/10 border-2 border-red-500 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-3 text-red-500 font-bold text-lg">
            <AlertTriangle size={24} className="animate-bounce" />
            <span>ADMIN LAYOUT CRASH INTERCEPTED</span>
          </div>
          <p className="text-xs text-slate-300">The code tried to kick you back to `/login`. The screen-freezer caught this exact error:</p>
          <div className="p-4 bg-black/80 rounded-xl text-red-400 font-bold text-xs break-all">
            {layoutCrash}
          </div>
          <p className="text-[11px] text-slate-400">Copy the text inside the black box and send it to your AI assistant.</p>
        </div>
      </div>
    );
  }

  if (isCheckingAuth) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  const unreadTotal = notifications.filter(n => !n.is_read).length + liveTicketCount + liveInspCount;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 relative">
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm" />}

      {/* 🚀 LIVE POPUP TOAST */}
      {activeAlert && (
        <div className="fixed top-24 right-6 z-[100] w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ring-4 ring-blue-500/20"></span>
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{activeAlert.type} ALERT</h4>
            </div>
            <button onClick={() => setActiveAlert(null)} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={16}/></button>
          </div>
          <h3 className="font-black text-slate-900 text-sm">{activeAlert.title}</h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">{activeAlert.message}</p>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-slate-200 shadow-sm z-50 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {[
            { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
            { name: 'Staff / Users', href: '/admin/staff', icon: Users },
            { name: 'Asset Inventory', href: '/admin/assets', icon: PackageSearch },
            { name: 'Inspections', href: '/admin/inspections', icon: ClipboardCheck, badge: liveInspCount },
            { name: 'Tickets', href: '/admin/tickets', icon: Ticket, badge: liveTicketCount }, 
            { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
            { name: 'Settings', href: '/admin/settings', icon: Settings },
          ].map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
            return (
              <Link key={link.name} href={link.href} onClick={() => { setIsMobileMenuOpen(false); if(link.name === 'Tickets') setLiveTicketCount(0); if(link.name === 'Inspections') setLiveInspCount(0); }} className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${isActive ? 'bg-orange-50/50 text-orange-600 shadow-sm border border-orange-200/50' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-orange-500' : 'text-slate-400'} /> {link.name}
                </div>
                {link.badge && link.badge > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">{link.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 relative shrink-0 bg-slate-50/50">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-full flex items-center justify-between p-2 rounded-2xl transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-sm">{adminProfile.initials}</div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-black text-slate-900 truncate">{adminProfile.name}</p>
                <p className="text-[10px] font-bold tracking-wider uppercase text-orange-600 truncate">Administrator</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isProfileOpen && (
            <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in slide-in-from-bottom-2 fade-in">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 cursor-pointer transition-colors"><LogOut size={16} /> Secure Logout</button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between lg:justify-end px-6 shadow-sm shrink-0 relative z-40">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-500 hover:bg-orange-50 hover:text-orange-600 rounded-lg lg:hidden cursor-pointer transition-colors"><Menu size={24} /></button>

          <div className="flex items-center gap-4 ml-auto relative">
            
            {/* 🔔 THE BELL DROPDOWN TRAY */}
            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative p-3 rounded-2xl border transition-colors cursor-pointer ${isNotifOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'}`}>
                <Bell size={20} className={unreadTotal > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''} />
                {unreadTotal > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-sm">{unreadTotal > 9 ? '9+' : unreadTotal}</span>}
              </button>

              {isNotifOpen && (
                <div className="absolute top-[calc(100%+12px)] right-0 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-top-2 fade-in">
                  <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Notifications</h3>
                    {unreadTotal > 0 && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">{unreadTotal} New</span>}
                  </div>
                  
                  <div className="overflow-y-auto custom-scrollbar flex-1">
                    {(liveTicketCount === 0 && liveInspCount === 0 && notifications.length === 0) ? (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <CheckCircle2 size={32} className="mx-auto text-slate-300" />
                        <p className="text-xs font-bold uppercase tracking-widest">You're all caught up!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {/* Live Injectors */}
                        {liveTicketCount > 0 && (
                          <Link href="/admin/tickets" onClick={() => { setIsNotifOpen(false); setLiveTicketCount(0); }} className="block p-4 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer group">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Ticket size={14}/></div>
                              <div>
                                <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-700">New Tickets Received</h4>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Staff members have submitted {liveTicketCount} new support ticket(s).</p>
                              </div>
                            </div>
                          </Link>
                        )}
                        {liveInspCount > 0 && (
                          <Link href="/admin/inspections" onClick={() => { setIsNotifOpen(false); setLiveInspCount(0); }} className="block p-4 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer group">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><ClipboardCheck size={14}/></div>
                              <div>
                                <h4 className="text-xs font-black text-slate-900 group-hover:text-amber-700">New Inspections Submitted</h4>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">There are {liveInspCount} new hardware audits awaiting your review.</p>
                              </div>
                            </div>
                          </Link>
                        )}
                        
                        {/* Database Notifications */}
                        {notifications.map(n => (
                          <div key={n.id} className={`p-4 transition-colors hover:bg-slate-50 ${n.is_read ? 'opacity-60' : 'bg-white'}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="text-xs font-black text-slate-900">{n.title}</h4>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{n.message}</p>
                                <span className="text-[9px] font-bold text-slate-400 mt-2 block">{new Date(n.created_at).toLocaleString()}</span>
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
        <main className="flex-1 overflow-y-auto relative bg-[#F8FAFC]">
          {children}
        </main>
      </div>

    </div>
  );
}