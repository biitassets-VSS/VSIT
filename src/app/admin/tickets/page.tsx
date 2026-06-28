'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Ticket as TicketIcon, Clock, CheckCircle2, 
  AlertTriangle, Search, RefreshCw, ShieldCheck, Image as ImageIcon, PauseCircle, PlayCircle
} from 'lucide-react';

export default function AdminTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'open' | 'progress' | 'hold' | 'resolved'>('open');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Pull tickets and join with profiles to get the user ID for notifications
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          profiles:emp_code (id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      alert(`Error loading tickets: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 THE ADMIN ADJUDICATION ENGINE
  const executeTicketVerdict = async (ticketId: string, newStatus: string, staffEmail: string) => {
    // 1. Force the admin to leave a note for the staff member
    const remarks = prompt(`Please provide an update note for the staff member (Status changing to: ${newStatus}):`) || '';
    
    if (!confirm(`Confirm status change to "${newStatus}"?`)) return;

    setUpdatingId(ticketId);
    try {
      // 2. Save directly to the new columns the Staff Dashboard is listening to
      const { error: tixErr } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus, 
          admin_notes: remarks || 'Status updated by IT Administration.',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);
        
      if (tixErr) throw tixErr;

      // 3. Find the profile ID from the email to trigger a live push notification
      const { data: profile } = await supabase.from('profiles').select('id').eq('email', staffEmail).single();

      if (profile?.id) {
        await supabase.from('notifications').insert({
          user_id: profile.id,
          title: newStatus === 'Resolved' ? '✔ Ticket Resolved' : `🛠 Ticket Update: ${newStatus}`,
          message: remarks || `Your ticket status was changed to ${newStatus}.`,
          is_read: false,
          type: newStatus === 'Resolved' ? 'success' : 'info'
        });
      }

      // 4. Instantly update the admin UI
      setTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, status: newStatus, admin_notes: remarks, updated_at: new Date().toISOString() } 
          : t
      ));

    } catch (err: any) {
      alert(`Error updating ticket: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('progress')) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (s.includes('hold')) return 'text-amber-700 bg-amber-50 border-amber-200';
    if (s.includes('resolved') || s.includes('closed')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  const filteredTickets = tickets.filter(t => {
    const s = (t.status || '').toLowerCase().trim();
    const isResolved = s.includes('resolved') || s.includes('closed');
    const isProgress = s.includes('progress');
    const isHold = s.includes('hold');
    const isOpen = !isResolved && !isProgress && !isHold;

    const matchesTab = 
      filterTab === 'open' ? isOpen :
      filterTab === 'progress' ? isProgress :
      filterTab === 'hold' ? isHold :
      filterTab === 'resolved' ? isResolved : true;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (t.title || '').toLowerCase().includes(query) ||
      (t.emp_code || '').toLowerCase().includes(query) ||
      (t.staff_name || '').toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const openCount = tickets.filter(t => {
    const s = (t.status || '').toLowerCase().trim();
    return !(s.includes('resolved') || s.includes('progress') || s.includes('hold'));
  }).length;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans text-slate-800 bg-slate-50/50 min-h-screen">
      
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 cursor-pointer transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Support Desk Commander</h1>
              {openCount > 0 && (
                <span className="px-3 py-1 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-sm">
                  {openCount} New Tickets
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold">Triage, update, and resolve staff hardware and IT requests.</p>
          </div>
        </div>
        <button 
          onClick={fetchTickets} 
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync
        </button>
      </div>

      {/* TABS & SEARCH */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {[
            { id: 'open', label: `Open (${openCount})` },
            { id: 'progress', label: 'In Progress' },
            { id: 'hold', label: 'On Hold' },
            { id: 'resolved', label: 'Resolved' }
          ].map(tab => (
            <button
              key={tab.id} onClick={() => setFilterTab(tab.id as any)}
              className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shrink-0 cursor-pointer transition-all ${
                filterTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white p-2.5 rounded-3xl border border-slate-200 shadow-sm flex items-center">
          <div className="relative w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Employee Name, ID, or Ticket Title..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* TICKETS GRID */}
      {loading ? (
        <div className="w-full py-32 flex flex-col items-center justify-center gap-4 text-slate-400">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
          <span className="text-[11px] font-black tracking-widest uppercase">Fetching Tickets...</span>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="w-full py-24 bg-white rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
          <TicketIcon size={48} className="mx-auto text-slate-300" />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">No Tickets Found</h3>
          <p className="text-xs text-slate-400 font-bold">The queue is clear for this category.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTickets.map(tix => (
            <div key={tix.id} className="p-6 md:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm transition-all flex flex-col xl:flex-row gap-8">
              
              {/* LEFT: Ticket Context & User Info */}
              <div className="w-full xl:w-1/3 flex flex-col gap-6 shrink-0 border-b xl:border-b-0 xl:border-r border-slate-100 pb-6 xl:pb-0 xl:pr-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(tix.status)}`}>
                      {tix.status || 'Open'}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                      {tix.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug">{tix.title}</h3>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">Employee</span>
                    <span className="font-black text-slate-700">{tix.staff_name || tix.created_by}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-3">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">Emp ID</span>
                    <span className="font-mono font-black text-blue-600">{tix.emp_code}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-3">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">Submitted</span>
                    <span className="font-bold text-slate-900">{new Date(tix.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT: Details, Screenshot, and Admin Controls */}
              <div className="w-full xl:w-2/3 flex flex-col justify-between gap-6">
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      <AlertTriangle size={14}/> Problem Description
                    </h4>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                      {tix.description}
                    </div>
                  </div>

                  {/* 🌟 THE ADMIN SCREENSHOT VIEWER */}
                  {tix.screenshot_attachment && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5">
                        <ImageIcon size={14}/> User Attached Screenshot
                      </h4>
                      <div className="p-2 border border-slate-200 rounded-2xl inline-block bg-slate-50 shadow-sm hover:border-blue-400 transition-all cursor-pointer overflow-hidden">
                        <img 
                          onClick={() => window.open(tix.screenshot_attachment, '_blank')}
                          src={tix.screenshot_attachment} 
                          alt="Ticket Evidence" 
                          className="h-32 object-contain rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  {tix.admin_notes && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
                        <ShieldCheck size={14}/> Your Last Update Note
                      </span>
                      <p className="text-sm font-medium text-emerald-900 italic">"{tix.admin_notes}"</p>
                    </div>
                  )}
                </div>

                {/* 🌟 ADMIN ACTION CONTROLS */}
                <div className="pt-6 border-t border-slate-100 mt-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    <button
                      disabled={updatingId === tix.id}
                      onClick={() => executeTicketVerdict(tix.id, 'In Progress', tix.created_by)}
                      className="flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      <PlayCircle size={16} /> Work on it
                    </button>
                    
                    <button
                      disabled={updatingId === tix.id}
                      onClick={() => executeTicketVerdict(tix.id, 'On Hold', tix.created_by)}
                      className="flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      <PauseCircle size={16} /> Place On Hold
                    </button>

                    <button
                      disabled={updatingId === tix.id}
                      onClick={() => executeTicketVerdict(tix.id, 'Resolved', tix.created_by)}
                      className="flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      <CheckCircle2 size={16} /> Resolve
                    </button>

                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}