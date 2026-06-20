'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ticket, AlertCircle, Clock, CheckCircle2, 
  PauseCircle, ArrowLeft, MessageSquare, Send, 
  Tag, Timer, Loader2, User, ShieldAlert 
} from 'lucide-react';
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
  status: 'Open' | 'In Progress' | 'Resolved' | 'Hold';
  estimatedTime?: string; 
  date: string;
  replies: TicketReply[];
}

export default function StaffTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Staff User Context
  const [staffName, setStaffName] = useState('Staff Member');
  const [empCode, setEmpCode] = useState('');
  
  // Reply State
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. FETCH PROFILE AND TICKETS
  useEffect(() => {
    const fetchMyTickets = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || localStorage.getItem('userEmail');

        if (!userEmail) {
          setIsLoaded(true);
          return;
        }

        // Fetch bulletproof profile to get the correct emp_code
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();

        const currentName = profile?.full_name || profile?.name || localStorage.getItem('userName') || 'Staff Member';
        const currentEmpCode = profile?.emp_code || profile?.employee_code || 'N/A';
        
        setStaffName(currentName);
        setEmpCode(currentEmpCode);

        // Fetch tickets matching this emp_code
        if (currentEmpCode !== 'N/A') {
          const { data: ticketData, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('emp_code', currentEmpCode)
            .order('created_at', { ascending: false });

          if (error) throw error;

          if (ticketData) {
            setTickets(ticketData.map((t: any) => ({
              id: t.id,
              title: t.subject || t.title || 'No Subject',
              description: t.description || 'No description provided.',
              status: t.status || 'Open',
              estimatedTime: t.waiting_time || '', // Perfect match to your database
              date: t.created_at ? new Date(t.created_at).toLocaleDateString() : '',
              replies: t.replies || []
            })));
          }
        }
      } catch (err) {
        console.error("Error fetching my tickets:", err);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchMyTickets();
  }, []);

  // 2. SUBMIT A REPLY TO THE ADMIN
  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setIsSubmitting(true);

    const newReplies = [...(selectedTicket.replies || [])];
    
    newReplies.push({
      id: Date.now().toString(),
      sender: 'Staff',
      name: staffName,
      text: replyText.trim(),
      date: new Date().toLocaleString()
    });

    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({ replies: newReplies })
        .eq('id', selectedTicket.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
         throw new Error("Could not update. Check database permissions.");
      }

      // Update local state
      const updatedTicket = { ...selectedTicket, replies: newReplies };
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
      setReplyText('');

    } catch (error: any) {
      console.error("Failed to send reply:", error);
      alert("Failed to send reply: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="p-10 text-center font-bold text-gray-500 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin text-teal-600" size={24} /> Loading My Tickets...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">
      
      {/* --- LIST VIEW --- */}
      {!selectedTicket ? (
        <>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
              <Ticket size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">My IT Tickets</h1>
              <p className="text-sm font-bold text-gray-500 mt-0.5">Track your requests and communicate with IT Support.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {tickets.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <CheckCircle2 size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-black text-gray-900">No Tickets Found</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">You don't have any active or past support tickets.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tickets.map(ticket => (
                  <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="p-5 sm:p-6 hover:bg-gray-50 cursor-pointer transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Tag size={10} /> {ticket.id.substring(0, 8)}
                        </span>
                        <span className="text-xs font-bold text-gray-400">{ticket.date}</span>
                      </div>
                      <h3 className="text-base font-black text-gray-900 group-hover:text-teal-600 transition-colors">{ticket.title}</h3>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      {ticket.estimatedTime && ticket.status !== 'Resolved' && (
                        <div className={`px-3 py-1 rounded-lg border text-[11px] font-black uppercase flex items-center gap-1.5 shadow-sm ${ticket.estimatedTime === 'Hold' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                          {ticket.estimatedTime === 'Hold' ? <PauseCircle size={12}/> : <Timer size={12}/>}
                          ETA: {ticket.estimatedTime}
                        </div>
                      )}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        
        /* --- DETAIL & CHAT VIEW --- */
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to My Tickets
          </button>

          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 border-b border-gray-100 pb-6 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Tag size={10} /> {selectedTicket.id.substring(0, 8)}
                  </span>
                  <span className="text-xs font-bold text-gray-400">Submitted: {selectedTicket.date}</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900">{selectedTicket.title}</h2>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 text-sm font-black px-3 py-1.5 rounded-xl border bg-gray-50">
                  {selectedTicket.status === 'Open' && <AlertCircle size={16} className="text-red-500" />}
                  {selectedTicket.status === 'In Progress' && <Clock size={16} className="text-blue-500" />}
                  {selectedTicket.status === 'Hold' && <PauseCircle size={16} className="text-orange-500" />}
                  {selectedTicket.status === 'Resolved' && <CheckCircle2 size={16} className="text-green-500" />}
                  <span className={
                    selectedTicket.status === 'Open' ? 'text-red-600' : 
                    selectedTicket.status === 'In Progress' ? 'text-blue-600' : 
                    selectedTicket.status === 'Hold' ? 'text-orange-600' : 'text-green-600'
                  }>{selectedTicket.status}</span>
                </div>
                {selectedTicket.estimatedTime && selectedTicket.status !== 'Resolved' && (
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-black text-xs uppercase ${selectedTicket.estimatedTime === 'Hold' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    <Timer size={14}/> ETA: {selectedTicket.estimatedTime}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-black text-gray-900 mb-2">Original Request</h3>
              <p className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-5 rounded-2xl border border-gray-200 whitespace-pre-wrap">
                {selectedTicket.description}
              </p>
            </div>
            
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="text-base font-black text-gray-900 mb-6 flex items-center gap-2">
                <MessageSquare size={18} className="text-teal-600" /> Support Chat
              </h3>
              
              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
                {selectedTicket.replies.length === 0 ? (
                  <div className="text-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm font-bold text-gray-400">No replies yet. Admin will respond shortly.</p>
                  </div>
                ) : (
                  selectedTicket.replies.map((reply, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border text-sm max-w-[85%] ${reply.sender === 'Staff' ? 'bg-teal-50 border-teal-100 ml-auto' : 'bg-gray-50 border-gray-200 mr-auto'}`}>
                      <div className="flex justify-between items-center mb-1.5 gap-4">
                        <span className="font-bold text-gray-900 flex items-center gap-1.5">
                          {reply.sender === 'Admin' ? <ShieldAlert size={14} className="text-teal-600"/> : <User size={14} className="text-gray-500"/>}
                          {reply.name}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{reply.date}</span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{reply.text}</p>
                    </div>
                  ))
                )}
              </div>

              {selectedTicket.status !== 'Resolved' ? (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row gap-3">
                  <textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message to Admin..."
                    className="flex-1 bg-white border border-gray-200 p-3 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                    rows={2}
                  />
                  <button 
                    onClick={handleSendReply}
                    disabled={isSubmitting || !replyText.trim()}
                    className={`px-6 py-3 font-black rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 h-fit self-end sm:self-auto ${isSubmitting || !replyText.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                  >
                    <Send size={16} /> {isSubmitting ? 'Sending...' : 'Reply'}
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-100 p-4 rounded-2xl text-center flex flex-col items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-500 mb-2" />
                  <p className="text-sm font-bold text-green-800">This ticket has been resolved and is now closed.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}