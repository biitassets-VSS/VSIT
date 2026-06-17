'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ticket, Search, Clock, CheckCircle2, 
  AlertCircle, MessageSquare, ArrowLeft, 
  User, ShieldAlert, Tag, Filter, Send, Timer, PauseCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
interface TicketReply {
  id: string;
  sender: 'Admin' | 'Staff';
  name: string;
  text: string;
  date: string;
}

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Hold';
  estimatedTime?: string; // NEW ETA FIELD
  submittedBy: string;
  empCode: string;
  date: string;
  replies: TicketReply[];
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'In Progress' | 'Hold' | 'Resolved'>('All');
  
  // Admin Action State
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState<'Open' | 'In Progress' | 'Hold' | 'Resolved'>('Open');
  const [eta, setEta] = useState<string>('');

  useEffect(() => {
    setTickets([
      {
        id: 'TKT-9021',
        title: 'Laptop Screen Flickering',
        description: 'My Dell XPS 15 screen randomly flickers when connected to the charger.',
        priority: 'High',
        status: 'Open',
        submittedBy: 'Rahul Sharma',
        empCode: 'EMP-1042',
        date: new Date().toISOString().split('T')[0],
        replies: []
      },
      {
        id: 'TKT-9022',
        title: 'Need Adobe Creative Cloud Access',
        description: 'Hi, I need access to Adobe Photoshop and Illustrator for the new marketing campaign.',
        priority: 'Medium',
        status: 'In Progress',
        estimatedTime: '45 Min',
        submittedBy: 'Priya Desai',
        empCode: 'EMP-2099',
        date: '2023-10-24',
        replies: []
      }
    ]);
  }, []);

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setEta(ticket.estimatedTime || '');
    setReplyText('');
    setViewState('detail');
  };

  const handleUpdateTicket = () => {
    if (!selectedTicket) return;

    const updatedTicket = { 
      ...selectedTicket, 
      status: newStatus,
      estimatedTime: eta 
    };
    
    if (replyText.trim()) {
      updatedTicket.replies.push({
        id: Date.now().toString(),
        sender: 'Admin',
        name: 'IT Admin',
        text: replyText,
        date: new Date().toLocaleString()
      });
    }

    setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);
    setReplyText('');
    alert(`Ticket ${selectedTicket.id} updated! Notification sent to staff.`);
  };

  const filteredTickets = tickets.filter(t => filterStatus === 'All' || t.status === filterStatus);
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Ticket size={28} className="text-teal-600" />
            IT Support Tickets
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage and resolve staff issues. Set ETAs to keep them updated.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-center">
            <p className="text-xs font-bold text-red-600 uppercase">Open</p>
            <p className="text-lg font-black text-red-900">{openCount}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl text-center">
            <p className="text-xs font-bold text-blue-600 uppercase">In Progress</p>
            <p className="text-lg font-black text-blue-900">{inProgressCount}</p>
          </div>
        </div>
      </div>

      {viewState === 'list' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              <Filter size={16} className="text-gray-400" />
              {['All', 'Open', 'In Progress', 'Hold', 'Resolved'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-colors ${
                    filterStatus === status 
                      ? 'bg-gray-900 text-white shadow-sm' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Issue & ID</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase hidden sm:table-cell">Staff</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Status & ETA</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-gray-50 hover:bg-teal-50/30 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-sm text-gray-900 truncate max-w-[200px]">{ticket.title}</div>
                      <div className="text-[11px] font-bold text-teal-600 bg-teal-50 inline-flex items-center gap-1 px-2 py-0.5 rounded-md mt-1 border border-teal-100">
                        <Tag size={10} /> {ticket.id}
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <User size={14} className="text-gray-400"/> {ticket.submittedBy}
                      </div>
                      <div className="text-xs text-gray-500 font-medium ml-5">{ticket.empCode}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-black">
                          {ticket.status === 'Open' && <AlertCircle size={14} className="text-red-500" />}
                          {ticket.status === 'In Progress' && <Clock size={14} className="text-blue-500" />}
                          {ticket.status === 'Hold' && <PauseCircle size={14} className="text-orange-500" />}
                          {ticket.status === 'Resolved' && <CheckCircle2 size={14} className="text-green-500" />}
                          <span className={
                            ticket.status === 'Open' ? 'text-red-600' : 
                            ticket.status === 'In Progress' ? 'text-blue-600' : 
                            ticket.status === 'Hold' ? 'text-orange-600' : 'text-green-600'
                          }>{ticket.status}</span>
                        </div>
                        {ticket.estimatedTime && ticket.status !== 'Resolved' && (
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${ticket.estimatedTime === 'Hold' ? 'bg-orange-50 text-orange-700' : 'bg-teal-50 text-teal-700'}`}>
                             <Timer size={10}/> ETA: {ticket.estimatedTime}
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openTicket(ticket)} className="px-4 py-2 bg-gray-900 hover:bg-teal-600 text-white text-xs font-black rounded-lg transition-colors shadow-sm">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewState === 'detail' && selectedTicket && (
        <div className="space-y-6">
          <button onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Tickets
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT: TICKET INFO & THREAD */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">{selectedTicket.title}</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-bold text-gray-500 flex items-center gap-1"><User size={14}/> {selectedTicket.submittedBy}</span>
                    </div>
                  </div>
                  {selectedTicket.estimatedTime && selectedTicket.status !== 'Resolved' && (
                    <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-black text-xs uppercase ${selectedTicket.estimatedTime === 'Hold' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                      <Timer size={14}/> ETA: {selectedTicket.estimatedTime}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 mb-2">Description</h3>
                  <p className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    {selectedTicket.description}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: ACTION PANEL WITH ETA DROPDOWN */}
            <div className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-6">
                <h3 className="text-lg font-black text-gray-900 mb-6 border-b border-gray-100 pb-3">Update Ticket</h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Status</label>
                    <select 
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Hold">Hold</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  {/* ETA DROPDOWN ADDED HERE */}
                  {newStatus !== 'Resolved' && (
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Timer size={14}/> Resolution Time</label>
                      <select 
                        value={eta}
                        onChange={(e) => setEta(e.target.value)}
                        className="w-full bg-white border border-gray-200 text-teal-800 text-sm font-bold rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:border-teal-500"
                      >
                        <option value="">Select Time / Status</option>
                        <option value="10 Min">10 Min</option>
                        <option value="15 Min">15 Min</option>
                        <option value="30 Min">30 Min</option>
                        <option value="45 Min">45 Min</option>
                        <option value="1 Hour">1 Hour</option>
                        <option value="Hold">Hold (Paused)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Reply to Staff</label>
                    <textarea 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a response..."
                      className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                      rows={3}
                    />
                  </div>

                  <button 
                    onClick={handleUpdateTicket}
                    className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                  >
                    <Send size={18} /> Update & Notify Staff
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
