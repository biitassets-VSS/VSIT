'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ClipboardCheck, Clock, AlertTriangle, Search, 
  Camera, CheckCircle2, X, ShieldCheck, Aperture, Laptop, Monitor, Mouse,
  Eye, CameraOff, Calendar, FileSignature, AlertOctagon, ChevronLeft, ChevronRight, History
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
    return lastSaturday.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/'); 
  } catch(e) {
    return 'N/A';
  }
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Pending';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString; 
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
  } catch(e) {
    return dateString;
  }
};

export default function StaffInspectionsClient({ 
  initialAssets, 
  initialHistory, 
  staffName 
}: StaffInspectionsClientProps) {
  
  const [mounted, setMounted] = useState(false);
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

  // 🌟 SECURE LIGHTBOX STATE
  const [photoViewer, setPhotoViewer] = useState<{ isOpen: boolean; photos: string[]; title: string; currentIndex: number }>({
    isOpen: false, photos: [], title: '', currentIndex: 0
  });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  useEffect(() => {
    setMounted(true);
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
      status: 'Pending Review',
      date: new Date().toISOString(),
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
    if (type === 'Laptop') return <Laptop size={16} className="text-purple-600"/>;
    if (type === 'Monitor') return <Monitor size={16} className="text-purple-600"/>;
    return <Mouse size={16} className="text-purple-600"/>;
  };

  const getStatusConfig = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved') || s.includes('completed')) return { bg: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: <CheckCircle2 size={14} />, label: 'Approved' };
    if (s.includes('reject') || s.includes('not approved') || s.includes('refuse')) return { bg: 'bg-rose-50 text-rose-600 border-rose-200', icon: <AlertOctagon size={14} />, label: 'Refused / Rejected' };
    if (s.includes('re-inspection')) return { bg: 'bg-amber-50 text-amber-600 border-amber-200', icon: <AlertTriangle size={14} />, label: 'Re-Audit Required' };
    return { bg: 'bg-purple-50 text-purple-600 border-purple-200', icon: <Clock size={14} />, label: 'Pending Review' };
  };

  const filteredHistory = inspectionHistory.filter(insp => {
    const searchString = `${insp.assetName} ${insp.assetId} ${insp.status}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 animate-in fade-in duration-500 w-full select-none relative" onContextMenu={(e) => e.preventDefault()}>
        
        {/* 🌟 PREMIUM GLASS HEADER */}
        <div className="relative bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-orange-400/10 to-purple-500/10 blur-3xl -z-10 rounded-full" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-linear-to-tr from-purple-400/10 to-orange-500/10 blur-3xl -z-10 rounded-full" />
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <ClipboardCheck className="text-purple-600" /> Inspections & Audits
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Assigned to: <span className="font-bold text-purple-600">{staffName}</span>
            </p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/20 shrink-0 border border-white/20"
          >
            <Camera size={16} /> Start New Inspection
          </button>
        </div>

        {/* 🌟 GLASS DASHBOARD STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white/40 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-[0_8px_25px_rgba(0,0,0,0.02)] border border-white/60 flex items-center gap-4 group hover:border-purple-300 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <div className="bg-purple-50 p-4 rounded-2xl text-purple-500 shadow-inner group-hover:scale-110 transition-transform"><Clock size={24} /></div>
            <div><p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Pending Now</p><p className="text-2xl font-black text-slate-900">{pendingCount}</p></div>
          </div>
          <div className="bg-white/40 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-[0_8px_25px_rgba(0,0,0,0.02)] border border-white/60 flex items-center gap-4 group hover:border-emerald-300 transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500 shadow-inner group-hover:scale-110 transition-transform"><CheckCircle2 size={24} /></div>
            <div><p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Upcoming</p><p className="text-2xl font-black text-slate-900">{upcomingCount}</p></div>
          </div>
          <div className="bg-white/40 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-[0_8px_25px_rgba(0,0,0,0.02)] border border-white/60 flex items-center gap-4 group hover:border-rose-300 transition-all hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]">
            <div className="bg-rose-50 p-4 rounded-2xl text-rose-500 shadow-inner group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
            <div><p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Overdue</p><p className="text-2xl font-black text-slate-900">{overdueCount}</p></div>
          </div>
        </div>

        {/* 🌟 ASSIGNED ASSETS LIST */}
        <div className="bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-widest uppercase flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-slate-800"/> My Equipment
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
              <input 
                type="text" 
                placeholder="Search Tag ID or Name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl text-xs font-semibold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/10 transition-all shadow-inner placeholder:text-slate-400"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myAssets.length === 0 && <p className="col-span-2 p-8 text-center text-slate-500 text-sm font-medium">No assets currently assigned to you.</p>}
            {myAssets.filter(a => `${a.name} ${a.id}`.toLowerCase().includes(searchQuery.toLowerCase())).map((asset) => (
              <div key={asset.id} className="bg-white/40 backdrop-blur-xl rounded-3xl p-5 border border-white/60 shadow-[0_8px_25px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-purple-300 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className="bg-purple-100/80 p-3 rounded-xl shadow-sm border border-purple-200/50">{getAssetIcon(asset.type)}</div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">{asset.name}</h3>
                    <p className="text-[9px] font-black text-slate-500 mt-1 font-mono uppercase tracking-widest">{asset.id}</p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto">
                  {asset.inspectionStatus === 'Completed' ? (
                    <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 size={12}/> Done
                    </span>
                  ) : (
                    <>
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${
                        asset.inspectionStatus === 'Overdue' ? 'text-rose-500' : 'text-purple-500'
                      }`}>{asset.inspectionStatus}</p>
                      <button 
                        onClick={() => { setVerifyTag(asset.id); setIsModalOpen(true); }}
                        className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition-all shadow-md w-full sm:w-auto text-center cursor-pointer"
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
        <div className="bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative">
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-2.5">
              <History size={20} className="text-slate-800" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-widest uppercase">Inspection History</h2>
            </div>
            <span className="text-xs sm:text-sm font-black text-slate-500">{filteredHistory.length} Records</span>
          </div>
          
          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200/50 rounded-3xl bg-white/30 backdrop-blur-md flex flex-col items-center">
              <ShieldCheck size={44} className="text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Inspection Records</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">There are no historical audit logs found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {filteredHistory.map((insp, index) => {
                const statusConfig = getStatusConfig(insp.status);
                const isApproved = statusConfig.label === 'Approved';
                const isRejected = statusConfig.label === 'Refused / Rejected' || statusConfig.label === 'Re-Audit Required';
                
                const relatedAsset = myAssets.find(a => a.id === insp.assetId);
                const assignedDate = relatedAsset?.assignedDate;
                const agreementDate = relatedAsset?.agreementDate;
                const assetCategory = relatedAsset?.type || 'Laptop';
                
                const safePhotos = Object.values(insp.photos || {});

                return (
                  <div 
                    key={`${insp.id}-${index}`} 
                    className="group bg-white/40 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/60 shadow-[0_8px_25px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] relative overflow-hidden flex flex-col"
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 rounded-full opacity-20 transition-opacity duration-500 group-hover:opacity-40 pointer-events-none ${isApproved ? 'bg-emerald-400' : isRejected ? 'bg-rose-400' : 'bg-purple-400'}`} />

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-600 flex items-center justify-center shadow-xs shrink-0">
                          {getAssetIcon(assetCategory)}
                        </div>
                        <span className="line-clamp-1">{insp.assetName}</span>
                      </h3>
                      
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 shrink-0 ${statusConfig.bg}`}>
                        {statusConfig.icon} {statusConfig.label}
                      </span>
                    </div>

                    {/* 🌟 COMPACT GRID */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                      <div className="min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Tag ID</span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 wrap-break-word block">{insp.assetId}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Assigned</span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 block">{formatDate(assignedDate)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Agreement</span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 block">{formatDate(agreementDate)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Inspected</span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 block">{formatDate(insp.date)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Next Due</span>
                        <span className={`font-bold text-xs sm:text-sm block ${isApproved ? 'text-purple-700' : 'text-slate-500'}`}>
                          {isApproved ? calculateNextDueDate(insp.date, assetCategory) : 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border flex-1 backdrop-blur-xs shadow-inner mb-5 ${isRejected ? 'bg-rose-50/50 border-rose-200/50' : isApproved ? 'bg-emerald-50/50 border-emerald-200/50' : 'bg-slate-50/50 border-slate-200/50'}`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1 ${isRejected ? 'text-rose-600' : isApproved ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {isRejected ? <AlertOctagon size={12}/> : isApproved ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                        {isRejected ? 'Admin Rejection Reason' : isApproved ? 'Admin Approval Note' : 'Submitted Notes'}
                      </span>
                      <p className={`text-xs sm:text-sm font-semibold whitespace-pre-wrap wrap-break-word ${isRejected ? 'text-rose-900' : isApproved ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {insp.notes || 'No specific notes recorded for this transaction.'}
                      </p>
                    </div>

                    {/* 🌟 THUMBNAIL PHOTO GALLERY */}
                    <div className="pt-4 border-t border-slate-200/50 shrink-0 mt-auto">
                      {safePhotos.length > 0 ? (
                        <div className="flex flex-col gap-2.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <Eye size={12} /> Attached Evidence ({safePhotos.length})
                          </span>
                          <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                            {safePhotos.map((url, i) => (
                              <button 
                                key={i}
                                onClick={() => setPhotoViewer({ isOpen: true, photos: safePhotos, title: insp.assetName || 'Inspection', currentIndex: i })}
                                className="relative group w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-sm ring-1 ring-slate-200/60 transition-all hover:ring-purple-400 hover:shadow-md cursor-pointer"
                              >
                                <img 
                                  src={url} 
                                  alt={`Evidence ${i + 1}`} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                />
                                <div className="absolute inset-0 bg-purple-900/0 group-hover:bg-purple-900/40 transition-colors flex items-center justify-center backdrop-blur-[1px] opacity-0 group-hover:opacity-100">
                                  <Eye size={20} className="text-white drop-shadow-md" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="px-5 py-3 rounded-xl border border-dashed border-slate-300 bg-white/50 text-slate-400 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 justify-center w-full">
                          <CameraOff size={15} /> No Photos Attached
                        </div>
                      )}
                    </div>
                    
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 🌟 INSPECTION WIZARD MODAL (Upgraded to Glass) */}
      {isModalOpen && !isCameraActive && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-9999 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white/90 backdrop-blur-2xl rounded-4xl w-full max-w-3xl shadow-[0_16px_40px_rgba(0,0,0,0.2)] overflow-hidden my-8 border border-white/40">
            <div className="px-6 py-4 border-b border-slate-200/60 flex justify-between items-center bg-white/50 sticky top-0 z-10">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-widest">
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
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Asset Tag ID</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        required 
                        value={verifyTag}
                        onChange={(e) => setVerifyTag(e.target.value)}
                        placeholder="Try: TAG-1045 or TAG-2099" 
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-md focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none uppercase font-bold shadow-inner transition-all placeholder:text-slate-400 placeholder:normal-case" 
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-4 rounded-2xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 cursor-pointer uppercase tracking-widest text-xs">
                    Verify & Continue
                  </button>
                </form>
              )}

              {/* STEP 2 */}
              {step === 2 && verifiedAsset && (
                <div className="space-y-6">
                  <div className="bg-emerald-50/80 border border-emerald-200/60 p-4 rounded-2xl flex justify-between items-center shadow-sm backdrop-blur-sm">
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Verified Asset</p>
                      <p className="font-black text-slate-900 text-base sm:text-lg">{verifiedAsset.name}</p>
                    </div>
                    <span className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">{verifiedAsset.id}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Condition Notes</label>
                    <textarea 
                      value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe any scratches, dents, or software issues..." 
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-md focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none text-sm font-medium resize-none h-24 shadow-inner transition-all placeholder:text-slate-400"
                    ></textarea>
                  </div>

                  {/* PHOTO GRID */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                        <Camera size={16} className="text-purple-500" /> Live Capture Required
                      </label>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 px-2.5 py-1 rounded-md border border-purple-200/50">
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
                                <button onClick={() => openCamera(label)} className="text-white font-bold text-[10px] uppercase tracking-widest bg-purple-600 px-4 py-2 rounded-xl hover:bg-purple-700 shadow-lg cursor-pointer">
                                  Retake Live
                                </button>
                              </div>
                              <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-br-xl z-10 shadow-sm">
                                {label} ✓
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => openCamera(label)}
                              className="w-full flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 hover:bg-purple-50/50 hover:border-purple-400 transition-colors cursor-pointer group-hover:shadow-inner"
                            >
                              <Aperture className="text-slate-400 group-hover:text-purple-500 mb-2 transition-transform group-hover:scale-110" size={24} />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-purple-700 text-center px-2">Tap to capture<br/>{label}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                      Back
                    </button>
                    <button 
                      onClick={handleFinalSubmit}
                      disabled={!canSubmit}
                      className={`flex-1 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest text-white transition-all shadow-md cursor-pointer ${
                        canSubmit ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' : 'bg-slate-300 cursor-not-allowed opacity-70'
                      }`}
                    >
                      {canSubmit ? 'Submit Inspection' : 'Complete All Live Photos'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🌟 FULL-SCREEN LIVE CAMERA OVERLAY */}
      {isCameraActive && mounted && createPortal(
        <div className="fixed inset-0 bg-black z-100000 flex flex-col">
          <div className="p-4 flex justify-between items-center bg-linear-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
            <h3 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Capturing: {currentPhotoLabel}
            </h3>
            <button onClick={closeCamera} className="bg-white/20 hover:bg-rose-500 text-white p-2.5 rounded-full backdrop-blur-md transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-4 border-white/30 m-8 rounded-4xl pointer-events-none"></div>
          </div>

          <div className="h-32 bg-black flex items-center justify-center pb-8 pt-4">
            <button 
              onClick={capturePhoto} 
              className="h-16 w-16 bg-white rounded-full border-4 border-slate-400 hover:bg-slate-200 hover:border-slate-500 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)] cursor-pointer"
            >
              <div className="h-12 w-12 bg-white rounded-full border border-slate-200"></div>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 🌟 PORTAL: SECURE MODERN GALLERY LIGHTBOX (Escapes Stacking Context completely!) */}
      {mounted && photoViewer.isOpen && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 sm:p-8 select-none"
          style={{ zIndex: 2147483647 }} // Maximum z-index
          onContextMenu={(e) => e.preventDefault()} 
        >
          <div className={`w-full h-full max-w-6xl mx-auto flex flex-col transition-all duration-300 relative ${!isWindowFocused ? 'blur-3xl opacity-0 scale-95' : 'blur-0 opacity-100 scale-100'}`}>
            
            {/* Top Bar: Title & Close */}
            <div className="flex items-center justify-between w-full mb-4 sm:mb-6 shrink-0">
               <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full">
                 <ShieldCheck className="text-purple-400" size={18} />
                 <span className="text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest truncate max-w-50 sm:max-w-md">
                   {photoViewer.title} • {photoViewer.photos.length} Secure Images
                 </span>
               </div>
               <button 
                 onClick={() => setPhotoViewer({ isOpen: false, photos: [], title: '', currentIndex: 0 })} 
                 className="p-3 bg-white/10 hover:bg-rose-500 text-white rounded-full transition-colors border border-white/20 shadow-2xl cursor-pointer"
               >
                 <X size={20} />
               </button>
            </div>

            {!isWindowFocused && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white bg-slate-950/80 rounded-4xl">
                <CameraOff size={60} className="text-orange-500 mb-3 animate-pulse"/>
                <h2 className="font-black text-2xl tracking-widest uppercase text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-purple-500">Capture Blocked</h2>
                <p className="text-slate-400 mt-2 text-sm font-medium">Please return focus to this window to view secure evidence.</p>
              </div>
            )}
            
            {/* Main Image Frame (Constrained to prevent overflow) */}
            <div className="flex-1 w-full bg-black/40 border border-white/10 rounded-4xl relative overflow-hidden flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
               <img 
                  src={photoViewer.photos[photoViewer.currentIndex]} 
                  className="w-full h-full object-contain pointer-events-none drop-shadow-2xl p-2 sm:p-6" 
                  alt="Secure Evidence" 
               />
               <div className="absolute inset-0 z-10 bg-transparent" /> {/* Right click shield */}

               {/* Navigation Arrows */}
               {photoViewer.photos.length > 1 && (
                 <>
                   <button 
                      onClick={(e) => { e.stopPropagation(); setPhotoViewer(p => ({ ...p, currentIndex: p.currentIndex === 0 ? p.photos.length - 1 : p.currentIndex - 1 })) }} 
                      className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-black/50 hover:bg-purple-600 text-white rounded-full backdrop-blur-md border border-white/20 transition-all z-20 cursor-pointer"
                   >
                     <ChevronLeft size={24} />
                   </button>
                   <button 
                      onClick={(e) => { e.stopPropagation(); setPhotoViewer(p => ({ ...p, currentIndex: p.currentIndex === p.photos.length - 1 ? 0 : p.currentIndex + 1 })) }} 
                      className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-black/50 hover:bg-purple-600 text-white rounded-full backdrop-blur-md border border-white/20 transition-all z-20 cursor-pointer"
                   >
                     <ChevronRight size={24} />
                   </button>
                 </>
               )}
            </div>

            {/* Bottom Thumbnail Strip */}
            {photoViewer.photos.length > 1 && (
              <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3 overflow-x-auto w-full pb-2 custom-scrollbar shrink-0">
                {photoViewer.photos.map((url, i) => (
                   <button 
                     key={i}
                     onClick={() => setPhotoViewer(p => ({ ...p, currentIndex: i }))}
                     className={`relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 transition-all cursor-pointer border-2 ${i === photoViewer.currentIndex ? 'border-purple-500 scale-110 shadow-[0_0_20px_rgba(168,85,247,0.4)] z-10' : 'border-white/20 opacity-50 hover:opacity-100 hover:scale-105'}`}
                   >
                     <img src={url} className="w-full h-full object-cover pointer-events-none" alt={`Thumb ${i + 1}`} />
                   </button>
                ))}
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

    </>
  );
}