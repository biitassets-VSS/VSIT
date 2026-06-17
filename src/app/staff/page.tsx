'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, CheckCircle2, AlertCircle, Camera, 
  ArrowLeft, UploadCloud, Trash2, ImagePlus, 
  MessageSquare, Info, ShieldAlert, Send,
  Ticket, PlusCircle // Added new icons for Quick Actions
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
interface AssignedAsset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: string;
  inspectionStatus: 'Due' | 'Pending Approval' | 'Inspected' | 'Re-inspection';
  adminFeedback?: string; // Reason for re-inspection from Admin
}

// --- Photo Rules ---
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

export default function StaffDashboardPage() {
  // Mock Staff Data (In production, get this from your Auth/Session context)
  const staffUser = {
    name: 'Rahul Sharma',
    empCode: 'EMP-1042',
    department: 'Engineering'
  };

  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [viewState, setViewState] = useState<'dashboard' | 'inspecting'>('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  
  // Inspection Form State
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Simulated fetch of assigned assets from DB/LocalStorage
    setAssets([
      {
        id: 'AST-1042',
        tagId: 'AST-1042',
        name: 'Dell XPS 15 Laptop',
        category: 'Laptop',
        status: 'Assigned',
        inspectionStatus: 'Re-inspection',
        adminFeedback: "The 'Left Side port' photo is too blurry, and you forgot to upload the bottom tag photo. Please retake them."
      },
      {
        id: 'AST-2099',
        tagId: 'AST-2099',
        name: 'Logitech MX Master 3',
        category: 'Mouse',
        status: 'Assigned',
        inspectionStatus: 'Due'
      },
      {
        id: 'AST-3005',
        tagId: 'AST-3005',
        name: 'Dell 27" 4K Monitor',
        category: 'Monitor',
        status: 'Assigned',
        inspectionStatus: 'Pending Approval'
      }
    ]);
  }, []);

  const openInspection = (asset: AssignedAsset) => {
    setSelectedAsset(asset);
    setPhotos({});
    setNotes('');
    setViewState('inspecting');
  };

  // =========================================================================
  // WATERMARK & UPLOAD LOGIC (Same as Admin)
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

        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 1200;

        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Watermark
        const watermarkText = new Date().toLocaleString();
        const fontSize = Math.max(20, height * 0.035); 
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        const paddingX = Math.max(15, width * 0.02);
        const paddingY = Math.max(15, height * 0.02);
        const x = width - paddingX;
        const y = height - paddingY;

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = Math.max(3, fontSize * 0.15);
        ctx.strokeText(watermarkText, x, y);

        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillText(watermarkText, x, y);

        const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotos(prev => ({ ...prev, [label]: watermarkedDataUrl }));
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

  const handleSubmitInspection = () => {
    if (!selectedAsset) return;
    
    const requiredLabels = selectedAsset.category.toLowerCase().includes('laptop') 
      ? laptopPhotoRequirements 
      : standardPhotoRequirements;

    // Validation: Check if all required photos are uploaded
    const missingPhotos = requiredLabels.filter(label => !photos[label]);
    if (missingPhotos.length > 0) {
      alert(`Please upload the following missing photos before submitting:\n- ${missingPhotos.join('\n- ')}`);
      return;
    }

    setIsSubmitting(true);

    // Simulate API Call / Save to LocalStorage
    setTimeout(() => {
      setAssets(prev => prev.map(a => 
        a.id === selectedAsset.id 
          ? { ...a, inspectionStatus: 'Pending Approval' } 
          : a
      ));
      alert('Inspection submitted successfully! Sent to Admin for review.');
      setIsSubmitting(false);
      setViewState('dashboard');
    }, 1000);
  };

  // Determine rules for active asset
  const isLaptop = selectedAsset?.category?.toLowerCase().includes('laptop');
  const requiredLabels = isLaptop ? laptopPhotoRequirements : standardPhotoRequirements;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 sm:px-0">
      
      {/* ========================================== */}
      {/* VIEW: STAFF DASHBOARD (OVERVIEW)           */}
      {/* ========================================== */}
      {viewState === 'dashboard' && (
        <>
          {/* PERSONALIZED HEADER */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                Welcome, {staffUser.name} 👋
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1">Manage your assigned hardware and complete inspections.</p>
            </div>
            <div className="bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">Emp Code</span>
              <span className="text-lg font-black text-teal-900">{staffUser.empCode}</span>
            </div>
          </div>

          {/* QUICK ACTIONS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => alert("Redirecting to Support Desk to Raise a Ticket...")}
              className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors text-left group"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                <Ticket size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-[15px]">Raise IT Ticket</h3>
                <p className="text-xs font-bold text-gray-500 mt-0.5">Report a broken device or software issue</p>
              </div>
            </button>

            <button 
              onClick={() => alert("Opening Asset Request Form...")}
              className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-left group"
            >
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                <PlusCircle size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-[15px]">Request New Asset</h3>
                <p className="text-xs font-bold text-gray-500 mt-0.5">Need a mouse, keyboard, or monitor?</p>
              </div>
            </button>
          </div>

          {/* ASSET LIST WIDGET */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-2">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Package size={20} className="text-teal-600" /> My Assigned Assets ({assets.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {assets.map((asset) => (
                <div key={asset.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-200 flex flex-col justify-between hover:border-teal-300 transition-colors group">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-black bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-gray-600 uppercase tracking-wider">
                        {asset.category}
                      </span>
                      {asset.inspectionStatus === 'Inspected' && (
                        <CheckCircle2 size={20} className="text-green-500" />
                      )}
                      {asset.inspectionStatus === 'Re-inspection' && (
                        <ShieldAlert size={20} className="text-orange-500 animate-pulse" />
                      )}
                    </div>
                    
                    <h3 className="text-lg font-black text-gray-900 mb-1">{asset.name}</h3>
                    <p className="text-sm font-bold text-gray-500 uppercase">{asset.tagId}</p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between">
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      asset.inspectionStatus === 'Due' ? 'text-blue-600' :
                      asset.inspectionStatus === 'Re-inspection' ? 'text-orange-600' :
                      asset.inspectionStatus === 'Pending Approval' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {asset.inspectionStatus}
                    </span>

                    {(asset.inspectionStatus === 'Due' || asset.inspectionStatus === 'Re-inspection') ? (
                      <button 
                        onClick={() => openInspection(asset)} 
                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-colors flex items-center gap-2 group-hover:scale-105 transform"
                      >
                        <Camera size={14} /> Start Inspection
                      </button>
                    ) : asset.inspectionStatus === 'Pending Approval' ? (
                      <span className="text-xs font-bold text-gray-400">Waiting for Admin...</span>
                    ) : (
                      <span className="text-xs font-bold text-gray-400">Up to date</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* VIEW: INSPECTION UPLOAD FORM               */}
      {/* ========================================== */}
      {viewState === 'inspecting' && selectedAsset && (
        <div className="space-y-6">
          <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 border-b border-gray-100 pb-6">
              <div>
                <span className="text-xs font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg border border-teal-100 uppercase tracking-wider mb-2 inline-block">New Inspection</span>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900">{selectedAsset.name}</h2>
                <p className="text-sm font-bold text-gray-500 mt-1 uppercase">
                  {selectedAsset.tagId} &bull; Category: {selectedAsset.category}
                </p>
              </div>
            </div>

            {/* Admin Feedback Alert (If Re-inspection) */}
            {selectedAsset.inspectionStatus === 'Re-inspection' && selectedAsset.adminFeedback && (
              <div className="mb-8 bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <h3 className="text-sm font-black text-orange-900 flex items-center gap-2 mb-2">
                  <ShieldAlert size={18} className="text-orange-600" /> Admin requested a Re-inspection
                </h3>
                <p className="text-sm font-bold text-orange-800 leading-relaxed">
                  "{selectedAsset.adminFeedback}"
                </p>
              </div>
            )}

            {/* 1. PHOTO UPLOADS (Dynamic Rules) */}
            <div className="mb-8">
              <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                <Camera size={20} className="text-teal-600" /> Upload Photos
              </h3>
              <p className="text-sm font-bold text-teal-800 bg-teal-50 p-3 sm:p-4 rounded-xl border border-teal-100 mb-6">
                {isLaptop ? 'Laptop Rules: All 5 specific angles are required.' : 'Standard Rules: 2 specific angles are required.'} Photos are automatically watermarked.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {requiredLabels.map((label, index) => (
                  <div key={index} className="flex flex-col">
                    <label className="text-[11px] sm:text-xs uppercase font-black text-gray-500 mb-2 h-8 flex items-end break-words leading-tight">
                      {label} *
                    </label>
                    
                    {photos[label] ? (
                      <div className="relative w-full aspect-square rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
                        <img src={photos[label]} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-sm">
                          <CheckCircle2 size={12} />
                        </div>
                        <button type="button" onClick={() => removePhoto(label)} className="absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl shadow-md transition-colors z-20">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative w-full aspect-square rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-teal-50 hover:border-teal-400 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          onChange={(e) => handlePhotoUpload(e, label)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                        />
                        <Camera size={28} className="text-gray-400 mb-2" />
                        <span className="text-[11px] font-bold text-gray-500 text-center px-2">Tap to Add</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. STAFF NOTES */}
            <div className="mb-8">
              <h3 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare size={20} className="text-teal-600" /> Condition Notes
              </h3>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the current condition. Mention any new scratches, missing cables, or issues..."
                className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
                rows={4}
              />
            </div>

            {/* 3. SUBMIT BUTTON */}
            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button 
                onClick={handleSubmitInspection}
                disabled={isSubmitting} 
                className="w-full sm:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-[15px] font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 min-w-[200px]"
              >
                {isSubmitting ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <><Send size={18}/> Submit to Admin</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
