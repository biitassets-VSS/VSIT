'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, 
  ClipboardCheck, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  Image as ImageIcon,
  Eye,
  X,
  CameraOff,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Laptop
} from 'lucide-react';

export default function StaffInspectionHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  
  // 🌟 SECURE PHOTO VIEWER STATE
  const [photoViewer, setPhotoViewer] = useState<{ isOpen: boolean; photos: any[]; title: string }>({
    isOpen: false,
    photos: [],
    title: ''
  });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  useEffect(() => {
    loadInspectionHistory();

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

  const loadInspectionHistory = async () => {
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

      // Fetch Inspections and Assets to map the names correctly
      const [inspRes, assetsRes] = await Promise.all([
        supabase.from('inspections').select('*').eq('inspected_by', profile.id).order('created_at', { ascending: false }),
        supabase.from('assets').select('*').eq('assigned_to', profile.id)
      ]);

      const rawInspections = inspRes.data || [];
      const assetsData = assetsRes.data || [];

      // Map asset names to the inspection logs
      const compiledHistory = rawInspections.map(insp => {
        const matchedAsset = assetsData.find(a => String(a.id) === String(insp.asset_id)) || {};
        return {
          ...insp,
          asset_name: matchedAsset.name || matchedAsset.asset_name || 'Generic Device',
          asset_tag: matchedAsset.asset_tag || 'NO-TAG',
          category: matchedAsset.category || 'Hardware'
        };
      });

      setInspections(compiledHistory);
    } catch (error) {
      console.error("Failed to load inspection history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'approved' || s === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 're-inspection') return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
    if (s === 'rejected') return 'bg-red-50 text-red-700 border-red-200';
    if (s === 'pending' || s === 'pending review') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'approved' || s === 'completed') return <CheckCircle2 size={16} className="text-emerald-600" />;
    if (s === 're-inspection') return <RefreshCw size={16} className="text-rose-600" />;
    if (s === 'rejected') return <XCircle size={16} className="text-red-600" />;
    return <Clock size={16} className="text-amber-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Fetching Inspection Logs...</p>
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Inspection History</h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
              Review your past device audits and administrative verdicts.
            </p>
          </div>
        </div>

        {/* INSPECTION LIST */}
        {inspections.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-2">
              <ClipboardCheck size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-700 uppercase tracking-widest">No History Found</h3>
            <p className="text-sm text-slate-500 font-medium">You have not submitted any hardware inspections yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {inspections.map(insp => {
              const liveStatus = insp.status || 'Pending';
              
              // Normalize photos for viewing
              const photosArray = Array.isArray(insp.photos) 
                ? insp.photos 
                : Object.values(insp.photos || {});

              return (
                <div key={insp.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col md:flex-row">
                  
                  {/* LEFT: Identity & Info */}
                  <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100 md:w-1/3 flex flex-col justify-center bg-slate-50/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                        <Laptop size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 truncate" title={insp.asset_name}>
                          {insp.asset_name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Tag: {insp.asset_tag}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-500">Submitted:</span>
                        <span className="font-black text-slate-800">{new Date(insp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Status & Evidence */}
                  <div className="p-6 md:w-2/3 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Adjudication Status</h4>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border ${getStatusBadge(liveStatus)}`}>
                          {getStatusIcon(liveStatus)}
                          {liveStatus === 'Pending' ? 'Awaiting Review' : liveStatus}
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="font-bold text-slate-900 block mb-1">Your Condition Note:</span>
                        <span className="italic">"{insp.notes || 'No notes provided.'}"</span>
                      </div>

                      {insp.admin_remarks && (
                        <div className="mt-3 text-xs text-rose-900 bg-rose-50 p-4 rounded-2xl border border-rose-200">
                          <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">Admin Remarks:</span>
                          <span className="font-medium">"{insp.admin_remarks}"</span>
                        </div>
                      )}
                    </div>

                    {/* 🌟 VIEW PHOTOS BUTTON */}
                    {photosArray.length > 0 ? (
                      <button 
                        onClick={() => setPhotoViewer({ isOpen: true, photos: photosArray, title: `${insp.asset_name} - ${new Date(insp.created_at).toLocaleDateString('en-IN')}` })}
                        className="w-full py-3.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group mt-2"
                      >
                        <ImageIcon size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors"/> 
                        View Secured Evidence ({photosArray.length})
                      </button>
                    ) : (
                      <div className="w-full py-3 border border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-center gap-2 mt-2">
                        <AlertTriangle size={14} /> No Photos Attached
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 SECURE LIGHTBOX (NO SCREENSHOT, NO DOWNLOAD, NO RIGHT-CLICK) */}
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
                <h3 className="font-black text-lg">{photoViewer.title}</h3>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <ShieldCheck size={12}/> Secure Viewing Mode
                </p>
              </div>
              <button 
                onClick={() => setPhotoViewer({ isOpen: false, photos: [], title: '' })}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all cursor-pointer border border-white/20 backdrop-blur-sm"
              >
                <X size={20} />
              </button>
            </div>

            {!isWindowFocused && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-50 text-white drop-shadow-2xl">
                <CameraOff size={48} className="mb-4 text-rose-500" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-center">Screen Capture Blocked<br/><span className="text-sm font-medium text-slate-300 mt-2 block tracking-normal normal-case">Please return to the window to view the image.</span></h2>
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