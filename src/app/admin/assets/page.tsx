'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { UploadCloud, Download, FileSpreadsheet, Plus, Search, X } from 'lucide-react';

export default function AdminAssetsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // NEW: State for "Add Single" Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,Asset Name,Tag ID,Serial Number,Category,Department,Status\nMacBook Pro M2,VSS-MAC-001,C02ZG01,Laptop,Engineering,ACTIVE\niPhone 13 Pro,VSS-MOB-012,IMEI12345,Mobile,Design,ACTIVE";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vss_assets_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(
        <div>
          <p className="font-bold">File Uploaded!</p>
          <p className="text-sm">Processing {file.name}...</p>
        </div>,
        { style: { background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A' } }
      );
    }
  };

  const handleSaveSingleAsset = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("New Asset added successfully!");
    setIsAddModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans">
      <Toaster position="top-center" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Assets</h1>
            <p className="text-sm text-gray-500 mt-1">View, add, and bulk upload company IT equipment.</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={handleDownloadSample} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
              <Download size={16} /> Sample CSV
            </button>
            
            <button onClick={() => fileInputRef.current?.click()} className="bg-[#EEF2FF] text-blue-700 border border-blue-100 hover:bg-blue-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
              <FileSpreadsheet size={16} /> Bulk Upload
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

            {/* FIXED: Add Single Button triggers Modal */}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add Single
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 shadow-sm" />
          </div>
        </div>

        {/* EMPTY STATE */}
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-50 p-4 rounded-full mb-4">
            <UploadCloud size={32} className="text-blue-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Assets Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">Start by adding a single asset or bulk uploading your existing inventory.</p>
        </div>
      </div>

      {/* --- ADD SINGLE ASSET MODAL --- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Add New Asset</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleSaveSingleAsset} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Asset Name</label>
                    <input required type="text" placeholder="e.g. MacBook Pro M2" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Category</label>
                    <select className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm">
                      <option>Laptop</option>
                      <option>Mobile</option>
                      <option>Monitor</option>
                      <option>Accessory</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Tag ID</label>
                    <input required type="text" placeholder="e.g. VSS-MAC-001" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Serial Number</label>
                    <input required type="text" placeholder="e.g. C02ZG01" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm" />
                  </div>
                </div>
                
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl">Save Asset</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
