'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Megaphone, 
  Send, 
  Loader2, 
  ThumbsUp, 
  ThumbsDown, 
  Heart, 
  History as HistoryIcon, // Aliased to prevent DOM History clashes
  User 
} from 'lucide-react';

// Added missing helper function for date formatting
function safeDate(dateStr: any) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function AdminBroadcastsPage() {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBroadcasts = async () => {
    setLoading(true);
    // Fetch broadcasts and their reactions
    const { data: bData, error } = await supabase
      .from('broadcasts')
      .select('*, broadcast_reactions(reaction)')
      .order('created_at', { ascending: false });

    if (!error && bData) {
      const compiled = bData.map(b => {
        const reactions = b.broadcast_reactions || [];
        return {
          ...b,
          likes: reactions.filter((r: any) => r.reaction === 'like').length,
          dislikes: reactions.filter((r: any) => r.reaction === 'dislike').length,
          loves: reactions.filter((r: any) => r.reaction === 'love').length,
        };
      });
      setBroadcasts(compiled);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);

    try {
      const userStr = localStorage.getItem('user') || localStorage.getItem('vsit_admin_session');
      const email = userStr ? JSON.parse(userStr).email : 'Admin';

      await supabase.from('broadcasts').insert({
        message: message.trim(),
        created_by: email,
      });

      setMessage('');
      fetchBroadcasts();
    } catch (error) {
      alert('Failed to send broadcast');
    } finally {
      setIsSending(false);
    }
  };

  // 🌟 EXACT TRANSPARENT MAC OS MATTE GLASS THEME
  const theme = {
    card: 'bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]',
    cardHover: 'hover:bg-white/60 hover:border-orange-400 hover:shadow-[0_8px_32px_rgba(249,115,22,0.15)] hover:-translate-y-1 transition-all duration-300',
    textMain: 'text-slate-900',
    textSub: 'text-slate-700',
    textMuted: 'text-slate-600',
  };

  return (
    <div className="min-h-screen bg-[#FCF9F8] relative overflow-hidden font-sans antialiased pb-12">
      
      {/* 🌟 GLOBAL BACKGROUND ORBS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-225 h-125 pointer-events-none z-0 flex justify-between items-center opacity-50">
        <div className="w-112.5 h-112.5 bg-[#FFD1B3] rounded-full blur-[120px]"></div>
        <div className="w-112.5 h-112.5 bg-[#D8B4FE] rounded-full blur-[120px]"></div>
      </div>

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 sm:space-y-8 relative z-10 pt-6 sm:pt-8">
        
        {/* BRAND HEADER */}
        <div className={`${theme.card} p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5`}>
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 bg-white/80 text-orange-600 border border-white/80 shadow-sm">
              <Megaphone size={24} />
            </div>
            <div>
              <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${theme.textMain}`}>Broadcast Center</h1>
              <p className={`text-xs sm:text-sm font-bold mt-1 ${theme.textSub}`}>Send announcements to all staff members instantly.</p>
            </div>
          </div>
        </div>

        {/* BROADCAST FORM */}
        <div className={`${theme.card} p-6 sm:p-8`}>
          <form onSubmit={handleSend} className="space-y-5">
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-widest ${theme.textSub} mb-2`}>
                New Broadcast Message
              </label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your announcement here..."
                className="w-full p-4 bg-white/80 border border-white/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none resize-none h-32 text-sm font-bold"
              />
            </div>
            
            <div className="flex justify-end pt-2 border-t border-white/60">
              <button 
                disabled={isSending || !message.trim()} 
                type="submit" 
                className="px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}
                <span>Publish Broadcast</span>
              </button>
            </div>
          </form>
        </div>

        {/* BROADCAST HISTORY */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pl-2">
            {/* Used HistoryIcon to avoid DOM conflicts */}
            <HistoryIcon size={18} className="text-orange-600" />
            <h3 className={`text-xs font-black uppercase tracking-widest ${theme.textMain}`}>Previous Broadcasts</h3>
          </div>

          {loading ? (
            <div className={`${theme.card} w-full py-24 flex flex-col items-center justify-center gap-4`}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <span className={`text-xs font-bold tracking-widest uppercase ${theme.textMain}`}>Loading Broadcasts...</span>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className={`${theme.card} p-12 text-center flex flex-col items-center justify-center space-y-3`}>
              <Megaphone size={40} className="text-orange-600 opacity-60" />
              <h3 className={`text-base font-black ${theme.textMain}`}>No Broadcasts Yet</h3>
              <p className={`text-xs font-bold ${theme.textSub}`}>Your announcements will appear here once published.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-5">
              {broadcasts.map(b => (
                <div key={b.id} className={`${theme.card} p-5 sm:p-6 ${theme.cardHover}`}>
                  <p className={`text-sm sm:text-base font-bold whitespace-pre-wrap leading-relaxed ${theme.textMain}`}>
                    {b.message}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-5 pt-4 border-t border-white/60 gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/80 border border-white/80 flex items-center justify-center shadow-sm">
                        <User size={12} className="text-purple-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${theme.textMuted}`}>Published By</span>
                        <span className={`text-xs font-bold ${theme.textSub}`}>{b.created_by}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <span className={`text-[10px] font-bold px-3 py-1.5 bg-white/60 border border-white/80 rounded-lg shadow-sm ${theme.textMuted}`}>
                        {safeDate(b.created_at)}
                      </span>
                      <div className="flex gap-3 font-black text-slate-700 bg-white/50 border border-white/60 px-3 py-1.5 rounded-lg shadow-sm">
                        <span className="flex items-center gap-1.5"><ThumbsUp size={14} className="text-purple-600"/> {b.likes}</span>
                        <span className="flex items-center gap-1.5"><Heart size={14} className="text-rose-600"/> {b.loves}</span>
                        <span className="flex items-center gap-1.5"><ThumbsDown size={14} className="text-slate-500"/> {b.dislikes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}