'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, Laptop, ClipboardCheck, Ticket, 
  Activity, ArrowRight, AlertCircle, Clock,
  AlertTriangle, Monitor, Megaphone, 
  Send, Loader2, ImagePlus, X, RefreshCw, 
  BarChart3, Cpu, LogOut 
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
  
  const [isOnlineStaffModalOpen, setIsOnlineStaffModalOpen] = useState(false);
  
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [rawStaffList, setRawStaffList] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalAssets: 0, usedAssets: 0, inStockAssets: 0, discardedAssets: 0,
    totalVerifications: 0, resolvedInspections: 0, pendingInspections: 0,
    totalTickets: 0, resolvedTickets: 0, pendingTickets: 0, inProcessTickets: 0,
    totalStaff: 0, onlineStaff: 0, offlineStaff: 0, deactivatedStaff: 0,
    returnRequests: 0, replacementRequests: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // 🌟 THEME SYNC
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

  useEffect(() => {
    const presenceChannel = supabase.channel('vsit_online_presence');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeIds = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) activeIds.add(p.user_id);
            if (p.email) activeIds.add(p.email.toLowerCase());
          });
        });
        
        setOnlineUsers(activeIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ admin: 'admin_dashboard', online_at: new Date().toISOString() });
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, []);

  useEffect(() => {
    if (rawStaffList.length === 0) return;
    
    let totalStaffCount = 0;
    let deactivatedCount = 0;
    let liveCount = 0;

    rawStaffList.forEach(s => {
      const roleStr = (s.role || '').toLowerCase().trim();
      const emailStr = (s.email || '').toLowerCase().trim();
      
      if (roleStr === 'admin' || emailStr === 'lakhwinder.bi@outlook.com') return;
      
      totalStaffCount++;

      const statusStr = (s.status || '').toLowerCase().trim();
      const isDeactivated = s.is_active === false || ['deactivat', 'suspend', 'ban', 'block', 'revoke', 'disabled'].some(k => statusStr.includes(k)) || ['deactivat', 'suspend', 'ban', 'block', 'revoke'].some(k => roleStr.includes(k));

      if (isDeactivated) { 
        deactivatedCount++; 
        return; 
      }

      const isLive = onlineUsers.has(s.id) || (s.email && onlineUsers.has(s.email.toLowerCase()));
      if (isLive) liveCount++;
    });

    const offlineCount = Math.max(0, totalStaffCount - liveCount - deactivatedCount);

    setStats(prev => ({
      ...prev,
      totalStaff: totalStaffCount,
      onlineStaff: liveCount,
      offlineStaff: offlineCount,
      deactivatedStaff: deactivatedCount
    }));
  }, [onlineUsers, rawStaffList]);

  const triggerDesktopAlert = (title: string, body: string) => {
    try { const audio = new Audio('/alert.mp3'); audio.play().catch(() => {}); } catch (err) {}
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: '/logo.png' });
  };

  useEffect(() => {
    const adminChannel = supabase
      .channel('admin-live-feed')
      // 1. Listen for explicit Notifications
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_role=eq.admin` }, (payload) => {
        triggerDesktopAlert(payload.new.title || 'System Alert', payload.new.message || 'New notification received.');
      })
      // 2. Listen for Return/Replace Requests in Inspections
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inspections' }, (payload) => {
        const notes = (payload.new.notes || '').toLowerCase();
        const status = (payload.new.status || '').toLowerCase();
        
        if (notes.includes('return') || status.includes('return')) {
           triggerDesktopAlert('New Return Request', 'A staff member has initiated an asset return.');
        } else if (notes.includes('replace') || status.includes('replace')) {
           triggerDesktopAlert('New Replacement Request', 'A staff member has requested an asset replacement.');
        }
        loadAdminData(false);
      })
      // 3. Listen for direct Asset status changes
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, (payload) => {
        const newStatus = (payload.new.status || '').toLowerCase();
        
        if (newStatus.includes('return') || newStatus.includes('replace')) {
           triggerDesktopAlert('Asset Status Update', 'An asset was flagged for return or replacement.');
        }
        loadAdminData(false);
      })
      // 4. Standard refresh listeners
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => loadAdminData(false))
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

      const currentAdminName = activeUser.full_name || activeUser.name || 'IT Administrator';
      setAdminName(currentAdminName);

      const [
        { data: assets }, { data: inspections }, { data: tickets }, { data: staffDataRes }
      ] = await Promise.all([
        supabase.from('assets').select('id, status, assigned_to, inspection_status'),
        supabase.from('inspections').select('*, assets(*)').order('created_at', { ascending: false }),
        supabase.from('tickets').select('*'),
        supabase.from('profiles').select('*')
      ]);

      const staffData = staffDataRes || [];
      const inspData = inspections || [];
      const tktData = tickets || [];
      const assetsData = assets || [];

      setRawStaffList(staffData);

      // Asset Calculations
      let usedAssetsCount = 0, inStockAssetsCount = 0, discardedAssetsCount = 0, returnRequestsCount = 0, replacementRequestsCount = 0;
      assetsData.forEach(a => {
        const s = (a.status || '').toLowerCase().trim();
        if (s.includes('return request')) returnRequestsCount++;
        else if (s.includes('replace')) replacementRequestsCount++;
        if (['use', 'assign', 'allocat', 'deploy', 'active'].some(k => s.includes(k))) usedAssetsCount++;
        else if (['discard', 'retire', 'scrap', 'broken', 'lost', 'missing', 'stolen', 'damage'].some(k => s.includes(k))) discardedAssetsCount++;
        else inStockAssetsCount++;
      });

      // Inspection Calculations
      let pendingCount = 0, resolvedCount = 0, totalValidVerifications = 0;
      const processedAssetIds = new Set<string>();

      inspData.forEach(i => {
        if (i.asset_id) processedAssetIds.add(String(i.asset_id));

        const s = (i.status || '').toLowerCase().trim();
        const notes = (i.notes || '').toLowerCase();
        const inspByLower = (i.inspected_by || '').toLowerCase().trim();

        const isReturnOrReplace = notes.includes('[return request]') || s.includes('return') || notes.includes('[replacement request]') || s.includes('replace');
        const isAdminAction = 
          inspByLower === 'admin' || inspByLower === 'system' || inspByLower === 'administrator' ||
          notes.includes('asset configuration updated') || notes.includes('asset initially registered') ||
          notes.includes('asset forcefully unassigned') || notes.includes('asset re-assigned') ||
          s === 'stock intake' || i.is_admin === true || (i.type || '').toLowerCase() === 'admin';

        if (!isReturnOrReplace && !isAdminAction) {
          totalValidVerifications++;
          if (['resolv', 'approv', 'complet', 'clos', 'pass'].some(k => s.includes(k))) {
            resolvedCount++;
          } else if (s === 'pending' || s === 'pending review' || s === 'awaiting staff action' || s === '') {
            pendingCount++;
          }
        }
      });

      assetsData.forEach(asset => {
        const s = (asset.inspection_status || '').toLowerCase();
        if ((s.includes('pending') || s.includes('overdue') || s.includes('re-inspection')) && !asset.status?.toLowerCase().includes('return')) {
          if (!asset.assigned_to || String(asset.assigned_to).trim() === '') return;
          if (!processedAssetIds.has(String(asset.id))) {
            pendingCount++; totalValidVerifications++;
          }
        }
      });

      // Ticket Calculations
      let pendingTicketsCount = 0, inProcessTicketsCount = 0, resolvedTicketsCount = 0;
      tktData.forEach(t => {
        const s = (t.status || '').toLowerCase().trim();
        if (['resolv', 'clos', 'complet', 'done'].some(k => s.includes(k))) resolvedTicketsCount++;
        else if (['process', 'progress', 'repair', 'active'].some(k => s.includes(k))) inProcessTicketsCount++;
        else pendingTicketsCount++;
      });

      const formattedRecentLogs = inspData.slice(0, 6).map(log => {
        const assetObj = log.assets || {};
        const assetOwnerId = assetObj.assigned_to;
        const assetName = assetObj.name || assetObj.asset_name || 'an asset';

        const requesterProfile = staffData.find(p => 
          (log.user_email && p.email?.toLowerCase() === log.user_email.toLowerCase()) || 
          (log.user_id && p.id === log.user_id) ||
          (assetOwnerId && p.id === assetOwnerId)
        );

        let requesterName = 'Staff Member';
        let requesterEmpCode = '';
        if (requesterProfile) {
          requesterName = requesterProfile.full_name || requesterProfile.name || 'Staff Member';
          requesterEmpCode = requesterProfile.emp_code || '';
        } else if (log.user_email || log.user_name || log.created_by_name) {
          requesterName = log.user_name || log.created_by_name || (log.user_email ? log.user_email.split('@')[0] : 'Staff Member');
        }

        const statusText = (log.status || '').toLowerCase();
        const isApproved = statusText.includes('resolv') || statusText.includes('approv');

        let displayName = requesterName; 
        let empCode = requesterEmpCode;
        let logTheme = 'text-purple-600 bg-purple-500/10 border-purple-500/20'; 
        let actionText = `Logged system event for ${assetName}.`;

        if (statusText.includes('pending') || statusText === '') {
          logTheme = 'text-orange-500 bg-orange-500/10 border-orange-500/20';
          actionText = `Requested return/inspection for ${assetName}.`;
        } else if (isApproved) {
          let approverName = currentAdminName;
          if (log.inspected_by && log.inspected_by !== 'admin' && log.inspected_by !== activeUser.id) {
            const approverProfile = staffData.find(p => p.id === log.inspected_by);
            if (approverProfile) approverName = approverProfile.full_name || approverProfile.name || currentAdminName;
          }

          displayName = approverName; 
          empCode = 'ADMIN';          
          logTheme = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
          actionText = `Approved return request from ${requesterName} for ${assetName}.`;
        }

        return { ...log, displayName, empCode, logTheme, actionText };
      });

      setStats(prev => ({
        ...prev,
        totalAssets: assetsData.length || 0, usedAssets: usedAssetsCount, inStockAssets: inStockAssetsCount, discardedAssets: discardedAssetsCount,
        totalVerifications: totalValidVerifications, resolvedInspections: resolvedCount, pendingInspections: pendingCount,
        totalTickets: tktData.length, resolvedTickets: resolvedTicketsCount, pendingTickets: pendingTicketsCount, inProcessTickets: inProcessTicketsCount,
        returnRequests: returnRequestsCount, replacementRequests: replacementRequestsCount
      }));
      
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

  const getLiveStaffDetails = () => {
    return rawStaffList.filter(s => {
      const roleStr = (s.role || '').toLowerCase().trim();
      const emailStr = (s.email || '').toLowerCase().trim();
      
      if (roleStr === 'admin' || emailStr === 'lakhwinder.bi@outlook.com') return false;
      
      const statusStr = (s.status || '').toLowerCase().trim();
      const isDeactivated = s.is_active === false || ['deactivat', 'suspend', 'ban', 'block', 'revoke', 'disabled'].some(k => statusStr.includes(k)) || ['deactivat', 'suspend', 'ban', 'block', 'revoke'].some(k => roleStr.includes(k));

      if (isDeactivated) return false;

      return onlineUsers.has(s.id) || (s.email && onlineUsers.has(s.email.toLowerCase()));
    });
  };

  // ==========================================
  // 🌟 TRUE GLASSMORPHISM THEME (PREMIUM 2026 - V4 CANONICAL)
  // ==========================================
  const theme = {
    bg: 'bg-transparent font-sans',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-800',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-600',
    
    glassCard: isDarkMode 
      ? 'bg-zinc-900/30 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/30 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',
    
    glassInnerCard: isDarkMode 
      ? 'bg-black/20 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/20 backdrop-blur-lg border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]',
    
    glassItem: isDarkMode
      ? 'bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300 hover:bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
      : 'bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all duration-300 hover:bg-white/60',
    
    inputBg: isDarkMode 
      ? 'bg-black/40 border border-white/20 text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 placeholder-zinc-500' 
      : 'bg-white/40 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] text-slate-800 focus:bg-white/60 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder-slate-500',
  };

  if (authError) return (
    <div className={`w-full h-screen flex flex-col items-center justify-center ${theme.bg}`}>
      <AlertTriangle size={48} className="text-rose-500 mb-4" />
      <h1 className={`text-2xl font-bold ${theme.textMain}`}>Authorization Failed</h1>
      <button onClick={handleSecureLogout} className="mt-4 px-6 py-2 rounded-xl font-bold bg-white text-slate-700 shadow-sm border border-slate-200">Secure Logout</button>
    </div>
  );

  if (loading) return (
    <div className={`w-full h-screen flex flex-col items-center justify-center ${theme.bg}`}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-4"></div>
      <p className={`text-xs font-bold uppercase tracking-widest ${theme.textSub}`}>Loading Enterprise Data...</p>
    </div>
  );

  return (
    <div className={`absolute inset-0 w-full h-full lg:overflow-hidden overflow-y-auto flex flex-col ${theme.bg} font-sans antialiased z-0`}>
      {/* 🌟 Premium Background Orbs */}
      <div className="fixed top-[-10%] left-[0%] w-[50vw] h-[50vh] bg-orange-500/20 dark:bg-orange-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[0%] w-[50vw] h-[50vh] bg-purple-600/20 dark:bg-purple-700/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="flex-1 flex flex-col max-w-400 mx-auto w-full p-4 lg:p-6 gap-5 h-full lg:min-h-0 z-10">
        
        {/* 🌟 Top Dashboard Header */}
        <div className={`${theme.glassCard} rounded-3xl p-4 flex items-center justify-between shrink-0 transition-all`}>
          <Link href="/admin" className="flex items-center gap-4 group">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg ${theme.glassItem} ${isDarkMode ? 'text-orange-500' : 'text-orange-600'}`}>
              <Cpu className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className={`text-base lg:text-lg font-bold tracking-tight leading-none ${theme.textMain}`}>IT Asset & Service Management</h1>
              <p className={`text-[11px] font-semibold mt-1.5 ${theme.textSub}`}>Welcome back, <span className="font-bold">{adminName}</span>. Here is your live IT infrastructure status.</p>
            </div>
          </Link>

          <button 
            onClick={() => loadAdminData(true)} 
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-orange-500/20 disabled:opacity-50 shrink-0 border border-white/20 active:scale-95"
            title="Refresh Live Data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Sync Feeds</span>
          </button>
        </div>

        {/* 🌟 4 Main Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          
          <div className={`${theme.glassCard} p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-purple-400/50 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 ${theme.glassInnerCard} ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}><Laptop size={16} /></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Inventory</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-purple-600 dark:text-purple-400 leading-none mb-1.5">{stats.totalAssets}</h2>
              <p className={`text-[10px] font-bold ${theme.textSub}`}>Total Assets</p>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <div className="flex flex-col"><span className={`text-[9px] uppercase font-bold ${theme.textSub}`}>Used</span><span className={`text-xs font-bold ${theme.textMain}`}>{stats.usedAssets}</span></div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}><span className={`text-[9px] uppercase font-bold ${theme.textSub}`}>Stock</span><span className="text-xs font-bold text-emerald-500">{stats.inStockAssets}</span></div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}><span className={`text-[9px] uppercase font-bold ${theme.textSub}`}>Discard</span><span className="text-xs font-bold text-orange-500">{stats.discardedAssets}</span></div>
            </div>
          </div>

          <div className={`${theme.glassCard} p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-orange-400/50 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 ${theme.glassInnerCard} ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>{stats.pendingInspections > 0 ? <AlertCircle size={16} /> : <ClipboardCheck size={16} />}</div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Verifications</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-orange-600 dark:text-orange-400 leading-none mb-1.5">{stats.totalVerifications}</h2>
              <p className={`text-[10px] font-bold ${theme.textSub}`}>Total Requests</p>
            </div>
            <div className={`grid grid-cols-2 gap-2 mt-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <div className="flex flex-col"><span className={`text-[9px] uppercase font-bold ${theme.textSub}`}>Resolved</span><span className="text-xs font-bold text-emerald-500">{stats.resolvedInspections}</span></div>
              <div className={`flex flex-col border-l pl-3 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}><span className={`text-[9px] uppercase font-bold ${theme.textSub}`}>Pending</span><span className={`text-xs font-bold ${stats.pendingInspections > 0 ? 'text-orange-500' : theme.textMain}`}>{stats.pendingInspections}</span></div>
            </div>
          </div>

          <div className={`${theme.glassCard} p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-purple-400/50 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 ${theme.glassInnerCard} ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}><Ticket size={16} /></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Helpdesk</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-purple-600 dark:text-purple-400 leading-none mb-1.5">{stats.totalTickets}</h2>
              <p className={`text-[10px] font-bold ${theme.textSub}`}>Total Tickets</p>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <div className="flex flex-col"><span className={`text-[9px] uppercase font-bold ${theme.textSub}`}>Resolved</span><span className="text-xs font-bold text-emerald-500">{stats.resolvedTickets}</span></div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}><span className={`text-[9px] uppercase font-bold ${theme.textSub}`}>Process</span><span className="text-xs font-bold text-purple-600 dark:text-purple-400">{stats.inProcessTickets}</span></div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}><span className={`text-[9px] uppercase font-bold ${theme.textSub}`}>Pending</span><span className={`text-xs font-bold ${stats.pendingTickets > 0 ? 'text-orange-500' : theme.textMain}`}>{stats.pendingTickets}</span></div>
            </div>
          </div>

          <div className={`${theme.glassCard} p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-orange-400/50 group`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 ${theme.glassInnerCard} ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}><Users size={16} /></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Network</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-orange-600 dark:text-orange-400 leading-none mb-1.5">{stats.totalStaff}</h2>
              <p className={`text-[10px] font-bold ${theme.textSub}`}>Total Staff</p>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <button 
                onClick={() => setIsOnlineStaffModalOpen(true)} 
                title="View Online Staff"
                className={`flex flex-col text-left cursor-pointer group/live p-1.5 -m-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-white/30'}`}
              >
                <span className={`text-[9px] uppercase font-bold flex items-center gap-1 transition-colors ${theme.textSub} group-hover/live:text-emerald-600 dark:group-hover/live:text-emerald-400`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
                <span className="text-xs font-bold text-emerald-500 group-hover/live:scale-110 origin-left transition-transform">{stats.onlineStaff}</span>
              </button>

              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}><span className={`text-[9px] uppercase font-bold ${theme.textSub}`}>Off</span>
                <span className={`text-xs font-bold ${theme.textMain}`}>{stats.offlineStaff}</span>
              </div>
              <div className={`flex flex-col border-l pl-2 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}><span className={`text-[9px] uppercase font-bold ${theme.textSub}`}>Deact</span>
                <span className="text-xs font-bold text-rose-500">{stats.deactivatedStaff}</span>
              </div>
            </div>
          </div>

        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:min-h-0 lg:overflow-hidden pt-2">
          
          {/* 🌟 System Modules (Left Side) */}
          <div className="w-full lg:w-[72%] flex flex-col lg:min-h-0 lg:overflow-hidden">
            <h3 className={`text-[11px] font-bold uppercase tracking-widest pl-1 shrink-0 mb-3 ${theme.textSub}`}>System Modules</h3>
            
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
                    className={`text-left cursor-pointer p-4 rounded-3xl flex flex-col justify-between ease-out group ${theme.glassItem} hover:-translate-y-1 hover:shadow-xl min-h-35 ${isOrange ? 'hover:shadow-orange-500/10 hover:border-orange-400' : 'hover:shadow-purple-500/10 hover:border-purple-400'}`}
                  >
                    <div className="flex items-start justify-between w-full relative">
                      <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${theme.glassInnerCard} ${isOrange ? 'text-orange-500' : 'text-purple-500'}`}>
                        <m.icon size={20} strokeWidth={2.2} />
                        {/* 🌟 2026 Liquid Glass Translucent Badge */}
                        {m.badge > 0 && (
                          <span className="absolute -top-2.5 -right-2.5 min-w-5 h-5 px-1.5 flex items-center justify-center bg-linear-to-tr from-orange-500/80 to-purple-600/80 backdrop-blur-xl backdrop-saturate-150 text-white text-[10px] font-black rounded-full border border-white/50 dark:border-white/20 shadow-[0_4px_10px_rgba(249,115,22,0.3),inset_0_1px_3px_rgba(255,255,255,0.8)] drop-shadow-sm z-50 transition-all hover:scale-110">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 ${theme.glassInnerCard} ${isOrange ? 'text-orange-500 group-hover:bg-orange-500 group-hover:text-white' : 'text-purple-500 group-hover:bg-purple-500 group-hover:text-white'}`}>
                        <ArrowRight size={14} strokeWidth={2.5} />
                      </div>
                    </div>
                    <div>
                      <h4 className={`text-[14px] font-bold tracking-tight leading-tight ${theme.textMain}`}>{m.title}</h4>
                      <p className={`text-[11px] font-semibold mt-1.5 leading-snug line-clamp-2 ${theme.textSub}`}>{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🌟 Live Activity Log (Right Side) */}
          <div className="w-full lg:w-[28%] flex flex-col lg:min-h-0 lg:overflow-hidden pb-4 lg:pb-0">
            <h3 className={`text-[11px] font-bold uppercase tracking-widest pl-1 shrink-0 mb-3 ${theme.textSub}`}>Live Activity Log</h3>
            <div className={`${theme.glassCard} rounded-3xl p-5 flex-1 flex flex-col lg:min-h-0 lg:overflow-hidden`}>
              {recentActivity.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                  <Activity size={28} className={`${theme.textSub} mb-3`} />
                  <p className={`text-[13px] font-bold ${theme.textSub}`}>Waiting for live events...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {recentActivity.map((log: any, i: number) => (
                    <div key={i} className={`flex gap-3 relative pb-4 border-b last:border-0 last:pb-0 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                      <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all ${theme.glassInnerCard} ${log.logTheme.split(' ')[0]}`}>
                        <Clock size={14} strokeWidth={2.5} />
                      </div>
                      <div className="pt-0.5 min-w-0">
                        <p className={`text-[14px] font-bold leading-tight flex items-center gap-2 truncate ${theme.textMain}`}>
                          <span className="truncate">{log.displayName}</span>
                          {log.empCode && (
                            <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${
                              log.empCode === 'ADMIN' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                              isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-white/40 border border-white/80 shadow-sm text-slate-500'
                            }`}>
                              {log.empCode}
                            </span>
                          )}
                        </p>
                        <p className={`text-[11px] font-semibold mt-1 truncate ${theme.textSub}`}>{log.actionText}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{timeAgo(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => router.push('/admin/inspections')} className={`mt-4 w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider cursor-pointer ${theme.glassItem} ${theme.textMain}`}>
                View Entire Log
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 🌟 Broadcast Modal */}
      {isBroadcastModalOpen && (
        <div className={`fixed inset-0 z-100 flex flex-col items-center justify-start pt-24 sm:pt-28 pb-6 px-4 backdrop-blur-sm animate-in fade-in duration-200 ${isDarkMode ? 'bg-black/60' : 'bg-black/20'}`}>
          <div className={`relative max-w-lg w-full flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.15)] flex-1 max-h-full rounded-4xl animate-in zoom-in-95 duration-200 ${theme.glassCard}`}>
            <div className={`p-4 sm:p-5 border-b flex justify-between items-center relative z-30 shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-white/50 bg-white/40'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 uppercase tracking-widest ${theme.textMain}`}>
                <Megaphone size={18} className="text-orange-500" /> Broadcast Announcement
              </h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} className={`absolute top-4 right-4 p-2 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-90 ${theme.glassInnerCard} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-400 z-40`}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSendBroadcast} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-4 sm:p-6 space-y-5">
              <div>
                <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Message Text *</label>
                <textarea 
                  rows={3} 
                  required 
                  placeholder="Type an announcement to broadcast..." 
                  value={broadcastMessage} 
                  onChange={e => setBroadcastMessage(e.target.value)} 
                  className={`w-full p-3 rounded-xl outline-none text-sm font-semibold transition-all resize-none ${theme.inputBg}`} 
                />
              </div>
              <div>
                <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Attach Graphic / Flyer (Optional)</label>
                <label className={`cursor-pointer w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${theme.glassInnerCard} hover:border-orange-500/50`}>
                  <ImagePlus size={24} className={broadcastImage ? "text-orange-500" : "opacity-50"} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{broadcastImage ? `Attached: ${broadcastImage.name}` : 'Click to browse image file'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setBroadcastImage(e.target.files ? e.target.files[0] : null)} />
                </label>
                {broadcastImage && <button type="button" onClick={() => setBroadcastImage(null)} className="text-[10px] text-rose-500 hover:underline mt-2 font-bold uppercase tracking-widest flex items-center gap-1 cursor-pointer"><X size={12} /> Remove attached file</button>}
              </div>
              
              <div className={`pt-5 mt-auto border-t flex gap-3 shrink-0 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                <button type="button" onClick={() => setIsBroadcastModalOpen(false)} className={`px-6 py-3.5 rounded-xl ${theme.glassInnerCard} ${theme.textMain} hover:opacity-80 transition-all text-[11px] font-bold uppercase tracking-widest cursor-pointer shadow-xs active:scale-95`}>
                  Cancel
                </button>
                <button disabled={isBroadcasting} type="submit" className="flex-1 py-3.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.4)] cursor-pointer active:scale-95 border border-transparent">
                  {isBroadcasting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 Online Staff Modal */}
      {isOnlineStaffModalOpen && (
        <div className={`fixed inset-0 z-100 flex flex-col items-center justify-start pt-24 sm:pt-28 pb-6 px-4 backdrop-blur-sm animate-in fade-in duration-200 ${isDarkMode ? 'bg-black/60' : 'bg-black/20'}`}>
          <div className={`relative max-w-md w-full flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.15)] flex-1 max-h-full rounded-4xl animate-in zoom-in-95 duration-200 ${theme.glassCard}`}>
            <div className={`p-4 sm:p-5 border-b flex justify-between items-center relative z-30 shrink-0 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 uppercase tracking-widest ${theme.textMain}`}>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                Live Network ({stats.onlineStaff})
              </h3>
              <button onClick={() => setIsOnlineStaffModalOpen(false)} className={`absolute top-4 right-4 p-2 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-90 ${theme.glassInnerCard} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-400 z-40`}>
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {getLiveStaffDetails().length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center opacity-70 h-full">
                  <Users size={32} className={`${theme.textSub} mb-3`} />
                  <p className={`text-[12px] font-bold ${theme.textSub}`}>No staff members are currently online.</p>
                </div>
              ) : (
                getLiveStaffDetails().map((staff, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl flex items-center justify-between transition-colors ${theme.glassItem}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-emerald-500 ${theme.glassInnerCard}`}>
                        <Users size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${theme.textMain}`}>{staff.full_name || staff.name || staff.email?.split('@')[0] || 'Staff Member'}</p>
                        <p className={`text-[10px] font-semibold truncate ${theme.textSub}`}>{staff.email}</p>
                      </div>
                    </div>
                    {staff.emp_code && (
                      <span className={`shrink-0 text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-widest ${theme.glassInnerCard}`}>
                        {staff.emp_code}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}