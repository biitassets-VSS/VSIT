'use client';

import React, { useState } from 'react';

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy Data for Assets
  const assetList = [
    { id: 1, tag: '#AST-042', serial: 'SN-998234', category: 'Laptops', name: 'Dell XPS 15', status: 'Assigned', assignedTo: 'John Doe', inspection: 'Passed' },
    { id: 2, tag: '#AST-089', serial: 'SN-445123', category: 'Laptops', name: 'MacBook Pro 16"', status: 'Assigned', assignedTo: 'Jane Smith', inspection: 'Pending' },
    { id: 3, tag: '#AST-105', serial: 'SN-MS881', category: 'Mouse (All)', name: 'Logitech MX Master 3', status: 'In Stock', assignedTo: '-', inspection: 'Passed' },
    { id: 4, tag: '#AST-112', serial: 'SN-LN002', category: 'Laptops', name: 'Lenovo ThinkPad', status: 'Under Repair', assignedTo: '-', inspection: 'Failed' },
    { id: 5, tag: '#AST-150', serial: 'SN-KB992', category: 'USB Keyboard Kits', name: 'Dell Wired Keyboard', status: 'Discarded', assignedTo: '-', inspection: 'Failed' },
  ];

  return (
    <div className="w-full min-h-screen space-y-6 pb-10 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Top Bar & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-1/2 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all duration-300 sm:text-sm"
            placeholder="Search Assets by Tag, Serial Number, or Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2">
          <span>+ Add New Asset</span>
        </button>
      </div>

      {/* Assets Table Section */}
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-bold text-gray-800">Complete Asset Inventory</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Asset ID & Details</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Status & Assignment</th>
                <th className="px-6 py-4 font-semibold">Inspection</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y divide-gray-50">
              {assetList.map((asset) => (
                <tr key={asset.id} className="hover:bg-blue-50/30 transition-colors group">
                  
                  {/* Asset Details */}
                  <td className="px-6 py-4">
                    <div className="font-bold text-blue-600">{asset.tag}</div>
                    <div className="font-semibold text-gray-800 mt-0.5">{asset.name}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">SN: {asset.serial}</div>
                  </td>
                  
                  {/* Category */}
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                      {asset.category}
                    </span>
                  </td>

                  {/* Status & Assignment */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={`px-2.5 py-1 w-max rounded-md text-xs font-bold ${
                        asset.status === 'Assigned' ? 'bg-blue-100 text-blue-700' : 
                        asset.status === 'In Stock' ? 'bg-green-100 text-green-700' : 
                        asset.status === 'Under Repair' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {asset.status}
                      </span>
                      {asset.status === 'Assigned' && (
                        <div className="text-xs text-gray-600 font-medium">To: {asset.assignedTo}</div>
                      )}
                    </div>
                  </td>
                  
                  {/* Inspection */}
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      asset.inspection === 'Passed' ? 'bg-green-100 text-green-700 border border-green-200' :
                      asset.inspection === 'Failed' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
                    }`}>
                      {asset.inspection}
                    </span>
                  </td>
                  
                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-3">
                      <button className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors" title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
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
