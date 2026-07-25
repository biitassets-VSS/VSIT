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

// Helper for Relative Time (e.g., "2 mins ago")
const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return `Yesterday at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  return `${days} days ago`;
};

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
    resolvedInspections: 0,
    pendingInspections: 0,
    totalTickets: 0,
    resolvedTickets: 0,
    pendingTickets: 0,
    inProcessTickets: 0,
    totalStaff: 0,
    onlineStaff: 0,
    offlineStaff: 0,
    deactivatedStaff: 0,
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
      audio.play().catch(e => console.log("Audio play blocked", e));
    } catch (err) {}

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo.png' });
    }
  };

  useEffect(() => {
    // Real-Time Socket Connection for Instant Updates
    const adminChannel = supabase
      .channel('admin-live-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_role=eq.admin` }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
        triggerDesktopAlert(payload.new.title || 'System Alert', payload.new.message || 'New notification received.');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadAdminData())
      .subscribe();

    return () => { supabase.removeChannel(adminChannel); };
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

    if (!rawSession) { window.location.replace('/'); return; }

    try {
      let activeUser: any = {};
      try { activeUser = JSON.parse(rawSession); }
      catch (e) { activeUser = { name: rawSession.split('@')[0], email: rawSession }; }
      
      const cleanEmail = activeUser.email?.toLowerCase().trim();
      if (cleanEmail !== 'lakhwinder.bi@outlook.com' && activeUser.role !== 'admin') {
        await supabase.auth.signOut(); localStorage.clear();
        setAuthError('Access Denied: You do not possess administrative clearance.'); return;
      }

      setAdminName(activeUser.full_name || activeUser.name || 'System Admin');
      setAdminEmail(cleanEmail || activeUser.email || 'admin@vsit.com');

      const [
        { data: assets }, { data: inspections }, { data: tickets }, staffRes, notifRes
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

      // 1. ASSETS LOGIC
      let usedAssetsCount = 0, inStockAssetsCount = 0, discardedAssetsCount = 0, returnRequestsCount = 0, replacementRequestsCount = 0;
      assetsData.forEach(a => {
        const s = (a.status || '').toLowerCase().trim();
        if (s.includes('return request')) returnRequestsCount++;
        else if (s.includes('replace')) replacementRequestsCount++;
        
        if (['use', 'assign', 'allocat', 'deploy', 'active'].some(k => s.includes(k))) usedAssetsCount++;
        else if (['discard', 'retire', 'scrap', 'broken', 'lost', 'missing', 'stolen', 'damage'].some(k => s.includes(k))) discardedAssetsCount++;
        else inStockAssetsCount++;
      });

      // 2. VERIFICATIONS LOGIC
      let pendingCount = 0, resolvedCount = 0;
      inspData.forEach(i => {
        const s = (i.status || '').toLowerCase().trim();
        const notes = (i.notes || '').toLowerCase();
        const byAdmin = (i.inspected_by || '').toLowerCase() === 'admin';
        
        if (!byAdmin && !notes.includes('initially registered') && !notes.includes('asset configuration updated')) {
          if (['resolv', 'approv', 'complet', 'clos'].some(k => s.includes(k))) resolvedCount++;
          else pendingCount++;
        }
      });

      // 3. TICKETS LOGIC
      let pendingTicketsCount = 0, inProcessTicketsCount = 0, resolvedTicketsCount = 0;
      tktData.forEach(t => {
        const s = (t.status || '').toLowerCase().trim();
        if (['resolv', 'clos', 'complet', 'done'].some(k => s.includes(k))) resolvedTicketsCount++;
        else if (['process', 'progress', 'repair', 'active'].some(k => s.includes(k))) inProcessTicketsCount++;
        else pendingTicketsCount++;
      });

      // 4. NETWORK LOGIC (ONLINE/OFFLINE/DEACTIVATED STRICT LOGIC)
      let onlineCount = 0, deactivatedCount = 0;
      staffData.forEach(s => {
        const statusStr = (s.status || '').toLowerCase().trim();
        const roleStr = (s.role || '').toLowerCase().trim();
        const isOnlineBool = s.is_online === true || String(s.is_online).toLowerCase() === 'true';
        
        // Strict check if staff is deactivated, suspended, banned, or marked inactive in DB
        const isDeactivated = s.is_active === false || 
                              ['deactivat', 'suspend', 'ban', 'block', 'revoke'].some(k => statusStr.includes(k)) ||
                              ['deactivat', 'suspend', 'ban', 'block', 'revoke'].some(k => roleStr.includes(k));

        if (isDeactivated) {
          deactivatedCount++;
        } else if (isOnlineBool || statusStr === 'online' || statusStr === 'live') {
          onlineCount++;
        }
      });
      // Offline is any registered staff who isn't live AND isn't deactivated.
      const offlineCount = staffData.length - onlineCount - deactivatedCount;

      if (notifRes.data) setNotifications(notifRes.data);

      const formattedRecentLogs = inspData.slice(0, 8).map(log => {
        const matchedProfile = staffData.find(p => p.email?.toLowerCase() === log.user_email?.toLowerCase() || p.id === log.inspected_by);
        let displayName = log.user_email?.split('@')[0] || 'A user'; 
        if (matchedProfile) displayName = `${matchedProfile.full_name || matchedProfile.name || displayName}`;
        
        // Activity Status Inference
        const statusText = (log.status || '').toLowerCase();
        let logTheme = 'text-purple-600 bg-purple-50'; // Processing
        if (statusText.includes('pending') || statusText === '') logTheme = 'text-orange-500 bg-orange-50'; // Pending
        if (statusText.includes('resolv') || statusText.includes('approv')) logTheme = 'text-emerald-500 bg-emerald-50'; // Success

        return { ...log, displayName, logTheme };
      });

      setStats({
        totalAssets: assetsData.length || 0,
        usedAssets: usedAssetsCount,
        inStockAssets: inStockAssetsCount,
        discardedAssets: discardedAssetsCount,
        totalVerifications: inspData.length,
        resolvedInspections: resolvedCount,
        pendingInspections: pendingCount,
        totalTickets: tktData.length,
        resolvedTickets: resolvedTicketsCount,
        pendingTickets: pendingTicketsCount,
        inProcessTickets: inProcessTicketsCount,
        totalStaff: staffData.length,
        onlineStaff: onlineCount,
        offlineStaff: offlineCount > 0 ? offlineCount : 0,
        deactivatedStaff: deactivatedCount,
        returnRequests: returnRequestsCount,
        replacementRequests: replacementRequestsCount
      });
      
      setRecentActivity(formattedRecentLogs);
      setLoading(false);

    } catch (e) { console.error('Data load error:', e); setLoading(false); }
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
    } catch (err: any) { alert(`Failed: ${err.message}`); } finally { setIsBroadcasting(false); }
  };

  if (authError) return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      <AlertTriangle size={48} className="text-rose-500 mb-4" />
      <h1 className="text-2xl font-bold">Authorization Failed</h1>
      <button onClick={handleSecureLogout} className="mt-4 px-6 py-2 bg-white border rounded-xl font-bold shadow-sm">Secure Logout</button>
    </div>
  );

  if (loading) return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B5CF6] mb-4"></div>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Enterprise Data...</p>
    </div>
  );

  const theme = {
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-[#F8FAFC]',
    card: isDarkMode ? 'bg-[#121212] border-zinc-800' : 'bg-white border-slate-200/70',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-800',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  return (
    <div className={`min-h-screen lg:h-screen flex flex-col ${theme.bg} transition-colors duration-300 font-sans antialiased`}>
      <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full p-4 lg:p-6 gap-4 lg:gap-5 overflow-y-auto custom-scrollbar">
        
        {/* 🌟 HEADER */}
        <div className={`${theme.card} rounded-2xl p-3 sm:p-4 border flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0 shadow-sm transition-all`}>
          <Link href="/admin" className="flex items-center gap-4 group">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ${isDarkMode ? 'bg-[#F97316]/10 border-[#F97316]/30 text-[#F97316]' : 'bg-[#fff7ed] border-[#fed7aa] text-[#F97316]'}`}>
              <Cpu className="w-6 h-6" strokeWidth={2} />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className={`text-lg lg:text-xl font-bold tracking-tight ${theme.text}`}>IT Asset & Service Management</h1>
              <p className={`text-[11px] lg:text-xs font-medium mt-0.5 ${theme.subText}`}>Welcome back, {adminName}. Here is your live IT infrastructure status.</p>
            </div>
          </Link>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button onClick={() => setIsBroadcastModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#8B5CF6] hover:bg-[#7c3aed] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[#8B5CF6]/30">
              <Megaphone size={14} /> Announcement
            </button>
            <button onClick={() => router.push('/admin/settings')} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all duration-300 hover:-translate-y-0.5 ${isDarkMode ? 'bg-zinc-900 border-[#F97316]/30 text-[#F97316] hover:bg-zinc-800' : 'bg-white border-slate-200 text-slate-600 hover:border-[#F97316]/50 hover:text-[#F97316]'}`}>
              <Settings size={14} /> Settings
            </button>
            <button className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:border-[#8B5CF6]/50 hover:text-[#8B5CF6] transition-all duration-300 relative shadow-sm group">
              <Bell size={18} className={notifications.length > 0 ? "animate-pulse" : ""} />
              {notifications.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#F97316] text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{notifications.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* 📊 THUMBNAIL CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
          
          {/* INVENTORY */}
          <div className={`${theme.card} p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'bg-[#f3e8ff] text-[#8B5CF6] group-hover:bg-[#8B5CF6] group-hover:text-white'}`}><Laptop size={18} /></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Inventory</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-[#8B5CF6] leading-tight">{stats.totalAssets}</h2>
              <p className={`text-[10px] font-medium ${theme.subText}`}>Total Assets</p>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-4 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Used</span><span className="text-sm font-bold text-slate-500">{stats.usedAssets}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Stock</span><span className="text-sm font-bold text-emerald-500">{stats.inStockAssets}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Discard</span><span className="text-sm font-bold text-[#F97316]">{stats.discardedAssets}</span></div>
            </div>
          </div>

          {/* VERIFICATIONS (Removed Total Column) */}
          <div className={`${theme.card} p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-[#F97316]/10 text-[#F97316]' : 'bg-[#fff7ed] text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white'}`}>{stats.pendingInspections > 0 ? <AlertCircle size={18} /> : <ClipboardCheck size={18} />}</div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Verifications</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-[#F97316] leading-tight">{stats.totalVerifications}</h2>
              <p className={`text-[10px] font-medium ${theme.subText}`}>Total Requests</p>
            </div>
            <div className={`grid grid-cols-2 gap-2 mt-4 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Resolved</span><span className="text-sm font-bold text-emerald-500">{stats.resolvedInspections}</span></div>
              <div className="flex flex-col border-l pl-3 border-slate-100 dark:border-zinc-800"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Pending</span><span className={`text-sm font-bold ${stats.pendingInspections > 0 ? 'text-[#F97316]' : theme.text}`}>{stats.pendingInspections}</span></div>
            </div>
          </div>

          {/* HELPDESK (Added Resolved, Removed Total Column) */}
          <div className={`${theme.card} p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'bg-[#f3e8ff] text-[#8B5CF6] group-hover:bg-[#8B5CF6] group-hover:text-white'}`}><Ticket size={18} /></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Helpdesk</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-[#8B5CF6] leading-tight">{stats.totalTickets}</h2>
              <p className={`text-[10px] font-medium ${theme.subText}`}>Total Tickets</p>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-4 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Resolved</span><span className="text-sm font-bold text-emerald-500">{stats.resolvedTickets}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Process</span><span className="text-sm font-bold text-[#8B5CF6]">{stats.inProcessTickets}</span></div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Pending</span><span className={`text-sm font-bold ${stats.pendingTickets > 0 ? 'text-[#F97316]' : theme.text}`}>{stats.pendingTickets}</span></div>
            </div>
          </div>

          {/* NETWORK (Removed Total, accurate Staff logic) */}
          <div className={`${theme.card} p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-[#F97316]/10 text-[#F97316]' : 'bg-[#fff7ed] text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white'}`}><Users size={18} /></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Network</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-[#F97316] leading-tight">{stats.totalStaff}</h2>
              <p className={`text-[10px] font-medium ${theme.subText}`}>Total Staff</p>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-4 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col">
                <span className={`text-[9px] uppercase font-bold flex items-center gap-1 ${theme.subText}`}><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
                <span className="text-sm font-bold text-emerald-500">{stats.onlineStaff}</span>
              </div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800">
                <span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Off</span>
                <span className="text-sm font-bold text-slate-500">{stats.offlineStaff}</span>
              </div>
              <div className="flex flex-col border-l pl-2 border-slate-100 dark:border-zinc-800">
                <span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Deact</span>
                <span className="text-sm font-bold text-rose-500">{stats.deactivatedStaff}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🟢 SYSTEM MODULES & LIVE ACTIVITY LOG */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-0 pb-4 lg:pb-0">
          
          <div className="w-full lg:w-[72%] flex flex-col gap-3">
            <h3 className={`text-[11px] font-extrabold uppercase tracking-widest pl-1 shrink-0 ${theme.subText}`}>System Modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 flex-1 overflow-y-auto lg:overflow-visible">
              {[
                { title: 'Review Inspections', desc: 'Audit smartphone visual submissions and approve hardware.', icon: ClipboardCheck, path: '/admin/inspections', color: '#F97316', badge: stats.pendingInspections },
                { title: 'Asset Registry', desc: 'Manage full hardware lifecycle, assignments, and serial tags.', icon: Laptop, path: '/admin/assets', color: '#8B5CF6', badge: 0 },
                { title: 'Return Requests', desc: 'Manage hardware returns and physical asset handovers.', icon: LogOut, path: '/admin/returns', color: '#F97316', badge: stats.returnRequests },
                { title: 'Replacements', desc: 'Process device swap requests and hardware upgrades.', icon: RefreshCw, path: '/admin/replacements', color: '#8B5CF6', badge: stats.replacementRequests },
                { title: 'IT Helpdesk', desc: 'Resolve staff hardware issues and repair requests.', icon: Ticket, path: '/admin/tickets', color: '#8B5CF6', badge: stats.pendingTickets }, // Fixes build error
                { title: 'Staff Directory', desc: 'Manage employee access codes and profile data.', icon: Users, path: '/admin/staff', color: '#F97316', badge: 0 },
                { title: 'Remote Access', desc: 'View and control staff screens securely for live support.', icon: Monitor, path: '/admin/remote', color: '#8B5CF6', badge: 0 },
                { title: 'Reports & Analytics', desc: 'Generate hardware breakdowns, asset matrices, and PDF exports.', icon: BarChart3, path: '/admin/reports', color: '#8B5CF6', badge: 0 },
              ].map((m, i) => {
                const isOrange = m.color === '#F97316';
                return (
                  <button 
                    key={i} 
                    onClick={() => router.push(m.path)} 
                    className={`text-left cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-xl ${isOrange ? 'hover:shadow-[#F97316]/10 hover:border-[#F97316]/30' : 'hover:shadow-[#8B5CF6]/10 hover:border-[#8B5CF6]/30'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`relative w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${isOrange ? 'bg-[#fff7ed] text-[#F97316]' : 'bg-[#f3e8ff] text-[#8B5CF6]'}`}>
                        <m.icon size={24} strokeWidth={2.2} />
                        {m.badge > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-rose-500 shadow-sm border-2 border-white">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold tracking-tight text-slate-800">{m.title}</h4>
                    </div>
                    
                    <p className="text-[11px] font-medium leading-relaxed mb-4 text-slate-500 flex-1">{m.desc}</p>
                    
                    <div className="mt-auto self-end">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 group-hover:translate-x-1.5 ${isOrange ? 'bg-[#fff7ed] text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white' : 'bg-[#f3e8ff] text-[#8B5CF6] group-hover:bg-[#8B5CF6] group-hover:text-white'}`}>
                        <ArrowRight size={18} strokeWidth={2.5} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full lg:w-[28%] flex flex-col gap-3 h-[400px] lg:h-full">
            <h3 className={`text-[11px] font-extrabold uppercase tracking-widest pl-1 shrink-0 ${theme.subText}`}>Live Activity Log</h3>
            <div className={`${theme.card} rounded-2xl border p-5 flex-1 flex flex-col overflow-hidden shadow-sm`}>
              {recentActivity.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                  <Activity size={28} className={`${theme.subText} mb-3`} />
                  <p className={`text-xs font-bold ${theme.subText}`}>Waiting for live events...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {recentActivity.map((log: any, i: number) => (
                    <div key={i} className={`flex gap-3 relative pb-4 border-b last:border-0 last:pb-0 ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                      <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center border transition-all ${log.logTheme}`}>
                        <Clock size={14} />
                      </div>
                      <div className="pt-0.5">
                        <p className={`text-xs font-bold leading-tight ${theme.text}`}>{log.displayName}</p>
                        <p className={`text-[11px] font-medium mt-0.5 ${theme.subText}`}>Submitted a system request.</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">{timeAgo(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => router.push('/admin/inspections')} className="mt-4 w-full py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all duration-300 bg-white text-slate-600 border-slate-200 hover:border-[#8B5CF6]/50 hover:text-[#8B5CF6] hover:shadow-sm">
                View Entire Log
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 🚀 TOP-BAR BROADCAST ANNOUNCEMENT MODAL */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className={`rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-5 animate-in zoom-in-95 duration-300 ${theme.card}`}>
            <div className={`flex justify-between items-center pb-4 border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <h3 className={`text-base font-extrabold flex items-center gap-2 uppercase tracking-wide ${theme.text}`}>
                <Megaphone size={20} className="text-[#F97316]" /> Broadcast Announcement
              </h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} className={`p-2 rounded-full transition-colors hover:scale-110 ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.subText}`}>Message Text *</label>
                <textarea rows={3} required placeholder="Type an announcement to broadcast..." value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none text-sm font-medium transition-all resize-none bg-slate-50 focus:bg-white focus:border-[#8B5CF6]" />
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsBroadcastModalOpen(false)} className="flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all bg-white border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                <button disabled={isBroadcasting} type="submit" className="flex-1 py-3 bg-[#8B5CF6] hover:bg-[#7c3aed] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest shadow-sm">
                  {isBroadcasting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}