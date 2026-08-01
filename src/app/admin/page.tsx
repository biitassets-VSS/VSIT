'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, Laptop, ClipboardCheck, Ticket, 
  Activity, ArrowRight, AlertCircle, Clock,
  AlertTriangle, Monitor, Megaphone, 
  Send, Loader2, ImagePlus, X, LogOut, RefreshCw, 
  BarChart3, Cpu
} from 'lucide-react';

const timeAgo = (dateString: string) => {
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

export default function AdminDashboardPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastImage, setBroadcastImage] = useState<File | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const [presenceOnlineCount, setPresenceOnlineCount] = useState(0);

  const [stats, setStats] = useState({
    totalAssets: 0, usedAssets: 0, inStockAssets: 0, discardedAssets: 0,
    totalVerifications: 0, resolvedInspections: 0, pendingInspections: 0,
    totalTickets: 0, resolvedTickets: 0, pendingTickets: 0, inProcessTickets: 0,
    totalStaff: 0, onlineStaff: 0, offlineStaff: 0, deactivatedStaff: 0,
    returnRequests: 0, replacementRequests: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    loadAdminData();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();

    const handleOpenBroadcast = () => setIsBroadcastModalOpen(true);
    window.addEventListener('open-broadcast-modal', handleOpenBroadcast);

    return () => {
      observer.disconnect();
      window.removeEventListener('open-broadcast-modal', handleOpenBroadcast);
    };
  }, []);

  // 🌟 SUPABASE REALTIME PRESENCE ENGINE
  useEffect(() => {
    const presenceChannel = supabase.channel('vsit_online_presence');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setPresenceOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ admin: 'admin_dashboard', online_at: new Date().toISOString() });
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, []);

  const triggerDesktopAlert = (title: string, body: string) => {
    try { const audio = new Audio('/alert.mp3'); audio.play().catch(() => {}); } catch (err) {}
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: '/logo.png' });
  };

  useEffect(() => {
    const adminChannel = supabase
      .channel('admin-live-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_role=eq.admin` }, (payload) => {
        triggerDesktopAlert(payload.new.title || 'System Alert', payload.new.message || 'New notification received.');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => loadAdminData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => loadAdminData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => loadAdminData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadAdminData(false))
      .subscribe();
    return () => { supabase.removeChannel(adminChannel); };
  }, []);

  const handleSecureLogout = async () => {
    localStorage.clear(); sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.href = '/'; 
  };

  const loadAdminData = async (showSpin = true) => {
    if (showSpin) setIsRefreshing(true);
    const rawSession = localStorage.getItem('vsit_admin_session') || localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');

    if (!rawSession) { window.location.replace('/'); return; }

    try {
      let activeUser: any = {};
      try { activeUser = JSON.parse(rawSession); } catch (e) { activeUser = { name: rawSession.split('@')[0], email: rawSession }; }
      
      const cleanEmail = activeUser.email?.toLowerCase().trim();
      if (cleanEmail !== 'lakhwinder.bi@outlook.com' && activeUser.role !== 'admin') {
        await supabase.auth.signOut(); localStorage.clear();
        setAuthError('Access Denied: You do not possess administrative clearance.'); return;
      }

      setAdminName(activeUser.full_name || activeUser.name || 'System Admin');

      const [
        { data: assets }, { data: inspections }, { data: tickets }, staffRes
      ] = await Promise.all([
        supabase.from('assets').select('id, status'),
        supabase.from('inspections').select('*, assets(asset_name)').order('created_at', { ascending: false }),
        supabase.from('tickets').select('*'),
        supabase.from('profiles').select('*')
      ]);

      const staffData = staffRes.data || [];
      const inspData = inspections || [];
      const tktData = tickets || [];
      const assetsData = assets || [];

      let usedAssetsCount = 0, inStockAssetsCount = 0, discardedAssetsCount = 0, returnRequestsCount = 0, replacementRequestsCount = 0;
      assetsData.forEach(a => {
        const s = (a.status || '').toLowerCase().trim();
        if (s.includes('return request')) returnRequestsCount++;
        else if (s.includes('replace')) replacementRequestsCount++;
        if (['use', 'assign', 'allocat', 'deploy', 'active'].some(k => s.includes(k))) usedAssetsCount++;
        else if (['discard', 'retire', 'scrap', 'broken', 'lost', 'missing', 'stolen', 'damage'].some(k => s.includes(k))) discardedAssetsCount++;
        else inStockAssetsCount++;
      });

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

      let pendingTicketsCount = 0, inProcessTicketsCount = 0, resolvedTicketsCount = 0;
      tktData.forEach(t => {
        const s = (t.status || '').toLowerCase().trim();
        if (['resolv', 'clos', 'complet', 'done'].some(k => s.includes(k))) resolvedTicketsCount++;
        else if (['process', 'progress', 'repair', 'active'].some(k => s.includes(k))) inProcessTicketsCount++;
        else pendingTicketsCount++;
      });

      let dbOnlineCount = 0, deactivatedCount = 0;
      const now = new Date().getTime();
      staffData.forEach(s => {
        const statusStr = (s.status || '').toLowerCase().trim();
        const roleStr = (s.role || '').toLowerCase().trim();
        const isDeactivated = s.is_active === false || ['deactivat', 'suspend', 'ban', 'block', 'revoke'].some(k => statusStr.includes(k)) || ['deactivat', 'suspend', 'ban', 'block', 'revoke'].some(k => roleStr.includes(k));

        if (isDeactivated) { deactivatedCount++; return; }

        let isOnline = s.is_online === true || String(s.is_online).toLowerCase() === 'true' || s.is_online === 1 || statusStr === 'online' || statusStr === 'live';
        if (!isOnline) {
          const hasRecentInspection = inspData.some(i => (i.user_email?.toLowerCase() === s.email?.toLowerCase() || i.inspected_by === s.id) && (now - new Date(i.created_at).getTime()) < 30 * 60000);
          const hasRecentTicket = tktData.some(t => (t.created_by?.toLowerCase() === s.email?.toLowerCase() || t.user_id === s.id) && (now - new Date(t.created_at).getTime()) < 30 * 60000);
          if (hasRecentInspection || hasRecentTicket) isOnline = true;
        }
        if (isOnline) dbOnlineCount++;
      });

      const finalOnlineCount = Math.max(presenceOnlineCount, dbOnlineCount, 1);
      const offlineCount = Math.max(0, staffData.length - finalOnlineCount - deactivatedCount);

      const formattedRecentLogs = inspData.slice(0, 6).map(log => {
        // 🌟 FIX: Check multiple fields to reliably find the user profile
        const matchedProfile = staffData.find(p => 
          (log.user_email && p.email?.toLowerCase() === log.user_email.toLowerCase()) || 
          (log.user_id && p.id === log.user_id) ||
          (log.inspected_by && p.id === log.inspected_by) ||
          (log.created_by && p.id === log.created_by)
        );
        
        let displayName = 'A user'; 
        let empCode = '';

        if (matchedProfile) {
          displayName = matchedProfile.full_name || matchedProfile.name || displayName;
          empCode = matchedProfile.emp_code || '';
        } else if (log.user_email) {
          displayName = log.user_email.split('@')[0];
        }

        const statusText = (log.status || '').toLowerCase();
        let logTheme = 'text-purple-600 bg-purple-500/10 border-purple-500/20'; 
        if (statusText.includes('pending') || statusText === '') logTheme = 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        if (statusText.includes('resolv') || statusText.includes('approv')) logTheme = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        
        return { ...log, displayName, empCode, logTheme };
      });

      setStats({
        totalAssets: assetsData.length || 0, usedAssets: usedAssetsCount, inStockAssets: inStockAssetsCount, discardedAssets: discardedAssetsCount,
        totalVerifications: inspData.length, resolvedInspections: resolvedCount, pendingInspections: pendingCount,
        totalTickets: tktData.length, resolvedTickets: resolvedTicketsCount, pendingTickets: pendingTicketsCount, inProcessTickets: inProcessTicketsCount,
        totalStaff: staffData.length, onlineStaff: finalOnlineCount, offlineStaff: offlineCount, deactivatedStaff: deactivatedCount,
        returnRequests: returnRequestsCount, replacementRequests: replacementRequestsCount
      });
      
      setRecentActivity(formattedRecentLogs);
      setLoading(false); setIsRefreshing(false);
    } catch (e) { console.error('Data load error:', e); setLoading(false); setIsRefreshing(false); }
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
      alert("Announcement broadcasted successfully!");
    } catch (err: any) { alert(`Failed: ${err.message}`); } finally { setIsBroadcasting(false); }
  };

  // 🎨 PURE MAC OS 2026 PREMIUM GLASS THEME
  const theme = {
    bg: isDarkMode ? 'bg-[#09090b]' : 'bg-[#f0f4f8]',
    // Perfectly transparent glass with strong blur, NO opaque backgrounds on hover
    glassCard: isDarkMode 
      ? 'bg-[#18181b]/40 backdrop-blur-2xl border border-white/10 shadow-lg' 
      : 'bg-white/40 backdrop-blur-2xl border border-white/60 shadow-sm',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  if (authError) return (
    <div className={`w-full h-screen flex flex-col items-center justify-center ${theme.bg}`}>
      <AlertTriangle size={48} className="text-rose-500 mb-4" />
      <h1 className={`text-2xl font-bold ${theme.text}`}>Authorization Failed</h1>
      <button onClick={handleSecureLogout} className="mt-4 px-6 py-2 rounded-xl font-bold bg-white text-slate-700 shadow-sm border border-slate-200">Secure Logout</button>
    </div>
  );

  if (loading) return (
    <div className={`w-full h-screen flex flex-col items-center justify-center ${theme.bg}`}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-4"></div>
      <p className={`text-xs font-bold uppercase tracking-widest ${theme.subText}`}>Loading Enterprise Data...</p>
    </div>
  );

  return (
    // 🌟 100% DESKTOP FREEZE (ABSOLUTE INSET-0 + OVERFLOW-HIDDEN)
    // On Mobile: Allows natural vertical scrolling
    <div className={`absolute inset-0 w-full h-full lg:overflow-hidden overflow-y-auto flex flex-col ${theme.bg} font-sans antialiased z-0`}>
      
      {/* 🌟 ENHANCED AMBIENT NEON ORBS FOR PURE GLASS BLUR */}
      <div className="fixed top-[-10%] left-[0%] w-[50vw] h-[50vh] bg-orange-500/20 dark:bg-orange-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[0%] w-[50vw] h-[50vh] bg-purple-600/20 dark:bg-purple-700/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col max-w-400 mx-auto w-full p-4 lg:p-6 gap-5 h-full lg:min-h-0 z-10">
        
        {/* 🌟 HEADER WITH SYNC BUTTON */}
        {/* Removed overflow-hidden so the sync button shadow doesn't clip */}
        <div className={`${theme.glassCard} rounded-2xl p-4 border flex items-center justify-between shrink-0 transition-all`}>
          <Link href="/admin" className="flex items-center gap-4 group">
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg ${isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 'bg-orange-50 border-orange-200 text-orange-500'}`}>
              <Cpu className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className={`text-base lg:text-lg font-extrabold tracking-tight leading-none ${theme.text}`}>IT Asset & Service Management</h1>
              <p className={`text-[11px] font-medium mt-1.5 ${theme.subText}`}>Welcome back, <span className="font-bold">{adminName}</span>. Here is your live IT infrastructure status.</p>
            </div>
          </Link>

          <button 
            onClick={() => loadAdminData(true)} 
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-orange-500 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-orange-500/20 disabled:opacity-50 shrink-0 border border-white/20 active:scale-95"
            title="Refresh Live Data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Sync Feeds</span>
          </button>
        </div>

        {/* 📊 THUMBNAIL STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          
          <div className={`${theme.glassCard} p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-500/30 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg transition-all duration-300 group-hover:scale-110 ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100/80 text-purple-600'}`}><Laptop size={16} /></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Inventory</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-purple-600 dark:text-purple-400 leading-none mb-1.5">{stats.totalAssets}</h2>
              <p className={`text-[10px] font-bold ${theme.subText}`}>Total Assets</p>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
              <div className="flex flex-col"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Used</span><span className={`text-xs font-black ${theme.text}`}>{stats.usedAssets}</span></div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Stock</span><span className="text-xs font-black text-emerald-500">{stats.inStockAssets}</span></div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Discard</span><span className="text-xs font-black text-orange-500">{stats.discardedAssets}</span></div>
            </div>
          </div>

          <div className={`${theme.glassCard} p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-500/30 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg transition-all duration-300 group-hover:scale-110 ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100/80 text-orange-600'}`}>{stats.pendingInspections > 0 ? <AlertCircle size={16} /> : <ClipboardCheck size={16} />}</div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Verifications</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-orange-600 dark:text-orange-400 leading-none mb-1.5">{stats.totalVerifications}</h2>
              <p className={`text-[10px] font-bold ${theme.subText}`}>Total Requests</p>
            </div>
            <div className={`grid grid-cols-2 gap-2 mt-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
              <div className="flex flex-col"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Resolved</span><span className="text-xs font-black text-emerald-500">{stats.resolvedInspections}</span></div>
              <div className={`flex flex-col border-l pl-3 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Pending</span><span className={`text-xs font-black ${stats.pendingInspections > 0 ? 'text-orange-500' : theme.text}`}>{stats.pendingInspections}</span></div>
            </div>
          </div>

          <div className={`${theme.glassCard} p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-500/30 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg transition-all duration-300 group-hover:scale-110 ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100/80 text-purple-600'}`}><Ticket size={16} /></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Helpdesk</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-purple-600 dark:text-purple-400 leading-none mb-1.5">{stats.totalTickets}</h2>
              <p className={`text-[10px] font-bold ${theme.subText}`}>Total Tickets</p>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
              <div className="flex flex-col"><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Resolved</span><span className="text-xs font-black text-emerald-500">{stats.resolvedTickets}</span></div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Process</span><span className="text-xs font-black text-purple-600 dark:text-purple-400">{stats.inProcessTickets}</span></div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}><span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Pending</span><span className={`text-xs font-black ${stats.pendingTickets > 0 ? 'text-orange-500' : theme.text}`}>{stats.pendingTickets}</span></div>
            </div>
          </div>

          <div className={`${theme.glassCard} p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-500/30 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg transition-all duration-300 group-hover:scale-110 ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100/80 text-orange-600'}`}><Users size={16} /></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Network</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-orange-600 dark:text-orange-400 leading-none mb-1.5">{stats.totalStaff}</h2>
              <p className={`text-[10px] font-bold ${theme.subText}`}>Total Staff</p>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
              <div className="flex flex-col">
                <span className={`text-[9px] uppercase font-bold flex items-center gap-1 ${theme.subText}`}><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
                <span className="text-xs font-black text-emerald-500">{stats.onlineStaff}</span>
              </div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
                <span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Off</span>
                <span className={`text-xs font-black ${theme.text}`}>{stats.offlineStaff}</span>
              </div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
                <span className={`text-[9px] uppercase font-bold ${theme.subText}`}>Deact</span>
                <span className="text-xs font-black text-rose-500">{stats.deactivatedStaff}</span>
              </div>
            </div>
          </div>

        </div>

        {/* 🟢 SYSTEM MODULES & LIVE ACTIVITY LOG */}
        <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:min-h-0 lg:overflow-hidden pt-2">
          
          <div className="w-full lg:w-[72%] flex flex-col lg:min-h-0 lg:overflow-hidden">
            {/* 🌟 Added extra bottom margin to the title for better spacing */}
            <h3 className={`text-[11px] font-extrabold uppercase tracking-widest pl-1 shrink-0 mb-3 ${theme.subText}`}>System Modules</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar content-start pb-6 pr-1">
              {[
                { title: 'Review Inspections', desc: 'Audit visual submissions & approve hardware.', icon: ClipboardCheck, path: '/admin/inspections', color: '#F97316', badge: stats.pendingInspections },
                { title: 'Asset Registry', desc: 'Manage hardware lifecycle and serial tags.', icon: Laptop, path: '/admin/assets', color: '#8B5CF6', badge: 0 },
                { title: 'Return Requests', desc: 'Manage hardware returns & handovers.', icon: LogOut, path: '/admin/returns', color: '#F97316', badge: stats.returnRequests },
                { title: 'Replacements', desc: 'Process device swaps & hardware upgrades.', icon: RefreshCw, path: '/admin/replacements', color: '#8B5CF6', badge: stats.replacementRequests },
                { title: 'IT Helpdesk', desc: 'Resolve hardware issues & repair tickets.', icon: Ticket, path: '/admin/tickets', color: '#8B5CF6', badge: stats.pendingTickets },
                { title: 'Staff Directory', desc: 'Manage employee access codes & profiles.', icon: Users, path: '/admin/staff', color: '#F97316', badge: 0 },
                { title: 'Remote Access', desc: 'Control staff screens securely for support.', icon: Monitor, path: '/admin/remote', color: '#8B5CF6', badge: 0 },
                { title: 'Reports & Analytics', desc: 'Generate hardware matrices & PDF exports.', icon: BarChart3, path: '/admin/reports', color: '#8B5CF6', badge: 0 },
              ].map((m, i) => {
                const isOrange = m.color === '#F97316';
                return (
                  <button 
                    key={i} 
                    onClick={() => router.push(m.path)} 
                    // 🌟 FIXED HEIGHT CARD (h-[135px]) ELIMINATES SHRINKAGE & EMPTY SPACE 
                    className={`text-left cursor-pointer h-33.75 p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 ease-out group ${theme.glassCard} hover:-translate-y-1 hover:shadow-xl ${isOrange ? 'hover:shadow-orange-500/10 hover:border-orange-500/40' : 'hover:shadow-purple-500/10 hover:border-purple-500/40'}`}
                  >
                    <div className="flex items-start justify-between w-full relative">
                      <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${isOrange ? (isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100/80 text-orange-600') : (isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100/80 text-purple-600')}`}>
                        <m.icon size={20} strokeWidth={2.2} />
                        {m.badge > 0 && (
                          // 🌟 POSITIONED BADGE OUTSIDE OVERFLOW TO PREVENT CLIPPING
                          <span className="absolute -top-2.5 -right-2.5 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-linear-to-br from-rose-500 to-red-600 shadow-sm border border-white dark:border-[#18181b] z-50">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 ${isOrange ? 'bg-[#fff7ed] text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white dark:bg-white/10 dark:text-zinc-400 dark:group-hover:bg-orange-500 dark:group-hover:text-white' : 'bg-[#f3e8ff] text-[#8B5CF6] group-hover:bg-[#8B5CF6] group-hover:text-white dark:bg-white/10 dark:text-zinc-400 dark:group-hover:bg-purple-500 dark:group-hover:text-white'}`}>
                        <ArrowRight size={14} strokeWidth={2.5} />
                      </div>
                    </div>
                    <div>
                      <h4 className={`text-[14px] font-bold tracking-tight leading-tight ${theme.text}`}>{m.title}</h4>
                      <p className={`text-[11px] font-medium mt-1.5 leading-snug line-clamp-2 ${theme.subText}`}>{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LIVE ACTIVITY LOG SIDEBAR */}
          <div className="w-full lg:w-[28%] flex flex-col lg:min-h-0 lg:overflow-hidden pb-4 lg:pb-0">
            <h3 className={`text-[11px] font-extrabold uppercase tracking-widest pl-1 shrink-0 mb-3 ${theme.subText}`}>Live Activity Log</h3>
            <div className={`${theme.glassCard} rounded-2xl p-5 flex-1 flex flex-col lg:min-h-0 lg:overflow-hidden`}>
              {recentActivity.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                  <Activity size={28} className={`${theme.subText} mb-3`} />
                  <p className={`text-[13px] font-bold ${theme.subText}`}>Waiting for live events...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {recentActivity.map((log: any, i: number) => (
                    <div key={i} className={`flex gap-3 relative pb-4 border-b last:border-0 last:pb-0 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
                      <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center border transition-all ${log.logTheme}`}>
                        <Clock size={14} strokeWidth={2.5} />
                      </div>
                      <div className="pt-0.5 min-w-0">
                        {/* 🌟 FIX: Updated rendering to show Name AND Employee ID Tag */}
                        <p className={`text-[14px] font-bold leading-tight flex items-center gap-2 truncate ${theme.text}`}>
                          <span className="truncate">{log.displayName}</span>
                          {log.empCode && (
                            <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-500'}`}>
                              {log.empCode}
                            </span>
                          )}
                        </p>
                        <p className={`text-[11px] font-medium mt-1 truncate ${theme.subText}`}>Submitted system request.</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{timeAgo(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => router.push('/admin/inspections')} className={`mt-4 w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all duration-300 cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300' : 'bg-white/50 border-slate-200/60 hover:bg-white text-slate-700 hover:shadow-sm'}`}>
                View Entire Log
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ANNOUNCEMENT MODAL */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-5 animate-in zoom-in-95 duration-300 ${theme.glassCard}`}>
            <div className={`flex justify-between items-center pb-4 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
              <h3 className={`text-sm font-black flex items-center gap-2 uppercase tracking-widest ${theme.text}`}>
                <Megaphone size={18} className="text-orange-500" /> Broadcast Announcement
              </h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} className={`p-2 rounded-full transition-all hover:scale-110 cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-white/50 text-slate-500'}`}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.subText}`}>Message Text *</label>
                <textarea 
                  rows={3} 
                  required 
                  placeholder="Type an announcement to broadcast..." 
                  value={broadcastMessage} 
                  onChange={e => setBroadcastMessage(e.target.value)} 
                  className={`w-full p-3 rounded-xl border outline-none text-xs font-medium transition-all resize-none shadow-inner focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                    isDarkMode 
                      ? 'bg-black/20 border-white/10 text-zinc-200' 
                      : 'bg-white/50 border-slate-200/60 text-slate-800'
                  }`} 
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.subText}`}>Attach Graphic / Flyer (Optional)</label>
                <label className={`cursor-pointer w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${
                  isDarkMode 
                    ? 'bg-black/20 border-white/10 text-zinc-400 hover:bg-white/5 hover:border-purple-500/50' 
                    : 'bg-white/50 border-slate-200 text-slate-500 hover:bg-white hover:border-purple-500/50'
                }`}>
                  <ImagePlus size={24} className={broadcastImage ? "text-purple-500" : "opacity-50"} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{broadcastImage ? `Attached: ${broadcastImage.name}` : 'Click to browse image file'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setBroadcastImage(e.target.files ? e.target.files[0] : null)} />
                </label>
                {broadcastImage && <button type="button" onClick={() => setBroadcastImage(null)} className="text-[10px] text-rose-500 hover:underline mt-2 font-bold uppercase tracking-widest flex items-center gap-1 cursor-pointer"><X size={12} /> Remove attached file</button>}
              </div>
              <div className={`flex gap-3 pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
                <button type="button" onClick={() => setIsBroadcastModalOpen(false)} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                  Cancel
                </button>
                <button disabled={isBroadcasting} type="submit" className="flex-1 py-3 bg-linear-to-r from-orange-500 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest shadow-lg shadow-orange-500/20 cursor-pointer active:scale-95">
                  {isBroadcasting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}