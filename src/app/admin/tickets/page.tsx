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
  
  // Top Tier Status Filters
  const [filterTab, setFilterTab] = useState<'all' | 'open' | 'in_process' | 'hold' | 'resolved'>('open');
  
  // MASTER-DETAIL STATE (The currently opened ticket on the right side)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  
  // Right-Side Form State
  const [formStatus, setFormStatus] = useState('open');
  const [formWaitTime, setFormWaitTime] = useState('15 Mins');
  const [formResolutionNote, setFormResolutionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchTickets(); }, []);

  // URL LISTENER: Only opens if explicitly linked from the dashboard via ?view=xxx
  useEffect(() => {
    if (tickets.length === 0) return;

    const targetId = searchParams.get('view') || searchParams.get('id');
    if (targetId && !selectedTicket) {
      const found = tickets.find(t => t.id === targetId);
      if (found) handleSelectTicket(found);
    }
    // Note: We removed the auto-select logic so the page defaults to 100% width list view!
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
    setFormWaitTime(ticket.wait_time || '15 Mins');
    setFormResolutionNote(ticket.resolution_note || '');
  };

  // 🚀 Gracefully closes the workbench and expands the list back to 100% width
  const closeWorkbench = () => {
    setSelectedTicket(null);
    router.replace('/admin/tickets'); // Clears the URL so it doesn't pop back open on refresh
  };

  const handleCommitUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsSaving(true);
    try {
      const isMarkingDone = formStatus === 'resolved' || formStatus === 'closed';
      const timeResolvedStamp = isMarkingDone ? new Date().toISOString() : selectedTicket.resolved_at;

      const { error } = await supabase
        .from('tickets')
        .update({
          status: formStatus,
          wait_time: formWaitTime,
          resolution_note: formResolutionNote,
          resolved_at: timeResolvedStamp
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      const patched = {
        ...selectedTicket,
        status: formStatus, wait_time: formWaitTime, 
        resolution_note: formResolutionNote, resolved_at: timeResolvedStamp
      };

      setSelectedTicket(patched);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? patched : t));
      alert("Ticket status & resolution log successfully recorded.");
    } catch (err: any) { alert(`Update Failed: ${err.message}`); } finally { setIsSaving(false); }
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

  const countOpen = tickets.filter(t => (t.status || '').toLowerCase() === 'open').length;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans overflow-hidden">
      
      {/* TOP DASHBOARD LINK HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">IT Helpdesk Command</h1>
              <span className="px-3 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 font-extrabold text-xs rounded-full">
                {tickets.length} Total Records
              </span>
            </div>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Click any ticket in the queue to open the diagnostic workbench and resolve the issue</p>
          </div>
        </div>
      </div>

      {/* SHORTCUT STATUS TABS + SEARCH */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white p-3 rounded-3xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
          <button onClick={() => setFilterTab('open')} className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${filterTab === 'open' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>
            Open ({countOpen})
          </button>
          <button onClick={() => setFilterTab('in_process')} className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${filterTab === 'in_process' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>
            In Process
          </button>
          <button onClick={() => setFilterTab('hold')} className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${filterTab === 'hold' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' : 'text-gray-500 hover:bg-gray-50'}`}>
            On Hold
          </button>
          <button onClick={() => setFilterTab('resolved')} className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${filterTab === 'resolved' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-gray-500 hover:bg-gray-50'}`}>
            Resolved
          </button>
          <button onClick={() => setFilterTab('all')} className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${filterTab === 'all' ? 'bg-[#002B49] text-white shadow-md shadow-[#002B49]/20' : 'text-gray-500 hover:bg-gray-50'}`}>
            All ({tickets.length})
          </button>
        </div>

        <div className="relative min-w-[280px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search subject, employee, or fix notes..." 
            className="w-full pl-11 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* THE DYNAMIC SPLIT-VIEW MATRIX */}
      {loading ? (
        <div className="w-full py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002B49]"></div></div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start relative min-h-[500px]">
          
          {/* LEFT COLUMN: SCROLLABLE QUEUE LIST (Expands to 100% width if no ticket is selected) */}
          <div className={`space-y-3 max-h-[800px] overflow-y-auto pr-1 custom-scrollbar shrink-0 transition-all duration-300 ease-in-out ${selectedTicket ? 'hidden lg:block lg:w-5/12' : 'w-full'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 block mb-1">Queue Feed ({filteredTickets.length})</span>
            
            {filteredTickets.map(ticket => {
              const badge = getStatusBadge(ticket.status);
              const isSelected = selectedTicket?.id === ticket.id;

              return (
                <div 
                  key={ticket.id} 
                  onClick={() => handleSelectTicket(ticket)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between gap-3 ${
                    isSelected 
                      ? 'bg-[#002B49] text-white border-[#002B49] shadow-lg shadow-[#002B49]/20 scale-[1.01]' 
                      : 'bg-white text-gray-800 border-gray-200/70 hover:border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/10 text-white' : 'bg-gray-50 text-gray-400'}`}>
                        <MessageSquare size={14} />
                      </div>
                      <h4 className="text-sm font-black truncate">{ticket.subject || 'Support Ticket'}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${isSelected ? 'bg-white/20 text-white border-transparent' : badge.css}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pl-10">
                    <span className={`font-bold truncate ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                      {ticket.user_email?.split('@')[0]} ({ticket.emp_code || 'No EMP'})
                    </span>
                    <span className={`font-mono font-bold text-[10px] ${isSelected ? 'text-amber-300' : 'text-blue-600'}`}>
                      ⏳ {ticket.wait_time || '15 Mins'}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {filteredTickets.length === 0 && (
              <div className="py-12 text-center text-gray-400 font-bold text-xs">
                No tickets match your search.
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: DETAIL WIDE & RESOLUTION FORM (Slides in when a ticket is clicked) */}
          {selectedTicket && (() => {
            const activeBadge = getStatusBadge(selectedTicket.status);

            return (
              <div className="w-full lg:w-7/12 bg-white rounded-3xl border border-gray-200/80 shadow-xl shadow-blue-900/5 p-6 lg:sticky lg:top-6 animate-in slide-in-from-right-8 duration-300 relative">
                
                {/* 🚀 The Close Button (Restores full-width view) */}
                <button 
                  onClick={closeWorkbench} 
                  className="absolute top-4 right-4 text-gray-400 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 p-2 rounded-full transition-colors z-10 cursor-pointer"
                  title="Close Workbench"
                >
                  <X size={18}/>
                </button>

                <form onSubmit={handleCommitUpdates} className="space-y-6 pt-2">
                  
                  {/* Panel Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100 pr-10">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">TICKET REF: #{selectedTicket.id.split('-')[0]}</span>
                      <h2 className="text-lg font-black text-[#002B49] leading-tight mt-0.5">{selectedTicket.subject || 'IT Support Ticket'}</h2>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-xl text-xs font-mono font-black flex items-center gap-1">
                        <Hourglass size={12} className="text-blue-500"/> {selectedTicket.wait_time || '15 Mins'}
                      </span>
                      <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-1 ${activeBadge.css}`}>
                        {activeBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* LIFECYCLE TIMESTAMPS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/60 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-0.5 flex items-center gap-1"><Clock size={11}/> Time Logged (Opened)</span>
                      <strong className="font-mono text-gray-800">{new Date(selectedTicket.created_at).toLocaleString()}</strong>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-0.5 flex items-center gap-1"><CheckCircle2 size={11}/> Time Resolved (Closed)</span>
                      <strong className={`font-mono ${selectedTicket.resolved_at ? 'text-emerald-700 font-bold' : 'text-amber-600 italic'}`}>
                        {selectedTicket.resolved_at ? new Date(selectedTicket.resolved_at).toLocaleString() : 'Active (Not stamped yet)'}
                      </strong>
                    </div>
                  </div>

                  {/* USER DOSSIER & ORIGINAL ISSUE */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <User size={14} className="text-blue-600"/>
                      <span>
  Submitted By: <strong className="text-slate-900">{ticket.staff_name || ticket.created_by?.split('@')[0]}</strong> • EMP: {ticket.emp_code}
</span>
                      <span>•</span>
                      <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">EMP: {selectedTicket.emp_code || 'N/A'}</span>
                    </div>

                    <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100 text-xs text-gray-800 leading-relaxed font-medium">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Issue Description</span>
                      "{selectedTicket.description || 'No descriptive text supplied by user.'}"
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* WORKBENCH CONTROLS */}
                  <div className="space-y-4 bg-blue-50/40 p-5 rounded-2xl border border-blue-200/80">
                    <span className="text-xs font-black uppercase tracking-widest text-[#002B49] block flex items-center gap-1.5"><Wrench size={14}/> Live Status & Wait Time Editor</span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Update SLA Status</label>
                        <select 
                          value={formStatus} onChange={e => setFormStatus(e.target.value)}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-black text-gray-900 uppercase tracking-wider outline-none cursor-pointer"
                        >
                          <option value="open">🔴 Open / Pending</option>
                          <option value="in_process">🟡 In Process / Working</option>
                          <option value="hold">🟣 On Hold</option>
                          <option value="resolved">🟢 Resolved / Closed</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Update Wait Time</label>
                        <select 
                          value={formWaitTime} onChange={e => setFormWaitTime(e.target.value)}
                          className="w-full p-2.5 bg-white border border-blue-300 rounded-xl text-xs font-mono font-black text-blue-900 outline-none cursor-pointer"
                        >
                          <option value="10 Mins">⏳ 10 Mins</option><option value="15 Mins">⏳ 15 Mins</option>
                          <option value="25 Mins">⏳ 25 Mins</option><option value="40 Mins">⏳ 40 Mins</option>
                          <option value="1 Hour">⌛ 1 Hour</option><option value="24 Hours">📅 Next Day (24h)</option>
                          <option value="On Hold">🛑 On Hold</option><option value="Resolved">✅ Resolved (0 Mins)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">How Was This Resolved? (Fix Notes)</label>
                      <textarea 
                        rows={2} required={formStatus === 'resolved'}
                        placeholder="Type solution (e.g. 'Replaced keyboard USB cable', 'Reset AnyDesk Password')..."
                        value={formResolutionNote} onChange={e => setFormResolutionNote(e.target.value)}
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-[#002B49]"
                      />
                    </div>

                    <button type="submit" disabled={isSaving} className="w-full py-3.5 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all">
                      {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                      <span>{isSaving ? 'Syncing to Supabase...' : 'Update Ticket State & Stamp Fix'}</span>
                    </button>
                  </div>

                </form>
              </div>
            );
          })()}

        </div>
      )}

    </div>
  );
}

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="animate-spin h-8 w-8 border-b-2 border-[#002B49]"></div></div>}>
      <TicketsWorkbenchContent />
    </Suspense>
  );
}