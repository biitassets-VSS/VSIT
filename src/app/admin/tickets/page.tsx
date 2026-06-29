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
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 🌟 GLOBAL THEME SYNC
  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      alert(`Error loading tickets: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 THE ADMIN ADJUDICATION ENGINE (GUARANTEED SYNC WITH STAFF DASHBOARD)
  const executeTicketVerdict = async (ticketId: string, newStatus: string, staffEmail: string) => {
    // 1. Force the admin to leave a note for the staff member
    const remarks = prompt(`Provide an update note for the staff member (Status changing to: ${newStatus}):`) || '';
    
    if (!confirm(`Confirm status change to "${newStatus}"?`)) return;

    setUpdatingId(ticketId);
    try {
      // 2. Save directly to the exact columns the Staff Dashboard is listening to (admin_notes)
      const { error: tixErr } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus, 
          admin_notes: remarks || `Status updated to ${newStatus} by IT Administration.`,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);
        
      if (tixErr) throw tixErr;

      // 3. Find the profile ID from the email to trigger a live push notification securely
      if (staffEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', staffEmail)
          .maybeSingle();

        if (profile?.id) {
          await supabase.from('notifications').insert({
            user_id: profile.id,
            title: newStatus === 'Resolved' ? '✔ Ticket Resolved' : `🛠 Ticket Update: ${newStatus}`,
            message: remarks || `Your ticket status was changed to ${newStatus}.`,
            is_read: false,
            type: newStatus === 'Resolved' ? 'success' : 'info'
          });
        }
      }

      // 4. Instantly update the admin UI without reloading
      setTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, status: newStatus, admin_notes: remarks || `Status updated to ${newStatus} by IT Administration.`, updated_at: new Date().toISOString() } 
          : t
      ));

    } catch (err: any) {
      alert(`Error updating ticket: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // 🎨 Carbon/Slate Aware Badges
  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('progress')) return isDarkMode ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-blue-700 bg-blue-50 border-blue-200';
    if (s.includes('hold')) return isDarkMode ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-700 bg-amber-50 border-amber-200';
    if (s.includes('resolved') || s.includes('closed')) return isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
    return isDarkMode ? 'text-zinc-400 bg-zinc-800 border-zinc-700' : 'text-slate-700 bg-slate-50 border-slate-200';
  };

  // 🌟 MASTER THEME DICTIONARY
  const theme = {
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-slate-50',
    card: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200/80',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    inputBg: isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-blue-500 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 placeholder-slate-400',
    cardHover: isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50',
    divider: isDarkMode ? 'border-zinc-800' : 'border-slate-100',
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
      (t.staff_name || t.created_by || '').toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const openCount = tickets.filter(t => {
    const s = (t.status || '').toLowerCase().trim();
    return !(s.includes('resolved') || s.includes('progress') || s.includes('hold'));
  }).length;

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-10`}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* HEADER */}
        <div className={`${theme.card} rounded-3xl p-5 md:p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors`}>
          <div className="flex items-center gap-5">
            <button onClick={() => router.push('/admin')} className={`p-2.5 rounded-xl border transition-colors ${theme.card} ${theme.cardHover} ${theme.subText}`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`text-2xl font-semibold tracking-tight ${theme.textMain}`}>Support Desk Commander</h1>
                {openCount > 0 && (
                  <span className="px-3 py-1 bg-rose-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-sm">
                    {openCount} New Tickets
                  </span>
                )}
              </div>
              <p className={`text-sm ${theme.textSub}`}>Triage, update, and resolve staff hardware and IT requests.</p>
            </div>
          </div>
          <button 
            onClick={fetchTickets} 
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border transition-colors text-xs font-semibold uppercase tracking-wider ${theme.card} ${theme.cardHover} ${theme.textMain}`}
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
                className={`px-5 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider shrink-0 transition-all ${
                  filterTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : `${theme.card} ${theme.textSub} hover:text-blue-500`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`p-2.5 rounded-2xl border shadow-sm flex items-center transition-colors ${theme.card}`}>
            <div className="relative w-full">
              <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
              <input 
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Employee Name, ID, or Ticket Title..." 
                className={`w-full pl-12 pr-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`}
              />
            </div>
          </div>
        </div>

        {/* TICKETS GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-zinc-400' : 'border-blue-600'}`}></div>
            <span className={`text-[11px] font-semibold tracking-widest uppercase ${theme.textSub}`}>Fetching Tickets...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm transition-colors ${theme.card}`}>
            <TicketIcon size={48} className={`mx-auto ${isDarkMode ? 'text-zinc-700' : 'text-slate-300'}`} />
            <h3 className={`text-sm font-bold uppercase tracking-widest ${theme.textMain}`}>No Tickets Found</h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>The queue is clear for this category.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTickets.map(tix => (
              <div key={tix.id} className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-all flex flex-col xl:flex-row gap-8 ${theme.card}`}>
                
                {/* LEFT: Ticket Context & User Info */}
                <div className={`w-full xl:w-1/3 flex flex-col gap-6 shrink-0 border-b xl:border-b-0 xl:border-r pb-6 xl:pb-0 xl:pr-8 ${theme.divider}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(tix.status)}`}>
                        {tix.status || 'Open'}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border ${isDarkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {tix.category}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold leading-snug ${theme.textMain}`}>{tix.title}</h3>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-semibold uppercase tracking-widest ${theme.textSub}`}>Employee</span>
                      <span className={`font-bold ${theme.textMain}`}>{tix.staff_name || tix.created_by}</span>
                    </div>
                    <div className={`flex justify-between items-center text-xs border-t pt-3 ${theme.divider}`}>
                      <span className={`font-semibold uppercase tracking-widest ${theme.textSub}`}>Emp ID</span>
                      <span className={`font-mono font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{tix.emp_code || 'N/A'}</span>
                    </div>
                    <div className={`flex justify-between items-center text-xs border-t pt-3 ${theme.divider}`}>
                      <span className={`font-semibold uppercase tracking-widest ${theme.textSub}`}>Submitted</span>
                      <span className={`font-bold ${theme.textMain}`}>{new Date(tix.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Details, Screenshot, and Admin Controls */}
                <div className="w-full xl:w-2/3 flex flex-col justify-between gap-6">
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${theme.textSub}`}>
                        <AlertTriangle size={14}/> Problem Description
                      </h4>
                      <div className={`p-5 rounded-2xl border text-sm font-medium whitespace-pre-wrap leading-relaxed ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        {tix.description}
                      </div>
                    </div>

                    {/* 🌟 THE ADMIN SCREENSHOT VIEWER */}
                    {tix.screenshot_attachment && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 flex items-center gap-1.5">
                          <ImageIcon size={14}/> User Attached Screenshot
                        </h4>
                        <div className={`p-2 border rounded-2xl inline-block shadow-sm hover:border-blue-500 transition-all cursor-pointer overflow-hidden ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                          <img 
                            onClick={() => window.open(tix.screenshot_attachment, '_blank')}
                            src={tix.screenshot_attachment} 
                            alt="Ticket Evidence" 
                            className="h-32 object-contain rounded-xl"
                          />
                        </div>
                      </div>
                    )}

                    {/* 🌟 DISPLAY THE PREVIOUS ADMIN RESPONSE IF IT EXISTS */}
                    {tix.admin_notes && (
                      <div className={`p-4 rounded-2xl border space-y-1 ${isDarkMode ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-emerald-50 border-emerald-200'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          <ShieldCheck size={14}/> Your Last Update Note
                        </span>
                        <p className={`text-sm font-medium italic ${isDarkMode ? 'text-emerald-100' : 'text-emerald-900'}`}>"{tix.admin_notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* 🌟 ADMIN ACTION CONTROLS */}
                  <div className={`pt-6 border-t mt-auto ${theme.divider}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      
                      <button
                        disabled={updatingId === tix.id}
                        onClick={() => executeTicketVerdict(tix.id, 'In Progress', tix.created_by)}
                        className="flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        <PlayCircle size={16} /> Work on it
                      </button>
                      
                      <button
                        disabled={updatingId === tix.id}
                        onClick={() => executeTicketVerdict(tix.id, 'On Hold', tix.created_by)}
                        className="flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        <PauseCircle size={16} /> Place On Hold
                      </button>

                      <button
                        disabled={updatingId === tix.id}
                        onClick={() => executeTicketVerdict(tix.id, 'Resolved', tix.created_by)}
                        className="flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-sm"
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
    </div>
  );
}