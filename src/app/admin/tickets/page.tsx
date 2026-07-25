'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ArrowLeft, Ticket as TicketIcon, Clock, CheckCircle2, 
  AlertTriangle, Search, RefreshCw, ShieldCheck, Image as ImageIcon, 
  PauseCircle, PlayCircle, ExternalLink, User, X, MessageSquarePlus,
  Send, History, ShieldAlert, Check, Timer
} from 'lucide-react';

function AdminTicketsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'open' | 'progress' | 'hold' | 'resolved' | 'all'>('open');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Follow-up Note Modal State
  const [noteModal, setNoteModal] = useState<{ isOpen: boolean; ticket: any; note: string; targetStatus: string }>({
    isOpen: false,
    ticket: null,
    note: '',
    targetStatus: ''
  });

  // 🌟 REAL-TIME GLOBAL THEME LISTENER
  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('vsit_theme');
      const isDark = savedTheme === 'dark' || document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    checkTheme();
    window.addEventListener('storage', checkTheme);
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    fetchTickets();

    // 🌟 REAL-TIME SUPABASE ALERT LISTENER FOR NEW TICKETS
    const ticketChannel = supabase
      .channel('support-live-tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
        const newTix = payload.new;
        toast.error(`🔔 New IT Support Ticket: ${newTix.title}`, {
          duration: 6000,
          style: { background: isDarkMode ? '#150f24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', fontWeight: 'bold', border: '1px solid #ea580c' }
        });
        fetchTickets();
      })
      .subscribe();

    return () => { 
      window.removeEventListener('storage', checkTheme);
      observer.disconnect();
      supabase.removeChannel(ticketChannel); 
    };
  }, [isDarkMode]);

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
      toast.error(`Error loading support desk queue: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 TIME-TRACKING & WAITING AGE CALCULATOR ENGINE
  const getTicketTimeMetrics = (createdAt: string, updatedAt: string, status: string) => {
    if (!createdAt) return { label: 'Unknown Age', color: 'text-slate-400' };
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const end = (status.toLowerCase().includes('resolved') || status.toLowerCase().includes('closed')) && updatedAt 
      ? new Date(updatedAt).getTime() 
      : now;
    
    const diffMs = Math.max(0, end - start);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    let timeStr = '';
    if (days > 0) timeStr = `${days}d ${remHours}h ${mins}m`;
    else if (hours > 0) timeStr = `${hours}h ${mins}m`;
    else timeStr = `${mins}m`;

    if (status.toLowerCase().includes('resolved') || status.toLowerCase().includes('closed')) {
      return { label: `🏁 Resolved in: ${timeStr}`, color: isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }

    if (days >= 2) {
      return { label: `⚠️ Overdue Waiting: ${timeStr}`, color: isDarkMode ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse' : 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse' };
    }
    return { label: `⏱️ Waiting Age: ${timeStr}`, color: isDarkMode ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-orange-700 bg-orange-50 border-orange-200' };
  };

  // 🌟 EXECUTE TICKET VERDICT & FOLLOW-UP PINGS
  const executeTicketVerdict = async (ticketId: string, newStatus: string, staffEmail: string, customRemarks?: string) => {
    let remarks = customRemarks;
    if (remarks === undefined) {
      remarks = prompt(`Enter follow-up update note for staff member (Status changing to: ${newStatus}):`) || '';
      if (!confirm(`Confirm status update to "${newStatus}"?`)) return;
    }

    setUpdatingId(ticketId);
    try {
      const timestamp = new Date().toISOString();
      const { error: tixErr } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus, 
          admin_notes: remarks || `Ticket status updated to ${newStatus} by IT Administration.`,
          updated_at: timestamp
        })
        .eq('id', ticketId);
        
      if (tixErr) throw tixErr;

      // 🌟 PUSH ACTIVE NOTIFICATION TO STAFF DASHBOARD
      if (staffEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', staffEmail)
          .maybeSingle();

        if (profile?.id) {
          try {
            await supabase.from('notifications').insert([{
              target_user: profile.id,
              title: newStatus === 'Resolved' ? '✔ IT Ticket Resolved' : `🛠️ Support Update: ${newStatus}`,
              message: remarks || `Your support ticket status was updated to ${newStatus}.`,
              is_read: false,
              type: newStatus === 'Resolved' ? 'success' : 'info'
            }]);
          } catch (notifErr) {
            console.warn("Non-fatal notification error:", notifErr);
          }
        }
      }

      setTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, status: newStatus, admin_notes: remarks || `Ticket status updated to ${newStatus} by IT Administration.`, updated_at: timestamp } 
          : t
      ));

      toast.success(`✔ Ticket updated to "${newStatus}". Notification pushed to staff.`);
      setNoteModal({ isOpen: false, ticket: null, note: '', targetStatus: '' });
    } catch (err: any) {
      toast.error(`Error updating ticket: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenFollowUpModal = (ticket: any, status: string) => {
    setNoteModal({
      isOpen: true,
      ticket: ticket,
      note: ticket.admin_notes || '',
      targetStatus: status || ticket.status || 'In Progress'
    });
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('progress')) return isDarkMode ? 'text-purple-300 bg-purple-950/60 border-purple-800/60' : 'text-purple-700 bg-purple-50 border-purple-200';
    if (s.includes('hold')) return isDarkMode ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-700 bg-amber-50 border-amber-200';
    if (s.includes('resolved') || s.includes('closed')) return isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
    return isDarkMode ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 animate-pulse' : 'text-orange-700 bg-orange-50 border-orange-300 animate-pulse';
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0b0712]' : 'bg-slate-50',
    card: isDarkMode ? 'bg-[#150f24] border-purple-900/40' : 'bg-white border-slate-200/80',
    textMain: isDarkMode ? 'text-purple-50' : 'text-slate-900',
    textSub: isDarkMode ? 'text-purple-300/70' : 'text-slate-500', 
    cardHover: isDarkMode ? 'hover:border-orange-500/60 hover:bg-[#1c1430]' : 'hover:border-orange-400 hover:shadow-lg hover:-translate-y-1',
    iconBgPrimary: isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50 text-orange-600',
    iconBgPurple: isDarkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-50 text-purple-700',
  };

  const filteredTickets = tickets.filter(t => {
    const s = (t.status || '').toLowerCase().trim();
    const isResolved = s.includes('resolved') || s.includes('closed');
    const isProgress = s.includes('progress');
    const isHold = s.includes('hold');
    const isOpen = !isResolved && !isProgress && !isHold;

    const matchesTab = 
      filterTab === 'all' ? true :
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
      <Toaster position="top-right" />
      
      {/* 🌟 FULL-SCREEN ENTERPRISE FLUID WRAPPER */}
      <div className="w-full max-w-7xl px-3 sm:px-6 lg:px-10 mx-auto space-y-5 sm:space-y-6 pt-4">
        
        {/* 🌟 DYNAMIC HEADER (WITH BACK ARROW IN FRONT OF ICON) */}
        <div className={`${theme.card} rounded-3xl p-4 sm:p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 transition-all duration-300`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <button 
              onClick={() => router.push('/admin')} 
              className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${theme.card} hover:border-orange-500 hover:text-orange-600 ${theme.textSub}`}
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-xl sm:text-3xl font-black tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <TicketIcon className="text-orange-600 dark:text-orange-400 w-6 h-6 shrink-0" />
                  <span>Support Desk Commander</span>
                </h1>
                {openCount > 0 && (
                  <span className="px-3 py-0.5 bg-orange-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-sm">
                    {openCount} New Requests
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm font-semibold ${theme.textSub}`}>Triage IT infrastructure requests, log follow-up notes, track waiting age, and push live staff alerts</p>
            </div>
          </div>

          <button 
            onClick={fetchTickets} 
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-50 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 ${theme.card} ${theme.textMain} shrink-0`}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-orange-600' : 'text-purple-600 dark:text-purple-400'} />
            <span>Sync Live Queue</span>
          </button>
        </div>

        {/* 🌟 BRAND COLOR NAVIGATION TABS & ADAPTIVE SEARCH BAR */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'open', label: `Open Queue (${openCount})`, icon: <AlertTriangle size={14} /> },
              { id: 'progress', label: `In Progress (${tickets.filter(t => (t.status || '').toLowerCase().includes('progress')).length})`, icon: <Clock size={14} /> },
              { id: 'hold', label: `On Hold (${tickets.filter(t => (t.status || '').toLowerCase().includes('hold')).length})`, icon: <PauseCircle size={14} /> },
              { id: 'resolved', label: `Resolved Archive (${tickets.filter(t => (t.status || '').toLowerCase().includes('resolved')).length})`, icon: <CheckCircle2 size={14} /> },
              { id: 'all', label: `All Tickets (${tickets.length})`, icon: <History size={14} /> }
            ].map(tab => {
              const isActive = filterTab === tab.id;
              return (
                <button
                  key={tab.id} onClick={() => setFilterTab(tab.id as any)}
                  className={`group flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest shrink-0 cursor-pointer transition-all duration-200 border ${
                    isActive 
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25 border-orange-600 scale-[1.02]' 
                      : `${theme.card} ${theme.textSub} hover:text-purple-600 hover:border-purple-300 dark:hover:text-purple-300 dark:hover:border-purple-700`
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-purple-500 dark:text-purple-400 group-hover:text-orange-500 transition-colors'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 100% Adaptive Search Bar */}
          <div 
            style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', borderColor: isDarkMode ? '#581c87' : '#e2e8f0' }}
            className="p-2.5 rounded-2xl border shadow-sm flex items-center transition-all duration-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 hover:border-orange-300"
          >
            <div className="relative w-full">
              <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Employee Name, ID Code, Request Title, or Problem Description..." 
                style={{ backgroundColor: 'transparent', color: isDarkMode ? '#f3e8ff' : '#0f172a', colorScheme: isDarkMode ? 'dark' : 'light' }}
                className="w-full pl-12 pr-4 py-3 rounded-xl text-xs sm:text-sm font-semibold outline-none transition-all bg-transparent border-0 shadow-none"
              />
            </div>
          </div>
        </div>

        {/* 🌟 TICKETS LISTING GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${isDarkMode ? 'border-orange-400' : 'border-orange-600'}`}></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Fetching Active Support Queue...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm transition-colors ${theme.card}`}>
            <TicketIcon size={48} className={`mx-auto ${isDarkMode ? 'text-zinc-700' : 'text-purple-200'}`} />
            <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Support Tickets Found</h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>The active support queue is clear for this filter category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTickets.map(tix => {
              const timeMetric = getTicketTimeMetrics(tix.created_at, tix.updated_at, tix.status || 'Open');
              const isResolved = (tix.status || '').toLowerCase().includes('resolved') || (tix.status || '').toLowerCase().includes('closed');

              return (
                <div key={tix.id} className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-all duration-300 flex flex-col justify-between gap-6 ${theme.card} ${theme.cardHover}`}>
                  
                  {/* Top: Status Badges & Time Age */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-2xs ${getStatusBadge(tix.status)}`}>
                          {tix.status || 'Open'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                          isDarkMode ? 'bg-purple-950/60 text-purple-300 border-purple-800/60' : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          {tix.category || 'Hardware'}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shadow-2xs ${timeMetric.color}`}>
                        {timeMetric.label}
                      </span>
                    </div>

                    <div>
                      <h3 className={`text-lg font-bold leading-snug ${theme.textMain} group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors`}>
                        {tix.title}
                      </h3>
                    </div>

                    {/* Employee Box */}
                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0f0a1c]/80 border-purple-900/50' : 'bg-slate-50/80 border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${theme.iconBgPrimary}`}>
                          <User size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <span className={`text-[9px] font-bold uppercase tracking-widest block ${theme.textSub}`}>Employee Holder</span>
                          <p className={`text-sm font-bold truncate ${theme.textMain}`}>{tix.staff_name || tix.created_by}</p>
                        </div>
                      </div>
                      <span className={`font-mono text-xs font-bold px-2 py-1 rounded-md border shadow-2xs ${
                        isDarkMode ? 'bg-[#18181b] text-purple-300 border-purple-800/50' : 'bg-white text-purple-950 border-purple-200'
                      }`}>
                        {tix.emp_code || 'N/A'}
                      </span>
                    </div>

                    {/* Problem Description */}
                    <div className="space-y-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${theme.textSub}`}>
                        <AlertTriangle size={13} className="text-orange-500" /> Problem Description
                      </span>
                      <div className={`p-4 rounded-2xl border text-xs font-medium whitespace-pre-wrap leading-relaxed transition-colors ${
                        isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50 text-purple-100' : 'bg-purple-50/40 border-purple-100 text-slate-800'
                      }`}>
                        "{tix.description}"
                      </div>
                    </div>

                    {/* User Attached Screenshot */}
                    {tix.screenshot_attachment && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                          <ImageIcon size={13}/> Attached Screenshot
                        </span>
                        <div 
                          onClick={() => setPreviewImage(tix.screenshot_attachment)}
                          className={`p-2 border rounded-2xl inline-block shadow-sm hover:border-orange-500 dark:hover:border-orange-400 transition-all duration-200 cursor-pointer overflow-hidden group/img ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/60' : 'bg-purple-50/50 border-purple-200'}`}
                        >
                          <div className="relative">
                            <img 
                              src={tix.screenshot_attachment} 
                              alt="Ticket Evidence" 
                              className="h-28 object-contain rounded-xl group-hover/img:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-purple-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white rounded-xl">
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-900/80 px-2.5 py-1 rounded-lg border border-purple-500/40 flex items-center gap-1">
                                <ExternalLink size={10} /> Expand
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Admin Last Update Note */}
                    {tix.admin_notes && (
                      <div className={`p-4 rounded-2xl border space-y-1 transition-colors ${isDarkMode ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-emerald-50/80 border-emerald-200'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                          <ShieldCheck size={14}/> IT Follow-up Note ({tix.updated_at ? new Date(tix.updated_at).toLocaleDateString('en-IN') : 'Logged'})
                        </span>
                        <p className={`text-xs font-semibold italic ${isDarkMode ? 'text-emerald-200' : 'text-emerald-950'}`}>"{tix.admin_notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Action Controls */}
                  <div className={`pt-5 border-t mt-auto space-y-2.5 ${isDarkMode ? 'border-purple-900/40' : 'border-slate-100'}`}>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={updatingId === tix.id}
                        onClick={() => executeTicketVerdict(tix.id, 'In Progress', tix.created_by)}
                        className="flex items-center justify-center gap-1.5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
                      >
                        <PlayCircle size={14} className="text-orange-400" /> Work on it
                      </button>
                      
                      <button
                        type="button"
                        disabled={updatingId === tix.id}
                        onClick={() => executeTicketVerdict(tix.id, 'On Hold', tix.created_by)}
                        className="flex items-center justify-center gap-1.5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
                      >
                        <PauseCircle size={14} /> Place On Hold
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleOpenFollowUpModal(tix, tix.status || 'In Progress')}
                        className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm active:scale-95 border ${
                          isDarkMode ? 'bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border-purple-800' : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-200'
                        }`}
                      >
                        <MessageSquarePlus size={14} /> Add Follow-up Note
                      </button>

                      <button
                        type="button"
                        disabled={updatingId === tix.id || isResolved}
                        onClick={() => executeTicketVerdict(tix.id, 'Resolved', tix.created_by)}
                        className="flex items-center justify-center gap-1.5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
                      >
                        <CheckCircle2 size={14} /> Resolve Ticket
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* 🌟 FOLLOW-UP NOTE & STATUS UPDATE MODAL */}
        {noteModal.isOpen && noteModal.ticket && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={`rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border flex flex-col animate-in zoom-in-95 duration-300 ${theme.card}`}>
              
              <div className={`p-6 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-purple-50/70 border-purple-100'}`}>
                <h3 className={`font-black text-base tracking-tight uppercase flex items-center gap-2.5 ${theme.textMain}`}>
                  <MessageSquarePlus size={18} className="text-orange-600 dark:text-orange-400"/> Log IT Follow-up Note
                </h3>
                <button onClick={() => setNoteModal({ isOpen: false, ticket: null, note: '', targetStatus: '' })} className={`p-2 rounded-full cursor-pointer transition-colors border ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}><X size={18}/></button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className={`text-xs font-bold uppercase mb-1.5 block ${theme.textSub}`}>Target Ticket Status</label>
                  <select 
                    style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', borderColor: isDarkMode ? '#581c87' : '#cbd5e1' }}
                    value={noteModal.targetStatus}
                    onChange={(e) => setNoteModal({ ...noteModal, targetStatus: e.target.value })}
                    className="w-full p-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-orange-500/20 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    <option value="Open" style={{ backgroundColor: isDarkMode ? '#181130' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>Open Queue</option>
                    <option value="In Progress" style={{ backgroundColor: isDarkMode ? '#181130' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>In Progress (Working on it)</option>
                    <option value="On Hold" style={{ backgroundColor: isDarkMode ? '#181130' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>On Hold (Awaiting Parts/Info)</option>
                    <option value="Resolved" style={{ backgroundColor: isDarkMode ? '#181130' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>Resolved & Closed</option>
                  </select>
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase mb-1.5 block ${theme.textSub}`}>Administrative Follow-up Remarks</label>
                  <textarea 
                    rows={4}
                    value={noteModal.note}
                    onChange={(e) => setNoteModal({ ...noteModal, note: e.target.value })}
                    placeholder="Enter detailed update instructions, diagnosis, or waiting reason for employee..."
                    style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', borderColor: isDarkMode ? '#581c87' : '#cbd5e1' }}
                    className="w-full p-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-orange-500/20 text-xs sm:text-sm font-medium transition-all"
                  />
                </div>

                <div className={`p-4 rounded-xl border flex gap-3 text-xs font-medium leading-relaxed ${isDarkMode ? 'bg-purple-950/30 border-purple-800/50 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'}`}>
                  <Send size={18} className="text-orange-500 shrink-0 mt-0.5" />
                  <p>Saving this will immediately log the timestamped follow-up note and push an active notification ping directly to the staff member's portal dashboard.</p>
                </div>
              </div>

              <div className={`p-6 border-t flex justify-end gap-3 shrink-0 ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-slate-50 border-slate-200'}`}>
                <button onClick={() => setNoteModal({ isOpen: false, ticket: null, note: '', targetStatus: '' })} className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border transition-colors ${theme.card} ${theme.textSub} hover:text-slate-800 dark:hover:text-white`}>Cancel</button>
                <button 
                  onClick={() => executeTicketVerdict(noteModal.ticket.id, noteModal.targetStatus, noteModal.ticket.created_by, noteModal.note)}
                  disabled={updatingId === noteModal.ticket.id}
                  className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-600/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {updatingId === noteModal.ticket.id ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                  Save Note & Update Ticket
                </button>
              </div>

            </div>
          </div>
        )}

        {/* High-Res Screenshot Lightbox Modal */}
        {previewImage && (
          <div 
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          >
            <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center">
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-orange-600 rounded-full transition-colors cursor-pointer"
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
    </div>
  );
}

export default function AdminTicketsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0712] flex flex-col items-center justify-center gap-4 text-slate-400 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-orange-600 dark:border-t-orange-500"></div>
        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-purple-300">Loading Support Desk Queue...</span>
      </div>
    }>
      <AdminTicketsContent />
    </Suspense>
  );
}