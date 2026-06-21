'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, Laptop, ClipboardCheck, Ticket, 
  Activity, ArrowRight, ShieldCheck, AlertCircle, Clock
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    totalAssets: 0,
    pendingInspections: 0,
    activeTickets: 0,
    totalStaff: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);

    // 1. Authenticate & Get Profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const { data: profile } = await supabase.from('profiles').select('full_name, name').eq('id', user.id).maybeSingle();
      if (profile) setAdminName(profile.full_name || profile.name || 'System Admin');
    } catch (e) { console.warn('Profile load skipped'); }

    // 2. Safe Fetch: Assets
    let assetCount = 0;
    try {
      const { count } = await supabase.from('assets').select('*', { count: 'exact', head: true });
      assetCount = count || 0;
    } catch (e) { console.warn('Asset fetch failed'); }

    // 3. Safe Fetch: Pending Inspections
    let pendingCount = 0;
    let recentLogs: any[] = [];
    try {
      const { data: inspections } = await supabase.from('inspections').select('*, assets(asset_name)').order('created_at', { ascending: false });
      if (inspections) {
        pendingCount = inspections.filter(i => i.status?.toLowerCase().includes('pending')).length;
        recentLogs = inspections.slice(0, 5); // Grab latest 5 for the activity feed
      }
    } catch (e) { console.warn('Inspection fetch failed'); }

    // 4. Safe Fetch: Tickets
    let ticketCount = 0;
    try {
      const { data: tickets } = await supabase.from('tickets').select('*');
      if (tickets) {
        ticketCount = tickets.filter(t => t.status === 'open' || t.status === 'in_repair' || t.status === 'pending').length;
      }
    } catch (e) { console.warn('Ticket fetch failed'); }

    // 5. Safe Fetch: Staff Profiles
    let staffCount = 0;
    try {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      staffCount = count || 0;
    } catch (e) { console.warn('Staff fetch failed'); }

    setStats({
      totalAssets: assetCount,
      pendingInspections: pendingCount,
      activeTickets: ticketCount,
      totalStaff: staffCount
    });
    setRecentActivity(recentLogs);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-[#002B49]"></div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Initializing Command Center...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 font-sans">
      
      {/* 🚀 ENTERPRISE HEADER */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck size={28} className="text-blue-600" />
            <h1 className="text-3xl font-black text-[#002B49] tracking-tight">Systems Overview</h1>
          </div>
          <p className="text-sm font-bold text-gray-500">Welcome back, {adminName}. Here is your IT infrastructure status.</p>
        </div>
        <div className="px-5 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          All Systems Operational
        </div>
      </div>

      {/* 📊 HIGH-LEVEL STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Laptop size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inventory</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-gray-900">{stats.totalAssets}</h2>
            <p className="text-xs font-bold text-gray-500 mt-1">Total hardware units</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-orange-200 transition-colors relative overflow-hidden">
          {stats.pendingInspections > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full" />}
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
              {stats.pendingInspections > 0 ? <AlertCircle size={24} /> : <ClipboardCheck size={24} />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verifications</span>
          </div>
          <div>
            <h2 className={`text-4xl font-black ${stats.pendingInspections > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{stats.pendingInspections}</h2>
            <p className="text-xs font-bold text-gray-500 mt-1">Pending approval</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-rose-200 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-colors"><Ticket size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Helpdesk</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-gray-900">{stats.activeTickets}</h2>
            <p className="text-xs font-bold text-gray-500 mt-1">Active IT tickets</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Users size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Network</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-gray-900">{stats.totalStaff}</h2>
            <p className="text-xs font-bold text-gray-500 mt-1">Active staff accounts</p>
          </div>
        </div>
      </div>

      {/* 🧭 NAVIGATION ACTION CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Quick Links */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 pl-2">System Modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <button onClick={() => router.push('/admin/inspections')} className="text-left bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center"><ClipboardCheck size={20} /></div>
                <h4 className="text-sm font-black text-gray-900">Review Inspections</h4>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-[11px] font-bold text-gray-400 max-w-[180px]">Audit smartphone visual submissions and approve hardware.</p>
                <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center text-gray-400 transition-colors"><ArrowRight size={14} /></div>
              </div>
            </button>

            <button onClick={() => router.push('/admin/assets')} className="text-left bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Laptop size={20} /></div>
                <h4 className="text-sm font-black text-gray-900">Asset Registry</h4>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-[11px] font-bold text-gray-400 max-w-[180px]">Manage full hardware lifecycle, assignments, and serial tags.</p>
                <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-gray-400 transition-colors"><ArrowRight size={14} /></div>
              </div>
            </button>

            <button onClick={() => router.push('/admin/tickets')} className="text-left bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Ticket size={20} /></div>
                <h4 className="text-sm font-black text-gray-900">IT Helpdesk</h4>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-[11px] font-bold text-gray-400 max-w-[180px]">Resolve staff hardware issues and repair requests.</p>
                <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center text-gray-400 transition-colors"><ArrowRight size={14} /></div>
              </div>
            </button>

            <button onClick={() => router.push('/admin/staff')} className="text-left bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center"><Users size={20} /></div>
                <h4 className="text-sm font-black text-gray-900">Staff Directory</h4>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-[11px] font-bold text-gray-400 max-w-[180px]">Manage employee access codes and profile data.</p>
                <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center text-gray-400 transition-colors"><ArrowRight size={14} /></div>
              </div>
            </button>

          </div>
        </div>

        {/* Right Column: Mini Activity Feed */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 pl-2">Live Activity Log</h3>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 h-[300px] overflow-hidden flex flex-col">
            
            {recentActivity.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <Activity size={32} className="text-gray-300 mb-2" />
                <p className="text-xs font-bold text-gray-500">No recent network activity</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex gap-3 relative pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <Clock size={12} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-800">
                        {log.user_email?.split('@')[0] || 'A user'} <span className="font-bold text-gray-400">submitted an inspection.</span>
                      </p>
                      <p className="text-[10px] font-mono text-gray-400 mt-1">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button onClick={() => router.push('/admin/inspections')} className="mt-4 w-full py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-[11px] font-black uppercase tracking-wider text-gray-600 transition-colors">
              View All Logs
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}