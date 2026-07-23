'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Ticket, Plus, X, Clock, CheckCircle2, 
  MessageSquare, Laptop, AlertCircle, Send, Star, Loader2, Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);

  if (parts.length === 0) return "Under 1 minute";
  return parts.join(', ');
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
      <div className="mt-5 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-emerald-500" size={18} />
          <span className="text-sm font-bold text-emerald-800">You rated this solution {ticket.rating} Stars.</span>
        </div>
        {ticket.rating_feedback && (
          <p className="text-xs text-emerald-700 italic border-l-2 border-emerald-300 pl-2 ml-1">"{ticket.rating_feedback}"</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm animate-in fade-in">
      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Rate this solution</h4>
      <p className="text-[11px] font-semibold text-slate-500 mb-4">{getFeedbackHint(hoverRating || rating)}</p>
      
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="focus:outline-none transition-transform hover:scale-110 p-1"
          >
            <Star 
              size={28} 
              className={`${(hoverRating || rating) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
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
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-400 resize-none h-20 bg-slate-50 focus:bg-white transition-colors"
          />
          <button 
            onClick={submitRating}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [myAssignedAssets, setMyAssignedAssets] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'All' | 'Open' | 'Closed'>('All');
  
  // Modal State
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({ assetId: '', issue: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setCurrentUser({ id: 'guest-mock-uuid', email: 'guest@vsit.com', name: 'Demo Guest' });
        setMyAssignedAssets([{ id: 'demo-asset-1', name: 'Demo MacBook Pro 16"', asset_tag: 'MAC-9999' }]);
        setTickets([{
          id: 'demo-tkt-1', token: 'TKT-8492', assetName: 'Demo MacBook Pro 16"', tagId: 'MAC-9999', 
          issue: 'Battery is swelling.', status: 'Closed', rating: 0,
          raisedAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(), closedAt: new Date().toISOString(), adminNotes: 'Battery replaced.'
        }]);
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

      // Fetch Assets
      const { data: assets } = await supabase.from('assets').select('*').or(`assigned_to.eq.${userId},assigned_to.ilike.${cleanEmail}`);
      if (assets) setMyAssignedAssets(assets);

      // Fetch Tickets
      const { data: tkts } = await supabase.from('tickets').select('*').ilike('created_by', cleanEmail).order('created_at', { ascending: false });
      
      if (tkts) {
        const compiled = tkts.map(t => ({
          ...t,
          token: t.id.substring(0, 8).toUpperCase(),
          assetName: t.title || t.category || 'General Support',
          tagId: t.asset_tag || 'N/A',
          issue: t.description || 'No description provided.',
          status: t.status === 'Resolved' ? 'Closed' : t.status,
          raisedAt: t.created_at,
          closedAt: t.resolved_at || null,
          adminNotes: t.admin_notes || 'No notes provided by admin.',
          rating: t.rating || 0,
          rating_feedback: t.rating_feedback || ''
        }));
        setTickets(compiled);
      }
    } catch (e) {
      console.error("Error loading tickets", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedAsset = myAssignedAssets.find(a => a.id === formData.assetId);
    const assetName = selectedAsset ? (selectedAsset.name || selectedAsset.category) : 'General Issue';
    const tagId = selectedAsset ? selectedAsset.asset_tag : 'N/A';

    if (currentUser.id === 'guest-mock-uuid') {
      const newTkt = { id: `demo-${Date.now()}`, token: `TKT-${Math.floor(Math.random() * 9000) + 1000}`, assetName, tagId, issue: formData.issue, status: 'Open', raisedAt: new Date().toISOString(), rating: 0 };
      setTickets([newTkt, ...tickets]);
      setIsRaiseModalOpen(false);
      setFormData({ assetId: '', issue: '' });
      return;
    }

    try {
      const newTicket = {
        title: `Issue with ${assetName}`,
        category: 'Hardware',
        description: formData.issue,
        status: 'Open',
        created_by: currentUser.email,
        emp_code: currentUser.emp_code,
        staff_name: currentUser.name,
        asset_id: selectedAsset?.id || null,
        asset_tag: tagId
      };

      const { data, error } = await supabase.from('tickets').insert(newTicket).select().single();
      if (error) throw error;

      if (data) {
        const compiled = {
          ...data, token: data.id.substring(0, 8).toUpperCase(), assetName: data.title, tagId: data.asset_tag, issue: data.description, status: 'Open', raisedAt: data.created_at, rating: 0
        };
        setTickets([compiled, ...tickets]);
      }
      
      setIsRaiseModalOpen(false);
      setFormData({ assetId: '', issue: '' });
    } catch (e) {
      alert("Failed to raise ticket.");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="min-h-[60vh] flex justify-center items-center"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>;
  }

  const filteredTickets = tickets.filter(t => activeTab === 'All' ? true : t.status === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Ticket className="text-purple-600"/> My IT Tickets</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Report broken assets or request repairs from the Admin team.</p>
        </div>
        <button 
          onClick={() => setIsRaiseModalOpen(true)} 
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-sm transition-all"
        >
          <Plus size={18} /> Raise Ticket
        </button>
      </div>

      {/* TABS */}
      <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
        {['All', 'Open', 'Closed'].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab as any)} 
            className={`flex-1 sm:flex-none sm:w-32 py-2 px-4 text-sm font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TICKETS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <CheckCircle2 size={40} className="text-slate-300 mb-3" />
              <p className="text-slate-500 font-bold">You have no {activeTab === 'All' ? '' : activeTab.toLowerCase()} tickets.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-all">
                
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${ticket.status === 'Open' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Ticket size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-slate-900">{ticket.token}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border flex items-center gap-1 ${ticket.status === 'Open' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {ticket.status === 'Open' ? <Clock size={12}/> : <CheckCircle2 size={12}/>} 
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">{ticket.assetName}</h4>
                    <p className="text-slate-500 text-sm mt-1 line-clamp-1">{ticket.issue}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setViewTicket(ticket)} 
                  className="w-full md:w-auto px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                >
                  View Updates
                </button>

              </div>
            ))
          )}
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        
        {/* RAISE TICKET MODAL */}
        {isRaiseModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900">Raise Support Ticket</h2>
                <button onClick={() => setIsRaiseModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"><X size={20}/></button>
              </div>

              <form onSubmit={handleRaiseTicket} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Laptop size={16} className="text-purple-500"/> Which Asset has an issue?</label>
                  <select 
                    required 
                    value={formData.assetId} 
                    onChange={(e) => setFormData({...formData, assetId: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-sm"
                  >
                    <option value="" disabled>Select an assigned asset...</option>
                    {myAssignedAssets.map(asset => (
                      <option key={asset.id} value={asset.id}>{asset.name || asset.category} ({asset.asset_tag || 'N/A'})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><MessageSquare size={16} className="text-purple-500"/> Describe the problem</label>
                  <textarea 
                    required 
                    value={formData.issue}
                    onChange={(e) => setFormData({...formData, issue: e.target.value})}
                    placeholder="e.g. The screen flickers every 10 minutes..." 
                    rows={4} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium text-sm"
                  ></textarea>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsRaiseModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-xl shadow-sm">
                    <Send size={18} /> Submit Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* VIEW TICKET DETAILS MODAL WITH RATING SYSTEM */}
        {viewTicket && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewTicket(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-slate-900">Ticket Record</h2>
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs font-black border border-purple-200">{viewTicket.token}</span>
                </div>
                <button onClick={() => setViewTicket(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"><X size={20}/></button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                <div>
                  <h3 className="font-black text-lg text-slate-900">{viewTicket.assetName}</h3>
                  <p className="text-sm font-medium text-slate-500">Asset Tag: {viewTicket.tagId}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><Clock size={12}/> Reported On</p>
                  <p className="text-sm font-bold text-slate-900">{formatDate(viewTicket.raisedAt)}</p>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500 font-bold mb-1">Your Issue Description:</p>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{viewTicket.issue}</p>
                  </div>
                </div>

                {viewTicket.status === 'Closed' || viewTicket.status === 'Resolved' ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <p className="text-sm font-bold text-emerald-900">Resolved by Admin</p>
                    </div>
                    <p className="text-sm font-medium text-emerald-800 whitespace-pre-wrap">{viewTicket.adminNotes}</p>
                    
                    {/* 🌟 INCORPORATED RESOLUTION TIME METRIC */}
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-emerald-200/50">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mb-0.5">Closed On</p>
                        <p className="text-xs font-bold text-emerald-700">{formatDate(viewTicket.closedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mb-0.5">Time to Resolve</p>
                        <p className="text-xs font-bold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-md flex items-center justify-end gap-1 border border-emerald-200/50">
                          <Timer size={12} /> {calculateResolutionTime(viewTicket.raisedAt, viewTicket.closedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-center gap-3">
                    <Clock size={20} className="text-purple-500 shrink-0" />
                    <p className="text-sm font-bold text-purple-800">This ticket is currently open. An admin will review it shortly.</p>
                  </div>
                )}
                
                {/* 🌟 RATING FORM COMPONENT */}
                {(viewTicket.status === 'Closed' || viewTicket.status === 'Resolved') && (
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}