'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, Users, ClipboardCheck, 
  Wrench, Activity, CheckCircle2, AlertTriangle, ArrowRight
} from 'lucide-react';

// --- Interfaces ---
interface Asset {
  id: string;
  name: string;
  tagId: string;
  status: string;
  inspectionAlert?: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalAssets: 0,
    assignedAssets: 0,
    repairAssets: 0,
    totalStaff: 0,
    overdueInspections: 0
  });
  
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch live data from local storage to make the dashboard actually work
    const savedAssets = JSON.parse(localStorage.getItem('vsit_assets_inventory') || '[]');
    const savedStaff = JSON.parse(localStorage.getItem('vsit_staff_users') || '[]');

    // Calculate real stats
    setStats({
      totalAssets: savedAssets.length,
      assignedAssets: savedAssets.filter((a: any) => a.status === 'Assigned').length,
      repairAssets: savedAssets.filter((a: any) => a.status === 'Repair').length,
      totalStaff: savedStaff.length || 2, // Fallback to 2 if empty
      overdueInspections: savedAssets.filter((a: any) => a.inspectionAlert === 'Overdue').length
    });

    // Get 4 most recent assets for the activity feed
    setRecentAssets(savedAssets.slice(0, 4));
    setIsLoading(false);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Welcome Back, Admin 👋</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Here is the latest overview of your asset inventory.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ========================================== */}
        {/* LEFT COLUMN (STATS & RECENT)               */}
        {/* ========================================== */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* STATS GRID */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {/* Total Assets */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-teal-200 transition-colors">
              <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-4">
                <Package size={24} />
              </div>
              <p className="text-sm font-bold text-gray-500 mb-1">Total Assets</p>
              <h3 className="text-3xl font-black text-gray-900">{isLoading ? '-' : stats.totalAssets}</h3>
            </div>

            {/* Assigned */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-bold text-gray-500 mb-1">Assigned</p>
              <h3 className="text-3xl font-black text-gray-900">{isLoading ? '-' : stats.assignedAssets}</h3>
            </div>

            {/* Under Repair */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center hover:border-orange-200 transition-colors">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-4">
                <Wrench size={24} />
              </div>
              <p className="text-sm font-bold text-gray-500 mb-1">Under Repair</p>
              <h3 className="text-3xl font-black text-gray-900">{isLoading ? '-' : stats.repairAssets}</h3>
            </div>

            {/* Total Staff */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center hover:border-purple-200 transition-colors">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-4">
                <Users size={24} />
              </div>
              <p className="text-sm font-bold text-gray-500 mb-1">Total Staff</p>
              <h3 className="text-3xl font-black text-gray-900">{isLoading ? '-' : stats.totalStaff}</h3>
            </div>
          </div>

          {/* RECENT ASSETS WIDGET */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Activity size={20} className="text-teal-600" /> Recently Added
              </h2>
              <Link href="/admin/assets" className="text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View All <ArrowRight size={16} />
              </Link>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center p-4 text-gray-400 font-bold text-sm">Loading...</div>
              ) : recentAssets.length === 0 ? (
                <div className="text-center p-6 text-gray-400 font-bold text-sm bg-gray-50 rounded-2xl">No assets found in inventory.</div>
              ) : (
                recentAssets.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 font-mono text-[10px] font-black">
                        {asset.tagId.split('-')[1] || 'AST'}
                      </div>
                      <div>
                        <p className="font-black text-sm text-gray-900">{asset.name}</p>
                        <p className="text-[11px] font-bold text-gray-500 uppercase">{asset.tagId}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border ${
                      asset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                      asset.status === 'Repair' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                      'bg-green-50 text-green-700 border-green-100'
                    }`}>
                      {asset.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT COLUMN (QUICK ACTIONS & ALERTS)      */}
        {/* ========================================== */}
        <div className="space-y-6">
          
          {/* EXACT MATCH: QUICK ACTIONS FROM SCREENSHOT */}
          <div className="bg-white rounded-[32px] p-7 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-[22px] font-black text-[#0f172a] mb-6">Quick Actions</h2>
            
            <div className="space-y-3.5">
              
              {/* 1. Add New Asset (Teal) */}
              <Link href="/admin/assets/new" className="flex items-center justify-between p-5 bg-[#f0fcf9] hover:bg-[#e1f8f3] transition-colors rounded-2xl group">
                <span className="font-black text-[15px] text-[#0d7a66] tracking-tight">Add New Asset</span>
                <Package size={22} className="text-[#0d7a66] opacity-90 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              </Link>

              {/* 2. Register Staff (Gray) */}
              <Link href="/admin/staff" className="flex items-center justify-between p-5 bg-[#f8fafc] hover:bg-[#f1f5f9] transition-colors rounded-2xl group border border-transparent hover:border-gray-100">
                <span className="font-black text-[15px] text-[#334155] tracking-tight">Register Staff</span>
                <Users size={22} className="text-[#94a3b8] group-hover:text-[#64748b] group-hover:scale-110 transition-all" strokeWidth={2.5} />
              </Link>

              {/* 3. Review Inspections (Gray) */}
              <Link href="/admin/assets" className="flex items-center justify-between p-5 bg-[#f8fafc] hover:bg-[#f1f5f9] transition-colors rounded-2xl group border border-transparent hover:border-gray-100">
                <span className="font-black text-[15px] text-[#334155] tracking-tight">Review Inspections</span>
                <ClipboardCheck size={22} className="text-[#94a3b8] group-hover:text-[#64748b] group-hover:scale-110 transition-all" strokeWidth={2.5} />
              </Link>

            </div>
          </div>

          {/* DYNAMIC ALERTS WIDGET */}
          <div className="bg-red-50/50 rounded-3xl p-6 border border-red-100 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-red-900 mb-1">Attention Required</h3>
                <p className="text-xs font-bold text-red-700/80 leading-relaxed mb-3">
                  You have <span className="text-red-600 font-black px-1">{stats.overdueInspections}</span> assets with overdue inspections that need your review.
                </p>
                <Link href="/admin/assets" className="text-xs font-black text-red-700 bg-red-100 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors inline-block">
                  Review Now
                </Link>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
