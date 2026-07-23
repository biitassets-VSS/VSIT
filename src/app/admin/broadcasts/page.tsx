'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Megaphone, Send, Loader2, ThumbsUp, ThumbsDown, Heart } from 'lucide-react';

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl"><Megaphone size={28} /></div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Broadcast Center</h1>
          <p className="text-sm font-medium text-slate-500">Send announcements to all staff members instantly.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSend} className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">New Broadcast Message</label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your announcement here..."
            className="w-full p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none h-32"
          />
          <div className="flex justify-end">
            <button disabled={isSending || !message.trim()} type="submit" className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
              {isSending ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
              Publish Broadcast
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Previous Broadcasts</h3>
        {loading ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-orange-600" /></div> : 
          broadcasts.map(b => (
            <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-slate-800 font-medium whitespace-pre-wrap">{b.message}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                <span className="font-semibold text-slate-400">{new Date(b.created_at).toLocaleString()}</span>
                <div className="flex gap-4 font-bold text-slate-600">
                  <span className="flex items-center gap-1"><ThumbsUp size={14} className="text-purple-500"/> {b.likes}</span>
                  <span className="flex items-center gap-1"><Heart size={14} className="text-rose-500"/> {b.loves}</span>
                  <span className="flex items-center gap-1"><ThumbsDown size={14} className="text-slate-400"/> {b.dislikes}</span>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}