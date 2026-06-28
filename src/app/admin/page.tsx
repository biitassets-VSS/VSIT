'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, Laptop, ClipboardCheck, Ticket, 
  Activity, ArrowRight, ShieldCheck, AlertCircle, Clock,
  Moon, Sun, LogOut, AlertTriangle, CheckCircle
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

  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') setIsDarkMode(true);
    
    loadAdminData();
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('vsit_theme', !isDarkMode ? 'dark' : 'light');
  };

  const handleSecureLogout = async () => {
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.href = '/'; 
  };

  const loadAdminData = async () => {
    setLoading(true);

    // 🚀 THE ARMORED AUTH BYPASSER
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
      
      // Verify Admin status to stop loops
      if (cleanEmail !== 'lakhwinder.bi@outlook.com' && activeUser.role !== 'admin') {
        await supabase.auth.signOut();
        localStorage.clear();
        setAuthError('Access Denied: You do not possess administrative clearance.');
        return;
      }

      setAdminName(activeUser.full_name || activeUser.name || 'System Admin');

      // 1. Safe Fetch: Assets
      let assetCount = 0;
      const { count: assets } = await supabase.from('assets').select('*', { count: 'exact', head: true });
      assetCount = assets || 0;

      // 2. Safe Fetch: Pending Inspections
      let pendingCount = 0;
      let recentLogs: any[] = [];
      const { data: inspections } = await supabase.from('inspections').select('*, assets(asset_name)').order('created_at', { ascending: false });
      if (inspections) {
        pendingCount = inspections.filter(i => i.status?.toLowerCase().includes('pending')).length;
        recentLogs = inspections.slice(0, 5);
      }

      // 3. Safe Fetch: Tickets
      let ticketCount = 0;
      const { data: tickets } = await supabase.from('tickets').select('*');
      if (tickets) {
        ticketCount = tickets.filter(t => t.status === 'open' || t.status === 'in_repair' || t.status === 'pending').length;
      }

      // 4. Safe Fetch: Staff Profiles
      let staffCount = 0;
      const { count: staff } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      staffCount = staff || 0;

      setStats({
        totalAssets: assetCount,
        pendingInspections: pendingCount,
        activeTickets: ticketCount,
        totalStaff: staffCount
      });
      
      setRecentActivity(recentLogs);
      setLoading(false);

    } catch (e) { 
      console.error('Data load error:', e);
      setLoading(false); 
    }
  };

  // --- RENDERING ERROR STATE ---
  if (authError) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-6 bg-zinc-950 p-4 text-center">
        <div className="p-6 bg-rose-500/20 text-rose-500 rounded-full border-4 border-rose-500/30">
          <AlertTriangle size={48} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Authorization Failed</h1>
          <p className="text-sm font-bold text-zinc-400 mt-2">{authError}</p>
        </div>
        <button onClick={handleSecureLogout} className="px-8 py-4 bg-white hover:bg-zinc-200 text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
          Secure Logout & Return
        </button>
      </div>
    );
  }

  // --- RENDERING LOADING STATE ---
  if (loading) {
    return (
      <div className={`w-full h-screen flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'bg-zinc-950' : 'bg-[#F8FAFC]'}`}>
        <div className={`animate-spin rounded-full h-10 w-10 border-b-4 ${isDarkMode ? 'border-zinc-100' : 'border-[#002B49]'}`}></div>
        <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>Initializing Command Center...</p>
      </div>
    );
  }

  // --- CARBON BLACK & GRAY BLACK THEME DEFINITIONS ---
  const theme = {
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-[#F8FAFC]',
    card: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100',
    text: isDarkMode ? 'text-zinc-100' : 'text-[#002B49]',
    subText: isDarkMode ? 'text-zinc-400' : 'text-gray-500',
    cardHover: isDarkMode ? 'hover:border-zinc-700 hover:bg-zinc-800/50' : 'hover:border-gray-200 hover:shadow-md',
    iconBg: {
      blue: isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
      orange: isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-500',
      rose: isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-500',
      emerald: isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-500',
      gray: isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-50 text-gray-400',
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans pb-10`}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* 🚀 ENTERPRISE HEADER */}
        <div className={`${theme.card} rounded-3xl p-6 md:p-8 border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-colors`}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <ShieldCheck size={28} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
              <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${theme.text}`}>Systems Overview</h1>
            </div>
            <p className={`text-sm font-bold ${theme.subText}`}>Welcome back, {adminName}. Here is your IT infrastructure status.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All Systems Operational
            </div>
            <button onClick={toggleTheme} className={`p-3 rounded-xl border transition-colors ${theme.card} ${theme.cardHover}`}>
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>
            <button onClick={handleSecureLogout} className={`p-3 rounded-xl border transition-colors ${theme.card} hover:bg-rose-500 hover:text-white hover:border-rose-500 text-rose-500`}>
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* 📊 HIGH-LEVEL STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Inventory */}
          <div className={`${theme.card} p-6 rounded-3xl border shadow-sm flex flex-col justify-between group transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl transition-colors ${theme.iconBg.blue} group-hover:bg-blue-600 group-hover:text-white`}><Laptop size={24} /></div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${theme.subText}`}>Inventory</span>
            </div>
            <div>
              <h2 className={`text-4xl font-black ${theme.text}`}>{stats.totalAssets}</h2>
              <p className={`text-xs font-bold mt-1 ${theme.subText}`}>Total hardware units</p>
            </div>
          </div>

          {/* Verifications */}
          <div className={`${theme.card} p-6 rounded-3xl border shadow-sm flex flex-col justify-between group transition-all relative overflow-hidden ${theme.cardHover}`}>
            {stats.pendingInspections > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full" />}
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl transition-colors ${theme.iconBg.orange} group-hover:bg-orange-500 group-hover:text-white`}>
                {stats.pendingInspections > 0 ? <AlertCircle size={24} /> : <ClipboardCheck size={24} />}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${theme.subText}`}>Verifications</span>
            </div>
            <div>
              <h2 className={`text-4xl font-black ${stats.pendingInspections > 0 ? 'text-orange-500' : theme.text}`}>{stats.pendingInspections}</h2>
              <p className={`text-xs font-bold mt-1 ${theme.subText}`}>Pending approval</p>
            </div>
          </div>

          {/* Helpdesk */}
          <div className={`${theme.card} p-6 rounded-3xl border shadow-sm flex flex-col justify-between group transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl transition-colors ${theme.iconBg.rose} group-hover:bg-rose-500 group-hover:text-white`}><Ticket size={24} /></div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${theme.subText}`}>Helpdesk</span>
            </div>
            <div>
              <h2 className={`text-4xl font-black ${theme.text}`}>{stats.activeTickets}</h2>
              <p className={`text-xs font-bold mt-1 ${theme.subText}`}>Active IT tickets</p>
            </div>
          </div>

          {/* Network */}
          <div className={`${theme.card} p-6 rounded-3xl border shadow-sm flex flex-col justify-between group transition-all ${theme.cardHover}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl transition-colors ${theme.iconBg.emerald} group-hover:bg-emerald-500 group-hover:text-white`}><Users size={24} /></div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${theme.subText}`}>Network</span>
            </div>
            <div>
              <h2 className={`text-4xl font-black ${theme.text}`}>{stats.totalStaff}</h2>
              <p className={`text-xs font-bold mt-1 ${theme.subText}`}>Active staff accounts</p>
            </div>
          </div>
        </div>

        {/* 🧭 NAVIGATION ACTION CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-4">
            <h3 className={`text-xs font-black uppercase tracking-widest pl-2 ${theme.subText}`}>System Modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {[
                { title: 'Review Inspections', desc: 'Audit smartphone visual submissions and approve hardware.', icon: ClipboardCheck, path: '/admin/inspections', color: 'orange' },
                { title: 'Asset Registry', desc: 'Manage full hardware lifecycle, assignments, and serial tags.', icon: Laptop, path: '/admin/assets', color: 'blue' },
                { title: 'IT Helpdesk', desc: 'Resolve staff hardware issues and repair requests.', icon: Ticket, path: '/admin/tickets', color: 'rose' },
                { title: 'Staff Directory', desc: 'Manage employee access codes and profile data.', icon: Users, path: '/admin/staff', color: 'emerald' },
              ].map((module, i) => (
                <button 
                  key={i}
                  onClick={() => router.push(module.path)} 
                  className={`text-left ${theme.card} p-5 rounded-3xl border shadow-sm transition-all group relative overflow-hidden flex flex-col justify-between min-h-[140px] ${theme.cardHover}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme.iconBg[module.color as keyof typeof theme.iconBg]}`}>
                      <module.icon size={20} />
                    </div>
                    <h4 className={`text-sm font-black ${theme.text}`}>{module.title}</h4>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <p className={`text-[11px] font-bold max-w-[180px] ${theme.subText}`}>{module.desc}</p>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${theme.iconBg.gray} group-hover:bg-${module.color}-500 group-hover:text-white`}>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </button>
              ))}

            </div>
          </div>

          {/* 📡 LIVE ACTIVITY LOG */}
          <div className="space-y-4">
            <h3 className={`text-xs font-black uppercase tracking-widest pl-2 ${theme.subText}`}>Live Activity Log</h3>
            <div className={`${theme.card} rounded-3xl border shadow-sm p-5 h-[320px] overflow-hidden flex flex-col transition-colors`}>
              
              {recentActivity.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                  <Activity size={32} className={`${theme.subText} mb-2`} />
                  <p className={`text-xs font-bold ${theme.subText}`}>No recent network activity</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {recentActivity.map((log: any) => (
                    <div key={log.id} className={`flex gap-3 relative pb-4 border-b last:border-0 last:pb-0 ${isDarkMode ? 'border-zinc-800' : 'border-gray-50'}`}>
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border ${theme.iconBg.blue} ${isDarkMode ? 'border-blue-900/30' : 'border-blue-100'}`}>
                        <Clock size={12} />
                      </div>
                      <div>
                        <p className={`text-xs font-black ${theme.text}`}>
                          {log.user_email?.split('@')[0] || 'A user'} <span className={`font-bold ${theme.subText}`}>submitted an inspection.</span>
                        </p>
                        <p className={`text-[10px] font-mono mt-1 ${theme.subText}`}>{new Date(log.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button onClick={() => router.push('/admin/inspections')} className={`mt-4 w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}>
                View All Logs
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}