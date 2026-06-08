'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

// --- EXACT CATEGORIES LIST ---
const CATEGORIES = [
  'Laptop', 'Keyboards', 'Headphones', 'Mobile Phone', 
  'Stand', 'Mouse', 'Mouse Pad', 'Cleaning Kits', 'Others'
];

// Mock Data
const mockAssets = [
  {
    id: 1, name: 'Dell XPS 15', tag: 'AST-042', serial: 'SN-998234', category: 'Laptop',
    staffName: 'John Doe', empId: 'EMP-101', status: 'Assigned',
    purchaseDate: '2022-01-10', warranty: '2025-01-10',
    history: [
      { id: 101, date: '2022-10-10', type: 'Inspection', details: 'Yearly check passed.' },
      { id: 102, date: '2022-01-15', type: 'Assignment', details: 'Assigned to John Doe (EMP-101)' }
    ]
  },
  {
    id: 2, name: 'Logitech MX Master 3', tag: 'AST-088', serial: 'C02XG8888', category: 'Mouse',
    staffName: 'Jane Smith', empId: 'EMP-105', status: 'In Repair',
    purchaseDate: '2023-05-20', warranty: '2026-05-20',
    history: []
  }
];

export default function AdminAssetsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState('All');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const filteredAssets = useMemo(() => {
    return mockAssets.filter((asset) => {
      const matchCategory = selectedCategory === 'All' || asset.category === selectedCategory;
      const matchStaff = selectedStaff === 'All' || 
                         (selectedStaff === 'Assigned' && asset.staffName !== 'Unassigned') ||
                         (selectedStaff === 'Unassigned' && asset.staffName === 'Unassigned');
      const q = searchQuery.toLowerCase();
      const matchSearch = q === '' || 
        asset.tag.toLowerCase().includes(q) ||
        asset.serial.toLowerCase().includes(q) ||
        asset.staffName.toLowerCase().includes(q) ||
        asset.empId.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q);

      return matchCategory && matchStaff && matchSearch;
    });
  }, [searchQuery, selectedCategory, selectedStaff]);

  return (
    <div className="w-full space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets Management</h1>
          <p className="text-sm text-gray-500">Manage, track, and inspect company assets.</p>
        </div>
        <Link 
          href="/admin/assets/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add New Asset
        </Link>
      </div>

      {/* FILTERS & SEARCH BAR - FIXED READABILITY */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by Tag, Serial, Staff Name, or Emp ID..."
            // Added text-gray-900, bg-white, and placeholder-gray-500 so it is perfectly readable
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {/* Category Filter */}
        <select 
          className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm min-w-[160px]"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Staff Filter */}
        <select 
          className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm min-w-[150px]"
          value={selectedStaff}
          onChange={(e) => setSelectedStaff(e.target.value)}
        >
          <option value="All">All Staff</option>
          <option value="Assigned">Assigned Only</option>
          <option value="Unassigned">Unassigned Only</option>
        </select>
      </div>

      {/* ASSETS TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Asset Info</th>
                <th className="px-6 py-4 font-semibold">Serial No.</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Assigned To</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <button onClick={() => setSelectedAsset(asset)} className="text-left group focus:outline-none">
                        <div className="font-bold text-blue-600 group-hover:text-blue-800 group-hover:underline transition-all">
                          {asset.name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5 group-hover:text-gray-700">
                          {asset.tag}
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{asset.serial}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                        {asset.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{asset.staffName}</div>
                      {asset.empId !== 'N/A' && <div className="text-xs text-gray-500 font-mono">{asset.empId}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${
                        asset.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' :
                        asset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No assets found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
