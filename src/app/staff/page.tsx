'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Laptop, Ticket, Monitor, AlertCircle, 
  CheckCircle2, Clock, PlusCircle, Activity 
} from 'lucide-react';

export default function StaffDashboard() {
  const myStats = [
    { title: 'My Assets', value: '3', icon: Laptop, color: 'bg-blue-50 text-blue-600', link: '/staff/assets' },
    { title: 'Open Tickets', value: '1', icon: Ticket, color: 'bg-orange-50 text-orange-600', link: '/staff/tickets' },
    { title: 'Resolved Tickets', value: '4', icon: CheckCircle2, color: 'bg-green-50 text-green-600', link: '/staff/tickets' },
  ];

  const myAssets = [
    { name: 'MacBook Pro M2', tag: 'TAG-1045', type: 'Laptop', status: 'Healthy', icon: Laptop },
    { name: 'Dell UltraSharp 27"', tag: 'TAG-2099', type: 'Monitor', status: 'Healthy', icon: Monitor },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Welcome back, Lakhwinder 👋</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Here is the status of your assigned IT equipment and support requests.</p>
        </div>
        <Link 
          href="/staff/tickets" 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200 transition-all font-bold text-sm"
        >
          <PlusCircle size={18} />
          Raise New Ticket
        </Link>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {myStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} href={stat.link} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">{stat.title}</p>
                <h3 className="text-3xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{stat.value}</h3>
              </div>
              <div className={`p-4 rounded-xl ${stat.color}`}>
                <Icon size={24} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* MY ASSETS LIST */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Laptop size={20} className="text-blue-500"/> My Assigned Assets
            </h2>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-3">
            {myAssets.map((asset, index) => {
              const Icon = asset.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{asset.name}</h3>
                      <p className="text-xs font-semibold text-gray-500 tracking-wide mt-0.5">{asset.tag}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-100">
                    <CheckCircle2 size={14} /> {asset.status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RECENT TICKETS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Activity size={20} className="text-orange-500"/> Recent IT Tickets
            </h2>
            <Link href="/staff/tickets" className="text-sm font-bold text-blue-600 hover:text-blue-700">View All →</Link>
          </div>
          <div className="divide-y divide-gray-100 p-2">
            
            <div className="p-4 flex items-start gap-4 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="bg-orange-50 p-2.5 rounded-full text-orange-500 mt-0.5"><AlertCircle size={18} /></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-gray-900">Screen flickering occasionally</p>
                  <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Open</span>
                </div>
                <p className="text-xs font-medium text-gray-500 mt-1">MacBook Pro M2 (TAG-1045)</p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-gray-400">
                  <Clock size={12} /> Raised today at 9:30 AM
                </div>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="bg-green-50 p-2.5 rounded-full text-green-500 mt-0.5"><CheckCircle2 size={18} /></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-gray-900">Need access to Adobe Creative Cloud</p>
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Resolved</span>
                </div>
                <p className="text-xs font-medium text-gray-500 mt-1">Software Request</p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-gray-400">
                  <Clock size={12} /> Resolved on Oct 12, 2023
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
