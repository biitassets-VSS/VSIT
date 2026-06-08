'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Laptop', 'Keyboards', 'Headphones', 'Mobile Phone', 
  'Stand', 'Mouse', 'Mouse Pad', 'Cleaning Kits', 'Others'
];

// Define the photo requirements based on the category
const LAPTOP_PHOTOS = [
  { id: 'top', shortTitle: 'Top Side', fullTitle: 'Top Side (Lid)' },
  { id: 'back', shortTitle: 'Back Side', fullTitle: 'Back Side (Base/Serial)' },
  { id: 'left', shortTitle: 'Left Side', fullTitle: 'Left Side (Ports)' },
  { id: 'right', shortTitle: 'Right Side', fullTitle: 'Right Side (Ports)' },
  { id: 'keyboard', shortTitle: 'Keyboard & Screen', fullTitle: 'Keyboard & Screen' },
];

const DEFAULT_PHOTOS = [
  { id: 'front', shortTitle: 'Front View', fullTitle: 'Front / Main View' },
  { id: 'back_serial', shortTitle: 'Back Side', fullTitle: 'Back / Serial Number' },
];

export default function AddAssetPage() {
  const router = useRouter();
  
  // Track the selected category so we know which photos to ask for
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Track uploaded photo previews
  const [uploadedPhotos, setUploadedPhotos] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Asset successfully added!');
    router.push('/admin/assets');
  };

  // Handle file selection and generate a preview URL
  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setUploadedPhotos(prev => ({ ...prev, [id]: previewUrl }));
    }
  };

  const inputClasses = "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm transition-all";
  const labelClasses = "text-sm font-bold text-gray-700";

  // Determine which photo array to use based on the selected category
  const photoRequirements = selectedCategory === 'Laptop' ? LAPTOP_PHOTOS : DEFAULT_PHOTOS;

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
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-10">
        
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
              {/* Added value and onChange to track category state */}
              <select 
                required 
                className={`${inputClasses} cursor-pointer`}
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setUploadedPhotos({}); // Reset photos when category changes
                }}
              >
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

        {/* SECTION 2: Condition & Status */}
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
          </div>
        </div>

        {/* SECTION 3: Dynamic Photo Uploads */}
        <div>
          <div className="flex justify-between items-end mb-5 border-b border-gray-100 pb-2">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              📸 Uploaded Photos
            </h2>
            {selectedCategory && (
              <span className="text-sm font-bold text-gray-500">
                Requirement: {photoRequirements.length} Angles Required
              </span>
            )}
          </div>

          {!selectedCategory ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
              <p className="text-gray-500 font-medium">Please select a Category above to see photo requirements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {photoRequirements.map((photo) => (
                <div 
                  key={photo.id} 
                  className="relative flex flex-col bg-[#e8ecf1] hover:bg-[#dfe4ea] transition-colors rounded-xl overflow-hidden border border-gray-200 shadow-sm cursor-pointer aspect-[4/3] group"
                >
                  {/* Image Preview OR Placeholder Text */}
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center relative z-10">
                    {uploadedPhotos[photo.id] ? (
                      <img 
                        src={uploadedPhotos[photo.id]} 
                        alt={photo.shortTitle} 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-[#4a5568] group-hover:scale-105 transition-transform">
                        {photo.shortTitle}
                      </span>
                    )}
                  </div>

                  {/* Dark Footer Label (Matching your screenshot) */}
                  <div className="bg-[#3d3d42] py-2.5 px-3 text-center relative z-20">
                    <span className="text-white text-xs font-bold tracking-wide">
                      {photo.fullTitle}
                    </span>
                  </div>

                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(photo.id, e)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-30" 
                  />
                </div>
              ))}
            </div>
          )}
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
