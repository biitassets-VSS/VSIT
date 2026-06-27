'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ClipboardCheck, Loader2, AlertTriangle, Eye, X, CameraOff, ShieldCheck } from 'lucide-react';

export default function StaffInspectionsPage() {
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  
  // 🌟 SECURE LIGHTBOX STATE
  const [photoViewer, setPhotoViewer] = useState<{ isOpen: boolean; photos: string[]; title: string }>({
    isOpen: false, photos: [], title: ''
  });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  const fetchInspections = async () => {
    const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    if (!sessionStr) return;
    
    let email = sessionStr;
    try { email = JSON.parse(sessionStr).email; } catch(e) {}
    const cleanEmail = email?.toLowerCase().trim();

    const { data: inspData } = await supabase
      .from('inspections')
      .select('*, assets(*)') 
      .ilike('user_email', cleanEmail)
      .order('created_at', { ascending: false });

    if (inspData) setInspections(inspData);
    setLoading(false);
  };

  useEffect(() => {
    fetchInspections();
    
    // 🌟 ANTI-SCREENSHOT ENGINE
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    const sub = supabase.channel('staff_insp_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, fetchInspections)
      .subscribe();
      
    return () => { 
      supabase.removeChannel(sub);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const getBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'rejected' || s === 'not approved') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s === 're-inspection') return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 text-amber-600 animate-spin" /></div>;

  return (
    <div className="space-y-6" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit History</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Review the compliance and condition history of your devices.</p>
        </div>
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><ClipboardCheck size={24}/></div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {inspections.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-sm">No inspections have been submitted yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {inspections.map(insp => {
              const asset = insp.assets || {};
              let safePhotos: string[] = [];
              try {
                if (Array.isArray(insp.photos)) safePhotos = insp.photos;
                else if (typeof insp.photos === 'string') safePhotos = JSON.parse(insp.photos);
              } catch (e) {}
              
              return (
                <div key={insp.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-slate-900 text-lg">{asset.name || 'Unknown Device'}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getBadge(insp.status)}`}>{insp.status || 'Pending'}</span>
                      </div>
                      <p className="text-sm text-slate-600">Condition: <strong>{insp.condition}</strong></p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Audit Date</p>
                      <p className="text-sm font-bold text-slate-900">{new Date(insp.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Photographic Evidence ({safePhotos.length})</h4>
                    {safePhotos.length > 0 ? (
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setPhotoViewer({ isOpen: true, photos: safePhotos, title: asset.name || 'Inspection' })}
                          className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                        >
                          <Eye size={16} /> View Secure Photos ({safePhotos.length})
                        </button>
                      </div>
                    ) : <p className="text-xs text-slate-400">No photos available.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 SECURE LIGHTBOX */}
      {photoViewer.isOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[9999] flex flex-col items-center justify-center p-4">
          <div className={`w-full h-full flex flex-col items-center justify-center transition-all ${!isWindowFocused ? 'blur-2xl opacity-50' : 'blur-0'}`}>
            <button onClick={() => setPhotoViewer({ isOpen: false, photos: [], title: '' })} className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full"><X size={24}/></button>
            
            {!isWindowFocused && <div className="absolute z-50 text-white text-center"><CameraOff size={48} className="mx-auto"/><p className="font-black mt-2">CAPTURE BLOCKED</p></div>}
            
            <div className="flex gap-4 overflow-x-auto max-w-full">
              {photoViewer.photos.map((url, i) => (
                <img key={i} src={url} alt="Evidence" draggable={false} className="h-[70vh] rounded-2xl pointer-events-none select-none border border-white/10" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}