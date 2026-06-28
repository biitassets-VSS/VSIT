'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ClipboardCheck, Loader2, AlertTriangle, Eye, X, CameraOff, Bell, CheckCircle2, RefreshCw, Calendar, Clock } from 'lucide-react';

// 🌟 DYNAMIC DUE DATE CALCULATOR
const calculateNextDueDate = (lastInspectionDate: string, category: string = 'Laptop') => {
  if (!lastInspectionDate) return 'N/A';
  
  const baseDate = new Date(lastInspectionDate);
  const isLaptop = (category || '').toLowerCase().includes('laptop');
  
  // Laptops = 1 month later. Others = 3 months later.
  const monthsToAdd = isLaptop ? 1 : 3; 
  
  const targetYear = baseDate.getFullYear();
  const targetMonth = baseDate.getMonth() + monthsToAdd;

  // Find the LAST day of that target month
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0);
  
  // Walk backwards until we hit a Saturday (Day 6)
  const lastSaturday = new Date(lastDayOfTargetMonth);
  while (lastSaturday.getDay() !== 6) {
    lastSaturday.setDate(lastSaturday.getDate() - 1);
  }
  
  return lastSaturday.toLocaleDateString('en-IN'); 
};

export default function StaffInspectionsPage() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [inspections, setInspections] = useState<any[]>([]);
  
  // 🌟 NOTIFICATIONS STATE
  const [notifications, setNotifications] = useState<any[]>([]);

  // 🌟 SECURE LIGHTBOX STATE
  const [photoViewer, setPhotoViewer] = useState<{ isOpen: boolean; photos: string[]; title: string }>({
    isOpen: false, photos: [], title: ''
  });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  const fetchRealtimeData = async () => {
    setIsRefreshing(true);
    const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    if (!sessionStr) {
      setIsRefreshing(false);
      setLoading(false);
      return;
    }
    
    let email = sessionStr;
    try { email = JSON.parse(sessionStr).email; } catch(e) {}
    const cleanEmail = email?.toLowerCase().trim();

    try {
      const { data: profile } = await supabase.from('profiles').select('id').ilike('email', cleanEmail).maybeSingle();
      const currentUserId = profile?.id;

      // 🌟 STRICT CACHE BUSTER: Forces absolute live truth from database
      const { data: inspData, error: inspError } = await supabase
        .from('inspections')
        .select('*, assets(*)') 
        .ilike('user_email', cleanEmail)
        .neq('id', `bust-cache-${Date.now()}`) 
        .order('created_at', { ascending: false });

      if (inspError) throw inspError;
      
      if (inspData) {
        setInspections(inspData); // Show true chronological history
      }

      if (currentUserId) {
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('target_user', currentUserId)
          .eq('is_read', false)
          .neq('id', `bust-cache-${Date.now()}`) 
          .order('created_at', { ascending: false });
          
        if (notifData) setNotifications(notifData);
      }
      
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to sync inspections:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealtimeData();
    
    // 🌟 ANTI-SCREENSHOT ENGINE
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    const subInsp = supabase.channel('staff_insp_page_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, fetchRealtimeData)
      .subscribe();
      
    const subNotif = supabase.channel('staff_notif_page_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchRealtimeData)
      .subscribe();
      
    return () => { 
      supabase.removeChannel(subInsp);
      supabase.removeChannel(subNotif);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const markNotificationAsRead = async (notifId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
  };

  const getBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'rejected' || s === 'not approved') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s === 're-inspection') return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-6 select-none" onContextMenu={(e) => e.preventDefault()}>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit History</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Review the compliance and condition history of your devices.</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchRealtimeData} 
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
              <span className="hidden sm:inline">Sync Live Data</span>
            </button>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ClipboardCheck size={24}/></div>
          </div>
          {lastSynced && <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2">Database Read: {lastSynced}</p>}
        </div>
      </div>

      {/* ALERTS */}
      {notifications.length > 0 && (
        <div className="space-y-3 mb-8 animate-in slide-in-from-top-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Bell size={14} className="text-amber-500 animate-bounce" /> Action Alerts ({notifications.length})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {notifications.map(notif => {
              const s = notif.title.toLowerCase();
              const isReject = s.includes('reject');
              const isReInspect = s.includes('re-inspect');
              const isApprove = s.includes('approve');
              
              const bgColor = isReject ? 'bg-rose-50 border-rose-200' : isReInspect ? 'bg-amber-50 border-amber-200' : isApprove ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200';
              const iconColor = isReject ? 'text-rose-600' : isReInspect ? 'text-amber-600' : isApprove ? 'text-emerald-600' : 'text-blue-600';

              return (
                <div key={notif.id} className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${bgColor}`}>
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`p-2 bg-white rounded-lg shadow-xs shrink-0 ${iconColor}`}>
                      {isApprove ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${iconColor}`}>{notif.title}</h4>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{notif.message}</p>
                    </div>
                  </div>
                  <button onClick={() => markNotificationAsRead(notif.id)} className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer">
                    Dismiss
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INSPECTION HISTORY GRID */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden relative">
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 overflow-hidden z-10">
            <div className="w-1/3 h-full bg-blue-600 animate-[pulse_1s_ease-in-out_infinite] translate-x-full" />
          </div>
        )}
        
        {inspections.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-sm">No inspections found in the database.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {inspections.map(insp => {
              const asset = insp.assets || {};
              let safePhotos: string[] = [];
              try {
                if (Array.isArray(insp.photos)) safePhotos = insp.photos;
                else if (typeof insp.photos === 'string') safePhotos = JSON.parse(insp.photos);
              } catch (e) {}
              
              const isApproved = (insp.status || '').toLowerCase().includes('approved');

              return (
                <div key={insp.id} className="p-6 md:p-8 hover:bg-slate-50 transition-colors flex flex-col xl:flex-row gap-6">
                  
                  {/* LEFT: Identity & Status */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold text-slate-900 text-lg">{asset.name || asset.asset_name || 'Unknown Device'}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getBadge(insp.status)}`}>
                        {insp.status || 'Pending'}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>Condition: <strong className="text-slate-800">{insp.condition}</strong></p>
                      <p className="text-xs italic">"{insp.notes || 'No notes provided'}"</p>
                    </div>
                  </div>

                  {/* MIDDLE: Dates */}
                  <div className="flex-1 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Last Audit Date</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900">{new Date(insp.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Upcoming Due</span>
                      </div>
                      <span className={`text-xs font-bold ${isApproved ? 'text-blue-600' : 'text-slate-400'}`}>
                        {isApproved ? calculateNextDueDate(insp.created_at, asset.category) : 'Pending Approval'}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT: Evidence */}
                  <div className="flex-1 xl:max-w-xs flex flex-col justify-center">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Photographic Evidence</h4>
                    {safePhotos.length > 0 ? (
                      <button 
                        onClick={() => setPhotoViewer({ isOpen: true, photos: safePhotos, title: asset.name || 'Inspection' })}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-md shadow-slate-900/10"
                      >
                        <Eye size={16} /> View Secure Photos ({safePhotos.length})
                      </button>
                    ) : (
                      <div className="w-full p-3.5 rounded-xl border border-dashed border-rose-200 bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center gap-2">
                        <AlertTriangle size={14} /> No photos attached
                      </div>
                    )}
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 SECURE LIGHTBOX (Anti-Screenshot/Download Engine) */}
      {photoViewer.isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[9999] flex flex-col items-center justify-center p-4 select-none"
          onContextMenu={(e) => e.preventDefault()} // Blocks right click
        >
          <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-300 ${!isWindowFocused ? 'blur-3xl opacity-0 scale-95' : 'blur-0 opacity-100 scale-100'}`}>
            <button onClick={() => setPhotoViewer({ isOpen: false, photos: [], title: '' })} className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-rose-500 text-white rounded-full transition-colors cursor-pointer z-[10000] border border-white/20"><X size={24}/></button>
            
            {!isWindowFocused && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white bg-slate-950">
                <CameraOff size={64} className="text-rose-500 mb-4 animate-pulse"/>
                <h2 className="font-black text-2xl tracking-widest uppercase">Capture Blocked</h2>
                <p className="text-slate-400 mt-2 font-medium">Please return focus to this window to view secure evidence.</p>
              </div>
            )}
            
            <div className="flex gap-6 overflow-x-auto max-w-full w-full h-[80vh] items-center px-4 md:px-12 snap-x custom-scrollbar">
              {photoViewer.photos.map((url, i) => (
                <div key={i} className="relative shrink-0 snap-center h-full flex items-center justify-center pointer-events-none">
                  <img 
                    src={url} 
                    alt="Secure Evidence" 
                    draggable={false} // Blocks drag-and-drop saving
                    className="max-h-full max-w-full rounded-2xl pointer-events-none select-none border-2 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
                    style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
                  />
                  {/* Invisible overlay to block right-clicks on the image itself */}
                  <div className="absolute inset-0 z-10 bg-transparent"></div>
                </div>
              ))}
            </div>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-white text-[10px] font-black tracking-widest uppercase shadow-xl">
              {photoViewer.photos.length} Secure Images • Do Not Distribute
            </div>
          </div>
        </div>
      )}
    </div>
  );
}