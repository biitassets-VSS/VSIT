'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  PackageSearch, AlertCircle, CheckCircle2, 
  Clock, QrCode, Laptop, Wrench, ChevronRight, Loader2,
  Ticket, PlusCircle, RefreshCw, X, Save, Camera, ShieldCheck
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
  const [staffProfile, setStaffProfile] = useState<{name: string, emp_code: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isNewReqModalOpen, setIsNewReqModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');

  const [newReqCategory, setNewReqCategory] = useState('');
  const [newReqNotes, setNewReqNotes] = useState('');

  const [replaceAssetId, setReplaceAssetId] = useState('');
  const [replaceNotes, setReplaceNotes] = useState('');
  const [replacePhoto, setReplacePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = ['Laptop', 'Monitor', 'Mouse', 'Keyboard', 'Headphone', 'Mobile Phone', 'Other'];

  useEffect(() => {
    const fetchMyAssets = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return;

        const { data: profileData, error: staffError } = await supabase
          .from('staff')
          .select('emp_code, name')
          .eq('email', user.email)
          .single();

        if (staffError || !profileData) {
          console.error("Could not find staff profile.");
          setIsLoading(false);
          return;
        }

        setStaffProfile(profileData);

        const { data: myAssets, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .eq('emp_code', profileData.emp_code);

        if (assetsError) throw assetsError;

        if (myAssets) {
          const mappedAssets = myAssets.map((asset: any) => ({
            id: asset.id,
            tag_id: asset.tag_id,
            name: asset.name,
            category: asset.category,
            serial_number: asset.serial_number,
            status: asset.status,
            inspection_status: asset.inspection_status || 'Pending',
            next_inspection_date: asset.next_inspection_date || '-',
          }));
          setAssets(mappedAssets);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyAssets();
  }, []);

  // --- SUBMIT HANDLERS ---

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mocking Database Insert
    setTimeout(() => {
      alert("IT Ticket raised successfully!");
      setIsSubmitting(false);
      setIsTicketModalOpen(false);
      setTicketSubject('');
      setTicketDesc('');
    }, 1000);
  };

  const handleNewAssetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqCategory) return alert("Please select an asset category.");

    // Strict Validation Rule
    const existingAssetsOfCategory = assets.filter(a => a.category === newReqCategory && a.status !== 'Retired');
    const existingCount = existingAssetsOfCategory.length;

    if (newReqCategory === 'Laptop') {
      if (existingCount >= 2) {
        return alert("You already have 2 Laptops assigned to you. If you need a replacement, please send a replace request with a valid reason.");
      }
    } else {
      if (existingCount >= 1) {
        return alert("Same categories assets already assigned you if you need replace then send replace request with valid reason.");
      }
    }

    setIsSubmitting(true);
    // Mocking Database Insert
    setTimeout(() => {
      alert("New Asset Request sent to Admin for approval.");
      setIsSubmitting(false);
      setIsNewReqModalOpen(false);
      setNewReqCategory('');
      setNewReqNotes('');
    }, 1000);
  };

  const handleReplaceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceAssetId) return alert("Please select the faulty asset you wish to replace.");
    if (!replaceNotes.trim()) return alert("Notes describing the fault are required.");

    setIsSubmitting(true);
    // Mocking Database Insert
    setTimeout(() => {
      alert("Replacement Request submitted successfully! Please await Admin instructions.");
      setIsSubmitting(false);
      setIsReplaceModalOpen(false);
      setReplaceAssetId('');
      setReplaceNotes('');
      setReplacePhoto(null);
    }, 1000);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setReplacePhoto(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  const totalAssets = assets.length;
  const inRepair = assets.filter(a => a.status === 'Maintenance').length;
  const pendingInspections = assets.filter(a => 
    !a.inspection_status || 
    a.inspection_status === 'Pending' || 
    a.inspection_status === 'Failed' ||
    a.inspection_status === 'Pending Repair'
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto relative">
      
      {/* WELCOME HEADER (ORANGE THEME) */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 blur-3xl rounded-full opacity-10 -mr-10 -mt-10 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
              Welcome back, {staffProfile?.name || 'Team Member'}! 👋
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-2 flex items-center gap-2">
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-black font-mono text-xs border border-gray-200">
                {staffProfile?.emp_code || 'EMP-XXXX'}
              </span>
              Here is an overview of your IT assets.
            </p>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => setIsTicketModalOpen(true)} className="flex items-center justify-center gap-2 px-5 py-4 bg-white border border-gray-200 text-gray-800 text-sm font-black rounded-[20px] hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 shadow-sm transition-all group">
          <Ticket size={20} className="text-gray-400 group-hover:text-orange-500 transition-colors" /> Raise IT Ticket
        </button>
        <button onClick={() => setIsNewReqModalOpen(true)} className="flex items-center justify-center gap-2 px-5 py-4 bg-gray-900 text-white text-sm font-black rounded-[20px] hover:bg-black shadow-sm transition-all">
          <PlusCircle size={20} /> Request New Asset
        </button>
        <button onClick={() => setIsReplaceModalOpen(true)} className="flex items-center justify-center gap-2 px-5 py-4 bg-orange-600 text-white text-sm font-black rounded-[20px] hover:bg-orange-700 shadow-sm transition-all">
          <RefreshCw size={20} /> Request Replacement
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <Laptop size={24}/>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">My Assets</p>
            <p className="text-2xl font-black text-gray-900">{totalAssets}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertCircle size={24}/>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Needs Inspection</p>
            <p className="text-2xl font-black text-gray-900">{pendingInspections}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <Wrench size={24}/>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">In Repair</p>
            <p className="text-2xl font-black text-gray-900">{inRepair}</p>
          </div>
        </div>
      </div>

      {/* ASSETS LIST */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <PackageSearch className="text-orange-500" size={20} />
          <h2 className="text-lg font-black text-gray-900">Currently Assigned to You</h2>
        </div>

        <div className="p-6">
          {assets.length === 0 ? (
            <div className="text-center py-10">
              <Laptop size={48} className="mx-auto text-gray-200 mb-4" />
              <h3 className="text-lg font-black text-gray-800">No Assets Assigned</h3>
              <p className="text-sm font-medium text-gray-500 mt-2">
                You do not have any IT equipment assigned to your account right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div key={asset.id} className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-orange-300 transition-all group shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 group-hover:text-orange-600 transition-colors">
                      <Laptop size={20} />
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                      asset.status === 'Maintenance' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {asset.status}
                    </span>
                  </div>

                  <h3 className="font-black text-gray-900 text-base mb-1 line-clamp-1" title={asset.name}>
                    {asset.name}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-50 inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200">
                      <QrCode size={12} /> {asset.tag_id}
                    </span>
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-50 inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200">
                      S/N: {asset.serial_number || 'N/A'}
                    </span>
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Inspection Status</p>
                      <p className="text-xs font-black flex items-center gap-1 text-gray-700">
                        {asset.inspection_status === 'Passed' && <CheckCircle2 size={12} className="text-green-500" />}
                        {(asset.inspection_status === 'Pending' || asset.inspection_status === 'Pending Repair' || !asset.inspection_status) && <Clock size={12} className="text-amber-500" />}
                        {asset.inspection_status === 'Failed' && <AlertCircle size={12} className="text-red-500" />}
                        {asset.inspection_status || 'Pending'}
                      </p>
                    </div>
                    
                    <Link href={`/staff/assets`} className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200 text-gray-400 group-hover:bg-orange-50 group-hover:border-orange-200 group-hover:text-orange-600 transition-colors">
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODALS SECTION                                                   */}
      {/* ============================================================== */}

      {/* 1. RAISE TICKET MODAL */}
      <AnimatePresence>
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><Ticket size={20} className="text-gray-500"/> Raise IT Ticket</h2>
                <button onClick={() => setIsTicketModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>
              <form onSubmit={handleTicketSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Subject</label>
                  <input required type="text" placeholder="E.g., Software installation required" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                  <textarea required rows={4} placeholder="Describe the issue in detail..." value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium resize-none"/>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-gray-900 text-white font-black rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Submit Ticket'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. NEW ASSET REQUEST MODAL */}
      <AnimatePresence>
        {isNewReqModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><PlusCircle size={20} className="text-blue-600"/> Request New Asset</h2>
                <button onClick={() => setIsNewReqModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>
              <form onSubmit={handleNewAssetRequest} className="p-6 space-y-5">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-xs font-bold flex items-start gap-2">
                  <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                  <p>You cannot request a new item if you already have an active asset of that same category (except laptops, where a maximum of 2 are permitted).</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Category Required <span className="text-red-500">*</span></label>
                  <select required value={newReqCategory} onChange={(e) => setNewReqCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700">
                    <option value="" disabled>Select Asset Category...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Justification / Reason <span className="text-red-500">*</span></label>
                  <textarea required rows={3} placeholder="Why do you need this new asset?" value={newReqNotes} onChange={(e) => setNewReqNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none"/>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Send Request to Admin'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. REPLACEMENT / RETURN MODAL */}
      <AnimatePresence>
        {isReplaceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><RefreshCw size={20} className="text-orange-500"/> Return / Replace Asset</h2>
                <button onClick={() => setIsReplaceModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>
              <form onSubmit={handleReplaceRequest} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Select Faulty Asset <span className="text-red-500">*</span></label>
                  <select required value={replaceAssetId} onChange={(e) => setReplaceAssetId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold text-gray-700">
                    <option value="" disabled>Select from your assigned items...</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Tag: {a.tag_id} | S/N: {a.serial_number || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Reason / Fault Description <span className="text-red-500">*</span></label>
                  <textarea required rows={3} placeholder="Describe what is broken or why it needs replacement..." value={replaceNotes} onChange={(e) => setReplaceNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium resize-none"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Upload Photo of Fault (Optional)</label>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold flex items-center gap-2 text-gray-700 transition-colors">
                      <Camera size={16} /> Choose Photo
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoCapture} className="hidden" />
                    {replacePhoto && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={14}/> Photo Attached</span>}
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-sm">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Submit Replacement Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}