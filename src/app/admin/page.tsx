'use client';

import React from 'react';
import { 
  Users, Laptop, Ticket, ClipboardCheck, 
  TrendingUp, AlertCircle, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  // Mock Stats Data
  const stats = [
    { title: 'Total Staff', value: '42', icon: Users, color: 'bg-blue-50 text-blue-600', link: '/admin/staff' },
    { title: 'Active Assets', value: '156', icon: Laptop, color: 'bg-green-50 text-green-600', link: '/admin/assets' },
    { title: 'Pending Inspections', value: '8', icon: ClipboardCheck, color: 'bg-purple-50 text-purple-600', link: '/admin/inspections' },
    { title: 'Open Tickets', value: '3', icon: Ticket, color: 'bg-red-50 text-red-600', link: '/admin/tickets' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Welcome back, Admin 👋</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Here is what is happening across your organization today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
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

      {/* Recent Activity Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><TrendingUp size={20} className="text-orange-500"/> Recent Activity</h2>
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
