'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Monitor, ArrowLeft, Loader2, ShieldCheck, Copy, Check, 
  Key, HelpCircle, Radio, Laptop, ShieldAlert, Wifi, 
  CheckCircle2, AlertTriangle, ExternalLink
} from 'lucide-react';

interface StaffProfile {
  id: string;
  name?: string;
  full_name?: string;
  email: string;
  emp_code?: string;
  department?: string;
  rustdesk_id?: string;
  rustdesk_password?: string;
  assigned_asset_name?: string;
}

export default function StaffRemotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'instructions' | 'security'>('overview');

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

    loadStaffProfile();
    return () => {
      window.removeEventListener('storage', checkTheme);
      observer.disconnect();
    };
  }, []);

  const loadStaffProfile = async () => {
    setLoading(true);
    try {
      const rawSession = localStorage.getItem('vsit_staff_session') || 
                         localStorage.getItem('vsit_admin_session') || 
                         localStorage.getItem('user');

      if (!rawSession) {
        toast.error("No active session found. Redirecting...");
        router.push('/');
        return;
      }

      let activeUser: any = {};
      try { activeUser = JSON.parse(rawSession); } 
      catch (e) { activeUser = { email: rawSession }; }

      const cleanEmail = (activeUser.email || '').toLowerCase().trim();

      const [{ data: userProfile, error: profErr }, { data: assets }] = await Promise.all([
        supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle(),
        supabase.from('assets').select('name, assigned_to')
      ]);

      if (profErr) throw profErr;

      if (userProfile) {
        const matchedAsset = (assets || []).find(a => a.assigned_to === userProfile.id || a.assigned_to === userProfile.email);
        
        setProfile({
          ...userProfile,
          rustdesk_id: userProfile.rustdesk_id || userProfile.remote_id || 'Not Assigned',
          rustdesk_password: userProfile.rustdesk_password || userProfile.remote_password || '••••••••',
          assigned_asset_name: matchedAsset ? matchedAsset.name : 'Unassigned Workstation'
        });
      } else {
        // Fallback for session token without full profile row
        setProfile({
          id: 'temp',
          full_name: activeUser.name || activeUser.full_name || cleanEmail.split('@')[0],
          email: cleanEmail,
          emp_code: activeUser.emp_code || 'EMP-STAFF',
          department: activeUser.department || 'General Staff',
          rustdesk_id: 'Contact IT Support',
          rustdesk_password: '••••••••',
          assigned_asset_name: 'Standard Workstation'
        });
      }
    } catch (error: any) {
      toast.error(`Error loading support details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text || text.includes('••••') || text.includes('Contact')) {
      return toast.error(`No valid ${fieldName} available to copy.`);
    }
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0b0712]' : 'bg-slate-50',
    card: isDarkMode ? 'bg-[#150f24] border-purple-900/40' : 'bg-white border-slate-200/80',
    cardInner: isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-slate-50 border-slate-200',
    textMain: isDarkMode ? 'text-purple-50' : 'text-slate-900',
    textSub: isDarkMode ? 'text-purple-300/70' : 'text-slate-500',
    divider: isDarkMode ? 'border-purple-900/40' : 'border-slate-100',
  };

  if (loading) return (
    <div className={`min-h-screen ${theme.bg} flex flex-col items-center justify-center gap-4 transition-colors`}>
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-orange-600 dark:border-t-orange-500"></div>
      <p className={`text-xs font-bold uppercase tracking-widest ${theme.textSub}`}>Loading IT Support Hub...</p>
    </div>
  );

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-12 flex flex-col`}>
      <Toaster position="top-right" />
      
      {/* 🌟 FULL-SCREEN ENTERPRISE FLUID CONTAINER */}
      <div className="w-full max-w-350 px-3 sm:px-6 lg:px-10 mx-auto space-y-5 sm:space-y-6 pt-4 flex-1 flex flex-col">
        
        {/* 🌟 STANDARDIZED HEADER */}
        <div className={`${theme.card} rounded-3xl p-4 sm:p-6 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300`}>
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
            <button 
              onClick={() => router.push('/staff/dashboard')} 
              className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${theme.card} hover:border-orange-500 hover:text-orange-600 ${theme.textSub}`}
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-lg sm:text-2xl font-black tracking-tight truncate ${theme.textMain} flex items-center gap-2`}>
                  <Monitor className="text-orange-600 dark:text-orange-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0" /> 
                  <span>IT Remote Support Hub</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                  <Wifi size={10} className="animate-pulse" /> Live Signaling Active
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-semibold truncate mt-0.5 ${theme.textSub}`}>
                View your workstation credentials and connect with IT administration for live screen sharing and diagnostics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border ${theme.cardInner} ${theme.textMain}`}>
              ID: {profile?.emp_code || 'EMP-STAFF'}
            </span>
          </div>
        </div>

        {/* 🌟 NAVIGATION TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar shrink-0">
          {[
            { id: 'overview', label: '🖥️ Workstation & Credentials', icon: <Laptop size={14} /> },
            { id: 'instructions', label: '📖 How Remote Support Works', icon: <HelpCircle size={14} /> },
            { id: 'security', label: '🛡️ Privacy & Watermark Policies', icon: <ShieldCheck size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer border whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25 border-orange-600 scale-[1.02]' 
                  : `${theme.card} ${theme.textSub} hover:text-purple-600 hover:border-purple-300 dark:hover:text-purple-300 dark:hover:border-purple-700`
              }`}
            >
              {tab.icon} <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 🌟 TAB 1: OVERVIEW & CREDENTIALS */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            {/* Left: Workstation Details */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm space-y-6 flex flex-col justify-between ${theme.card}`}>
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-300 flex items-center justify-center font-black text-xl shadow-inner">
                  <Laptop size={24} />
                </div>
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Assigned Workstation</span>
                  <h3 className={`text-lg sm:text-xl font-black mt-1 ${theme.textMain}`}>{profile?.assigned_asset_name || 'Standard Workstation'}</h3>
                  <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Department: {profile?.department || 'General Staff'}</p>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 ${theme.cardInner}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={theme.textSub}>Connection Status:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Online & Ready
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={theme.textSub}>Signaling Channel:</span>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400">WebRTC DTLS / TLS 1.3</span>
                </div>
              </div>
            </div>

            {/* Right: RustDesk Remote Credentials (2 Columns) */}
            <div className={`lg:col-span-2 p-6 sm:p-8 rounded-3xl border shadow-sm space-y-6 flex flex-col justify-between ${theme.card}`}>
              <div>
                <h3 className={`text-base sm:text-lg font-black ${theme.textMain}`}>RustDesk / Remote Support Credentials</h3>
                <p className={`text-xs sm:text-sm font-medium mt-1 ${theme.textSub}`}>
                  Provide these credentials to your IT Administrator over telephone or support chat if requested for native desktop access.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                
                {/* ID Box */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${theme.cardInner}`}>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest block ${theme.textSub}`}>RustDesk Remote ID</span>
                    <p className="font-mono font-black text-lg sm:text-xl text-orange-600 dark:text-orange-400 mt-1 truncate">
                      {profile?.rustdesk_id || 'Not Recorded'}
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => copyToClipboard(profile?.rustdesk_id || '', 'RustDesk ID')}
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    {copiedField === 'RustDesk ID' ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copiedField === 'RustDesk ID' ? 'Copied ID!' : 'Copy Remote ID'}</span>
                  </button>
                </div>

                {/* Password Box */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${theme.cardInner}`}>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest block ${theme.textSub}`}>Access Pin / Password</span>
                    <p className="font-mono font-black text-lg sm:text-xl text-purple-600 dark:text-purple-300 mt-1 truncate">
                      {profile?.rustdesk_password || '••••••••'}
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => copyToClipboard(profile?.rustdesk_password || '', 'Access Pin')}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    {copiedField === 'Access Pin' ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copiedField === 'Access Pin' ? 'Copied Pin!' : 'Copy Access Pin'}</span>
                  </button>
                </div>

              </div>

              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-800 dark:text-orange-300 flex items-center gap-3">
                <ShieldAlert size={20} className="shrink-0 text-orange-600 dark:text-orange-400" />
                <span>Never share your remote credentials with anyone outside of authorized Virtual Staffing IT Administration.</span>
              </div>
            </div>

          </div>
        )}

        {/* 🌟 TAB 2: INSTRUCTIONS */}
        {activeTab === 'instructions' && (
          <div className={`${theme.card} rounded-3xl p-6 sm:p-8 border shadow-sm space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300`}>
            <div>
              <h3 className={`text-base sm:text-lg font-black ${theme.textMain}`}>How Live IT Remote Support Works</h3>
              <p className={`text-xs sm:text-sm font-medium mt-1 ${theme.textSub}`}>Two secure ways our IT team can connect to help resolve your technical hardware or software issues.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className={`p-6 rounded-2xl border space-y-4 ${theme.cardInner}`}>
                <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                  <Radio size={20} />
                </div>
                <h4 className={`text-sm sm:text-base font-black ${theme.textMain}`}>1. In-Browser WebRTC Screen Share</h4>
                <p className={`text-xs leading-relaxed ${theme.textSub}`}>
                  When an administrator initiates a live session, a popup alert will appear directly on your dashboard. Simply click <strong className="text-orange-600 dark:text-orange-400">Accept & Share</strong> and select your screen when prompted by your browser. No software installation is required!
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-4 ${theme.cardInner}`}>
                <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                  <Laptop size={20} />
                </div>
                <h4 className={`text-sm sm:text-base font-black ${theme.textMain}`}>2. Native RustDesk Client Support</h4>
                <p className={`text-xs leading-relaxed ${theme.textSub}`}>
                  For deep OS-level troubleshooting or software installations, IT support may ask you to open the installed RustDesk application on your computer. Provide them with your ID and Access Pin listed on the overview tab.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 TAB 3: SECURITY & WATERMARKS */}
        {activeTab === 'security' && (
          <div className={`${theme.card} rounded-3xl p-6 sm:p-8 border shadow-sm space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className={`text-base sm:text-lg font-black ${theme.textMain}`}>Mandatory Security & Privacy Watermarks</h3>
                <p className={`text-xs sm:text-sm font-medium mt-0.5 ${theme.textSub}`}>All remote support sessions are monitored and logged for organizational compliance.</p>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border space-y-3 ${theme.cardInner}`}>
              <h4 className={`text-xs sm:text-sm font-bold ${theme.textMain}`}>What Happens During a Live Screen Share?</h4>
              <ul className={`space-y-2 text-xs leading-relaxed list-disc pl-5 ${theme.textSub}`}>
                <li>A persistent, high-contrast security watermark displaying the connected Administrator's Name and EMP ID is overlaid on the video stream.</li>
                <li>You maintain ultimate control: You can click the floating <strong className="text-rose-500">Stop Sharing</strong> button at any time to instantly cut off access.</li>
                <li>All video signaling runs over end-to-end encrypted TLS 1.3 and WebRTC DTLS security protocols.</li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}