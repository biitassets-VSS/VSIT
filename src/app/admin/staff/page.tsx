'use client';

import React, { useState } from 'react';
import { 
  Plus, Upload, Download, Search, X, 
  Eye, EyeOff, Calendar, Lock, User, Mail, Briefcase, Hash, FileText,
  Trash2, Power, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data for Staff List (Added 'status' field)
const initialStaff = [
  { id: 1, empId: 'EMP-001', name: 'John Doe', email: 'john@virtualstaffing.com', role: 'Staff', department: 'IT Support', joiningDate: '2024-01-15', status: 'Active' },
  { id: 2, empId: 'EMP-002', name: 'Jane Smith', email: 'jane@virtualstaffing.com', role: 'Manager', department: 'Operations', joiningDate: '2023-11-01', status: 'Active' },
  { id: 3, empId: 'EMP-003', name: 'Alex Johnson', email: 'alex@virtualstaffing.com', role: 'Admin', department: 'Human Resources', joiningDate: '2022-08-20', status: 'Inactive' },
];

export default function StaffPage() {
  const [staffList, setStaffList] = useState(initialStaff);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<any>(null); // For Delete Confirmation
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    empId: '', fullName: '', email: '', password: '',
    role: 'Staff', department: 'IT Support', joiningDate: '', dob: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- ACTIONS LOGIC ---
  
  // 1. Toggle Active/Inactive Status
  const handleToggleStatus = (id: number) => {
    setStaffList(staffList.map(staff => {
      if (staff.id === id) {
        return { ...staff, status: staff.status === 'Active' ? 'Inactive' : 'Active' };
      }
      return staff;
    }));
  };

  // 2. Delete Staff Member
  const confirmDelete = () => {
    if (!staffToDelete) return;
    setStaffList(staffList.filter(staff => staff.id !== staffToDelete.id));
    setStaffToDelete(null);
  };

  const handleBulkUpload = () => {
    alert("Staff accounts imported successfully!");
    setIsBulkModalOpen(false);
    setSelectedFile(null);
  };

  const downloadSampleCSV = () => {
    const csvData = "EmpID,FullName,Email,Password,Role,Department,JoiningDate,DateOfBirth\nEMP-004,Michael Scott,michael@example.com,Pass123!,Manager,Operations,2024-03-01,1985-05-15\n";
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Staff_Bulk_Upload_Sample.csv";
    link.click();
  };

  // Filter staff based on search query
  const filteredStaff = staffList.filter(staff => 
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Staff Management</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage employees, accounts, and access</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 border border-gray-200 transition-all">
            <Upload size={18} /> Bulk Upload
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-sm transition-all">
            <Plus size={18} /> Add New Staff
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search size={20} className="text-gray-400" />
        <input 
          type="text" 
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search staff by Name, Emp ID, or Email..." 
          className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400"
        />
      </div>

      {/* STAFF LIST GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((staff) => (
          <div key={staff.id} className={`bg-white p-6 rounded-2xl shadow-sm border transition-all flex flex-col relative overflow-hidden ${staff.status === 'Inactive' ? 'border-gray-200 opacity-80' : 'border-gray-100 hover:shadow-md'}`}>
            
            {/* Top accent line */}
            <div className={`absolute top-0 left-0 w-full h-1 ${staff.status === 'Active' ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gray-300'}`}></div>
            
            {/* Status Badge */}
            <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${staff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {staff.status}
            </div>

            <div className="flex items-start gap-4 mb-4 mt-2">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center font-black text-lg ${staff.status === 'Active' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                {staff.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg leading-tight">{staff.name}</h3>
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                  <Hash size={12} /> {staff.empId}
                </span>
              </div>
            </div>

            <div className="space-y-2 mt-1">
              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium"><Mail size={16} className="text-gray-400" /> {staff.email}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium"><Briefcase size={16} className="text-gray-400" /> {staff.role} • {staff.department}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium"><Calendar size={16} className="text-gray-400" /> Joined: {staff.joiningDate}</div>
            </div>
            
            {/* ACTION BUTTONS */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleToggleStatus(staff.id)} 
                  className={`p-2 rounded-xl transition-all flex items-center justify-center ${staff.status === 'Active' ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                  title={staff.status === 'Active' ? 'Deactivate Login' : 'Activate Login'}
                >
                  <Power size={18} />
                </button>
                <button 
                  onClick={() => setStaffToDelete(staff)} 
                  className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all flex items-center justify-center"
                  title="Delete Staff"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <button className="text-sm font-bold text-gray-700 hover:text-orange-600 transition-colors">
                View Profile
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ALL MODALS COMBINED */}
      <AnimatePresence>
        
        {/* 1. ADD NEW STAFF MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><User size={20} className="text-orange-600"/> Add New Staff</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Hash size={16} className="text-orange-500"/> Employee ID</label>
                    <input type="text" name="empId" value={formData.empId} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none font-bold text-gray-800" placeholder="e.g. EMP-001" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><User size={16} className="text-orange-500"/> Full Name</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="John Doe" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Mail size={16} className="text-orange-500"/> Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="john@virtualstaffing.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Lock size={16} className="text-orange-500"/> Login Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none pr-12" placeholder="Create password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-gray-100 pt-5 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Briefcase size={16} className="text-orange-500"/> Role</label>
                    <select name="role" value={formData.role} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                      <option>Staff</option><option>Manager</option><option>Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">Department</label>
                    <select name="department" value={formData.department} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                      <option>IT Support</option><option>Human Resources</option><option>Operations</option><option>Finance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Calendar size={16} className="text-orange-500"/> Joining Date</label>
                    <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none text-gray-700" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Calendar size={16} className="text-orange-500"/> Date of Birth (DOB)</label>
                    <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none text-gray-700" />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                <button className="px-5 py-2.5 text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 rounded-xl shadow-sm transition-all">Save Staff Member</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 2. BULK UPLOAD MODAL */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBulkModalOpen(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden text-center p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <h2 className="text-xl font-black text-gray-800">Bulk Upload Staff</h2>
                <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={20}/></button>
              </div>
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <button onClick={downloadSampleCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 text-orange-700 text-sm font-bold rounded-xl hover:bg-orange-100 shadow-sm transition-all">
                  <Download size={16} /> Download Sample CSV
                </button>
              </div>
              <div>
                <input type="file" accept=".csv" className="hidden" id="csvUploadStaff" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                <label htmlFor="csvUploadStaff" className={`border-2 border-dashed rounded-2xl p-8 cursor-pointer flex flex-col items-center transition-all ${selectedFile ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                  {selectedFile ? (
                    <><div className="h-12 w-12 bg-white text-orange-500 rounded-full flex items-center justify-center mb-3 shadow-sm border border-orange-200"><FileText size={24} /></div><p className="font-bold text-gray-900">{selectedFile.name}</p></>
                  ) : (
                    <><div className="h-12 w-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mb-3"><Upload size={24} /></div><p className="font-bold text-gray-700">Click to select CSV</p></>
                  )}
                </label>
              </div>
              {selectedFile && <button onClick={handleBulkUpload} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-sm transition-all">Import Staff</button>}
            </motion.div>
          </div>
        )}

        {/* 3. DELETE CONFIRMATION MODAL */}
        {staffToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setStaffToDelete(null)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Delete Staff Member?</h2>
              <p className="text-sm font-medium text-gray-500 mb-6">
                Are you sure you want to completely remove <span className="font-bold text-gray-800">{staffToDelete.name}</span> from the system? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setStaffToDelete(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all w-full">Cancel</button>
                <button onClick={confirmDelete} className="px-5 py-2.5 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-sm transition-all w-full">Yes, Delete</button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
