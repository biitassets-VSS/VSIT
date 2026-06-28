'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ClipboardCheck, Loader2, AlertTriangle, Eye, X, CameraOff, Bell, CheckCircle2, RefreshCw } from 'lucide-react';

export default function StaffInspectionsPage() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inspections, setInspections] = useState<any[]>([]);
  
  // 🌟 NOTIFICATIONS STATE
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

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
      // 1. Fetch user profile to get the exact ID for notifications
      const { data: profile } = await supabase.from('profiles').select('id').ilike('email', cleanEmail).maybeSingle();
      const currentUserId = profile?.id;
      if (currentUserId) setUserId(currentUserId);

      // 2. Fetch Inspections (Forcing fresh data)
      const { data: inspData, error: inspError } = await supabase
        .from('inspections')
        .select('*, assets(*)') 
        .ilike('user_email', cleanEmail)
        .order('created_at', { ascending: false });

      if (inspError) throw inspError;
      if (inspData) setInspections(inspData);

      // 3. Fetch Unread Notifications (Alerts from Admin)
      if (currentUserId) {
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('target_user', currentUserId)
          .eq('is_read', false)
          .order('created_at', { ascending: false });
          
        if (notifData) setNotifications(notifData);
      }
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
    
    // 🌟 REALTIME SUBSCRIPTIONS
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
    // Optimistically update UI
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    // Update Database
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
    <div className="space-y-6" onContextMenu={(e) => e.preventDefault()}>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit History</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Review the compliance and condition history of your devices.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 🌟 NEW MANUAL SYNC BUTTON */}
          <button 
            onClick={fetchRealtimeData} 
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden sm:inline">Sync Live</span>
          </button>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ClipboardCheck size={24}/></div>
        </div>
      </div>

      {/* 🌟 REALTIME ALERTS & NOTIFICATIONS BANNER */}
      {notifications.length > 0 && (
        <div className="space-y-3 mb-8 animate-in slide-in-from-top-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Bell size={14} className="text-amber-500 animate-bounce" /> Action Alerts ({notifications.length})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {notifications.map(notif => {
              const isReject = notif.title.toLowerCase().includes('reject');
              const isReInspect = notif.title.toLowerCase().includes('re-inspect');
              const isApprove = notif.title.toLowerCase().includes('approve');
              
              const bgColor = isReject ? 'bg-rose-50 border-rose-200' : isReInspect ? 'bg-amber-50 border-amber-200' : isApprove ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200';
              const iconColor = isReject ? 'text-rose-600' : isReInspect ? 'text-amber-600' : isApprove ? 'text-emerald-600' : 'text-blue-600';

              return (
                <div key={notif.id} className={`p-4 rounded-2xl border flex items-start sm:items-center justify-between gap-4 shadow-sm ${bgColor}`}>
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`p-2 bg-white rounded-lg shadow-xs shrink-0 ${iconColor}`}>
                      {isApprove ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${iconColor}`}>{notif.title}</h4>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{notif.message}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => markNotificationAsRead(notif.id)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🌟 AUDIT LEDGER */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden relative">
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 overflow-hidden z-10">
            <div className="w-1/3 h-full bg-blue-600 animate-[pulse_1s_ease-in-out_infinite] translate-x-full" />
          </div>
        )}
        
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
                          className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
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
            <button onClick={() => setPhotoViewer({ isOpen: false, photos: [], title: '' })} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"><X size={24}/></button>
            
            {!isWindowFocused && <div className="absolute z-50 text-white text-center"><CameraOff size={48} className="mx-auto"/><p className="font-black mt-2">CAPTURE BLOCKED</p></div>}
            
            <div className="flex gap-4 overflow-x-auto max-w-full custom-scrollbar pb-4">
              {photoViewer.photos.map((url, i) => (
                <img key={i} src={url} alt="Evidence" draggable={false} className="h-[70vh] rounded-2xl pointer-events-none select-none border border-white/10 shadow-2xl" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}