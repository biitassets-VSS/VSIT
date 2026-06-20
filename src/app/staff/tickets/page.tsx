'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ticket, AlertCircle, Clock, CheckCircle2, 
  PauseCircle, ArrowLeft, MessageSquare, Send, 
  Tag, Timer, Loader2, User, ShieldAlert, Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// --- Smart Status Formatter ---
const formatStatus = (s?: string) => {
  if (!s) return 'Open';
  const lower = s.toLowerCase().trim();
  if (lower.includes('resolve') || lower.includes('close')) return 'Resolved';
  if (lower.includes('progress') || lower.includes('process')) return 'In Progress';
  if (lower.includes('hold') || lower.includes('pause')) return 'Hold';
  if (lower.includes('open')) return 'Open';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

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
  status: 'Open' | 'In Progress' | 'Hold' | 'Resolved' | string;
  estimatedTime?: string; 
  date: string;
  replies: TicketReply[];
}

export default function StaffTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'In Progress' | 'Hold' | 'Resolved'>('All');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [staffName, setStaffName] = useState('Staff Member');
  const [empCode, setEmpCode] = useState('');
  
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. FETCH TICKETS & START LIVE SYNC
  useEffect(() => {
    let isMounted = true;

    const fetchMyTickets = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || localStorage.getItem('userEmail');

        if (!userEmail) {
          if (isMounted) setIsLoaded(true);
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('email', userEmail).maybeSingle();

        const currentName = profile?.full_name || profile?.name || localStorage.getItem('userName') || 'Staff Member';
        const currentEmpCode = profile?.emp_code || profile?.employee_code || profile?.employee_id || profile?.emp_id || 'N/A';
        
        if (isMounted) {
          setStaffName(currentName);
          setEmpCode(currentEmpCode);
        }

        if (currentEmpCode !== 'N/A') {
          const { data: ticketData, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('emp_code', currentEmpCode)
            .order('created_at', { ascending: false });

          if (error) throw error;

          if (isMounted && ticketData) {
            const mappedTickets = ticketData.map((t: any) => ({
              id: t.id,
              title: t.subject || t.title || 'No Subject',
              description: t.description || 'No description provided.',
              status: formatStatus(t.status), // Auto-normalize status
              estimatedTime: t.waiting_time || t.estimated_time || '', 
              date: t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'Unknown Date',
              replies: t.replies || []
            }));

            setTickets(mappedTickets);

            // Auto-update the open ticket viewer if the Admin changes status mid-chat!
            setSelectedTicket(prev => {
              if (!prev) return null;
              const freshMatch = mappedTickets.find(mt => mt.id === prev.id);
              return freshMatch || prev;
            });
          }
        }
      } catch (err) {
        console.error("Error fetching my tickets:", err);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    };

    fetchMyTickets();

    // LIVE SUPABASE REALTIME SUBSCRIPTIONS
    const ticketsChannel = supabase
      .channel('realtime-tickets-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchMyTickets(); // Instantly refresh data when Admin makes a change
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(ticketsChannel);
    };
  }, []);

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
      const { data, error } = await supabase.from('tickets').update({ replies: newReplies }).eq('id', selectedTicket.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Could not update. Check database permissions.");

      const updatedTicket = { ...selectedTicket, replies: newReplies, status: formatStatus(data[0].status) };
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
      setReplyText('');
    } catch (error: any) {
      alert("Failed to send reply: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(t => filterStatus === 'All' || t.status === filterStatus);
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;

  if (!isLoaded) {
    return (
      <div className="p-10 text-center font-bold text-gray-500 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin text-teal-600" size={24} /> Loading My Tickets...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto px-4 sm:px-0">
      
      {!selectedTicket ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900">My IT Tickets</h1>
                  <span className="text-[10px] bg-teal-50 text-teal-600 font-bold px-2 py-0.5 rounded-full animate-pulse">Live Sync Active</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-500 mt-0.5">Track your requests and communicate with IT.</p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <div className="bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl text-center flex-1 md:flex-none">
                <p className="text-[9px] sm:text-[10px] font-bold text-red-600 uppercase">Open</p>
                <p className="text-sm sm:text-base font-black text-red-900">{openCount}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl text-center flex-1 md:flex-none">
                <p className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase">Process</p>
                <p className="text-sm sm:text-base font-black text-blue-900">{inProgressCount}</p>
              </div>
              <div className="bg-green-50 border border-green-100 px-3 py-1.5 rounded-xl text-center flex-1 md:flex-none">
                <p className="text-[9px] sm:text-[10px] font-bold text-green-600 uppercase">Resolved</p>
                <p className="text-sm sm:text-base font-black text-green-900">{resolvedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
              <Filter size={16} className="text-gray-400 shrink-0" />
              {['All', 'Open', 'In Progress', 'Hold', 'Resolved'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-black whitespace-nowrap transition-colors ${
                    filterStatus === status 
                      ? 'bg-gray-900 text-white shadow-sm' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {filteredTickets.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <CheckCircle2 size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-black text-gray-900">No Tickets Found</h3>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-5">
                {filteredTickets.map(ticket => {
                  const latestAdminReply = [...ticket.replies].reverse().find(r => r.sender === 'Admin');

                  return (
                    <div 
                      key={ticket.id} 
                      onClick={() => setSelectedTicket(ticket)} 
                      className="border border-gray-100 p-5 sm:p-6 rounded-2xl hover:border-teal-300 hover:shadow-md cursor-pointer transition-all group bg-white"
                    >
                      <div className="flex justify-between items-start mb-4 gap-4">
                        <div className="min-w-0 w-full">
                          <h3 className="text-lg sm:text-xl font-black text-[#002B49] group-hover:text-teal-600 transition-colors">{ticket.title}</h3>
                          <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1">{ticket.date}</p>
                        </div>
                        
                        <div className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0 w-fit shadow-sm ${
                          ticket.status === 'Resolved' ? 'bg-[#e6f7eb] text-[#008a4b]' :
                          ticket.status === 'Open' ? 'bg-red-50 text-red-700' :
                          ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-700' :
                          'bg-orange-50 text-orange-700'
                        }`}>
                          {ticket.status}
                        </div>
                      </div>

                      {latestAdminReply && (
                        <div className="bg-[#f0fcf6] border border-[#d1f0e0] p-4 rounded-xl mt-2">
                          <p className="text-xs font-black text-[#006456] uppercase flex items-center gap-1.5 mb-2 tracking-wide">
                            <MessageSquare size={14}/> LATEST UPDATE FROM ADMIN
                          </p>
                          <p className="text-[15px] font-medium text-[#004d40] leading-relaxed">
                            {latestAdminReply.text}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
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
                <h2 className="text-2xl font-black text-[#002B49]">{selectedTicket.title}</h2>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 text-sm font-black px-3 py-1.5 rounded-xl border bg-gray-50 shadow-sm">
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
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-black text-gray-900 mb-2">Original Request</h3>
              <p className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-5 rounded-2xl border border-gray-200 whitespace-pre-wrap">
                {selectedTicket.description}
              </p>
            </div>
            
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="text-base font-black text-[#006456] mb-6 flex items-center gap-2">
                <MessageSquare size={18} /> Support Chat
              </h3>
              
              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
                {selectedTicket.replies.length === 0 ? (
                  <div className="text-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm font-bold text-gray-400">No replies yet. Admin will respond shortly.</p>
                  </div>
                ) : (
                  selectedTicket.replies.map((reply, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border text-sm max-w-[85%] ${reply.sender === 'Staff' ? 'bg-teal-50 border-teal-100 ml-auto' : 'bg-[#f0fcf6] border-[#d1f0e0] mr-auto'}`}>
                      <div className="flex justify-between items-center mb-1.5 gap-4">
                        <span className="font-bold text-gray-900 flex items-center gap-1.5">
                          {reply.sender === 'Admin' ? <ShieldAlert size={14} className="text-[#006456]"/> : <User size={14} className="text-gray-500"/>}
                          {reply.name}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{reply.date}</span>
                      </div>
                      <p className="text-[#004d40] whitespace-pre-wrap leading-relaxed">{reply.text}</p>
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
                    className={`px-6 py-3 font-black rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 h-fit self-end sm:self-auto ${isSubmitting || !replyText.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#008a4b] hover:bg-green-700 text-white'}`}
                  >
                    <Send size={16} /> {isSubmitting ? 'Sending...' : 'Reply'}
                  </button>
                </div>
              ) : (
                <div className="bg-[#e6f7eb] border border-green-200 p-4 rounded-2xl text-center flex flex-col items-center justify-center">
                  <CheckCircle2 size={24} className="text-[#008a4b] mb-2" />
                  <p className="text-sm font-bold text-[#006456]">This ticket has been resolved and is now closed.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}