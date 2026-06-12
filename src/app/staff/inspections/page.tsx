'use client';

import React, { useState, useRef } from 'react';
import { 
  ClipboardCheck, Clock, AlertTriangle, Search, 
  Camera, CheckCircle2, X, ShieldCheck, Aperture, Laptop, Monitor, Mouse
} from 'lucide-react';

// --- TYPES ---
interface Asset {
  id: string;
  name: string;
  type: string;
  assignedTo: string;
  inspectionStatus: 'Pending' | 'Upcoming' | 'Overdue' | 'Completed';
  dueDate: string;
}

interface InspectionRecord {
  id: string;
  assetId: string;
  assetName: string;
  status: string;
  date: string;
  notes: string;
  // We store the watermarked photos here now!
  photos: Record<string, string>;
}

// --- MOCK DATABASE (Assigned by Admin) ---
const STAFF_NAME = "Lakhwinder Singh";

const initialAssignedAssets: Asset[] = [
  { id: 'TAG-1045', name: 'MacBook Pro 14" (M2)', type: 'Laptop', assignedTo: STAFF_NAME, inspectionStatus: 'Pending', dueDate: 'Today' },
  { id: 'TAG-2099', name: 'Dell UltraSharp 27" 4K', type: 'Monitor', assignedTo: STAFF_NAME, inspectionStatus: 'Overdue', dueDate: 'Oct 20, 2023' },
  { id: 'TAG-3011', name: 'Logitech MX Master 3', type: 'Accessory', assignedTo: STAFF_NAME, inspectionStatus: 'Upcoming', dueDate: 'Nov 15, 2023' }
];

export default function StaffInspectionsPage() {
  // Main Data States
  const [myAssets, setMyAssets] = useState<Asset[]>(initialAssignedAssets);
  const [inspectionHistory, setInspectionHistory] = useState<InspectionRecord[]>([]);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [verifyTag, setVerifyTag] = useState('');
  const [verifiedAsset, setVerifiedAsset] = useState<Asset | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});

  // Live Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentPhotoLabel, setCurrentPhotoLabel] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const requiredPhotos = verifiedAsset?.type === 'Laptop' 
    ? ['Top Side', 'Keyboard & Screen', 'Right Side', 'Left Side', 'Bottom Side']
    : ['Front/Top Side', 'Back Side'];

  // --- STATS CALCULATION ---
  const pendingCount = myAssets.filter(a => a.inspectionStatus === 'Pending').length;
  const upcomingCount = myAssets.filter(a => a.inspectionStatus === 'Upcoming').length;
  const overdueCount = myAssets.filter(a => a.inspectionStatus === 'Overdue').length;

  // --- HANDLERS ---
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const found = myAssets.find(a => a.id.toUpperCase() === verifyTag.toUpperCase());
    if (found) {
      setVerifiedAsset(found);
      setStep(2);
    } else {
      alert(`Asset Tag not found under ${STAFF_NAME}'s assignments! Check the list below.`);
    }
  };

  const openCamera = async (label: string) => {
    setCurrentPhotoLabel(label);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
      alert("Please allow camera access.");
      closeCamera();
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCurrentPhotoLabel(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !currentPhotoLabel) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark
    const dateText = `Captured: ${new Date().toLocaleString()}`;
    const fontSize = Math.max(24, canvas.width / 25);
    ctx.font = `bold ${fontSize}px Arial`;
    const padding = 15;
    const textWidth = ctx.measureText(dateText).width;
    const x = canvas.width - textWidth - (padding * 2) - 10;
    const y = canvas.height - fontSize - (padding * 2) - 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, textWidth + padding * 2, fontSize + padding * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(dateText, x + padding, y + fontSize + (padding / 2));

    setPhotos(prev => ({ ...prev, [currentPhotoLabel]: canvas.toDataURL('image/jpeg', 0.85) }));
    closeCamera();
  };

  const handleFinalSubmit = () => {
    if (!verifiedAsset) return;

    // 1. Create the new Record
    const newRecord: InspectionRecord = {
      id: `INS-${Math.floor(Math.random() * 9000) + 1000}`,
      assetId: verifiedAsset.id,
      assetName: verifiedAsset.name,
      status: 'Pending Admin Review',
      date: new Date().toLocaleString(),
      notes: notes,
      photos: photos
    };

    // 2. Add to History
    setInspectionHistory(prev => [newRecord, ...prev]);

    // 3. Update the Asset's status in the assigned list
    setMyAssets(prev => prev.map(asset => 
      asset.id === verifiedAsset.id ? { ...asset, inspectionStatus: 'Completed' } : asset
    ));

    alert("Inspection Submitted successfully! Sent to Admin for review.");
    
    // Reset Form
    setIsModalOpen(false);
    setStep(1);
    setVerifyTag('');
    setVerifiedAsset(null);
    setPhotos({});
    setNotes('');
  };

  const canSubmit = requiredPhotos.every(label => photos[label]);

  const getAssetIcon = (type: string) => {
    if (type === 'Laptop') return <Laptop size={18} className="text-gray-500"/>;
    if (type === 'Monitor') return <Monitor size={18} className="text-gray-500"/>;
    return <Mouse size={18} className="text-gray-500"/>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Asset Inspections</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Assigned to: <span className="font-bold text-blue-600">{STAFF_NAME}</span>
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200 transition-all font-bold text-sm"
        >
          <Camera size={18} /> Start New Inspection
        </button>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-orange-50 p-4 rounded-xl text-orange-500"><Clock size={24} /></div>
          <div><p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pending Now</p><p className="text-2xl font-black text-gray-900">{pendingCount}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-50 p-4 rounded-xl text-green-500"><CheckCircle2 size={24} /></div>
          <div><p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Upcoming</p><p className="text-2xl font-black text-gray-900">{upcomingCount}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-50 p-4 rounded-xl text-red-500"><AlertTriangle size={24} /></div>
          <div><p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Overdue</p><p className="text-2xl font-black text-gray-900">{overdueCount}</p></div>
        </div>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT: ASSIGNED ASSETS TO INSPECT */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <ShieldCheck size={20} className="text-blue-500"/> My Assigned Equipment
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {myAssets.length === 0 && <p className="p-6 text-gray-500 text-sm font-medium">No assets assigned to you.</p>}
            {myAssets.map((asset) => (
              <div key={asset.id} className="p-6 flex justify-between items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className="bg-gray-100 p-3 rounded-xl">{getAssetIcon(asset.type)}</div>
                  <div>
                    <h3 className="font-bold text-gray-900">{asset.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 inline-block px-2 py-0.5 rounded">{asset.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  {asset.inspectionStatus === 'Completed' ? (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={12}/> Done
                    </span>
                  ) : (
                    <>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                        asset.inspectionStatus === 'Overdue' ? 'text-red-500' : 'text-orange-500'
                      }`}>{asset.inspectionStatus}</p>
                      <button 
                        onClick={() => { setVerifyTag(asset.id); setIsModalOpen(true); }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                      >
                        Inspect Now
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: INSPECTION HISTORY RECORDS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-green-500"/> Submitted Records
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {inspectionHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <ClipboardCheck size={40} className="mx-auto mb-3 opacity-20"/>
                <p className="text-sm font-bold">No inspections submitted yet.</p>
                <p className="text-xs">Complete an inspection to see records here.</p>
              </div>
            ) : (
              inspectionHistory.map((record) => (
                <div key={record.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{record.assetName}</h3>
                      <p className="text-xs text-gray-500 mt-1">{record.date}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
                      {record.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {/* Show thumbnails of captured photos in history */}
                    {Object.entries(record.photos).map(([label, src]) => (
                      <div key={label} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={label} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* THE MODAL AND CAMERA CODE REMAINS EXACTLY THE SAME BELOW */}
      {/* INSPECTION WIZARD MODAL */}
      {isModalOpen && !isCameraActive && (
        <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h2 className="text-xl font-black text-gray-900">
                {step === 1 ? 'Step 1: Verify Tag' : 'Step 2: Live Condition Check'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* STEP 1 */}
              {step === 1 && (
                <form onSubmit={handleVerify} className="space-y-6">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800">
                    <ShieldCheck className="shrink-0" />
                    <p className="text-sm font-semibold">Verify the physical tag ID matches your assigned system records.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Asset Tag ID</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                        required 
                        value={verifyTag}
                        onChange={(e) => setVerifyTag(e.target.value)}
                        placeholder="Try: TAG-1045 or TAG-2099" 
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold" 
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md">
                    Verify & Continue
                  </button>
                </form>
              )}

              {/* STEP 2 */}
              {step === 2 && verifiedAsset && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-green-600 uppercase">Verified Asset</p>
                      <p className="font-black text-gray-900 text-lg">{verifiedAsset.name}</p>
                    </div>
                    <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold">{verifiedAsset.id}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Condition Notes</label>
                    <textarea 
                      value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe any scratches, dents, or software issues..." 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none h-24"
                    ></textarea>
                  </div>

                  {/* PHOTO GRID */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Camera size={18} className="text-red-500" /> Live Capture Required
                      </label>
                      <span className="text-xs font-bold bg-red-50 text-red-600 px-2 py-1 rounded-md">
                        {requiredPhotos.length} photos needed
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {requiredPhotos.map((label) => (
                        <div key={label} className="relative group">
                          {photos[label] ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-green-500 shadow-sm bg-black">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photos[label]} alt={label} className="w-full h-full object-contain" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => openCamera(label)} className="text-white font-bold text-xs bg-red-600 px-3 py-2 rounded-lg hover:bg-red-700 shadow-md">
                                  Retake Live
                                </button>
                              </div>
                              <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-10">
                                {label} ✓
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => openCamera(label)}
                              className="w-full flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-red-300 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-colors"
                            >
                              <Aperture className="text-red-400 mb-2" size={24} />
                              <span className="text-xs font-bold text-red-700 text-center px-2">Tap to capture<br/>{label}</span>
                            </button>
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
                      {canSubmit ? 'Submit Inspection' : 'Complete All Live Photos'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN LIVE CAMERA OVERLAY */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
            <h3 className="text-white font-bold text-lg drop-shadow-md">Capturing: {currentPhotoLabel}</h3>
            <button onClick={closeCamera} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-md transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-[4px] border-white/30 m-8 rounded-3xl pointer-events-none"></div>
          </div>

          <div className="h-32 bg-black flex items-center justify-center pb-8 pt-4">
            <button 
              onClick={capturePhoto} 
              className="h-16 w-16 bg-white rounded-full border-4 border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-all flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <div className="h-12 w-12 bg-white rounded-full border border-gray-200"></div>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
