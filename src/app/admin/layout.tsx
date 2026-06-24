'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, PackageSearch, Settings, 
  LogOut, Menu, X, ClipboardCheck, BarChart3, Ticket, Loader2, Bell, ChevronDown, AlertTriangle 
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

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any>(null);
  
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    name: 'Loading...', email: '...', initials: 'AD'
  });

  useEffect(() => {
    let activeChannel: any;

    const verifyAdmin = async () => {
      try {
        const rawSession = localStorage.getItem('vsit_admin_session') || 
                           localStorage.getItem('vsit_staff_session') || 
                           localStorage.getItem('user');
        
        if (!rawSession) {
          setLayoutCrash("REASON: localStorage has no login session tokens. Available browser keys: " + Object.keys(localStorage).join(', '));
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

        // Math.random() completely breaks Supabase real-time cache collisions
        try {
          activeChannel = supabase
            .channel(`admin_notifs_${Math.random()}`)
            .on('postgres_changes', { 
              event: 'INSERT', schema: 'public', table: 'notifications', filter: "target_role=eq.admin" 
            }, (payload) => {
              const newNotif = payload.new;
              setNotifications(current => [newNotif, ...current]);
              setActiveAlert(newNotif);
              setTimeout(() => setActiveAlert(null), 5000);
            })
            .subscribe();
        } catch (channelErr) {
          console.warn("Realtime channel skipped:", channelErr);
        }

      } catch (fatalError: any) {
        console.error("Layout Crashed:", fatalError);
        setLayoutCrash(fatalError.message || String(fatalError));
        setIsCheckingAuth(false);
      }
    };

    verifyAdmin();

    return () => {
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('target_role', 'admin').order('created_at', { ascending: false }).limit(40);
    if (data) setNotifications(data);
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

  if (isCheckingAuth) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  const unreadTotal = notifications.filter(n => !n.is_read).length;
  const unreadTickets = notifications.filter(n => !n.is_read && n.type?.toLowerCase() === 'ticket').length;
  const unreadInspections = notifications.filter(n => !n.is_read && n.type?.toLowerCase() === 'inspection').length;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans relative">
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-gray-900/60 z-40 lg:hidden backdrop-blur-sm" />}

      {activeAlert && (
        <div className="fixed top-6 right-6 z-[100] w-80 bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <h4 className="text-xs font-black text-orange-600 uppercase tracking-wider">{activeAlert.type}</h4>
            </div>
            <button onClick={() => setActiveAlert(null)} className="text-gray-400 hover:text-gray-800"><X size={16}/></button>
          </div>
          <h3 className="font-bold text-gray-900 text-sm mt-1">{activeAlert.title}</h3>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{activeAlert.message}</p>
        </div>
      )}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-100 shadow-sm z-50 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-50 shrink-0">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {[
            { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
            { name: 'Staff / Users', href: '/admin/staff', icon: Users },
            { name: 'Asset Inventory', href: '/admin/assets', icon: PackageSearch },
            { name: 'Inspections', href: '/admin/inspections', icon: ClipboardCheck, badge: unreadInspections },
            { name: 'Tickets', href: '/admin/tickets', icon: Ticket, badge: unreadTickets }, 
            { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
            { name: 'Settings', href: '/admin/settings', icon: Settings },
          ].map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
            return (
              <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${isActive ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100/50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                <div className="flex items-center gap-3">
                  <Icon size={20} className={isActive ? 'text-orange-500' : 'text-gray-400'} /> {link.name}
                </div>
                {link.badge && link.badge > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-in zoom-in duration-300">{link.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-50 relative shrink-0 mb-2">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-full flex items-center justify-between p-2 rounded-2xl transition-all hover:bg-gray-50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-sm">{adminProfile.initials}</div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-extrabold text-gray-900 truncate">{adminProfile.name}</p>
                <p className="text-[11px] font-bold text-orange-600 truncate">{adminProfile.email}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isProfileOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"><LogOut size={18} /> Logout</button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between lg:justify-end px-6 shadow-sm shrink-0 relative z-40">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-500 hover:bg-orange-50 hover:text-orange-600 rounded-lg lg:hidden cursor-pointer"><Menu size={24} /></button>

          <div className="flex items-center gap-4 ml-auto relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-600 hover:text-orange-500 transition-colors cursor-pointer">
              <Bell size={22} />
              {unreadTotal > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto relative bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}