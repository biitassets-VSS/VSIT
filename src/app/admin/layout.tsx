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

interface AdminProfile {
  name: string;
  email: string;
  initials: string;
  role?: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); 
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [layoutCrash, setLayoutCrash] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any>(null);
  
  const [liveTicketCount, setLiveTicketCount] = useState(0);
  const [liveInspCount, setLiveInspCount] = useState(0);
  
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

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.clear();
    router.replace('/');
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFF9F2]',
    glassHeader: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-[40px] backdrop-saturate-[1.5] border-b border-white/70 shadow-[0_4px_30px_rgba(31,38,135,0.05)]',
    glassPanel: isDarkMode 
      ? 'bg-zinc-900/85 backdrop-blur-3xl border border-zinc-700/80 shadow-2xl shadow-black' 
      : 'bg-white/85 backdrop-blur-3xl border border-slate-200/90 shadow-2xl shadow-slate-300/50',
    buttonGlass: isDarkMode
      ? 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/80'
      : 'bg-white/60 border border-slate-200 text-slate-700 hover:bg-white',
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

      <header className={`h-16 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-40 transition-colors duration-500 ${theme.glassHeader}`}>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center cursor-pointer transition-transform hover:scale-105 active:scale-95">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain drop-shadow-sm" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </Link>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 ml-auto relative">
          
          {/* 🌟 HIDE SETTINGS & ANNOUNCEMENT ON HR PORTAL */}
          {!isHRPortal && adminProfile.role !== 'hr_admin' && (
            <>
              <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm cursor-pointer active:scale-95 border border-orange-400">
                <Megaphone size={14} /> <span>Announcement</span>
              </button>
              <Link href="/admin/settings" className={`hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer active:scale-95 ${theme.buttonGlass}`}>
                <Settings size={14} /> <span>Settings</span>
              </Link>
            </>
          )}

          <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`p-2 rounded-xl transition-all cursor-pointer ${isNotifOpen ? 'bg-purple-500/10 text-purple-500' : theme.buttonGlass}`}>
              <Bell size={18} />
            </button>
          </div>

          <div className="relative group">
            <button onClick={handleLogout} className={`p-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer border ${isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 shadow-sm'}`}>
              <LogOut size={18} className="translate-x-px" />
            </button>
          </div>
        </div>
      </header>

      {/* 🌟 REDUCED PADDING FOR COMPACT LAYOUT */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto relative z-10 overflow-x-hidden p-3 sm:p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}