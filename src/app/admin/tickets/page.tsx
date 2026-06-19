'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ticket, Search, Clock, CheckCircle2, 
  AlertCircle, MessageSquare, ArrowLeft, 
  User, ShieldAlert, Tag, Filter, Send, Timer, PauseCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

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
  estimatedTime?: string; 
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Admin Action State
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState<'Open' | 'In Progress' | 'Hold' | 'Resolved'>('Open');
  const [eta, setEta] = useState<string>('');

  // 1. FETCH TICKETS AND STAFF DATA FROM SUPABASE
  useEffect(() => {
    const fetchTicketsAndStaff = async () => {
      try {
        // Fetch all staff to map emp_code to their actual names
        const { data: staffData } = await supabase
          .from('staff')
          .select('emp_code, name');

        const staffMap: Record<string, string> = {};
        if (staffData) {
          staffData.forEach((staff: any) => {
            staffMap[staff.emp_code] = staff.name;
          });
        }

        // Fetch tickets
        const { data: ticketData, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (ticketData) {
          const mappedTickets: SupportTicket[] = ticketData.map((t: any) => ({
            id: t.id,
            title: t.subject || t.title || 'No Subject Provided', // Maps 'subject' from staff dashboard
            description: t.description || 'No description',
            priority: t.priority || 'Medium',
            status: t.status || 'Open',
            estimatedTime: t.waiting_time || '', // Maps correctly to waiting_time
            submittedBy: staffMap[t.emp_code] || 'Unknown User', // Automatically maps the real name!
            empCode: t.emp_code || 'N/A',
            date: t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : '',
            replies: t.replies || [] 
          }));
          setTickets(mappedTickets);
        }
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchTicketsAndStaff();
  }, []);

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setEta(ticket.estimatedTime || '');
    setReplyText('');
    setViewState('detail');
  };

  // 2. UPDATE TICKET IN SUPABASE
  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    setIsUpdating(true);

    const newReplies = [...(selectedTicket.replies || [])];
    
    if (replyText.trim()) {
      newReplies.push({
        id: Date.now().toString(),
        sender: 'Admin',
        name: 'IT Admin',
        text: replyText,
        date: new Date().toLocaleString()
      });
    }

    // THIS PAYLOAD NOW PERFECTLY MATCHES YOUR DATABASE
    const dbPayload = {
      status: newStatus,
      waiting_time: eta, // Safely targeting 'waiting_time'
      replies: newReplies
    };

    try {
      const { error } = await supabase
        .from('tickets')
        .update(dbPayload)
        .eq('id', selectedTicket.id);

      if (error) throw error;

      // Update local state to reflect changes instantly
      const updatedTicket = { 
        ...selectedTicket, 
        status: newStatus,
        estimatedTime: eta,
        replies: newReplies
      };

      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
      setReplyText('');
      
      // Notify Admin/Staff visually (Optional Alert)
      alert(`Ticket updated successfully!`);
    } catch (error: any) {
      console.error("Failed to update ticket:", error);
      alert("Failed to update ticket: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredTickets = tickets.filter(t => filterStatus === 'All' || t.status === filterStatus);
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;

  if (!isLoaded) return <div className="p-10 text-center font-bold text-gray-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin text-teal-600" size={24} /> Loading Support Tickets...</div>;

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
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 font-bold">No tickets found matching this filter.</td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-gray-50 hover:bg-teal-50/30 transition-colors">
                      <td className="p-4">
                        <div className="font-black text-sm text-gray-900 truncate max-w-[200px]" title={ticket.title}>{ticket.title}</div>
                        <div className="text-[11px] font-bold text-teal-600 bg-teal-50 inline-flex items-center gap-1 px-2 py-0.5 rounded-md mt-1 border border-teal-100">
                          <Tag size={10} /> {ticket.id.substring(0, 8).toUpperCase()}...
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
                  ))
                )}
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
                      <span className="text-sm font-bold text-gray-500 flex items-center gap-1"><User size={14}/> {selectedTicket.submittedBy} ({selectedTicket.empCode})</span>
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
                  <p className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-200 whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>
                
                {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2"><MessageSquare size={16} /> Conversation History</h3>
                    <div className="space-y-3">
                      {selectedTicket.replies.map((reply, idx) => (
                        <div key={idx} className={`p-4 rounded-2xl border text-sm ${reply.sender === 'Admin' ? 'bg-teal-50 border-teal-100 ml-8' : 'bg-gray-50 border-gray-100 mr-8'}`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-gray-900">{reply.name} <span className="text-xs text-gray-500 font-medium">({reply.sender})</span></span>
                            <span className="text-xs text-gray-400">{reply.date}</span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                    disabled={isUpdating}
                    className={`w-full py-3.5 font-black rounded-xl shadow-md transition-all flex justify-center items-center gap-2 ${isUpdating ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                  >
                    <Send size={18} /> {isUpdating ? 'Updating...' : 'Update Ticket'}
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