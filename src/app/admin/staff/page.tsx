'use client';

import React, { useState } from 'react';

export default function StaffPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy data with Assigned Assets & Inspection Status
  const staffList = [
    { 
      id: 1, staffId: 'EMP-001', name: 'John Doe', email: 'john@company.com', department: 'Engineering', status: 'Active', presence: 'Present',
      assets: [
        { tag: '#AST-042', name: 'Dell XPS 15', inspection: 'Passed' },
        { tag: '#AST-105', name: 'Wireless Mouse', inspection: 'Passed' }
      ]
    },
    { 
      id: 2, staffId: 'EMP-002', name: 'Jane Smith', email: 'jane@company.com', department: 'HR', status: 'Active', presence: 'On Leave',
      assets: [
        { tag: '#AST-089', name: 'MacBook Pro 16"', inspection: 'Pending' }
      ]
    },
    { 
      id: 3, staffId: 'EMP-003', name: 'Mike Johnson', email: 'mike@company.com', department: 'IT Support', status: 'Left Office', presence: 'Offline',
      assets: []
    },
    { 
      id: 4, staffId: 'EMP-004', name: 'Sarah Williams', email: 'sarah@company.com', department: 'Marketing', status: 'Active', presence: 'Present',
      assets: [
        { tag: '#AST-112', name: 'Lenovo ThinkPad', inspection: 'Failed' },
        { tag: '#AST-150', name: 'USB Keyboard', inspection: 'Passed' }
      ]
    },
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
            placeholder="Search Staff by Name or EMP ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2">
          <span>+ Add New Staff</span>
        </button>
      </div>

      {/* Staff Table Section */}
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-bold text-gray-800">Staff & Assigned Assets</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Staff Details</th>
                <th className="px-6 py-4 font-semibold">Status & Presence</th>
                <th className="px-6 py-4 font-semibold">Assigned Assets & Inspection</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y divide-gray-50">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-blue-50/30 transition-colors group">
                  
                  {/* Name & ID */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{staff.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{staff.staffId} • {staff.department}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Employment Status & Live Presence */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <span className={`px-2.5 py-1 w-max rounded-md text-xs font-bold ${
                        staff.status === 'Active' ? 'bg-green-100 text-green-700' : 
                        staff.status === 'Left Office' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                      }`}>
                        {staff.status}
                      </span>
                      {staff.status === 'Active' && (
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          {staff.presence === 'Present' ? (
                            <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span><span className="text-green-600">Present (PC On)</span></>
                          ) : (
                            <><span className="h-2 w-2 rounded-full bg-orange-400"></span><span className="text-orange-600">On Leave / Offline</span></>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Assigned Assets & Inspection Status */}
                  <td className="px-6 py-4">
                    {staff.assets.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {staff.assets.map((asset, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100 text-sm">
                            <span className="font-medium text-gray-700 truncate max-w-[150px]"><span className="text-blue-500 text-xs mr-1">{asset.tag}</span>{asset.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              asset.inspection === 'Passed' ? 'bg-green-100 text-green-700' :
                              asset.inspection === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {asset.inspection}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">No assets assigned</span>
                    )}
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
