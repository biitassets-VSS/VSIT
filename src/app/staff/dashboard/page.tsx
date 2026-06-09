'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Camera, Laptop, AlertTriangle, CheckCircle, Clock, 
  X, Info, ShieldAlert, CalendarClock 
} from 'lucide-react';

// --- MOCK DATA ---
const STAFF_NAME = "Lakhwinder Singh";
const REQUIRED_ANGLES = [
  'Display & Keyboard', 'Top Side', 'Bottom Side', 'Left Side', 'Right Side'
];

const initialAssets = [
  { 
    id: 1, 
    name: 'MacBook Pro M2', 
    tag: 'VSS-MAC-001',
    serial: 'C02ZG011MD6M',
    category: 'Laptop', 
    status: 'Over Due', 
    overdueDate: '2023-10-15',
    lastInspection: '2023-04-15',
    color: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' 
  },
  { 
    id: 2, 
    name: 'Dell XPS 15', 
    tag: 'VSS-DELL-042',
    serial: '8J9K2L1',
    category: 'Laptop', 
    status: 'Active', 
    upcomingDate: '2024-12-01',
    lastInspection: '2023-12-01',
    color: 'bg-gradient-to-br from-blue-50 to-indigo-100 border-indigo-200' 
  },
];

export default function StaffDashboard() {
  const [assets, setAssets] = useState(initialAssets);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  
  // Inspection Form State
  const [verifyTag, setVerifyTag] = useState('');
  const [verifySerial, setVerifySerial] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const overdueAssets = assets.filter(a => a.status === 'Over Due');

  // --- WATERMARK & CAMERA LOGIC ---
  const handleCapture = (angle: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to draw watermark
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Draw Original Image
          ctx.drawImage(img, 0, 0);
          
          // Setup Watermark Style
          const timeString = new Date().toLocaleString();
          ctx.font = `${Math.floor(img.width * 0.04)}px Arial`; // Scale font to image
          ctx.fillStyle = "rgba(255, 0, 0, 0.9)"; // Red text
          ctx.strokeStyle = "white"; // White outline for visibility
          ctx.lineWidth = 3;
          
          // Draw text at bottom right
          const text = `VSS Portal | ${timeString}`;
          const textWidth = ctx.measureText(text).width;
          ctx.strokeText(text, img.width - textWidth - 20, img.height - 30);
          ctx.fillText(text, img.width - textWidth - 20, img.height - 30);
          
          // Save back to state
          setPhotos(prev => ({ ...prev, [angle]: canvas.toDataURL('image/jpeg') }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const submitInspection = () => {
    if (Object.keys(photos).length < 5) {
      toast.error("Please capture all 5 required angles!");
      return;
    }
    
    // Update status to Waiting for Approval
    setAssets(assets.map(a => 
      a.id === selectedAsset.id ? { ...a, status: 'Waiting for Approval', color: 'bg-amber-100 border-amber-300' } : a
    ));
    
    toast.success("Inspection Submitted! Waiting for Approval.");
    setIsInspectionOpen(false);
    setSelectedAsset(null);
    setPhotos({});
    setVerifyTag('');
    setVerifySerial('');
    setNotes('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12 font-sans">
      <Toaster position="top-center" />

      {/* --- TOP HEADER --- */}
      <div className="bg-indigo-900 text-white pt-8 pb-16 px-6 text-center shadow-lg rounded-b-[40px]">
        <h2 className="text-sm font-semibold tracking-widest text-indigo-300 uppercase mb-2">
          Virtual Staffing Solutions
        </h2>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
          IT Assets Management System
        </h1>
        <div className="inline-block bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
          <p className="text-lg">Welcome back, <span className="font-bold text-yellow-400">{STAFF_NAME}</span> 👋</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        
        {/* --- BLINKING OVERDUE ALERTS --- */}
        {overdueAssets.length > 0 && (
          <div className="bg-red-500 text-white p-4 rounded-xl shadow-lg border border-red-600 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert size={28} />
              <div>
                <h3 className="font-bold text-lg">Warning: Overdue Inspections!</h3>
                <p className="text-red-100 text-sm">You have {overdueAssets.length} asset(s) that require immediate inspection.</p>
              </div>
            </div>
          </div>
        )}

        {/* --- ASSETS THUMBNAIL GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {assets.map((asset) => (
            <motion.div
              key={asset.id}
              whileHover={{ y: -5 }}
              className={`rounded-2xl p-6 shadow-md border ${asset.color} relative overflow-hidden transition-all`}
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1
                  ${asset.status === 'Over Due' ? 'bg-red-600 text-white animate-pulse' : ''}
                  ${asset.status === 'Active' ? 'bg-green-500 text-white' : ''}
                  ${asset.status === 'Waiting for Approval' ? 'bg-amber-500 text-white' : ''}
                `}>
                  {asset.status === 'Over Due' && <AlertTriangle size={12} />}
                  {asset.status === 'Waiting for Approval' && <Clock size={12} />}
                  {asset.status === 'Active' && <CheckCircle size={12} />}
                  {asset.status}
                </span>
              </div>

              <div className="mb-4 text-indigo-900 dark:text-indigo-100">
                <Laptop size={40} className="mb-2 opacity-80" />
                <h3 className="text-xl font-bold">{asset.name}</h3>
                <p className="text-sm font-medium opacity-70">Tag: {asset.tag}</p>
              </div>

              {/* Status Details */}
              <div className="space-y-2 text-sm text-gray-700 bg-white/50 rounded-lg p-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Inspection:</span>
                  <span className="font-semibold">{asset.lastInspection}</span>
                </div>
                {asset.status === 'Over Due' ? (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Overdue Since:</span>
                    <span>{asset.overdueDate}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Upcoming:</span>
                    <span className="font-semibold">{asset.upcomingDate || 'Pending'}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setSelectedAsset(asset);
                    setIsInspectionOpen(true);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition-colors flex justify-center items-center gap-2"
                >
                  <Camera size={16} /> Inspect Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* --- INSPECTION MODAL (POP-UP) --- */}
      <AnimatePresence>
        {isInspectionOpen && selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-indigo-600 p-5 flex justify-between items-center text-white sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-bold">Perform Inspection</h2>
                  <p className="text-indigo-200 text-sm">{selectedAsset.name}</p>
                </div>
                <button onClick={() => setIsInspectionOpen(false)} className="hover:bg-indigo-500 p-2 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Step 1: Verification */}
                <div className="bg-indigo-50 dark:bg-gray-700 p-5 rounded-xl border border-indigo-100 dark:border-gray-600">
                  <h3 className="font-bold text-indigo-900 dark:text-white mb-4 flex items-center gap-2">
                    <Info size={18} /> Step 1: Verify Identity
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter Asset Tag ID</label>
                      <input type="text" placeholder={`Expected: ${selectedAsset.tag}`} className="w-full p-2 border rounded-md bg-white dark:bg-gray-900" value={verifyTag} onChange={e => setVerifyTag(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter Serial Number</label>
                      <input type="text" placeholder={`Expected: ${selectedAsset.serial}`} className="w-full p-2 border rounded-md bg-white dark:bg-gray-900" value={verifySerial} onChange={e => setVerifySerial(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Step 2: Notes */}
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Step 2: Condition Notes</h3>
                  <textarea 
                    placeholder="Briefly describe the current condition (e.g., scratches on top lid, works perfectly...)"
                    className="w-full p-3 border rounded-xl h-24 resize-none bg-white dark:bg-gray-900"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                {/* Step 3: Required Photos */}
                <div>
                  <div className="flex justify-between items-end mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white">Step 3: Capture 5 Angles</h3>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold">LIVE CAMERA ONLY</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {REQUIRED_ANGLES.map((angle) => (
                      <div key={angle} className="relative aspect-square border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 flex flex-col items-center justify-center group hover:border-indigo-500 transition-colors">
                        
                        {photos[angle] ? (
                          <img src={photos[angle]} alt={angle} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-2">
                            <Camera className="mx-auto text-gray-400 mb-2 group-hover:text-indigo-500" size={32} />
                            <p className="text-xs font-semibold text-gray-500">{angle}</p>
                          </div>
                        )}
                        
                        {/* capture="environment" forces mobile camera, disables gallery upload */}
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => handleCapture(angle, e)}
                        />
                        
                        {photos[angle] && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                            <span className="text-white text-sm font-bold">Retake</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3 sticky bottom-0">
                <button onClick={() => setIsInspectionOpen(false)} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-200 rounded-lg">
                  Cancel
                </button>
                <button 
                  onClick={submitInspection}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md"
                >
                  Submit Inspection
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
