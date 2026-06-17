'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, UploadCloud, ImagePlus, 
  CheckCircle2, AlertCircle, Camera 
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

  // Photos State (Keyed by the specific label requirement)
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

  // Determine current requirements based on category
  const isLaptop = formData.category.toLowerCase().includes('laptop');
  const currentPhotoRequirements = formData.category 
    ? (isLaptop ? laptopPhotoRequirements : standardPhotoRequirements) 
    : [];

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear photos if category changes drastically to prevent mismatched labels
    if (name === 'category') {
      setPhotos({});
    }
  };

  // =========================================================================
  // WATERMARK & UPLOAD LOGIC
  // =========================================================================
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read the file as a data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create a canvas to draw the image and watermark
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Configure Watermark Text (Current Date & Time)
        const watermarkText = new Date().toLocaleString();
        
        // Dynamic font size based on image dimensions
        const fontSize = Math.max(24, img.height * 0.03); 
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        const paddingX = 30;
        const paddingY = 30;
        const x = canvas.width - paddingX;
        const y = canvas.height - paddingY;

        // Draw Black Outline for visibility on bright photos
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = Math.max(3, fontSize * 0.1);
        ctx.strokeText(watermarkText, x, y);

        // Draw White Text inside
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(watermarkText, x, y);

        // Get final watermarked image
        const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Save to state under the specific label
        setPhotos(prev => ({ ...prev, [label]: watermarkedDataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };


  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Prepare new asset object
    const newAsset = {
      id: `AST-${Date.now()}`,
      ...formData,
      inspectionPhotos: currentPhotoRequirements.map(req => photos[req]).filter(Boolean), // Array of uploaded photos
      inspectionNotes: formData.notes,
      assignedToEmpId: '',
      assignedToName: '',
      imageUrl: currentPhotoRequirements.length > 0 ? photos[currentPhotoRequirements[0]] : '', // Set first photo as thumbnail
    };

    // Save to LocalStorage
    const savedAssets = JSON.parse(localStorage.getItem('vsit_assets_inventory') || '[]');
    savedAssets.unshift(newAsset); // Add to beginning of array
    localStorage.setItem('vsit_assets_inventory', JSON.stringify(savedAssets));

    // Redirect back to list
    setTimeout(() => {
      router.push('/admin/assets');
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/admin/assets" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-teal-600 transition-colors">
          <ArrowLeft size={16} /> Back to Assets
        </Link>
        <h1 className="text-2xl font-black text-gray-900">Add New Asset</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* ========================================== */}
        {/* 1. BASIC INFORMATION                       */}
        {/* ========================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-6 pb-4 border-b border-gray-100">Basic Information</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Asset Tag *</label>
              <input required type="text" name="tagId" value={formData.tagId} onChange={handleInputChange} placeholder="e.g. AST-1042" className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Serial Number</label>
              <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleInputChange} placeholder="e.g. SN-9982348X" className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Asset Name / Description *</label>
              <input required type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Dell XPS 15 Laptop" className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
              <select required name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all">
                <option value="">Select Category...</option>
                <option value="Laptops">Laptops</option>
                <option value="Desktops">Desktops</option>
                <option value="Monitors">Monitors</option>
                <option value="Peripherals">Peripherals</option>
                <option value="Networking">Networking</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Vendor / Supplier</label>
            <input type="text" name="vendor" value={formData.vendor} onChange={handleInputChange} placeholder="e.g. Dell Store, Amazon" className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all" />
          </div>
        </div>

        {/* ========================================== */}
        {/* 2. PURCHASE & WARRANTY DETAILS             */}
        {/* ========================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-6 pb-4 border-b border-gray-100">Purchase & Financial</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Price / Cost *</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-500 font-bold">₹</span>
                <input required type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="0.00" className="w-full bg-white border border-gray-200 pl-8 pr-4 py-3 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Purchase Date *</label>
              <input required type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Warranty Expiry</label>
              <input type="date" name="warranty" value={formData.warranty} onChange={handleInputChange} className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all" />
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* 3. CONDITION & STATUS                      */}
        {/* ========================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-6 pb-4 border-b border-gray-100">Condition & Status</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Asset Condition *</label>
              <select required name="condition" value={formData.condition} onChange={handleInputChange} className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all">
                <option value="">Select Condition...</option>
                <option value="Brand New">Brand New</option>
                <option value="Good">Good</option>
                <option value="Fair / Scratched">Fair / Scratched</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Current Status *</label>
              <select required name="status" value={formData.status} onChange={handleInputChange} className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all">
                <option value="In Stock">In Stock (Available)</option>
                <option value="Assigned">Assigned</option>
                <option value="Repair">Needs Repair</option>
                <option value="Discard">Discard / Write-off</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Notes for Current Condition</label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} placeholder="Describe any scratches, dents, or specific conditions..." className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"></textarea>
          </div>
        </div>

        {/* ========================================== */}
        {/* 4. UPLOADED PHOTOS (DYNAMIC & WATERMARKED) */}
        {/* ========================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <Camera size={20} className="text-teal-600"/> Uploaded Photos (Watermarked)
          </h2>
          
          {!formData.category ? (
            <div className="p-8 border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-center">
              <ImagePlus size={32} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-bold text-sm">Please select a Category above to see photo requirements.</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold text-gray-500 mb-4 bg-teal-50 text-teal-800 p-3 rounded-xl border border-teal-100">
                Rule: {isLaptop ? 'Laptop Selected. 5 photos required.' : 'Standard Asset. 2 photos required.'} Photos will be automatically watermarked with date and time.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {currentPhotoRequirements.map((label, index) => (
                  <div key={index} className="flex flex-col relative group">
                    <label className="text-[10px] uppercase font-black text-gray-500 mb-1.5 h-6 flex items-end line-clamp-1" title={label}>
                      {label} *
                    </label>
                    
                    <div className="relative w-full aspect-square rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden hover:border-teal-400 hover:bg-teal-50 transition-colors flex flex-col items-center justify-center cursor-pointer">
                      
                      {/* Hidden File Input */}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handlePhotoUpload(e, label)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        required={!photos[label]} // Required if photo hasn't been uploaded
                      />
                      
                      {/* Show Uploaded Photo OR Placeholder */}
                      {photos[label] ? (
                        <>
                          <img src={photos[label]} alt={label} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="text-white text-xs font-bold flex items-center gap-1"><UploadCloud size={14}/> Change</span>
                          </div>
                          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-sm">
                            <CheckCircle2 size={12} />
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                          <UploadCloud size={24} className="mb-2" />
                          <span className="text-[10px] font-bold text-gray-500">Tap to Upload</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* SUBMIT BUTTON                              */}
        {/* ========================================== */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
          <Link href="/admin/assets" className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={isSubmitting} className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 min-w-[160px]">
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
