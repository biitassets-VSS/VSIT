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
  BarChart3, Settings, Cpu
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
        
        if (['use', 'assign', 'allocat', 'deploy', 'active'].some(k => s.includes(k))) {
          usedAssetsCount++;
        } 
        else if (['discard', 'retire', 'scrap', 'broken', 'lost', 'missing', 'stolen', 'damage'].some(k => s.includes(k))) {
          discardedAssetsCount++;
        } 
        else {
          inStockAssetsCount++;
        }
      });

      // 2. VERIFICATIONS
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

      // 4. LIVE STAFF (FIXED STRICT LOGIC)
      let liveStaffCount = 0;
      staffData.forEach(s => {
        const statusStr = (s.status || '').toLowerCase().trim();
        const isOnlineBool = s.is_online === true || String(s.is_online).toLowerCase() === 'true';
        
        // Removed "active" from this check so it doesn't count everyone with an active account
        if (isOnlineBool || statusStr === 'online' || statusStr === 'live') {
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
    cardHover: isDarkMode ? 'hover:border-purple-500/50' : 'hover:border-purple-200 hover:shadow-md hover:-translate-y-1',
  };

  const getModuleTheme = (color: string) => color === 'orange' 
    ? { 
        iconBg: isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600',
        hoverBtn: 'group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-500/20'
      }
    : { 
        iconBg: isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600',
        hoverBtn: 'group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-purple-600/20'
      };

  return (
    <div className={`min-h-screen lg:h-screen flex flex-col ${theme.bg} transition-colors duration-300 font-sans antialiased`}>
      <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full p-3 sm:p-4 gap-3 lg:gap-4 overflow-y-auto custom-scrollbar">
        
        {/* 🌟 TOP HEADER */}
        <div className={`${theme.card} rounded-3xl p-4 sm:p-6 border flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0 shadow-sm`}>
          <Link href="/admin" className="flex items-center gap-4 lg:gap-6 group">
            
            {/* 🔴 NEW LOGO DESIGN: Outlined light orange background with orange icon */}
            <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-[20px] lg:rounded-[24px] border-2 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 'bg-orange-50 border-orange-200 text-orange-500'}`}>
              <Cpu className="w-8 h-8 lg:w-10 lg:h-10" strokeWidth={1.5} />
            </div>
            
            <div>
              <h1 className={`text-xl lg:text-[26px] font-black tracking-tight ${theme.text}`}>IT Asset & Service Management</h1>
              <p className={`text-xs lg:text-sm font-semibold mt-1 lg:mt-1.5 ${theme.subText}`}>Welcome back, {adminName}. Here is your live IT infrastructure status.</p>
            </div>
          </Link>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button onClick={() => setIsBroadcastModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-105 active:scale-95">
              <Megaphone size={14} /> Announcement
            </button>
            <button onClick={() => router.push('/admin/settings')} className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border shadow-sm transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-zinc-900 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
              <Settings size={14} /> Settings
            </button>
            {notifications.length > 0 && (
              <button className="p-2 sm:p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 relative animate-bounce">
                <Bell size={16} />
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{notifications.length}</span>
              </button>
            )}
          </div>
        </div>

        {/* 📊 FOUR METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
          
          <div className={`${theme.card} p-3 sm:p-4 rounded-2xl border flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Laptop size={18} /></div>
              <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Inventory</span>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 leading-none">{stats.totalAssets}</h2>
              <p className={`text-[10px] font-semibold mt-1 ${theme.subText}`}>Total Assets</p>
            </div>
            <div className={`grid grid-cols-3 gap-1 mt-3 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[8px] uppercase font-bold ${theme.subText}`}>Used</span><span className={`text-xs lg:text-sm font-black ${theme.text}`}>{stats.usedAssets}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[8px] uppercase font-bold ${theme.subText}`}>Stock</span><span className={`text-xs lg:text-sm font-black ${theme.text}`}>{stats.inStockAssets}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[8px] uppercase font-bold ${theme.subText}`}>Discard</span><span className="text-xs lg:text-sm font-black text-rose-500">{stats.discardedAssets}</span></div>
            </div>
          </div>

          <div className={`${theme.card} p-3 sm:p-4 rounded-2xl border flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>{stats.pendingInspections > 0 ? <AlertCircle size={18} /> : <ClipboardCheck size={18} />}</div>
              <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Verifications</span>
            </div>
            <div>
              <h2 className={`text-2xl lg:text-3xl font-black leading-none ${stats.pendingInspections > 0 ? 'text-orange-600 dark:text-orange-400' : theme.text}`}>{stats.totalVerifications}</h2>
              <p className={`text-[10px] font-semibold mt-1 ${theme.subText}`}>Total Requests</p>
            </div>
            <div className={`grid grid-cols-2 gap-1 mt-3 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[8px] uppercase font-bold ${theme.subText}`}>Total</span><span className={`text-xs lg:text-sm font-black ${theme.text}`}>{stats.totalVerifications}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[8px] uppercase font-bold ${theme.subText}`}>Pending</span><span className={`text-xs lg:text-sm font-black ${stats.pendingInspections > 0 ? 'text-orange-500' : theme.text}`}>{stats.pendingInspections}</span></div>
            </div>
          </div>

          <div className={`${theme.card} p-3 sm:p-4 rounded-2xl border flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Ticket size={18} /></div>
              <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Helpdesk</span>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 leading-none">{stats.totalTickets}</h2>
              <p className={`text-[10px] font-semibold mt-1 ${theme.subText}`}>Total Tickets</p>
            </div>
            <div className={`grid grid-cols-2 gap-1 mt-3 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[8px] uppercase font-bold ${theme.subText}`}>Pending</span><span className={`text-xs lg:text-sm font-black ${stats.pendingTickets > 0 ? 'text-rose-500' : theme.text}`}>{stats.pendingTickets}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[8px] uppercase font-bold ${theme.subText}`}>Process</span><span className="text-xs lg:text-sm font-black text-orange-500">{stats.inProcessTickets}</span></div>
            </div>
          </div>

          <div className={`${theme.card} p-3 sm:p-4 rounded-2xl border flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><Users size={18} /></div>
              <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Network</span>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black text-orange-600 dark:text-orange-400 leading-none">{stats.totalStaff}</h2>
              <p className={`text-[10px] font-semibold mt-1 ${theme.subText}`}>Total Staff</p>
            </div>
            <div className={`grid grid-cols-2 gap-1 mt-3 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[8px] uppercase font-bold ${theme.subText}`}>Registered</span><span className={`text-xs lg:text-sm font-black ${theme.text}`}>{stats.totalStaff}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800">
                <span className={`text-[8px] uppercase font-bold flex items-center gap-1 ${theme.subText}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </span>
                <span className="text-xs lg:text-sm font-black text-emerald-500">{stats.liveStaff}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🟢 SYSTEM MODULES & ACTIVITY LOG */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-4 min-h-0 pb-4 lg:pb-0">
          
          <div className="w-full lg:w-[75%] flex flex-col gap-2">
            <h3 className={`text-[10px] font-bold uppercase tracking-widest pl-1 shrink-0 ${theme.subText}`}>System Modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 flex-1 overflow-y-auto lg:overflow-visible">
              {[
                { title: 'Review Inspections', desc: 'Audit smartphone visual submissions and approve hardware.', icon: ClipboardCheck, path: '/admin/inspections', color: 'orange', badge: stats.pendingInspections },
                { title: 'Asset Registry', desc: 'Manage full hardware lifecycle, assignments, and serial tags.', icon: Laptop, path: '/admin/assets', color: 'purple', badge: 0 },
                { title: 'Return Requests', desc: 'Manage hardware returns and physical asset handovers.', icon: LogOut, path: '/admin/returns', color: 'orange', badge: stats.returnRequests },
                { title: 'Replacements', desc: 'Process device swap requests and hardware upgrades.', icon: RefreshCw, path: '/admin/replacements', color: 'purple', badge: stats.replacementRequests },
                { title: 'IT Helpdesk', desc: 'Resolve staff hardware issues and repair requests.', icon: Ticket, path: '/admin/tickets', color: 'purple', badge: stats.activeTickets },
                { title: 'Staff Directory', desc: 'Manage employee access codes and profile data.', icon: Users, path: '/admin/staff', color: 'orange', badge: 0 },
                { title: 'Remote Access', desc: 'View and control staff screens securely for live support.', icon: Monitor, path: '/admin/remote', color: 'purple', badge: 0 },
                { title: 'Reports & Analytics', desc: 'Generate hardware breakdowns, asset matrices, and PDF exports.', icon: BarChart3, path: '/admin/reports', color: 'purple', badge: 0 },
              ].map((m, i) => {
                const modTheme = getModuleTheme(m.color);
                return (
                  <button 
                    key={i} 
                    onClick={() => router.push(m.path)} 
                    className={`text-left cursor-pointer ${theme.card} p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col transition-all duration-300 group ${theme.cardHover}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${modTheme.iconBg}`}>
                        <m.icon size={18} strokeWidth={2.5} />
                        {m.badge > 0 && (
                          <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 bg-rose-500 shadow-sm ${isDarkMode ? 'border-zinc-900' : 'border-white'}`}>
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <h4 className={`text-[13px] lg:text-sm font-extrabold tracking-tight ${theme.text}`}>{m.title}</h4>
                    </div>
                    
                    <p className={`text-[10px] lg:text-[11px] font-medium leading-relaxed mb-3 pr-2 ${theme.subText}`}>{m.desc}</p>
                    
                    <div className="mt-auto self-end">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${modTheme.iconBg} ${modTheme.hoverBtn} shrink-0`}>
                        <ArrowRight size={14} strokeWidth={2.5} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full lg:w-[25%] flex flex-col gap-2 h-[350px] lg:h-full">
            <h3 className={`text-[10px] font-bold uppercase tracking-widest pl-1 shrink-0 ${theme.subText}`}>Live Activity</h3>
            <div className={`${theme.card} rounded-3xl border p-5 flex-1 flex flex-col overflow-hidden`}>
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
              <button onClick={() => router.push('/admin/inspections')} className={`mt-3 w-full py-3 rounded-xl text-[10px] font-bold uppercase border transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                View All Logs
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 🚀 TOP-BAR BROADCAST ANNOUNCEMENT MODAL */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className={`rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-5 animate-in zoom-in-95 duration-300 ${theme.card}`}>
            <div className={`flex justify-between items-center pb-4 border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <h3 className={`text-base font-extrabold flex items-center gap-2 uppercase tracking-wide ${theme.text}`}>
                <Megaphone size={20} className="text-orange-600" /> Send Staff Announcement
              </h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} className={`p-2 rounded-full transition-colors hover:scale-110 ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.subText}`}>Announcement Message *</label>
                <textarea rows={3} required placeholder="Type an announcement to broadcast to all staff dashboards..." value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} className={`w-full p-3 rounded-xl border outline-none text-sm font-medium transition-all resize-none ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-orange-500'}`} />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.subText}`}>Attach Graphic / Flyer (Optional)</label>
                <label className={`cursor-pointer w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${isDarkMode ? 'border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-400' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500'}`}>
                  <ImagePlus size={24} className={broadcastImage ? "text-purple-600" : ""} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{broadcastImage ? `Attached: ${broadcastImage.name}` : 'Click to browse image file'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setBroadcastImage(e.target.files ? e.target.files[0] : null)} />
                </label>
                {broadcastImage && <button type="button" onClick={() => setBroadcastImage(null)} className="text-[10px] text-rose-500 hover:underline mt-2 font-bold uppercase tracking-widest flex items-center gap-1"><X size={12} /> Remove attached file</button>}
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button type="button" onClick={() => setIsBroadcastModalOpen(false)} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}>Cancel</button>
                <button disabled={isBroadcasting || (!broadcastMessage.trim() && !broadcastImage)} type="submit" className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest shadow-sm">
                  {isBroadcasting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Broadcast Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}