'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  Monitor, 
  Cpu, 
  Smartphone,
  Image as ImageIcon,
  Eye,
  X,
  CameraOff
} from 'lucide-react';

export default function StaffMyAssetsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 🌟 SECURE PHOTO VIEWER STATE
  const [photoViewer, setPhotoViewer] = useState<{ isOpen: boolean; photos: any[]; assetName: string }>({
    isOpen: false,
    photos: [],
    assetName: ''
  });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  useEffect(() => {
    loadMyAssets();

    // 🌟 ANTI-SCREENSHOT ENGINE: Blurs screen when Snipping Tool/Screenshot overlay is activated
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const loadMyAssets = async () => {
    setLoading(true);
    try {
      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) {
        router.replace('/');
        return;
      }

      let userEmail = '';
      try { 
        const parsed = JSON.parse(sessionStr); 
        userEmail = parsed.email;
      } catch (e) { 
        userEmail = sessionStr; 
      }

      const cleanEmail = userEmail?.toLowerCase().trim();

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!profile) throw new Error("Profile not found");
      setCurrentUser(profile);

      const [assetsRes, inspRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', profile.id).order('created_at', { ascending: false }),
        supabase.from('inspections').select('*').eq('inspected_by', profile.id).order('created_at', { ascending: false })
      ]);

      setAssets(assetsRes.data || []);
      setInspections(inspRes.data || []);
    } catch (error) {
      console.error("Failed to load assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNextDueDate = (lastInspectionDate: string, category: string = 'Laptop') => {
    if (!lastInspectionDate) return 'Requires Initial Audit';
    
    const baseDate = new Date(lastInspectionDate);
    const isLaptop = (category || '').toLowerCase().includes('laptop');
    const monthsToAdd = isLaptop ? 1 : 3; 
    
    const lastDayOfTargetMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToAdd + 1, 0);
    const lastSaturday = new Date(lastDayOfTargetMonth);
    while (lastSaturday.getDay() !== 6) {
      lastSaturday.setDate(lastSaturday.getDate() - 1);
    }
    
    return lastSaturday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); 
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'approved' || s === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 're-inspection') return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
    if (s === 'rejected') return 'bg-red-50 text-red-700 border-red-200';
    if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const getAssetIcon = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('laptop') || cat.includes('computer')) return <Laptop size={24} />;
    if (cat.includes('monitor') || cat.includes('display')) return <Monitor size={24} />;
    if (cat.includes('phone') || cat.includes('mobile')) return <Smartphone size={24} />;
    return <Cpu size={24} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Fetching Assigned Hardware...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900 antialiased relative">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex items-center gap-5">
          <button 
            onClick={() => router.push('/staff')} 
            className="p-3 hover:bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 cursor-pointer transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">My Hardware Assets</h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
              View your assigned devices and compliance audit schedule.
            </p>
          </div>
        </div>

        {/* ASSET LIST */}
        {assets.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-2">
              <Laptop size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-700 uppercase tracking-widest">No Assigned Hardware</h3>
            <p className="text-sm text-slate-500 font-medium">You currently have no active devices registered to your employee ID.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assets.map(asset => {
              const assetInspections = inspections.filter(i => i.asset_id === asset.id);
              const latestInspection = assetInspections[0]; 
              
              const liveStatus = latestInspection?.status || asset.inspection_status || 'Pending Audit';
              const lastAuditDate = latestInspection?.created_at || asset.last_inspection_date;
              
              // Normalize photos for viewing
              const photosArray = Array.isArray(latestInspection?.photos) 
                ? latestInspection.photos 
                : Object.values(latestInspection?.photos || {});

              return (
                <div key={asset.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  
                  {/* ASSET IDENTITY */}
                  <div className="p-6 border-b border-slate-100 flex items-start gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                      {getAssetIcon(asset.category)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-black text-slate-900 truncate" title={asset.name || asset.asset_name}>
                          {asset.name || asset.asset_name || 'Generic Device'}
                        </h3>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{asset.category || 'Hardware'}</p>
                      
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center text-xs">
                          <span className="w-12 font-bold text-slate-400 uppercase">Tag:</span>
                          <span className="font-mono font-black text-slate-700">{asset.asset_tag || 'N/A'}</span>
                        </div>
                        <div className="flex items-center text-xs">
                          <span className="w-12 font-bold text-slate-400 uppercase">S/N:</span>
                          <span className="font-mono font-black text-slate-700 truncate" title={asset.serial_number || asset.serial}>
                            {asset.serial_number || asset.serial || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* INSPECTION METRICS */}
                  <div className="p-6 bg-slate-50 flex-1 flex flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-slate-400"/> Compliance Status
                      </h4>
                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${getStatusBadge(liveStatus)}`}>
                        {liveStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Clock size={12} /> 
                          <span className="text-[9px] font-black uppercase tracking-widest">Last Audited</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {lastAuditDate ? new Date(lastAuditDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                        </span>
                      </div>
                      
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-1.5 text-blue-500 mb-1">
                          <Calendar size={12} /> 
                          <span className="text-[9px] font-black uppercase tracking-widest">Upcoming Due</span>
                        </div>
                        <span className="text-xs font-bold text-blue-900">
                          {calculateNextDueDate(lastAuditDate, asset.category)}
                        </span>
                      </div>
                    </div>
                    
                    {/* 🌟 VIEW PHOTOS BUTTON */}
                    {photosArray.length > 0 && (
                      <button 
                        onClick={() => setPhotoViewer({ isOpen: true, photos: photosArray, assetName: asset.name || 'Device' })}
                        className="mt-2 w-full py-3.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
                      >
                        <ImageIcon size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors"/> 
                        View Last Inspection Photos ({photosArray.length})
                      </button>
                    )}
                    
                    {liveStatus === 'Re-Inspection' && (
                      <div className="mt-2 p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-rose-800 leading-tight">
                          Admin requested a re-inspection. Please navigate to the dashboard to resubmit your photos.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 SECURE LIGHTBOX (NO SCREENSHOT, NO DOWNLOAD) */}
      {photoViewer.isOpen && (
        <div 
          // 1. Right Click globally blocked
          onContextMenu={(e) => { e.preventDefault(); return false; }} 
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[9999] flex flex-col items-center justify-center p-4 md:p-8 select-none touch-none"
        >
          {/* 2. Window Focus Check (Screenshot Blur) */}
          <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-100 ${!isWindowFocused ? 'blur-2xl opacity-50 scale-105' : 'blur-0 opacity-100'}`}>
            
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
              <div className="text-white">
                <h3 className="font-black text-lg">{photoViewer.assetName}</h3>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <ShieldCheck size={12}/> Secure Viewing Mode
                </p>
              </div>
              <button 
                onClick={() => setPhotoViewer({ isOpen: false, photos: [], assetName: '' })}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all cursor-pointer border border-white/20 backdrop-blur-sm"
              >
                <X size={20} />
              </button>
            </div>

            {!isWindowFocused && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-50 text-white drop-shadow-2xl">
                <CameraOff size={48} className="mb-4 text-rose-500" />
                <h2 className="text-2xl font-black uppercase tracking-widest">Screen Capture Blocked</h2>
              </div>
            )}
            
            <div className="w-full max-w-6xl overflow-x-auto flex gap-6 snap-x snap-mandatory px-4 pb-8 items-center scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {photoViewer.photos.map((url: string, idx: number) => (
                <div key={idx} className="relative shrink-0 w-[85vw] md:w-[600px] h-[60vh] md:h-[70vh] rounded-3xl overflow-hidden bg-black snap-center shadow-2xl border border-white/10">
                  
                  {/* 3. Transparent Overlay to intercept any clicks or drags */}
                  <div className="absolute inset-0 z-10 w-full h-full cursor-not-allowed" />
                  
                  {/* 4. The actual image locked down via CSS */}
                  <img 
                    src={url} 
                    alt="Inspection Evidence" 
                    draggable={false}
                    className="w-full h-full object-contain pointer-events-none select-none opacity-90"
                    style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                  />
                  
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/10">
                      Evidence {idx + 1} of {photoViewer.photos.length}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}