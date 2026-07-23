'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Ticket as TicketIcon, Clock, CheckCircle2, 
  AlertTriangle, Search, RefreshCw, ShieldCheck, Image as ImageIcon, 
  PauseCircle, PlayCircle, ExternalLink, User, Sparkles, X
} from 'lucide-react';

export default function AdminTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'open' | 'progress' | 'hold' | 'resolved'>('open');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
    const remarks = prompt(`Provide an update note for the staff member (Status changing to: ${newStatus}):`) || '';
    
    if (!confirm(`Confirm status change to "${newStatus}"?`)) return;

    setUpdatingId(ticketId);
    try {
      const { error: tixErr } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus, 
          admin_notes: remarks || `Status updated to ${newStatus} by IT Administration.`,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);
        
      if (tixErr) throw tixErr;

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

  // 🎨 Deep Purple & Light Orange Brand Badges
  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('progress')) return isDarkMode ? 'text-purple-300 bg-purple-900/40 border-purple-700/60' : 'text-purple-800 bg-purple-100 border-purple-300';
    if (s.includes('hold')) return isDarkMode ? 'text-amber-300 bg-amber-950/40 border-amber-700/60' : 'text-amber-800 bg-amber-100 border-amber-300';
    if (s.includes('resolved') || s.includes('closed')) return isDarkMode ? 'text-emerald-300 bg-emerald-950/40 border-emerald-700/60' : 'text-emerald-800 bg-emerald-100 border-emerald-300';
    return isDarkMode ? 'text-orange-300 bg-orange-950/40 border-orange-700/60' : 'text-orange-800 bg-orange-100 border-orange-300';
  };

  // 🌟 BRAND PALETTE: DEEP PURPLE & LIGHT ORANGE (HIGH CONTRAST)
  const theme = {
    bg: isDarkMode ? 'bg-[#0b0712]' : 'bg-gradient-to-br from-orange-50/30 via-purple-50/20 to-slate-50',
    card: isDarkMode ? 'bg-[#150f24] border-purple-900/40' : 'bg-white border-purple-200/80',
    textMain: isDarkMode ? 'text-purple-50' : 'text-slate-900',
    textSub: isDarkMode ? 'text-purple-300/70' : 'text-slate-600', 
    inputBg: isDarkMode ? 'bg-[#0f0a1c] border-purple-900/60 focus:border-orange-500 text-purple-100 placeholder-purple-400/50' : 'bg-slate-50/80 border-purple-200/60 focus:border-purple-600 text-slate-900 placeholder-slate-400 font-medium',
    cardHover: isDarkMode ? 'hover:border-purple-600/70 hover:bg-[#1c1430] hover:shadow-xl hover:shadow-purple-950/50 hover:-translate-y-1' : 'hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1',
    divider: isDarkMode ? 'border-purple-900/40' : 'border-purple-100/70',
    iconBgBrand: isDarkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-900 font-bold',
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
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-12`}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* BRAND HEADER */}
        <div className={`${theme.card} rounded-3xl p-5 md:p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300`}>
          <div className="flex items-center gap-5">
            <button onClick={() => router.push('/admin')} className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${theme.card} hover:border-orange-500 hover:text-orange-600 ${theme.textSub}`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`text-2xl font-black tracking-tight ${theme.textMain} flex items-center gap-2.5`}>
                  <ShieldCheck className="text-purple-700 dark:text-purple-400" />
                  Support Desk Commander 
                  <span className="text-orange-600 dark:text-orange-400 text-xs font-extrabold ml-1 bg-orange-50 dark:bg-orange-950/50 border border-orange-300 dark:border-orange-800/60 px-2.5 py-1 rounded-lg uppercase tracking-wider">(v3.0 Brand Edition)</span>
                </h1>
                {openCount > 0 && (
                  <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-md shadow-orange-500/20">
                    {openCount} New Requests
                  </span>
                )}
              </div>
              <p className={`text-sm font-bold ${theme.textSub}`}>Triage, update, and resolve staff hardware and IT infrastructure requests.</p>
            </div>
          </div>
          <button 
            onClick={fetchTickets} 
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border transition-all duration-200 text-xs font-black uppercase tracking-wider cursor-pointer ${theme.card} hover:border-purple-500 hover:text-purple-700 dark:hover:text-purple-300 ${theme.textMain} shadow-sm active:scale-95`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-orange-500' : 'text-purple-600 dark:text-purple-400'} /> Sync Live Queue
          </button>
        </div>

        {/* TABS & SEARCH */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {[
              { id: 'open', label: `Open Queue (${openCount})`, icon: <AlertTriangle size={14} /> },
              { id: 'progress', label: 'In Progress', icon: <Clock size={14} /> },
              { id: 'hold', label: 'On Hold', icon: <PauseCircle size={14} /> },
              { id: 'resolved', label: 'Resolved Archive', icon: <CheckCircle2 size={14} /> }
            ].map(tab => {
              const isActive = filterTab === tab.id;
              return (
                <button
                  key={tab.id} onClick={() => setFilterTab(tab.id as any)}
                  className={`group flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer border ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-700 to-purple-900 text-white shadow-lg shadow-purple-900/25 border-purple-600 scale-[1.02]' 
                      : `${theme.card} ${theme.textSub} hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 dark:hover:bg-purple-950/50 dark:hover:text-purple-300 border`
                  }`}
                >
                  <span className={isActive ? 'text-orange-400' : 'text-purple-500 group-hover:text-orange-500 transition-colors'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className={`p-2.5 rounded-2xl border shadow-sm flex items-center transition-all duration-200 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-600/10 hover:border-purple-400 ${theme.card}`}>
            <div className="relative w-full">
              <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
              <input 
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Employee Name, ID Code, or Request Title..." 
                className={`w-full pl-12 pr-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`}
              />
            </div>
          </div>
        </div>

        {/* TICKETS GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-purple-400' : 'border-purple-700'}`}></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Fetching Active Support Queue...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm transition-colors ${theme.card}`}>
            <TicketIcon size={48} className={`mx-auto ${isDarkMode ? 'text-purple-900' : 'text-purple-200'}`} />
            <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Tickets Found</h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>The active support queue is clear for this filter category.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTickets.map(tix => (
              <div key={tix.id} className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-all duration-300 flex flex-col xl:flex-row gap-8 ${theme.card} ${theme.cardHover}`}>
                
                {/* LEFT: Ticket Context & User Info */}
                <div className={`w-full xl:w-1/3 flex flex-col gap-6 shrink-0 border-b xl:border-b-0 xl:border-r pb-6 xl:pb-0 xl:pr-8 ${theme.divider}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-2xs ${getStatusColor(tix.status)}`}>
                        {tix.status || 'Open'}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-purple-950/60 text-purple-300 border-purple-800/60' : 'bg-purple-50 text-purple-800 border-purple-200'}`}>
                        {tix.category}
                      </span>
                    </div>
                    <h3 className={`text-lg font-black leading-snug ${theme.textMain} group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors`}>{tix.title}</h3>
                  </div>

                  <div className={`p-5 rounded-2xl border space-y-3.5 transition-colors ${isDarkMode ? 'bg-[#0f0a1c]/80 border-purple-900/50' : 'bg-purple-50/40 border-purple-100'}`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>Employee</span>
                      <span className={`font-extrabold ${theme.textMain}`}>{tix.staff_name || tix.created_by}</span>
                    </div>
                    <div className={`flex justify-between items-center text-xs border-t pt-3.5 ${theme.divider}`}>
                      <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>Emp ID</span>
                      <span className={`font-mono font-black ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>{tix.emp_code || 'N/A'}</span>
                    </div>
                    <div className={`flex justify-between items-center text-xs border-t pt-3.5 ${theme.divider}`}>
                      <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>Submitted</span>
                      <span className={`font-bold ${theme.textMain}`}>{new Date(tix.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Details, Screenshot, and Admin Controls */}
                <div className="w-full xl:w-2/3 flex flex-col justify-between gap-6">
                  
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${theme.textSub}`}>
                        <AlertTriangle size={14} className="text-orange-500" /> Problem Description
                      </h4>
                      <div className={`p-5 rounded-2xl border text-sm font-semibold whitespace-pre-wrap leading-relaxed transition-colors ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50 text-purple-100' : 'bg-purple-50/30 border-purple-100/80 text-slate-800'}`}>
                        {tix.description}
                      </div>
                    </div>

                    {/* 🌟 THE ADMIN SCREENSHOT VIEWER */}
                    {tix.screenshot_attachment && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                          <ImageIcon size={14}/> User Attached Screenshot
                        </h4>
                        <div 
                          onClick={() => setPreviewImage(tix.screenshot_attachment)}
                          className={`p-2 border rounded-2xl inline-block shadow-sm hover:border-orange-500 dark:hover:border-orange-400 transition-all duration-200 cursor-pointer overflow-hidden group/img ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/60' : 'bg-purple-50/50 border-purple-200'}`}
                        >
                          <div className="relative">
                            <img 
                              src={tix.screenshot_attachment} 
                              alt="Ticket Evidence" 
                              className="h-36 object-contain rounded-xl group-hover/img:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-purple-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white rounded-xl">
                              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-900/80 px-3 py-1.5 rounded-lg border border-purple-500/40 flex items-center gap-1.5">
                                <ExternalLink size={12} /> Expand View
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 🌟 DISPLAY THE PREVIOUS ADMIN RESPONSE IF IT EXISTS */}
                    {tix.admin_notes && (
                      <div className={`p-4.5 rounded-2xl border space-y-1.5 transition-colors ${isDarkMode ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-emerald-50/80 border-emerald-200'}`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                          <ShieldCheck size={14}/> Your Last Update Note
                        </span>
                        <p className={`text-sm font-semibold italic ${isDarkMode ? 'text-emerald-200' : 'text-emerald-950'}`}>"{tix.admin_notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* 🌟 ADMIN ACTION CONTROLS */}
                  <div className={`pt-6 border-t mt-auto ${theme.divider}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      
                      <button
                        disabled={updatingId === tix.id}
                        onClick={() => executeTicketVerdict(tix.id, 'In Progress', tix.created_by)}
                        className="flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-md shadow-purple-900/20 hover:shadow-lg hover:shadow-purple-900/30 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <PlayCircle size={16} className="text-orange-400" /> Work on it
                      </button>
                      
                      <button
                        disabled={updatingId === tix.id}
                        onClick={() => executeTicketVerdict(tix.id, 'On Hold', tix.created_by)}
                        className="flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <PauseCircle size={16} /> Place On Hold
                      </button>

                      <button
                        disabled={updatingId === tix.id}
                        onClick={() => executeTicketVerdict(tix.id, 'Resolved', tix.created_by)}
                        className="flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <CheckCircle2 size={16} /> Resolve Request
                      </button>

                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🌟 HIGH-RES SCREENSHOT LIGHTBOX MODAL */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <img 
              src={previewImage} 
              alt="High Resolution Screenshot" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
}