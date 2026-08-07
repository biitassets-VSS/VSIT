'use client';

import React, { useState, useEffect } from 'react';
import { Search, Monitor, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; 

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    totalAssets: 0, assignedToStaff: 0, inStock: 0, underRepair: 0, discarded: 0,
    totalStaff: 0, activeStaff: 0, inactiveStaff: 0, leftOfficeStaff: 0,
    presentOnline: 0, offlineStaff: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
    };
    syncTheme();
    fetchDashboardData();

    const assetChannel = supabase.channel('admin-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchDashboardData)
      .subscribe();

    return () => { supabase.removeChannel(assetChannel); };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: assets } = await supabase.from('assets').select('status');
      const { data: staff } = await supabase.from('staff').select('status, presence_status'); 

      const totalAssets = assets?.length || 0;
      let assigned = 0, stock = 0, repair = 0, discarded = 0;
      assets?.forEach((asset) => {
        const status = asset.status?.toLowerCase();
        if (status === 'assigned' || status === 'assigned to staff') assigned++;
        else if (status === 'in stock' || status === 'instock') stock++;
        else if (status === 'under repair' || status === 'repair') repair++;
        else if (status === 'discarded') discarded++;
      });

      const totalStaff = staff?.length || 0;
      let active = 0, inactive = 0, leftOffice = 0, present = 0, offline = 0;
      staff?.forEach((member) => {
        const status = member.status?.toLowerCase();
        const presence = member.presence_status?.toLowerCase();
        if (status === 'active') active++;
        else if (status === 'inactive') inactive++;
        else if (status === 'left office') leftOffice++;
        if (presence === 'present' || presence === 'online') present++;
        else offline++;
      });

      setMetrics({
        totalAssets, assignedToStaff: assigned, inStock: stock, underRepair: repair, discarded,
        totalStaff, activeStaff: active, inactiveStaff: inactive, leftOfficeStaff: leftOffice,
        presentOnline: present, offlineStaff: offline,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally { setLoading(false); }
  };

  // 🌟 UNIVERSAL PREMIUM GLASS THEME
  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFF9F2]',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-[40px] backdrop-saturate-[1.5] border border-white/70 shadow-[0_16px_40px_rgba(31,38,135,0.1)]',
    glassInner: isDarkMode 
      ? 'bg-black/30 backdrop-blur-xl border border-white/10 shadow-inner' 
      : 'bg-white/50 backdrop-blur-xl border border-white/80 shadow-[inset_0_2px_8px_rgba(255,255,255,0.6)]',
    inputBg: isDarkMode 
      ? 'bg-black/40 border border-white/10 text-white focus:border-purple-500/50' 
      : 'bg-white/50 border border-white/60 text-slate-900 focus:bg-white/70 focus:ring-4 focus:ring-purple-500/10',
  };

  return (
    <div className={`min-h-screen ${theme.bg} relative overflow-hidden font-sans antialiased pb-12 transition-colors duration-1000`}>
      {/* 🌟 GLOBAL BACKGROUND ORBS */}
      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vh] bg-orange-500/20 dark:bg-orange-600/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[50vw] h-[50vh] bg-purple-500/20 dark:bg-purple-700/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-black ${theme.textMain}`}>Dashboard Overview</h1>
            <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Manage hardware inventory and track staff presence.</p>
          </div>
          <div className={`relative w-full md:w-100 ${theme.glassInner} rounded-2xl flex items-center p-1`}>
            <Search className={`absolute left-4 ${theme.textSub}`} size={18} />
            <input type="text" placeholder="Search Assets or Staff..." className={`w-full pl-12 pr-4 py-2.5 bg-transparent text-sm font-semibold outline-none ${theme.textMain} placeholder:text-zinc-500`} />
          </div>
        </div>

        {/* DASHBOARD CARDS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ASSETS STATUS CARD */}
          <div className={`${theme.glassCard} rounded-4xl p-8 flex flex-col`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className={`text-xl font-black ${theme.textMain}`}>Assets Status</h2>
                <p className={`text-xs font-semibold ${theme.textSub} uppercase tracking-widest mt-1`}>Hardware Inventory</p>
              </div>
              <div className={`p-3.5 ${theme.glassInner} text-purple-500 rounded-2xl`}><Monitor size={24} /></div>
            </div>
            
            <div className="mb-8">
              <p className={`text-[10px] font-black ${theme.textSub} tracking-widest uppercase mb-1.5`}>Total Assets</p>
              <h3 className="text-5xl font-black text-purple-500">
                {loading ? <span className="animate-pulse">...</span> : metrics.totalAssets}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-auto">
              <div className={`p-5 rounded-3xl ${theme.glassInner}`}>
                <h4 className={`text-2xl font-black ${theme.textMain}`}>{loading ? '...' : metrics.assignedToStaff}</h4>
                <div className="flex items-center gap-2 mt-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div><p className={`text-[10px] font-black ${theme.textSub} uppercase tracking-widest`}>Assigned</p></div>
              </div>
              <div className={`p-5 rounded-3xl ${theme.glassInner}`}>
                <h4 className={`text-2xl font-black ${theme.textMain}`}>{loading ? '...' : metrics.inStock}</h4>
                <div className="flex items-center gap-2 mt-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><p className={`text-[10px] font-black ${theme.textSub} uppercase tracking-widest`}>In Stock</p></div>
              </div>
              <div className={`p-5 rounded-3xl ${theme.glassInner}`}>
                <h4 className={`text-2xl font-black ${theme.textMain}`}>{loading ? '...' : metrics.underRepair}</h4>
                <div className="flex items-center gap-2 mt-1.5"><div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div><p className={`text-[10px] font-black ${theme.textSub} uppercase tracking-widest`}>Repair</p></div>
              </div>
              <div className={`p-5 rounded-3xl ${theme.glassInner}`}>
                <h4 className={`text-2xl font-black ${theme.textMain}`}>{loading ? '...' : metrics.discarded}</h4>
                <div className="flex items-center gap-2 mt-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div><p className={`text-[10px] font-black ${theme.textSub} uppercase tracking-widest`}>Discarded</p></div>
              </div>
            </div>
          </div>

          {/* STAFF STATUS CARD */}
          <div className={`${theme.glassCard} rounded-4xl p-8 flex flex-col`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className={`text-xl font-black ${theme.textMain}`}>Staff Status</h2>
                <p className={`text-xs font-semibold ${theme.textSub} uppercase tracking-widest mt-1`}>Presence Tracking</p>
              </div>
              <div className={`p-3.5 ${theme.glassInner} text-orange-500 rounded-2xl`}><Users size={24} /></div>
            </div>
            
            <div className="mb-8">
              <p className={`text-[10px] font-black ${theme.textSub} tracking-widest uppercase mb-1.5`}>Registered Staff</p>
              <h3 className="text-5xl font-black text-orange-500">
                {loading ? <span className="animate-pulse">...</span> : metrics.totalStaff}
              </h3>
            </div>

            <div className={`flex justify-between text-center p-4 rounded-3xl ${theme.glassInner} mb-6`}>
              <div className="flex-1"><h4 className={`text-xl font-black ${theme.textMain}`}>{loading ? '...' : metrics.activeStaff}</h4><p className={`text-[9px] font-black ${theme.textSub} uppercase mt-1`}>Active</p></div>
              <div className={`flex-1 border-x ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}><h4 className={`text-xl font-black ${theme.textMain}`}>{loading ? '...' : metrics.inactiveStaff}</h4><p className={`text-[9px] font-black ${theme.textSub} uppercase mt-1`}>Inactive</p></div>
              <div className="flex-1"><h4 className={`text-xl font-black ${theme.textMain}`}>{loading ? '...' : metrics.leftOfficeStaff}</h4><p className={`text-[9px] font-black ${theme.textSub} uppercase mt-1`}>Left Office</p></div>
            </div>

            <div className="mt-auto space-y-3">
              <p className={`text-[10px] font-black ${theme.textSub} tracking-widest uppercase mb-2`}>Live Today (PC Status)</p>
              <div className={`flex justify-between items-center p-4 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div><span className="text-xs font-black uppercase tracking-widest text-emerald-500">Present (Online)</span></div>
                <span className="text-sm font-black text-emerald-600">{loading ? '...' : `${metrics.presentOnline} Staff`}</span>
              </div>
              <div className={`flex justify-between items-center p-4 rounded-2xl ${theme.glassInner}`}>
                <div className="flex items-center gap-3"><div className={`w-2.5 h-2.5 rounded-full ${isDarkMode ? 'bg-zinc-600' : 'bg-slate-400'}`}></div><span className={`text-xs font-black uppercase tracking-widest ${theme.textSub}`}>On Leave / Offline</span></div>
                <span className={`text-sm font-black ${theme.textMain}`}>{loading ? '...' : `${metrics.offlineStaff} Staff`}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}