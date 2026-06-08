'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Exact same categories so they match!
const CATEGORIES = [
  'Laptop', 'Keyboards', 'Headphones', 'Mobile Phone', 
  'Stand', 'Mouse', 'Mouse Pad', 'Cleaning Kits', 'Others'
];

export default function AddAssetPage() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Asset successfully added!');
    router.push('/admin/assets');
  };

  // Shared classes for all inputs to ensure perfect readability
  const inputClasses = "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm transition-all";
  const labelClasses = "text-sm font-bold text-gray-700";

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/assets" 
          className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 shadow-sm transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Asset</h1>
          <p className="text-sm text-gray-500">Register a new item into the inventory system.</p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-8">
        
        {/* SECTION 1: Basic Information */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-5 border-b border-gray-100 pb-2">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className={labelClasses}>Asset Tag *</label>
              <input type="text" required placeholder="e.g. AST-1042" className={inputClasses} />
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Serial Number</label>
              <input type="text" placeholder="e.g. SN-9982348X" className={inputClasses} />
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Asset Name / Description *</label>
              <input type="text" required placeholder="e.g. Dell XPS 15 Laptop" className={inputClasses} />
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Category *</label>
              <select required className={`${inputClasses} cursor-pointer`}>
                <option value="">Select Category...</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className={labelClasses}>Vendor / Supplier</label>
              <input type="text" placeholder="e.g. Dell Store, Amazon" className={inputClasses} />
            </div>

          </div>
        </div>

        {/* SECTION 2: Dates & Lifecycle */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-5 border-b border-gray-100 pb-2">Dates & Lifecycle</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="space-y-2">
              <label className={labelClasses}>Purchase Date</label>
              <input type="date" className={inputClasses} />
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Warranty Expiration</label>
              <input type="date" className={inputClasses} />
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Initial Inspection Date</label>
              <input type="date" className={inputClasses} />
            </div>

          </div>
        </div>

        {/* SECTION 3: Condition & Status */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-5 border-b border-gray-100 pb-2">Condition & Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className={labelClasses}>Asset Condition *</label>
              <select required className={`${inputClasses} cursor-pointer`}>
                <option value="">Select Condition...</option>
                <option value="New">New</option>
                <option value="Refurbished">Refurbished</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Current Status *</label>
              <select required className={`${inputClasses} cursor-pointer`}>
                <option value="">Select Status...</option>
                <option value="In Stock">In Stock</option>
                <option value="Assigned">Assigned</option>
                <option value="Repair">Repair</option>
                <option value="Discard">Discard</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className={labelClasses}>Notes for Current Condition</label>
              <textarea 
                rows={3} 
                placeholder="Describe any scratches, dents, or specific conditions..." 
                className={`${inputClasses} resize-none`}
              ></textarea>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2 md:col-span-2">
              <label className={labelClasses}>Upload Photos</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-1">
                      <span>Upload files</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BUTTONS */}
        <div className="pt-6 border-t border-gray-200 flex items-center justify-end gap-4">
          <Link 
            href="/admin/assets"
            className="px-6 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button 
            type="submit"
            className="px-8 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
          >
            Save Asset
          </button>
        </div>

      </form>
    </div>
  );
}
