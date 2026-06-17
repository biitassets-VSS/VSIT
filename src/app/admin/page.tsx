'use client';

import React, { useState, useEffect } from 'react';
import { Package, Users, ClipboardCheck, AlertTriangle, TrendingUp, Activity, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalAssets: 0, activeStaff: 0, pendingInspections: 0 });

  useEffect(() => {
    const assets = JSON.parse(localStorage.getItem('vsit_assets_inventory') || '[]');
    const staff = JSON.parse(localStorage.getItem('vsit_staff_users') || '[]');
    setStats({
      totalAssets: assets.length || 142,
      activeStaff: staff.filter((s: any) => s.isActive).length || 45,
      pendingInspections: 12
    });
  }, []);

  const statCards = [
    { title: 'Total Assets', value: stats.totalAssets, icon: Package, color: 'bg-teal-500', trend: '+12% this month' },
    { title: 'Active Staff', value: stats.activeStaff, icon: Users, color: 'bg-emerald-500', trend: 'Fully staffed' },
    { title: 'Pending Review', value: stats.pendingInspections, icon: ClipboardCheck, color: 'bg-orange-500', trend: 'Requires attention' },
    { title: 'Needs Repair', value: 4, icon: AlertTriangle, color: 'bg-red-500', trend: '2 resolved today' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
            Overview Dashboard <span className="text-teal-600">.</span>
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-2">Welcome back, Admin. Here is what's happening today.</p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl text-white ${stat.color} shadow-sm group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">Today</span>
            </div>
            <div>
              <h3 className="text-3xl font-black text-gray-900">{stat.value}</h3>
              <p className="text-sm font-bold text-gray-500 mt-1">{stat.title}</p>
              <div className="flex items-center gap-1.5 mt-4 text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                <TrendingUp size={14} className={stat.color.replace('bg-', 'text-')} />
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS / ACTIVITY SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-5">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2"><Activity size={18} className="text-teal-500"/> Recent Activity</h3>
          </div>
          <div className="space-y-5">
            {[
              { title: 'MacBook Pro M2 Assigned', user: 'Lakhwinder Singh', time: '2 hours ago', icon: Package, color: 'text-teal-500 bg-teal-50' },
              { title: 'Inspection Passed', user: 'Monitor TAG-889', time: '5 hours ago', icon: CheckCircle2, color: 'text-green-500 bg-green-50' },
              { title: 'Asset Flagged for Repair', user: 'Keyboard TAG-102', time: 'Yesterday', icon: AlertTriangle, color: 'text-red-500 bg-red-50' }
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activity.color}`}><activity.icon size={18} /></div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{activity.user}</p>
                </div>
                <span className="ml-auto text-xs font-bold text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-5">
            <h3 className="text-base font-black text-gray-900">Quick Actions</h3>
          </div>
          <div className="space-y-3">
             <button className="w-full bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white px-5 py-4 rounded-2xl font-bold text-sm text-left flex justify-between items-center transition-all group">
                Add New Asset <Package size={18} className="text-teal-400 group-hover:text-white transition-colors" />
             </button>
             <button className="w-full bg-gray-50 text-gray-700 hover:bg-gray-100 px-5 py-4 rounded-2xl font-bold text-sm text-left flex justify-between items-center transition-all group">
                Register Staff <Users size={18} className="text-gray-400 group-hover:text-gray-600" />
             </button>
             <button className="w-full bg-gray-50 text-gray-700 hover:bg-gray-100 px-5 py-4 rounded-2xl font-bold text-sm text-left flex justify-between items-center transition-all group">
                Review Inspections <ClipboardCheck size={18} className="text-gray-400 group-hover:text-gray-600" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
