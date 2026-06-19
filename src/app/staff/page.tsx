'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  PackageSearch, AlertCircle, CheckCircle2, 
  Clock, QrCode, Laptop, Wrench, ChevronRight, Loader2,
  Ticket, PlusCircle, RefreshCw, X, Camera, ShieldCheck, UploadCloud
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
  const [staffProfile, setStaffProfile] = useState<{name: string, emp_code: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isNewReqModalOpen, setIsNewReqModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketAsset, setTicketAsset] = useState('Software / General Issue');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketScreenshot, setTicketScreenshot] = useState<string | null>(null);
  const ticketFileInputRef = useRef<HTMLInputElement>(null);

  const [newReqCategory, setNewReqCategory] = useState('');
  const [newReqNotes, setNewReqNotes] = useState('');

  const [replaceAssetId, setReplaceAssetId] = useState('');
  const [replaceNotes, setReplaceNotes] = useState('');
  const [replacePhoto, setReplacePhoto] = useState<string | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = ['Laptop', 'Monitor', 'Mouse', 'Keyboard', 'Headphone', 'Mobile Phone', 'Other'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return;

        const { data: profileData } = await supabase
          .from('staff')
          .select('emp_code, name')
          .eq('email', user.email)
          .single();

        if (profileData) {
          setStaffProfile(profileData);
          const { data: myAssets } = await supabase.from('assets').select('*').eq('emp_code', profileData.emp_code);
          if (myAssets) setAssets(myAssets);
          const { data: myTickets } = await supabase.from('tickets').select('*').eq('emp_code', profileData.emp_code).order('created_at', { ascending: false });
          if (myTickets) setTickets(myTickets);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffProfile) return;
    setIsSubmitting(true);
    try {
      const fullDescription = `Asset Issue: ${ticketAsset}\n\nDetails: ${ticketDesc}`;
      const { error } = await supabase.from('tickets').insert([{
        emp_code: staffProfile.emp_code,
        subject: ticketSubject,
        description: fullDescription,
        status: 'Open'
      }]);
      if (error) throw error;
      
      // SEND ALERT TO ADMIN
      await supabase.from('notifications').insert([{
        target_role: 'admin', // Targets your specific schema setup
        title: `New Ticket: ${ticketSubject}`,
        message: `${staffProfile.name} (${staffProfile.emp_code}) raised a new IT Ticket regarding ${ticketAsset}.`,
        type: 'ticket' // Update to match your Enum if needed
      }]);

      alert("IT Ticket raised successfully!");
      setIsTicketModalOpen(false);
      window.location.reload(); 
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTicketPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setTicketScreenshot(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleNewAssetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqCategory) return alert("Please select an asset category.");

    const existingCount = assets.filter(a => a.category === newReqCategory && a.status !== 'Retired').length;
    if (newReqCategory === 'Laptop' && existingCount >= 2) return alert("You already have 2 Laptops. Send a replace request instead.");
    if (newReqCategory !== 'Laptop' && existingCount >= 1) return alert("Category already assigned. Send a replace request instead.");

    setIsSubmitting(true);
    try {
      // SEND ALERT TO ADMIN
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

  const handleReplaceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceAssetId) return alert("Please select the faulty asset.");
    
    setIsSubmitting(true);
    try {
      const assetInfo = assets.find(a => a.id === replaceAssetId);
      
      // SEND ALERT TO ADMIN
      await supabase.from('notifications').insert([{
        target_role: 'admin',
        title: `Asset Replacement Requested`,
        message: `${staffProfile?.name} requested to replace ${assetInfo?.name}. Reason: ${replaceNotes}`,
        type: 'replacement'
      }]);

      alert("Replacement Request submitted successfully! Please await Admin instructions.");
      setIsReplaceModalOpen(false);
      setReplaceAssetId('');
      setReplaceNotes('');
    } catch(err:any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplacePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setReplacePhoto(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (isLoading) return <div className="flex justify-center min-h-[60vh] items-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  const totalAssets = assets.length;
  const inRepair = assets.filter(a => a.status === 'Maintenance').length;
  const pendingInspections = assets.filter(a => !a.inspection_status || a.inspection_status === 'Pending' || a.inspection_status === 'Failed' || a.inspection_status === 'Pending Repair').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto relative">
      
      {/* WELCOME */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 blur-3xl rounded-full opacity-10 -mr-10 -mt-10 pointer-events-none"></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Welcome back, {staffProfile?.name || 'Team Member'}! 👋</h1>
          <p className="text-sm font-medium text-gray-500 mt-2 flex items-center gap-2">
            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-black font-mono text-xs border border-gray-200">{staffProfile?.emp_code}</span>
            Here is an overview of your IT assets.
          </p>
        </div>
      </div>

      {/* TICKETS */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><Ticket size={20} className="text-orange-500" /> My IT Tickets</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {tickets.length === 0 ? <p className="p-6 text-sm text-gray-500 font-bold text-center">No active tickets.</p> : tickets.map(ticket => (
              <div key={ticket.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50 transition-colors">
                <div>
                  <h3 className="font-bold text-gray-900">{ticket.subject}</h3>
                  <p className="text-xs font-medium text-gray-500 mt-1">{new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right flex flex-col gap-1 items-end">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ticket.status === 'Open' ? 'bg-blue-100 text-blue-700' : ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{ticket.status}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.button whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setIsTicketModalOpen(true)} className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm hover:shadow-md hover:border-orange-300 transition-all group">
          <div className="w-14 h-14 bg-gray-50 border border-gray-100 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-all"><Ticket size={26} /></div>
          <span className="font-black text-gray-800 text-sm">Raise IT Ticket</span>
        </motion.button>
        <motion.button whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setIsNewReqModalOpen(true)} className="flex flex-col items-center justify-center gap-3 p-6 bg-orange-50/50 border border-orange-100 rounded-[24px] shadow-sm hover:shadow-md hover:border-orange-300 transition-all group">
          <div className="w-14 h-14 bg-orange-100 border border-orange-200 text-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all"><PlusCircle size={26} /></div>
          <span className="font-black text-orange-900 text-sm">Request New Asset</span>
        </motion.button>
        <motion.button whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setIsReplaceModalOpen(true)} className="flex flex-col items-center justify-center gap-3 p-6 bg-red-50/50 border border-red-100 rounded-[24px] shadow-sm hover:shadow-md hover:border-red-300 transition-all group">
          <div className="w-14 h-14 bg-red-100 border border-red-200 text-red-600 rounded-full flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all"><RefreshCw size={26} /></div>
          <span className="font-black text-red-900 text-sm">Request Replacement</span>
        </motion.button>
      </div>

      {/* STATS & ASSETS */}
      {/* ... (Kept existing clean Stats & Asset visual mapping as shown in previous build) ... */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600"><Laptop size={24}/></div><div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">My Assets</p><p className="text-2xl font-black text-gray-900">{totalAssets}</p></div></div>
        <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><AlertCircle size={24}/></div><div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Needs Inspection</p><p className="text-2xl font-black text-gray-900">{pendingInspections}</p></div></div>
        <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600"><Wrench size={24}/></div><div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">In Repair</p><p className="text-2xl font-black text-gray-900">{inRepair}</p></div></div>
      </div>

      {/* 1. TICKET MODAL */}
      <AnimatePresence>
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-black text-gray-900">Raise IT Ticket</h2><button onClick={() => setIsTicketModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button></div>
              <form onSubmit={handleTicketSubmit} className="p-6 space-y-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">What is the issue?</label><input required type="text" placeholder="E.g. Cannot connect to Wi-Fi" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-medium transition-all"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Select Asset</label><select required value={ticketAsset} onChange={(e) => setTicketAsset(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-medium text-gray-700 transition-all"><option value="Software / General Issue">Software / General Issue</option>{assets.map(a => (<option key={a.id} value={a.name}>{a.name} (Tag: {a.tag_id})</option>))}</select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Notes / Description</label><textarea required rows={4} placeholder="Please provide details about what happened..." value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm font-medium resize-none transition-all"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Attach Screenshot (Optional)</label><div onClick={() => ticketFileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-all group">{ticketScreenshot ? (<div className="flex flex-col items-center gap-2"><CheckCircle2 size={32} className="text-green-500" /><span className="text-sm font-bold text-gray-700">Image Attached</span></div>) : (<><div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><UploadCloud size={24} /></div><p className="text-sm font-bold text-gray-800">Click to upload or drag & drop</p><p className="text-xs font-medium text-gray-400 mt-1">PNG, JPG, or PDF (max 5MB)</p></>)}<input type="file" accept="image/*" className="hidden" ref={ticketFileInputRef} onChange={handleTicketPhotoUpload} /></div></div>
                <div className="flex gap-4 pt-2"><button type="button" onClick={() => setIsTicketModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm">Cancel</button><button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-sm flex items-center justify-center gap-2 text-sm">{isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Submit Ticket'}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. NEW ASSET MODAL */}
      <AnimatePresence>
        {isNewReqModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><PlusCircle size={20} className="text-orange-600"/> Request New Asset</h2><button onClick={() => setIsNewReqModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button></div>
              <form onSubmit={handleNewAssetRequest} className="p-6 space-y-5">
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-orange-800 text-xs font-bold flex items-start gap-2"><ShieldCheck size={16} className="shrink-0 mt-0.5" /><p>You cannot request a new item if you already have an active asset of that same category (except laptops, max 2).</p></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-2">Category Required <span className="text-red-500">*</span></label><select required value={newReqCategory} onChange={(e) => setNewReqCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold text-gray-700"><option value="" disabled>Select Asset Category...</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-2">Justification / Reason <span className="text-red-500">*</span></label><textarea required rows={3} placeholder="Why do you need this new asset?" value={newReqNotes} onChange={(e) => setNewReqNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium resize-none"/></div>
                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2">{isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Send Request to Admin'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. REPLACEMENT MODAL */}
      <AnimatePresence>
        {isReplaceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><RefreshCw size={20} className="text-red-500"/> Return / Replace Asset</h2><button onClick={() => setIsReplaceModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button></div>
              <form onSubmit={handleReplaceRequest} className="p-6 space-y-5">
                <div><label className="block text-sm font-bold text-gray-900 mb-2">Select Faulty Asset <span className="text-red-500">*</span></label><select required value={replaceAssetId} onChange={(e) => setReplaceAssetId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold text-gray-700"><option value="" disabled>Select from your assigned items...</option>{assets.map(a => (<option key={a.id} value={a.id}>{a.name} (Tag: {a.tag_id})</option>))}</select></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-2">Reason / Fault Description <span className="text-red-500">*</span></label><textarea required rows={3} placeholder="Describe what is broken or why it needs replacement..." value={replaceNotes} onChange={(e) => setReplaceNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium resize-none"/></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-2">Upload Photo of Fault (Optional)</label><div className="flex items-center gap-4"><button type="button" onClick={() => replaceFileInputRef.current?.click()} className="px-4 py-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold flex items-center gap-2 text-gray-700 transition-colors"><Camera size={16} /> Choose Photo</button><input type="file" accept="image/*" ref={replaceFileInputRef} onChange={handleReplacePhotoCapture} className="hidden" />{replacePhoto && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={14}/> Photo Attached</span>}</div></div>
                <div className="pt-2 flex gap-4"><button type="button" onClick={() => setIsReplaceModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm">Cancel</button><button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm text-sm">{isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Submit Request'}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}