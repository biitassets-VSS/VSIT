'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  Ticket, Plus, X, Clock, CheckCircle2, 
  MessageSquare, Laptop, AlertCircle, Send, Star, Loader2, Timer, ShieldCheck,
  ChevronDown, UploadCloud, ImagePlus
} from 'lucide-react';

// 🌟 TIME CALCULATION ENGINE
const calculateResolutionTime = (raisedAt: string, closedAt: string | null) => {
  if (!raisedAt || !closedAt) return null;
  const start = new Date(raisedAt).getTime();
  const end = new Date(closedAt).getTime();
  const diffMs = end - start;

  if (diffMs <= 0) return "Instant resolution";

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(diffMins / (60 * 24));
  const hours = Math.floor((diffMins % (60 * 24)) / 60);
  const minutes = diffMins % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  if (parts.length === 0) return "< 1m";
  return parts.join(' ');
};

const calculateWaitingTime = (raisedAt: string) => {
  if (!raisedAt) return null;
  const start = new Date(raisedAt).getTime();
  const end = new Date().getTime(); // Current Time
  const diffMs = end - start;

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(diffMins / (60 * 24));
  const hours = Math.floor((diffMins % (60 * 24)) / 60);
  const minutes = diffMins % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  if (parts.length === 0) return "Just now";
  return parts.join(' ');
};

// 🌟 TICKET RATING COMPONENT
function TicketRatingForm({ ticket, onRatingSubmitted }: { ticket: any, onRatingSubmitted: (rating: number, feedback: string) => void }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFeedbackHint = (r: number) => {
    switch(r) {
      case 1: return "Poor - Solution didn't help";
      case 2: return "Fair - Took too long";
      case 3: return "Good - Issue resolved";
      case 4: return "Very Good - Quick and helpful";
      case 5: return "Excellent - Exceptional support!";
      default: return "Select a star rating";
    }
  };

  const submitRating = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      if (ticket.id.toString().includes('demo')) {
        setTimeout(() => onRatingSubmitted(rating, feedback), 500);
        return;
      }

      await supabase
        .from('tickets')
        .update({ rating: rating, rating_feedback: feedback })
        .eq('id', ticket.id);
      
      onRatingSubmitted(rating, feedback);
    } catch (err) {
      alert("Failed to submit rating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (ticket.rating && ticket.rating > 0) {
    return (
      <div className="mt-5 p-4 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 rounded-2xl flex flex-col gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-emerald-600" size={18} />
          <span className="text-sm font-bold text-emerald-800">You rated this solution {ticket.rating} Stars.</span>
        </div>
        {ticket.rating_feedback && (
          <p className="text-xs text-emerald-700 italic border-l-2 border-emerald-400 pl-2 ml-1">"{ticket.rating_feedback}"</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 p-5 bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-sm animate-in fade-in">
      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Rate this solution</h4>
      <p className="text-[11px] font-semibold text-slate-500 mb-4">{getFeedbackHint(hoverRating || rating)}</p>
      
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="focus:outline-none transition-transform hover:scale-110 p-1 cursor-pointer"
          >
            <Star 
              size={28} 
              className={`${(hoverRating || rating) >= star ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-slate-300'}`} 
            />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <div className="space-y-3 animate-in slide-in-from-top-2">
          <textarea
            placeholder="Any additional feedback? (Optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full p-4 rounded-2xl border border-white/60 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 resize-none h-24 bg-white/50 backdrop-blur-md focus:bg-white/80 transition-all placeholder:text-slate-400"
          />
          <button 
            onClick={submitRating}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function StaffTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Open' | 'Closed'>('All');
  
  // Modal State
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<any>(null);

  // 🌟 NEW DASHBOARD TICKET FORM STATE
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Hardware');
  const [formText, setFormText] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
    };
    syncTheme();
    fetchData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickets(prevTickets => [...prevTickets]); 
    }, 60000);
    return () => clearInterval(interval);
  }, []); 

  const fetchData = async () => {
    setLoading(true);
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setCurrentUser({ id: 'guest-mock-uuid', email: 'guest@vsit.com', name: 'Demo Guest' });
        setTickets([
          {
            id: 'demo-tkt-1', token: 'TKT-8492', assetName: 'MacBook Pro Display Issues', tagId: 'N/A', 
            issue: 'Screen is flickering randomly', status: 'Closed', rating: 5,
            raisedAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(), closedAt: new Date().toISOString(), adminNotes: 'Display replaced.'
          },
          {
            id: 'demo-tkt-2', token: 'TKT-3321', assetName: 'Need New Mouse', tagId: 'N/A', 
            issue: 'Mouse scroll wheel is broken.', status: 'Open', rating: 0,
            raisedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), closedAt: null, adminNotes: null
          }
        ]);
        setLoading(false);
        return;
      }

      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) { window.location.replace('/'); return; }
      
      let user: any = {};
      try { user = JSON.parse(sessionStr); } catch (e) { user = { email: sessionStr }; }
      const cleanEmail = user.email?.toLowerCase().trim();

      const { data: profile } = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      const userId = profile?.id || user.id;
      setCurrentUser({ ...user, id: userId, email: cleanEmail, emp_code: profile?.emp_code || 'STAFF', name: profile?.full_name || cleanEmail.split('@')[0] });

      const { data: tkts } = await supabase.from('tickets').select('*').ilike('created_by', cleanEmail).order('created_at', { ascending: false });
      
      if (tkts) {
        const compiled = tkts.map(t => {
          const rawStatus = (t.status || '').toLowerCase();
          const isTicketClosed = rawStatus === 'resolved' || rawStatus === 'closed';

          return {
            ...t,
            token: t.id.substring(0, 8).toUpperCase(),
            assetName: t.title || t.category || 'General Support',
            tagId: t.asset_tag || 'N/A',
            issue: t.description || 'No description provided.',
            status: isTicketClosed ? 'Closed' : 'Open', 
            raisedAt: t.created_at,
            closedAt: t.resolved_at || t.updated_at || null, 
            adminNotes: t.admin_notes || 'No notes provided.',
            rating: t.rating || 0,
            rating_feedback: t.rating_feedback || ''
          };
        });
        setTickets(compiled);
      }
    } catch (e) {
      console.error("Error loading tickets", e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCategory('Hardware');
    setFormText('');
    setScreenshot(null);
    setIsTransmitting(false);
    setSuccessDone(false);
  };

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTransmitting(true);
    
    if (currentUser.id === 'guest-mock-uuid') {
      setTimeout(() => {
        const newTkt = { 
          id: `demo-${Date.now()}`, token: `TKT-${Math.floor(Math.random() * 9000) + 1000}`, 
          assetName: formTitle, tagId: 'N/A', issue: formText, status: 'Open', 
          raisedAt: new Date().toISOString(), rating: 0 
        };
        setTickets([newTkt, ...tickets]);
        setSuccessDone(true);
        setTimeout(() => { setIsRaiseModalOpen(false); resetForm(); }, 1200);
      }, 800);
      return;
    }

    try {
      const newTicket = {
        title: formTitle,
        category: formCategory,
        description: formText,
        status: 'Open',
        created_by: currentUser.email,
        emp_code: currentUser.emp_code,
        staff_name: currentUser.name,
        asset_tag: 'N/A' 
      };

      const { data, error } = await supabase.from('tickets').insert(newTicket).select().single();
      if (error) throw error;

      if (data) {
        const compiled = {
          ...data, token: data.id.substring(0, 8).toUpperCase(), assetName: data.title, tagId: data.asset_tag || 'N/A', issue: data.description, status: 'Open', raisedAt: data.created_at, rating: 0
        };
        setTickets([compiled, ...tickets]);
      }
      
      setSuccessDone(true);
      setTimeout(() => { setIsRaiseModalOpen(false); resetForm(); }, 1200);
    } catch (e) {
      alert("Failed to raise ticket.");
      setIsTransmitting(false);
    }
  };

  const formatDisplayDate = (dateString: string | null) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="min-h-[60vh] flex flex-col justify-center items-center gap-3"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /><p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Loading Tickets</p></div>;
  }

  const filteredTickets = tickets.filter(t => activeTab === 'All' ? true : t.status === activeTab);

  const theme = {
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_12px_32px_rgba(230,210,200,0.35)]',
    glassButton: isDarkMode
      ? 'bg-zinc-800/50 backdrop-blur-xl border border-white/10 hover:border-[#a855f7] text-white'
      : 'bg-white/60 backdrop-blur-2xl border border-white/90 hover:border-[#b388ff] text-slate-900',
    glassInnerCard: isDarkMode 
      ? 'bg-black/40 backdrop-blur-xl border border-white/10 text-white' 
      : 'bg-white/60 backdrop-blur-2xl border border-white/80 text-slate-900',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-600',
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32 space-y-8 animate-in fade-in duration-500 w-full min-h-screen select-none">
        
        {/* 🌟 PREMIUM GLASS HEADER */}
        <div className="relative bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-orange-400/10 to-purple-500/10 blur-3xl -z-10 rounded-full" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-linear-to-tr from-purple-400/10 to-orange-500/10 blur-3xl -z-10 rounded-full" />
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Ticket className="text-purple-600" /> My IT Tickets
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Report broken assets or request repairs from the Admin team.
            </p>
          </div>
          
          <button 
            onClick={() => setIsRaiseModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/20 shrink-0 border border-white/20"
          >
            <Plus size={18} /> Raise Ticket
          </button>
        </div>

        {/* 🌟 GLASS TABS */}
        <div className="flex bg-white/40 backdrop-blur-xl p-1.5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-white/60 overflow-x-auto max-w-fit">
          {['All', 'Open', 'Closed'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`flex-1 sm:flex-none sm:w-32 py-2 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${activeTab === tab ? 'bg-white shadow-sm text-purple-700 border border-white/80' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 🌟 PREMIUM CARD GRID LAYOUT */}
        {filteredTickets.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-200/60 rounded-4xl bg-white/20 backdrop-blur-md flex flex-col items-center">
            <CheckCircle2 size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">All Caught Up!</h3>
            <p className="text-sm text-slate-500 mt-1">You have no {activeTab === 'All' ? '' : activeTab.toLowerCase()} support tickets.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTickets.map((ticket) => {
              const isOpen = ticket.status === 'Open';

              return (
                <div key={ticket.id} className="group bg-white/20 backdrop-blur-2xl rounded-4xl p-6 border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-purple-300/80 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] relative overflow-hidden flex flex-col h-full">
                  
                  {/* Glowing Status Blob behind card */}
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 rounded-full opacity-20 transition-opacity duration-500 group-hover:opacity-40 pointer-events-none ${isOpen ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <span className="font-black text-slate-900 text-lg sm:text-xl tracking-tight block">{ticket.token}</span>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Tag: {ticket.tagId}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md border flex items-center gap-1.5 backdrop-blur-md shadow-sm ${isOpen ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'}`}>
                      {isOpen ? <Clock size={12}/> : <CheckCircle2 size={12}/>} 
                      {ticket.status}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-1" title={ticket.assetName}>{ticket.assetName}</h4>
                      <p className="text-slate-600 text-xs mt-1.5 line-clamp-2 leading-relaxed" title={ticket.issue}>{ticket.issue}</p>
                    </div>

                    <div className="bg-white/30 backdrop-blur-sm p-4 rounded-2xl border border-white/50 space-y-3 mt-auto shadow-inner">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold uppercase tracking-widest text-slate-400">Raised On:</span>
                        <span className="font-bold text-slate-800">{formatDisplayDate(ticket.raisedAt)}</span>
                      </div>
                      
                      {!isOpen ? (
                        <>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold uppercase tracking-widest text-slate-400">Resolution Time:</span>
                            <span className="font-black text-emerald-600 flex items-center gap-1"><Timer size={12}/> {calculateResolutionTime(ticket.raisedAt, ticket.closedAt)}</span>
                          </div>
                          {/* Rating Preview */}
                          <div className="flex justify-between items-center text-[11px] pt-3 border-t border-white/40">
                            <span className="font-bold uppercase tracking-widest text-slate-400">Your Rating:</span>
                            {ticket.rating > 0 ? (
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(star => <Star key={star} size={12} className={star <= ticket.rating ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-slate-300'}/>)}
                              </div>
                            ) : (
                              <span className="text-amber-500 font-black uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">Pending Rating</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-center text-[11px] pt-3 border-t border-white/40">
                          <span className="font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><AlertCircle size={12}/> Wait Time:</span>
                          <span className="font-black text-amber-600 animate-pulse bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">{calculateWaitingTime(ticket.raisedAt)}</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Note Preview (If Closed) */}
                    {!isOpen && ticket.adminNotes && (
                      <div className="text-xs mt-1">
                        <span className="font-black uppercase tracking-widest text-slate-800 block mb-1 text-[9px]">Admin Note:</span>
                        <p className="text-slate-600 italic line-clamp-1 border-l-2 border-emerald-400 pl-2">"{ticket.adminNotes}"</p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Button */}
                  <div className="pt-5 mt-auto">
                    <button 
                      onClick={() => setViewTicket(ticket)} 
                      className={`w-full p-3.5 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all border shadow-sm cursor-pointer ${!isOpen && ticket.rating === 0 ? 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900' : 'bg-white/50 text-slate-700 border-white/80 hover:bg-white hover:shadow-md'}`}
                    >
                      {!isOpen && ticket.rating === 0 ? 'Rate Solution' : 'View Full Details'}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 NEW DASHBOARD SYNCED RAISE TICKET MODAL */}
      {mounted && isRaiseModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-10">
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-black/40' : 'bg-slate-900/20'} backdrop-blur-md`} onClick={() => { setIsRaiseModalOpen(false); resetForm(); }} />
          
          <div className={`relative w-full max-w-120 max-h-[80vh] sm:max-h-[85vh] rounded-4xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${theme.glassCard}`}>
            
            {/* Header */}
            <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-7 sm:pb-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] sm:rounded-3xl flex items-center justify-center ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-white/80 border border-white text-purple-500 shadow-inner'}`}>
                   <Ticket size={24} strokeWidth={2} />
                </div>
                <div>
                  <h2 className={`text-[14px] sm:text-[16px] font-black uppercase tracking-widest ${theme.textMain}`}>Raise Support Ticket</h2>
                  <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 ${theme.textSub}`}>Portal Submission</p>
                </div>
              </div>
              <button onClick={() => { setIsRaiseModalOpen(false); resetForm(); }} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 ${theme.glassButton}`}>
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className={`h-px w-full shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-white/40'}`} />

            <div className="px-6 py-4 sm:px-8 sm:py-5 overflow-y-auto flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 custom-scrollbar">
              {successDone ? (
                <div className="py-10 text-center space-y-4">
                  <CheckCircle2 size={72} className="text-emerald-500 mx-auto animate-bounce"/>
                  <h4 className={`text-xl sm:text-2xl font-black ${theme.textMain}`}>Database Updated!</h4>
                </div>
              ) : (
                <form id="ticketModalForm" onSubmit={handleRaiseTicket} className="space-y-3 sm:space-y-4">
                  
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Issue Subject</label>
                    <input value={formTitle} onChange={e=>setFormTitle(e.target.value)} required placeholder="E.g. Monitor display flickering" className={`w-full px-4 sm:px-5 py-3.5 rounded-2xl outline-none text-[12px] sm:text-[14px] font-semibold transition-all ${theme.glassInnerCard} ${isDarkMode ? 'placeholder-zinc-500 text-white' : 'placeholder-[#818b9c] text-[#0f172a]'}`}/>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Category</label>
                    <div className={`relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all ${theme.glassInnerCard}`}>
                      <select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className={`w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent ${theme.textMain}`}>
                        <option className={isDarkMode ? 'text-black' : ''}>Hardware</option>
                        <option className={isDarkMode ? 'text-black' : ''}>Software</option>
                        <option className={isDarkMode ? 'text-black' : ''}>Network</option>
                      </select>
                      <ChevronDown size={18} className={`absolute right-4 pointer-events-none ${theme.textSub}`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Attach Screenshot (Optional)</label>
                    <label className={`w-full p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 border-2 border-dashed transition-all cursor-pointer ${theme.glassInnerCard} ${isDarkMode ? 'border-zinc-700 hover:border-purple-500' : 'border-white/80 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-400/20'}`}>
                       <input type="file" className="hidden" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
                       <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-zinc-800' : 'bg-white/80 shadow-sm border border-white'}`}>
                         {screenshot ? <ImagePlus size={16} className="text-purple-500" /> : <UploadCloud size={16} className={theme.textSub} />}
                       </div>
                       <span className={`text-[11px] sm:text-[12px] font-bold text-center ${screenshot ? 'text-purple-500' : theme.textMain}`}>
                         {screenshot ? screenshot.name : "Click to upload"}
                       </span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                      Detailed Explanation
                    </label>
                    <textarea rows={3} value={formText} onChange={e=>setFormText(e.target.value)} required placeholder="Describe what happened..." className={`w-full px-4 sm:px-5 py-3.5 rounded-2xl text-[12px] sm:text-[14px] font-semibold transition-all outline-none resize-none min-h-17.5 sm:min-h-20 ${theme.glassInnerCard} ${isDarkMode ? 'placeholder-zinc-500 text-white' : 'placeholder-[#818b9c] text-[#0f172a]'}`}/>
                  </div>
                </form>
              )}
            </div>

            {!successDone && (
              <>
                <div className={`h-px w-full shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-white/40'}`} />

                <div className="px-6 py-4 sm:px-8 sm:py-5 flex justify-center items-center gap-3 sm:gap-4 shrink-0 relative z-10">
                  <button onClick={() => { setIsRaiseModalOpen(false); resetForm(); }} className={`flex-1 py-3.5 rounded-3xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}>
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    form="ticketModalForm"
                    disabled={isTransmitting} 
                    className={`flex-1 py-3.5 text-white rounded-3xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 bg-linear-to-r from-purple-500 to-purple-600 shadow-lg hover:shadow-purple-500/50`}
                  >
                    {isTransmitting ? <Loader2 size={16} className="animate-spin" /> : 'Transmit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* VIEW TICKET DETAILS MODAL WITH RATING SYSTEM */}
      {mounted && viewTicket && createPortal(
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setViewTicket(null)} />
          <div className="relative bg-white/95 backdrop-blur-2xl w-full max-w-lg rounded-4xl shadow-[0_0_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col my-8 border border-white/60 animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-white/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Ticket Record</h2>
                <span className="bg-purple-100/80 text-purple-700 px-2.5 py-1 rounded-md text-[10px] font-black border border-purple-200/50 shadow-sm">{viewTicket.token}</span>
              </div>
              <button onClick={() => setViewTicket(null)} className="p-2 text-slate-400 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer"><X size={20}/></button>
            </div>

            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
              <div>
                <h3 className="font-black text-xl text-slate-900 tracking-tight leading-tight">{viewTicket.assetName}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Asset Tag: <span className="font-mono text-slate-700">{viewTicket.tagId}</span></p>
              </div>

              <div className="bg-white/40 backdrop-blur-md border border-white/60 p-5 rounded-3xl shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><Clock size={14}/> Reported On</p>
                <p className="text-sm font-bold text-slate-900">{formatDisplayDate(viewTicket.raisedAt)}</p>
                
                <div className="mt-5 pt-5 border-t border-slate-200/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Your Issue Description:</p>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap wrap-break-word">{viewTicket.issue}</p>
                </div>
              </div>

              {viewTicket.status === 'Closed' ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                    <p className="text-sm font-black uppercase tracking-widest text-emerald-900">Resolved by Admin</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-800 whitespace-pre-wrap wrap-break-word border-l-2 border-emerald-400 pl-3">{viewTicket.adminNotes}</p>
                  
                  <div className="flex justify-between items-center mt-5 pt-4 border-t border-emerald-500/20">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70 mb-1">Closed On</p>
                      <p className="text-xs font-bold text-emerald-800">{formatDisplayDate(viewTicket.closedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70 mb-1">Time to Resolve</p>
                      <p className="text-[11px] font-black text-emerald-700 bg-emerald-500/10 px-2.5 py-1 rounded-md flex items-center justify-end gap-1.5 border border-emerald-500/20 shadow-sm">
                        <Timer size={14} /> {calculateResolutionTime(viewTicket.raisedAt, viewTicket.closedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-3xl flex items-start sm:items-center gap-4 shadow-sm">
                  <Clock size={24} className="text-purple-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-purple-900 leading-tight">This ticket is currently open. An admin will review it shortly.</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-700 mt-2 flex items-center gap-1.5"><AlertCircle size={12}/> Wait Time: <span className="bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 animate-pulse">{calculateWaitingTime(viewTicket.raisedAt)}</span></p>
                  </div>
                </div>
              )}
              
              {/* 🌟 RATING FORM COMPONENT */}
              {viewTicket.status === 'Closed' && (
                <TicketRatingForm 
                  ticket={viewTicket} 
                  onRatingSubmitted={(newRating, newFeedback) => {
                    const updated = { ...viewTicket, rating: newRating, rating_feedback: newFeedback };
                    setViewTicket(updated);
                    setTickets(tickets.map(t => t.id === updated.id ? updated : t));
                  }} 
                />
              )}
              
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}