'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, Laptop, ClipboardCheck, Ticket, 
  Activity, ArrowRight, ShieldCheck, AlertCircle, Clock,
  AlertTriangle, Bell, Monitor, CheckCircle2, Trash2, ExternalLink,
  Megaphone, Send, Loader2, ImagePlus, X
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Broadcast State
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastImage, setBroadcastImage] = useState<File | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    totalAssets: 0,
    pendingInspections: 0,
    activeTickets: 0,
    totalStaff: 0
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
    
    // Request Desktop Notification Permission on Load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 🔔 THE UPGRADED NOTIFICATION TRIGGER ENGINE (Kept for Popups)
  const triggerDesktopAlert = (title: string, body: string) => {
    // 1. Play Sound
    try {
      const audio = new Audio('/alert.mp3');
      audio.play().catch(e => console.log("Audio play blocked by browser:", e));
    } catch (err) {}

    // 2. Show Native OS Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/logo.png', 
        badge: '/logo.png',
        vibrate: [200, 100, 200]
      } as any);
    }
  };

  // ⚡ UPGRADED OMNI-CHANNEL REALTIME LISTENER
  useEffect(() => {
    const adminChannel = supabase
      .channel('admin-live-feed')
      // 1. Listen for standard notifications
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_role=eq.admin` }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
        triggerDesktopAlert(payload.new.title || 'Admin Alert', payload.new.message || 'New alert received.');
      })
      // 2. Listen for NEW TICKETS directly from Staff
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
        const tix = payload.new;
        const title = 'New IT Ticket Raised';
        const msg = `${tix.staff_name || 'A staff member'} submitted a ticket: ${tix.title}`;
        
        triggerDesktopAlert(title, msg);
        
        // Inject a mock actionable alert directly into the UI list
        setNotifications(prev => [{
          id: `local-${Date.now()}`,
          title: title,
          message: msg,
          target_role: 'admin',
          is_read: false
        }, ...prev]);
        
        loadAdminData(); // Refresh the active stats
      })
      // 3. Listen for NEW ASSET INSPECTIONS directly from Staff
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inspections' }, (payload) => {
        const title = 'New Asset Inspection';
        const msg = 'A device inspection was just submitted and requires your review.';
        
        triggerDesktopAlert(title, msg);
        
        setNotifications(prev => [{
          id: `local-${Date.now()}`,
          title: title,
          message: msg,
          target_role: 'admin',
          is_read: false
        }, ...prev]);
        
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
    const rawSession = localStorage.getItem('vsit_admin_session') || 
                       localStorage.getItem('vsit_staff_session') || 
                       localStorage.getItem('user');

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

      const [
        { count: assets }, 
        { data: inspections }, 
        { data: tickets }, 
        staffRes,
        notifRes
      ] = await Promise.all([
        supabase.from('assets').select('*', { count: 'exact', head: true }),
        supabase.from('inspections').select('*, assets(asset_name)').order('created_at', { ascending: false }),
        supabase.from('tickets').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('notifications').select('*').eq('target_role', 'admin').eq('is_read', false).order('created_at', { ascending: false })
      ]);

      const staffData = staffRes.data || [];
      const inspData = inspections || [];
      const tktData = tickets || [];

      const pendingCount = inspData.filter(i => i.status?.toLowerCase().includes('pending')).length;
      const ticketCount = tktData.filter(t => ['open', 'in_repair', 'pending'].includes((t.status || '').toLowerCase())).length;

      if (notifRes.data) {
        setNotifications(prev => {
          // Merge database notifications with any local "live" ones that haven't been dismissed yet
          const localOnly = prev.filter(n => String(n.id).startsWith('local-'));
          return [...localOnly, ...notifRes.data];
        });
      }

      const formattedRecentLogs = inspData.slice(0, 5).map(log => {
        const matchedProfile = staffData.find(p => 
          p.email?.toLowerCase() === log.user_email?.toLowerCase() || 
          p.id === log.inspected_by
        );

        let displayName = log.user_email?.split('@')[0] || 'A user'; 
        
        if (matchedProfile) {
          const name = matchedProfile.full_name || matchedProfile.name || displayName;
          const empCode = matchedProfile.emp_code || matchedProfile.emp_id || 'N/A';
          displayName = `${name} (${empCode})`;
        }

        return { ...log, displayName };
      });

      setStats({
        totalAssets: assets || 0,
        pendingInspections: pendingCount,
        activeTickets: ticketCount,
        totalStaff: staffData.length
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
    // Only attempt to update the database if it's a real DB UUID, not a locally injected one
    if (!String(id).startsWith('local-')) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      } catch (err) { console.error(err); }
    }
  };

  const getActionRoute = (title: string) => {
    const t = (title || '').toLowerCase();
    if (t.includes('inspection') || t.includes('agreement') || t.includes('audit')) return '/admin/inspections';
    if (t.includes('ticket') || t.includes('request') || t.includes('replacement')) return '/admin/tickets';
    return '/admin/assets';
  };

  // 📣 ADVANCED BROADCAST HANDLER
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim() && !broadcastImage) return;
    setIsBroadcasting(true);
    
    try {
      let finalImageUrl = null;

      // 1. Upload Image to Supabase Storage if attached
      if (broadcastImage) {
        const fileExt = broadcastImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('broadcasts')
          .upload(filePath, broadcastImage);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('broadcasts')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrlData.publicUrl;
      }

      // 2. Save Broadcast to your 'broadcasts' log table
      await supabase.from('broadcasts').insert({
        message: broadcastMessage.trim(),
        created_by: adminName,
        image_url: finalImageUrl
      });

      // 3. Push to 'notifications'
      const { error: notifError } = await supabase.from('notifications').insert({
        title: "System Broadcast",
        message: finalImageUrl ? `${broadcastMessage.trim()} (Image Attached)` : broadcastMessage.trim(),
        target_user: null, 
        is_read: false,
        type: 'broadcast' 
      });

      if (notifError) throw notifError;
      
      setBroadcastMessage('');
      setBroadcastImage(null);
      alert("Announcement successfully broadcasted to all staff dashboards!");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to send broadcast: ${err.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // --- RENDERING ERROR STATE ---
  if (authError) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-6 bg-zinc-950 p-4 text-center antialiased">
        <div className="p-6 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20">
          <AlertTriangle size={48} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Authorization Failed</h1>
          <p className="text-sm text-zinc-400 mt-2">{authError}</p>
        </div>
        <button onClick={handleSecureLogout} className="px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl text-sm font-semibold transition-all">
          Secure Logout & Return
        </button>
      </div>
    );
  }

  // --- RENDERING LOADING STATE ---
  if (loading) {
    return (
      <div className={`w-full h-screen flex flex-col items-center justify-center gap-4 antialiased ${isDarkMode ? 'bg-zinc-950' : 'bg-slate-50'}`}>
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-zinc-400' : 'border-blue-600'}`}></div>
        <p className={`text-xs font-medium tracking-wide ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Loading Dashboard Data...</p>
      </div>
    );
  }

  const theme = {
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-slate-50',
    card: isDarkMode ? 'bg-zinc-900 border-zinc-800/80' : 'bg-white border-slate-200/60',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-800',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    cardHover: isDarkMode ? 'hover:border-zinc-700 hover:bg-zinc-800/50' : 'hover:border-slate-300 hover:shadow-sm',
    iconBg: {
      blue: isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
      orange: isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600',
      rose: isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600',
      emerald: isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
      indigo: isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600',
      gray: isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500',
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-10`}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* 🚀 CLEAN ENTERPRISE HEADER (REMOVED EXTRA BELL ICON) */}
        <div className={`${theme.card} rounded-3xl p-5 md:p-6 border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-colors`}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <ShieldCheck size={26} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
              <h1 className={`text-2xl font-semibold tracking-tight ${theme.text}`}>Systems Overview</h1>
            </div>
            <p className={`text-sm ${theme.subText}`}>Welcome back, {adminName}. Here is your IT infrastructure status.</p>
          </div>
          
          <div className={`hidden md:flex px-4 py-2 rounded-xl text-xs font-semibold tracking-wide items-center gap-2 border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            All Systems Operational
          </div>
        </div>

        {/* 📣 QUICK BROADCAST WIDGET WITH IMAGE UPLOAD */}
        <div className={`${theme.card} p-5 rounded-3xl border shadow-sm transition-all`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider pl-1 ${theme.subText} flex items-center gap-2 mb-3`}>
            <Megaphone size={14} className="text-indigo-500" /> Send Staff Announcement
          </h3>
          <form onSubmit={handleSendBroadcast} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Type an announcement to broadcast to all staff dashboards..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                className={`flex-1 px-4 py-3 rounded-xl border outline-none text-sm font-medium transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-indigo-500'}`}
              />
              
              <div className="flex gap-2">
                <label className={`cursor-pointer px-4 py-3 rounded-xl border flex items-center justify-center transition-colors ${isDarkMode ? 'border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-400' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                  <ImagePlus size={18} className={broadcastImage ? "text-indigo-500" : ""} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => setBroadcastImage(e.target.files ? e.target.files[0] : null)}
                  />
                </label>
                
                <button disabled={isBroadcasting || (!broadcastMessage.trim() && !broadcastImage)} type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-xs uppercase tracking-widest shadow-sm shrink-0 cursor-pointer">
                  {isBroadcasting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Broadcast
                </button>
              </div>
            </div>

            {/* Image Attachment Preview */}
            {broadcastImage && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100 flex items-center gap-2">
                  <ImagePlus size={12} /> Image Attached: {broadcastImage.name}
                  <button type="button" onClick={() => setBroadcastImage(null)} className="hover:text-rose-600 ml-2 cursor-pointer"><X size={12}/></button>
                </span>
              </div>
            )}
          </form>
        </div>

        {/* 🚨 ACTIONABLE ALERTS SECTION */}
        {notifications.length > 0 && (
          <div id="actionable-alerts" className="space-y-3 animate-in slide-in-from-top-4 scroll-m-6">
            <h3 className={`text-xs font-semibold uppercase tracking-wider pl-1 ${theme.subText} flex items-center gap-2`}>
              <Bell size={14} className="text-rose-500 animate-bounce" /> Action Required ({notifications.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notifications.map(notif => {
                const targetRoute = getActionRoute(notif.title);
                return (
                  <div key={notif.id} className={`${theme.card} p-4 rounded-2xl border shadow-sm flex flex-col justify-between gap-4 transition-all hover:border-blue-500/30`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <AlertCircle size={18} />
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold ${theme.text}`}>{notif.title}</h4>
                        <p className={`text-xs mt-1 line-clamp-2 ${theme.subText}`}>{notif.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                      <button onClick={() => dismissNotification(notif.id)} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors flex justify-center items-center gap-1.5 cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Trash2 size={12} /> Dismiss
                      </button>
                      <button onClick={() => router.push(targetRoute)} className={`flex-[2] py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors flex justify-center items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer`}>
                        Take Action <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 📊 HIGH-LEVEL STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${theme.card} p-5 rounded-3xl border shadow-sm flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-2xl transition-colors ${theme.iconBg.blue}`}><Laptop size={22} /></div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${theme.subText}`}>Inventory</span>
            </div>
            <div>
              <h2 className={`text-3xl font-bold tracking-tight ${theme.text}`}>{stats.totalAssets}</h2>
              <p className={`text-xs mt-1 ${theme.subText}`}>Total hardware units</p>
            </div>
          </div>

          <div className={`${theme.card} p-5 rounded-3xl border shadow-sm flex flex-col justify-between transition-all relative overflow-hidden ${theme.cardHover}`}>
            {stats.pendingInspections > 0 && <div className="absolute top-0 right-0 w-12 h-12 bg-orange-500/10 rounded-bl-full" />}
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-2xl transition-colors ${theme.iconBg.orange}`}>
                {stats.pendingInspections > 0 ? <AlertCircle size={22} /> : <ClipboardCheck size={22} />}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${theme.subText}`}>Verifications</span>
            </div>
            <div>
              <h2 className={`text-3xl font-bold tracking-tight ${stats.pendingInspections > 0 ? 'text-orange-500' : theme.text}`}>{stats.pendingInspections}</h2>
              <p className={`text-xs mt-1 ${theme.subText}`}>Pending approval</p>
            </div>
          </div>

          <div className={`${theme.card} p-5 rounded-3xl border shadow-sm flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-2xl transition-colors ${theme.iconBg.rose}`}><Ticket size={22} /></div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${theme.subText}`}>Helpdesk</span>
            </div>
            <div>
              <h2 className={`text-3xl font-bold tracking-tight ${theme.text}`}>{stats.activeTickets}</h2>
              <p className={`text-xs mt-1 ${theme.subText}`}>Active IT tickets</p>
            </div>
          </div>

          <div className={`${theme.card} p-5 rounded-3xl border shadow-sm flex flex-col justify-between transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-2xl transition-colors ${theme.iconBg.emerald}`}><Users size={22} /></div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${theme.subText}`}>Network</span>
            </div>
            <div>
              <h2 className={`text-3xl font-bold tracking-tight ${theme.text}`}>{stats.totalStaff}</h2>
              <p className={`text-xs mt-1 ${theme.subText}`}>Active staff accounts</p>
            </div>
          </div>
        </div>

        {/* 🧭 NAVIGATION ACTION CARDS & LOG */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-3">
            <h3 className={`text-xs font-semibold uppercase tracking-wider pl-1 ${theme.subText}`}>System Modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Review Inspections', desc: 'Audit smartphone visual submissions and approve hardware.', icon: ClipboardCheck, path: '/admin/inspections', color: 'orange' },
                { title: 'Asset Registry', desc: 'Manage full hardware lifecycle, assignments, and serial tags.', icon: Laptop, path: '/admin/assets', color: 'blue' },
                { title: 'IT Helpdesk', desc: 'Resolve staff hardware issues and repair requests.', icon: Ticket, path: '/admin/tickets', color: 'rose' },
                { title: 'Staff Directory', desc: 'Manage employee access codes and profile data.', icon: Users, path: '/admin/staff', color: 'emerald' },
                { title: 'Remote Access', desc: 'View and control staff screens securely for live support.', icon: Monitor, path: '/admin/remote', color: 'indigo' },
              ].map((module, i) => (
                <button 
                  key={i}
                  onClick={() => router.push(module.path)} 
                  className={`text-left cursor-pointer ${theme.card} p-5 rounded-3xl border shadow-sm transition-all group flex flex-col justify-between min-h-[140px] ${theme.cardHover}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme.iconBg[module.color as keyof typeof theme.iconBg]}`}>
                      <module.icon size={20} strokeWidth={2.5} />
                    </div>
                    <h4 className={`text-sm font-semibold tracking-tight ${theme.text}`}>{module.title}</h4>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <p className={`text-[11px] leading-relaxed max-w-[180px] ${theme.subText}`}>{module.desc}</p>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${theme.iconBg.gray} group-hover:bg-${module.color}-500 group-hover:text-white`}>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 📡 LIVE ACTIVITY LOG */}
          <div className="space-y-3">
            <h3 className={`text-xs font-semibold uppercase tracking-wider pl-1 ${theme.subText}`}>Live Activity Log</h3>
            <div className={`${theme.card} rounded-3xl border shadow-sm p-5 h-[320px] flex flex-col transition-colors`}>
              
              {recentActivity.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                  <Activity size={28} className={`${theme.subText} mb-3`} />
                  <p className={`text-xs font-medium ${theme.subText}`}>No recent network activity</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {recentActivity.map((log: any, index: number) => (
                    <div key={log.id || `activity-log-${index}`} className={`flex gap-3 relative pb-4 border-b last:border-0 last:pb-0 ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border ${theme.iconBg.blue} ${isDarkMode ? 'border-blue-900/30' : 'border-blue-100'}`}>
                        <Clock size={12} />
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${theme.text}`}>
                          {log.displayName} <span className={`${theme.subText}`}>submitted an inspection/action.</span>
                        </p>
                        <p className={`text-[10px] mt-1 ${theme.subText}`}>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button onClick={() => router.push('/admin/inspections')} className={`mt-4 w-full py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wide cursor-pointer transition-colors ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                View All Logs
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}