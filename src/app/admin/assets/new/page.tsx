'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, UploadCloud, ImagePlus, 
  CheckCircle2, Camera, Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AddNewAssetPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    tagId: '',
    serialNumber: '',
    name: '',
    category: '',
    vendor: '',
    price: '',
    purchaseDate: '',
    warranty: '',
    condition: '',
    status: 'In Stock',
    notes: ''
  });

  // Photos State
  const [photos, setPhotos] = useState<Record<string, string>>({});

  // Dynamic Photo Rules
  const laptopPhotoRequirements = [
    "Top side", 
    "Display and Keyboard", 
    "Right Side port", 
    "Left Side port", 
    "Back side with Tag id Sticker"
  ];
  const standardPhotoRequirements = [
    "Front View / Main Photo", 
    "Back side with Tag id Sticker"
  ];

  const isLaptop = formData.category.toLowerCase().includes('laptop');
  const currentPhotoRequirements = formData.category 
    ? (isLaptop ? laptopPhotoRequirements : standardPhotoRequirements) 
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'category') setPhotos({});
  };

  // =========================================================================
  // OPTIMIZED WATERMARK & UPLOAD LOGIC (FIXED FOR MOBILE)
  // =========================================================================
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Scale down huge mobile images to prevent browser crashing
        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 1200; // Safe size for quality & performance

        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw Resized Image
        ctx.drawImage(img, 0, 0, width, height);

        // Watermark: Date & Time
        const watermarkText = new Date().toLocaleString();
        
        // Font size scales with image
        const fontSize = Math.max(20, height * 0.035); 
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        const paddingX = Math.max(15, width * 0.02);
        const paddingY = Math.max(15, height * 0.02);
        const x = width - paddingX;
        const y = height - paddingY;

        // Draw Black Outline for visibility
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = Math.max(3, fontSize * 0.15);
        ctx.strokeText(watermarkText, x, y);

        // Draw Solid White Text inside
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillText(watermarkText, x, y);

        // Output as highly compatible JPEG
        const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotos(prev => ({ ...prev, [label]: watermarkedDataUrl }));
        
        // Clear input to allow re-uploading the same file if needed
        e.target.value = '';
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (label: string) => {
    setPhotos(prev => {
      const newPhotos = { ...prev };
      delete newPhotos[label];
      return newPhotos;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newAsset = {
      id: `AST-${Date.now()}`,
      ...formData,
      inspectionPhotos: currentPhotoRequirements.map(req => photos[req]).filter(Boolean),
      inspectionNotes: formData.notes,
      assignedToEmpId: '',
      assignedToName: '',
      imageUrl: currentPhotoRequirements.length > 0 ? photos[currentPhotoRequirements[0]] : '',
      lastInspectionDate: new Date().toISOString().split('T')[0]
    };

    const savedAssets = JSON.parse(localStorage.getItem('vsit_assets_inventory') || '[]');
    savedAssets.unshift(newAsset);
    localStorage.setItem('vsit_assets_inventory', JSON.stringify(savedAssets));

    setTimeout(() => {
      router.push('/admin/assets');
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 px-4 sm:px-0 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between mt-4 sm:mt-0">
        <Link href="/admin/assets" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-teal-600 transition-colors">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Assets</span>
        </Link>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900">Add New Asset</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. BASIC INFORMATION */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-5 pb-3 border-b border-gray-100">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Asset Tag *</label>
              <input required type="text" name="tagId" value={formData.tagId} onChange={handleInputChange} placeholder="e.g. AST-1042" className="w-full bg-gray-50 border border-gray-200 px-4 py-3 sm:py-3.5 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Serial Number</label>
              <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleInputChange} placeholder="e.g. SN-9982348X" className="w-full bg-gray-50 border border-gray-200 px-4 py-3 sm:py-3.5 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Asset Name *</label>
              <input required type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Dell XPS 15 Laptop" className="w-full bg-gray-50 border border-gray-200 px-4 py-3 sm:py-3.5 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Category *</label>
              <select required name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 sm:py-3.5 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
                <option value="">Select Category...</option>
                {/* --- YOUR RESTORED CATEGORY LIST --- */}
                <option value="Laptop">Laptop</option>
                <option value="Mouse">Mouse</option>
                <option value="Keyboards">Keyboards</option>
                <option value="Wire Combo Kits">Wire Combo Kits</option>
                <option value="Wireless Combo Kits">Wireless Combo Kits</option>
                <option value="Headphone">Headphone</option>
                <option value="Stand">Stand</option>
                <option value="Mobile Phone">Mobile Phone</option>
                <option value="Cleaning Kits">Cleaning Kits</option>
                <option value="EXT Ports">EXT Ports</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. PURCHASE & WARRANTY DETAILS */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-5 pb-3 border-b border-gray-100">Purchase & Warranty</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Price / Cost *</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 sm:top-4 text-gray-500 font-bold">₹</span>
                <input required type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 pl-8 pr-4 py-3 sm:py-3.5 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Purchase Date *</label>
              <input required type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 sm:py-3.5 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Warranty Expiry</label>
              <input type="date" name="warranty" value={formData.warranty} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 sm:py-3.5 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" />
            </div>
          </div>
        </div>

        {/* 3. CONDITION & STATUS */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-5 pb-3 border-b border-gray-100">Condition & Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Asset Condition *</label>
              <select required name="condition" value={formData.condition} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 sm:py-3.5 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
                <option value="">Select Condition...</option>
                <option value="Brand New">Brand New</option>
                <option value="Good">Good</option>
                <option value="Fair / Scratched">Fair / Scratched</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Current Status *</label>
              <select required name="status" value={formData.status} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 sm:py-3.5 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all">
                <option value="In Stock">In Stock (Available)</option>
                <option value="Assigned">Assigned</option>
                <option value="Repair">Needs Repair</option>
                <option value="Discard">Discard / Write-off</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Condition Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} placeholder="Describe any physical issues..." className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"></textarea>
          </div>
        </div>

        {/* 4. PHOTOS WITH MOBILE-FRIENDLY UPLOAD */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-5 pb-3 border-b border-gray-100">
            <Camera size={20} className="text-teal-600"/> Upload Photos
          </h2>
          
          {!formData.category ? (
            <div className="p-8 border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-center">
              <ImagePlus size={32} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-bold text-sm">Select a Category above to enable uploads.</p>
            </div>
          ) : (
            <div>
              <p className="text-xs sm:text-sm font-bold text-teal-800 bg-teal-50 p-3 sm:p-4 rounded-xl border border-teal-100 mb-6">
                {isLaptop ? 'Laptop Selected: 5 photos required.' : 'Standard Asset: 2 photos required.'} Photos are auto-watermarked with Date/Time.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {currentPhotoRequirements.map((label, index) => (
                  <div key={index} className="flex flex-col">
                    <label className="text-[10px] sm:text-xs uppercase font-black text-gray-500 mb-2 h-8 flex items-end wrap-break-word leading-tight" title={label}>
                      {label} *
                    </label>
                    
                    {photos[label] ? (
                      // Photo Uploaded View
                      <div className="relative w-full aspect-square rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
                        <img src={photos[label]} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-sm">
                          <CheckCircle2 size={12} />
                        </div>
                        {/* Remove Button for Mobile/Desktop */}
                        <button type="button" onClick={() => removePhoto(label)} className="absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl shadow-md transition-colors z-20">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      // Upload Target View (Highly tap-friendly for mobile)
                      <div className="relative w-full aspect-square rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-teal-50 hover:border-teal-400 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                        
                        {/* THE INPUT: Hidden visually, covers entire box securely */}
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          onChange={(e) => handlePhotoUpload(e, label)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                          required={true}
                        />
                        
                        <Camera size={28} className="text-gray-400 mb-2" />
                        <span className="text-[11px] font-bold text-gray-500 text-center px-2">Tap to Add</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SUBMIT BUTTON (LOGO COLOR - TEAL) */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/admin/assets" className="w-full sm:w-auto px-6 py-4 sm:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors text-center">
            Cancel
          </Link>
          <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-8 py-4 sm:py-3.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 min-w-40">
            {isSubmitting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <><Save size={18}/> Save Asset</>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
