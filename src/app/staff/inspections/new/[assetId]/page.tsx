'use client';

import React, { useState } from 'react';
import { 
  ClipboardCheck, Clock, AlertTriangle, Search, 
  Camera, CheckCircle2, X, ShieldCheck 
} from 'lucide-react';

// 1. Fixed TypeScript: Created a proper interface instead of using "any"
interface Asset {
  id: string;
  name: string;
  type: string;
}

const assignedAssets: Asset[] = [
  { id: 'TAG-1045', name: 'MacBook Pro 14" (M2)', type: 'Laptop' },
  { id: 'TAG-2099', name: 'Dell UltraSharp 27" 4K', type: 'Monitor' }
];

export default function StaffInspectionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  const [verifyTag, setVerifyTag] = useState('');
  const [verifiedAsset, setVerifiedAsset] = useState<Asset | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const [inspections] = useState([
    { id: 'INS-881', asset: 'Dell UltraSharp 27" (TAG-2099)', status: 'Pending Review', date: 'Today, 10:00 AM' },
    { id: 'INS-702', asset: 'MacBook Pro 14" (TAG-1045)', status: 'Approved', date: 'Oct 01, 2023' },
  ]);

  const requiredPhotos = verifiedAsset?.type === 'Laptop' 
    ? ['Top Side', 'Keyboard & Screen', 'Right Side', 'Left Side', 'Bottom Side']
    : ['Front/Top Side', 'Back Side'];

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const found = assignedAssets.find(a => a.id.toUpperCase() === verifyTag.toUpperCase());
    if (found) {
      setVerifiedAsset(found);
      setStep(2);
    } else {
      alert("Asset Tag not found in your assigned inventory! Try TAG-1045 or TAG-2099");
    }
  };

  const handlePhotoCapture = (label: string, file: File | undefined) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0);

        const dateText = `Captured: ${new Date().toLocaleString()}`;
        const fontSize = Math.max(30, img.width / 25);
        ctx.font = `bold ${fontSize}px Arial`;
        const padding = 20;
        const textWidth = ctx.measureText(dateText).width;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, img.height - (fontSize + padding * 2), textWidth + padding * 2, fontSize + padding * 2);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(dateText, padding, img.height - padding);

        const watermarkedImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setPhotos(prev => ({ ...prev, [label]: watermarkedImageBase64 }));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFinalSubmit = () => {
    alert("Inspection Submitted successfully! Sent to Admin for review.");
    setIsModalOpen(false);
    setStep(1);
    setVerifyTag('');
    setVerifiedAsset(null);
    setPhotos({});
    setNotes('');
  };

  const canSubmit = requiredPhotos.every(label => photos[label]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Asset Inspections</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Verify, document, and submit routine condition checks.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200 transition-all font-bold text-sm"
        >
          <Camera size={18} /> Start New Inspection
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-4 rounded-xl text-blue-500"><Clock size={24} /></div>
          <div><p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pending Review</p><p className="text-2xl font-black text-gray-900">1</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-50 p-4 rounded-xl text-green-500"><CheckCircle2 size={24} /></div>
          <div><p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Upcoming</p><p className="text-2xl font-black text-gray-900">1</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-50 p-4 rounded-xl text-red-500"><AlertTriangle size={24} /></div>
          <div><p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Overdue</p><p className="text-2xl font-black text-gray-900">0</p></div>
        </div>
      </div>

      {/* HISTORY TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <ClipboardCheck size={20} className="text-blue-500"/> Inspection History
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {inspections.map((ins) => (
            <div key={ins.id} className="p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:bg-gray-50 transition-colors">
              <div>
                <h3 className="font-bold text-gray-900">{ins.asset}</h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{ins.id}</span>
                  • {ins.date}
                </p>
              </div>
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  ins.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {ins.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INSPECTION MODAL / WIZARD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 relative">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h2 className="text-xl font-black text-gray-900">
                {step === 1 ? 'Step 1: Verify Asset' : 'Step 2: Condition & Capture'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* STEP 1: VERIFICATION */}
              {step === 1 && (
                <form onSubmit={handleVerify} className="space-y-6">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800">
                    <ShieldCheck className="shrink-0" />
                    <p className="text-sm font-semibold">Please enter the exact Asset Tag ID of the equipment you are inspecting to verify it is assigned to you.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Asset Tag ID</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                        required 
                        value={verifyTag}
                        onChange={(e) => setVerifyTag(e.target.value)}
                        placeholder="e.g., TAG-1045" 
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold" 
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md">
                    Verify & Continue
                  </button>
                </form>
              )}

              {/* STEP 2: CAPTURE & NOTES */}
              {step === 2 && verifiedAsset && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  
                  {/* Verified Info */}
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-green-600 uppercase">Verified Asset</p>
                      <p className="font-black text-gray-900 text-lg">{verifiedAsset.name}</p>
                    </div>
                    <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold">{verifiedAsset.id}</span>
                  </div>

                  {/* Notes Section */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Condition Notes</label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe any scratches, dents, or operational issues..." 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none h-24"
                    ></textarea>
                  </div>

                  {/* Photo Capture Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-bold text-gray-700">Live Photo Capture</label>
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                        Requires {requiredPhotos.length} photos
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {requiredPhotos.map((label) => (
                        <div key={label} className="relative group">
                          {photos[label] ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-green-500 shadow-sm">
                              {/* 2. Added rule to ignore Next.js strict Image warning for base64 canvas outputs */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photos[label]} alt={label} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="cursor-pointer text-white font-bold text-xs bg-black/50 px-3 py-2 rounded-lg hover:bg-black/70">
                                  Retake
                                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoCapture(label, e.target.files?.[0])} />
                                </label>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-[10px] font-bold py-1 text-center">
                                {label} ✓
                              </div>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-colors">
                              <Camera className="text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" size={24} />
                              <span className="text-xs font-bold text-gray-600 group-hover:text-blue-600 text-center px-2">{label}</span>
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoCapture(label, e.target.files?.[0])} />
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                      Back
                    </button>
                    <button 
                      onClick={handleFinalSubmit}
                      disabled={!canSubmit}
                      className={`flex-1 py-3 rounded-xl font-bold text-white transition-all shadow-md ${
                        canSubmit ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {canSubmit ? 'Submit Inspection to Admin' : 'Complete All Required Photos'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
