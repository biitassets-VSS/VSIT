'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, Package, UserCheck, Edit, Trash2, Power, X } from 'lucide-react';

// Added isActive to the interface
interface Staff { empId: string; name: string; department: string; isActive: boolean; }
interface Asset { id: string; name: string; tagId: string; assignedToEmpId?: string; }

// Updated mock data with isActive status
const initialStaff: Staff[] = [
  { empId: 'EMP-001', name: 'Lakhwinder Singh', department: 'IT Department', isActive: true },
  { empId: 'EMP-002', name: 'Sarah Connor', department: 'Migrations', isActive: true },
  { empId: 'EMP-003', name: 'John Doe', department: 'Accounts', isActive: false },
  { empId: 'EMP-004', name: 'Jane Smith', department: 'Edu Calling', isActive: true },
];

export default function StaffPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for Staff Management
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  useEffect(() => {
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) setAssets(JSON.parse(savedAssets));
  }, []);

  // --- ACTIONS ---

  // Toggle Active/Deactivate Status
  const handleToggleStatus = (empId: string) => {
    setStaffList(staffList.map(staff => 
      staff.empId === empId ? { ...staff, isActive: !staff.isActive } : staff
    ));
  };

  // Delete Staff
  const handleDeleteStaff = (empId: string) => {
    if (window.confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) {
      setStaffList(staffList.filter(staff => staff.empId !== empId));
    }
  };

  // Save Edits
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      setStaffList(staffList.map(staff => 
        staff.empId === editingStaff.empId ? editingStaff : staff
      ));
      setEditingStaff(null);
    }
  };

  // Filter Search
  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.empId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" /> Staff & Users
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage employees, statuses, and view assigned assets.</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Staff Name or ID..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-black">
                <th className="p-4 pl-6">Staff Member</th>
                <th className="p-4">Department</th>
                <th className="p-4">Assigned Assets</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map((staff) => {
                const assignedAssets = assets.filter(a => a.assignedToEmpId === staff.empId);
                
                return (
                  <tr key={staff.empId} className={`transition-colors ${staff.isActive ? 'hover:bg-gray-50/50' : 'bg-gray-50/50 opacity-75'}`}>
                    
                    {/* Name & ID */}
                    <td className="p-4 pl-6">
                      <Link 
                        href={`/admin/staff/${staff.empId}`} 
                        className={`font-bold hover:underline inline-flex items-center gap-2 ${staff.isActive ? 'text-blue-600 hover:text-blue-800' : 'text-gray-500'}`}
                      >
                        <UserCheck size={16} className={staff.isActive ? "text-blue-400" : "text-gray-400"} /> {staff.name}
                      </Link>
                      <br/>
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {staff.empId}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="p-4 text-sm font-bold text-gray-600">{staff.department}</td>

                    {/* Assigned Assets */}
                    <td className="p-4">
                      {assignedAssets.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {assignedAssets.map(asset => (
                            <Link 
                              key={asset.id} 
                              href={`/admin/assets/${asset.id}`} 
                              className="text-xs font-bold text-gray-700 hover:text-blue-600 hover:underline inline-flex items-center gap-1 w-fit"
                            >
                              <Package size={12} className="text-gray-400"/> {asset.name} ({asset.tagId})
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">No assets assigned</span>
                      )}
                    </td>

                    {/* Status Toggle Badge */}
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleToggleStatus(staff.empId)}
                        title={staff.isActive ? "Click to Deactivate" : "Click to Activate"}
                        className={`px-3 py-1 text-[11px] font-black rounded-lg uppercase tracking-wide inline-flex items-center gap-1 transition-all ${
                          staff.isActive 
                            ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100' 
                            : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                        }`}
                      >
                        <Power size={12} /> {staff.isActive ? 'Active' : 'Deactivated'}
                      </button>
                    </td>

                    {/* Actions (Edit & Delete) */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingStaff(staff)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Staff Details"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(staff.empId)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Staff Member"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
              
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">
                    No staff members found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- EDIT STAFF MODAL --- */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setEditingStaff(null)}></div>
          
          {/* Modal Content */}
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Edit size={20} className="text-blue-600" /> Edit Staff Details
              </h2>
              <button onClick={() => setEditingStaff(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Employee ID</label>
                <input 
                  type="text" 
                  value={editingStaff.empId} 
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-mono text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={editingStaff.name} 
                  onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Department</label>
                <input 
                  type="text" 
                  value={editingStaff.department} 
                  onChange={(e) => setEditingStaff({...editingStaff, department: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="statusToggle"
                  checked={editingStaff.isActive}
                  onChange={(e) => setEditingStaff({...editingStaff, isActive: e.target.checked})}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="statusToggle" className="text-sm font-bold text-gray-700 cursor-pointer">
                  Account is Active
                </label>
              </div>

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setEditingStaff(null)} className="flex-1 px-4 py-3 text-sm font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-3 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl transition-all">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
