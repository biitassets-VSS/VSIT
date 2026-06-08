'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

// --- MOCK DATA ---
const initialStaffData = [
  {
    id: 1, name: 'John Doe', empId: 'EMP-101', email: 'john@company.com',
    role: 'Senior Developer', department: 'Engineering', status: 'Active',
    avatar: 'JD', color: 'from-blue-400 to-blue-600',
    assignedAssets: [
      { id: 101, tag: 'AST-042', name: 'Dell XPS 15', category: 'Laptop' },
      { id: 102, tag: 'AST-089', name: 'Logitech Mouse', category: 'Mouse' }
    ]
  },
  {
    id: 2, name: 'Jane Smith', empId: 'EMP-105', email: 'jane@company.com',
    role: 'UI/UX Designer', department: 'Design', status: 'Active',
    avatar: 'JS', color: 'from-purple-400 to-purple-600',
    assignedAssets: [
      { id: 201, tag: 'AST-088', name: 'MacBook Pro M2', category: 'Laptop' }
    ]
  },
  {
    id: 3, name: 'Mark Johnson', empId: 'EMP-112', email: 'mark@company.com',
    role: 'HR Manager', department: 'Human Resources', status: 'Deactive',
    avatar: 'MJ', color: 'from-gray-400 to-gray-600',
    assignedAssets: []
  },
  {
    id: 4, name: 'Sarah Williams', empId: 'EMP-118', email: 'sarah@company.com',
    role: 'Marketing Lead', department: 'Marketing', status: 'Active',
    avatar: 'SW', color: 'from-pink-400 to-pink-600',
    assignedAssets: [
      { id: 401, tag: 'AST-105', name: 'iPad Pro', category: 'Tablet' },
      { id: 402, tag: 'AST-106', name: 'Apple Pencil', category: 'Accessories' },
      { id: 403, tag: 'AST-110', name: 'AirPods Pro', category: 'Headphones' }
    ]
  }
];

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState(initialStaffData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // --- ACTIONS ---
  const handleToggleStatus = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevents opening the modal when clicking the button
    setStaffList(prev => prev.map(staff => 
      staff.id === id 
        ? { ...staff, status: staff.status === 'Active' ? 'Deactive' : 'Active' } 
        : staff
    ));
  };

  const handleDelete = (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      setStaffList(prev => prev.filter(staff => staff.id !== id));
    }
  };

  // --- FILTERING ---
  const departments = ['All', ...Array.from(new Set(initialStaffData.map(s => s.department)))];

  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchDept = selectedDept === 'All' || staff.department === selectedDept;
      const q = searchQuery.toLowerCase();
      const matchSearch = q === '' || 
        staff.name.toLowerCase().includes(q) ||
        staff.empId.toLowerCase().includes(q) ||
        staff.role.toLowerCase().includes(q);

      return matchDept && matchSearch;
    });
  }, [searchQuery, selectedDept, staffList]);

  return (
    <div className="w-full space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">Manage employees and their assigned assets.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add New Staff
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by Name, Emp ID, or Role..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        <select 
          className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm min-w-[160px]"
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
          ))}
        </select>
      </div>

      {/* STAFF GRID (MODERN THUMBNAIL CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStaff.length > 0 ? (
          filteredStaff.map((staff) => (
            <div 
              key={staff.id} 
              onClick={() => setSelectedStaff(staff)}
              className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full ${
                staff.status === 'Deactive' ? 'border-gray-200 opacity-75 grayscale-[30%]' : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              
              {/* Top Row: Avatar & Status */}
              <div className="flex justify-between items-start mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold bg-gradient-to-br ${staff.color} shadow-inner`}>
                  {staff.avatar}
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  staff.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}>
                  {staff.status}
                </span>
              </div>

              {/* Middle: Info */}
              <div className="mb-4 flex-1">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{staff.name}</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{staff.empId}</p>
                <p className="text-sm text-gray-700 mt-2 font-medium">{staff.role}</p>
                <p className="text-xs text-gray-500">{staff.department}</p>
              </div>

              {/* Bottom: Asset Count Badge */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between mb-4 group-hover:bg-blue-50/50 transition-colors">
                <span className="text-xs font-bold text-gray-600">Assigned Assets</span>
                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                  staff.assignedAssets.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {staff.assignedAssets.length}
                </span>
              </div>

              {/* Action Buttons (Toggle & Delete) */}
              <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-gray-100">
                <button 
                  onClick={(e) => handleToggleStatus(e, staff.id)}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    staff.status === 'Active' 
                      ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' 
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {staff.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
                <button 
                  onClick={(e) => handleDelete(e, staff.id, staff.name)}
                  className="py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors"
                >
                  Delete
                </button>
              </div>
              
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
            No staff members found matching your criteria.
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* STAFF DETAIL MODAL POPUP */}
      {/* ========================================= */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold bg-gradient-to-br ${selectedStaff.color}`}>
                  {selectedStaff.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedStaff.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{selectedStaff.empId} | {selectedStaff.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStaff(null)} 
                className="text-gray-500 hover:text-red-600 transition-colors p-2 bg-gray-100 hover:bg-red-50 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-gray-50/50">
              
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Currently Assigned Assets ({selectedStaff.assignedAssets.length})
              </h4>

              {selectedStaff.assignedAssets.length > 0 ? (
                <div className="space-y-3">
                  {selectedStaff.assignedAssets.map((asset: any) => (
                    <div key={asset.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-blue-300 transition-colors">
                      <div>
                        <p className="font-bold text-gray-900">{asset.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{asset.tag}</p>
                      </div>
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                        {asset.category}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center shadow-sm">
                  <p className="text-gray-500 font-medium">No assets currently assigned to this employee.</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
