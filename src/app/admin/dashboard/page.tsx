'use client';

import React from 'react';
import { Search, Monitor, Users } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      
      {/* CLEAN PAGE HEADER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Manage hardware inventory and track staff presence.</p>
        </div>
        
        {/* Search Input smoothly integrated into the page */}
        <div className="relative w-full md:w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search Assets (Serial, Tag) or Staff (Name, ID)..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* DASHBOARD CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ASSETS STATUS CARD */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Assets Status</h2>
              <p className="text-sm text-gray-500">Hardware & Equipment Inventory</p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Monitor size={24} />
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-500 tracking-wide uppercase mb-1">Total Assets</p>
            <h3 className="text-4xl font-bold text-blue-600">439</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="bg-[#F8FAFC] border border-blue-100 p-4 rounded-xl">
              <h4 className="text-2xl font-bold text-blue-700">225</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                <p className="text-[10px] font-bold text-blue-600 uppercase">Assigned to Staff</p>
              </div>
            </div>
            <div className="bg-[#F0FDF4] border border-green-100 p-4 rounded-xl">
              <h4 className="text-2xl font-bold text-green-700">170</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                <p className="text-[10px] font-bold text-green-600 uppercase">In Stock</p>
              </div>
            </div>
            <div className="bg-[#FFFBEB] border border-orange-100 p-4 rounded-xl">
              <h4 className="text-2xl font-bold text-orange-700">20</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
                <p className="text-[10px] font-bold text-orange-600 uppercase">Under Repair</p>
              </div>
            </div>
            <div className="bg-[#FEF2F2] border border-red-100 p-4 rounded-xl">
              <h4 className="text-2xl font-bold text-red-700">24</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                <p className="text-[10px] font-bold text-red-600 uppercase">Discarded</p>
              </div>
            </div>
          </div>
        </div>

        {/* STAFF STATUS CARD */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Staff Status</h2>
              <p className="text-sm text-gray-500">Employee & Presence Tracking</p>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <Users size={24} />
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-500 tracking-wide uppercase mb-1">Total Registered Staff</p>
            <h3 className="text-4xl font-bold text-purple-600">115</h3>
          </div>

          <div className="flex justify-between text-center border-b border-gray-100 pb-6 mb-6">
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900">98</h4>
              <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Active</p>
            </div>
            <div className="flex-1 border-l border-r border-gray-100">
              <h4 className="text-xl font-bold text-gray-900">5</h4>
              <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Inactive</p>
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900">12</h4>
              <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Left Office</p>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <p className="text-xs font-bold text-gray-500 tracking-wide uppercase mb-2">Live Today (Active PC Status)</p>
            <div className="flex justify-between items-center bg-[#F0FDF4] p-3 rounded-xl border border-green-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-bold text-green-800">Present (PC Online)</span>
              </div>
              <span className="text-sm font-bold text-green-700">86 Staff</span>
            </div>
            
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                <span className="text-sm font-bold text-gray-600">On Leave / Offline</span>
              </div>
              <span className="text-sm font-bold text-gray-700">12 Staff</span>
            </div>
          </div>

        </div>

      </div>
    </div>
    
  );
}
