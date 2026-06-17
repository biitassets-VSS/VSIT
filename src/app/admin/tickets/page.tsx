'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ticket, Search, Clock, CheckCircle2, 
  AlertCircle, MessageSquare, ArrowLeft, 
  User, ShieldAlert, Tag, Filter, Send
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
  status: 'Open' | 'In Progress' | 'Resolved';
  submittedBy: string;
  empCode: string;
  date: string;
  replies: TicketReply[];
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'In Progress' | 'Resolved'>('All');
  
  // Admin Action State
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState<'Open' | 'In Progress' | 'Resolved'>('Open');

  useEffect(() => {
    // Simulated Ticket Data
    setTickets([
      {
        id: 'TKT-9021',
        title: 'Laptop Screen Flickering',
        description: 'My Dell XPS 15 screen randomly flickers when connected to the charger. I have tried restarting but the issue persists. Please help.',
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
        description: 'Hi, I need access to Adobe Photoshop and Illustrator for the new marketing campaign. Can this be approved?',
        priority: 'Medium',
        status: 'In Progress',
        submittedBy: 'Priya Desai',
        empCode: 'EMP-2099',
        date: '2023-10-24',
        replies: [
          {
            id: 'R-1',
            sender: 'Admin',
            name: 'IT Support',
            text: 'We have requested the license from procurement. Should be active by tomorrow.',
            date: '2023-10-24 14:30'
          }
        ]
      },
      {
        id: 'TKT-9010',
        title: 'Mouse scroll wheel broken',
        description: 'The scroll wheel on my Logitech mouse is completely loose and not registering scrolls.',
        priority: 'Low',
        status: 'Resolved',
        submittedBy: 'Amit Patel',
        empCode: 'EMP-088',
        date: '2023-10-20',
        replies: [
          {
            id: 'R-2',
            sender: 'Admin',
            name: 'IT Support',
            text: 'A replacement mouse has been assigned and placed on your desk.',
            date: '2023-10-21 09:00'
          }
        ]
      }
    ]);
  }, []);

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setReplyText('');
    setViewState('detail');
  };

  const handleUpdateTicket = () => {
    if (!selectedTicket) return;

    const updatedTicket = { ...selectedTicket, status: newStatus };
    
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
    alert(`Ticket ${selectedTicket.id} updated successfully.`);
  };

  // Filter Logic
  const filteredTickets = tickets.filter(t => filterStatus === 'All' || t.status === filterStatus);

  // Stats
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
          <p className="text-sm font-medium text-gray-500 mt-1">Manage and resolve staff hardware and software issues.</p>
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

      {/* ========================================== */}
      {/* VIEW: TICKET LIST                          */}
      {/* ========================================== */}
      {viewState === 'list' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Controls Bar */}
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              <Filter size={16} className="text-gray-400" />
              {['All', 'Open', 'In Progress', 'Resolved'].map(status => (
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
            
            <div className="relative w-full sm:w-auto">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input type="text" placeholder="Search Tickets..." className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-teal-500" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Issue & ID</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase hidden sm:table-cell">Staff</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Priority</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 font-bold">
                      <CheckCircle2 size={32} className="mx-auto mb-3 text-gray-300" />
                      No tickets found for this status.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-gray-50 hover:bg-teal-50/30 transition-colors group">
                      <td className="p-4">
                        <div className="font-black text-sm text-gray-900 truncate max-w-[200px] sm:max-w-xs">{ticket.title}</div>
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
                        <span className={`text-[11px] px-2 py-1 rounded-md font-black uppercase tracking-wider border ${
                          ticket.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                          ticket.priority === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs font-black">
                          {ticket.status === 'Open' && <AlertCircle size={14} className="text-red-500" />}
                          {ticket.status === 'In Progress' && <Clock size={14} className="text-blue-500" />}
                          {ticket.status === 'Resolved' && <CheckCircle2 size={14} className="text-green-500" />}
                          <span className={
                            ticket.status === 'Open' ? 'text-red-600' : 
                            ticket.status === 'In Progress' ? 'text-blue-600' : 
                            'text-green-600'
                          }>{ticket.status}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => openTicket(ticket)} className="px-4 py-2 bg-gray-900 hover:bg-teal-600 text-white text-xs font-black rounded-lg transition-colors shadow-sm">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW: TICKET DETAILS & CHAT                */}
      {/* ========================================== */}
      {viewState === 'detail' && selectedTicket && (
        <div className="space-y-6">
          <button onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Tickets
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT: TICKET INFO & THREAD */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Ticket Main Info */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-xs font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg border border-teal-100 uppercase tracking-wider mb-3 inline-block flex items-center gap-1 w-max">
                      <Tag size={12}/> {selectedTicket.id}
                    </span>
                    <h2 className="text-2xl font-black text-gray-900">{selectedTicket.title}</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-bold text-gray-500 flex items-center gap-1"><User size={14}/> {selectedTicket.submittedBy} ({selectedTicket.empCode})</span>
                      <span className="text-sm font-bold text-gray-400 flex items-center gap-1"><Clock size={14}/> {selectedTicket.date}</span>
                    </div>
                  </div>
                  
                  {/* Badges */}
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-md font-black uppercase tracking-wider border ${
                      selectedTicket.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                      selectedTicket.priority === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      {selectedTicket.priority} Priority
                    </span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-md font-black uppercase tracking-wider border ${
                      selectedTicket.status === 'Open' ? 'bg-red-50 text-red-600 border-red-100' :
                      selectedTicket.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      'bg-green-50 text-green-600 border-green-100'
                    }`}>
                      Status: {selectedTicket.status}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-black text-gray-900 mb-2">Issue Description</h3>
                  <p className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    {selectedTicket.description}
                  </p>
                </div>
              </div>

              {/* Replies/Thread */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                  <MessageSquare size={20} className="text-teal-600" /> Communication Log
                </h3>

                <div className="space-y-4">
                  {selectedTicket.replies.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 font-bold text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      No replies yet. Start the conversation.
                    </div>
                  ) : (
                    selectedTicket.replies.map(reply => (
                      <div key={reply.id} className={`flex flex-col ${reply.sender === 'Admin' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[11px] font-black text-gray-500 uppercase">{reply.name}</span>
                          <span className="text-[10px] font-bold text-gray-400">{reply.date}</span>
                        </div>
                        <div className={`p-4 rounded-2xl max-w-[85%] text-sm font-medium shadow-sm border ${
                          reply.sender === 'Admin' 
                            ? 'bg-teal-50 border-teal-100 text-teal-900 rounded-tr-sm' 
                            : 'bg-white border-gray-200 text-gray-800 rounded-tl-sm'
                        }`}>
                          {reply.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: ACTION PANEL */}
            <div className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-6">
                <h3 className="text-lg font-black text-gray-900 mb-6 border-b border-gray-100 pb-3">Update Ticket</h3>
                
                <div className="space-y-5">
                  {/* Status Change */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Change Status</label>
                    <select 
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 appearance-none"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  {/* Add Reply */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Add Note / Reply</label>
                    <textarea 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a response to the staff member..."
                      className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      rows={4}
                    />
                  </div>

                  {/* Submit Action */}
                  <button 
                    onClick={handleUpdateTicket}
                    className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                  >
                    <Send size={18} /> Update Ticket
                  </button>
                </div>

                {/* Priority Warning */}
                {selectedTicket.priority === 'High' && selectedTicket.status !== 'Resolved' && (
                  <div className="mt-6 bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                    <ShieldAlert size={18} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs font-bold text-red-800 leading-relaxed">
                      This is a high-priority ticket. Please ensure it is resolved within SLA timelines.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
