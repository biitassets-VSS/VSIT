'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

// --- MOCK DATA ---
// (Replace this with your actual database fetch later)
const mockAssets = [
  {
    id: 1, name: 'Dell XPS 15', tag: 'AST-042', serial: 'SN-998234', category: 'Laptop',
    staffName: 'John Doe', empId: 'EMP-101', status: 'Assigned',
    purchaseDate: '2022-01-10', warranty: '2025-01-10',
    history: [
      { id: 101, date: '2022-10-10', type: 'Inspection', details: 'Yearly check passed. No issues.' },
      { id: 102, date: '2022-01-15', type: 'Assignment', details: 'Assigned to John Doe (EMP-101)' },
      { id: 103, date: '2022-01-10', type: 'System', details: 'Asset added to inventory.' }
    ]
  },
  {
    id: 2, name: 'MacBook Pro M2', tag: 'AST-088', serial: 'C02XG8888', category: 'Laptop',
    staffName: 'Jane Smith', empId: 'EMP-105', status: 'In Repair',
    purchaseDate: '2023-05-20', warranty: '2026-05-20',
    history: [
      { id: 201, date: '2024-02-01', type: 'Repair', details: 'Sent to Apple for screen replacement.' },
      { id: 202, date: '2023-05-25', type: 'Assignment', details: 'Assigned to Jane Smith (EMP-105)' },
    ]
  },
  {
    id: 3, name: 'Herman Miller Chair', tag: 'AST-112', serial: 'N/A', category: 'Furniture',
    staffName: 'Unassigned', empId: 'N/A', status: 'Available',
    purchaseDate: '2021-08-14', warranty: '2033-08-14',
    history: [
      { id: 301, date: '2024-01-10', type: 'Return', details: 'Returned by Mark Johnson (Left company)' },
      { id: 302, date: '2021-08-20', type: 'Assignment', details: 'Assigned to Mark Johnson' },
    ]
  },
];

export default function AdminAssetsPage() {
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState('All');
  
  // Modal State
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // --- FILTER & SEARCH LOGIC ---
  const filteredAssets = useMemo(() => {
    return mockAssets.filter((asset) => {
      // 1. Category Filter
      const matchCategory = selectedCategory === 'All' || asset.category === selectedCategory;
      
      // 2. Staff Filter
      const matchStaff = selectedStaff === 'All' || 
                         (selectedStaff === 'Assigned' && asset.staffName !== 'Unassigned') ||
                         (selectedStaff === 'Unassigned' && asset.staffName === 'Unassigned');

      // 3. Search Query (Matches Tag, Serial, Staff Name, Emp ID, or Asset Name)
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

  // Extract unique categories for the dropdown
  const categories = ['All', ...Array.from(new Set(mockAssets.map(a => a.category)))];

  return (
    <div className="w-full space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* 1. HEADER & ADD BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Assets Management</h1>
          <p className="text-sm text-gray-500">Manage, track, and inspect company assets.</p>
        </div>
        
        {/* WORKING ADD BUTTON -> routes to /admin/assets/new */}
        <Link 
          href="/admin/assets/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add New Asset
        </Link>
      </div>

      {/* 2. FILTERS & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by Tag, Serial, Staff Name, or Emp ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {/* Category Filter */}
        <select 
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
          ))}
        </select>

        {/* Staff Filter */}
        <select 
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          value={selectedStaff}
          onChange={(e) => setSelectedStaff(e.target.value)}
        >
          <option value="All">All Staff</option>
          <option value="Assigned">Assigned Only</option>
          <option value="Unassigned">Unassigned Only</option>
        </select>
      </div>

      {/* 3. ASSETS TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Asset Info</th>
                <th className="px-6 py-4 font-semibold">Serial No.</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Assigned To</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-blue-50/30 transition-colors">
                    
                    {/* CLICKABLE ASSET NAME & TAG */}
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedAsset(asset)}
                        className="text-left group focus:outline-none"
                      >
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
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                        {asset.category}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-800">{asset.staffName}</div>
                      {asset.empId !== 'N/A' && (
                        <div className="text-xs text-gray-400 font-mono">{asset.empId}</div>
                      )}
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
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-lg font-semibold text-gray-600">No assets found</p>
                      <p className="text-sm">Try changing your search or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. ASSET DETAILS MODAL */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  {selectedAsset.name}
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                    selectedAsset.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' :
                    selectedAsset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                    'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {selectedAsset.status}
                  </span>
                </h3>
                <p className="text-sm text-gray-500 mt-1 font-mono">{selectedAsset.tag} | SN: {selectedAsset.serial}</p>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-200 hover:bg-red-50 rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto">
              
              {/* Top Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-500 font-semibold block mb-1">Category</span>
                  <span className="text-sm font-bold text-gray-800">{selectedAsset.category}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-500 font-semibold block mb-1">Current User</span>
                  <span className="text-sm font-bold text-blue-600">{selectedAsset.staffName}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-500 font-semibold block mb-1">Purchase Date</span>
                  <span className="text-sm font-bold text-gray-800">{selectedAsset.purchaseDate}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-500 font-semibold block mb-1">Warranty Ends</span>
                  <span className="text-sm font-bold text-gray-800">{selectedAsset.warranty}</span>
                </div>
              </div>

              {/* History Timeline */}
              <div>
                <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Asset History & Inspections
                </h4>
                
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pb-4">
                  {selectedAsset.history.map((record: any) => (
                    <div key={record.id} className="relative pl-6">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${
                        record.type === 'Assignment' ? 'bg-blue-500' :
                        record.type === 'Inspection' ? 'bg-green-500' :
                        record.type === 'Repair' ? 'bg-orange-500' : 'bg-gray-500'
                      }`}></span>
                      
                      <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-xs font-bold uppercase tracking-wider ${
                            record.type === 'Assignment' ? 'text-blue-600' :
                            record.type === 'Inspection' ? 'text-green-600' :
                            record.type === 'Repair' ? 'text-orange-600' : 'text-gray-600'
                          }`}>{record.type}</span>
                          <span className="text-xs font-mono text-gray-400">{record.date}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{record.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
