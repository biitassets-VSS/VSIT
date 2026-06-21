'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Ticket, ClipboardCheck, PlusCircle, RefreshCw, 
  Laptop, AlertCircle, CheckCircle2, Clock 
} from 'lucide-react';

interface StaffData {
  name: string;
  email: string;
  emp_code: string;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [staffProfile, setStaffProfile] = useState<StaffData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Live Database Arrays for Logging Sections
  const [activeTickets, setActiveTickets] = useState<any[]>([]);
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);

  const [stats, setStats] = useState({
    myAssets: 0,
    needsInspection: 0,
    inRepair: 0
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const isGuest = localStorage.getItem('isGuestSession') === 'true';

        if (isGuest) {
          setStaffProfile({
            name: 'Demo Guest User',
            email: 'guest@vsit.com',
            emp_code: 'GUEST-MODE'
          });
          setStats({ myAssets: 3, needsInspection: 1, inRepair: 2 });
          setIsLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const fullName = profile?.full_name || profile?.name || 'Lakhwinder Canberra';
        const empCode = profile?.emp_code || 'EMP-002';
        const userEmail = user.email || 'migration_canberra.bi@outlook.com';

        setStaffProfile({
          name: fullName,
          email: userEmail,
          emp_code: empCode
        });

        // 🌟 FIX: SCAN BOTH UUID, EMAIL, AND EXACT FULL NAME STRINGS TO FORCE-CATCH THE ASSIGNED HARDWARE
        const { data: assetsData } = await supabase
          .from('assets')
          .select('*')
          .or(`assigned_to.eq.${user.id},assigned_to.eq.${userEmail},assigned_to.eq."${fullName}"`);
        
        if (assetsData) setAssignedAssets(assetsData);

        const { data: pendingInspections } = await supabase
          .from('inspections')
          .select('*')
          .eq('status', 'pending')
          .or(`assigned_staff.eq.${user.id},assigned_staff.eq.${userEmail},assigned_staff.eq."${fullName}"`);

        const { data: ticketsData } = await supabase
          .from('tickets')
          .select('*')
          .or(`raised_by.eq.${user.id},raised_by.eq.${userEmail}`)
          .order('created_at', { ascending: false });

        if (ticketsData) setActiveTickets(ticketsData);

        setStats({
          myAssets: assetsData?.length || 0,
          needsInspection: pendingInspections?.length || 0,
          inRepair: ticketsData?.filter(t => t.status === 'in_repair' || t.status === 'pending').length || 0
        });

      } catch (error) {
        console.error('Error loading dashboard metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();

    // Live Realtime listener for instant admin updates
    const channel = supabase
      .channel('staff_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => loadDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* WELCOME BANNER CARD */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#002B49] flex items-center gap-2">
            Welcome back, {staffProfile?.name}! 👋
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-bold">
            <span>ID: <strong className="text-gray-700">{staffProfile?.emp_code}</strong></span>
            <span className="text-gray-300">|</span>
            <span>Email: {staffProfile?.email}</span>
          </div>
        </div>
      </div>

      {/* QUICK LINKS HYPERLINK SYNC GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'RAISE TICKET', icon: Ticket, path: '/staff/tickets?action=new', color: 'text-blue-500 bg-blue-50 border-blue-100/50' },
          { title: 'SUBMIT INSPECTION', icon: ClipboardCheck, path: '/staff/inspections?action=new', color: 'text-orange-500 bg-orange-50 border-orange-100/50' },
          { title: 'REQUEST ASSET', icon: PlusCircle, path: '/staff/requests?action=new', color: 'text-emerald-500 bg-emerald-50 border-emerald-100/50' },
          { title: 'REPLACE ASSET', icon: RefreshCw, path: '/staff/assets?action=replace', color: 'text-rose-500 bg-rose-50 border-rose-100/50' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button 
              key={item.title}
              onClick={() => router.push(item.path)}
              className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group text-center"
            >
              <div className={`p-3.5 rounded-2xl transition-transform group-hover:scale-110 border ${item.color}`}>
                <Icon size={22} />
              </div>
              <span className="text-xs font-black text-gray-800 tracking-wider">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* METRIC COUNTER WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'MY ASSETS', count: stats.myAssets, icon: Laptop, color: 'bg-blue-500' },
          { label: 'NEEDS INSPECTION', count: stats.needsInspection, icon: AlertCircle, color: 'bg-orange-500' },
          { label: 'IN REPAIR', count: stats.inRepair, icon: Clock, color: 'bg-rose-500' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100/80 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900">{stat.count}</p>
              </div>
              <div className={`p-4 rounded-2xl text-white ${stat.color} shadow-sm flex items-center justify-center`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* MY IT TICKETS */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2">
          <Ticket size={18} className="text-[#ff9800]" />
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">MY IT TICKETS</h2>
        </div>
        <div className="p-8">
          {activeTickets.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle2 size={36} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">NO RECENT ACTIVE TICKETS FOUND.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTickets.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">FILED: {new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    t.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ASSIGNED ASSET DETAILS */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2">
          <Laptop size={18} className="text-emerald-500" />
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">ASSIGNED ASSET DETAILS</h2>
        </div>
        <div className="p-8">
          {assignedAssets.length === 0 ? (
            <div className="text-center py-4">
              <Laptop size={36} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">NO INVENTORY HARDWARE ASSIGNED YET.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedAssets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{asset.asset_name || asset.model || 'Corporate Hardware'}</p>
                    <p className="text-[10px] text-gray-400 font-mono font-bold mt-0.5">S/N: {asset.serial_number || 'N/A'}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {asset.status || 'Assigned'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}