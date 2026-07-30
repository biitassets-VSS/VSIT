'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Ticket, PlusCircle, AlertCircle, CheckCircle2, 
  Clock, X, UploadCloud, Image as ImageIcon, MessageSquare, ShieldCheck, Send, Loader2
} from 'lucide-react';

// --- TYPES ---
interface TicketRecord {
  id: string;
  issue: string;
  asset: string;
  status: string;
  date: string;
  notes: string;
  hasAttachment: boolean;
}

interface AssetRecord {
  id: string;
  name: string;
}

interface StaffTicketsClientProps {
  initialTickets: TicketRecord[];
  assignedAssets: AssetRecord[];
}

export default function StaffTicketsClient({ initialTickets, assignedAssets }: StaffTicketsClientProps) {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketRecord[]>(initialTickets);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [issue, setIssue] = useState('');
  const [asset, setAsset] = useState('Software / General Issue');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. PREPARE DATA (Handle file upload if necessary)
      const formData = new FormData();
      formData.append('issue', issue);
      formData.append('asset', asset);
      formData.append('notes', notes);
      if (file) {
        formData.append('file', file);
      }

      // 2. SEND TO YOUR REAL API ENDPOINT
      const response = await fetch('/api/tickets', {
        method: 'POST',
        body: formData, // Using FormData to support file uploads
      });

      if (!response.ok) throw new Error('Failed to submit ticket');

      // 3. GET THE SAVED TICKET FROM DB
      const newlySavedTicket: TicketRecord = await response.json();

      // 4. UPDATE UI
      setTickets([newlySavedTicket, ...tickets]);
      alert("Ticket raised successfully! IT Support has been notified.");
      
      // 5. RESET FORM
      setIssue('');
      setAsset('Software / General Issue');
      setNotes('');
      setFile(null);
      setIsModalOpen(false);

    } catch (error) {
      alert("Failed to submit ticket. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 🌟 SCROLL FIX & SPACING: Added max-w-7xl, mx-auto, and padding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 animate-in fade-in duration-500 w-full min-h-screen pb-32 select-none relative" onContextMenu={(e) => e.preventDefault()}>
        
        {/* 🌟 ADVANCED HEADER WITH GLASS THEME */}
        <div className="relative bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-orange-400/10 to-purple-500/10 blur-3xl -z-10 rounded-full" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-linear-to-tr from-purple-400/10 to-orange-500/10 blur-3xl -z-10 rounded-full" />
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Ticket className="text-purple-600" /> My IT Tickets
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-xl">
              Track your support requests and report new issues.
            </p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/20 shrink-0 border border-white/20"
          >
            <PlusCircle size={18} /> Raise New Ticket
          </button>
        </div>

        {/* 🌟 GLASS TICKETS CONTAINER */}
        <div className="bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative">
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-slate-800" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-widest uppercase">Ticket History</h2>
            </div>
            <span className="text-xs sm:text-sm font-black text-slate-500">{tickets.length} Records</span>
          </div>
          
          <div className="flex flex-col gap-5">
            {tickets.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200/50 rounded-4xl bg-white/30 backdrop-blur-md flex flex-col items-center">
                <CheckCircle2 size={44} className="text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700">All Caught Up!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">You have no active or past support requests.</p>
              </div>
            ) : (
              tickets.map((ticket) => {
                const isOpen = ticket.status === 'Open';
                
                return (
                <div key={ticket.id} className="group bg-white/40 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/60 shadow-[0_8px_25px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] relative overflow-hidden flex flex-col md:flex-row gap-5 md:items-center justify-between">
                  
                  {/* Glowing Status Blob */}
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 rounded-full opacity-20 transition-opacity duration-500 group-hover:opacity-40 pointer-events-none ${isOpen ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`p-3 rounded-2xl mt-1 shadow-sm shrink-0 border ${isOpen ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                      {isOpen ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight line-clamp-1">{ticket.issue}</h3>
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md border flex items-center gap-1.5 backdrop-blur-md shadow-sm shrink-0 ${isOpen ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-purple-600 mb-2">{ticket.asset}</p>
                      
                      <div className="flex items-start gap-2 mt-2 text-xs text-slate-700 bg-white/50 backdrop-blur-sm p-3.5 rounded-2xl border border-white/60 shadow-inner">
                        <MessageSquare size={16} className="text-slate-400 shrink-0 mt-0.5"/>
                        <span className="italic font-medium wrap-break-word leading-relaxed">"{ticket.notes}"</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2 shrink-0 md:pl-4 mt-2 md:mt-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <Clock size={14} className="text-purple-400" /> {ticket.date}
                    </div>
                    {ticket.hasAttachment && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-700 bg-purple-500/10 px-2.5 py-1.5 rounded-md border border-purple-500/20 shadow-sm mt-1">
                        <ImageIcon size={14} /> Screenshot attached
                      </div>
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-2 bg-slate-100/50 px-2 py-1 rounded">ID: {ticket.id}</span>
                  </div>

                </div>
              )})
            )}
          </div>
        </div>
      </div>

      {/* 🌟 RAISE TICKET MODAL (Wrapped in Portal to fix Z-Index & Sidebar issues) */}
      {mounted && isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" style={{ zIndex: 2147483647 }}>
          <div className="bg-white/95 backdrop-blur-2xl rounded-4xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col my-8 border border-white/60 animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-white/50 sticky top-0 z-10">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2.5">
                <Ticket className="text-purple-600" size={20} /> Raise IT Ticket
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                disabled={isSubmitting}
                className="p-2 text-slate-400 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">What is the issue?</label>
                <input 
                  required 
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  disabled={isSubmitting}
                  type="text" 
                  placeholder="E.g. Cannot connect to Wi-Fi" 
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-md focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none font-bold text-sm text-slate-900 transition-all shadow-inner placeholder:text-slate-400 placeholder:font-medium disabled:opacity-50" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">Select Asset</label>
                <select 
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-md focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none font-bold text-sm text-slate-900 transition-all shadow-inner disabled:opacity-50"
                >
                  <option value="Software / General Issue">Software / General Issue</option>
                  {assignedAssets.map((dbAsset) => (
                    <option key={dbAsset.id} value={`${dbAsset.name} (${dbAsset.id})`}>
                      {dbAsset.name} ({dbAsset.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">Notes / Description</label>
                <textarea 
                  required 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                  rows={3} 
                  placeholder="Please provide details about what happened..." 
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-md focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none resize-none font-medium text-sm text-slate-900 transition-all shadow-inner placeholder:text-slate-400 disabled:opacity-50"
                ></textarea>
              </div>

              {/* FILE UPLOAD DRAG & DROP */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">Attach Screenshot (Optional)</label>
                <div className="relative border-2 border-dashed border-purple-200/60 bg-purple-50/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:bg-purple-50/80 hover:border-purple-400 transition-all cursor-pointer group shadow-inner disabled:opacity-50 disabled:cursor-not-allowed">
                  <div className="bg-white/80 text-purple-600 p-3 rounded-2xl mb-3 shadow-sm border border-purple-100 group-hover:scale-110 transition-transform">
                    <UploadCloud size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {file ? file.name : "Click to upload or drag & drop"}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-2">PNG, JPG, or PDF (max 5MB)</p>
                  <input 
                    type="file" 
                    disabled={isSubmitting}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 py-3.5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest bg-purple-600 text-white hover:bg-purple-700 rounded-2xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}