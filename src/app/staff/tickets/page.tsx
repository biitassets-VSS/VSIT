'use client';

import React, { useState } from 'react';
import { 
  Ticket, Plus, X, Clock, CheckCircle2, 
  MessageSquare, Laptop, Send, CalendarDays, 
  ImagePlus, Paperclip, Trash2, Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// STRICT TYPESCRIPT INTERFACE
interface TicketRecord {
  id: number;
  token: string;
  assetName: string;
  tagId: string;
  issue: string;
  status: 'Open' | 'Reviewed' | 'Closed';
  raisedAt: string;
  closedAt: string | null;
  adminNotes: string;
  eta: string | null;
  imageUrl: string | null; // Supports Image Attachments
}

const myAssignedAssets = [
  { id: 'TAG-1001', name: 'MacBook Pro M2' },
  { id: 'TAG-1004', name: 'Logitech MX Master 3' }
];

// MOCK DATA 
const initialMyTickets: TicketRecord[] = [
  {
    id: 1,
    token: 'TKT-8492',
    assetName: 'MacBook Pro M2',
    tagId: 'TAG-1001',
    issue: 'Battery is swelling and trackpad is hard to click.',
    status: 'Open',
    raisedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(), 
    closedAt: null,
    adminNotes: '',
    eta: null,
    imageUrl: null
  },
  {
    id: 2,
    token: 'TKT-9103',
    assetName: 'Dell UltraSharp 27"',
    tagId: 'TAG-1002',
    issue: 'Monitor keeps flickering.',
    status: 'Reviewed',
    raisedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    closedAt: null,
    adminNotes: '',
    eta: '30 Minutes', 
    imageUrl: null
  }
];

export default function StaffTicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>(initialMyTickets);
  const [activeTab, setActiveTab] = useState<'All' | 'Open' | 'Reviewed' | 'Closed'>('All');
  
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<TicketRecord | null>(null);
  
  const [formData, setFormData] = useState({ 
    assetId: '', 
    issue: '', 
    imagePreview: null as string | null 
  });

  // Handle Image Selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, imagePreview: URL.createObjectURL(file) });
    }
  };

  // Remove Selected Image
  const removeImage = () => {
    setFormData({ ...formData, imagePreview: null });
  };

  // Submit Ticket
  const handleRaiseTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedAsset = myAssignedAssets.find(a => a.id === formData.assetId);
    if (!selectedAsset) return;

    const newTicket: TicketRecord = {
      id: Date.now(),
      token: `TKT-${Math.floor(Math.random() * 9000) + 1000}`,
      assetName: selectedAsset.name,
      tagId: selectedAsset.id,
      issue: formData.issue,
      status: 'Open',
      raisedAt: new Date().toISOString(),
      closedAt: null,
      adminNotes: '',
      eta: null,
      imageUrl: formData.imagePreview // Include image in submission
    };

    setTickets([newTicket, ...tickets]);
    setIsRaiseModalOpen(false);
    setFormData({ assetId: '', issue: '', imagePreview: null }); 
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredTickets = tickets.filter(t => activeTab === 'All' ? true : t.status === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Ticket className="text-blue-600"/> My IT Tickets</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Raise a ticket to report broken assets. Admin will receive your request.</p>
        </div>
        <button onClick={() => setIsRaiseModalOpen(true)} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-md transition-all">
          <Plus size={20} /> RAISE TICKET
        </button>
      </div>

      {/* TABS */}
      <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        {['All', 'Open', 'Reviewed', 'Closed'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 sm:flex-none sm:w-32 py-2 px-4 text-sm font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* TICKET LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <CheckCircle2 size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-bold">You have no tickets here.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:bg-gray-50 transition-all">
                
                <div className="flex flex-col sm:flex-row items-start gap-4 w-full">
                  <div className={`p-4 rounded-xl shrink-0 hidden sm:block ${ticket.status === 'Closed' ? 'bg-gray-100 text-gray-500' : ticket.status === 'Reviewed' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Ticket size={28} />
                  </div>
                  <div className="w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-black text-lg text-gray-900">{ticket.token}</span>
                      
                      {/* STATUS BADGES */}
                      {ticket.status === 'Open' && <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg border flex items-center gap-1.5 bg-blue-50 text-blue-700 border-blue-200"><Clock size={14}/> Open</span>}
                      {ticket.status === 'Reviewed' && <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg border flex items-center gap-1.5 bg-purple-50 text-purple-700 border-purple-200 animate-pulse"><Timer size={14}/> Wait: {ticket.eta}</span>}
                      {ticket.status === 'Closed' && <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg border flex items-center gap-1.5 bg-green-50 text-green-700 border-green-200"><CheckCircle2 size={14}/> Closed</span>}
                      
                      {/* IMAGE BADGE */}
                      {ticket.imageUrl && (
                        <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg flex items-center gap-1">
                          <Paperclip size={12} /> Image attached
                        </span>
                      )}
                    </div>
                    
                    <h4 className="font-bold text-gray-800">{ticket.assetName}</h4>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><CalendarDays size={12}/> Reported: {formatDateTime(ticket.raisedAt)}</p>
                  </div>
                </div>
                
                <button onClick={() => setViewTicket(ticket)} className="w-full lg:w-auto shrink-0 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                  View Record
                </button>

              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        
        {/* RAISE TICKET MODAL WITH SCREENSHOT UPLOAD */}
        {isRaiseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-900">Raise Support Ticket</h2>
                <button onClick={() => setIsRaiseModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20}/></button>
              </div>

              <div className="overflow-y-auto p-6">
                <form id="raise-ticket-form" onSubmit={handleRaiseTicket} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Laptop size={16} className="text-blue-500"/> Which Asset has an issue?</label>
                    <select required value={formData.assetId} onChange={(e) => setFormData({...formData, assetId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-sm">
                      <option value="" disabled>Select an assigned asset...</option>
                      {myAssignedAssets.map(asset => <option key={asset.id} value={asset.id}>{asset.name} ({asset.id})</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><MessageSquare size={16} className="text-blue-500"/> Describe the problem</label>
                    <textarea required value={formData.issue} onChange={(e) => setFormData({...formData, issue: e.target.value})} placeholder="e.g. The screen flickers every 10 minutes..." rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium text-sm"></textarea>
                  </div>

                  {/* IMAGE UPLOAD SECTION */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><ImagePlus size={16} className="text-blue-500"/> Attach Screenshot <span className="text-gray-400 font-normal">(Optional)</span></label>
                    
                    {formData.imagePreview ? (
                      <div className="relative inline-block mt-2">
                        <img src={formData.imagePreview} alt="Preview" className="h-28 w-auto rounded-lg border border-gray-200 object-cover shadow-sm" />
                        <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full border border-red-200 hover:bg-red-200 shadow-sm transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-colors group">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Paperclip size={20} className="text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                            <p className="text-xs text-gray-500 font-medium">Click to upload a screenshot</p>
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                      </div>
                    )}
                  </div>

                </form>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button type="button" onClick={() => setIsRaiseModalOpen(false)} className="flex-1 py-3 text-sm font-bold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100">Cancel</button>
                <button type="submit" form="raise-ticket-form" className="flex-1 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"><Send size={18}/> Submit Ticket</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* VIEW TICKET DETAILS MODAL */}
        {viewTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewTicket(null)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-gray-900">Ticket Record</h2>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-black border border-blue-200">{viewTicket.token}</span>
                </div>
                <button onClick={() => setViewTicket(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* BIG ETA NOTIFICATION FOR STAFF */}
                {viewTicket.status === 'Reviewed' && (
                  <div className="bg-purple-600 text-white p-5 rounded-2xl shadow-md border border-purple-700 flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-full"><Timer size={28} className="text-white"/></div>
                    <div>
                      <h3 className="font-black text-lg">Admin has reviewed your ticket!</h3>
                      <p className="text-purple-100 text-sm font-medium mt-1">Estimated Wait Time: <span className="text-white font-black text-base">{viewTicket.eta}</span></p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-black text-lg text-gray-900">{viewTicket.assetName}</h3>
                  <p className="text-sm font-medium text-gray-500">Reported: {formatDateTime(viewTicket.raisedAt)}</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 font-bold mb-1">Your Issue Description:</p>
                  <p className="text-sm font-medium text-gray-800 leading-relaxed">{viewTicket.issue}</p>
                  
                  {/* DISPLAY UPLOADED SCREENSHOT */}
                  {viewTicket.imageUrl && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 font-bold mb-2 flex items-center gap-1"><Paperclip size={12}/> Attached Screenshot:</p>
                      <img src={viewTicket.imageUrl} alt="Issue Screenshot" className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-white shadow-sm" />
                    </div>
                  )}
                </div>

                {viewTicket.status === 'Closed' && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                    <p className="text-sm font-black text-green-900 flex items-center gap-2"><CheckCircle2 size={18} /> Resolved by Admin</p>
                    <p className="text-sm font-medium text-green-800 mt-2">{viewTicket.adminNotes}</p>
                  </div>
                )}
                
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
