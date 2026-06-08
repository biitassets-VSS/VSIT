'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { Search, Camera, Laptop, Smartphone, Monitor, CheckCircle } from 'lucide-react';

// Mock Data (Replace this with your Supabase data fetching)
const initialAssets = [
  { id: 1, name: 'MacBook Pro M2', category: 'Laptop', status: 'Active', color: 'bg-blue-100 text-blue-700' },
  { id: 2, name: 'iPhone 13', category: 'Mobile', status: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
  { id: 3, name: 'Dell UltraSharp', category: 'Monitor', status: 'Active', color: 'bg-green-100 text-green-700' },
];

export default function StaffAssetsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState(initialAssets);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // 1. FIX: Input Visibility Issue 
  // We explicitly set 'text-gray-900 bg-white' so text is always visible when typing.
  const inputClasses = "w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all dark:bg-gray-800 dark:border-gray-600 dark:text-white";

  // 2. SEARCH LOGIC
  const filteredAssets = assets.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 3. CAMERA & PHOTO LOGIC
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Get current date and time
      const now = new Date();
      const timeString = now.toLocaleString();
      
      // Create a preview URL
      const imageUrl = URL.createObjectURL(file);
      setPhotoPreview(imageUrl);

      // Modern Colorful Alert
      toast.success(
        <div>
          <p className="font-bold">Photo Captured Successfully!</p>
          <p className="text-sm">Saved on: {timeString}</p>
        </div>,
        {
          style: { borderRadius: '10px', background: '#333', color: '#fff' },
          iconTheme: { primary: '#10B981', secondary: '#fff' },
        }
      );

      // TODO: Here you will upload the 'file' to your Supabase storage
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 font-sans">
      {/* Modern Toaster for Alerts */}
      <Toaster position="top-right" reverseOrder={false} />

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
              Staff Assets
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track your equipment easily.</p>
          </div>

          {/* FIX: Search Box with correct visibility classes */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={inputClasses}
            />
          </div>
        </motion.div>

        {/* CAMERA SECTION (Live Photo) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <label className="cursor-pointer group flex flex-col items-center justify-center w-full sm:w-auto px-8 py-6 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50 hover:bg-indigo-100 dark:bg-gray-700 dark:border-gray-600 rounded-xl transition-all">
              <Camera className="text-indigo-500 group-hover:scale-110 transition-transform mb-2" size={32} />
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Open Camera / Upload</span>
              {/* This input capture="environment" opens the mobile rear camera automatically! */}
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={handlePhotoCapture}
              />
            </label>

            {/* Photo Preview with Date */}
            {photoPreview && (
              <div className="relative relative w-32 h-32 rounded-xl overflow-hidden shadow-md border border-gray-200">
                <img src={photoPreview} alt="Live Capture" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-black/50 p-1 text-center">
                  <span className="text-[10px] text-white font-medium">Captured Today</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ASSETS THUMBNAIL GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssets.length > 0 ? (
            filteredAssets.map((asset, index) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all cursor-pointer flex flex-col relative overflow-hidden"
              >
                {/* Decorative Top Gradient Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                
                <div className="flex justify-between items-start mb-4 mt-2">
                  <div className={`p-3 rounded-xl ${asset.color}`}>
                    {asset.category === 'Laptop' && <Laptop size={24} />}
                    {asset.category === 'Mobile' && <Smartphone size={24} />}
                    {asset.category === 'Monitor' && <Monitor size={24} />}
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    <CheckCircle size={12} className={asset.status === 'Active' ? 'text-green-500' : 'text-orange-500'} />
                    {asset.status}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{asset.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{asset.category}</p>
                
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <button className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
                    View Details &rarr;
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-gray-500">
              No assets found matching your search.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
