'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ticket, AlertCircle, Clock, CheckCircle2, 
  PauseCircle, ArrowLeft, MessageSquare, Send, 
  Tag, Timer, Loader2, User, ShieldAlert, Filter
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
  status: 'Open' | 'In Progress' | 'Hold' | 'Resolved';
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

  // 1. FETCH LIVE TICKETS WITH EXACT DATES
  useEffect(() => {
    const fetchMyTickets = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || localStorage.getItem('userEmail');

        if (!userEmail) {
          setIsLoaded(true);
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('email', userEmail).maybeSingle();

        const currentName = profile?.full_name || profile?.name || localStorage.getItem('userName') || 'Staff Member';
        const currentEmpCode = profile?.emp_code || profile?.employee_code || profile?.employee_id || profile?.emp_id || 'N/A';
        
        setStaffName(currentName);
        setEmpCode(currentEmpCode);

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
              estimatedTime: t.waiting_time || t.estimated_time || '', 
              // Exact live date formatting down to the minute
              date: t.created_at ? new Date(t.created_at).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date',
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

      const updatedTicket = { ...selectedTicket, replies: newReplies };
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
                <h1 className="text-xl sm:text-2xl font-black text-gray-900">My IT Tickets</h1>
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
              <div className="p-4 sm:p-6 space-y-4">
                {filteredTickets.map(ticket => {
                  const latestAdminReply = [...ticket.replies].reverse().find(r => r.sender === 'Admin');

                  return (
                    <div 
                      key={ticket.id} 
                      onClick={() => setSelectedTicket(ticket)} 
                      className="border border-gray-200 p-4 sm:p-5 rounded-2xl hover:border-teal-300 hover:shadow-md cursor-pointer transition-all group bg-white"
                    >
                      {/* Mobile Safe Flex Row */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-4">
                        <div className="min-w-0 w-full">
                          <h3 className="text-base sm:text-lg font-black text-gray-900 group-hover:text-teal-600 transition-colors truncate">{ticket.title}</h3>
                          <p className="text-[11px] sm:text-xs font-medium text-gray-500 mt-0.5">{ticket.date}</p>
                        </div>
                        
                        <div className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider shrink-0 w-fit ${
                          ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                          ticket.status === 'Open' ? 'bg-red-100 text-red-700' :
                          ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {ticket.status}
                        </div>
                      </div>

                      {latestAdminReply && (
                        <div className="bg-teal-50 border border-teal-100 p-3 sm:p-4 rounded-xl mt-2">
                          <p className="text-[9px] sm:text-[10px] font-black text-teal-800 uppercase flex items-center gap-1.5 mb-1.5 tracking-wide">
                            <MessageSquare size={12}/> LATEST UPDATE FROM ADMIN
                          </p>
                          <p className="text-xs sm:text-sm font-medium text-teal-900 leading-relaxed">
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
        <div className="space-y-6 max-w-3xl mt-4">
          <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to My Tickets
          </button>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 text-center font-bold text-gray-500">
             Ticket details currently open.
          </div>
        </div>
      )}
    </div>
  );
}