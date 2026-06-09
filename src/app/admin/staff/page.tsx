'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { UploadCloud, Download, FileSpreadsheet, Plus, Search, Users, X } from 'lucide-react';

export default function AdminStaffPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // NEW: State for "Add Single" Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,First Name,Last Name,Email,Phone,Department,Role\nLakhwinder,Singh,lakhwinder@vss.com,1234567890,IT,Admin";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vss_staff_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(
        <div>
          <p className="font-bold">Staff List Uploaded!</p>
          <p className="text-sm">Processing {file.name}...</p>
        </div>,
        { style: { background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A' } }
      );
    }
  };

  const handleSaveSingleStaff = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("New Staff Member added successfully!");
    setIsAddModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans">
      <Toaster position="top-center" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Staff</h1>
            <p className="text-sm text-gray-500 mt-1">View, add, and bulk upload staff members.</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={handleDownloadSample} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
              <Download size={16} /> Sample CSV
            </button>
            
            <button onClick={() => fileInputRef.current?.click()} className="bg-[#FDF4FF] text-purple-700 border border-purple-100 hover:bg-purple-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
              <FileSpreadsheet size={16} /> Bulk Upload
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

            {/* FIXED: Add Single Button triggers Modal */}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add Single
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search staff members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-500 shadow-sm" />
          </div>
        </div>

        {/* EMPTY STATE */}
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-purple-50 p-4 rounded-full mb-4">
            <Users size={32} className="text-purple-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Staff Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">Start by adding a single staff member or uploading your team list.</p>
        </div>
      </div>

      {/* --- ADD SINGLE STAFF MODAL --- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Add New Staff Member</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleSaveSingleStaff} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">First Name</label>
                    <input required type="text" placeholder="e.g. John" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-purple-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Last Name</label>
                    <input required type="text" placeholder="e.g. Doe" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-purple-500 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Email Address</label>
                    <input required type="email" placeholder="e.g. john@vss.com" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-purple-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Department</label>
                    <select className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-purple-500 text-sm">
                      <option>IT</option>
                      <option>Engineering</option>
                      <option>HR</option>
                      <option>Design</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Role</label>
                    <select className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-purple-500 text-sm">
                      <option>Staff</option>
                      <option>Admin</option>
                      <option>Manager</option>
                    </select>
                  </div>
                </div>
                
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl">Save Staff</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
