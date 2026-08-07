'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ArrowLeft, Ticket as TicketIcon, Clock, CheckCircle2, 
  AlertTriangle, Search, RefreshCw, ShieldCheck, Image as ImageIcon, 
  PauseCircle, PlayCircle, ExternalLink, User, X, MessageSquarePlus,
  Send, History, ShieldAlert
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

  const [viewTicket, setViewTicket] = useState<any | null>(null);

  const [noteModal, setNoteModal] = useState<{ isOpen: boolean; ticket: any; note: string; targetStatus: string }>({
    isOpen: false,
    ticket: null,
    note: '',
    targetStatus: ''
  });

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

    const ticketChannel = supabase
      .channel('support-live-tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
        const newTix = payload.new;
        toast.error(`🔔 New IT Support Ticket: ${newTix.title}`, {
          duration: 6000,
          style: { background: isDarkMode ? '#18181b' : '#ffffff', color: isDarkMode ? '#f4f4f5' : '#0f172a', fontWeight: 'bold', border: '1px solid #f97316' }
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

  const getTicketTimeMetrics = (createdAt: string, updatedAt: string, status: string) => {
    if (!createdAt) return { label: 'Unknown', color: 'text-slate-400' };
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
    if (days > 0) timeStr = `${days}d ${remHours}h`;
    else if (hours > 0) timeStr = `${hours}h ${mins}m`;
    else timeStr = `${mins}m`;

    if (status.toLowerCase().includes('resolved') || status.toLowerCase().includes('closed')) {
      return { label: `Resolved: ${timeStr}`, color: isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }

    if (days >= 2) {
      return { label: `Overdue: ${timeStr}`, color: isDarkMode ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse' : 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse' };
    }
    return { label: `Wait: ${timeStr}`, color: isDarkMode ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-orange-700 bg-orange-50 border-orange-200' };
  };

  const executeTicketVerdict = async (ticketId: string, newStatus: string, staffEmail: string, customRemarks?: string) => {
    setUpdatingId(ticketId);
    try {
      const timestamp = new Date().toISOString();
      const { error: tixErr } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus, 
          admin_notes: customRemarks || `Ticket status updated to ${newStatus} by IT Administration.`,
          updated_at: timestamp
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
          try {
            await supabase.from('notifications').insert([{
              target_user: profile.id,
              title: newStatus === 'Resolved' ? '✔ IT Ticket Resolved' : `🛠️ Support Update: ${newStatus}`,
              message: customRemarks || `Your support ticket status was updated to ${newStatus}.`,
              is_read: false,
              type: newStatus === 'Resolved' ? 'success' : 'info'
            }]);
          } catch (notifErr) {}
        }
      }

      setTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, status: newStatus, admin_notes: customRemarks || `Ticket status updated to ${newStatus} by IT Administration.`, updated_at: timestamp } 
          : t
      ));

      if (viewTicket && viewTicket.id === ticketId) {
        setViewTicket({ ...viewTicket, status: newStatus, admin_notes: customRemarks || `Ticket status updated to ${newStatus} by IT Administration.`, updated_at: timestamp });
      }

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
    bg: 'bg-transparent',
    glassCard: isDarkMode 
      ? 'bg-[#18181b]/40 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(31,38,135,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',
    glassItem: isDarkMode
      ? 'bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300'
      : 'bg-white/50 backdrop-blur-2xl border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-300',
    glassInner: isDarkMode
      ? 'bg-black/40 backdrop-blur-md border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]'
      : 'bg-white/50 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]',
    inputBg: isDarkMode 
      ? 'bg-black/50 border border-white/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20' 
      : 'bg-white/50 border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
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
    <div className={`min-h-screen ${theme.bg} transition-colors duration-1000 font-sans antialiased pb-12 relative overflow-x-hidden`}>
      <Toaster position="top-right" />
      
      <div className="fixed top-[-10%] left-[0%] w-[50vw] h-[50vh] bg-orange-500/20 dark:bg-orange-600/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-10%] right-[0%] w-[50vw] h-[50vh] bg-purple-600/20 dark:bg-purple-700/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 mx-auto space-y-5 sm:space-y-6 pt-4 relative z-10">
        
        <div className={`${theme.glassCard} rounded-4xl p-4 sm:p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 transition-all duration-300`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <button 
              onClick={() => router.push('/admin')} 
              className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${theme.glassItem} hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 ${theme.textSub}`}
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <TicketIcon className="text-orange-500 dark:text-orange-400 w-5 h-5 shrink-0" />
                  <span>Support Desk Commander</span>
                </h1>
                {openCount > 0 && (
                  <span className="px-3 py-1 bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-[0_4px_15px_rgba(249,115,22,0.4)]">
                    {openCount} New Requests
                  </span>
                )}
              </div>
              <p className={`text-xs font-medium ${theme.textSub}`}>Triage IT infrastructure requests, log follow-up notes, and track queue age</p>
            </div>
          </div>

          <button 
            onClick={fetchTickets} 
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 ${theme.glassItem} ${theme.textMain} shrink-0`}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-orange-500' : 'text-purple-500 dark:text-purple-400'} />
            <span>Sync Queue</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
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
                      ? 'bg-orange-500 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] border-orange-500 scale-[1.02]' 
                      : `${theme.glassItem} ${theme.textSub} hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 dark:hover:text-orange-400`
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-orange-500 dark:text-orange-400 group-hover:text-orange-600 transition-colors'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className={`p-2 rounded-2xl flex items-center transition-all duration-200 ${theme.inputBg}`}>
            <div className="relative w-full">
              <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Employee Name, ID Code, Request Title, or Problem Description..." 
                className={`w-full pl-11 pr-4 py-2 bg-transparent text-xs sm:text-sm font-medium outline-none transition-all border-0 shadow-none ${isDarkMode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-slate-900 placeholder:text-slate-400'}`}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className={`animate-spin rounded-full h-10 w-10 border-b-2 text-orange-500 border-orange-500`}></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Fetching Active Support Queue...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className={`w-full py-24 rounded-4xl text-center space-y-3 shadow-sm transition-colors ${theme.glassCard}`}>
            <TicketIcon size={48} className={`mx-auto opacity-60 text-orange-500`} />
            <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Support Tickets Found</h3>
            <p className={`text-xs font-medium ${theme.textSub}`}>The active support queue is clear for this filter category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredTickets.map(tix => {
              const timeMetric = getTicketTimeMetrics(tix.created_at, tix.updated_at, tix.status || 'Open');

              return (
                <div 
                  key={tix.id} 
                  onClick={() => setViewTicket(tix)}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all duration-300 flex flex-col gap-4 cursor-pointer hover:-translate-y-1 hover:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 dark:hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] group ${theme.glassItem}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border shadow-sm ${getStatusBadge(tix.status)}`}>
                        {tix.status || 'Open'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border ${isDarkMode ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-800 border-purple-200'}`}>
                        {tix.category || 'Hardware'}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border shadow-sm text-right shrink-0 ${timeMetric.color}`}>
                      {timeMetric.label.replace('Waiting Age: ', '').replace('Resolved in: ', '')}
                    </span>
                  </div>

                  <div>
                    <h3 className={`text-sm font-bold leading-snug line-clamp-2 transition-colors ${theme.textMain} group-hover:text-orange-500 dark:group-hover:text-orange-400`} title={tix.title}>
                      {tix.title}
                    </h3>
                    <p className={`text-[11px] font-medium mt-1.5 line-clamp-2 ${theme.textSub}`}>
                      {tix.description}
                    </p>
                  </div>

                  <div className={`mt-auto pt-3 border-t flex items-center justify-between ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                        <User size={12} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] font-bold truncate ${theme.textMain}`}>{tix.staff_name || tix.created_by}</span>
                        <span className={`text-[9px] font-mono ${theme.textSub}`}>{tix.emp_code || 'N/A'}</span>
                      </div>
                    </div>
                    {tix.screenshot_attachment && (
                      <ImageIcon size={14} className="text-purple-500 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 🌟 VIEW FULL TICKET DETAILS MODAL */}
        {viewTicket && (() => {
          const timeMetric = getTicketTimeMetrics(viewTicket.created_at, viewTicket.updated_at, viewTicket.status || 'Open');
          const isResolved = (viewTicket.status || '').toLowerCase().includes('resolved') || (viewTicket.status || '').toLowerCase().includes('closed');

          return (
            <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-200 ${isDarkMode ? 'bg-slate-950/60' : 'bg-slate-900/20'}`}>
              <div className={`max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border-2 shadow-[0_32px_80px_rgba(0,0,0,0.4)] ${theme.glassCard} ${isDarkMode ? 'border-orange-500/30' : 'border-white/80'}`}>
                
                {/* Modal Header */}
                <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/60 bg-white/50'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border shadow-sm ${getStatusBadge(viewTicket.status)}`}>
                      {viewTicket.status || 'Open'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shadow-sm ${timeMetric.color}`}>
                      {timeMetric.label}
                    </span>
                  </div>
                  <button onClick={() => setViewTicket(null)} className={`p-2 rounded-full transition-all hover:scale-110 cursor-pointer ${theme.glassInner} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-400 active:scale-90`}><X size={18}/></button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-5">
                  
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold leading-snug ${theme.textMain}`}>
                      {viewTicket.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-800 border-purple-200'}`}>
                        {viewTicket.category || 'Hardware'}
                      </span>
                      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
                        Submitted: {new Date(viewTicket.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Employee Box */}
                  <div className={`p-3.5 rounded-2xl flex items-center justify-between ${theme.glassInner}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                        <User size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <span className={`text-[9px] font-bold uppercase tracking-widest block ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Employee Holder</span>
                        <p className={`text-sm font-bold truncate ${theme.textMain}`}>{viewTicket.staff_name || viewTicket.created_by}</p>
                      </div>
                    </div>
                    <span className={`font-mono text-[11px] font-bold px-3 py-1.5 rounded-md border shadow-sm ${isDarkMode ? 'bg-[#18181b] text-purple-300 border-purple-800/50' : 'bg-white text-purple-900 border-purple-200'}`}>
                      {viewTicket.emp_code || 'N/A'}
                    </span>
                  </div>

                  {/* Problem Description */}
                  <div className="space-y-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      <AlertTriangle size={13} className="text-orange-500" /> Problem Description
                    </span>
                    <div className={`p-4 rounded-2xl text-[13px] font-medium whitespace-pre-wrap leading-relaxed transition-colors ${theme.glassInner} ${theme.textMain}`}>
                      {viewTicket.description}
                    </div>
                  </div>

                  {/* User Attached Screenshot */}
                  {viewTicket.screenshot_attachment && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500 dark:text-purple-400 flex items-center gap-1.5">
                        <ImageIcon size={13}/> Attached Screenshot
                      </span>
                      <div 
                        onClick={() => setPreviewImage(viewTicket.screenshot_attachment)}
                        className={`p-2 rounded-2xl inline-block shadow-sm hover:border-orange-500 dark:hover:border-orange-400 transition-all duration-200 cursor-pointer overflow-hidden group/img ${theme.glassInner}`}
                      >
                        <div className="relative">
                          <img 
                            src={viewTicket.screenshot_attachment} 
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
                  {viewTicket.admin_notes && (
                    <div className={`p-4 rounded-2xl space-y-1.5 transition-colors ${isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50/80 border border-emerald-200'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                        <ShieldCheck size={14}/> IT Follow-up Note ({viewTicket.updated_at ? new Date(viewTicket.updated_at).toLocaleDateString('en-IN') : 'Logged'})
                      </span>
                      <p className={`text-xs font-medium italic ${isDarkMode ? 'text-emerald-200' : 'text-emerald-950'}`}>"{viewTicket.admin_notes}"</p>
                    </div>
                  )}

                </div>

                {/* Modal Footer Actions (Compact) */}
                <div className={`p-4 sm:p-5 border-t shrink-0 flex flex-col sm:flex-row gap-3 ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/60 bg-white/50'}`}>
                  
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      type="button"
                      disabled={updatingId === viewTicket.id}
                      onClick={() => handleOpenFollowUpModal(viewTicket, 'In Progress')}
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-[0_4px_15px_rgba(168,85,247,0.3)] border border-purple-500 active:scale-95"
                    >
                      <PlayCircle size={14} className="text-orange-300" /> Work on it
                    </button>
                    
                    <button
                      type="button"
                      disabled={updatingId === viewTicket.id}
                      onClick={() => handleOpenFollowUpModal(viewTicket, 'On Hold')}
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-[0_4px_15px_rgba(245,158,11,0.3)] border border-amber-400 active:scale-95"
                    >
                      <PauseCircle size={14} /> Place On Hold
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => handleOpenFollowUpModal(viewTicket, viewTicket.status || 'In Progress')}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer active:scale-95 ${theme.glassItem} ${theme.textMain} hover:border-orange-400 dark:hover:border-orange-500`}
                    >
                      <MessageSquarePlus size={14} className="text-orange-500" /> Follow-up
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === viewTicket.id || isResolved}
                      onClick={() => handleOpenFollowUpModal(viewTicket, 'Resolved')}
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-[0_4px_15px_rgba(16,185,129,0.3)] border border-emerald-400 active:scale-95"
                    >
                      <CheckCircle2 size={14} /> Resolve
                    </button>
                  </div>

                </div>

              </div>
            </div>
          );
        })()}

        {/* 🌟 FOLLOW-UP NOTE & STATUS UPDATE MODAL */}
        {noteModal.isOpen && noteModal.ticket && (
          <div className={`fixed inset-0 z-9999 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-2xl ${isDarkMode ? 'bg-slate-950/70' : 'bg-slate-800/20'}`}>
            <div className={`rounded-4xl w-full max-w-lg shadow-[0_32px_80px_rgba(0,0,0,0.5)] flex flex-col animate-in zoom-in-95 duration-200 border-2 ${isDarkMode ? 'border-orange-500/30' : 'border-white/80'} ${theme.glassCard}`}>
              
              <div className={`p-5 sm:p-6 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/60 bg-white/50'}`}>
                <h3 className={`font-black text-base tracking-tight uppercase flex items-center gap-2.5 ${theme.textMain}`}>
                  <MessageSquarePlus size={18} className="text-orange-500"/> Log IT Follow-up Note
                </h3>
                <button onClick={() => setNoteModal({ isOpen: false, ticket: null, note: '', targetStatus: '' })} className={`p-2 rounded-full cursor-pointer transition-all ${theme.glassInner} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-400 active:scale-90`}><X size={18}/></button>
              </div>

              <div className="p-5 sm:p-6 space-y-5 relative">
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain}`}>Target Ticket Status</label>
                  <select 
                    value={noteModal.targetStatus}
                    onChange={(e) => setNoteModal({ ...noteModal, targetStatus: e.target.value })}
                    className={`w-full p-3.5 rounded-2xl outline-none font-bold transition-all cursor-pointer ${theme.inputBg}`}
                  >
                    <option value="Open" className={isDarkMode ? 'bg-[#18181b] text-white' : 'bg-white text-slate-900'}>Open Queue</option>
                    <option value="In Progress" className={isDarkMode ? 'bg-[#18181b] text-white' : 'bg-white text-slate-900'}>In Progress (Working on it)</option>
                    <option value="On Hold" className={isDarkMode ? 'bg-[#18181b] text-white' : 'bg-white text-slate-900'}>On Hold (Awaiting Parts/Info)</option>
                    <option value="Resolved" className={isDarkMode ? 'bg-[#18181b] text-white' : 'bg-white text-slate-900'}>Resolved & Closed</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain}`}>Administrative Follow-up Remarks</label>
                  <textarea 
                    rows={4}
                    value={noteModal.note}
                    onChange={(e) => setNoteModal({ ...noteModal, note: e.target.value })}
                    placeholder="Enter detailed update instructions, diagnosis, or waiting reason for employee..."
                    className={`w-full p-3.5 rounded-2xl outline-none font-medium transition-all resize-none ${theme.inputBg}`}
                  />
                </div>

                <div className={`p-4 rounded-2xl flex gap-3 text-xs font-semibold leading-relaxed ${isDarkMode ? 'bg-orange-500/10 border border-orange-500/30 text-orange-200' : 'bg-orange-50 border border-orange-200 text-orange-900'}`}>
                  <Send size={18} className="text-orange-500 shrink-0 mt-0.5" />
                  <p>Saving this will immediately log the timestamped follow-up note and push an active notification ping directly to the staff member's portal dashboard.</p>
                </div>
              </div>

              <div className={`p-5 sm:p-6 border-t flex justify-end gap-3 shrink-0 ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/60 bg-white/50'}`}>
                <button onClick={() => setNoteModal({ isOpen: false, ticket: null, note: '', targetStatus: '' })} className={`px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95 ${theme.glassItem} ${theme.textMain}`}>Cancel</button>
                <button 
                  onClick={() => executeTicketVerdict(noteModal.ticket.id, noteModal.targetStatus, noteModal.ticket.created_by, noteModal.note)}
                  disabled={updatingId === noteModal.ticket.id}
                  className="px-8 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(249,115,22,0.4)] cursor-pointer transition-all active:scale-95 disabled:opacity-50 border border-orange-400"
                >
                  {updatingId === noteModal.ticket.id ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                  Save Note & Update
                </button>
              </div>

            </div>
          </div>
        )}

        {/* High-Res Screenshot Lightbox Modal */}
        {previewImage && (
          <div 
            onClick={() => setPreviewImage(null)}
            className={`fixed inset-0 z-99999 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200 cursor-pointer backdrop-blur-xl ${isDarkMode ? 'bg-slate-950/80' : 'bg-slate-900/60'}`}
          >
            <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center">
              <button 
                onClick={() => setPreviewImage(null)}
                className={`absolute -top-12 right-0 p-2.5 rounded-full transition-all cursor-pointer ${theme.glassInner} ${theme.textMain} hover:bg-orange-500 hover:text-white hover:border-orange-400 hover:scale-110 active:scale-90`}
              >
                <X size={20} />
              </button>
              <img 
                src={previewImage} 
                alt="High Resolution Screenshot" 
                className={`max-w-full max-h-[85vh] object-contain rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] border-2 ${isDarkMode ? 'border-orange-500/30' : 'border-white/80'}`}
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
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4 text-slate-400 transition-colors duration-1000">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-orange-500 dark:border-t-orange-500"></div>
        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-purple-300">Loading Support Desk Queue...</span>
      </div>
    }>
      <AdminTicketsContent />
    </Suspense>
  );
}