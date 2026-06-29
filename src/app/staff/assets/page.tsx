'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Laptop, Loader2, FileSignature, CheckCircle2, ShieldCheck, AlertTriangle, X } from 'lucide-react';

export default function StaffMyAssetsPage() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [signModal, setSignModal] = useState<any>(null);
  const [signatureName, setSignatureName] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    fetchMyAssets();
  }, []);

  const fetchMyAssets = async () => {
    setLoading(true);
    try {
      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) return;
      
      let email = sessionStr;
      try { email = JSON.parse(sessionStr).email; } catch(e) {}
      const cleanEmail = email?.toLowerCase().trim();

      // Fetch assets assigned to this email or where profile ID matches
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .or(`assigned_to.ilike.${cleanEmail}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitDigitalSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim()) return alert("Please type your name to sign.");
    
    setIsSigning(true);
    try {
      const timestamp = new Date().toISOString();
      const signatureData = `Digitally Signed by: ${signatureName} | Date: ${new Date(timestamp).toLocaleString()}`;

      const { error } = await supabase
        .from('assets')
        .update({ 
          handover_status: 'Signed',
          handover_signature: signatureData
        })
        .eq('id', signModal.id);

      if (error) throw error;

      alert("Thank you! Handover Agreement signed successfully.");
      setSignModal(null);
      setSignatureName('');
      fetchMyAssets(); // Refresh the list
    } catch (err: any) {
      alert(`Error signing document: ${err.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  // 🌟 MASTER THEME DICTIONARY
  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-slate-50',
    card: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200/80',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    inputBg: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a] focus:border-blue-500 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900 placeholder-slate-400',
    modalOverlay: 'bg-black/80 backdrop-blur-sm z-50',
    modalBody: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200',
  };

  if (loading) return (
    <div className={`flex h-[60vh] items-center justify-center ${theme.bg}`}>
      <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? 'text-blue-400' : 'text-indigo-600'}`} />
    </div>
  );

  return (
    <div className={`space-y-6 antialiased font-sans ${theme.bg} min-h-[80vh] p-4 md:p-6 rounded-3xl`}>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${theme.textMain}`}>My Assigned Assets</h1>
          <p className={`text-sm font-medium mt-1 ${theme.textSub}`}>View your hardware and sign pending agreements.</p>
        </div>
        <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-50 text-indigo-600'}`}>
          <Laptop size={24}/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assets.length === 0 ? (
          <div className={`col-span-full p-12 text-center font-medium text-sm rounded-3xl border ${theme.card} ${theme.textSub}`}>
            You have no hardware assets assigned to you yet.
          </div>
        ) : (
          assets.map(asset => (
            <div key={asset.id} className={`p-6 rounded-3xl border shadow-sm transition-colors flex flex-col justify-between ${theme.card}`}>
              
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'}`}>
                      <Laptop size={18} />
                    </div>
                    <div>
                      <h3 className={`font-bold ${theme.textMain}`}>{asset.name || asset.asset_name}</h3>
                      <p className={`text-[11px] uppercase tracking-widest ${theme.textSub}`}>{asset.asset_tag}</p>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border space-y-2 mb-6 ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between text-xs">
                    <span className={theme.textSub}>Category</span>
                    <span className={`font-bold ${theme.textMain}`}>{asset.category}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={theme.textSub}>Serial Number</span>
                    <span className={`font-mono font-bold ${theme.textMain}`}>{asset.serial_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={theme.textSub}>Condition</span>
                    <span className={`font-bold ${theme.textMain}`}>{asset.asset_condition || 'New'}</span>
                  </div>
                </div>
              </div>

              {/* 🚨 HANDOVER AGREEMENT STATUS ENGINE */}
              <div className="mt-auto pt-4 border-t border-slate-100/10">
                {asset.handover_status === 'Pending' ? (
                  <button 
                    onClick={() => setSignModal(asset)}
                    className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-colors animate-pulse"
                  >
                    <AlertTriangle size={16} /> Action Required: Sign Agreement
                  </button>
                ) : asset.handover_status === 'Signed' ? (
                  <div className={`w-full p-4 rounded-xl border flex flex-col gap-2 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      <CheckCircle2 size={16} /> Agreement Signed
                    </div>
                    <p className={`text-[10px] font-mono leading-relaxed ${isDarkMode ? 'text-emerald-200/70' : 'text-emerald-900/70'}`}>
                      {asset.handover_signature}
                    </p>
                  </div>
                ) : (
                  <div className={`w-full py-3 text-center rounded-xl text-[10px] font-bold uppercase tracking-widest border ${isDarkMode ? 'bg-[#0a0a0a] text-zinc-500 border-[#27272a]' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    No Pending Agreements
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      {/* 🚀 DIGITAL SIGNATURE MODAL */}
      {signModal && (
        <div className={`fixed inset-0 flex items-center justify-center p-4 ${theme.modalOverlay}`}>
          <div className={`rounded-3xl max-w-lg w-full shadow-2xl flex flex-col border ${theme.modalBody}`}>
            
            <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-[#27272a]' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${theme.textMain}`}>
                <FileSignature size={18} className="text-blue-500"/> IT Handover Agreement
              </h3>
              <button onClick={() => setSignModal(null)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-[#27272a] text-zinc-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
                <X size={16}/>
              </button>
            </div>

            <form onSubmit={submitDigitalSignature} className="p-6 md:p-8 space-y-6">
              
              <div className={`p-5 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-blue-50/50 border-blue-100'}`}>
                <div className="flex justify-between text-xs">
                  <span className={theme.textSub}>Asset:</span>
                  <span className={`font-bold ${theme.textMain}`}>{signModal.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={theme.textSub}>Tag ID:</span>
                  <span className={`font-mono font-bold ${theme.textMain}`}>{signModal.asset_tag}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={theme.textSub}>Serial (S/N):</span>
                  <span className={`font-mono font-bold ${theme.textMain}`}>{signModal.serial_number || 'N/A'}</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border text-xs leading-relaxed font-medium ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <p className="mb-2 font-bold uppercase tracking-widest text-blue-500">Terms & Conditions:</p>
                I hereby acknowledge receipt of the IT asset listed above. I agree to take proper care of this equipment and use it strictly for official company business. I understand that I am responsible for returning this asset in good working condition upon termination of my employment or upon request by the IT Department.
              </div>

              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textSub}`}>Digital Signature (Type your full name) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe" 
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className={`w-full p-4 rounded-xl text-sm font-bold outline-none transition-all border ${theme.inputBg}`}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSigning}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                {isSigning ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                I Agree and Sign Document
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}