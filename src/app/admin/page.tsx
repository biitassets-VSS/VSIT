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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
        const tix = payload.new;
        const title = 'New IT Ticket Raised';
        const msg = `${tix.staff_name || 'A staff member'} submitted a ticket: ${tix.title}`;
        triggerDesktopAlert(title, msg);
        setNotifications(prev => [{ id: `local-ticket-${Date.now()}`, title, message: msg, target_role: 'admin', is_read: false }, ...prev]);
        loadAdminData(); 
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inspections' }, (payload) => {
        const title = 'New Asset Inspection';
        const msg = 'A device inspection was just submitted and requires your review.';
        triggerDesktopAlert(title, msg);
        setNotifications(prev => [{ id: `local-insp-${Date.now()}`, title, message: msg, target_role: 'admin', is_read: false }, ...prev]);
        loadAdminData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, (payload) => {
        const newAsset = payload.new;
        const oldAsset = payload.old;

        if (newAsset.status === 'Return Requested' && oldAsset.status !== 'Return Requested') {
          const title = 'Asset Return Requested';
          const msg = `A staff member has requested to return: ${newAsset.name || newAsset.model}`;
          triggerDesktopAlert(title, msg);
          setNotifications(prev => [{ id: `local-ret-${Date.now()}`, title, message: msg, target_role: 'admin', is_read: false }, ...prev]);
          loadAdminData();
        }

        if (newAsset.status === 'Replacement Requested' && oldAsset.status !== 'Replacement Requested') {
          const title = 'Asset Replacement Requested';
          const msg = `A staff member has requested a replacement for: ${newAsset.name || newAsset.model}`;
          triggerDesktopAlert(title, msg);
          setNotifications(prev => [{ id: `local-rep-${Date.now()}`, title, message: msg, target_role: 'admin', is_read: false }, ...prev]);
          loadAdminData();
        }
      })
      // 🔴 REAL-TIME: Listen for profile/staff updates to catch live log-ins
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadAdminData();
      })
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
        supabase.from('inspections').select('*, assets(asset_name)')
          .not('notes', 'ilike', '%[RETURN REQUEST]%')
          .not('status', 'ilike', '%Return%')
          .not('notes', 'ilike', '%[REPLACEMENT REQUEST]%')
          .not('status', 'ilike', '%Replace%')
          .order('created_at', { ascending: false }),
        supabase.from('tickets').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('notifications').select('*').eq('target_role', 'admin').eq('is_read', false).order('created_at', { ascending: false })
      ]);

      const staffData = staffRes.data || [];
      const inspData = inspections || [];
      const tktData = tickets || [];
      const assetsData = assets || [];

      const pendingCount = inspData.filter(i => {
        const s = (i.status || '').toLowerCase().trim();
        const inspBy = (i.inspected_by || '').toLowerCase();
        const notes = (i.notes || '').toLowerCase();
        
        if (s !== 'pending' && s !== 'pending review') return false;
        if (inspBy === 'admin' || inspBy === 'system') return false;
        if (notes.includes('asset configuration updated') || notes.includes('asset initially registered')) return false;

        return true;
      }).length;

      const usedAssetsCount = assetsData.filter(a => ['Assigned', 'In Use'].includes(a.status)).length;
      const inStockAssetsCount = assetsData.filter(a => ['Available', 'In Stock', 'Unassigned'].includes(a.status)).length;
      const discardedAssetsCount = assetsData.filter(a => ['Discarded', 'Retired', 'Broken'].includes(a.status)).length;
      
      const pendingTicketsCount = tktData.filter(t => ['open', 'pending'].includes((t.status || '').toLowerCase())).length;
      const inProcessTicketsCount = tktData.filter(t => ['in_progress', 'in_repair', 'active'].includes((t.status || '').toLowerCase())).length;
      const totalActiveTickets = pendingTicketsCount + inProcessTicketsCount;

      // 🔴 REAL DATA ONLY: Count strictly by database flag, fallback removed.
      const liveStaffCount = staffData.filter(s => s.is_online === true || s.status?.toLowerCase() === 'online').length;

      const returnRequestsCount = assetsData.filter(a => a.status === 'Return Requested').length;
      const replacementRequestsCount = assetsData.filter(a => a.status === 'Replacement Requested').length;

      if (notifRes.data) {
        setNotifications(prev => {
          const localOnly = prev.filter(n => String(n.id).startsWith('local-'));
          return [...localOnly, ...notifRes.data];
        });
      }

      const formattedRecentLogs = inspData.slice(0, 8).map(log => {
        const matchedProfile = staffData.find(p => p.email?.toLowerCase() === log.user_email?.toLowerCase() || p.id === log.inspected_by);
        let displayName = log.user_email?.split('@')[0] || 'A user'; 
        
        if (matchedProfile) {
          const name = matchedProfile.full_name || matchedProfile.name || displayName;
          const empCode = matchedProfile.emp_code || matchedProfile.emp_id || 'N/A';
          displayName = `${name} (${empCode})`;
        }
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
        totalStaff: staffData.length, // NOTE: If this is 0, check RLS policies on your 'profiles' table.
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
        const fileExt = broadcastImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('broadcasts').upload(fileName, broadcastImage);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('broadcasts').getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      }

      await supabase.from('broadcasts').insert({ message: broadcastMessage.trim(), created_by: adminName, image_url: finalImageUrl });

      const { error: notifError } = await supabase.from('notifications').insert({
        title: "System Broadcast",
        message: finalImageUrl ? `${broadcastMessage.trim()} (Image Attached)` : broadcastMessage.trim(),
        target_user: null, is_read: false, type: 'broadcast' 
      });

      if (notifError) throw notifError;
      
      setBroadcastMessage(''); setBroadcastImage(null); setIsBroadcastModalOpen(false);
      alert("Announcement successfully broadcasted to all staff dashboards!");
    } catch (err: any) {
      console.error(err); alert(`Failed to send broadcast: ${err.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (authError) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-6 bg-[#F8FAFC] p-4 text-center antialiased">
        <div className="p-6 bg-rose-50 text-rose-500 rounded-full border border-rose-200 shadow-sm">
          <AlertTriangle size={48} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Authorization Failed</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">{authError}</p>
        </div>
        <button onClick={handleSecureLogout} className="px-8 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-95">
          Secure Logout & Return
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`w-full h-screen flex flex-col items-center justify-center gap-4 antialiased ${isDarkMode ? 'bg-zinc-950' : 'bg-[#F8FAFC]'}`}>
        <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${isDarkMode ? 'border-orange-500' : 'border-orange-500'}`}></div>
        <p className={`text-xs font-bold tracking-widest uppercase ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Loading Dashboard Data...</p>
      </div>
    );
  }

  const theme = {
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-[#F8FAFC]',
    card: isDarkMode ? 'bg-[#121212] border-zinc-800/80' : 'bg-white border-slate-200/80',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    cardHover: isDarkMode ? 'hover:border-purple-500/50 hover:bg-zinc-900/50' : 'hover:border-purple-200 hover:shadow-[0_8px_30px_rgb(147,51,234,0.06)] hover:-translate-y-1',
  };

  const getModuleTheme = (color: string) => {
    if (color === 'orange') return {
      iconBg: isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600',
      hoverBtn: 'group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-500/20'
    };
    return {
      iconBg: isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600',
      hoverBtn: 'group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-purple-600/20'
    };
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-10`}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* 🌟 TOP HEADER */}
        <div className={`${theme.card} rounded-3xl p-6 md:p-8 border shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-all duration-300 hover:shadow-md`}>
          <Link href="/admin" className="flex items-center gap-4 group cursor-pointer transition-transform hover:scale-[1.02]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
              <Server size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${theme.text}`}>Systems Overview</h1>
              </div>
              <p className={`text-sm font-semibold ${theme.subText}`}>Welcome back, {adminName}. Here is your IT infrastructure status.</p>
            </div>
          </Link>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <Link href="/admin" className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider border shadow-sm transition-all duration-300 hover:-translate-x-1 ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-slate-300 hover:bg-zinc-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <Home size={16} /> Dashboard
            </Link>

            <button onClick={() => setIsBroadcastModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm shadow-purple-600/20 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer">
              <Megaphone size={16} /> Announcement
            </button>

            <button onClick={() => router.push('/admin/settings')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider border shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${isDarkMode ? 'bg-zinc-900 border-orange-500/30 text-orange-400 hover:bg-orange-500/10' : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'}`}>
              <Settings size={16} /> Portal Settings
            </button>

            {notifications.length > 0 && (
              <button 
                onClick={() => { const el = document.getElementById('actionable-alerts'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                className="relative p-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                title="View Actionable Alerts"
              >
                <Bell size={18} className="animate-bounce" />
                <span className="absolute -top-2 -right-2 bg-rose-600 text-white font-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  {notifications.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 🔔 ACTIONABLE NOTIFICATIONS */}
        {notifications.length > 0 && (
          <div id="actionable-alerts" className="space-y-3 animate-in slide-in-from-top-4 scroll-m-6">
            <h3 className={`text-xs font-bold uppercase tracking-widest pl-1 ${theme.subText} flex items-center gap-2`}>
              <Bell size={14} className="text-rose-500 animate-bounce" /> Action Required ({notifications.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notifications.map(notif => {
                const targetRoute = getActionRoute(notif.title);
                return (
                  <div key={notif.id} className={`${theme.card} p-5 rounded-2xl border shadow-sm flex flex-col justify-between gap-4 transition-all duration-300 hover:shadow-md hover:border-orange-300`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-xl shrink-0 ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold ${theme.text}`}>{notif.title}</h4>
                        <p className={`text-xs mt-1 font-medium line-clamp-2 ${theme.subText}`}>{notif.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                      <button onClick={() => dismissNotification(notif.id)} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200'}`}>
                        <Trash2 size={12} /> Dismiss
                      </button>
                      <button onClick={() => router.push(targetRoute)} className={`flex-[2] py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/20 hover:scale-[1.02] active:scale-95 cursor-pointer`}>
                        Take Action <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 📊 🔴 UPDATED: 2x2 Mobile Grid (grid-cols-2) with scaled down padding/text */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Inventory Thumbnail */}
          <div className={`${theme.card} p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col justify-between transition-all duration-300 ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-colors ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Laptop className="w-5 h-5 sm:w-6 sm:h-6" /></div>
              <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${theme.subText} text-right leading-tight`}>Inventory</span>
            </div>
            <div>
              <h2 className={`text-xl sm:text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400`}>{stats.totalAssets}</h2>
              <p className={`text-[9px] sm:text-[11px] font-semibold mt-0.5 sm:mt-1 ${theme.subText}`}>Total Assets</p>
            </div>
            {/* SUB-METRICS */}
            <div className={`grid grid-cols-3 gap-1 sm:gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col">
                <span className={`text-[8px] sm:text-[9px] uppercase font-bold tracking-wider ${theme.subText}`}>Used</span>
                <span className={`text-xs sm:text-sm font-black ${theme.text}`}>{stats.usedAssets}</span>
              </div>
              <div className="flex flex-col border-l pl-1 sm:pl-2 border-slate-100 dark:border-zinc-800">
                <span className={`text-[8px] sm:text-[9px] uppercase font-bold tracking-wider ${theme.subText}`}>Stock</span>
                <span className={`text-xs sm:text-sm font-black ${theme.text}`}>{stats.inStockAssets}</span>
              </div>
              <div className="flex flex-col border-l pl-1 sm:pl-2 border-slate-100 dark:border-zinc-800">
                <span className={`text-[8px] sm:text-[9px] uppercase font-bold tracking-wider ${theme.subText}`}>Discard</span>
                <span className={`text-xs sm:text-sm font-black text-rose-500`}>{stats.discardedAssets}</span>
              </div>
            </div>
          </div>

          {/* 2. Verification Thumbnail */}
          <div className={`${theme.card} p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${theme.cardHover}`}>
            {stats.pendingInspections > 0 && <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-orange-400/10 rounded-bl-full animate-pulse" />}
            <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
              <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-colors ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                {stats.pendingInspections > 0 ? <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" /> : <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
              </div>
              <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${theme.subText} text-right leading-tight`}>Verifications</span>
            </div>
            <div className="relative z-10">
              <h2 className={`text-xl sm:text-3xl font-black tracking-tight ${stats.pendingInspections > 0 ? 'text-orange-600 dark:text-orange-400' : theme.text}`}>{stats.totalVerifications}</h2>
              <p className={`text-[9px] sm:text-[11px] font-semibold mt-0.5 sm:mt-1 ${theme.subText}`}>Total Requests</p>
            </div>
            {/* SUB-METRICS */}
            <div className={`grid grid-cols-2 gap-1 sm:gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t relative z-10 ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col">
                <span className={`text-[8px] sm:text-[9px] uppercase font-bold tracking-wider ${theme.subText}`}>Total</span>
                <span className={`text-xs sm:text-sm font-black ${theme.text}`}>{stats.totalVerifications}</span>
              </div>
              <div className="flex flex-col border-l pl-2 sm:pl-3 border-slate-100 dark:border-zinc-800">
                <span className={`text-[8px] sm:text-[9px] uppercase font-bold tracking-wider ${theme.subText}`}>Pending</span>
                <span className={`text-xs sm:text-sm font-black ${stats.pendingInspections > 0 ? 'text-orange-500' : theme.text}`}>{stats.pendingInspections}</span>
              </div>
            </div>
          </div>

          {/* 3. Helpdesk Thumbnail */}
          <div className={`${theme.card} p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col justify-between transition-all duration-300 ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-colors ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Ticket className="w-5 h-5 sm:w-6 sm:h-6" /></div>
              <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${theme.subText} text-right leading-tight`}>Helpdesk</span>
            </div>
            <div>
              <h2 className={`text-xl sm:text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400`}>{stats.totalTickets}</h2>
              <p className={`text-[9px] sm:text-[11px] font-semibold mt-0.5 sm:mt-1 ${theme.subText}`}>Total Tickets</p>
            </div>
            {/* SUB-METRICS */}
            <div className={`grid grid-cols-2 gap-1 sm:gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col">
                <span className={`text-[8px] sm:text-[9px] uppercase font-bold tracking-wider ${theme.subText}`}>Pending</span>
                <span className={`text-xs sm:text-sm font-black ${stats.pendingTickets > 0 ? 'text-rose-500' : theme.text}`}>{stats.pendingTickets}</span>
              </div>
              <div className="flex flex-col border-l pl-2 sm:pl-3 border-slate-100 dark:border-zinc-800">
                <span className={`text-[8px] sm:text-[9px] uppercase font-bold tracking-wider ${theme.subText}`}>Process</span>
                <span className={`text-xs sm:text-sm font-black text-orange-500`}>{stats.inProcessTickets}</span>
              </div>
            </div>
          </div>

          {/* 4. Network Thumbnail */}
          <div className={`${theme.card} p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col justify-between transition-all duration-300 ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-colors ${isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><Users className="w-5 h-5 sm:w-6 sm:h-6" /></div>
              <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${theme.subText} text-right leading-tight`}>Network</span>
            </div>
            <div>
              <h2 className={`text-xl sm:text-3xl font-black tracking-tight text-orange-600 dark:text-orange-400`}>{stats.totalStaff}</h2>
              <p className={`text-[9px] sm:text-[11px] font-semibold mt-0.5 sm:mt-1 ${theme.subText}`}>Total Staff</p>
            </div>
            {/* SUB-METRICS */}
            <div className={`grid grid-cols-2 gap-1 sm:gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex flex-col">
                <span className={`text-[8px] sm:text-[9px] uppercase font-bold tracking-wider ${theme.subText}`}>Registered</span>
                <span className={`text-xs sm:text-sm font-black ${theme.text}`}>{stats.totalStaff}</span>
              </div>
              <div className="flex flex-col border-l pl-2 sm:pl-3 border-slate-100 dark:border-zinc-800">
                <span className={`text-[8px] sm:text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 ${theme.subText}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </span>
                <span className={`text-xs sm:text-sm font-black text-emerald-500`}>{stats.liveStaff}</span>
              </div>
            </div>
          </div>

        </div>

        {/* 🌟 SYSTEM MODULES & STRETCHED ACTIVITY LOG */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-widest pl-1 ${theme.subText}`}>System Modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Review Inspections', desc: 'Audit smartphone visual submissions and approve hardware.', icon: ClipboardCheck, path: '/admin/inspections', color: 'orange', badgeCount: stats.pendingInspections },
                { title: 'Asset Registry', desc: 'Manage full hardware lifecycle, assignments, and serial tags.', icon: Laptop, path: '/admin/assets', color: 'purple', badgeCount: 0 },
                { title: 'Return Requests', desc: 'Manage hardware returns and physical asset handovers.', icon: LogOut, path: '/admin/returns', color: 'orange', badgeCount: stats.returnRequests },
                { title: 'Replacements', desc: 'Process device swap requests and hardware upgrades.', icon: RefreshCw, path: '/admin/replacements', color: 'purple', badgeCount: stats.replacementRequests },
                { title: 'IT Helpdesk', desc: 'Resolve staff hardware issues and repair requests.', icon: Ticket, path: '/admin/tickets', color: 'purple', badgeCount: stats.activeTickets },
                { title: 'Staff Directory', desc: 'Manage employee access codes and profile data.', icon: Users, path: '/admin/staff', color: 'orange', badgeCount: 0 },
                { title: 'Remote Access', desc: 'View and control staff screens securely for live support.', icon: Monitor, path: '/admin/remote', color: 'purple', badgeCount: 0 },
                { title: 'Reports & Analytics', desc: 'Generate hardware breakdowns, asset matrices, and PDF exports.', icon: BarChart3, path: '/admin/reports', color: 'purple', badgeCount: 0 },
              ].map((module, i) => {
                const modTheme = getModuleTheme(module.color);
                
                return (
                  <button 
                    key={i}
                    onClick={() => router.push(module.path)} 
                    className={`text-left cursor-pointer ${theme.card} p-6 rounded-3xl border shadow-sm transition-all duration-300 group flex flex-col justify-between min-h-[140px] ${theme.cardHover}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${modTheme.iconBg}`}>
                        <module.icon size={22} strokeWidth={2.5} />
                        {module.badgeCount > 0 && (
                          <span className={`absolute -top-2 -right-2 min-w-[22px] h-6 px-1 rounded-full flex items-center justify-center text-[11px] font-black text-white border-2 bg-rose-500 shadow-sm animate-in zoom-in ${isDarkMode ? 'border-zinc-900' : 'border-white'}`}>
                            {module.badgeCount}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className={`text-base font-bold tracking-tight ${theme.text}`}>{module.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-5">
                      <p className={`text-[11px] font-medium leading-relaxed max-w-[180px] ${theme.subText}`}>{module.desc}</p>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${modTheme.iconBg} ${modTheme.hoverBtn} shrink-0 ml-auto`}>
                        <ArrowRight size={18} strokeWidth={2.5} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-widest pl-1 ${theme.subText}`}>Live Activity Log</h3>
            <div className={`${theme.card} rounded-3xl border shadow-sm p-6 flex-1 flex flex-col transition-colors min-h-[320px]`}>
              
              {recentActivity.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 py-12">
                  <Activity size={32} className={`${theme.subText} mb-4`} />
                  <p className={`text-sm font-bold ${theme.subText}`}>No recent network activity</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-3 space-y-5 custom-scrollbar max-h-[550px] lg:max-h-none">
                  {recentActivity.map((log: any, index: number) => (
                    <div key={log.id || `activity-log-${index}`} className={`flex gap-4 relative pb-5 border-b last:border-0 last:pb-0 ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                      <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center border ${isDarkMode ? 'bg-purple-500/10 border-purple-900/30 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-600'}`}>
                        <Clock size={16} />
                      </div>
                      <div className="pt-0.5">
                        <p className={`text-xs font-semibold leading-relaxed ${theme.text}`}>
                          {log.displayName} <span className={`font-medium ${theme.subText}`}>submitted an inspection/action.</span>
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 ${theme.subText}`}>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button onClick={() => router.push('/admin/inspections')} className={`mt-auto pt-5 w-full py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 shadow-sm'}`}>
                View All Logs
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 🚀 TOP-BAR BROADCAST ANNOUNCEMENT MODAL */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className={`rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border space-y-6 animate-in zoom-in-95 duration-300 ${theme.card}`}>
            <div className={`flex justify-between items-center pb-4 border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
              <h3 className={`text-base font-extrabold flex items-center gap-2 uppercase tracking-wide ${theme.text}`}>
                <Megaphone size={20} className="text-orange-600" /> Send Staff Announcement
              </h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} className={`p-2 rounded-full transition-colors hover:scale-110 ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSendBroadcast} className="space-y-5">
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-widest block mb-2 ${theme.subText}`}>Announcement Message *</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Type an announcement to broadcast to all staff dashboards..."
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  className={`w-full p-4 rounded-xl border outline-none text-sm font-medium transition-all resize-none ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'}`}
                />
              </div>

              <div>
                <label className={`text-[11px] font-bold uppercase tracking-widest block mb-2 ${theme.subText}`}>Attach Graphic / Flyer (Optional)</label>
                <label className={`cursor-pointer w-full p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${isDarkMode ? 'border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-400' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-purple-300 text-slate-500'}`}>
                  <ImagePlus size={28} className={broadcastImage ? "text-purple-600" : ""} />
                  <span className="text-xs font-bold uppercase tracking-wider">{broadcastImage ? `Attached: ${broadcastImage.name}` : 'Click to browse image file'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => setBroadcastImage(e.target.files ? e.target.files[0] : null)}
                  />
                </label>
                {broadcastImage && (
                  <button type="button" onClick={() => setBroadcastImage(null)} className="text-[11px] text-rose-500 hover:underline mt-2 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <X size={14} /> Remove attached file
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-5 border-t border-slate-100 dark:border-zinc-800">
                <button type="button" onClick={() => setIsBroadcastModalOpen(false)} className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all hover:scale-[1.02] ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm'}`}>
                  Cancel
                </button>
                <button disabled={isBroadcasting || (!broadcastMessage.trim() && !broadcastImage)} type="submit" className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-sm shadow-orange-600/20 cursor-pointer hover:scale-[1.02] active:scale-95">
                  {isBroadcasting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Broadcast Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}