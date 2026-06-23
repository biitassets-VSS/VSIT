'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Search, Ticket, Clock, 
  CheckCircle2, AlertCircle, MessageSquare, Wrench,
  Hourglass, FileText, Send, Check, RefreshCw, X, ShieldAlert, User, Play, Pause
} from 'lucide-react';

export default function AdminTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🧭 Granular Status Tabs
  const [filterTab, setFilterTab] = useState<'all' | 'open' | 'in_process' | 'hold' | 'resolved'>('open');
  
  // 🛠️ Expandable Diagnostic Workbench State
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    status: 'open',
    wait_time: '15 Mins',
    resolution_note: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (ticketData) setTickets(ticketData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const openTicketWorkbench = (ticket: any) => {
    setActiveEditId(ticket.id);
    setEditForm({
      status: ticket.status || 'open',
      wait_time: ticket.wait_time || '15 Mins',
      resolution_note: ticket.resolution_note || ''
    });
  };

  // 💾 BATCH SAVE HANDLER (Updates Status, Wait Time, Note, and Auto-stamps resolution time)
  const handleCommitTicketUpdates = async (ticketId: string) => {
    setIsSaving(true);
    try {
      const isMarkingDone = editForm.status === 'resolved' || editForm.status === 'closed';
      const timestampStamp = isMarkingDone ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('tickets')
        .update({
          status: editForm.status,
          wait_time: editForm.wait_time,
          resolution_note: editForm.resolution_note,
          resolved_at: timestampStamp
        })
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state instantly
      setTickets(prev => prev.map(t => t.id === ticketId ? {
        ...t,
        status: editForm.status,
        wait_time: editForm.wait_time,
        resolution_note: editForm.resolution_note,
        resolved_at: timestampStamp
      } : t));

      setActiveEditId(null);
      alert("Helpdesk record securely updated!");
    } catch (err: any) { alert(`Error saving ticket: ${err.message}`); } finally { setIsSaving(false); }
  };

  // 🎨 SLA Status Color Matrix
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
      filterTab === 'hold' ? s.includes('hold') :
      s.includes('resolve') || s.includes('close');

    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || (
      t.subject?.toLowerCase().includes(query) || t.user_email?.toLowerCase().includes(query) ||
      t.emp_code?.toLowerCase().includes(query) || t.id?.toLowerCase().includes(query) ||
      t.resolution_note?.toLowerCase().includes(query) // <-- Allows admins to search by historical fix descriptions!
    );

    return matchesTab && matchesSearch;
  });

  const countOpen = tickets.filter(t => (t.status || '').toLowerCase() === 'open').length;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans">
      
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">IT Helpdesk Control</h1>
              {countOpen > 0 && (
                <span className="px-3 py-0.5 bg-rose-500 text-white font-black text-xs rounded-full shadow-xs">
                  {countOpen} Unassigned
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Manage SLA resolution queue, log technical fix reports, and update wait times</p>
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
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
            placeholder="Search subject, user, EMP code, or fix notes..." 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* TICKETS FEED */}
      {loading ? (
        <div className="w-full py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002B49]"></div></div>
      ) : filteredTickets.length === 0 ? (
        <div className="w-full py-20 bg-white rounded-3xl border border-gray-100 text-center space-y-2 shadow-2xs">
          <Ticket size={40} className="mx-auto text-gray-300" />
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">No Tickets Match Filter</h3>
          <p className="text-xs text-gray-400 font-medium">Your helpdesk view is fully cleared for this section.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => {
            const badge = getStatusBadge(ticket.status);
            const isEditingThis = activeEditId === ticket.id;

            return (
              <div key={ticket.id} className={`p-6 bg-white rounded-3xl border transition-all shadow-2xs ${isEditingThis ? 'border-blue-400 ring-4 ring-blue-50' : 'border-gray-100 hover:border-blue-200'}`}>
                
                {/* 1. Ticket Header Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 overflow-hidden w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/80 text-[#002B49] flex items-center justify-center shrink-0 font-black">
                      <MessageSquare size={18} />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-black text-[#002B49] truncate">{ticket.subject || 'IT Support Ticket'}</h3>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 mt-0.5">
                        <span className="text-blue-600 font-mono">EMP: {ticket.emp_code || 'N/A'}</span>
                        <span>•</span>
                        <span className="truncate">{ticket.user_email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Badges (Status + Wait Time) */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-[10px] font-mono font-black">
                      <Hourglass size={11} className="text-blue-500 animate-spin"/>
                      <span>{ticket.wait_time || '15 Mins'}</span>
                    </span>

                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${badge.css}`}>
                      {badge.icon} <span>{badge.label}</span>
                    </span>
                  </div>
                </div>

                {/* 2. Original User Description */}
                <div className="py-4">
                  <p className="text-xs text-gray-700 font-medium leading-relaxed bg-gray-50/70 p-4 rounded-2xl border border-gray-100/80">
                    "{ticket.description || 'No detailed issue description provided by employee.'}"
                  </p>
                </div>

                {/* 3. HISTORICAL RESOLUTION REPORT (Appears if admin previously typed a note) */}
                {ticket.resolution_note && !isEditingThis && (
                  <div className="mb-4 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between text-emerald-900 font-black">
                      <span className="flex items-center gap-1.5"><Wrench size={13} className="text-emerald-600"/> Official IT Fix Report</span>
                      {ticket.resolved_at && <span className="font-mono text-[10px] text-emerald-600 font-bold">Closed: {new Date(ticket.resolved_at).toLocaleString()}</span>}
                    </div>
                    <p className="text-emerald-800 font-medium pl-5 italic">
                      "{ticket.resolution_note}"
                    </p>
                  </div>
                )}

                {/* 4. FOOTER / EXPAND WORKBENCH TRIGGER */}
                {!isEditingThis ? (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-mono font-bold text-gray-400">ID: {ticket.id} • Logged {new Date(ticket.created_at).toLocaleDateString()}</span>
                    
                    <button 
                      onClick={() => openTicketWorkbench(ticket)}
                      className="px-4 py-2 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Wrench size={12} /> <span>Update Status & Log Fix</span>
                    </button>
                  </div>
                ) : (

                  /* 🚀 THE INLINE DIAGNOSTIC WORKBENCH DRAWER */
                  <div className="mt-2 p-5 bg-[#F8FAFC] rounded-2xl border-2 border-[#002B49] space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                      <span className="text-xs font-black uppercase tracking-wider text-[#002B49] flex items-center gap-1.5"><Wrench size={14}/> Helpdesk Action Workbench</span>
                      <button onClick={() => setActiveEditId(null)} className="text-gray-400 hover:text-gray-800 cursor-pointer"><X size={16}/></button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Granular Status Picker */}
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">1. Set Issue Status</label>
                        <select 
                          value={editForm.status} 
                          onChange={e => setEditForm({...editForm, status: e.target.value})}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-black text-gray-900 uppercase tracking-wider outline-none cursor-pointer"
                        >
                          <option value="open">🔴 Open / Unassigned</option>
                          <option value="in_process">🟡 In Process / Investigating</option>
                          <option value="hold">🟣 On Hold (Awaiting Parts/User)</option>
                          <option value="resolved">🟢 Resolved / Successfully Fixed</option>
                        </select>
                      </div>

                      {/* Granular Time Presets */}
                      <div>
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">2. Estimated / Logged SLA Wait Time</label>
                        <select 
                          value={editForm.wait_time} 
                          onChange={e => setEditForm({...editForm, wait_time: e.target.value})}
                          className="w-full p-2.5 bg-white border border-blue-300 rounded-xl text-xs font-mono font-black text-blue-900 outline-none cursor-pointer"
                        >
                          <option value="10 Mins">⏳ 10 Minutes</option>
                          <option value="15 Mins">⏳ 15 Minutes</option>
                          <option value="25 Mins">⏳ 25 Minutes</option>
                          <option value="40 Mins">⏳ 40 Minutes</option>
                          <option value="1 Hour">⌛ 1 Hour</option>
                          <option value="24 Hours">📅 24 Hours / Next Day</option>
                          <option value="Indefinite (Hold)">🛑 Indefinite (On Hold)</option>
                          <option value="Fixed Instantly">⚡ Fixed Instantly (0 Mins)</option>
                        </select>
                      </div>

                    </div>

                    {/* Resolution Summary Textbox */}
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">3. Resolution Report / Action Taken Note</label>
                      <textarea 
                        rows={2}
                        placeholder="Type how the issue was resolved (e.g. 'Replaced faulty HDMI adapter', 'Cleared DNS Cache via AnyDesk')..."
                        value={editForm.resolution_note}
                        onChange={e => setEditForm({...editForm, resolution_note: e.target.value})}
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-[#002B49]"
                      />
                    </div>

                    {/* Commit Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setActiveEditId(null)} className="px-5 py-2.5 bg-white border text-gray-600 rounded-xl text-xs font-black uppercase cursor-pointer">Cancel</button>
                      
                      <button 
                        onClick={() => handleCommitTicketUpdates(ticket.id)} 
                        disabled={isSaving}
                        className="flex-1 py-2.5 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                      >
                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>{isSaving ? 'Updating Database...' : 'Save Updates & Send Notification'}</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}