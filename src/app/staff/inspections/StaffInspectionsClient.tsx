'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ClipboardCheck, Clock, AlertTriangle, Search, 
  Camera, CheckCircle2, X, ShieldCheck, Aperture, Laptop, Monitor, Mouse,
  Eye, CameraOff, Calendar, FileSignature, XOctagon
} from 'lucide-react';

// --- TYPES ---
interface Asset {
  id: string;
  name: string;
  type: string;
  assignedTo: string;
  inspectionStatus: 'Pending' | 'Upcoming' | 'Overdue' | 'Completed';
  dueDate: string;
  assignedDate?: string;
  agreementDate?: string;
}

interface InspectionRecord {
  id: string;
  assetId: string;
  assetName: string;
  status: string;
  date: string;
  notes: string;
  photos: Record<string, string>;
}

interface StaffInspectionsClientProps {
  initialAssets: Asset[];
  initialHistory: InspectionRecord[];
  staffName: string;
}

// 🌟 DYNAMIC DUE DATE CALCULATOR
const calculateNextDueDate = (lastInspectionDate: string, category: string = 'Laptop') => {
  if (!lastInspectionDate || lastInspectionDate === 'Pending / N/A') return 'N/A';
  try {
    const baseDate = new Date(lastInspectionDate);
    if (isNaN(baseDate.getTime())) return 'N/A';
    const isLaptop = (category || '').toLowerCase().includes('laptop');
    const monthsToAdd = isLaptop ? 1 : 3; 
    const targetYear = baseDate.getFullYear();
    const targetMonth = baseDate.getMonth() + monthsToAdd;
    const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0);
    const lastSaturday = new Date(lastDayOfTargetMonth);
    while (lastSaturday.getDay() !== 6) { lastSaturday.setDate(lastSaturday.getDate() - 1); }
    return lastSaturday.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); 
  } catch(e) {
    return 'N/A';
  }
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Pending / N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString; // Fallback if already formatted
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch(e) {
    return dateString;
  }
};

export default function StaffInspectionsClient({ 
  initialAssets, 
  initialHistory, 
  staffName 
}: StaffInspectionsClientProps) {
  
  // Main Data States
  const [myAssets, setMyAssets] = useState<Asset[]>(initialAssets);
  const [inspectionHistory, setInspectionHistory] = useState<InspectionRecord[]>(initialHistory);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Secure Lightbox State
  const [photoViewer, setPhotoViewer] = useState<{ isOpen: boolean; photos: string[]; title: string }>({
    isOpen: false, photos: [], title: ''
  });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  // Anti-Screenshot Listener
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => { 
      window.removeEventListener('focus', handleFocus); 
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const requiredPhotos = verifiedAsset?.type === 'Laptop' 
    ? ['Top Side', 'Keyboard & Screen', 'Right Side', 'Left Side', 'Bottom Side']
    : ['Front/Top Side', 'Back Side'];

  // Stats Calculation
  const pendingCount = myAssets.filter(a => a.inspectionStatus === 'Pending').length;
  const upcomingCount = myAssets.filter(a => a.inspectionStatus === 'Upcoming').length;
  const overdueCount = myAssets.filter(a => a.inspectionStatus === 'Overdue').length;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const found = myAssets.find(a => a.id.toUpperCase() === verifyTag.toUpperCase());
    if (found) {
      setVerifiedAsset(found);
      setStep(2);
    } else {
      alert(`Asset Tag not found under ${staffName}'s assignments! Check the list below.`);
    }
  };

  const openCamera = async (label: string) => {
    setCurrentPhotoLabel(label);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' } }, 
        audio: false 
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; }
      }, 50);
    } catch (err) {
      alert("Could not access camera. Please check device permissions.");
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

  const handleFinalSubmit = async () => {
    if (!verifiedAsset) return;

    const newRecord: InspectionRecord = {
      id: `INS-${Math.floor(Math.random() * 9000) + 1000}`, 
      assetId: verifiedAsset.id,
      assetName: verifiedAsset.name,
      status: 'Pending Admin Review',
      date: new Date().toLocaleString(),
      notes: notes,
      photos: photos
    };

    setInspectionHistory(prev => [newRecord, ...prev]);
    setMyAssets(prev => prev.map(asset => 
      asset.id === verifiedAsset.id ? { ...asset, inspectionStatus: 'Completed' } : asset
    ));

    alert("Inspection Submitted successfully! Sent to Admin for review.");
    setIsModalOpen(false); setStep(1); setVerifyTag(''); setVerifiedAsset(null); setPhotos({}); setNotes('');
  };

  const canSubmit = requiredPhotos.every(label => photos[label]);

  const getAssetIcon = (type: string) => {
    if (type === 'Laptop') return <Laptop size={18} className="text-orange-500"/>;
    if (type === 'Monitor') return <Monitor size={18} className="text-purple-500"/>;
    return <Mouse size={18} className="text-slate-500"/>;
  };

  const getStatusConfig = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved')) return { bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-700', icon: <CheckCircle2 size={14} />, label: 'Approved' };
    if (s.includes('reject') || s.includes('not approved') || s.includes('refuse')) return { bg: 'bg-rose-50/80 border-rose-200 text-rose-700', icon: <XOctagon size={14} />, label: 'Refused / Rejected' };
    if (s.includes('re-inspection')) return { bg: 'bg-amber-50/80 border-amber-200 text-amber-700', icon: <AlertTriangle size={14} />, label: 'Re-Audit Required' };
    return { bg: 'bg-purple-50/80 border-purple-200 text-purple-700', icon: <Clock size={14} />, label: 'Pending Review' };
  };

  const filteredHistory = inspectionHistory.filter(insp => {
    const searchString = `${insp.assetName} ${insp.assetId} ${insp.status}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10 select-none relative" onContextMenu={(e) => e.preventDefault()}>
      
      {/* 🌟 PREMIUM GLASS HEADER */}
      <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-orange-400/10 to-purple-500/10 blur-3xl -z-10 rounded-full" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-linear-to-tr from-purple-400/10 to-orange-500/10 blur-3xl -z-10 rounded-full" />
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="text-orange-500" /> Audit Ledger
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Assigned to: <span className="font-bold text-purple-600">{staffName}</span>
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-orange-500 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-orange-500/20 shrink-0 border border-white/20"
        >
          <Camera size={16} /> Start New Inspection
        </button>
      </div>

      {/* 🌟 GLASS DASHBOARD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/70 flex items-center gap-4 group hover:border-purple-200 transition-colors">
          <div className="bg-linear-to-br from-orange-50 to-orange-100 p-4 rounded-2xl text-orange-500 shadow-inner group-hover:scale-110 transition-transform"><Clock size={24} /></div>
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pending Now</p><p className="text-2xl font-black text-slate-900">{pendingCount}</p></div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/70 flex items-center gap-4 group hover:border-purple-200 transition-colors">
          <div className="bg-linear-to-br from-emerald-50 to-emerald-100 p-4 rounded-2xl text-emerald-500 shadow-inner group-hover:scale-110 transition-transform"><CheckCircle2 size={24} /></div>
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Upcoming</p><p className="text-2xl font-black text-slate-900">{upcomingCount}</p></div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/70 flex items-center gap-4 group hover:border-purple-200 transition-colors">
          <div className="bg-linear-to-br from-rose-50 to-rose-100 p-4 rounded-2xl text-rose-500 shadow-inner group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Overdue</p><p className="text-2xl font-black text-slate-900">{overdueCount}</p></div>
        </div>
      </div>

      {/* 🌟 ASSIGNED ASSETS LIST */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/70 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck size={20} className="text-purple-500"/> My Assigned Equipment
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Tag ID or Name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-xl text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 transition-all shadow-inner"
            />
          </div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {myAssets.length === 0 && <p className="p-8 text-center text-slate-500 text-sm font-medium">No assets currently assigned to you.</p>}
          {myAssets.filter(a => `${a.name} ${a.id}`.toLowerCase().includes(searchQuery.toLowerCase())).map((asset) => (
            <div key={asset.id} className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-purple-50/30 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="bg-slate-100/80 p-3 rounded-2xl shadow-inner">{getAssetIcon(asset.type)}</div>
                <div>
                  <h3 className="font-bold text-slate-900">{asset.name}</h3>
                  <p className="text-[10px] font-black text-slate-500 mt-1 font-mono bg-slate-100 inline-block px-2.5 py-1 rounded-md border border-slate-200/50 shadow-sm">{asset.id}</p>
                </div>
              </div>
              <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto">
                {asset.inspectionStatus === 'Completed' ? (
                  <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 size={12}/> Done
                  </span>
                ) : (
                  <>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                      asset.inspectionStatus === 'Overdue' ? 'text-rose-500' : 'text-orange-500'
                    }`}>{asset.inspectionStatus}</p>
                    <button 
                      onClick={() => { setVerifyTag(asset.id); setIsModalOpen(true); }}
                      className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition-all shadow-md"
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

      {/* 🌟 AUDIT LEDGER (Advanced Grid View) */}
      <div className="pt-4">
        <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 px-2">
          <ClipboardCheck className="text-orange-500" /> Submitted Inspection Records
        </h2>
        
        {filteredHistory.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200/60 py-20 text-center flex flex-col items-center shadow-sm">
            <ShieldCheck size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">No inspection records found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredHistory.map((insp, index) => {
              const statusConfig = getStatusConfig(insp.status);
              const isApproved = statusConfig.label === 'Approved';
              const isRejected = statusConfig.label === 'Refused / Rejected' || statusConfig.label === 'Re-Audit Required';
              
              // Find related asset data for dates
              const relatedAsset = myAssets.find(a => a.id === insp.assetId);
              const assignedDate = relatedAsset?.assignedDate;
              const agreementDate = relatedAsset?.agreementDate;
              const assetCategory = relatedAsset?.type || 'Laptop';
              
              const safePhotos = Object.values(insp.photos || {});

              return (
                <div key={`${insp.id}-${index}`} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col hover:border-purple-300/60 hover:shadow-lg transition-all group relative">
                  
                  {/* Subtle Background Glow */}
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 rounded-full opacity-20 transition-opacity group-hover:opacity-40 ${isApproved ? 'bg-emerald-400' : isRejected ? 'bg-rose-400' : 'bg-purple-400'}`} />

                  {/* TOP HEADER */}
                  <div className="p-5 border-b border-slate-100/50 flex justify-between items-start bg-slate-50/30">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1 flex items-center gap-2">
                        {getAssetIcon(assetCategory)} {insp.assetName}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-[10px] font-black bg-white text-slate-600 px-2.5 py-1 rounded-md border border-slate-200/80 shadow-sm">
                          TAG: {insp.assetId}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-sm backdrop-blur-sm ${statusConfig.bg}`}>
                      {statusConfig.icon} {statusConfig.label}
                    </span>
                  </div>

                  {/* MIDDLE: Timestamps & Details */}
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    {/* Key Dates Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white/60 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><Calendar size={14}/></div>
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Assigned On</span>
                          <span className="font-bold text-xs text-slate-800">{formatDate(assignedDate)}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/60 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><FileSignature size={14}/></div>
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Agreement Signed</span>
                          <span className="font-bold text-xs text-slate-800">{formatDate(agreementDate)}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-200/50 text-slate-600 flex items-center justify-center shrink-0"><ShieldCheck size={14}/></div>
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Inspected On</span>
                          <span className="font-bold text-xs text-slate-800">{formatDate(insp.date)}</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl border shadow-xs flex items-center gap-3 ${isApproved ? 'bg-purple-50/50 border-purple-100' : 'bg-slate-50/50 border-slate-100'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isApproved ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/50 text-slate-500'}`}><Clock size={14}/></div>
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Next Due Date</span>
                          <span className={`font-bold text-xs ${isApproved ? 'text-purple-700' : 'text-slate-500'}`}>
                            {isApproved ? calculateNextDueDate(insp.date, assetCategory) : 'Pending Apprvl'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Feedback Block */}
                    <div className={`p-4 rounded-2xl border flex-1 backdrop-blur-sm shadow-inner ${isRejected ? 'bg-rose-50/50 border-rose-200' : isApproved ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/50 border-slate-200'}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2 opacity-60">
                        {isRejected ? <XOctagon size={12}/> : isApproved ? <CheckCircle2 size={12}/> : <ClipboardCheck size={12}/>}
                        {isRejected ? 'Admin Rejection Reason' : isApproved ? 'Admin Approval Note' : 'Submitted Notes'}
                      </span>
                      <p className={`text-sm font-semibold whitespace-pre-wrap ${isRejected ? 'text-rose-900' : isApproved ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {insp.notes || 'No specific notes recorded.'}
                      </p>
                    </div>
                  </div>

                  {/* BOTTOM: Evidence Button */}
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100/50 shrink-0">
                    {safePhotos.length > 0 ? (
                      <button 
                        onClick={() => setPhotoViewer({ isOpen: true, photos: safePhotos, title: insp.assetName || 'Inspection' })}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-linear-to-r from-slate-800 to-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all cursor-pointer shadow-md"
                      >
                        <Eye size={16} /> View Encrypted Evidence ({safePhotos.length})
                      </button>
                    ) : (
                      <div className="w-full p-3 rounded-xl border border-dashed border-slate-300 bg-white/50 text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <CameraOff size={14} /> No Photos Attached
                      </div>
                    )}
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 INSPECTION WIZARD MODAL */}
      {isModalOpen && !isCameraActive && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl w-full max-w-3xl shadow-[0_16px_40px_rgba(0,0,0,0.2)] overflow-hidden my-8 border border-white/40">
            <div className="px-6 py-4 border-b border-slate-100/50 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <h2 className="text-xl font-black text-slate-900">
                {step === 1 ? 'Step 1: Verify Tag' : 'Step 2: Live Condition Check'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* STEP 1 */}
              {step === 1 && (
                <form onSubmit={handleVerify} className="space-y-6">
                  <div className="bg-purple-50/80 border border-purple-200/60 p-4 rounded-2xl flex gap-3 text-purple-800 shadow-sm backdrop-blur-sm">
                    <ShieldCheck className="shrink-0" />
                    <p className="text-sm font-semibold">Verify the physical tag ID matches your assigned system records.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Asset Tag ID</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        required 
                        value={verifyTag}
                        onChange={(e) => setVerifyTag(e.target.value)}
                        placeholder="Try: TAG-1045 or TAG-2099" 
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none uppercase font-bold shadow-inner transition-all" 
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3.5 rounded-xl font-bold text-white bg-linear-to-r from-orange-500 to-purple-600 hover:opacity-90 transition-all shadow-lg shadow-orange-500/20 cursor-pointer">
                    Verify & Continue
                  </button>
                </form>
              )}

              {/* STEP 2 */}
              {step === 2 && verifiedAsset && (
                <div className="space-y-6">
                  <div className="bg-emerald-50/80 border border-emerald-200/60 p-4 rounded-2xl flex justify-between items-center shadow-sm backdrop-blur-sm">
                    <div>
                      <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Verified Asset</p>
                      <p className="font-black text-slate-900 text-lg">{verifiedAsset.name}</p>
                    </div>
                    <span className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">{verifiedAsset.id}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Condition Notes</label>
                    <textarea 
                      value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe any scratches, dents, or software issues..." 
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium resize-none h-24 shadow-inner transition-all"
                    ></textarea>
                  </div>

                  {/* PHOTO GRID */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Camera size={18} className="text-orange-500" /> Live Capture Required
                      </label>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 px-2.5 py-1 rounded-md border border-orange-200/50">
                        {requiredPhotos.length} photos needed
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {requiredPhotos.map((label) => (
                        <div key={label} className="relative group">
                          {photos[label] ? (
                            <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-sm bg-black">
                              <img src={photos[label]} alt={label} className="w-full h-full object-contain" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <button onClick={() => openCamera(label)} className="text-white font-bold text-xs bg-orange-500 px-4 py-2 rounded-xl hover:bg-orange-600 shadow-lg cursor-pointer">
                                  Retake Live
                                </button>
                              </div>
                              <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-br-xl z-10 shadow-sm">
                                {label} ✓
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => openCamera(label)}
                              className="w-full flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-orange-300/60 bg-orange-50/30 hover:bg-orange-50/80 hover:border-orange-400 transition-colors cursor-pointer group-hover:shadow-inner"
                            >
                              <Aperture className="text-orange-400 mb-2 transition-transform group-hover:scale-110" size={24} />
                              <span className="text-xs font-bold text-orange-700 text-center px-2">Tap to capture<br/>{label}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100/50 flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="px-6 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                      Back
                    </button>
                    <button 
                      onClick={handleFinalSubmit}
                      disabled={!canSubmit}
                      className={`flex-1 py-3.5 rounded-xl font-bold text-white transition-all shadow-md cursor-pointer ${
                        canSubmit ? 'bg-linear-to-r from-emerald-500 to-emerald-600 hover:opacity-90 shadow-emerald-500/20' : 'bg-slate-300 cursor-not-allowed opacity-70'
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

      {/* 🌟 FULL-SCREEN LIVE CAMERA OVERLAY */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black z-100 flex flex-col">
          <div className="p-4 flex justify-between items-center bg-linear-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
            <h3 className="text-white font-bold text-lg drop-shadow-md">Capturing: {currentPhotoLabel}</h3>
            <button onClick={closeCamera} className="bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full backdrop-blur-md transition-colors cursor-pointer">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-4 border-white/30 m-8 rounded-3xl pointer-events-none"></div>
          </div>

          <div className="h-32 bg-black flex items-center justify-center pb-8 pt-4">
            <button 
              onClick={capturePhoto} 
              className="h-16 w-16 bg-white rounded-full border-4 border-slate-400 hover:bg-slate-200 hover:border-slate-500 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)] cursor-pointer"
            >
              <div className="h-12 w-12 bg-white rounded-full border border-slate-200"></div>
            </button>
          </div>
        </div>
      )}

      {/* 🌟 SECURE LIGHTBOX (Anti-Screenshot/Download Engine) */}
      {photoViewer.isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-9999 flex flex-col items-center justify-center p-4 select-none"
          onContextMenu={(e) => e.preventDefault()} 
        >
          <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-300 ${!isWindowFocused ? 'blur-3xl opacity-0 scale-95' : 'blur-0 opacity-100 scale-100'}`}>
            <button onClick={() => setPhotoViewer({ isOpen: false, photos: [], title: '' })} className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-rose-500 text-white rounded-full transition-colors cursor-pointer z-10000 border border-white/20 shadow-xl"><X size={24}/></button>
            
            {!isWindowFocused && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white bg-slate-950">
                <CameraOff size={64} className="text-orange-500 mb-4 animate-pulse"/>
                <h2 className="font-black text-2xl tracking-widest uppercase text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-purple-500">Capture Blocked</h2>
                <p className="text-slate-400 mt-2 font-medium">Please return focus to this window to view secure evidence.</p>
              </div>
            )}
            
            <div className="flex gap-6 overflow-x-auto max-w-full w-full h-[80vh] items-center px-4 md:px-12 snap-x custom-scrollbar">
              {photoViewer.photos.map((url, i) => (
                <div key={i} className="relative shrink-0 snap-center h-full flex items-center justify-center pointer-events-none">
                  <img 
                    src={url} 
                    alt="Secure Evidence" 
                    draggable={false} 
                    className="max-h-full max-w-full rounded-2xl pointer-events-none select-none border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
                    style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
                  />
                  <div className="absolute inset-0 z-10 bg-transparent"></div>
                </div>
              ))}
            </div>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10 text-white text-[10px] font-black tracking-widest uppercase shadow-2xl">
              {photoViewer.photos.length} Secure Images • Do Not Distribute
            </div>
          </div>
        </div>
      )}

    </div>
  );
}