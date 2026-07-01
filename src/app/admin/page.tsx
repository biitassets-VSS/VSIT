// src/app/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, Laptop, ClipboardCheck, Ticket, 
  Activity, ArrowRight, ShieldCheck, AlertCircle, Clock,
  Moon, Sun, LogOut, AlertTriangle, Bell, Monitor // 🌟 Added Monitor Icon
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    totalAssets: 0,
    pendingInspections: 0,
    activeTickets: 0,
    totalStaff: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // 🌟 GLOBAL THEME SYNC
  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark'); // Optional: syncs global CSS if used
    }
    loadAdminData();
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('vsit_theme', newTheme ? 'dark' : 'light');
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

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

      // 🌟 FIXED: We now select the FULL profiles data so we can map Names & Emp Codes to the logs
      const [
        { count: assets }, 
        { data: inspections }, 
        { data: tickets }, 
        staffRes
      ] = await Promise.all([
        supabase.from('assets').select('*', { count: 'exact', head: true }),
        supabase.from('inspections').select('*, assets(asset_name)').order('created_at', { ascending: false }),
        supabase.from('tickets').select('*'),
        supabase.from('profiles').select('*') // Full fetch instead of just count
      ]);

      const staffData = staffRes.data || [];
      const pendingCount = inspections?.filter(i => i.status?.toLowerCase().includes('pending')).length || 0;
      const ticketCount = tickets?.filter(t => ['open', 'in_repair', 'pending'].includes(t.status)).length || 0;

      // 🌟 NEW: Map inspections to actual User Names and EMP Codes
      const formattedRecentLogs = (inspections?.slice(0, 5) || []).map(log => {
        // Try to find the profile that matches this log's email or ID
        const matchedProfile = staffData.find(p => 
          p.email?.toLowerCase() === log.user_email?.toLowerCase() || 
          p.id === log.inspected_by
        );

        let displayName = log.user_email?.split('@')[0] || 'A user'; // Fallback
        
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
        totalStaff: staffData.length || 0 // Re-mapped count
      });
      
      setRecentActivity(formattedRecentLogs);
      setLoading(false);

    } catch (e) { 
      console.error('Data load error:', e);
      setLoading(false); 
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
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-zinc-400' : 'border-slate-400'}`}></div>
        <p className={`text-xs font-medium tracking-wide ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Loading Dashboard...</p>
      </div>
    );
  }

  // 🌟 MASTER THEME DICTIONARY (Eye-Comfort Optimized)
  const theme = {
    // Background: Carbon Black vs Soft Slate
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-slate-50',
    // Cards: Gray Black vs Pure White
    card: isDarkMode ? 'bg-zinc-900 border-zinc-800/80' : 'bg-white border-slate-200/60',
    // Text: Soft Zinc vs Deep Slate (Never pure black/white)
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-800',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    // Hover States: Subtle shifts
    cardHover: isDarkMode ? 'hover:border-zinc-700 hover:bg-zinc-800/50' : 'hover:border-slate-300 hover:shadow-sm',
    // Icon Colors
    iconBg: {
      blue: isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
      orange: isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600',
      rose: isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600',
      emerald: isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
      indigo: isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600', // 🌟 NEW: Added for Remote Module
      gray: isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500',
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-10`}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* 🚀 ENTERPRISE HEADER */}
        <div className={`${theme.card} rounded-3xl p-5 md:p-6 border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-colors`}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <ShieldCheck size={26} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
              <h1 className={`text-2xl font-semibold tracking-tight ${theme.text}`}>Systems Overview</h1>
            </div>
            <p className={`text-sm ${theme.subText}`}>Welcome back, {adminName}. Here is your IT infrastructure status.</p>
          </div>
          
          {/* ACTION BUTTONS (Aligned to Right) */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            
            {/* Status Indicator */}
            <div className={`hidden md:flex px-4 py-2 rounded-xl text-xs font-semibold tracking-wide items-center gap-2 border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All Systems Operational
            </div>

            {/* Dark Mode Toggle */}
            <button onClick={toggleTheme} className={`p-2.5 rounded-xl border transition-colors ${theme.card} ${theme.cardHover}`}>
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>

            {/* Notification Bell (With 1 active alert) */}
            <button className={`p-2.5 rounded-xl border transition-colors relative ${theme.card} ${theme.cardHover} ${theme.text}`}>
              <Bell size={18} />
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </button>

            {/* Logout Button */}
            <button onClick={handleSecureLogout} className={`p-2.5 rounded-xl border transition-colors ${theme.card} hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 text-rose-500`}>
              <LogOut size={18} />
            </button>

          </div>
        </div>

        {/* 📊 HIGH-LEVEL STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Inventory */}
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

          {/* Verifications */}
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

          {/* Helpdesk */}
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

          {/* Network */}
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
                { title: 'Remote Access', desc: 'View and control staff screens securely for live support.', icon: Monitor, path: '/admin/remote', color: 'indigo' }, // 🌟 NEW MODULE ADDED
              ].map((module, i) => (
                <button 
                  key={i}
                  onClick={() => router.push(module.path)} 
                  className={`text-left ${theme.card} p-5 rounded-3xl border shadow-sm transition-all group flex flex-col justify-between min-h-[140px] ${theme.cardHover}`}
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
                  {recentActivity.map((log: any) => (
                    <div key={log.id} className={`flex gap-3 relative pb-4 border-b last:border-0 last:pb-0 ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border ${theme.iconBg.blue} ${isDarkMode ? 'border-blue-900/30' : 'border-blue-100'}`}>
                        <Clock size={12} />
                      </div>
                      <div>
                        {/* 🌟 DISPLAY THE FULL NAME AND EMP CODE IN THE LOG */}
                        <p className={`text-xs font-medium ${theme.text}`}>
                          {log.displayName} <span className={`${theme.subText}`}>submitted an inspection/action.</span>
                        </p>
                        <p className={`text-[10px] mt-1 ${theme.subText}`}>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button onClick={() => router.push('/admin/inspections')} className={`mt-4 w-full py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-colors ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                View All Logs
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}