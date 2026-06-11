'use client';

import React from 'react';
import { 
  Users, Laptop, Ticket, ClipboardCheck, 
  TrendingUp, AlertCircle, CheckCircle2,
  UserCheck, UserMinus, Archive, Wrench, 
  MonitorPlay, CheckSquare, Activity
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  
  // 📌 1. High-Level KPIs (Top Row)
  const topKpis = [
    { title: 'Total Staff', value: '45', icon: Users, color: 'bg-blue-50 text-blue-600', link: '/admin/staff' },
    { title: 'Total Assets', value: '156', icon: Laptop, color: 'bg-indigo-50 text-indigo-600', link: '/admin/assets' },
    { title: 'Open Tickets', value: '3', icon: Ticket, color: 'bg-red-50 text-red-600', link: '/admin/tickets' },
    { title: 'Inspections Due', value: '8', icon: ClipboardCheck, color: 'bg-orange-50 text-orange-600', link: '/admin/inspections' },
  ];

  // 📌 2. Staff Status Breakdown
  const staffStatus = [
    { label: 'Active Staff', value: '38', icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Offline Staff', value: '7', icon: UserMinus, color: 'text-gray-500', bg: 'bg-gray-100' }
  ];

  // 📌 3. Asset Inventory Breakdown
  const assetStatus = [
    { label: 'Assigned', value: '110', icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'In Stock', value: '32', icon: Archive, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Under Repair', value: '9', icon: Wrench, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'In Demo Use', value: '5', icon: MonitorPlay, color: 'text-purple-600', bg: 'bg-purple-50' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Welcome back, Admin 👋</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Here is the current status of your staff and IT assets.</p>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-xl border border-orange-100 shadow-sm text-sm font-bold">
          <Activity size={18} className="animate-pulse" />
          Live Overview
        </div>
      </div>

      {/* TOP SUMMARY KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topKpis.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} href={stat.link} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">{stat.title}</p>
                <h3 className="text-3xl font-black text-gray-900 group-hover:text-orange-600 transition-colors">{stat.value}</h3>
              </div>
              <div className={`p-4 rounded-xl ${stat.color}`}>
                <Icon size={24} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* DETAILED BREAKDOWNS (STAFF & ASSETS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* STAFF STATUS PANEL (Takes up 1 column) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-1 flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><Users size={20} className="text-blue-500"/> Staff Status</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4 justify-center">
            {staffStatus.map((status, index) => {
              const Icon = status.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${status.bg} ${status.color}`}>
                      <Icon size={20} />
                    </div>
                    <span className="font-bold text-gray-700">{status.label}</span>
                  </div>
                  <span className={`text-2xl font-black ${status.color}`}>{status.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ASSET INVENTORY PANEL (Takes up 2 columns) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2 flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><Laptop size={20} className="text-indigo-500"/> Asset Inventory Details</h2>
            <Link href="/admin/assets" className="text-sm font-bold text-orange-600 hover:text-orange-700">View All →</Link>
          </div>
          <div className="p-6 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assetStatus.map((status, index) => {
              const Icon = status.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${status.bg} ${status.color}`}>
                      <Icon size={20} />
                    </div>
                    <span className="font-bold text-gray-700">{status.label}</span>
                  </div>
                  <span className={`text-2xl font-black ${status.color}`}>{status.value}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* RECENT ACTIVITY */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><TrendingUp size={20} className="text-orange-500"/> Recent Activity Log</h2>
        </div>
        <div className="divide-y divide-gray-100 p-2">
          
          <div className="p-4 flex items-center gap-4 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="bg-red-50 p-3 rounded-full text-red-500"><AlertCircle size={20} /></div>
            <div>
              <p className="text-sm font-bold text-gray-900">New Ticket Raised by Lakhwinder Singh</p>
              <p className="text-xs font-medium text-gray-500">MacBook Pro M2 - Screen flickering • 10 mins ago</p>
            </div>
          </div>

          <div className="p-4 flex items-center gap-4 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="bg-purple-50 p-3 rounded-full text-purple-500"><MonitorPlay size={20} /></div>
            <div>
              <p className="text-sm font-bold text-gray-900">Asset Moved to Demo</p>
              <p className="text-xs font-medium text-gray-500">iPad Pro (TAG-1088) assigned to Demo Room B • 1 hour ago</p>
            </div>
          </div>

          <div className="p-4 flex items-center gap-4 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="bg-green-50 p-3 rounded-full text-green-500"><CheckCircle2 size={20} /></div>
            <div>
              <p className="text-sm font-bold text-gray-900">Inspection Completed</p>
              <p className="text-xs font-medium text-gray-500">Dell Monitor (TAG-1002) passed inspection • 2 hours ago</p>
            </div>
          </div>

          <div className="p-4 flex items-center gap-4 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="bg-blue-50 p-3 rounded-full text-blue-500"><Users size={20} /></div>
            <div>
              <p className="text-sm font-bold text-gray-900">New Staff Member Added</p>
              <p className="text-xs font-medium text-gray-500">Jane Doe was added to IT Department • Yesterday</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
