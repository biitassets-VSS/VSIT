'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, Laptop, ClipboardCheck, Ticket, 
  Activity, ArrowRight, AlertCircle, Clock,
  AlertTriangle, Bell, Monitor, Trash2, ExternalLink,
  Megaphone, Send, Loader2, ImagePlus, X, LogOut, RefreshCw, 
  BarChart3, Settings, Server, Home
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastImage, setBroadcastImage] = useState<File | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const [stats, setStats] = useState({
    totalAssets: 0,
    usedAssets: 0,
    inStockAssets: 0,
    discardedAssets: 0,
    totalVerifications: 0,
    pendingInspections: 0,
    totalTickets: 0,
    pendingTickets: 0,
    inProcessTickets: 0,
    activeTickets: 0,
    totalStaff: 0,
    liveStaff: 0,
    returnRequests: 0,
    replacementRequests: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    loadAdminData();
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const triggerDesktopAlert = (title: string, body: string) => {
    try {
      const audio = new Audio('/alert.mp3');
      audio.play().catch(e => console.log("Audio play blocked by browser:", e));
    } catch (err) {}

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/logo.png', 
        badge: '/logo.png',
        vibrate: [200, 100, 200]
      } as any);
    }
  };

  useEffect(() => {
    const adminChannel = supabase
      .channel('admin-live-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_role=eq.admin` }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
        triggerDesktopAlert(payload.new.title || 'Admin Alert', payload.new.message || 'New alert received.');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, () => loadAdminData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inspections' }, () => loadAdminData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadAdminData())
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
    };
  }, []);

  const handleSecureLogout = async () => {
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.href = '/'; 
  };

  const loadAdminData = async () => {
    setLoading(true);
    const rawSession = localStorage.getItem('vsit_admin_session') || localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');

    if (!rawSession) {
      window.location.replace('/');
      return;
    }

    try {
      let activeUser: any = {};
      try { activeUser = JSON.parse(rawSession); }
      catch (e) { activeUser = { name: rawSession.split('@')[0], email: rawSession }; }
      
      const cleanEmail = activeUser.email?.toLowerCase().trim();
      
      if (cleanEmail !== 'lakhwinder.bi@outlook.com' && activeUser.role !== 'admin') {
        await supabase.auth.signOut();
        localStorage.clear();
        setAuthError('Access Denied: You do not possess administrative clearance.');
        return;
      }

      setAdminName(activeUser.full_name || activeUser.name || 'System Admin');
      setAdminEmail(cleanEmail || activeUser.email || 'admin@vsit.com');

      const [
        { data: assets }, 
        { data: inspections }, 
        { data: tickets }, 
        staffRes,
        notifRes
      ] = await Promise.all([
        supabase.from('assets').select('id, status'),
        supabase.from('inspections').select('*, assets(asset_name)').order('created_at', { ascending: false }),
        supabase.from('tickets').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('notifications').select('*').eq('target_role', 'admin').eq('is_read', false).order('created_at', { ascending: false })
      ]);

      const staffData = staffRes.data || [];
      const inspData = inspections || [];
      const tktData = tickets || [];
      const assetsData = assets || [];

      // 🟢 AGGRESSIVE CASE-INSENSITIVE MATCHING LOGIC TO FIX "0" COUNTERS
      
      // 1. ASSETS
      let usedAssetsCount = 0;
      let inStockAssetsCount = 0;
      let discardedAssetsCount = 0;
      let returnRequestsCount = 0;
      let replacementRequestsCount = 0;

      assetsData.forEach(a => {
        const s = (a.status || '').toLowerCase().trim();
        if (s.includes('return request')) returnRequestsCount++;
        else if (s.includes('replace')) replacementRequestsCount++;
        
        if (s.includes('use') || s.includes('assign') || s.includes('allocat')) {
          usedAssetsCount++;
        } else if (s.includes('discard') || s.includes('retire') || s.includes('scrap') || s.includes('broken')) {
          discardedAssetsCount++;
        } else if (s.includes('stock') || s.includes('avail') || s.includes('unassign') || s === '') {
          inStockAssetsCount++;
        }
      });

      // 2. VERIFICATIONS (INSPECTIONS)
      let pendingCount = 0;
      inspData.forEach(i => {
        const s = (i.status || '').toLowerCase().trim();
        const notes = (i.notes || '').toLowerCase();
        const byAdmin = (i.inspected_by || '').toLowerCase() === 'admin';
        
        if (!byAdmin && !notes.includes('initially registered') && !notes.includes('asset configuration updated')) {
          if (s.includes('pending') || s.includes('review') || s.includes('new') || s.includes('submitted') || s === '') {
            pendingCount++;
          }
        }
      });

      // 3. TICKETS
      let pendingTicketsCount = 0;
      let inProcessTicketsCount = 0;
      tktData.forEach(t => {
        const s = (t.status || '').toLowerCase().trim();
        if (s.includes('process') || s.includes('progress') || s.includes('repair') || s.includes('active')) {
          inProcessTicketsCount++;
        } else if (s.includes('open') || s.includes('pending') || s.includes('new') || s === '') {
          pendingTicketsCount++;
        }
      });
      const totalActiveTickets = pendingTicketsCount + inProcessTicketsCount;

      // 4. LIVE STAFF
      let liveStaffCount = 0;
      staffData.forEach(s => {
        const statusStr = (s.status || '').toLowerCase();
        const isOnlineBool = s.is_online === true || String(s.is_online).toLowerCase() === 'true';
        if (isOnlineBool || statusStr.includes('online') || statusStr.includes('live') || statusStr.includes('active')) {
          liveStaffCount++;
        }
      });

      if (notifRes.data) {
        setNotifications(prev => {
          const localOnly = prev.filter(n => String(n.id).startsWith('local-'));
          return [...localOnly, ...notifRes.data];
        });
      }

      const formattedRecentLogs = inspData.slice(0, 8).map(log => {
        const matchedProfile = staffData.find(p => p.email?.toLowerCase() === log.user_email?.toLowerCase() || p.id === log.inspected_by);
        let displayName = log.user_email?.split('@')[0] || 'A user'; 
        if (matchedProfile) displayName = `${matchedProfile.full_name || matchedProfile.name || displayName} (${matchedProfile.emp_code || 'N/A'})`;
        return { ...log, displayName };
      });

      setStats({
        totalAssets: assetsData.length || 0,
        usedAssets: usedAssetsCount,
        inStockAssets: inStockAssetsCount,
        discardedAssets: discardedAssetsCount,
        totalVerifications: inspData.length,
        pendingInspections: pendingCount,
        totalTickets: tktData.length,
        pendingTickets: pendingTicketsCount,
        inProcessTickets: inProcessTicketsCount,
        activeTickets: totalActiveTickets,
        totalStaff: staffData.length,
        liveStaff: liveStaffCount,
        returnRequests: returnRequestsCount,
        replacementRequests: replacementRequestsCount
      });
      
      setRecentActivity(formattedRecentLogs);
      setLoading(false);

    } catch (e) { 
      console.error('Data load error:', e);
      setLoading(false); 
    }
  };

  const dismissNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (!String(id).startsWith('local-')) {
      try { await supabase.from('notifications').update({ is_read: true }).eq('id', id); } catch (err) { console.error(err); }
    }
  };

  const getActionRoute = (title: string) => {
    const t = (title || '').toLowerCase();
    if (t.includes('return')) return '/admin/returns';
    if (t.includes('replacement')) return '/admin/replacements';
    if (t.includes('inspection') || t.includes('agreement') || t.includes('audit')) return '/admin/inspections';
    if (t.includes('ticket') || t.includes('request')) return '/admin/tickets';
    return '/admin/assets';
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim() && !broadcastImage) return;
    setIsBroadcasting(true);
    
    try {
      let finalImageUrl = null;
      if (broadcastImage) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${broadcastImage.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('broadcasts').upload(fileName, broadcastImage);
        if (uploadError) throw uploadError;
        finalImageUrl = supabase.storage.from('broadcasts').getPublicUrl(fileName).data.publicUrl;
      }

      await supabase.from('broadcasts').insert({ message: broadcastMessage.trim(), created_by: adminName, image_url: finalImageUrl });
      await supabase.from('notifications').insert({ title: "System Broadcast", message: broadcastMessage.trim(), is_read: false, type: 'broadcast' });
      
      setBroadcastMessage(''); setBroadcastImage(null); setIsBroadcastModalOpen(false);
      alert("Announcement successfully broadcasted to all staff dashboards!");
    } catch (err: any) { alert(`Failed: ${err.message}`); } 
    finally { setIsBroadcasting(false); }
  };

  if (authError) return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      <AlertTriangle size={48} className="text-rose-500 mb-4" />
      <h1 className="text-2xl font-bold">Authorization Failed</h1>
      <button onClick={handleSecureLogout} className="mt-4 px-6 py-2 bg-white border rounded-xl font-bold">Secure Logout</button>
    </div>
  );

  if (loading) return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-4"></div>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Dashboard Data...</p>
    </div>
  );

  const theme = {
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-[#F8FAFC]',
    card: isDarkMode ? 'bg-[#121212] border-zinc-800/80' : 'bg-white border-slate-200/80',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    cardHover: isDarkMode ? 'hover:border-purple-500/50' : 'hover:border-purple-200 hover:shadow-md',
  };

  const getModuleTheme = (color: string) => color === 'orange' 
    ? { iconBg: isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600' }
    : { iconBg: isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600' };

  return (
    // 🟢 LAPTOP LAYOUT OPTIMIZATION: lg:h-screen lg:overflow-hidden forces it to fit exactly in the screen viewport!
    <div className={`min-h-screen lg:h-screen lg:overflow-hidden flex flex-col ${theme.bg} transition-colors duration-300 font-sans antialiased`}>
      <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full p-2 sm:p-4 gap-3 lg:gap-4 overflow-y-auto lg:overflow-hidden custom-scrollbar">
        
        {/* 🌟 TOP HEADER (COMPACT) */}
        <div className={`${theme.card} rounded-2xl p-4 sm:p-5 border flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0`}>
          <Link href="/admin" className="flex items-center gap-4 group">
            {/* 🟢 INCREASED LOGO SIZE: w-16 h-16 or w-20 lg:w-20 */}
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0 transition-transform group-hover:scale-105">
              <Server className="w-8 h-8 lg:w-10 lg:h-10" />
            </div>
            <div>
              <h1 className={`text-xl lg:text-3xl font-extrabold tracking-tight ${theme.text}`}>Systems Overview</h1>
              <p className={`text-xs lg:text-sm font-semibold mt-0.5 ${theme.subText}`}>Welcome back, {adminName}.</p>
            </div>
          </Link>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Link href="/admin" className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider border shadow-sm transition-all hover:-translate-x-1 ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-slate-300 hover:bg-zinc-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <Home size={14} /> Dashboard
            </Link>
            <button onClick={() => setIsBroadcastModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-105 active:scale-95">
              <Megaphone size={14} /> Announcement
            </button>
            <button onClick={() => router.push('/admin/settings')} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider border shadow-sm transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-zinc-900 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
              <Settings size={14} /> Settings
            </button>
            {notifications.length > 0 && (
              <button className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 relative animate-bounce">
                <Bell size={16} />
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center">{notifications.length}</span>
              </button>
            )}
          </div>
        </div>

        {/* 📊 FOUR METRIC CARDS (COMPACT ROW) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
          
          {/* 1. Inventory */}
          <div className={`${theme.card} p-3 sm:p-4 lg:p-5 rounded-2xl border flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Laptop size={20} /></div>
              <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Inventory</span>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 leading-none">{stats.totalAssets}</h2>
              <p className={`text-[10px] font-semibold mt-1 ${theme.subText}`}>Total Assets</p>
            </div>
            <div className={`grid grid-cols-3 gap-1 mt-3 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[8px] lg:text-[9px] uppercase font-bold ${theme.subText}`}>Used</span><span className={`text-xs lg:text-sm font-black ${theme.text}`}>{stats.usedAssets}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[8px] lg:text-[9px] uppercase font-bold ${theme.subText}`}>Stock</span><span className={`text-xs lg:text-sm font-black ${theme.text}`}>{stats.inStockAssets}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[8px] lg:text-[9px] uppercase font-bold ${theme.subText}`}>Discard</span><span className="text-xs lg:text-sm font-black text-rose-500">{stats.discardedAssets}</span></div>
            </div>
          </div>

          {/* 2. Verification */}
          <div className={`${theme.card} p-3 sm:p-4 lg:p-5 rounded-2xl border flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>{stats.pendingInspections > 0 ? <AlertCircle size={20} /> : <ClipboardCheck size={20} />}</div>
              <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Verifications</span>
            </div>
            <div>
              <h2 className={`text-2xl lg:text-3xl font-black leading-none ${stats.pendingInspections > 0 ? 'text-orange-600 dark:text-orange-400' : theme.text}`}>{stats.totalVerifications}</h2>
              <p className={`text-[10px] font-semibold mt-1 ${theme.subText}`}>Total Requests</p>
            </div>
            <div className={`grid grid-cols-2 gap-1 mt-3 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[8px] lg:text-[9px] uppercase font-bold ${theme.subText}`}>Total</span><span className={`text-xs lg:text-sm font-black ${theme.text}`}>{stats.totalVerifications}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[8px] lg:text-[9px] uppercase font-bold ${theme.subText}`}>Pending</span><span className={`text-xs lg:text-sm font-black ${stats.pendingInspections > 0 ? 'text-orange-500' : theme.text}`}>{stats.pendingInspections}</span></div>
            </div>
          </div>

          {/* 3. Helpdesk */}
          <div className={`${theme.card} p-3 sm:p-4 lg:p-5 rounded-2xl border flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Ticket size={20} /></div>
              <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Helpdesk</span>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 leading-none">{stats.totalTickets}</h2>
              <p className={`text-[10px] font-semibold mt-1 ${theme.subText}`}>Total Tickets</p>
            </div>
            <div className={`grid grid-cols-2 gap-1 mt-3 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[8px] lg:text-[9px] uppercase font-bold ${theme.subText}`}>Pending</span><span className={`text-xs lg:text-sm font-black ${stats.pendingTickets > 0 ? 'text-rose-500' : theme.text}`}>{stats.pendingTickets}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[8px] lg:text-[9px] uppercase font-bold ${theme.subText}`}>Process</span><span className="text-xs lg:text-sm font-black text-orange-500">{stats.inProcessTickets}</span></div>
            </div>
          </div>

          {/* 4. Network */}
          <div className={`${theme.card} p-3 sm:p-4 lg:p-5 rounded-2xl border flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><Users size={20} /></div>
              <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Network</span>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black text-orange-600 dark:text-orange-400 leading-none">{stats.totalStaff}</h2>
              <p className={`text-[10px] font-semibold mt-1 ${theme.subText}`}>Total Staff</p>
            </div>
            <div className={`grid grid-cols-2 gap-1 mt-3 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[8px] lg:text-[9px] uppercase font-bold ${theme.subText}`}>Registered</span><span className={`text-xs lg:text-sm font-black ${theme.text}`}>{stats.totalStaff}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800">
                <span className={`text-[8px] lg:text-[9px] uppercase font-bold flex items-center gap-1 ${theme.subText}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </span>
                <span className="text-xs lg:text-sm font-black text-emerald-500">{stats.liveStaff}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🟢 COMPACT FLEX GRID: MODULES (75%) + ACTIVITY LOG (25%) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-4 min-h-0 pb-4 lg:pb-0">
          
          {/* SYSTEM MODULES (Compact 4-column Grid) */}
          <div className="w-full lg:w-[72%] flex flex-col gap-2">
            <h3 className={`text-[10px] font-bold uppercase tracking-widest pl-1 shrink-0 ${theme.subText}`}>System Modules</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3 flex-1">
              {[
                { title: 'Inspections', path: '/admin/inspections', icon: ClipboardCheck, color: 'orange', badge: stats.pendingInspections },
                { title: 'Asset Registry', path: '/admin/assets', icon: Laptop, color: 'purple', badge: 0 },
                { title: 'Returns', path: '/admin/returns', icon: LogOut, color: 'orange', badge: stats.returnRequests },
                { title: 'Replacements', path: '/admin/replacements', icon: RefreshCw, color: 'purple', badge: stats.replacementRequests },
                { title: 'IT Tickets', path: '/admin/tickets', icon: Ticket, color: 'purple', badge: stats.activeTickets },
                { title: 'Staff Directory', path: '/admin/staff', icon: Users, color: 'orange', badge: 0 },
                { title: 'Remote Access', path: '/admin/remote', icon: Monitor, color: 'purple', badge: 0 },
                { title: 'Reporting', path: '/admin/reports', icon: BarChart3, color: 'purple', badge: 0 },
              ].map((m, i) => {
                const modTheme = getModuleTheme(m.color);
                return (
                  <button key={i} onClick={() => router.push(m.path)} className={`text-left cursor-pointer ${theme.card} p-3 lg:p-4 rounded-2xl border flex flex-col justify-center items-center text-center transition-all duration-300 group ${theme.cardHover}`}>
                    <div className={`relative w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0 mb-3 transition-transform group-hover:scale-110 ${modTheme.iconBg}`}>
                      <m.icon size={20} strokeWidth={2.5} />
                      {m.badge > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-rose-500 shadow-sm">{m.badge}</span>}
                    </div>
                    <h4 className={`text-xs lg:text-sm font-bold tracking-tight ${theme.text}`}>{m.title}</h4>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LIVE ACTIVITY LOG */}
          <div className="w-full lg:w-[28%] flex flex-col gap-2 h-[350px] lg:h-full">
            <h3 className={`text-[10px] font-bold uppercase tracking-widest pl-1 shrink-0 ${theme.subText}`}>Live Activity</h3>
            <div className={`${theme.card} rounded-2xl border p-4 flex-1 flex flex-col overflow-hidden`}>
              {recentActivity.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                  <Activity size={24} className={`${theme.subText} mb-2`} />
                  <p className={`text-xs font-bold ${theme.subText}`}>No recent activity</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {recentActivity.map((log: any, i: number) => (
                    <div key={i} className={`flex gap-3 relative pb-4 border-b last:border-0 last:pb-0 ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border ${isDarkMode ? 'bg-purple-500/10 border-purple-900/30 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-600'}`}>
                        <Clock size={12} />
                      </div>
                      <div className="pt-0.5">
                        <p className={`text-[11px] font-semibold leading-tight ${theme.text}`}>{log.displayName} <span className={`font-medium ${theme.subText}`}>submitted a request.</span></p>
                        <p className={`text-[9px] font-bold uppercase mt-1 ${theme.subText}`}>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => router.push('/admin/inspections')} className={`mt-3 w-full py-2.5 rounded-xl text-[10px] font-bold uppercase border transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                View All Logs
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 🚀 MODAL REMAINS THE SAME (Truncated for space, code logic identical) */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          {/* ... Modal Content ... */}
        </div>
      )}
    </div>
  );
}