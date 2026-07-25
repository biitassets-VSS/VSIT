'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LogOut, ClipboardCheck, Ticket, 
  Loader2, Bell, X, CheckCircle2, AlertTriangle, Cpu,
  Megaphone, ImagePlus, Send, Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AdminProfile {
  name: string;
  email: string;
  initials: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [layoutCrash, setLayoutCrash] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any>(null);
  
  const [liveTicketCount, setLiveTicketCount] = useState(0);
  const [liveInspCount, setLiveInspCount] = useState(0);
  
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastImage, setBroadcastImage] = useState<File | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    name: 'Loading...', email: '...', initials: 'AD'
  });

  useEffect(() => {
    let notifChannel: any;
    let ticketChannel: any;
    let inspChannel: any;

    const verifyAdmin = async () => {
      try {
        const rawSession = localStorage.getItem('vsit_admin_session') || 
                           localStorage.getItem('vsit_staff_session') || 
                           localStorage.getItem('user');
        
        if (!rawSession) {
          setLayoutCrash("REASON: localStorage has no login session tokens.");
          setIsCheckingAuth(false);
          return; 
        }

        let activeUser: any = {};
        try {
          activeUser = JSON.parse(rawSession);
        } catch (parseCrash) {
          if (typeof rawSession === 'string' && rawSession.includes('@')) {
            activeUser = { email: rawSession, name: rawSession.split('@')[0], role: 'admin' };
          } else {
            throw new Error(`Failed to parse session token: "${rawSession}"`);
          }
        }

        const profileName = activeUser.name || activeUser.full_name || activeUser.email?.split('@')[0] || 'Administrator';
        
        setAdminProfile({
          name: profileName,
          email: activeUser.email || 'admin@vsit.com',
          initials: profileName.substring(0, 2).toUpperCase()
        });
        
        setIsCheckingAuth(false);
        fetchNotifications();

        try {
          notifChannel = supabase.channel(`admin_notifs_${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: "target_role=eq.admin" }, (payload) => {
              const newNotif = payload.new;
              setNotifications(current => [newNotif, ...current]);
              triggerPopup(newNotif.title, newNotif.message, 'System');
            }).subscribe();
        } catch (e) {}

        try {
          ticketChannel = supabase.channel(`admin_tickets_${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
              setLiveTicketCount(prev => prev + 1);
              triggerPopup('New Ticket Raised', `A staff member submitted: ${payload.new.title}`, 'Ticket');
            }).subscribe();
        } catch (e) {}

        try {
          inspChannel = supabase.channel(`admin_inspections_${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inspections' }, () => {
              setLiveInspCount(prev => prev + 1);
              triggerPopup('Compliance Alert', 'A new hardware inspection was submitted for review.', 'Inspection');
            }).subscribe();
        } catch (e) {}

      } catch (fatalError: any) {
        setLayoutCrash(fatalError.message || String(fatalError));
        setIsCheckingAuth(false);
      }
    };

    verifyAdmin();

    return () => {
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (ticketChannel) supabase.removeChannel(ticketChannel);
      if (inspChannel) supabase.removeChannel(inspChannel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase.from('notifications').select('*').eq('target_role', 'admin').order('created_at', { ascending: false }).limit(40);
      if (data) setNotifications(data);
    } catch(e) {}
  };

  const triggerPopup = (title: string, message: string, type: string) => {
    setActiveAlert({ title, message, type });
    setTimeout(() => setActiveAlert(null), 6000); 
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(current => current.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.clear();
    router.replace('/');
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim() && !broadcastImage) return;
    setIsBroadcasting(true);
    
    try {
      let finalImageUrl = null;
      if (broadcastImage) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${broadcastImage.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('broadcasts').upload(fileName, broadcastImage);
        if (uploadError) throw uploadError;
        finalImageUrl = supabase.storage.from('broadcasts').getPublicUrl(fileName).data.publicUrl;
      }
      await supabase.from('broadcasts').insert({ message: broadcastMessage.trim(), created_by: adminProfile.name, image_url: finalImageUrl });
      await supabase.from('notifications').insert({ title: "System Broadcast", message: broadcastMessage.trim(), is_read: false, type: 'broadcast' });
      setBroadcastMessage(''); setBroadcastImage(null); setIsBroadcastModalOpen(false);
      alert("Announcement successfully broadcasted to all staff dashboards!");
    } catch (err: any) { alert(`Failed: ${err.message}`); } finally { setIsBroadcasting(false); }
  };

  if (layoutCrash) return (
    <div className="flex-1 bg-[#0a0a0a] text-white flex items-center justify-center p-6 font-mono z-50">
      <div className="text-center space-y-4">
        <AlertTriangle size={48} className="text-rose-500 mx-auto" />
        <p className="text-rose-400 max-w-lg">{layoutCrash}</p>
      </div>
    </div>
  );

  if (isCheckingAuth) return (
    <div className="flex-1 flex flex-col items-center justify-center z-50">
      <Loader2 className="w-10 h-10 text-[#F97316] animate-spin mb-4" />
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Verifying Access...</p>
    </div>
  );

  const unreadTotal = notifications.filter(n => !n.is_read).length + liveTicketCount + liveInspCount;

  return (
    <div className="flex-1 flex flex-col relative w-full h-full bg-[#F8FAFC] dark:bg-[#09090b]">
      
      {/* 🟢 TOAST NOTIFICATION POPUP */}
      {activeAlert && (
        <div className="fixed top-20 right-6 z-[100] w-80 border shadow-2xl rounded-2xl p-5 animate-in slide-in-from-right-8 fade-in duration-300 bg-white dark:bg-[#121212] border-slate-200 dark:border-zinc-800">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse ring-4 ring-[#F97316]/20"></span>
              <h4 className="text-[11px] font-bold text-[#F97316] uppercase tracking-widest">{activeAlert.type} ALERT</h4>
            </div>
            <button onClick={() => setActiveAlert(null)} className="text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"><X size={16}/></button>
          </div>
          <h3 className="font-semibold text-sm text-slate-800 dark:text-zinc-100">{activeAlert.title}</h3>
          <p className="text-xs mt-1 leading-relaxed text-slate-500 dark:text-zinc-400">{activeAlert.message}</p>
        </div>
      )}

      {/* 🌟 FULL-WIDTH TOP HEADER BAR */}
      <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b shadow-sm shrink-0 sticky top-0 z-40 transition-colors duration-300 bg-white dark:bg-[#121212] border-slate-200 dark:border-zinc-800">
        
        {/* Top Left: Logo */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center cursor-pointer transition-transform hover:scale-105 active:scale-95">
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions" 
              className="h-8 w-auto object-contain" 
              onError={(e) => { e.currentTarget.style.display = 'none'; }} 
            />
          </Link>
        </div>

        {/* Top Right: Buttons & Logout */}
        <div className="flex items-center gap-3 ml-auto relative">
          
          <button onClick={() => setIsBroadcastModalOpen(true)} className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-[#8B5CF6] hover:bg-[#7c3aed] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[#8B5CF6]/30">
            <Megaphone size={14} /> Announcement
          </button>
          
          <button onClick={() => router.push('/admin/settings')} className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all duration-300 hover:-translate-y-0.5 bg-white dark:bg-zinc-900 border-slate-200 dark:border-[#F97316]/30 text-slate-600 dark:text-[#F97316] hover:border-[#F97316]/50 hover:text-[#F97316] dark:hover:bg-zinc-800">
            <Settings size={14} /> Settings
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${isNotifOpen ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6]' : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-[#8B5CF6] dark:hover:text-[#8B5CF6] hover:border-[#8B5CF6]/50 dark:hover:border-[#8B5CF6]/50'}`}>
              <Bell size={18} className={unreadTotal > 0 ? 'animate-pulse' : ''} />
              {unreadTotal > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F97316] text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 shadow-sm border-white dark:border-zinc-900">
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute top-[calc(100%+12px)] right-0 w-80 sm:w-96 rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-top-2 fade-in bg-white dark:bg-[#121212] border-slate-200 dark:border-zinc-800">
                <div className="p-4 border-b flex justify-between items-center shrink-0 bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-zinc-100">Notifications</h3>
                  {unreadTotal > 0 && <span className="text-[10px] font-bold text-[#F97316] bg-[#F97316]/10 px-2 py-0.5 rounded-md">{unreadTotal} New</span>}
                </div>
                
                <div className="overflow-y-auto custom-scrollbar flex-1">
                  {(liveTicketCount === 0 && liveInspCount === 0 && notifications.length === 0) ? (
                    <div className="p-8 text-center space-y-2 text-slate-500 dark:text-zinc-400">
                      <CheckCircle2 size={32} className="mx-auto opacity-40" />
                      <p className="text-xs font-bold uppercase tracking-widest">You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {liveTicketCount > 0 && (
                        <Link href="/admin/tickets" onClick={() => { setIsNotifOpen(false); setLiveTicketCount(0); }} className="block p-4 transition-colors cursor-pointer group bg-[#f3e8ff]/50 dark:bg-[#8B5CF6]/5 hover:bg-[#f3e8ff] dark:hover:bg-[#8B5CF6]/10">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center shrink-0"><Ticket size={14}/></div>
                            <div>
                              <h4 className="text-xs font-bold text-[#8B5CF6]">New Tickets Received</h4>
                              <p className="text-[11px] mt-0.5 text-slate-500 dark:text-zinc-400">Staff members have submitted {liveTicketCount} new support ticket(s).</p>
                            </div>
                          </div>
                        </Link>
                      )}
                      {liveInspCount > 0 && (
                        <Link href="/admin/inspections" onClick={() => { setIsNotifOpen(false); setLiveInspCount(0); }} className="block p-4 transition-colors cursor-pointer group bg-[#fff7ed]/50 dark:bg-[#F97316]/5 hover:bg-[#fff7ed] dark:hover:bg-[#F97316]/10">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#F97316]/20 text-[#F97316] flex items-center justify-center shrink-0"><ClipboardCheck size={14}/></div>
                            <div>
                              <h4 className="text-xs font-bold text-[#F97316]">New Inspections Submitted</h4>
                              <p className="text-[11px] mt-0.5 text-slate-500 dark:text-zinc-400">There are {liveInspCount} new hardware audits awaiting your review.</p>
                            </div>
                          </div>
                        </Link>
                      )}
                      
                      {notifications.map(n => (
                        <div key={n.id} className={`p-4 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50 ${n.is_read ? 'opacity-50' : 'bg-white dark:bg-[#121212]'}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">{n.title}</h4>
                              <p className="text-[11px] mt-0.5 text-slate-500 dark:text-zinc-400">{n.message}</p>
                              <span className="text-[10px] text-zinc-500 mt-2 block font-medium">{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                            {!n.is_read && (
                              <button onClick={() => markAsRead(n.id)} className="w-2 h-2 bg-[#8B5CF6] rounded-full shrink-0 shadow-sm shadow-[#8B5CF6]/50 cursor-pointer hover:scale-150 transition-transform" title="Mark as read" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SMART HOVER LOGOUT BUTTON */}
          <div className="relative group">
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-xl border transition-all flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-200 dark:hover:border-rose-500/30"
              title="Secure Logout"
            >
              <LogOut size={18} strokeWidth={2.5} />
            </button>

            <div className="absolute right-0 top-full mt-2 hidden group-hover:flex flex-col p-3.5 rounded-2xl shadow-xl z-50 min-w-[210px] text-left border pointer-events-none animate-in fade-in zoom-in-95 duration-150 bg-slate-900 dark:bg-[#18181b] border-slate-800 dark:border-zinc-800 text-white">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#F97316]">Logged in as</span>
              <span className="text-xs font-bold truncate mt-0.5">{adminProfile.name}</span>
              <span className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{adminProfile.email}</span>
            </div>
          </div>

        </div>
      </header>

      {/* ADMIN DASHBOARD CARDS INJECTION */}
      <div className="flex-1 w-full h-full relative text-slate-800 dark:text-zinc-100">
        {children}
      </div>

      {/* 🚀 FIXED TOP-BAR BROADCAST ANNOUNCEMENT MODAL */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-5 animate-in zoom-in-95 duration-300 bg-white dark:bg-[#121212] border-slate-200 dark:border-zinc-800">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-zinc-800">
              <h3 className="text-base font-extrabold flex items-center gap-2 uppercase tracking-wide text-slate-800 dark:text-zinc-100">
                <Megaphone size={20} className="text-[#F97316]" /> Broadcast Announcement
              </h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} className="p-2 rounded-full transition-colors hover:scale-110 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-2 text-slate-500 dark:text-zinc-400">Message Text *</label>
                {/* 🔴 PERFECT DARK MODE TEXTAREA */}
                <textarea 
                  rows={3} 
                  required 
                  placeholder="Type an announcement to broadcast..." 
                  value={broadcastMessage} 
                  onChange={e => setBroadcastMessage(e.target.value)} 
                  className="w-full p-3 rounded-xl border outline-none text-sm font-medium transition-all resize-none shadow-sm focus:ring-2 focus:ring-[#F97316]/20 bg-slate-50 dark:bg-[#18181b] border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 focus:bg-white dark:focus:bg-[#121212] focus:border-[#F97316] dark:focus:border-[#F97316]" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-2 text-slate-500 dark:text-zinc-400">Attach Graphic / Flyer (Optional)</label>
                {/* 🔴 PERFECT DARK MODE FILE UPLOAD */}
                <label className="cursor-pointer w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#18181b] hover:bg-white dark:hover:bg-[#121212] text-slate-500 dark:text-zinc-400 hover:border-[#8B5CF6]/50 dark:hover:border-[#8B5CF6]/50">
                  <ImagePlus size={24} className={broadcastImage ? "text-[#8B5CF6]" : ""} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{broadcastImage ? `Attached: ${broadcastImage.name}` : 'Click to browse image file'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setBroadcastImage(e.target.files ? e.target.files[0] : null)} />
                </label>
                {broadcastImage && <button type="button" onClick={() => setBroadcastImage(null)} className="text-[10px] text-rose-500 hover:underline mt-2 font-bold uppercase tracking-widest flex items-center gap-1"><X size={12} /> Remove attached file</button>}
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <button type="button" onClick={() => setIsBroadcastModalOpen(false)} className="flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all shadow-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800">Cancel</button>
                <button disabled={isBroadcasting} type="submit" className="flex-1 py-3 bg-[#8B5CF6] hover:bg-[#7c3aed] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest shadow-sm">
                  {isBroadcasting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}