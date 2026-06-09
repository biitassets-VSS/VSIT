'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Camera, AlertTriangle, X, ShieldAlert, 
  Lock, Unlock, Search, ChevronDown 
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
    department: 'Engineering',
    status: 'OVER DUE', 
  },
  { 
    id: 2, 
    name: 'iPhone 13 Pro', 
    tag: 'VSS-MOB-012',
    serial: 'IMEI12345',
    category: 'Mobile', 
    department: 'Design',
    status: 'ACTIVE', 
  },
  { 
    id: 3, 
    name: 'Dell UltraSharp', 
    tag: 'VSS-MON-005',
    serial: 'DL9982',
    category: 'Monitor', 
    department: 'Human Resources',
    status: 'WAITING', 
  }
];

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getAvatarGradient = (category: string) => {
  if (category === 'Laptop') return 'bg-gradient-to-br from-blue-400 to-blue-600';
  if (category === 'Mobile') return 'bg-gradient-to-br from-purple-400 to-purple-500';
  return 'bg-gradient-to-br from-pink-400 to-rose-500';
};

const getStatusStyle = (status: string) => {
  if (status === 'ACTIVE') return 'text-green-600 bg-green-50 border-green-100';
  if (status === 'OVER DUE') return 'text-red-600 bg-red-50 border-red-100 animate-pulse';
  if (status === 'WAITING') return 'text-gray-500 bg-gray-50 border-gray-200';
  return 'text-gray-500 bg-gray-50 border-gray-200';
};

export default function StaffDashboard() {
  const [assets, setAssets] = useState(initialAssets);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [verifyTag, setVerifyTag] = useState('');
  const [verifySerial, setVerifySerial] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const overdueAssets = assets.filter(a => a.status === 'OVER DUE');
  const filteredAssets = assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.tag.toLowerCase().includes(searchQuery.toLowerCase()));

  const isVerified = selectedAsset && 
    verifyTag.trim().toLowerCase() === selectedAsset.tag.toLowerCase() && 
    verifySerial.trim().toLowerCase() === selectedAsset.serial.toLowerCase();

  const getRequiredAngles = (category: string) => {
    return category === 'Laptop' 
      ? ['Display & Keyboard', 'Top Side', 'Bottom Side', 'Left Side', 'Right Side']
      : ['Front Side', 'Back Side'];
  };

  const currentAngles = selectedAsset ? getRequiredAngles(selectedAsset.category) : [];

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
    setAssets(assets.map(a => a.id === selectedAsset.id ? { ...a, status: 'WAITING' } : a));
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

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans">
      <Toaster position="top-center" />

      {/* --- NEW VSS LOGO NAVBAR --- */}
      <nav className="bg-black border-b border-gray-800 px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <img 
            src="/logo.png" 
            alt="Virtual Staffing Solutions" 
            className="h-9 sm:h-12 object-contain" 
          />
          <button className="text-sm font-semibold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <span className="hidden sm:inline">Welcome, </span>{STAFF_NAME}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Assigned Assets</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and inspect your assigned IT equipment.</p>
          </div>
        </div>

        {/* --- BLINKING OVERDUE ALERT --- */}
        {overdueAssets.length > 0 && (
          <div className="bg-white border-l-4 border-red-500 p-4 rounded-xl shadow-sm flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert size={24} className="text-red-500" />
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Action Required: Overdue Inspections</h3>
                <p className="text-gray-500 text-xs mt-0.5">You have {overdueAssets.length} asset(s) pending inspection.</p>
              </div>
            </div>
          </div>
        )}

        {/* --- SEARCH & FILTER BAR --- */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by Name, Tag ID, or Category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>
          <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between min-w-[160px] hover:bg-gray-50 transition-colors shadow-sm">
            All Categories <ChevronDown size={16} className="text-gray-400" />
          </button>
        </div>

        {/* --- ASSETS GRID --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssets.map((asset) => {
            const photosReq = getRequiredAngles(asset.category).length;
            
            return (
              <motion.div
                key={asset.id}
                whileHover={{ y: -2 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-[52px] h-[52px] rounded-2xl ${getAvatarGradient(asset.category)} text-white flex items-center justify-center text-lg font-bold shadow-sm`}>
                    {getInitials(asset.name)}
                  </div>
                  <span className={`text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-md border ${getStatusStyle(asset.status)}`}>
                    {asset.status}
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{asset.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{asset.tag}</p>
                  
                  <p className="text-sm text-gray-600 mt-3">{asset.category}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{asset.department}</p>
                </div>

                <div className="bg-[#F8F9FA] rounded-xl p-3 mt-5 flex justify-between items-center border border-gray-100">
                  <span className="text-xs font-semibold text-gray-600">Photos Required</span>
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                    {photosReq}
                  </span>
                </div>

                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={() => {
                      setSelectedAsset(asset);
                      setIsInspectionOpen(true);
                    }}
                    disabled={asset.status === 'WAITING'}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      asset.status === 'WAITING' 
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'bg-[#F0FDF4] text-[#16A34A] hover:bg-green-100'
                    }`}
                  >
                    {asset.status === 'WAITING' ? 'Under Review' : 'Inspect'}
                  </button>
                  <button className="flex-1 bg-[#FEF2F2] text-[#DC2626] hover:bg-red-100 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    Report
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* --- INSPECTION MODAL (POP-UP) --- */}
      <AnimatePresence>
        {isInspectionOpen && selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 flex flex-col max-h-[90vh]"
            >
              <div className="border-b border-gray-100 p-5 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Asset Inspection</h2>
                  <p className="text-gray-500 text-sm">{selectedAsset.name} ({selectedAsset.tag})</p>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                <div className={`p-5 rounded-xl border transition-colors ${isVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className={`font-bold mb-4 flex items-center gap-2 text-sm ${isVerified ? 'text-green-700' : 'text-gray-800'}`}>
                    {isVerified ? <Unlock size={18} /> : <Lock size={18} />} 
                    Step 1: Verify Identity {isVerified && '- Verified!'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Enter Asset Tag ID</label>
                      <input 
                        type="text" 
                        placeholder="e.g. VSS-MAC-001" 
                        className={`w-full p-2.5 border rounded-lg outline-none text-sm ${isVerified ? 'border-green-300 bg-white' : 'border-gray-200 focus:border-blue-500'}`}
                        value={verifyTag} 
                        onChange={e => setVerifyTag(e.target.value)} 
                        disabled={isVerified}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Enter Serial Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. C02ZG01" 
                        className={`w-full p-2.5 border rounded-lg outline-none text-sm ${isVerified ? 'border-green-300 bg-white' : 'border-gray-200 focus:border-blue-500'}`}
                        value={verifySerial} 
                        onChange={e => setVerifySerial(e.target.value)} 
                        disabled={isVerified}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 text-sm mb-2">Step 2: Condition Notes</h3>
                  <textarea 
                    placeholder="Briefly describe the current condition..."
                    className="w-full p-3 border border-gray-200 rounded-xl h-24 resize-none outline-none focus:border-blue-500 text-sm"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                <div className="relative">
                  {!isVerified && (
                    <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/60 flex flex-col items-center justify-center rounded-xl border border-gray-100">
                      <Lock className="text-gray-400 mb-2" size={32} />
                      <p className="text-sm font-bold text-gray-600">Verify Asset ID and Serial to unlock camera.</p>
                    </div>
                  )}

                  <div className={!isVerified ? 'opacity-40 pointer-events-none' : ''}>
                    <div className="flex justify-between items-end mb-4">
                      <h3 className="font-bold text-gray-800 text-sm">Step 3: Capture Photos ({currentAngles.length} Required)</h3>
                      <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-md font-bold tracking-wide">LIVE CAMERA ONLY</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {currentAngles.map((angle) => (
                        <div key={angle} className="relative aspect-square border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-[#F8F9FA] flex flex-col items-center justify-center group hover:border-blue-400 transition-colors">
                          
                          {photos[angle] ? (
                            <img src={photos[angle]} alt={angle} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-2">
                              <Camera className="mx-auto text-gray-300 mb-2 group-hover:text-blue-500 transition-colors" size={28} />
                              <p className="text-xs font-semibold text-gray-500">{angle}</p>
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

              <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3 sticky bottom-0">
                <button onClick={closeModal} className="px-5 py-2.5 font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors text-sm">
                  Cancel
                </button>
                <button 
                  onClick={submitInspection}
                  disabled={!isVerified}
                  className={`px-6 py-2.5 font-bold rounded-xl shadow-sm transition-all text-sm ${
                    isVerified 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
