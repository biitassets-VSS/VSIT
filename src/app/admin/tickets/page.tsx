'use client';

import React, { useState } from 'react';
import { 
  Ticket, Plus, X, Clock, CheckCircle2, 
  MessageSquare, Laptop, AlertCircle, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data: Assets currently assigned to this specific Staff Member
const myAssignedAssets = [
  { id: 'TAG-1001', name: 'MacBook Pro M2' },
  { id: 'TAG-1004', name: 'Logitech MX Master 3' }
];

// Mock Data: Tickets raised by this specific Staff Member
const initialMyTickets = [
  {
    id: 1,
    token: 'TKT-8492',
    assetName: 'MacBook Pro M2',
    tagId: 'TAG-1001',
    issue: 'Battery is swelling and trackpad is hard to click.',
    status: 'Open',
    raisedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(), 
    closedAt: null,
    adminNotes: ''
  },
  {
    id: 3,
    token: 'TKT-7721',
    assetName: 'Logitech MX Master 3',
    tagId: 'TAG-1004',
    issue: 'Scroll wheel is completely broken.',
    status: 'Closed',
    raisedAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    adminNotes: 'We have approved a replacement. Please pick up the new mouse from IT.'
  }
];

export default function StaffTicketsPage() {
  const [tickets, setTickets] = useState(initialMyTickets);
  const [activeTab, setActiveTab] = useState<'All' | 'Open' | 'Closed'>('All');
  
  // Modal State
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({ assetId: '', issue: '' });

  // Handle Form Submission (Raising a ticket)
  const handleRaiseTicket = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedAsset = myAssignedAssets.find(a => a.id === formData.assetId);
    if (!selectedAsset) return;

    const newTicket = {
      id: Date.now(),
      token: `TKT-${Math.floor(Math.random() * 9000) + 1000}`, // Generate random token
      assetName: selectedAsset.name,
      tagId: selectedAsset.id,
      issue: formData.issue,
      status: 'Open',
      raisedAt: new Date().toISOString(),
      closedAt: null,
      adminNotes: ''
    };

    setTickets([newTicket, ...tickets]);
    setIsRaiseModalOpen(false);
    setFormData({ assetId: '', issue: '' }); // Reset form
  };

  // Format Date Safely
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Filter Tickets
  const filteredTickets = tickets.filter(t => activeTab === 'All' ? true : t.status === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Ticket className="text-orange-600"/> My IT Tickets</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Report broken assets or request repairs from the Admin team.</p>
        </div>
        <button 
          onClick={() => setIsRaiseModalOpen(true)} 
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-sm transition-all"
        >
          <Plus size={18} /> Raise Ticket
        </button>
      </div>

      {/* TABS */}
      <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        {['All', 'Open', 'Closed'].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab as any)} 
            className={`flex-1 sm:flex-none sm:w-32 py-2 px-4 text-sm font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TICKETS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <CheckCircle2 size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-bold">You have no {activeTab === 'All' ? '' : activeTab.toLowerCase()} tickets.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50 transition-all">
                
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${ticket.status === 'Open' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Ticket size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-gray-900">{ticket.token}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border flex items-center gap-1 ${ticket.status === 'Open' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {ticket.status === 'Open' ? <Clock size={12}/> : <CheckCircle2 size={12}/>} 
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm">{ticket.assetName}</h4>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-1">{ticket.issue}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setViewTicket(ticket)} 
                  className="w-full md:w-auto px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                >
                  View Updates
                </button>

              </div>
            ))
          )}
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        
        {/* 1. RAISE TICKET MODAL */}
        {isRaiseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-900">Raise Support Ticket</h2>
                <button onClick={() => setIsRaiseModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20}/></button>
              </div>

              <form onSubmit={handleRaiseTicket} className="p-6 space-y-5">
                
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-sm font-medium">
                  <AlertCircle size={20} className="shrink-0 text-blue-500" />
                  <p>Admins will review this ticket and contact you. Please provide clear details about the issue.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Laptop size={16} className="text-orange-500"/> Which Asset has an issue?</label>
                  <select 
                    required 
                    value={formData.assetId} 
                    onChange={(e) => setFormData({...formData, assetId: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white font-medium"
                  >
                    <option value="" disabled>Select an assigned asset...</option>
                    {myAssignedAssets.map(asset => (
                      <option key={asset.id} value={asset.id}>{asset.name} ({asset.id})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><MessageSquare size={16} className="text-orange-500"/> Describe the problem</label>
                  <textarea 
                    required 
                    value={formData.issue}
                    onChange={(e) => setFormData({...formData, issue: e.target.value})}
                    placeholder="e.g. The screen flickers every 10 minutes..." 
                    rows={4} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none resize-none font-medium text-sm"
                  ></textarea>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsRaiseModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 rounded-xl shadow-sm">
                    <Send size={18} /> Submit Ticket
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}

        {/* 2. VIEW TICKET DETAILS MODAL */}
        {viewTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewTicket(null)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-gray-900">Ticket Record</h2>
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-xs font-black border border-orange-200">{viewTicket.token}</span>
                </div>
                <button onClick={() => setViewTicket(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20}/></button>
              </div>

              <div className="p-6 space-y-6">
                
                <div>
                  <h3 className="font-black text-lg text-gray-900">{viewTicket.assetName}</h3>
                  <p className="text-sm font-medium text-gray-500">Asset Tag: {viewTicket.tagId}</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><Clock size={12}/> Reported On</p>
                  <p className="text-sm font-bold text-gray-900">{formatDate(viewTicket.raisedAt)}</p>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-bold mb-1">Your Issue Description:</p>
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">{viewTicket.issue}</p>
                  </div>
                </div>

                {/* If ticket is resolved, show Admin's notes */}
                {viewTicket.status === 'Closed' ? (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      <p className="text-sm font-bold text-green-900">Resolved by Admin</p>
                    </div>
                    <p className="text-sm font-medium text-green-800">{viewTicket.adminNotes}</p>
                    <p className="text-xs font-bold text-green-600 mt-3 border-t border-green-200/50 pt-2">Closed on: {formatDate(viewTicket.closedAt)}</p>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-3">
                    <Clock size={20} className="text-orange-500 shrink-0" />
                    <p className="text-sm font-bold text-orange-800">This ticket is currently open. An admin will review it shortly.</p>
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
