'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { UploadCloud, Download, FileSpreadsheet, Plus, Search, ChevronDown, Laptop } from 'lucide-react';

export default function AdminAssetsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Generates the sample CSV for Assets on the fly
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
      if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
        toast.error("Please upload a valid CSV file.");
        return;
      }
      toast.success(
        <div>
          <p className="font-bold text-gray-900">File Uploaded!</p>
          <p className="text-sm text-gray-600">Processing {file.name}...</p>
        </div>,
        { style: { background: '#F0FDF4', border: '1px solid #BBF7D0' } }
      );
      // Here you will parse the CSV and send to your database
    }
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
          
          {/* ACTION BUTTONS */}
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handleDownloadSample}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none shadow-sm"
            >
              <Download size={16} /> Sample CSV
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#EEF2FF] text-blue-700 border border-blue-100 hover:bg-blue-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none shadow-sm"
            >
              <FileSpreadsheet size={16} /> Bulk Upload
            </button>
            {/* Hidden Input for File Upload */}
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
            />

            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none shadow-sm">
              <Plus size={16} /> Add Single
            </button>
          </div>
        </div>

        {/* SEARCH BAR (Highly Readable) */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-900 placeholder-gray-400 font-medium shadow-sm"
            />
          </div>
        </div>

        {/* EMPTY STATE / GRID PLACEHOLDER */}
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-50 p-4 rounded-full mb-4">
            <UploadCloud size={32} className="text-blue-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Upload your Assets CSV</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Quickly populate your database by uploading a standard CSV file. Download the sample to see the required format.
          </p>
          <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 font-semibold hover:underline">
            Click to Browse Files
          </button>
        </div>
        
      </div>
    </div>
  );
}
