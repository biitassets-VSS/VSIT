'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AlertCircle, CheckCircle2, Clock, Laptop, Wrench, Ticket, 
  PlusCircle, RefreshCw, X, Camera, ShieldCheck, UploadCloud, 
  ClipboardCheck, MessageSquare, Timer, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface AssignedAsset {
  id: string;
  tag_id: string;
  name: string;
  category: string;
  serial_number: string | null;
  status: string;
  inspection_status: string;
  next_inspection_date: string;
}

export default function StaffDashboard() {
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [staffProfile, setStaffProfile] = useState<{name: string, emp_code: string, id: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isNewReqModalOpen, setIsNewReqModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);

  // Ticket Form State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketAsset, setTicketAsset] = useState('Software / General Issue');
  const [ticketDesc, setTicketDesc] = useState('');

  // Request Form State
  const [newReqCategory, setNewReqCategory] = useState('');
  const [newReqNotes, setNewReqNotes] = useState('');

  // Replace/Inspect Form State
  const [actionAssetId, setActionAssetId] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionPhoto, setActionPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = ['Laptop', 'Monitor', 'Mouse', 'Keyboard', 'Headphone', 'Mobile Phone', 'Other'];

  const fetchData = useCallback(async (empCode: string) => {
    try {
      const { data: myAssets } = await supabase.from('assets').select('*').eq('emp_code', empCode);
      if (myAssets) setAssets(myAssets);
      
      const { data: myTickets } = await supabase.from('tickets').select('*').eq('emp_code', empCode).order('created_at', { ascending: false });
      if (myTickets) setTickets(myTickets);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) return;

      const { data: profileData } = await supabase
        .from('staff')
        .select('emp_code, name')
        .eq('email', user.email)
        .single();

      if (profileData) {
        setStaffProfile({ ...profileData, id: user.id });
        await fetchData(profileData.emp_code);

        // --- REAL-TIME LISTENERS ---
        const channel = supabase.channel('staff_dashboard_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `emp_code=eq.${profileData.emp_code}` }, () => {
            fetchData(profileData.emp_code); // Refresh when admin updates ticket
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'assets', filter: `emp_code=eq.${profileData.emp_code}` }, () => {
            fetchData(profileData.emp_code); // Refresh when admin updates asset
          })
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      }
    };

    initData().finally(() => setIsLoading(false));
  }, [fetchData]);

  // --- 1. TICKET SUBMIT ---
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffProfile) return;
    setIsSubmitting(true);
    try {
      const fullDescription = `Asset Issue: ${ticketAsset}\n\nDetails: ${ticketDesc}`;
      await supabase.from('tickets').insert([{
        emp_code: staffProfile.emp_code,
        subject: ticketSubject,
        description: fullDescription,
        status: 'Open',
        replies: []
      }]);
      
      await supabase.from('notifications').insert([{
        target_role: 'admin',
        title: `New Ticket: ${ticketSubject}`,
        message: `${staffProfile.name} raised a ticket.`,
        type: 'ticket'
      }]);

      alert("IT Ticket raised successfully!");
      setIsTicketModalOpen(false);
      setTicketSubject('');
      setTicketDesc('');
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 2. NEW ASSET REQUEST ---
  const handleNewAssetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await supabase.from('notifications').insert([{
        target_role: 'admin',
        title: `New Asset Request: ${newReqCategory}`,
        message: `${staffProfile?.name} requested a new ${newReqCategory}. Reason: ${newReqNotes}`,
        type: 'request'
      }]);
      alert("New Asset Request sent to Admin for approval.");
      setIsNewReqModalOpen(false);
      setNewReqCategory('');
      setNewReqNotes('');
    } catch(err:any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 3. SUBMIT INSPECTION ---
  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionAssetId) return alert("Please select an asset.");
    setIsSubmitting(true);
    
    try {
      await supabase.from('assets').update({
        inspection_status: 'Pending Admin Review',
        inspection_notes: actionNotes,
        photos: actionPhoto ? [actionPhoto] : []
      }).eq('id', actionAssetId);

      const assetInfo = assets.find(a => a.id === actionAssetId);
      await supabase.from('notifications').insert([{
        target_role: 'admin',
        title: `Inspection Submitted`,
        message: `${staffProfile?.name} submitted an inspection for ${assetInfo?.name}.`,
        type: 'inspection'
      }]);

      alert("Inspection submitted successfully to Admin!");
      setIsInspectModalOpen(false);
      setActionNotes('');
      setActionPhoto(null);
    } catch(err:any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- PHOTO UPLOAD HELPER ---
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setActionPhoto(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (isLoading) return <div className="flex justify-center min-h-[60vh] items-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  const totalAssets = assets.length;
  const inRepair = assets.filter(a => a.status === 'Maintenance').length;
  const pendingInspections = assets.filter(a => a.inspection_status === 'Pending' || a.inspection_status === 'Re-Inspection').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto relative">
      
      {/* WELCOME */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Welcome back, {staffProfile?.name || 'Team Member'}! 👋</h1>
        <p className="text-sm font-medium text-gray-500 mt-2">ID: <span className="font-bold text-gray-800">{staffProfile?.emp_code}</span> | Here is your IT workspace overview.</p>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.button whileHover={{ y: -4 }} onClick={() => setIsTicketModalOpen(true)} className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-[20px] shadow-sm hover:border-blue-300 transition-all">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Ticket size={24} /></div>
          <span className="font-black text-gray-800 text-xs text-center">Raise Ticket</span>
        </motion.button>
        
        <motion.button whileHover={{ y: -4 }} onClick={() => setIsInspectModalOpen(true)} className="flex flex-col items-center gap-3 p-5 bg-orange-50 border border-orange-100 rounded-[20px] shadow-sm hover:border-orange-300 transition-all">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center"><ClipboardCheck size={24} /></div>
          <span className="font-black text-orange-900 text-xs text-center">Submit Inspection</span>
        </motion.button>

        <motion.button whileHover={{ y: -4 }} onClick={() => setIsNewReqModalOpen(true)} className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-[20px] shadow-sm hover:border-teal-300 transition-all">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center"><PlusCircle size={24} /></div>
          <span className="font-black text-gray-800 text-xs text-center">Request Asset</span>
        </motion.button>

        <motion.button whileHover={{ y: -4 }} onClick={() => setIsReplaceModalOpen(true)} className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-[20px] shadow-sm hover:border-red-300 transition-all">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center"><RefreshCw size={24} /></div>
          <span className="font-black text-gray-800 text-xs text-center">Replace Asset</span>
        </motion.button>
      </div>

      {/* TICKETS & ADMIN UPDATES */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><Ticket size={20} className="text-teal-600" /> My IT Tickets</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {tickets.length === 0 ? <p className="p-6 text-sm text-gray-500 font-bold text-center">No active tickets.</p> : tickets.map(ticket => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                
                {/* Header Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-black text-gray-900 text-base">{ticket.subject || ticket.title}</h3>
                    <p className="text-xs font-medium text-gray-500 mt-1">{new Date(ticket.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* ADMIN ETA DISPLAYED HERE */}
                    {ticket.waiting_time && ticket.status !== 'Resolved' && (
                      <span className="px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200">
                        <Timer size={12}/> ETA: {ticket.waiting_time}
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${ticket.status === 'Open' ? 'bg-red-100 text-red-700' : ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' : ticket.status === 'Hold' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>

                {/* ADMIN REPLIES DISPLAYED HERE */}
                {ticket.replies && ticket.replies.length > 0 && (
                  <div className="mt-4 bg-teal-50 border border-teal-100 p-4 rounded-xl">
                    <p className="text-xs font-black text-teal-800 uppercase tracking-wider mb-1 flex items-center gap-1"><MessageSquare size={12}/> Latest Update from Admin</p>
                    <p className="text-sm font-medium text-teal-900 whitespace-pre-wrap">
                      {ticket.replies[ticket.replies.length - 1].text}
                    </p>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600"><Laptop size={24}/></div><div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">My Assets</p><p className="text-2xl font-black text-gray-900">{totalAssets}</p></div></div>
        <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600"><AlertCircle size={24}/></div><div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Needs Inspection</p><p className="text-2xl font-black text-gray-900">{pendingInspections}</p></div></div>
        <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600"><Wrench size={24}/></div><div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">In Repair</p><p className="text-2xl font-black text-gray-900">{inRepair}</p></div></div>
      </div>

      {/* INSPECTION MODAL */}
      <AnimatePresence>
        {isInspectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><ClipboardCheck size={20} className="text-orange-500"/> Submit Inspection</h2><button onClick={() => setIsInspectModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button></div>
              <form onSubmit={handleInspectionSubmit} className="p-6 space-y-5">
                <div><label className="block text-sm font-bold text-gray-900 mb-2">Select Asset to Inspect</label><select required value={actionAssetId} onChange={(e) => setActionAssetId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold"><option value="" disabled>Select assigned asset...</option>{assets.map(a => (<option key={a.id} value={a.id}>{a.name} ({a.tag_id})</option>))}</select></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-2">Current Condition Notes</label><textarea required rows={3} placeholder="Describe the physical condition (e.g., Working fine, minor scratch on screen)" value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm"/></div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Upload Photo Evidence</label>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold flex items-center gap-2 text-gray-700 transition-colors"><Camera size={16} /> Choose Photo</button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoCapture} className="hidden" />
                    {actionPhoto && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={14}/> Photo Attached</span>}
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2">{isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Send to Admin'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TICKET MODAL */}
      <AnimatePresence>
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-black text-gray-900">Raise IT Ticket</h2><button onClick={() => setIsTicketModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button></div>
              <form onSubmit={handleTicketSubmit} className="p-6 space-y-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">What is the issue?</label><input required type="text" placeholder="E.g. Cannot connect to Wi-Fi" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-medium transition-all"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Select Asset</label><select required value={ticketAsset} onChange={(e) => setTicketAsset(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-medium text-gray-700 transition-all"><option value="Software / General Issue">Software / General Issue</option>{assets.map(a => (<option key={a.id} value={a.name}>{a.name} (Tag: {a.tag_id})</option>))}</select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Notes / Description</label><textarea required rows={4} placeholder="Please provide details about what happened..." value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-medium resize-none transition-all"/></div>
                <div className="flex gap-4 pt-2"><button type="button" onClick={() => setIsTicketModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm">Cancel</button><button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-sm flex items-center justify-center gap-2 text-sm">{isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Submit Ticket'}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}