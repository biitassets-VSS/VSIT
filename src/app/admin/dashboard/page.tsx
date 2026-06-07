'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Dummy data for Asset Categories to show the design
  const assetCategories = [
    { name: 'Laptops', assigned: 42, stock: 8, repair: 2, discarded: 1 },
    { name: 'Wireless Keyboard Kits', assigned: 25, stock: 15, repair: 0, discarded: 2 },
    { name: 'USB Keyboard Kits', assigned: 15, stock: 20, repair: 1, discarded: 5 },
    { name: 'Mouse (All)', assigned: 38, stock: 22, repair: 0, discarded: 4 },
    { name: 'Headphones', assigned: 30, stock: 10, repair: 3, discarded: 2 },
    { name: 'Laptop Stands', assigned: 20, stock: 5, repair: 0, discarded: 0 },
    { name: 'Cleaning Kits', assigned: 10, stock: 40, repair: 0, discarded: 0 },
    { name: 'Others (Cables, Adapters)', assigned: 45, stock: 50, repair: 0, discarded: 10 },
  ];

  return (
    <div className="w-full min-h-screen space-y-6 pb-10 animate-[fadeIn_0.5s_ease-out]">
      
      {/* 1. TOP BAR & GLOBAL SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-100">
        
        {/* Search Bar */}
        <div className="relative w-full md:w-1/2 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all duration-300 sm:text-sm"
            placeholder="Search Assets (Serial, Tag) or Staff (Name, ID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Profile / Logout */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-gray-800">Admin Portal</p>
            <p className="text-xs text-gray-500">IT Management</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300"
          >
            Logout
          </button>
        </div>
      </div>

      {/* 2. MAIN DASHBOARD WIDGETS (Assets & Staff) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* WIDGET 1: ASSETS OVERVIEW */}
        <div className="bg-white rounded-2xl p-6 shadow-xl shadow-gray-200/40 border border-gray-100 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Assets Status</h2>
              <p className="text-sm text-gray-500">Hardware & Equipment Inventory</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Assets</p>
            <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              439
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">225</p>
              <p className="text-xs font-semibold text-blue-600 uppercase mt-1">● Assigned to Staff</p>
            </div>
            <div className="p-4 rounded-xl bg-green-50/50 border border-green-100">
              <p className="text-2xl font-bold text-green-700">170</p>
              <p className="text-xs font-semibold text-green-600 uppercase mt-1">● In Stock</p>
            </div>
            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100">
              <p className="text-2xl font-bold text-orange-700">20</p>
              <p className="text-xs font-semibold text-orange-600 uppercase mt-1">● Under Repair</p>
            </div>
            <div className="p-4 rounded-xl bg-red-50/50 border border-red-100">
              <p className="text-2xl font-bold text-red-700">24</p>
              <p className="text-xs font-semibold text-red-600 uppercase mt-1">● Discarded</p>
            </div>
          </div>
        </div>

        {/* WIDGET 2: STAFF OVERVIEW */}
        <div className="bg-white rounded-2xl p-6 shadow-xl shadow-gray-200/40 border border-gray-100 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Staff Status</h2>
              <p className="text-sm text-gray-500">Employee & Presence Tracking</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Registered Staff</p>
            <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              115
            </p>
          </div>

          {/* Staff Breakdown */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center border-b border-gray-100 pb-4">
               <div>
                  <p className="text-xl font-bold text-gray-800">98</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Active</p>
               </div>
               <div className="border-l border-r border-gray-100">
                  <p className="text-xl font-bold text-gray-800">5</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Inactive</p>
               </div>
               <div>
                  <p className="text-xl font-bold text-gray-800">12</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Left Office</p>
               </div>
            </div>

            {/* Live Presence Simulation */}
            <div className="pt-2">
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Live Today (Active PC Status)</p>
               <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center bg-green-50 px-4 py-3 rounded-lg border border-green-100">
                     <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-semibold text-green-700">Present (PC Online)</span>
                     </div>
                     <span className="font-bold text-green-700">86 Staff</span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                     <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-gray-400"></span>
                        <span className="text-sm font-semibold text-gray-600">On Leave / Offline</span>
                     </div>
                     <span className="font-bold text-gray-600">12 Staff</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CATEGORY WISE ASSET BREAKDOWN */}
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-bold text-gray-800">Inventory by Category</h2>
          <p className="text-sm text-gray-500">Detailed breakdown of stock, assigned, and discarded items</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Category Name</th>
                <th className="px-6 py-4 font-semibold text-center">Assigned</th>
                <th className="px-6 py-4 font-semibold text-center">In Stock</th>
                <th className="px-6 py-4 font-semibold text-center">Under Repair</th>
                <th className="px-6 py-4 font-semibold text-center">Discarded</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y divide-gray-50">
              {assetCategories.map((cat, index) => (
                <tr key={index} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold">
                      {cat.assigned}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-semibold">
                      {cat.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${cat.repair > 0 ? 'bg-orange-50 text-orange-700' : 'text-gray-400'}`}>
                      {cat.repair}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${cat.discarded > 0 ? 'bg-red-50 text-red-700' : 'text-gray-400'}`}>
                      {cat.discarded}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
  