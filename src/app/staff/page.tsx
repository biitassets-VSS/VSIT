'use client';

import React, { useState, useEffect } from 'react';
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
  const [staffProfile, setStaffProfile] = useState<StaffData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    myAssets: 0,
    needsInspection: 0,
    inRepair: 0
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user profile securely matching the logged-in user
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        // Dynamically parse name or email prefix if full name field is empty
        const fullName = profile?.full_name || profile?.name || user.email?.split('@')[0] || 'Staff Member';
        const empCode = profile?.emp_code || 'EMP-' + user.id.slice(0, 4).toUpperCase();

        setStaffProfile({
          name: fullName,
          email: user.email || '',
          emp_code: empCode
        });

        // Fetch counts dynamically from the live database for this specific user
        const { count: assetsCount } = await supabase
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', user.id);

        const { count: inspectionCount } = await supabase
          .from('inspections')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_staff', user.id)
          .eq('status', 'pending');

        const { count: repairCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('raised_by', user.id)
          .eq('status', 'in_repair');

        setStats({
          myAssets: assetsCount || 0,
          needsInspection: inspectionCount || 0,
          inRepair: repairCount || 0
        });

      } catch (error) {
        console.error('Error loading dashboard metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ✨ DYNAMIC HERO WELCOME BANNER CARD RESTORED */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0f172a] flex items-center gap-2">
            Welcome back, {staffProfile?.name}! 👋
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 font-bold">
            <span>ID: <strong className="text-gray-700 font-extrabold">{staffProfile?.emp_code}</strong></span>
            <span className="text-gray-300">|</span>
            <span>Email: {staffProfile?.email}</span>
          </div>
        </div>
      </div>

      {/* QUICK LINKS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Raise Ticket', icon: Ticket, color: 'text-blue-500 bg-blue-50 border-blue-100/50' },
          { title: 'Submit Inspection', icon: ClipboardCheck, color: 'text-orange-500 bg-orange-50 border-orange-100/50' },
          { title: 'Request Asset', icon: PlusCircle, color: 'text-emerald-500 bg-emerald-50 border-emerald-100/50' },
          { title: 'Replace Asset', icon: RefreshCw, color: 'text-rose-500 bg-rose-50 border-rose-100/50' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button 
              key={item.title}
              className="bg-white border border-gray-100 p-5 rounded-[24px] shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group text-center"
            >
              <div className={`p-3.5 rounded-2xl transition-transform group-hover:scale-110 border ${item.color}`}>
                <Icon size={22} />
              </div>
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* COUNTER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'My Assets', count: stats.myAssets, icon: Laptop, color: 'bg-blue-500' },
          { label: 'Needs Inspection', count: stats.needsInspection, icon: AlertCircle, color: 'bg-orange-500' },
          { label: 'In Repair', count: stats.inRepair, icon: Clock, color: 'bg-rose-500' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100/80 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900">{stat.count}</p>
              </div>
              <div className={`p-3.5 rounded-2xl text-white ${stat.color} shadow-sm`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* TICKETS LOG BOX */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2">
          <Ticket size={18} className="text-[#ff9800]" />
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">My IT Tickets</h2>
        </div>
        <div className="p-8 text-center">
          <CheckCircle2 size={36} className="text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">No recent active tickets found.</p>
        </div>
      </div>

      {/* ASSET LOG BOX */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2">
          <Laptop size={18} className="text-emerald-500" />
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Assigned Asset Details</h2>
        </div>
        <div className="p-8 text-center">
          <Laptop size={36} className="text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">No inventory hardware assigned yet.</p>
        </div>
      </div>

    </div>
  );
}