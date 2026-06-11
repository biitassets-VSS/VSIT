'use client';

import React, { useState } from 'react';
import { 
  Ticket, Search, X, Clock, CheckCircle2, 
  AlertCircle, AlertTriangle, Laptop, User, 
  MessageSquare, BellRing, Timer, Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// STRICT TYPESCRIPT INTERFACE
interface TicketRecord {
  id: number;
  token: string;
  assetName: string;
  tagId: string;
  staff: string;
  issue: string;
  status: 'Open' | 'Reviewed' | 'Closed';
  raisedAt: string;
  closedAt: string | null;
  adminNotes: string;
  eta: string | null; // Wait time (15m, 30m, 1h, etc.)
  imageUrl: string | null;
}

// MOCK DATA
const initialTickets: TicketRecord[] = [
  {
    id: 1,
    token: 'TKT-8492',
    assetName: 'MacBook Pro M2',
    tagId: 'TAG-1001',
    staff: 'Lakhwinder Singh (EMP-001)',
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
    staff: 'Jane Smith (EMP-002)',
    issue: 'Monitor keeps flickering when connected via HDMI.',
    status: 'Reviewed',
    raisedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    closedAt: null,
    adminNotes: '',
    eta: '30 Minutes', // Admin already reviewed this one
    imageUrl: null
  }
];

const ETA_OPTIONS = ['15 Minutes', '20 Minutes', '30 Minutes', '45 Minutes', '1 Hour'];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>(initialTickets);
  const [activeTab, setActiveTab] = useState<'All' | 'Open' | 'Reviewed' | 'Closed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [selectedETA, setSelectedETA] = useState('');

  const openTicketsCount = tickets.filter(t => t.status === 'Open').length;

  const getSLAStatus = (raisedAt: string, status: string, eta: string | null) => {
    if (status === 'Closed') return { color: 'bg-gray-100 text-gray-600 border-gray-200', text: 'Resolved', icon: <CheckCircle2 size={14}/> };
    if (status === 'Reviewed') return { color: 'bg-purple-50 text-purple-700 border-purple-200', text: `Wait: ${eta}`, icon: <Timer size={14}/> };
    
    const hoursOpen = (Date.now() - new Date(raisedAt).getTime()) / (1000 * 60 * 60);
    if (hoursOpen > 48) return { color: 'bg-red-50 text-red-700 border-red-200', text: 'Overdue (>48h)', icon: <AlertTriangle size={14}/> };
    if (hoursOpen > 24) return { color: 'bg-orange-50 text-orange-700 border-orange-200', text: 'Warning (>24h)', icon: <AlertCircle size={14}/> };
    return { color: 'bg-blue-50 text-blue-700 border-blue-200', text: 'New (<24h)', icon: <Clock size={14}/> };
  };

  const handleSetETA = () => {
    if (!selectedTicket || !selectedETA) return;
    setTickets(tickets.map(t => 
      t.id === selectedTicket.id ? { ...t, status: 'Reviewed', eta: selectedETA } : t
    ));
    setSelectedTicket(null); // Close modal
    setSelectedETA('');
  };

  const handleCloseTicket = () => {
    if (!selectedTicket) return;
    setTickets(tickets.map(t => 
      t.id === selectedTicket.id ? { 
        ...t, 
        status: 'Closed', 
        closedAt: new Date().toISOString(), 
        adminNotes: resolutionNote || 'Resolved by Admin.' 
      } : t
    ));
    setSelectedTicket(null);
    setResolutionNote('');
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.token.toLowerCase().includes(searchQuery.toLowerCase()) || t.assetName.toLowerCase().includes(searchQuery.toLowerCase()) || t.staff.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All' ? true : t.status === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ALERTS */}
      <AnimatePresence>
        {openTicketsCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full text-red-600 animate-pulse"><BellRing size={20} /></div>
              <div>
                <h3 className="text-red-800 font-bold text-sm">Action Required</h3>
                <p className="text-red-600 text-xs font-medium">You have {openTicketsCount} new support tickets waiting for a wait time or resolution.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Ticket className="text-orange-600"/> Helpdesk Tickets</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Review staff issues, assign wait times, and close resolved tickets.</p>
        </div>
      </div>

      {/* FILTERS & TABS */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-2 pl-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 w-full lg:w-96">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Token or Staff..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400" 
          />
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto">
          {['All', 'Open', 'Reviewed', 'Closed'].map((tab) => {
            const count = tab === 'All' ? tickets.length : tickets.filter(t => t.status === tab).length;
            return (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`flex-1 lg:w-auto px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab} 
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-600'}`}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* TICKETS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">No tickets found in this view.</div>
          ) : (
            filteredTickets.map((ticket) => {
              const sla = getSLAStatus(ticket.raisedAt, ticket.status, ticket.eta);
              return (
                <div key={ticket.id} className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 hover:bg-gray-50 transition-all">
                  <div className="flex items-start gap-4 w-full">
                    <div className={`p-3 rounded-xl shrink-0 ${ticket.status === 'Closed' ? 'bg-gray-100 text-gray-500' : 'bg-orange-50 text-orange-600'}`}>
                      <Ticket size={24} />
                    </div>
                    <div className="w-full">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-black text-gray-900">{ticket.token}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border flex items-center gap-1 ${sla.color}`}>
                          {sla.icon} {sla.text}
                        </span>
                        {ticket.imageUrl && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md flex items-center gap-1"><Paperclip size={10}/> Image</span>}
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm">{ticket.assetName} <span className="text-gray-400 font-normal ml-1">({ticket.staff})</span></h4>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-1">{ticket.issue}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedTicket(ticket)} 
                    className={`shrink-0 w-full lg:w-auto px-5 py-2.5 rounded-xl transition-all font-bold text-sm shadow-sm ${ticket.status === 'Open' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {ticket.status === 'Open' ? 'Review & Act' : 'View Details'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ADMIN ACTION MODAL */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-900">Manage Ticket <span className="text-orange-600 ml-2">{selectedTicket.token}</span></h2>
                <button onClick={() => setSelectedTicket(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Staff Issue */}
                <div>
                  <p className="text-sm text-gray-700 font-bold mb-2 flex items-center gap-1.5"><User size={16} className="text-gray-400"/> Reported by {selectedTicket.staff}</p>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-900 font-medium text-sm leading-relaxed">
                    "{selectedTicket.issue}"
                  </div>
                  {selectedTicket.imageUrl && (
                    <img src={selectedTicket.imageUrl} alt="Attachment" className="mt-3 max-h-48 rounded-lg border border-gray-200 shadow-sm" />
                  )}
                </div>

                {/* IF NOT CLOSED, SHOW ADMIN ACTIONS */}
                {selectedTicket.status !== 'Closed' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                    
                    {/* OPTION 1: SET WAIT TIME */}
                    <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                      <h3 className="font-bold text-purple-900 flex items-center gap-2 mb-2"><Timer size={18}/> 1. Set Wait Time</h3>
                      <p className="text-xs text-purple-700 mb-3">Notify the staff member that you have reviewed the ticket and give them an ETA.</p>
                      <select 
                        value={selectedETA} onChange={(e) => setSelectedETA(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-purple-200 text-sm mb-3 outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select Wait Time...</option>
                        {ETA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <button 
                        onClick={handleSetETA} disabled={!selectedETA}
                        className="w-full py-2.5 bg-purple-600 disabled:bg-purple-300 text-white font-bold rounded-xl text-sm transition-all"
                      >
                        Notify Staff
                      </button>
                    </div>

                    {/* OPTION 2: CLOSE TICKET */}
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                      <h3 className="font-bold text-green-900 flex items-center gap-2 mb-2"><CheckCircle2 size={18}/> 2. Close Ticket</h3>
                      <p className="text-xs text-green-700 mb-3">If the issue is already resolved, add a note and close it directly.</p>
                      <textarea 
                        value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="Resolution notes..." rows={2}
                        className="w-full p-2.5 rounded-xl border border-green-200 text-sm mb-3 outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      ></textarea>
                      <button 
                        onClick={handleCloseTicket}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-all"
                      >
                        Mark as Resolved
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-green-50 p-4 rounded-xl text-green-900 font-bold text-sm border border-green-200 flex flex-col gap-2">
                    <span className="flex items-center gap-2"><CheckCircle2 size={18}/> Ticket Closed</span>
                    <span className="font-medium">Notes: {selectedTicket.adminNotes}</span>
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
