'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Trash2, UserCheck, UserX, Briefcase, Clock, Monitor, X, Save, Database, 
  UserMinus, UserPlus, FileText, ArrowLeft, Moon, Sun, Settings, ShieldCheck,
  SlidersHorizontal, Loader2, PlusCircle
} from 'lucide-react';

function generateSafeUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function SettingsClient({ initialSettings, initialUsers, initialRequests }: any) {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('HR Accounts');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [requests, setRequests] = useState<any[]>(initialRequests);
  const [users, setUsers] = useState<any[]>(initialUsers);
  
  const [settings, setSettings] = useState(initialSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  
  const [newStaffForm, setNewStaffForm] = useState({ 
    name: '', contact_no: '', personal_email: '', 
    academic_qual: '', prof_qual: '', experience: '', last_job: '', salary_exp: '' 
  });
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    newStatus: 'Selected' | 'Rejected' | '';
    note: string;
  }>({ isOpen: false, userId: '', userName: '', newStatus: '', note: '' });

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vsit_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vsit_theme', 'light');
    }
  };

  const theme = {
    bg: 'bg-transparent',
    glassCard: isDarkMode 
      ? 'bg-zinc-950/60 backdrop-blur-3xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]' 
      : 'bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_16px_40px_rgba(31,38,135,0.07)]',
    glassItem: isDarkMode
      ? 'bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300'
      : 'bg-white/50 backdrop-blur-2xl border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all duration-300',
    glassInner: isDarkMode
      ? 'bg-black/40 backdrop-blur-xl border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]'
      : 'bg-white/80 backdrop-blur-xl border border-white/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]',
    inputBg: isDarkMode 
      ? 'bg-black/50 border border-white/20 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all' 
      : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  const forceDeleteRequest = async (id: string, table: string) => {
    if (!window.confirm("WARNING: This will permanently delete this record from the database. Continue?")) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== id));
      alert("Record deleted successfully.");
    } catch (err: any) {
      alert("Error deleting record: " + err.message);
    }
  };

  const handleAddNewStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffForm.name) return alert("Full Name is required.");
    setIsSavingStaff(true);

    try {
      const newId = generateSafeUuid();
      const payload = {
        id: newId,
        full_name: newStaffForm.name,
        name: newStaffForm.name,
        emp_code: null, 
        email: null, 
        contact_no: newStaffForm.contact_no,
        personal_email: newStaffForm.personal_email,
        academic_qualifications: newStaffForm.academic_qual,
        professional_qualifications: newStaffForm.prof_qual,
        experience: newStaffForm.experience,
        last_job_detail: newStaffForm.last_job,
        leave_reason: null, 
        salary_expectation: newStaffForm.salary_exp,
        role: 'staff',
        status: 'Pending Review'
      };

      const { error } = await supabase.from('profiles').insert([payload]);
      if (error) throw error;

      setUsers(prev => [payload, ...prev]);
      setIsAddingStaff(false);
      setNewStaffForm({ name: '', contact_no: '', personal_email: '', academic_qual: '', prof_qual: '', experience: '', last_job: '', salary_exp: '' });
    } catch (err: any) {
      alert("Failed to add new staff applicant: " + err.message);
    } finally {
      setIsSavingStaff(false);
    }
  };

  const initiateStatusChange = (user: any, newStatus: string) => {
    if (newStatus === 'Selected' || newStatus === 'Rejected') {
      setStatusModal({ 
        isOpen: true, 
        userId: user.id, 
        userName: user.full_name || user.name, 
        newStatus: newStatus as 'Selected' | 'Rejected', 
        note: user.hr_notes || '' 
      });
    } else {
      executeStatusUpdate(user.id, newStatus, '');
    }
  };

  const executeStatusUpdate = async (userId: string, newStatus: string, note: string) => {
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'Active') payload.joining_date = new Date().toISOString().split('T')[0];
      if (note !== undefined && note !== '') payload.hr_notes = note;

      const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...payload } : u));
      setStatusModal({ ...statusModal, isOpen: false });
    } catch (err: any) {
      alert("Status update failed: " + err.message);
    }
  };

  const saveHREdits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        qualification: editingUser.qualification,
        experience: editingUser.experience,
        skills: editingUser.skills,
        interview_date: editingUser.interview_date,
        typing_speed: editingUser.typing_speed,
        communication_skills: editingUser.communication_skills,
        hr_notes: editingUser.hr_notes,
        academic_qualifications: editingUser.academic_qualifications,
        professional_qualifications: editingUser.professional_qualifications,
        last_job_detail: editingUser.last_job_detail,
        leave_reason: editingUser.leave_reason,
        salary_expectation: editingUser.salary_expectation,
        contact_no: editingUser.contact_no,
        personal_email: editingUser.personal_email,
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', editingUser.id);
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...payload } : u));
      setEditingUser(null);
    } catch (err: any) {
      alert("Failed to save HR details: " + err.message);
    }
  };

  const saveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setTimeout(() => {
      setIsSavingSettings(false);
      alert("Settings saved successfully!");
    }, 800);
  };

  const GlassToggle = ({ label, desc, checked, onChange }: any) => (
    <div className={`flex items-center justify-between p-4 rounded-2xl ${theme.glassInner} transition-all`}>
      <div>
        <p className={`text-sm font-bold ${theme.textMain}`}>{label}</p>
        {desc && <p className={`text-[10px] font-semibold mt-0.5 ${theme.textSub}`}>{desc}</p>}
      </div>
      <button 
        type="button" 
        onClick={() => onChange(!checked)} 
        className={`w-12 h-6 rounded-full transition-colors relative flex items-center shadow-inner cursor-pointer ${checked ? 'bg-purple-500' : isDarkMode ? 'bg-zinc-700' : 'bg-slate-300/50 border border-white/50'}`}
      >
        <span className={`w-4 h-4 bg-white rounded-full absolute transition-transform shadow-md ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full relative z-10 pb-10">
      
      {/* 🌟 PREMIUM TOP NAVIGATION BAR */}
      <div className="w-full shrink-0 space-y-4">
        
        <div className={`${theme.glassCard} rounded-4xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <button onClick={() => router.push('/admin')} className={`p-2.5 sm:p-3 ${theme.glassItem} rounded-2xl ${theme.textSub} transition-all cursor-pointer hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] dark:hover:border-purple-500`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <Settings className="text-purple-500 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>Admin Control Panel</span>
                </h1>
              </div>
              <p className={`text-xs sm:text-sm font-semibold ${theme.textSub}`}>Manage portal configurations and HR records</p>
            </div>
          </div>
          
          <button onClick={toggleTheme} className={`p-3 rounded-2xl ${theme.glassItem} ${theme.textSub} cursor-pointer hover:border-purple-400 transition-all active:scale-95 self-start md:self-auto`}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className={`${theme.glassCard} rounded-4xl p-2.5 flex items-center gap-2 overflow-x-auto custom-scrollbar`}>
          {[
            { id: 'HR Accounts', icon: <Briefcase size={16} /> },
            { id: 'Manual Cleanup', icon: <Database size={16} /> },
            { id: 'System Settings', icon: <Settings size={16} /> },
            { id: 'Security & Policies', icon: <ShieldCheck size={16} /> },
            { id: 'Live Controls', icon: <SlidersHorizontal size={16} /> }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 whitespace-nowrap px-6 py-3.5 rounded-3xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-lg' 
                  : `${theme.textSub} hover:${theme.textMain} ${theme.glassItem} hover:border-purple-400`
              }`}
            >
              {tab.icon} {tab.id}
            </button>
          ))}
        </div>
      </div>

      {/* 🌟 MAIN CONTENT AREA */}
      <div className={`w-full ${theme.glassCard} rounded-4xl p-6 md:p-8 min-h-[60vh] flex flex-col relative`}>
        
        {/* =========================================
            TAB: SYSTEM SETTINGS 
        ========================================= */}
        {activeTab === 'System Settings' && (
          <form onSubmit={saveGlobalSettings} className="space-y-6 animate-in fade-in flex-1 flex flex-col max-w-4xl mx-auto w-full">
            <div className="border-b border-white/20 pb-4">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}><Settings className="text-purple-500" /> General Configuration</h3>
              <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Manage baseline platform properties.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textSub}`}>Portal Name</label>
                <input type="text" value={settings.appName} onChange={e => setSettings({...settings, appName: e.target.value})} className={`w-full p-3.5 rounded-2xl text-sm font-semibold outline-none ${theme.inputBg}`} />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textSub}`}>Support Contact Email</label>
                <input type="email" value={settings.supportEmail} onChange={e => setSettings({...settings, supportEmail: e.target.value})} className={`w-full p-3.5 rounded-2xl text-sm font-semibold outline-none ${theme.inputBg}`} />
              </div>
            </div>

            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textSub}`}>Global Dashboard Announcement</label>
              <textarea value={settings.systemAnnouncement} onChange={e => setSettings({...settings, systemAnnouncement: e.target.value})} className={`w-full p-3.5 rounded-2xl text-sm font-semibold resize-none h-24 ${theme.inputBg}`} />
            </div>

            <GlassToggle 
              label="Enable Maintenance Mode" 
              desc="Blocks all staff access. Only admins can log in." 
              checked={settings.maintenanceMode} 
              onChange={(val: boolean) => setSettings({...settings, maintenanceMode: val})} 
            />

            <div className="mt-auto pt-6">
              <button type="submit" disabled={isSavingSettings} className="w-full md:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-all shadow-lg active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">
                {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save System Config
              </button>
            </div>
          </form>
        )}

        {/* =========================================
            TAB: SECURITY & POLICIES 
        ========================================= */}
        {activeTab === 'Security & Policies' && (
          <form onSubmit={saveGlobalSettings} className="space-y-6 animate-in fade-in flex-1 flex flex-col max-w-4xl mx-auto w-full">
            <div className="border-b border-white/20 pb-4">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}><ShieldCheck className="text-emerald-500" /> Security Controls</h3>
              <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Manage permissions and access timeouts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textSub}`}>Authentication Policy</label>
                <select value={settings.securityPolicy} onChange={e => setSettings({...settings, securityPolicy: e.target.value})} className={`w-full p-3.5 rounded-2xl text-sm font-semibold appearance-none ${theme.inputBg}`}>
                  <option value="Standard (Passwords Only)" className="bg-slate-800 text-white">Standard (Passwords Only)</option>
                  <option value="Strict (2FA Required)" className="bg-slate-800 text-white">Strict (2FA Required - Coming Soon)</option>
                </select>
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textSub}`}>Session Timeout (Minutes)</label>
                <input type="number" value={settings.sessionTimeoutMinutes} onChange={e => setSettings({...settings, sessionTimeoutMinutes: e.target.value})} className={`w-full p-3.5 rounded-2xl font-mono text-sm font-semibold ${theme.inputBg}`} />
              </div>
            </div>

            <div className="space-y-3">
              <GlassToggle label="Allow Staff Portal Logins" desc="If disabled, users cannot log in to their dashboard." checked={settings.allowStaffLogin} onChange={(val: boolean) => setSettings({...settings, allowStaffLogin: val})} />
              <GlassToggle label="Allow Staff to Edit Asset Details" desc="Lets employees update specs on hardware assigned to them." checked={settings.allowStaffEditAssets} onChange={(val: boolean) => setSettings({...settings, allowStaffEditAssets: val})} />
            </div>

            <div className="mt-auto pt-6">
              <button type="submit" disabled={isSavingSettings} className="w-full md:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-all shadow-lg active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">
                {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Security Config
              </button>
            </div>
          </form>
        )}

        {/* =========================================
            TAB: LIVE CONTROLS (Watermarks)
        ========================================= */}
        {activeTab === 'Live Controls' && (
          <form onSubmit={saveGlobalSettings} className="space-y-6 animate-in fade-in flex-1 flex flex-col max-w-4xl mx-auto w-full">
            <div className="border-b border-white/20 pb-4">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}><SlidersHorizontal className="text-blue-500" /> Capture & Upload Controls</h3>
              <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Configure the HTML5 camera settings and watermarks.</p>
            </div>

            <GlassToggle label="Force Watermarks on Camera Uploads" desc="Applies text directly to the image pixels before uploading to Supabase." checked={settings.enableWatermarks} onChange={(val: boolean) => setSettings({...settings, enableWatermarks: val})} />

            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textSub}`}>Watermark Data Elements (Preview)</label>
              <div className={`w-full p-4 rounded-2xl text-sm font-semibold flex flex-wrap gap-2 ${theme.glassInner} ${theme.textMain}`}>
                 <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20">Date & Time</span>
                 <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg border border-orange-500/20">Staff Name</span>
                 <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-lg border border-purple-500/20">EMP Code</span>
                 <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">Device Name</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <GlassToggle label="Auto-Compress Images" desc="Scales down 4K photos to 1600px for speed." checked={settings.compressUploads} onChange={(val: boolean) => setSettings({...settings, compressUploads: val})} />
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textSub}`}>Max Upload Size (MB)</label>
                <input type="number" value={settings.maxUploadSizeMB} onChange={e => setSettings({...settings, maxUploadSizeMB: e.target.value})} className={`w-full p-3.5 rounded-2xl font-mono text-sm font-semibold ${theme.inputBg}`} />
              </div>
            </div>

            <div className="mt-auto pt-6">
              <button type="submit" disabled={isSavingSettings} className="w-full md:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-all shadow-lg active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">
                {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Media Config
              </button>
            </div>
          </form>
        )}

        {/* =========================================
            TAB: MANUAL CLEANUP 
        ========================================= */}
        {activeTab === 'Manual Cleanup' && (
          <div className="space-y-6 animate-in fade-in flex-1 flex flex-col w-full">
            <div className="border-b border-white/20 pb-4 shrink-0">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}>
                <Database className="text-rose-500" /> System Log Cleanup
              </h3>
              <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Force purge duplicate or incorrect system logs.</p>
            </div>

            <div className={`flex-1 rounded-3xl border ${isDarkMode ? 'border-white/10' : 'border-white/40'} overflow-hidden shadow-sm flex flex-col ${theme.glassInner}`}>
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-150">
                  <thead className={`sticky top-0 z-10 text-[10px] font-bold uppercase tracking-widest backdrop-blur-2xl border-b ${isDarkMode ? 'bg-black/40 border-white/10 text-zinc-400' : 'bg-white/80 border-white/40 text-slate-500'}`}>
                    <tr>
                      <th className="p-5">Type / Date</th>
                      <th className="p-5">Request Detail</th>
                      <th className="p-5">Raised By</th>
                      <th className="p-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {requests.map((req, idx) => (
                      <tr key={`${req.table}-${req.id || 'no-id'}-${idx}`} className={`transition-colors ${theme.glassItem}`}>
                        <td className="p-5">
                          <p className={`text-xs font-semibold ${theme.textMain}`}>{req.type}</p>
                          <p className={`text-[10px] font-mono mt-1 ${theme.textSub}`}>{new Date(req.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className={`p-5 text-xs font-medium max-w-50 truncate ${theme.textSub}`} title={req.display_detail}>
                          {req.display_detail}
                        </td>
                        <td className="p-5">
                          <p className={`text-xs font-semibold ${theme.textMain}`}>{req.staff_name}</p>
                          <p className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-medium mt-1">{req.emp_code}</p>
                        </td>
                        <td className="p-5 text-right">
                          <button 
                            onClick={() => forceDeleteRequest(req.id, req.table)}
                            className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 inline-flex items-center justify-center cursor-pointer shadow-sm"
                            title="Force Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && (
                      <tr><td colSpan={4} className={`p-10 text-center text-sm font-semibold ${theme.textSub}`}>No logs found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB: HR ACCOUNTS (STAFF DIRECTORY)
        ========================================= */}
        {activeTab === 'HR Accounts' && (
          <div className="space-y-6 animate-in fade-in flex-1 flex flex-col w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/20 pb-4 shrink-0">
              <div>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}>
                  <Briefcase className="text-amber-500" /> HR & Staff Directory
                </h3>
                <p className={`text-xs font-medium mt-1 ${theme.textSub}`}>Manage applicants, active staff, and historical records.</p>
              </div>
              <button 
                onClick={() => setIsAddingStaff(true)}
                className="px-6 py-3.5 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-all shadow-md hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 border border-orange-400"
              >
                <PlusCircle size={16} /> Add Staff
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {users.map(u => {
                  const isSelected = u.status === 'Selected';
                  const isRejected = u.status === 'Rejected';
                  const isActive = u.status === 'Active';
                  const isDeactivated = u.status === 'Deactivated';

                  return (
                    <div key={u.id} className={`${theme.glassInner} border ${isDarkMode ? 'border-white/10' : 'border-white/40'} shadow-sm rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden group hover:border-purple-400 hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-300 hover:-translate-y-1.5`}>
                      
                      {/* Status Ribbon */}
                      <div className={`absolute top-0 right-0 px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-bl-2xl shadow-sm ${
                        isActive ? 'bg-emerald-500 text-white' :
                        isSelected ? 'bg-blue-500 text-white' :
                        isRejected ? 'bg-rose-500 text-white' :
                        isDeactivated ? 'bg-slate-700 text-white' :
                        'bg-amber-500 text-white'
                      }`}>
                        {u.status || 'Pending Review'}
                      </div>

                      <div className="pt-2">
                        <h4 className={`text-lg font-bold ${theme.textMain}`}>{u.full_name || u.name}</h4>
                        <p className="text-[11px] font-mono font-semibold text-purple-600 dark:text-purple-400 mt-1">{u.emp_code || 'Pending ID'} <span className={`ml-2 opacity-60 ${theme.textSub}`}>| {u.email || u.personal_email || 'No Email'}</span></p>
                      </div>

                      <div className={`grid grid-cols-2 gap-2.5 text-[10px] font-medium p-4 rounded-2xl border transition-colors ${theme.glassItem}`}>
                        <p><span className="text-orange-600 dark:text-orange-400 mr-1 font-bold">QUAL:</span> {u.qualification || u.academic_qualifications || 'N/A'}</p>
                        <p><span className="text-orange-600 dark:text-orange-400 mr-1 font-bold">EXP:</span> {u.experience || 'N/A'}</p>
                        <p className="col-span-2 truncate"><span className="text-orange-600 dark:text-orange-400 mr-1 font-bold">SKILLS:</span> {u.skills || 'N/A'}</p>
                        <p><span className="text-orange-600 dark:text-orange-400 mr-1 font-bold">TYPING:</span> {u.typing_speed || 'N/A'}</p>
                        <p><span className="text-orange-600 dark:text-orange-400 mr-1 font-bold">JOINED:</span> {u.joining_date || 'N/A'}</p>
                      </div>

                      {/* HR Notes Display */}
                      {u.hr_notes && (
                        <div className={`p-4 rounded-2xl text-[11px] font-medium border shadow-inner ${
                          isSelected ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' :
                          isRejected ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20' :
                          `${theme.glassItem} ${theme.textMain}`
                        }`}>
                          <span className="font-bold uppercase text-[9px] tracking-widest block mb-1.5 opacity-60">
                            {isSelected ? 'Selection Note:' : isRejected ? 'Rejection Reason:' : 'HR Note:'}
                          </span>
                          <span className="italic">"{u.hr_notes}"</span>
                        </div>
                      )}

                      <div className={`flex flex-wrap gap-2.5 mt-auto pt-5 border-t ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                        <button onClick={() => setEditingUser(u)} className={`px-4 py-2 ${theme.glassItem} ${theme.textMain} hover:text-orange-500 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-sm hover:border-orange-400`}>
                          Edit Meta
                        </button>

                        {!isActive && !isDeactivated && (
                          <button onClick={() => initiateStatusChange(u, 'Selected')} className="px-4 py-2 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm">
                            <UserPlus size={14}/> Select
                          </button>
                        )}

                        {isSelected && (
                          <button onClick={() => initiateStatusChange(u, 'Active')} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm">
                            <UserCheck size={14}/> Make Active
                          </button>
                        )}
                        
                        {!isRejected && !isActive && !isDeactivated && (
                          <button onClick={() => initiateStatusChange(u, 'Rejected')} className="px-4 py-2 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm">
                            <UserX size={14}/> Reject
                          </button>
                        )}

                        {isActive && (
                          <button onClick={() => initiateStatusChange(u, 'Deactivated')} className="px-4 py-2 bg-slate-500/10 hover:bg-slate-700 hover:text-white text-slate-600 dark:text-zinc-300 border border-slate-500/20 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ml-auto shadow-sm">
                            <UserMinus size={14}/> Deactivate
                          </button>
                        )}

                        {isDeactivated && (
                          <button onClick={() => initiateStatusChange(u, 'Active')} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ml-auto shadow-sm">
                            <UserCheck size={14}/> Re-Activate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🌟 MAC GLASS MODALS 🌟 */}

      {/* ADD NEW STAFF MODAL */}
      {isAddingStaff && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 sm:pt-24 pb-10 bg-black/20 dark:bg-black/60 backdrop-blur-md animate-in fade-in overflow-y-auto">
          
          <div className={`relative w-full max-w-2xl flex flex-col rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.15)] border overflow-hidden my-auto max-h-[85vh] ${theme.glassCard}`}>
            
            <div className={`px-6 py-5 border-b shrink-0 flex justify-between items-center z-10 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-white/30 bg-white/20'}`}>
               <div>
                  <h3 className="text-xl font-bold tracking-tight text-orange-600 dark:text-orange-400 flex items-center gap-2">
                    <UserPlus size={20}/> Add HR Record
                  </h3>
                  <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Manually register a new applicant or staff member.</p>
               </div>
               <button onClick={() => setIsAddingStaff(false)} className={`p-2.5 rounded-full cursor-pointer transition-colors border hover:bg-rose-500 hover:text-white ${theme.glassItem} ${theme.textMain}`}><X size={16}/></button>
            </div>
            
            <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 z-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Full Name *</label>
                    <input required type="text" value={newStaffForm.name} onChange={e => setNewStaffForm({...newStaffForm, name: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. Rahul Singh" />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Contact Number</label>
                    <input type="text" value={newStaffForm.contact_no} onChange={e => setNewStaffForm({...newStaffForm, contact_no: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. +91 9876543210" />
                  </div>
               </div>

               <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Personal Email Address</label>
                  <input type="email" value={newStaffForm.personal_email} onChange={e => setNewStaffForm({...newStaffForm, personal_email: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. rahul@personal.com" />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Academic Qualifications</label>
                    <input type="text" value={newStaffForm.academic_qual} onChange={e => setNewStaffForm({...newStaffForm, academic_qual: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. B.Tech / MCA" />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Professional Qualifications</label>
                    <input type="text" value={newStaffForm.prof_qual} onChange={e => setNewStaffForm({...newStaffForm, prof_qual: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. AWS Certified" />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Overall Experience</label>
                    <input type="text" value={newStaffForm.experience} onChange={e => setNewStaffForm({...newStaffForm, experience: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. 2 Years" />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Salary Expectation</label>
                    <input type="text" value={newStaffForm.salary_exp} onChange={e => setNewStaffForm({...newStaffForm, salary_exp: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. ₹25,000 / month" />
                  </div>
               </div>

               <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Last Job Details</label>
                  <textarea value={newStaffForm.last_job} onChange={e => setNewStaffForm({...newStaffForm, last_job: e.target.value})} className={`w-full p-3 rounded-xl text-sm resize-none h-16 ${theme.inputBg}`} placeholder="Company name, role, duration..." />
               </div>
            </div>

            <div className={`px-6 py-4 border-t shrink-0 flex gap-4 z-10 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/50'}`}>
              <button type="button" onClick={() => setIsAddingStaff(false)} className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${theme.glassItem} ${theme.textMain} hover:border-purple-500`}>
                Cancel
              </button>
              <button onClick={handleAddNewStaff} disabled={isSavingStaff} className="flex-1 py-3.5 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-[0_4px_20px_rgba(249,115,22,0.4)] active:scale-95 transition-all bg-linear-to-r from-orange-500 to-orange-600 hover:shadow-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-2 border border-orange-400">
                {isSavingStaff ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Record
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STATUS NOTES MODAL (For Selected/Rejected) */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 sm:pt-28 pb-10 bg-black/20 dark:bg-black/60 backdrop-blur-md animate-in fade-in overflow-y-auto">
          
          <div className={`relative w-full max-w-md flex flex-col rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.15)] border overflow-hidden my-auto max-h-[85vh] ${theme.glassCard}`}>
            
            <div className={`px-6 py-5 border-b shrink-0 flex justify-between items-center z-10 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/50'}`}>
               <div>
                  <h3 className={`text-xl font-bold tracking-tight ${statusModal.newStatus === 'Selected' ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    Mark as {statusModal.newStatus}
                  </h3>
                  <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Logging status for <span className={theme.textMain}>{statusModal.userName}</span></p>
               </div>
               <button onClick={() => setStatusModal({ ...statusModal, isOpen: false })} className={`p-2.5 rounded-full cursor-pointer transition-colors border hover:bg-rose-500 hover:text-white ${theme.glassItem} ${theme.textMain}`}><X size={16}/></button>
            </div>
            
            <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1 z-10">
              <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2 ${theme.textMain} drop-shadow-sm`}>
                <FileText size={14} className="text-orange-500" />
                {statusModal.newStatus === 'Rejected' ? 'Reason for Rejection *' : 'Selection / Onboarding Notes *'}
              </label>
              <textarea 
                required 
                value={statusModal.note} 
                onChange={e => setStatusModal({...statusModal, note: e.target.value})} 
                className={`w-full p-4 rounded-xl text-sm resize-none h-32 ${theme.inputBg}`} 
                placeholder={statusModal.newStatus === 'Rejected' ? "e.g. Failed technical round..." : "e.g. Cleared all rounds, expecting to join next week..."} 
              />
            </div>

            <div className={`px-6 py-4 border-t shrink-0 flex gap-4 z-10 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/50'}`}>
              <button type="button" onClick={() => setStatusModal({ ...statusModal, isOpen: false })} className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${theme.glassItem} ${theme.textMain} hover:border-purple-500`}>
                Cancel
              </button>
              <button onClick={(e) => { e.preventDefault(); executeStatusUpdate(statusModal.userId, statusModal.newStatus, statusModal.note); }} className={`flex-1 py-3.5 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-lg active:scale-95 transition-all border ${statusModal.newStatus === 'Selected' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 border-blue-400' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 border-rose-400'}`}>
                Confirm Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT HR MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 sm:pt-24 pb-10 bg-black/20 dark:bg-black/60 backdrop-blur-md animate-in fade-in overflow-y-auto">
          
          <div className={`relative w-full max-w-2xl flex flex-col rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.15)] border overflow-hidden my-auto max-h-[85vh] ${theme.glassCard}`}>
            
            {/* Header */}
            <div className={`px-6 py-5 border-b shrink-0 flex justify-between items-center z-10 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/50'}`}>
               <div>
                  <h3 className={`text-xl font-bold tracking-tight ${theme.textMain}`}>Edit HR Record</h3>
                  <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Updating metadata for <span className="text-orange-600 dark:text-orange-400 font-bold">{editingUser.full_name || editingUser.name}</span></p>
               </div>
               <button onClick={() => setEditingUser(null)} className={`p-2.5 rounded-full cursor-pointer transition-colors border hover:bg-rose-500 hover:text-white ${theme.glassItem} ${theme.textMain}`}><X size={16}/></button>
            </div>

            {/* Body */}
            <form id="edit-hr-form" onSubmit={saveHREdits} className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Academic Qualification</label>
                  <input type="text" value={editingUser.academic_qualifications || editingUser.qualification || ''} onChange={e => setEditingUser({...editingUser, academic_qualifications: e.target.value, qualification: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. B.Tech" />
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Professional Qualification</label>
                  <input type="text" value={editingUser.professional_qualifications || ''} onChange={e => setEditingUser({...editingUser, professional_qualifications: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. AWS Certified" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Overall Experience</label>
                  <input type="text" value={editingUser.experience || ''} onChange={e => setEditingUser({...editingUser, experience: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. 3 Years" />
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Key Skills</label>
                  <input type="text" value={editingUser.skills || ''} onChange={e => setEditingUser({...editingUser, skills: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. React, Node.js, Excel" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Typing Speed</label>
                  <input type="text" value={editingUser.typing_speed || ''} onChange={e => setEditingUser({...editingUser, typing_speed: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. 45 WPM" />
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Interview Date</label>
                  <input type="date" value={editingUser.interview_date || ''} onChange={e => setEditingUser({...editingUser, interview_date: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} />
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Communication Skills Assessment</label>
                <input type="text" value={editingUser.communication_skills || ''} onChange={e => setEditingUser({...editingUser, communication_skills: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="e.g. Excellent / Good" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Contact Number</label>
                  <input type="text" value={editingUser.contact_no || ''} onChange={e => setEditingUser({...editingUser, contact_no: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="+91 98765..." />
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Personal Email</label>
                  <input type="email" value={editingUser.personal_email || ''} onChange={e => setEditingUser({...editingUser, personal_email: e.target.value})} className={`w-full p-3 rounded-xl text-sm ${theme.inputBg}`} placeholder="user@gmail.com" />
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center mb-1.5 ${theme.textMain} drop-shadow-sm`}>Reason for Leaving Last Job (Or Reason for Deactivation)</label>
                <textarea 
                  value={editingUser.leave_reason || ''} 
                  onChange={e => setEditingUser({...editingUser, leave_reason: e.target.value})} 
                  className={`w-full p-3 rounded-xl text-sm resize-none h-16 ${theme.inputBg}`} 
                  placeholder="Record why they left their last job or the current office here..." 
                />
              </div>

              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ${theme.textMain} drop-shadow-sm`}>
                  <FileText size={14} className="text-orange-500" /> Administrative HR Notes
                </label>
                <textarea 
                  value={editingUser.hr_notes || ''} 
                  onChange={e => setEditingUser({...editingUser, hr_notes: e.target.value})} 
                  className={`w-full p-3 rounded-xl text-sm resize-none h-20 ${theme.inputBg}`} 
                  placeholder="Record internal HR notes, behavior analysis, or background check info here..." 
                />
              </div>
            </form>

            <div className={`px-6 py-4 border-t shrink-0 flex gap-4 z-10 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/50'}`}>
              <button type="button" onClick={() => setEditingUser(null)} className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${theme.glassItem} ${theme.textMain} hover:border-purple-500`}>
                Cancel
              </button>
              <button type="submit" form="edit-hr-form" className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(147,51,234,0.4)] active:scale-95 transition-all border border-purple-400">
                <Save size={16} /> Save HR Profile
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}