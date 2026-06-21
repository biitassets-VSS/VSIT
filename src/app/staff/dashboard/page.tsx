'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Laptop, AlertCircle, Clock, Package } from 'lucide-react';

export default function StaffDashboard() {
  const [assetCount, setAssetCount] = useState(0);

  const fetchDashboardStats = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = (userData?.user?.email || 'students_app05@outlook.com').trim().toLowerCase();

      // Pull ALL assets to filter locally (Most reliable method)
      const { data: allAssets } = await supabase.from('assets').select('*');

      if (allAssets) {
        const myAssets = allAssets.filter(item => {
          const isAssigned = item.status?.toLowerCase().includes('assign') || item.status?.toLowerCase().includes('deploy');
          const code = (item.emp_code || '').trim().toUpperCase();
          const assignedTo = (item.assigned_to || '').trim().toLowerCase();
          
          return isAssigned && (
            code === 'EMP-7783' || 
            assignedTo.includes('mohit') || 
            assignedTo.includes(userEmail)
          );
        });

        setAssetCount(myAssets.length);
      }
    } catch (err) {
      console.error("Dashboard stats error:", err);
    }
  };

  useEffect(() => {
    fetchDashboardStats();

    // Listen for assignments from Admin
    const channel = supabase.channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        fetchDashboardStats();
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">My Assets</p>
            <p className="text-3xl font-black text-[#002B49]">{assetCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Laptop size={24}/></div>
        </div>
        {/* ... keep other dashboard cards as they are ... */}
      </div>

      {/* Assigned Asset Details Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-[#002B49] mb-4">ASSIGNED ASSET DETAILS</h2>
        {assetCount === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
            <Package className="mx-auto text-slate-300 mb-2" size={32}/>
            <p className="text-sm font-bold text-slate-400">NO INVENTORY HARDWARE ASSIGNED YET.</p>
          </div>
        ) : (
          <div className="text-emerald-600 font-bold">
            You have {assetCount} device(s) assigned to your account.
          </div>
        )}
      </div>
    </div>
  );
}