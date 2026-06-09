'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Camera, Laptop, AlertTriangle, CheckCircle, Clock, 
  X, Info, ShieldAlert, Smartphone, Monitor, Lock, Unlock
} from 'lucide-react';

// --- MOCK DATA ---
const STAFF_NAME = "Lakhwinder Singh";

const initialAssets = [
  { 
    id: 1, 
    name: 'MacBook Pro M2', 
    tag: 'VSS-MAC-001',
    serial: 'C02ZG01',
    category: 'Laptop', 
    status: 'Over Due', 
    overdueDate: '2023-10-15',
    lastInspection: '2023-04-15',
  },
  { 
    id: 2, 
    name: 'iPhone 13 Pro', 
    tag: 'VSS-MOB-012',
    serial: 'IMEI12345',
    category: 'Mobile', 
    status: 'Active', 
    upcomingDate: '2024-12-01',
    lastInspection: '2023-12-01',
  },
  { 
    id: 3, 
    name: 'Dell UltraSharp 27"', 
    tag: 'VSS-MON-005',
    serial: 'DL9982',
    category: 'Monitor', 
    status: 'Waiting for Approval', 
    upcomingDate: 'Pending',
    lastInspection: '2024-01-10',
  }
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

  // --- LOGIC: VERIFICATION & DYNAMIC ANGLES ---
  // Check if what the user typed matches the selected asset exactly (case-insensitive)
  const isVerified = selectedAsset && 
    verifyTag.trim().toLowerCase() === selectedAsset.tag.toLowerCase() && 
    verifySerial.trim().toLowerCase() === selectedAsset.serial.toLowerCase();

  // 5 photos for Laptop, 2 for anything else
  const getRequiredAngles = (category: string) => {
    if (category === 'Laptop') {
      return ['Display & Keyboard', 'Top Side', 'Bottom Side', 'Left Side', 'Right Side'];
    }
    return ['Front Side', 'Back Side'];
  };

  const currentAngles = selectedAsset ? getRequiredAngles(selectedAsset.category) : [];

  // --- WATERMARK & CAMERA LOGIC ---
  const handleCapture = (angle: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const timeString = new Date().toLocaleString();
          ctx.font = `${Math.floor(img.width * 0.04)}px Arial`;
          ctx.fillStyle = "rgba(255, 0, 0, 0.9)";
          ctx.strokeStyle = "white";
          ctx.lineWidth = 3;
          const text = `VSS Portal | ${timeString}`;
          const textWidth = ctx.measureText(text).width;
          ctx.strokeText(text, img.width - textWidth - 20, img.height - 30);
          ctx.fillText(text, img.width - textWidth - 20, img.height - 30);
          
          setPhotos(prev => ({ ...prev, [angle]: canvas.toDataURL('image/jpeg') }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const submitInspection = () => {
    if (Object.keys(photos).length < currentAngles.length) {
      toast.error(`Please capture all ${currentAngles.length} required photos!`);
      return;
    }
    
    setAssets(assets.map(a => 
      a.id === selectedAsset.id ? { ...a, status: 'Waiting for Approval' } : a
    ));
    
    toast.success("Inspection Submitted! Waiting for Approval.");
    closeModal();
  };

  const closeModal = () => {
    setIsInspectionOpen(false);
    setSelectedAsset(null);
    setPhotos({});
    setVerifyTag('');
    setVerifySerial('');
    setNotes('');
  };

  // Helper for Status Colors
  const getStatusColor = (status: string) => {
    if (status === 'Over Due') return 'bg-red-100 text-red-700 border-red-200';
    if (status === 'Waiting for Approval') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-12 font-sans">
      <Toaster position="top-center" />

      {/* --- ADMIN STYLE HEADER --- */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 pt-8 pb-10 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase mb-1">
              Virtual Staffing Solutions
            </h2>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
              IT Assets Management System
            </h1>
          </div>
          <div className="bg-indigo-50 dark:bg-gray-700 px-5 py-2.5 rounded-xl border border-indigo-100 dark:border-gray-600">
            <p className="text-gray-700 dark:text-gray-200 font-medium">
              Welcome, <span className="font-bold text-indigo-600 dark:text-indigo-400">{STAFF_NAME}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        
        {/* --- BLINKING OVERDUE ALERTS --- */}
        {overdueAssets.length > 0 && (
          <div className="bg-red-50 text-red-900 p-4 rounded-xl shadow-sm border border-red-200 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert size={28} className="text-red-600" />
              <div>
                <h3 className="font-bold text-lg">Warning: Overdue Inspections!</h3>
                <p className="text-red-700 text-sm">You have {overdueAssets.length} asset(s) that require immediate inspection.</p>
              </div>
            </div>
          </div>
        )}

        {/* --- ASSETS THUMBNAIL GRID (Clean Admin Style) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <motion.div
              key={asset.id}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden flex flex-col"
            >
              {/* Left Color Bar based on status */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                asset.status === 'Over Due' ? 'bg-red-500' : 
                asset.status === 'Waiting for Approval' ? 'bg-amber-500' : 'bg-green-500'
              }`} />

              <div className="flex justify-between items-start mb-4 pl-2">
                <div className={`p-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-600`}>
                  {asset.category === 'Laptop' && <Laptop size={24} />}
                  {asset.category === 'Mobile' && <Smartphone size={24} />}
                  {asset.category === 'Monitor' && <Monitor size={24} />}
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusColor(asset.status)} ${asset.status === 'Over Due' ? 'animate-pulse' : ''}`}>
                  {asset.status === 'Over Due' && <AlertTriangle size={12} />}
                  {asset.status === 'Waiting for Approval' && <Clock size={12} />}
                  {asset.status === 'Active' && <CheckCircle size={12} />}
                  {asset.status}
                </span>
              </div>

              <div className="mb-4 pl-2 text-gray-900 dark:text-white flex-1">
                <h3 className="text-lg font-bold">{asset.name}</h3>
                <p className="text-sm font-medium text-gray-500">Tag: {asset.tag}</p>
              </div>

              {/* Status Details Box */}
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-5 ml-2">
                <div className="flex justify-between">
                  <span>Last Inspection:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{asset.lastInspection}</span>
                </div>
                {asset.status === 'Over Due' ? (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Overdue Since:</span>
                    <span>{asset.overdueDate}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>Upcoming:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{asset.upcomingDate || 'Pending'}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button 
                onClick={() => {
                  setSelectedAsset(asset);
                  setIsInspectionOpen(true);
                }}
                disabled={asset.status === 'Waiting for Approval'}
                className="ml-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-semibold transition-colors flex justify-center items-center gap-2"
              >
                {asset.status === 'Waiting for Approval' ? 'Under Review' : <><Camera size={18} /> Inspect Now</>}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* --- INSPECTION MODAL (POP-UP) --- */}
      <AnimatePresence>
        {isInspectionOpen && selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-5 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Perform Inspection</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{selectedAsset.name} ({selectedAsset.category})</p>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Step 1: Verification */}
                <div className={`p-5 rounded-xl border transition-colors ${isVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}>
                  <h3 className={`font-bold mb-4 flex items-center gap-2 ${isVerified ? 'text-green-700' : 'text-gray-900 dark:text-white'}`}>
                    {isVerified ? <Unlock size={18} /> : <Lock size={18} />} 
                    Step 1: Verify Identity {isVerified && '- Verified!'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter Asset Tag ID</label>
                      <input 
                        type="text" 
                        placeholder="e.g. VSS-MAC-001" 
                        className={`w-full p-2.5 border rounded-lg bg-white dark:bg-gray-900 outline-none focus:ring-2 ${isVerified ? 'border-green-300 focus:ring-green-500' : 'border-gray-300 focus:ring-indigo-500'}`}
                        value={verifyTag} 
                        onChange={e => setVerifyTag(e.target.value)} 
                        disabled={isVerified}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter Serial Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. C02ZG01" 
                        className={`w-full p-2.5 border rounded-lg bg-white dark:bg-gray-900 outline-none focus:ring-2 ${isVerified ? 'border-green-300 focus:ring-green-500' : 'border-gray-300 focus:ring-indigo-500'}`}
                        value={verifySerial} 
                        onChange={e => setVerifySerial(e.target.value)} 
                        disabled={isVerified}
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Notes */}
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Step 2: Condition Notes</h3>
                  <textarea 
                    placeholder="Briefly describe the current condition..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl h-24 resize-none bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                {/* Step 3: Photos (HIDDEN UNTIL VERIFIED) */}
                <div className="relative">
                  {!isVerified && (
                    <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-white/50 dark:bg-gray-800/50 flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700">
                      <Lock className="text-gray-400 mb-2" size={32} />
                      <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Verify Asset ID and Serial Number to unlock camera.</p>
                    </div>
                  )}

                  <div className={!isVerified ? 'opacity-30 pointer-events-none' : ''}>
                    <div className="flex justify-between items-end mb-4">
                      <h3 className="font-bold text-gray-900 dark:text-white">Step 3: Capture Photos ({currentAngles.length} Required)</h3>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">LIVE CAMERA ONLY</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {currentAngles.map((angle) => (
                        <div key={angle} className="relative aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-700 flex flex-col items-center justify-center group hover:border-indigo-500 transition-colors">
                          
                          {photos[angle] ? (
                            <img src={photos[angle]} alt={angle} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-2">
                              <Camera className="mx-auto text-gray-400 mb-2 group-hover:text-indigo-500 transition-colors" size={28} />
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{angle}</p>
                            </div>
                          )}
                          
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleCapture(angle, e)}
                            disabled={!isVerified}
                          />
                          
                          {photos[angle] && isVerified && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                              <span className="text-white text-sm font-bold">Retake</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 sticky bottom-0">
                <button onClick={closeModal} className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={submitInspection}
                  disabled={!isVerified}
                  className={`px-6 py-2.5 font-bold rounded-xl shadow-sm transition-all ${
                    isVerified 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
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
