'use client';

import React, { useState } from 'react';
import { 
  Users, Plus, Search, Building2, Mail, 
  Shield, Edit, Trash2, X, CheckCircle2 
} from 'lucide-react';

// --- TYPES ---
interface StaffMember {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: 'Active' | 'Inactive';
}

// --- CONSTANTS ---
// The exact departments you requested
const DEPARTMENTS = [
  'Migrations',
  'Education',
  'Mig Calling',
  'Edu Calling',
  'Accounts',
  'Adelaide',
  'IT Department',
  'Manager',
  'Social Media'
];

// Mock Database of Staff
const initialStaff: StaffMember[] = [
  { id: 'EMP-001', name: 'Lakhwinder Singh', email: 'lakhwinder@company.com', department: 'IT Department', role: 'Staff', status: 'Active' },
  { id: 'EMP-002', name: 'Sarah Connor', email: 'sarah@company.com', department: 'Migrations', role: 'Manager', status: 'Active' },
];

export default function AdminStaffManagement() {
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Migrations', // Default selection
    role: 'Staff',
    status: 'Active' as 'Active' | 'Inactive'
  });

  // --- HANDLERS ---
  const openAddModal = () => {
    setModalMode('add');
    setFormData({ name: '', email: '', department: 'Migrations', role: 'Staff', status: 'Active' });
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setModalMode('edit');
    setEditingId(staff.id);
    setFormData({
      name: staff.name,
      email: staff.email,
      department: staff.department,
      role: staff.role,
      status: staff.status
    });
    setIsModalOpen(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();

    if (modalMode === 'add') {
      // Create New Staff
      const newStaff: StaffMember = {
        id: `EMP-${Math.floor(Math.random() * 900) + 100}`,
        ...formData
      };
      setStaffList([newStaff, ...staffList]);
      alert("New staff member added successfully!");
    } else {
      // Update Existing Staff
      setStaffList(staffList.map(staff => 
        staff.id === editingId ? { ...staff, ...formData } : staff
      ));
      alert("Staff details updated successfully!");
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this staff member?")) {
      setStaffList(staffList.filter(staff => staff.id !== id));
    }
  };

  // Filter staff based on search
  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" /> Staff Management
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Add, update, and assign departments to team members.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200 transition-all font-bold text-sm"
        >
          <Plus size={18} /> Add New Staff
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or department..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
          />
        </div>
        <div className="text-sm font-bold text-gray-500 px-4">
          Total Staff: <span className="text-blue-600">{staffList.length}</span>
        </div>
      </div>

      {/* STAFF DATA TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4 pl-6">Employee</th>
                <th className="p-4">Department</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">No staff members found.</td>
                </tr>
              )}
              {filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{staff.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail size={12}/> {staff.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
                      <Building2 size={12} className="text-gray-500" /> {staff.department}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                      <Shield size={14} className={staff.role === 'Manager' ? 'text-purple-500' : 'text-gray-400'}/> {staff.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      staff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {staff.status === 'Active' && <CheckCircle2 size={10} />} {staff.status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(staff)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip"
                        title="Edit Department & Details"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(staff.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                {modalMode === 'add' ? <Plus className="text-blue-600"/> : <Edit className="text-blue-600"/>}
                {modalMode === 'add' ? 'Add New Staff Member' : 'Edit Staff Details'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-6 space-y-5">
              
              {/* Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. John Doe" 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address</label>
                  <input 
                    required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@company.com" 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              {/* DEPARTMENT SELECTION (The requested feature) */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <label className="block text-xs font-black text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Building2 size={14} /> Assign Department
                </label>
                <select 
                  required value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800 cursor-pointer shadow-sm"
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <p className="text-[11px] text-blue-600 font-medium mt-2">
                  * You can always update the department later if the staff member changes roles.
                </p>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">System Role</label>
                  <select 
                    value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold cursor-pointer"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Account Status</label>
                  <select 
                    value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as 'Active' | 'Inactive'})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors w-1/3">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
                  {modalMode === 'add' ? 'Save New Staff' : 'Update Staff Details'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
