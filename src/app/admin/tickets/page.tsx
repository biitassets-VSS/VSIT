'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Search, Ticket, Clock, 
  CheckCircle2, AlertCircle, MessageSquare, Wrench,
  Hourglass, Save, RefreshCw, X, User, Play, Pause
} from 'lucide-react';

function TicketsWorkbenchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filterTab, setFilterTab] = useState<'all' | 'open' | 'in_process' | 'hold' | 'resolved'>('open');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  
  // Right-Side Form State
  const [formStatus, setFormStatus] = useState('open');
  const [formWaitTime, setFormWaitTime] = useState('15 Mins');
  const [formResolutionNote, setFormResolutionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchTickets(); }, []);

  useEffect(() => {
    if (tickets.length === 0) return;
    const targetId = searchParams.get('view') || searchParams.get('id');
    if (targetId && !selectedTicket) {
      const found = tickets.find(t => t.id === targetId);
      if (found) handleSelectTicket(found);
    }
  }, [tickets, searchParams]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
      if (data) setTickets(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSelectTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setFormStatus(ticket.status || 'open');
    setFormWaitTime(ticket.waiting_time || '15 Mins'); // Fixed
    setFormResolutionNote(ticket.resolution_note || '');
  };

  const closeWorkbench = () => {
    setSelectedTicket(null);
    router.replace('/admin/tickets'); 
  };

  const handleCommitUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsSaving(true);
    try {
      const isMarkingDone = formStatus === 'resolved' || formStatus === 'closed';
      const timeResolvedStamp = isMarkingDone ? new Date().toISOString() : selectedTicket.resolved_at;

      // 🌟 FIXED COLUMN NAME: waiting_time
      const { error } = await supabase
        .from('tickets')
        .update({
          status: formStatus,
          waiting_time: formWaitTime, 
          resolution_note: formResolutionNote,
          resolved_at: timeResolvedStamp
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      const patched = {
        ...selectedTicket,
        status: formStatus, waiting_time: formWaitTime, 
        resolution_note: formResolutionNote, resolved_at: timeResolvedStamp
      };

      setSelectedTicket(patched);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? patched : t));
      alert("Ticket updated successfully.");
    } catch (err: any) { 
      console.error("FULL POSTGRES ERROR:", err);
      alert(`Update Failed: ${err.message || JSON.stringify(err)}`); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'open').toLowerCase();
    if (s.includes('process') || s.includes('repair')) return { label: 'In Process', css: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse', icon: <Play size={10}/> };
    if (s.includes('hold')) return { label: 'On Hold', css: 'bg-purple-100 text-purple-800 border-purple-300', icon: <Pause size={10}/> };
    if (s.includes('resolve') || s.includes('close')) return { label: 'Resolved', css: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: <CheckCircle2 size={10}/> };
    return { label: 'Open', css: 'bg-rose-100 text-rose-800 border-rose-300', icon: <AlertCircle size={10}/> };
  };

  const filteredTickets = tickets.filter(t => {
    const s = (t.status || 'open').toLowerCase();
    const matchesTab = 
      filterTab === 'all' ? true :
      filterTab === 'open' ? s === 'open' || s === 'pending' :
      filterTab === 'in_process' ? s.includes('process') || s.includes('repair') :
      filterTab === 'hold' ? s.includes('hold') : s.includes('resolve') || s.includes('close');

    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      t.subject?.toLowerCase().includes(q) || t.user_email?.toLowerCase().includes(q) ||
      t.emp_code?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q) ||
      t.resolution_note?.toLowerCase().includes(q)
    );

    return matchesTab && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-6 items-start relative min-h-[500px]">
        {/* LEFT QUEUE LIST */}
        <div className={`space-y-3 max-h-[800px] overflow-y-auto pr-1 ${selectedTicket ? 'hidden lg:block lg:w-5/12' : 'w-full'}`}>
          {filteredTickets.map(ticket => {
            const badge = getStatusBadge(ticket.status);
            const isSelected = selectedTicket?.id === ticket.id;
            return (
              <div 
                key={ticket.id} onClick={() => handleSelectTicket(ticket)}
                className={`p-4 rounded-3xl border cursor-pointer ${isSelected ? 'bg-[#002B49] text-white' : 'bg-white text-gray-800 border-gray-200'}`}
              >
                <h4 className="text-sm font-black truncate">{ticket.subject || ticket.title}</h4>
                <div className="text-[11px] font-bold text-gray-400">
                  {ticket.staff_name || ticket.created_by?.split('@')[0]} • ⏳ {ticket.waiting_time || '15 Mins'}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT WORKBENCH */}
        {selectedTicket && (
          <div className="w-full lg:w-7/12 bg-white rounded-3xl border border-gray-200 p-6">
            <form onSubmit={handleCommitUpdates} className="space-y-4">
              <h2 className="text-lg font-black">{selectedTicket.subject || selectedTicket.title}</h2>
              <p className="text-sm text-gray-600">Submitted By: {selectedTicket.staff_name || selectedTicket.created_by}</p>
              
              <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="w-full p-3 border rounded-xl">
                <option value="open">Open</option><option value="in_process">In Process</option>
                <option value="hold">On Hold</option><option value="resolved">Resolved</option>
              </select>

              <select value={formWaitTime} onChange={e => setFormWaitTime(e.target.value)} className="w-full p-3 border rounded-xl">
                <option value="15 Mins">15 Mins</option><option value="1 Hour">1 Hour</option><option value="Resolved">Resolved</option>
              </select>

              <button type="submit" className="w-full py-4 bg-[#002B49] text-white rounded-xl font-black">
                {isSaving ? 'Saving...' : 'Update State'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={<div/>}>
      <TicketsWorkbenchContent />
    </Suspense>
  );
}