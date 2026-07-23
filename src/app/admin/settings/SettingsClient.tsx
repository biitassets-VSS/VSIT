'use client';

import React, { useState, useEffect } from 'react';
import { 
  Moon, Sun, Monitor, Shield, Users, Sliders, Save, 
  CheckCircle2, AlertCircle, RefreshCw, Eye, Lock
} from 'lucide-react';

export default function SettingsClient({ initialSettings, initialUsers }: { initialSettings: any, initialUsers: any[] }) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'general' | 'users' | 'security'>('appearance');
  const [settings, setSettings] = useState(initialSettings);
  const [users, setUsers] = useState(initialUsers);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Initialize Theme from LocalStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Global Theme Switcher Engine
  const applyThemeMode = (mode: 'dark' | 'light') => {
    const isDark = mode === 'dark';
    setIsDarkMode(isDark);
    localStorage.setItem('vsit_theme', mode);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Trigger custom window event so layout instantly catches the change if needed
    window.dispatchEvent(new Event('storage'));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveStatus('Preferences saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    }, 600);
  };

  // Styling Map for High-Contrast Readability & Orange/Purple Theme
  const theme = {
    card: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200/80',
    cardInner: isDarkMode ? 'bg-[#18181b] border-[#27272a]' : 'bg-slate-50 border-slate-200',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textMuted: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    inputBg: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a] text-zinc-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20' : 'bg-white border-slate-200 text-slate-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
  };

  return (
    <div className="space-y-6">
      
      {/* Navigation Tabs (Animated & Themed) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
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
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all duration-300 cursor-pointer ${
                isActive 
                  ? (isDarkMode ? 'bg-orange-400/20 text-orange-400 border border-orange-500/30 shadow-md' : 'bg-orange-50 text-orange-700 border border-orange-200 shadow-sm scale-105') 
                  : `${theme.card} ${theme.textMuted} hover:text-orange-600 hover:bg-orange-50/50 hover:-translate-y-0.5 border`
              }`}
            >
              <Icon size={16} /> <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Appearance & Theme (Global Dark Mode Controller) */}
      {activeTab === 'appearance' && (
        <div className={`${theme.card} rounded-3xl p-6 md:p-8 border shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-lg hover:-translate-y-1 transition-all`}>
          <div>
            <h3 className={`text-lg font-bold ${theme.textMain}`}>Global Color Scheme</h3>
            <p className={`text-xs mt-1 ${theme.textMuted}`}>Select how the portal appears across all hardware inventory, dashboard, and inspection modules.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Light Mode Selector (Orange Primary) */}
            <div 
              onClick={() => applyThemeMode('light')}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative hover:scale-[1.02] active:scale-95 ${
                !isDarkMode 
                  ? 'border-orange-500 bg-orange-400/5 shadow-md' 
                  : `${theme.cardInner} opacity-70 hover:opacity-100 border-transparent`
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-orange-400 shadow-sm">
                  <Sun size={24} />
                </div>
                {!isDarkMode && <span className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full animate-in zoom-in">Active Mode</span>}
              </div>
              <div>
                <h4 className={`text-base font-bold ${theme.textMain}`}>Light Theme</h4>
                <p className={`text-xs mt-1 ${theme.textMuted}`}>Clean, high-contrast white workspace optimized for daytime office environments and standard displays.</p>
              </div>
            </div>

            {/* Dark Mode Selector (Purple Accent) */}
            <div 
              onClick={() => applyThemeMode('dark')}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative hover:scale-[1.02] active:scale-95 ${
                isDarkMode 
                  ? 'border-purple-500 bg-purple-500/10 shadow-md' 
                  : 'bg-slate-900 border-slate-800 text-white opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-xl bg-black border border-zinc-800 text-purple-400 shadow-sm">
                  <Moon size={24} />
                </div>
                {isDarkMode && <span className="bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full animate-in zoom-in">Active Mode</span>}
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Dark Theme (Full Portal)</h4>
                <p className="text-xs mt-1 text-zinc-400">Deep, low-glare dark palette designed to reduce eye strain during extended audit sessions and night shifts.</p>
              </div>
            </div>

          </div>

          <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium transition-colors ${theme.cardInner} ${theme.textMuted}`}>
            <Monitor size={18} className="text-purple-500 shrink-0" />
            <span>Theme preferences are saved directly to your session browser and apply globally to all data tables and modals.</span>
          </div>
        </div>
      )}

      {/* Tab 2: General Defaults */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className={`${theme.card} rounded-3xl p-6 md:p-8 border shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-lg hover:-translate-y-1 transition-all`}>
          <div>
            <h3 className={`text-lg font-bold ${theme.textMain}`}>System Configurations</h3>
            <p className={`text-xs mt-1 ${theme.textMuted}`}>Manage default titles, email recipients, and file processing rules.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${theme.textMuted}`}>Portal Organization Name</label>
              <input 
                type="text" 
                value={settings.appName} 
                onChange={e => setSettings({...settings, appName: e.target.value})}
                className={`w-full p-3.5 rounded-xl border outline-none text-sm font-semibold transition-all duration-300 ${theme.inputBg}`} 
              />
            </div>
            <div>
              <label className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${theme.textMuted}`}>Support Contact Email</label>
              <input 
                type="email" 
                value={settings.supportEmail} 
                onChange={e => setSettings({...settings, supportEmail: e.target.value})}
                className={`w-full p-3.5 rounded-xl border outline-none text-sm font-semibold transition-all duration-300 ${theme.inputBg}`} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200/50 dark:border-zinc-800">
            <div>
              <label className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${theme.textMuted}`}>Max Photo Upload Size (MB)</label>
              <select 
                value={settings.maxUploadSizeMB} 
                onChange={e => setSettings({...settings, maxUploadSizeMB: e.target.value})}
                className={`w-full p-3.5 rounded-xl border outline-none text-sm font-semibold transition-all duration-300 ${theme.inputBg}`}
              >
                <option value="5">5 MB (Standard)</option>
                <option value="10">10 MB (High Definition)</option>
                <option value="25">25 MB (Raw Mobile Capture)</option>
              </select>
            </div>
            <div>
              <label className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${theme.textMuted}`}>Watermark Label Format</label>
              <input 
                type="text" 
                value={settings.watermarkFormat} 
                disabled
                className={`w-full p-3.5 rounded-xl border outline-none text-sm font-semibold opacity-60 cursor-not-allowed ${theme.inputBg}`} 
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              {saveStatus && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-bold animate-in fade-in zoom-in">
                  <CheckCircle2 size={16} /> {saveStatus}
                </div>
              )}
            </div>
            <button type="submit" disabled={isSaving} className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100">
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save Preferences
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Staff Directory */}
      {activeTab === 'users' && (
        <div className={`${theme.card} rounded-3xl p-6 md:p-8 border shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-lg hover:-translate-y-1 transition-all`}>
          <div className="flex justify-between items-center">
            <div>
              <h3 className={`text-lg font-bold ${theme.textMain}`}>Registered Accounts</h3>
              <p className={`text-xs mt-1 ${theme.textMuted}`}>Staff members with active clearance in the Supabase directory.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 text-xs font-bold shadow-sm">{users.length} Active</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[10px] uppercase tracking-widest font-black ${theme.textMuted} ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                  <th className="pb-3 pl-2">Employee Name</th>
                  <th className="pb-3">EMP Code</th>
                  <th className="pb-3">Email Address</th>
                  <th className="pb-3 text-right pr-2">Clearance Role</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-semibold ${isDarkMode ? 'divide-zinc-800/60' : 'divide-slate-100'}`}>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">No user profiles found in database.</td>
                  </tr>
                ) : (
                  users.map((u: any, idx: number) => (
                    <tr key={u.id || idx} className={`transition-all duration-200 ${isDarkMode ? 'hover:bg-zinc-800/40' : 'hover:bg-orange-50/50'}`}>
                      <td className={`py-3.5 pl-2 font-bold ${theme.textMain}`}>{u.full_name || u.name || 'Unnamed Staff'}</td>
                      <td className="py-3.5 font-mono text-orange-600 font-bold">{u.emp_code || 'N/A'}</td>
                      <td className={`py-3.5 ${theme.textMuted}`}>{u.email || 'No email registered'}</td>
                      <td className="py-3.5 text-right pr-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                          u.role === 'admin' 
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-sm' 
                            : 'bg-purple-500/10 text-purple-600 border border-purple-500/20 shadow-sm'
                        }`}>
                          {u.role || 'Staff'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Security */}
      {activeTab === 'security' && (
        <div className={`${theme.card} rounded-3xl p-6 md:p-8 border shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-lg hover:-translate-y-1 transition-all`}>
          <div>
            <h3 className={`text-lg font-bold ${theme.textMain}`}>Access Control Policies</h3>
            <p className={`text-xs mt-1 ${theme.textMuted}`}>Manage authentication restrictions and audit enforcement.</p>
          </div>

          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border flex items-center justify-between transition-colors ${theme.cardInner} hover:border-orange-200 dark:hover:border-zinc-700`}>
              <div>
                <h4 className={`text-sm font-bold ${theme.textMain}`}>Require Admin Adjudication</h4>
                <p className={`text-xs mt-0.5 ${theme.textMuted}`}>All mobile hardware inspections must be manually approved before asset status changes.</p>
              </div>
              <input type="checkbox" checked={settings.requireAdminApproval} readOnly className="w-5 h-5 accent-orange-600 rounded cursor-pointer transition-transform hover:scale-110" />
            </div>

            <div className={`p-5 rounded-2xl border flex items-center justify-between transition-colors ${theme.cardInner} hover:border-orange-200 dark:hover:border-zinc-700`}>
              <div>
                <h4 className={`text-sm font-bold ${theme.textMain}`}>Staff Self-Service Edits</h4>
                <p className={`text-xs mt-0.5 ${theme.textMuted}`}>Allow employees to modify serial tags or hardware categories after assignment.</p>
              </div>
              <input type="checkbox" checked={settings.allowStaffEditAssets} readOnly className="w-5 h-5 accent-orange-600 rounded cursor-pointer transition-transform hover:scale-110" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}