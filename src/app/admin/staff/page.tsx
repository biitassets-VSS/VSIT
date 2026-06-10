'use client';

import React, { useState } from 'react';
import { 
  Plus, Upload, Download, Search, MoreVertical, X, 
  Eye, EyeOff, Calendar, Lock, User, Mail, Briefcase 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StaffPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Staff',
    department: 'IT',
    joiningDate: '',
    dob: ''
  });

  // Handle Form Inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Download Sample CSV Function
  const downloadSampleCSV = () => {
    const csvHeader = "FullName,Email,Password,Role,Department,JoiningDate,DateOfBirth\n";
    const csvRow = "John Doe,john.doe@example.com,TempPass123!,Software Engineer,IT,2024-01-15,1990-05-20\n";
    const csvData = csvHeader + csvRow;
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Staff_Bulk_Upload_Sample.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Staff Management</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage employees, accounts, and details</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 border border-gray-200 transition-all"
          >
            <Upload size={18} /> Bulk Upload
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-sm transition-all"
          >
            <Plus size={18} /> Add New Staff
          </button>
        </div>
      </div>

      {/* SEARCH BAR (UI Only) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search size={20} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Search staff by name or email..." 
          className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400"
        />
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {/* 1. ADD NEW STAFF MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800">Add New Staff</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                {/* Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><User size={16} className="text-orange-500"/> Full Name</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="John Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Mail size={16} className="text-orange-500"/> Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="john@virtualstaffing.com" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Lock size={16} className="text-orange-500"/> Login Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all pr-12" placeholder="Create a strong password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">This password will be used by the staff member to log into their portal.</p>
                </div>

                {/* Role & Department */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Briefcase size={16} className="text-orange-500"/> Role</label>
                    <select name="role" value={formData.role} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                      <option>Staff</option>
                      <option>Manager</option>
                      <option>Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">Department</label>
                    <select name="department" value={formData.department} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                      <option>IT Support</option>
                      <option>Human Resources</option>
                      <option>Operations</option>
                      <option>Finance</option>
                    </select>
                  </div>
                </div>

                {/* Joining Date & DOB */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-gray-100 pt-5 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Calendar size={16} className="text-orange-500"/> Joining Date</label>
                    <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-700" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Calendar size={16} className="text-orange-500"/> Date of Birth (DOB)</label>
                    <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-700" />
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
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-800">Bulk Upload Staff</h2>
                <button onClick={() => setIsBulkModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="p-6 space-y-6 text-center">
                {/* Download Sample Button */}
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <p className="text-sm text-orange-800 font-semibold mb-3">Ensure your CSV matches the required format containing Passwords, Joining Date, and DOB.</p>
                  <button onClick={downloadSampleCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 text-orange-700 text-sm font-bold rounded-xl hover:bg-orange-100 transition-all shadow-sm">
                    <Download size={16} /> Download Sample CSV
                  </button>
                </div>

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:bg-gray-50 hover:border-orange-400 transition-all cursor-pointer flex flex-col items-center justify-center">
                  <div className="h-12 w-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mb-3">
                    <Upload size={24} />
                  </div>
                  <p className="font-bold text-gray-700">Click to upload CSV file</p>
                  <p className="text-xs text-gray-500 mt-1">or drag and drop here</p>
                  <input type="file" accept=".csv" className="hidden" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
