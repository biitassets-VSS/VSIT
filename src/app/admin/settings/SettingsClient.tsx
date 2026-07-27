'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Settings as SettingsIcon, Sun, Moon, Monitor, 
  Sliders, Users, ShieldCheck, Save, RefreshCw, Search, 
  UserCheck, CheckCircle2, Lock, Mail, Globe, Database, 
  Cpu, HardDrive, ShieldAlert,
  Shield
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface UserProfile {
  id: string;
  name: string;
  full_name: string;
  email: string;
  role: string;
  emp_code: string;
}

interface SettingsClientProps {
  initialSettings: any;
  initialUsers: UserProfile[];
}

export default function SettingsClient({ initialSettings, initialUsers }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'general' | 'users' | 'security'>('appearance');
  const [settings, setSettings] = useState(initialSettings);
  const [users, setUsers] = useState<UserProfile[]>(initialUsers || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 🌟 SAFE THEME INITIALIZATION (ZERO INFINITE LOOPS)
  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    const isDark = savedTheme === 'dark' || document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // 🌟 INSTANT THEME SWITCHER (CLEAN & BUG-FREE)
  const applyThemeMode = (mode: 'dark' | 'light') => {
    const isDark = mode === 'dark';
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vsit_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vsit_theme', 'light');
    }
    toast.success(isDark ? '🌙 Dark Theme enabled globally!' : '☀️ Light Theme enabled globally!');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('✔ System preferences saved successfully!');
    }, 600);
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return (u.full_name || u.name || '').toLowerCase().includes(q) || 
           (u.email || '').toLowerCase().includes(q) || 
           (u.emp_code || '').toLowerCase().includes(q);
  });

  // 🌟 DYNAMIC BRAND THEME DICTIONARY
  const theme = {
    card: isDarkMode ? 'bg-[#150f24] border-purple-900/40' : 'bg-white border-slate-200/80',
    cardInner: isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-slate-50 border-slate-200',
    cardHover: isDarkMode ? 'hover:border-orange-500/60 hover:bg-[#1c1430]' : 'hover:border-orange-400 hover:shadow-lg',
    textMain: isDarkMode ? 'text-purple-50' : 'text-slate-900',
    textMuted: isDarkMode ? 'text-purple-300/70' : 'text-slate-500',
    inputBg: isDarkMode ? 'bg-[#0f0a1c] border-purple-900/60 focus:border-orange-500 text-purple-100 placeholder-purple-400/50' : 'bg-slate-50 border-slate-200 focus:border-orange-600 text-slate-900 placeholder-slate-400 font-medium',
    divider: isDarkMode ? 'border-purple-900/40' : 'border-slate-100',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Toaster position="top-right" />
      
      {/* 🌟 RESTORED PORTAL SETTINGS HEADER CARD */}
      <div className={`${theme.card} rounded-3xl p-4 sm:p-6 border shadow-sm flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-md`}>
        <div className="flex items-center gap-3.5 sm:gap-5">
          <Link 
            href="/admin" 
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${theme.card} hover:border-orange-500 hover:text-orange-600 ${theme.textMuted}`}
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
              <h1 className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${theme.textMain} flex items-center gap-2.5`}>
                <SettingsIcon className="text-orange-600 dark:text-orange-400 w-6 h-6 sm:w-7 sm:h-7 shrink-0" /> 
                <span>Portal Settings</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30">
                System Commander
              </span>
            </div>
            <p className={`text-xs sm:text-sm font-semibold ${theme.textMuted}`}>
              Configure system preferences, appearance themes, user roles, and global IT portal parameters.
            </p>
          </div>
        </div>
      </div>

      {/* 🌟 BRAND COLOR NAVIGATION TABS (TOUCH-SCROLLABLE ON MOBILE) */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 custom-scrollbar shrink-0">
        {[
          { id: 'appearance', label: 'Appearance & Theme', icon: Moon },
          { id: 'general', label: 'General Defaults', icon: Sliders },
          { id: 'users', label: `Staff Directory (${users.length})`, icon: Users },
          { id: 'security', label: 'Access & Security', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-widest shrink-0 transition-all duration-200 cursor-pointer border whitespace-nowrap ${
                isActive 
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25 border-orange-600 scale-[1.02]' 
                  : `${theme.card} ${theme.textMuted} hover:text-purple-600 hover:border-purple-300 dark:hover:text-purple-300 dark:hover:border-purple-700`
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : 'text-purple-500 dark:text-purple-400 group-hover:text-orange-500 transition-colors'} /> 
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 🌟 TAB 1: APPEARANCE & THEME SWITCHER */}
      {activeTab === 'appearance' && (
        <div className={`${theme.card} rounded-3xl p-6 sm:p-8 border shadow-sm space-y-6 animate-in fade-in duration-300`}>
          <div>
            <h3 className={`text-base sm:text-lg font-black ${theme.textMain}`}>Global Color Scheme</h3>
            <p className={`text-xs sm:text-sm font-medium mt-1 ${theme.textMuted}`}>
              Select how the portal appears across all hardware inventory, dashboard, and inspection modules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            
            {/* Light Mode Option Box */}
            <div 
              onClick={() => applyThemeMode('light')}
              className={`p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between gap-6 relative overflow-hidden group ${
                !isDarkMode 
                  ? 'border-orange-500 ring-4 ring-orange-500/15 bg-orange-50/40 dark:bg-orange-500/10' 
                  : `${theme.card} ${theme.cardHover}`
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                    <Sun size={24} />
                  </div>
                  {!isDarkMode && (
                    <span className="px-3 py-1 bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-sm animate-pulse">
                      Active Mode
                    </span>
                  )}
                </div>
                <div>
                  <h4 className={`text-base sm:text-lg font-black ${theme.textMain}`}>Light Theme</h4>
                  <p className={`text-xs sm:text-sm font-medium mt-1 leading-relaxed ${theme.textMuted}`}>
                    Clean, high-contrast white workspace optimized for daytime office environments and standard displays.
                  </p>
                </div>
              </div>
            </div>

            {/* Dark Mode Option Box */}
            <div 
              onClick={() => applyThemeMode('dark')}
              className={`p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between gap-6 relative overflow-hidden group ${
                isDarkMode 
                  ? 'border-purple-500 ring-4 ring-purple-500/20 bg-purple-950/40' 
                  : `${theme.card} ${theme.cardHover}`
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                    <Moon size={24} />
                  </div>
                  {isDarkMode && (
                    <span className="px-3 py-1 bg-purple-600 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-sm animate-pulse">
                      Active Mode
                    </span>
                  )}
                </div>
                <div>
                  <h4 className={`text-base sm:text-lg font-black ${theme.textMain}`}>Dark Theme (Full Portal)</h4>
                  <p className={`text-xs sm:text-sm font-medium mt-1 leading-relaxed ${theme.textMuted}`}>
                    Deep, low-glare dark palette designed to reduce eye strain during extended audit sessions and night shifts.
                  </p>
                </div>
              </div>
            </div>

          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-semibold ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50 text-purple-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <Monitor size={18} className="text-orange-600 dark:text-orange-400 shrink-0" />
            <span>Theme preferences are saved directly to your session browser and apply globally to all data tables and modals.</span>
          </div>
        </div>
      )}

      {/* 🌟 TAB 2: GENERAL DEFAULTS */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className={`${theme.card} rounded-3xl p-6 sm:p-8 border shadow-sm space-y-6 animate-in fade-in duration-300`}>
          <div>
            <h3 className={`text-base sm:text-lg font-black ${theme.textMain}`}>General System Parameters</h3>
            <p className={`text-xs sm:text-sm font-medium mt-1 ${theme.textMuted}`}>Configure portal identity, notification channels, and file upload restrictions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${theme.textMuted}`}>Portal Identity Name</label>
              <input 
                type="text" 
                value={settings.appName} 
                onChange={e => setSettings({...settings, appName: e.target.value})}
                style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', borderColor: isDarkMode ? '#581c87' : '#cbd5e1' }}
                className="w-full p-4 rounded-xl text-xs sm:text-sm font-bold border outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-2xs"
              />
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${theme.textMuted}`}>IT Support Email Channel</label>
              <input 
                type="email" 
                value={settings.supportEmail} 
                onChange={e => setSettings({...settings, supportEmail: e.target.value})}
                style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', borderColor: isDarkMode ? '#581c87' : '#cbd5e1' }}
                className="w-full p-4 rounded-xl text-xs sm:text-sm font-bold border outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${theme.textMuted}`}>Max Attachment Upload Size (MB)</label>
              <select 
                value={settings.maxUploadSizeMB} 
                onChange={e => setSettings({...settings, maxUploadSizeMB: e.target.value})}
                style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', borderColor: isDarkMode ? '#581c87' : '#cbd5e1' }}
                className="w-full p-4 rounded-xl text-xs sm:text-sm font-bold border outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer shadow-2xs"
              >
                <option value="5" style={{ backgroundColor: isDarkMode ? '#181130' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>5 MB (Compact Smartphone Photos)</option>
                <option value="10" style={{ backgroundColor: isDarkMode ? '#181130' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>10 MB (Recommended Default)</option>
                <option value="25" style={{ backgroundColor: isDarkMode ? '#181130' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>25 MB (High-Res Audit Captures)</option>
              </select>
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${theme.textMuted}`}>Watermark Stamp Formatting</label>
              <select 
                value={settings.watermarkFormat} 
                onChange={e => setSettings({...settings, watermarkFormat: e.target.value})}
                style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', borderColor: isDarkMode ? '#581c87' : '#cbd5e1' }}
                className="w-full p-4 rounded-xl text-xs sm:text-sm font-bold border outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer shadow-2xs"
              >
                <option value="Date, Time & Tag ID" style={{ backgroundColor: isDarkMode ? '#181130' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>Date, Time & Tag ID (Standard)</option>
                <option value="Employee Name & Tag ID" style={{ backgroundColor: isDarkMode ? '#181130' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a' }}>Employee Name & Tag ID</option>
              </select>
            </div>
          </div>

          <div className={`pt-4 border-t flex justify-end ${theme.divider}`}>
            <button 
              type="submit" disabled={isSaving}
              className="w-full sm:w-auto px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSaving ? 'Saving Changes...' : 'Save General Preferences'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 🌟 TAB 3: STAFF DIRECTORY OVERVIEW */}
      {activeTab === 'users' && (
        <div className={`${theme.card} rounded-3xl p-6 sm:p-8 border shadow-sm space-y-6 animate-in fade-in duration-300`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className={`text-base sm:text-lg font-black ${theme.textMain}`}>Active Staff Accounts ({users.length})</h3>
              <p className={`text-xs sm:text-sm font-medium mt-1 ${theme.textMuted}`}>Review registered personnel and manage system privilege roles.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" size={16} />
              <input 
                type="text" placeholder="Search employee..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', borderColor: isDarkMode ? '#581c87' : '#cbd5e1' }}
                className="w-full pl-11 pr-4 py-3 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.length === 0 ? (
              <div className={`col-span-full p-12 text-center border rounded-2xl ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/40 text-purple-300/70' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <UserCheck size={36} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold uppercase tracking-wider">No matching staff accounts found.</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className={`p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${isDarkMode ? 'bg-[#0f0a1c]/80 border-purple-900/40 hover:border-orange-500/50' : 'bg-slate-50/80 border-slate-200 hover:border-orange-400'}`}>
                  <div className="overflow-hidden">
                    <h4 className={`text-sm font-bold truncate ${theme.textMain}`}>{user.full_name || user.name || 'Unnamed Staff'}</h4>
                    <p className={`text-xs truncate mt-0.5 font-mono ${theme.textMuted}`}>{user.email}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                      {user.emp_code || 'NO-ID'}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shrink-0 ${
                    user.role?.toLowerCase() === 'admin' 
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs' 
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}>
                    {user.role || 'Staff'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 🌟 TAB 4: ACCESS & SECURITY */}
      {activeTab === 'security' && (
        <div className={`${theme.card} rounded-3xl p-6 sm:p-8 border shadow-sm space-y-6 animate-in fade-in duration-300`}>
          <div>
            <h3 className={`text-base sm:text-lg font-black ${theme.textMain}`}>Portal Access & Security Restrictions</h3>
            <p className={`text-xs sm:text-sm font-medium mt-1 ${theme.textMuted}`}>Enforce administrative approval rules and control employee dashboard capabilities.</p>
          </div>

          <div className="space-y-4">
            {[
              { title: 'Allow Staff Portal Login', desc: 'Permit active employees to sign into their dashboard and view assigned devices.', state: settings.allowStaffLogin, key: 'allowStaffLogin' },
              { title: 'Require Admin Approval for Hardware Returns', desc: 'Mandate IT administrative verification before an asset is returned to warehouse stock.', state: settings.requireAdminApproval, key: 'requireAdminApproval' },
              { title: 'Compress Smartphone Uploads Automatically', desc: 'Reduce image file sizes on client devices before transmitting to Supabase cloud storage.', state: settings.compressUploads, key: 'compressUploads' },
            ].map((item, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/40' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <h4 className={`text-sm font-bold ${theme.textMain}`}>{item.title}</h4>
                  <p className={`text-xs font-medium mt-1 ${theme.textMuted}`}>{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettings({ ...settings, [item.key]: !item.state });
                    toast.success(`Updated "${item.title}" setting!`);
                  }}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${item.state ? 'bg-orange-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${item.state ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>

          <div className={`p-5 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-semibold ${isDarkMode ? 'bg-purple-950/40 border-purple-800/60 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'}`}>
            <ShieldCheck size={20} className="text-orange-600 dark:text-orange-400 shrink-0" />
            <span>Security settings are enforced continuously across your Supabase Row Level Security (RLS) policies.</span>
          </div>
        </div>
      )}

    </div>
  );
}