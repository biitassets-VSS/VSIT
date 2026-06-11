'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ticket, Search, X, Clock, CheckCircle2, 
  AlertCircle, AlertTriangle, Laptop, User, 
  MessageSquare, BellRing, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data for Tickets
const initialTickets = [
  {
    id: 1,
    token: 'TKT-8492',
    assetName: 'MacBook Pro M2',
    tagId: 'TAG-1001',
    staff: 'John Doe (EMP-001)',
    issue: 'Battery is swelling and trackpad is hard to click.',
    status: 'Open',
    raisedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(), // 49 hours ago (Red)
    closedAt: null,
    adminNotes: ''
  },
  {
    id: 2,
    token: 'TKT-9103',
    assetName: 'Dell UltraSharp 27"',
    tagId: 'TAG-1002',
    staff: 'Jane Smith (EMP-002)',
    issue: 'Monitor keeps flickering when connected via HDMI.',
    status: 'Open',
    raisedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago (Green)
    closedAt: null,
    adminNotes: ''
  },
  {
    id: 3,
    token: 'TKT-7721',
    assetName: 'Logitech MX Master 3',
    tagId: 'TAG-1004',
    staff: 'Alex Johnson (EMP-003)',
    issue: 'Scroll wheel is broken.',
    status: 'Closed',
    raisedAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    adminNotes: 'Replaced with a new mouse from inventory.'
  }
];

type TicketStatus = 'Open' | 'Closed';

export default function TicketsPage() {
  const [tickets, setTickets] = useState(initialTickets);
  const [activeTab, setActiveTab] = useState<'All' | TicketStatus>('Open');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // 1. Calculate Open Tickets for Alert Notification
  const openTicketsCount = tickets.filter(t => t.status === 'Open').length;

  // 2. Color Grade System (SLA based on time open)
  const getSLAStatus = (raisedAt: string, status: string) => {
    if (status === 'Closed') return { color: 'bg-gray-100 text-gray-600 border-gray-200', text: 'Resolved', icon: <CheckCircle size={14}/> };
    
    const hoursOpen = (Date.now() - new Date(raisedAt).getTime()) / (1000 * 60 * 60);
    
    if (hoursOpen > 48) return { color: 'bg-red-50 text-red-700 border-red-200', text: 'Overdue (>48h)', icon: <AlertTriangle size={14}/> };
    if (hoursOpen > 24) return { color: 'bg-orange-50 text-orange-700 border-orange-200', text: 'Warning (>24h)', icon: <AlertCircle size={14}/> };
    return { color: 'bg-green-50 text-green-700 border-green-200', text: 'New (<24h)', icon: <Clock size={14}/> };
  };

  // 3. Format Date safely
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // 4. Close Ticket Action
  const handleCloseTicket = (id: number) => {
    setTickets(tickets.map(t => 
      t.id === id ? { 
        ...t, 
        status: 'Closed', 
        closedAt: new Date().toISOString(), 
        adminNotes: resolutionNote || 'Resolved by Admin.' 
      } : t
    ));
    setSelectedTicket(null);
    setResolutionNote('');
  };

  // Filter Logic
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.token.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.staff.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All' ? true : t.status === activeTab;
    return matchesSearch && matchesTab;
  });

  // Simulate Staff Member raising a new ticket (For testing the notification)
  const simulateNewTicket = () => {
    const newToken = `TKT-${Math.floor(Math.random() * 9000) + 1000}`;
    const newTicket = {
      id: Date.now(),
      token: newToken,
      assetName: 'ThinkPad T14',
      tagId: 'TAG-1003',
      staff: 'New Employee (EMP-005)',
      issue: 'Keyboard is typing multiple letters at once.',
      status: 'Open',
      raisedAt: new Date().toISOString(),
      closedAt: null,
      adminNotes: ''
    };
    setTickets([newTicket, ...tickets]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ALERTS & NOTIFICATIONS */}
      <AnimatePresence>
        {openTicketsCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full text-red-600 animate-pulse">
                <BellRing size={20} />
              </div>
              <div>
                <h3 className="text-red-800 font-bold text-sm">Action Required</h3>
                <p className="text-red-600 text-xs font-medium">You have {openTicketsCount} open support tickets requiring admin review.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Ticket className="text-orange-600"/> Helpdesk Tickets</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage, review, and resolve asset issues reported by staff.</p>
        </div>
        
        {/* Testing Button - You can remove this later! */}
        <button onClick={simulateNewTicket} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all border border-gray-200">
          + Simulate Staff Ticket
        </button>
      </div>

      {/* FILTERS & TABS */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-2 pl-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 w-full lg:w-96">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Token (e.g. TKT-1001) or Staff..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400" 
          />
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto">
          {['Open', 'Closed', 'All'].map((tab) => {
            const count = tab === 'All' ? tickets.length : tickets.filter(t => t.status === tab).length;
            return (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`flex-1 lg:w-32 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
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
              const sla = getSLAStatus(ticket.raisedAt, ticket.status);
              
              return (
                <div key={ticket.id} className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 hover:bg-gray-50 transition-all">
                  
                  <div className="flex items-start gap-4 w-full">
                    <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl text-orange-600 shrink-0">
                      <Ticket size={24} />
                    </div>
                    <div className="w-full">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-black text-gray-900">{ticket.token}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border flex items-center gap-1 ${sla.color}`}>
                          {sla.icon} {sla.text}
                        </span>
                        {ticket.status === 'Closed' && (
                           <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-md border border-gray-200">Closed</span>
                        )}
                      </div>
                      
                      <h4 className="font-bold text-gray-800 text-sm">{ticket.assetName}</h4>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-1">{ticket.issue}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-400 mt-3">
                        <span className="flex items-center gap-1"><User size={12}/> {ticket.staff}</span>
                        <span className="flex items-center gap-1"><Clock size={12}/> Raised: {formatDate(ticket.raisedAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedTicket(ticket)} 
                    className={`shrink-0 w-full lg:w-auto px-5 py-2.5 rounded-xl transition-all font-bold text-sm shadow-sm ${ticket.status === 'Open' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {ticket.status === 'Open' ? 'Review Ticket' : 'View Record'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* TICKET REVIEW MODAL */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTicket(null)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-gray-900">Ticket Details</h2>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-sm font-black border border-orange-200 tracking-wider">
                    {selectedTicket.token}
                  </span>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-100 bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><User size={12}/> Raised By Staff</p>
                    <p className="text-sm font-bold text-gray-900">{selectedTicket.staff}</p>
                  </div>
                  <div className="border border-gray-100 bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><Laptop size={12}/> Asset Tag</p>
                    <p className="text-sm font-bold text-gray-900">{selectedTicket.assetName} ({selectedTicket.tagId})</p>
                  </div>
                  <div className="border border-gray-100 bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><Clock size={12}/> Time Raised</p>
                    <p className="text-sm font-bold text-gray-900">{formatDate(selectedTicket.raisedAt)}</p>
                  </div>
                  <div className="border border-gray-100 bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><CheckCircle2 size={12}/> Time Closed</p>
                    <p className="text-sm font-bold text-gray-900">{formatDate(selectedTicket.closedAt)}</p>
                  </div>
                </div>

                {/* Issue Description */}
                <div>
                  <p className="text-sm text-gray-700 font-bold mb-2 flex items-center gap-1.5"><MessageSquare size={16} className="text-orange-500"/> Issue Described</p>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-900 font-medium text-sm leading-relaxed">
                    "{selectedTicket.issue}"
                  </div>
                </div>

                {/* Admin Resolution Area */}
                {selectedTicket.status === 'Open' ? (
                  <div className="border-t border-gray-100 pt-6">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-2">
                      <CheckCircle2 size={16} className="text-green-500"/> Resolution Notes (Visible to Staff)
                    </label>
                    <textarea 
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="e.g. Asset has been picked up for repair, and a temporary laptop was assigned..." 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none"
                      rows={3}
                    ></textarea>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-700 font-bold mb-2 flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500"/> Admin Resolution</p>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-green-900 font-bold text-sm leading-relaxed">
                      {selectedTicket.adminNotes}
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION FOOTER */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setSelectedTicket(null)} className="px-5 py-2.5 text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
                  Close Window
                </button>
                {selectedTicket.status === 'Open' && (
                  <button 
                    onClick={() => handleCloseTicket(selectedTicket.id)}
                    className="px-6 py-2.5 flex items-center gap-2 text-sm font-bold bg-green-600 text-white hover:bg-green-700 rounded-xl shadow-sm transition-all"
                  >
                    <CheckCircle2 size={18} /> Mark as Resolved
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
