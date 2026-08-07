'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Save, Trash2, Shield, Settings, Users, Database, Check, AlertTriangle, 
  Search, Radio, RefreshCw, Power, HardDrive, ArrowLeft, ShieldCheck, Filter, Zap,
  Sun, Moon
} from 'lucide-react';
import { UserProfile } from './page';
import { supabase } from '@/lib/supabaseClient';

interface SettingsClientProps {
  initialSettings: any;
  initialUsers: UserProfile[];
  initialRequests: any[];
}

export default function SettingsClient({ initialSettings, initialUsers, initialRequests }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState(initialSettings);
  const [users, setUsers] = useState(initialUsers);
  const [requests, setRequests] = useState(initialRequests || []);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [cleanupFilter, setCleanupFilter] = useState('All');

  // MOCK DATA IF DB IS EMPTY (Now strictly includes staff details for the UI)
  useEffect(() => {
    if (!requests || requests.length === 0) {
      setRequests([
        { id: '1', title: 'Duplicate Laptop Request', type: 'Duplicate', status: 'Pending', admin_note: 'Staff clicked twice by mistake', created_at: new Date().toISOString(), staff_name: 'John Doe', emp_code: 'EMP-882' },
        { id: '2', title: 'Wrong Asset Return', type: 'Wrong Request', status: 'Pending', admin_note: '', created_at: new Date().toISOString(), staff_name: 'Jane Smith', emp_code: 'EMP-405' },
        { id: '3', title: 'Broken Mouse Replacement', type: 'Replacement', status: 'Open', admin_note: 'Waiting on manager approval', created_at: new Date().toISOString(), staff_name: 'Mike Johnson', emp_code: 'EMP-911' },
      ]);
    }
  }, [requests]);

  // 🌟 INIT THEME
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  // 🌟 NEW: THEME TOGGLE HANDLER
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vsit_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vsit_theme', 'light');
    }
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFF9F2]',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-[40px] backdrop-saturate-[1.5] border border-white/70 shadow-[0_16px_40px_rgba(31,38,135,0.1)] shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.8)]',
    inputBg: isDarkMode ? 'bg-black/40 border border-white/10 text-white focus:border-purple-500/50' : 'bg-white/50 border border-white/60 text-slate-900 focus:bg-white/70 focus:ring-4 focus:ring-purple-500/10',
    tabActive: 'bg-linear-to-r from-purple-500 to-purple-600 text-white shadow-md border-transparent',
    tabInactive: isDarkMode ? 'text-zinc-400 hover:bg-white/5 border-transparent' : 'text-slate-600 hover:bg-white/30 border-transparent',
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedRequests(prev => 
      prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]
    );
  };

  const handleNoteChange = (id: string, newNote: string) => {
    setRequests(prev => prev.map(req => req.id === id ? { ...req, admin_note: newNote } : req));
  };

  const handleDeleteSelected = () => {
    setRequests(prev => prev.filter(req => !selectedRequests.includes(req.id)));
    setSelectedRequests([]);
    alert("Records and notes manually purged successfully!");
  };

  const handleAutoSelectDuplicates = () => {
    const duplicateIds = requests.filter(r => r.type === 'Duplicate').map(r => r.id);
    if (duplicateIds.length === 0) {
      alert("No duplicate requests found in the current list.");
      return;
    }
    setSelectedRequests(prev => [...new Set([...prev, ...duplicateIds])]);
  };

  const sendLiveCommand = async (command: string, successMessage: string) => {
    setIsBroadcasting(true);
    try {
      const channel = supabase.channel('vsit_global_updates');
      await channel.send({
        type: 'broadcast',
        event: command,
        payload: { timestamp: new Date().toISOString(), adminTriggered: true }
      });
      alert(`🚀 Success: ${successMessage}`);
    } catch (error) {
      alert("Failed to send command. Check connection.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.emp_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = requests.filter(req => {
    if (cleanupFilter === 'All') return true;
    return req.type === cleanupFilter;
  });

  return (
    <div className={`min-h-screen ${theme.bg} p-6 sm:p-10 font-sans relative z-0 transition-colors duration-1000`}>
      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vh] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[50vw] h-[50vh] bg-orange-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-350 mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* SIDEBAR TABS */}
        <div className={`w-full lg:w-72 shrink-0 ${theme.glassCard} rounded-4xl p-4 flex flex-col gap-2 h-fit`}>
          
          <div className="flex items-center justify-between px-2 pt-2 pb-4 border-b border-transparent">
            <Link href="/admin" className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${theme.subText} hover:text-purple-500`}>
              <ArrowLeft size={16} className="shrink-0" /> Return
            </Link>
            
            {/* 🌟 NEW: THEME TOGGLE BUTTON */}
            <button 
              onClick={toggleTheme} 
              className={`p-2 rounded-xl transition-all shadow-sm border ${isDarkMode ? 'bg-zinc-800 text-amber-400 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-indigo-600 border-slate-200 hover:bg-slate-50'}`}
              title="Toggle Light/Dark Mode"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className={`p-4 mb-2 border-t ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
            <h2 className={`text-xl font-black tracking-tight ${theme.text}`}>Admin Settings</h2>
            <p className={`text-xs font-semibold mt-1 ${theme.subText}`}>Manage system & policies</p>
          </div>
          
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border ${activeTab === 'settings' ? theme.tabActive : theme.tabInactive}`}>
            <Settings size={18} /> System Settings
          </button>
          <button onClick={() => setActiveTab('security')} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border ${activeTab === 'security' ? theme.tabActive : theme.tabInactive}`}>
            <Shield size={18} /> Security & Policies
          </button>
          <button onClick={() => setActiveTab('controls')} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border ${activeTab === 'controls' ? theme.tabActive : theme.tabInactive}`}>
            <Radio size={18} className={activeTab === 'controls' ? 'animate-pulse' : ''} /> Live Controls
          </button>

          <button onClick={() => setActiveTab('cleanup')} className={`flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border ${activeTab === 'cleanup' ? theme.tabActive : theme.tabInactive}`}>
            <div className="flex items-center gap-3"><Database size={18} /> Manual Cleanup</div>
            {requests.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{requests.length}</span>}
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border ${activeTab === 'users' ? theme.tabActive : theme.tabInactive}`}>
            <Users size={18} /> Staff Accounts
          </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 space-y-6">
          
          {/* 1. SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className={`${theme.glassCard} rounded-4xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <h3 className={`text-lg font-black mb-6 flex items-center gap-2 ${theme.text}`}><Settings size={20} className="text-purple-500"/> Core Portal Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-widest ${theme.subText}`}>Application Name</label>
                  <input value={settings.appName} onChange={e => handleSettingChange('appName', e.target.value)} className={`w-full px-4 py-3 rounded-2xl outline-none font-semibold shadow-inner transition-all ${theme.inputBg}`} />
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-widest ${theme.subText}`}>Support Email</label>
                  <input value={settings.supportEmail} onChange={e => handleSettingChange('supportEmail', e.target.value)} className={`w-full px-4 py-3 rounded-2xl outline-none font-semibold shadow-inner transition-all ${theme.inputBg}`} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className={`text-xs font-bold uppercase tracking-widest ${theme.subText}`}>Global System Announcement</label>
                  <input value={settings.systemAnnouncement} onChange={e => handleSettingChange('systemAnnouncement', e.target.value)} placeholder="Displays at the top of staff dashboard..." className={`w-full px-4 py-3 rounded-2xl outline-none font-semibold shadow-inner transition-all ${theme.inputBg}`} />
                </div>
                
                <div className={`space-y-2 md:col-span-2 mt-4 p-5 rounded-3xl border ${isDarkMode ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className={`text-sm font-black ${theme.text}`}>Camera Watermark Settings</h4>
                      <p className={`text-xs font-medium ${theme.subText}`}>Configure the text stamped on asset inspection photos.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.enableWatermarks} onChange={e => handleSettingChange('enableWatermarks', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>
                  <label className={`text-xs font-bold uppercase tracking-widest ${theme.subText}`}>Watermark Elements</label>
                  <input value={settings.watermarkFormat} onChange={e => handleSettingChange('watermarkFormat', e.target.value)} className={`w-full px-4 py-3 rounded-2xl outline-none font-semibold shadow-inner transition-all ${theme.inputBg}`} />
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-2 flex items-center gap-1.5"><Check size={12}/> Live Preview: 2026-08-07 14:30 | Tag: LAP-001 | John Doe (EMP-882)</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. SECURITY & POLICIES */}
          {activeTab === 'security' && (
            <div className={`${theme.glassCard} rounded-4xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <h3 className={`text-lg font-black mb-6 flex items-center gap-2 ${theme.text}`}><Shield size={20} className="text-orange-500"/> Security & Access Policies</h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div className={`flex items-center justify-between p-5 rounded-3xl border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-start gap-4">
                    <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={24} />
                    <div>
                      <h4 className={`text-sm font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Permanent Login Active</h4>
                      <p className={`text-xs font-medium mt-1 leading-relaxed ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>
                        Session timeout limits and strict MFA requirements have been disabled. Staff and Admins will remain logged in permanently until they explicitly click the Log Out button.
                      </p>
                    </div>
                  </div>
                  <Check className="text-emerald-500 shrink-0 hidden sm:block" size={24} />
                </div>
                
                <div className={`flex items-center justify-between p-5 rounded-3xl border ${isDarkMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={24} />
                    <div>
                      <h4 className={`text-sm font-black ${isDarkMode ? 'text-rose-400' : 'text-rose-700'}`}>Maintenance Mode</h4>
                      <p className={`text-xs font-medium mt-1 leading-relaxed ${isDarkMode ? 'text-rose-300' : 'text-rose-600'}`}>Blocks all staff from logging in. Only IT Admins can access the portal during this time.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input type="checkbox" checked={settings.maintenanceMode} onChange={e => handleSettingChange('maintenanceMode', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-rose-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3. LIVE SYSTEM CONTROLS */}
          {activeTab === 'controls' && (
            <div className={`${theme.glassCard} rounded-4xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <div className="mb-6">
                <h3 className={`text-lg font-black flex items-center gap-2 ${theme.text}`}>
                  <Radio size={20} className="text-blue-500 animate-pulse"/> Live System Controls
                </h3>
                <p className={`text-xs font-medium mt-1 ${theme.subText}`}>
                  Broadcast real-time commands to all active staff applications simultaneously.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-5 rounded-3xl border flex flex-col gap-4 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/50 border-white/60'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500"><RefreshCw size={20} /></div>
                    <div>
                      <h4 className={`text-sm font-bold ${theme.text}`}>Force App Update</h4>
                      <p className={`text-[10px] font-medium mt-0.5 ${theme.subText}`}>Forces all clients to refresh and fetch new code.</p>
                    </div>
                  </div>
                  <button onClick={() => sendLiveCommand('force_app_update', 'Force Update command sent to all apps.')} disabled={isBroadcasting} className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50">
                    Execute Command
                  </button>
                </div>

                <div className={`p-5 rounded-3xl border flex flex-col gap-4 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/50 border-white/60'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500"><Power size={20} /></div>
                    <div>
                      <h4 className={`text-sm font-bold ${theme.text}`}>Force Global Logout</h4>
                      <p className={`text-[10px] font-medium mt-0.5 ${theme.subText}`}>Instantly logs out all staff from the system.</p>
                    </div>
                  </div>
                  <button onClick={() => sendLiveCommand('force_global_logout', 'Global Logout initiated.')} disabled={isBroadcasting} className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50">
                    Execute Command
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🌟 4. MANUAL CLEANUP (WITH EMPLOYEE NAME AND CODE DISPLAYED) */}
          {activeTab === 'cleanup' && (
            <div className={`${theme.glassCard} rounded-4xl p-6 sm:p-8 flex flex-col h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
                <div>
                  <h3 className={`text-lg font-black flex items-center gap-2 ${theme.text}`}><Database size={20} className="text-rose-500"/> System Cleanup</h3>
                  <p className={`text-xs font-medium mt-1 ${theme.subText}`}>Verify Employee, Auto-Select, and Purge duplicate or incorrect requests.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  {/* Filter Dropdown */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${theme.inputBg}`}>
                    <Filter size={14} className="opacity-50" />
                    <select 
                      value={cleanupFilter} 
                      onChange={e => setCleanupFilter(e.target.value)} 
                      className="bg-transparent outline-none text-xs font-bold w-full cursor-pointer appearance-none dark:text-white"
                    >
                      <option value="All" className="dark:bg-zinc-900">All Requests</option>
                      <option value="Duplicate" className="dark:bg-zinc-900">Duplicates Only</option>
                      <option value="Wrong Request" className="dark:bg-zinc-900">Wrong Requests</option>
                      <option value="Replacement" className="dark:bg-zinc-900">Replacements</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleAutoSelectDuplicates}
                    className="px-4 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Zap size={14} /> Auto-Select Duplicates
                  </button>

                  <button 
                    onClick={handleDeleteSelected}
                    disabled={selectedRequests.length === 0}
                    className="px-5 py-2.5 bg-linear-to-r from-rose-500 to-rose-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Trash2 size={16} /> Delete Selected ({selectedRequests.length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar border rounded-3xl bg-black/5 dark:bg-white/5 border-white/20 dark:border-white/10">
                <table className="w-full text-left border-collapse">
                  <thead className={`sticky top-0 backdrop-blur-xl z-10 text-[10px] font-black uppercase tracking-widest ${theme.subText} ${isDarkMode ? 'bg-zinc-900/80 border-b border-white/10' : 'bg-white/80 border-b border-slate-200'}`}>
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <input type="checkbox" onChange={(e) => setSelectedRequests(e.target.checked ? filteredRequests.map(r => r.id) : [])} checked={filteredRequests.length > 0 && selectedRequests.length === filteredRequests.length} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer" />
                      </th>
                      <th className="p-4">Request Detail</th>
                      <th className="p-4">Raised By (Employee)</th>
                      <th className="p-4">Flag Type</th>
                      <th className="p-4 w-56 xl:w-64">Admin Notes / Date</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                    {filteredRequests.length === 0 ? (
                      <tr><td colSpan={5} className="p-10 text-center text-sm font-semibold opacity-50">No records found matching this filter.</td></tr>
                    ) : (
                      filteredRequests.map(req => (
                        <tr key={req.id} className={`transition-colors cursor-pointer ${selectedRequests.includes(req.id) ? (isDarkMode ? 'bg-rose-500/20' : 'bg-rose-50') : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')}`} onClick={() => handleToggleSelect(req.id)}>
                          <td className="p-4 text-center">
                            <input type="checkbox" checked={selectedRequests.includes(req.id)} onChange={() => handleToggleSelect(req.id)} onClick={(e) => e.stopPropagation()} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer" />
                          </td>
                          <td className="p-4">
                            <p className={`text-sm font-bold ${theme.text}`}>{req.title || 'Unknown Request'}</p>
                            <p className={`text-[10px] font-semibold uppercase tracking-widest mt-1 ${theme.subText}`}>ID: {req.id}</p>
                          </td>
                          
                          {/* 🌟 NEW: RAISED BY COLUMN (Shows Emp Name and Code for verification) */}
                          <td className="p-4">
                            <p className={`text-sm font-bold ${theme.text}`}>{req.staff_name || 'Unknown'}</p>
                            <span className={`inline-block mt-1 font-mono text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-sm ${isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                              {req.emp_code || 'N/A'}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${req.type === 'Duplicate' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : req.type === 'Wrong Request' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20'}`}>
                              {req.type}
                            </span>
                          </td>
                          <td className="p-4">
                            <input 
                              type="text" 
                              value={req.admin_note || ''} 
                              onChange={(e) => handleNoteChange(req.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()} 
                              placeholder="Add reason for deletion..." 
                              className={`w-full px-3 py-2 rounded-xl outline-none text-xs font-semibold shadow-inner transition-all border mb-1.5 ${isDarkMode ? 'bg-black/40 border-white/10 text-white focus:border-purple-500/50' : 'bg-white/50 border-white/60 text-slate-900 focus:bg-white/70 focus:ring-2 focus:ring-purple-500/20'}`}
                            />
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${theme.subText}`}>{new Date(req.created_at).toLocaleDateString()}</p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. STAFF ACCOUNTS */}
          {activeTab === 'users' && (
            <div className={`${theme.glassCard} rounded-4xl p-6 sm:p-8 flex flex-col h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className={`text-lg font-black flex items-center gap-2 ${theme.text}`}><Users size={20} className="text-blue-500"/> Staff Directory</h3>
                  <p className={`text-xs font-medium mt-1 ${theme.subText}`}>View and manage registered staff profiles.</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border w-full sm:w-64 transition-all ${theme.inputBg}`}>
                  <Search size={16} className="opacity-50" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name or ID..." className="bg-transparent outline-none text-xs font-semibold w-full" />
                </div>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar border rounded-3xl bg-black/5 dark:bg-white/5 border-white/20 dark:border-white/10">
                <table className="w-full text-left border-collapse">
                  <thead className={`sticky top-0 backdrop-blur-xl z-10 text-[10px] font-black uppercase tracking-widest ${theme.subText} ${isDarkMode ? 'bg-zinc-900/80 border-b border-white/10' : 'bg-white/80 border-b border-slate-200'}`}>
                    <tr>
                      <th className="p-4">Staff Name</th>
                      <th className="p-4">Employee Code</th>
                      <th className="p-4">Role</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={3} className="p-10 text-center text-sm font-semibold opacity-50">No staff found.</td></tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                          <td className="p-4">
                            <p className={`text-sm font-bold ${theme.text}`}>{user.full_name || user.name}</p>
                            <p className={`text-[11px] font-medium mt-0.5 ${theme.subText}`}>{user.email}</p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border shadow-sm ${isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                              EMP- {user.emp_code || 'N/A'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-600'}`}>
                              {user.role || 'Staff'}
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

          {/* SAVE BUTTON */}
          {(activeTab === 'settings') && (
            <div className="flex justify-end pt-4">
              <button className="px-8 py-3.5 bg-linear-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/25 cursor-pointer active:scale-95">
                <Save size={16} /> Save Configurations
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}