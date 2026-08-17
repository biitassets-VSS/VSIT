'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Search, Users, Mail, Hash, UserCheck, 
  PlusCircle, Upload, Download, FileSpreadsheet, 
  X, RefreshCw, Save, Building, Power, Edit2, 
  Package, CalendarDays, Lock, KeyRound, ShieldCheck, Trash2,
  Loader2, ChevronDown
} from 'lucide-react';
import { setupStaffAuth } from './actions';

// ==========================================
// 🌟 PREMIUM CUSTOM GLASS DROPDOWN 
// ==========================================
const PremiumGlassDropdown = ({ value, onChange, options, theme, isDarkMode, className = "px-3 py-3" }: any) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o:any) => o.value === value)?.label || value;

  return (
    <div className={`relative w-full ${open ? 'z-100' : 'z-10'}`} ref={wrapperRef}>
      <div 
        onClick={() => setOpen(!open)} 
        className={`flex items-center justify-between w-full ${className} ${theme.inputBg} rounded-xl transition-all shadow-sm cursor-pointer border ${
          open ? 'border-orange-500 ring-2 ring-orange-500/20' : isDarkMode ? 'border-white/20' : 'border-white/60'
        }`}
      >
        <span className={`text-sm font-semibold truncate pr-4 ${theme.textMain}`}>{selectedLabel}</span>
        <ChevronDown size={16} className={`${theme.textSub} shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className={`absolute top-full left-0 mt-1 w-full min-w-48 p-1.5 rounded-xl shadow-2xl backdrop-blur-3xl border ${
          isDarkMode ? 'bg-zinc-900/95 border-zinc-700/80 shadow-black' : 'bg-white/95 border-white/90 shadow-slate-300/50'
        } overflow-hidden`}>
          <div className="max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
            {options.map((opt:any) => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`px-3 py-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-all flex items-center gap-2 ${
                  value === opt.value
                    ? 'bg-linear-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : (isDarkMode ? 'text-zinc-200 hover:bg-zinc-800/90' : 'text-slate-800 hover:bg-slate-100')
                }`}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function AdminStaffDirectoryContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Modals
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({
    id: '', full_name: '', email: '', password: '', emp_code: '', 
    role: 'Staff', department: 'Migration', phone: '', 
    dob: '', joining_date: '', status: 'Active'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Importer State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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

    fetchStaff();
    return () => {
      window.removeEventListener('storage', checkTheme);
      observer.disconnect();
    };
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      const { data: assetData } = await supabase.from('assets').select('assigned_to');

      if (profileData) {
        const enhancedStaff = profileData.map(user => {
          const assetCount = (assetData || []).filter(a => a.assigned_to === user.id || a.assigned_to === user.email).length;
          return { ...user, assetCount };
        });
        setStaff(enhancedStaff);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const generateSafeUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ id: '', full_name: '', email: '', password: '', emp_code: '', role: 'Staff', department: 'Migration', phone: '', dob: '', joining_date: '', status: 'Active' });
    setIsDossierModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setIsEditing(true);
    setFormData({
      id: user.id, full_name: user.full_name || user.name || '', email: user.email || '',
      password: user.password || '', emp_code: user.emp_code || '', role: user.role || 'Staff', 
      department: user.department || 'Migration', phone: user.phone || '', dob: user.dob || '', 
      joining_date: user.joining_date || '', status: user.status || 'Active'
    });
    setIsDossierModalOpen(true);
  };

  const handleManualAuthSync = async (user: any) => {
    const password = prompt(`Enter a custom password for ${user.full_name || user.email} to fix their login access:`, "vss@123456");
    if (!password) return;

    const cleanEmail = user.email.toLowerCase().trim();

    try {
      setLoading(true);
      const res = await setupStaffAuth(cleanEmail, password, user.full_name);
      if (res.success) {
        await supabase.from('profiles').update({ password: password }).eq('email', cleanEmail);
        alert(`🎉 Credentials Overwritten!\n\n${cleanEmail} can now enter the dashboard using password: ${password}`);
        fetchStaff();
      } else {
        alert(`❌ Credentials Sync Error: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Sync Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) return alert("Name and Email required.");

    setIsSaving(true);
    try {
      const cleanEmail = formData.email.toLowerCase().trim();
      const payload: any = {
        full_name: formData.full_name,
        email: cleanEmail,
        emp_code: formData.emp_code.toUpperCase().trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        role: formData.role || 'Staff',
        department: formData.department || 'Migration',
        phone: formData.phone || null,
        dob: formData.dob || null,
        joining_date: formData.joining_date || null,
        status: formData.status
      };

      let targetPassword = formData.password?.trim();
      if (!targetPassword && !isEditing) targetPassword = 'vsit1234';

      if (targetPassword) {
        const authResult = await setupStaffAuth(cleanEmail, targetPassword, payload.full_name);
        if (!authResult.success) throw new Error(`Failed to create login credentials: ${authResult.error}`);
        payload.password = targetPassword; 
      }

      const { error } = await supabase.from('profiles').upsert(
        { ...payload, id: isEditing ? formData.id : generateSafeUuid() }, 
        { onConflict: 'email' }
      );

      if (error) throw error;
      if (!isEditing) alert(`Employee profile successfully saved and activated with password: ${targetPassword}`);

      setIsDossierModalOpen(false); fetchStaff();
    } catch (err: any) { alert(`Save Failed: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleDeleteStaff = async () => {
    if (!window.confirm(`CRITICAL WARNING:\n\nAre you absolutely sure you want to permanently delete the account for ${formData.full_name}? This will remove all their system access. If they have assigned hardware, you should reassign it to 'Unassigned' first.`)) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', formData.id);
      if (error) throw error;
      
      alert(`Account for ${formData.full_name} has been securely purged from the directory.`);
      setIsDossierModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      alert(`Deletion Failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'Active' ? 'Disabled' : 'Active';
    if (!window.confirm(`Are you sure you want to change ${user.full_name}'s network access to ${newStatus}?`)) return;

    try {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('email', user.email.toLowerCase().trim());
      if (error) throw error;
      setStaff(prev => prev.map(s => s.email?.toLowerCase().trim() === user.email?.toLowerCase().trim() ? { ...s, status: newStatus } : s));
    } catch (err: any) { alert(`Status Update Failed: ${err.message}`); }
  };

  const parseCsvRow = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { result.push(current); current = ''; } 
      else current += char;
    }
    result.push(current);
    return result.map(s => s.trim().replace(/^"|"$/g, ''));
  };

  const downloadStaffCsvTemplate = () => {
    const headers = "FullName,Email,Password,EmpCode,AccessRole,Department,Phone,DOB,JoiningDate\n";
    const sample = "Alexander Vance,a.vance@company.com,SecurePass123!,,Admin,Accounts,+1-555-0192,1990-05-15,2024-01-10\nSamantha Traylor,s.traylor@company.com,Warehouse99!,,Staff,Migration,,1995-10-22,2025-06-01";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'VS_Staff_Batch_Template.csv'; a.click();
  };

  const executeStaffBulkImport = async () => {
    if (!bulkFile) return alert("Please select a CSV file.");
    setIsImporting(true);

    try {
      const text = await bulkFile.text();
      const cleanText = text.replace(/^\uFEFF/, '');
      const lines = cleanText.split(/\r\n|\n|\r/).filter(line => line.replace(/,/g, '').trim().length > 0);
      
      if (lines.length < 2) throw new Error("CSV file contains headers but zero data rows.");

      const { data: existingProfiles, error: fetchErr } = await supabase.from('profiles').select('*');
      if (fetchErr) throw fetchErr;

      const profileDbMap = new Map();
      (existingProfiles || []).forEach(p => {
        if (p.email) profileDbMap.set(p.email.toLowerCase().trim(), p);
      });

      const rawHeaders = parseCsvRow(lines[0]).map(h => h.replace(/[^a-z0-9]/gi, '').toLowerCase());
      
      const newHiresToInsert: any[] = [];
      const existingToPatch: any[] = [];
      let patchedCount = 0;

      const formatSafeDate = (dStr: string) => {
        if (!dStr) return null;
        const clean = dStr.trim();
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(clean)) {
          const parts = clean.split(/[\/\-]/);
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return clean; 
      };

      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvRow(lines[i]);
        const col: Record<string, string> = {};
        rawHeaders.forEach((h, idx) => { col[h] = row[idx] || ''; });

        const name = col['fullname'] || col['name'] || col['full_name'] || '';
        const rawEmail = col['email'] || col['emailaddress'] || col['e-mail'] || '';
        const cleanEmail = rawEmail.toLowerCase().trim();

        if (!cleanEmail || !name) continue; 

        const pass = col['password'] || col['pass'] || '';
        const targetPassword = pass || 'vsit1234';
        const rawCode = col['empcode'] || col['emp_code'] || col['id'] || '';
        const empCode = rawCode ? rawCode.toUpperCase() : `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

        const authResult = await setupStaffAuth(cleanEmail, targetPassword, name);
        if (!authResult.success) {
          throw new Error(`Authentication Engine error at line ${i + 1} (${cleanEmail}):\n\nReason: ${authResult.error || 'Password formatting error'}\n\nOperation aborted.`);
        }

        const existingDbUser = profileDbMap.get(cleanEmail);

        if (existingDbUser) {
          const patchPayload: any = { id: existingDbUser.id, email: existingDbUser.email };
          
          if (name) patchPayload.full_name = name;
          patchPayload.password = targetPassword; 
          if (rawCode) patchPayload.emp_code = rawCode.toUpperCase();
          
          const role = col['accessrole'] || col['role'] || col['access'];
          if (role) patchPayload.role = role;
          
          const dept = col['department'] || col['dept'];
          if (dept) patchPayload.department = dept;
          
          const phone = col['phone'] || col['mobile'];
          if (phone) patchPayload.phone = phone;
          
          const dobRaw = col['dob'] || col['dateofbirth'];
          if (dobRaw) patchPayload.dob = formatSafeDate(dobRaw);
          
          const joinRaw = col['joiningdate'] || col['joining_date'];
          if (joinRaw) patchPayload.joining_date = formatSafeDate(joinRaw);

          existingToPatch.push(patchPayload);
          patchedCount++;
        } else {
          newHiresToInsert.push({
            id: generateSafeUuid(),
            full_name: name,
            email: cleanEmail,
            password: targetPassword, 
            emp_code: empCode,
            role: col['accessrole'] || col['role'] || col['access'] || 'Staff',
            department: col['department'] || col['dept'] || 'Migration',
            phone: col['phone'] || col['mobile'] || null,
            dob: formatSafeDate(col['dob'] || col['dateofbirth']), 
            joining_date: formatSafeDate(col['joiningdate'] || col['joining_date']), 
            status: 'Active',
            created_at: new Date().toISOString()
          });
          profileDbMap.set(cleanEmail, { id: 'temp', email: cleanEmail }); 
        }
      }

      if (newHiresToInsert.length > 0) {
        const { error: err1 } = await supabase.from('profiles').insert(newHiresToInsert);
        if (err1) throw err1;
      }

      if (existingToPatch.length > 0) {
        const { error: err2 } = await supabase.from('profiles').upsert(existingToPatch, { onConflict: 'id' });
        if (err2) throw err2;
      }

      alert(`🎉 BATCH FINISHED!\n\n• Created/Synced Auth for ${newHiresToInsert.length} new staff profiles.\n• Successfully patched missing fields for ${patchedCount} existing employees.`);
      setIsBulkModalOpen(false); setBulkFile(null); fetchStaff();

    } catch (err: any) { alert(`❌ BATCH ABORTED:\n\n${err.message}`); } finally { setIsImporting(false); }
  };

  const filteredStaff = staff.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) ||
           s.emp_code?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
  });

  // 🌟 EXACT PREMIUM 2026 FROSTED GLASS THEME (Perfect Contrast & Blur)
  const theme = {
    bg: 'bg-transparent font-sans',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-800',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-600',
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-[40px] border border-white/50 shadow-[0_16px_40px_rgba(31,38,135,0.05)]',
    glassInnerCard: isDarkMode 
      ? 'bg-black/20 backdrop-blur-xl border border-white/10 shadow-sm' 
      : 'bg-white/20 backdrop-blur-md border border-white/40 shadow-sm',
    glassItem: isDarkMode
      ? 'bg-black/20 backdrop-blur-2xl border border-white/10 transition-all duration-300'
      : 'bg-white/50 backdrop-blur-2xl border border-white/60 transition-all duration-300',
    inputBg: isDarkMode 
      ? 'bg-black/40 border border-white/20 text-white shadow-inner focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 placeholder-zinc-500' 
      : 'bg-white/60 border border-white/60 shadow-sm text-slate-800 focus:bg-white/90 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder-slate-400',
  };

  return (
    <div className={`min-h-screen ${theme.bg} relative overflow-x-hidden antialiased pb-12 transition-colors duration-1000`}>
      {/* 🌟 GLOBAL BACKGROUND ORBS */}
      <div className="fixed top-[-5%] left-[-5%] w-[45vw] h-[45vh] bg-orange-500/20 dark:bg-orange-600/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[45vw] h-[45vh] bg-purple-500/20 dark:bg-purple-700/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 mx-auto space-y-6 pt-6 relative z-10">
        
        {/* COMPACT HEADER */}
        <div className={`${theme.glassCard} rounded-4xl p-4 sm:p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 transition-all duration-300`}>
          <div className="flex items-center gap-3.5 sm:gap-4">
            <button onClick={() => router.push('/admin')} className={`p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer ${theme.glassItem} hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 ${theme.textSub}`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <Users className="text-orange-500 dark:text-orange-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>Staff Directory</span>
                </h1>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                  {staff.length} Active Profiles
                </span>
              </div>
              <p className={`text-xs font-semibold ${theme.textSub}`}>Manage employee records, passwords, and system access levels</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsBulkModalOpen(true)} 
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border transition-all duration-200 text-[11px] font-bold uppercase tracking-wider cursor-pointer ${theme.glassItem} hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 ${theme.textMain}`}
            >
              <FileSpreadsheet size={14} className="text-orange-500" /> <span>Bulk Upload</span>
            </button>
            <button 
              onClick={handleOpenAdd} 
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-[0_4px_15px_rgba(249,115,22,0.4)] transition-all duration-200 cursor-pointer border border-orange-400"
            >
              <PlusCircle size={14} /> <span>New Hire</span>
            </button>
          </div>
        </div>

        {/* 100% Adaptive Search Bar */}
        <div className={`p-1.5 ${theme.inputBg} rounded-xl transition-all border flex items-center`}>
          <div className="relative w-full">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by staff name, email, EMP code, or department..." 
              className={`w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm font-semibold outline-none bg-transparent ${theme.textMain} placeholder:text-slate-500 dark:placeholder:text-zinc-400 border-0 shadow-none`}
            />
          </div>
        </div>

        {/* 🌟 STAFF DIRECTORY GRID */}
        {loading ? (
          <div className={`${theme.glassCard} rounded-3xl w-full py-24 flex flex-col items-center justify-center gap-3`}>
            <Loader2 size={32} className="animate-spin text-orange-500" />
            <span className={`text-[11px] font-bold tracking-widest uppercase ${theme.textMain}`}>Loading Directory...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className={`${theme.glassCard} rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-3`}>
            <Users size={48} className={`mx-auto opacity-60 text-orange-500`} />
            <h3 className={`text-lg font-bold uppercase tracking-widest ${theme.textMain}`}>No Staff Found</h3>
            <p className={`text-[11px] font-medium max-w-sm ${theme.textSub}`}>No matching employee records exist in the current view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStaff.map(user => {
              const isActive = user.status === 'Active';
              const isAdmin = user.role?.toLowerCase() === 'admin';

              return (
                <div 
                  key={user.id} 
                  className={`rounded-3xl border flex flex-col justify-between group transition-all duration-300 overflow-hidden ${
                    isActive ? `${theme.glassItem} hover:-translate-y-1 hover:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 dark:hover:shadow-[0_0_20px_rgba(249,115,22,0.6)]` : `${theme.glassInnerCard} opacity-60 grayscale`
                  }`}
                >
                  <div className={`p-4 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                          isActive 
                            ? (isAdmin 
                                ? (isDarkMode ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-800 border border-purple-200') 
                                : (isDarkMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-200')) 
                            : (isDarkMode ? 'bg-zinc-800 text-zinc-500 border border-zinc-700' : 'bg-slate-200 text-slate-500 border border-slate-300')
                        }`}>
                          <span className="relative z-10">{user.full_name?.charAt(0) || <UserCheck size={16} />}</span>
                        </div>

                        <div className="overflow-hidden min-w-0">
                          <button 
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className={`text-sm font-bold text-left leading-tight truncate w-full cursor-pointer transition-colors ${isActive ? theme.textMain + ' group-hover:text-orange-500 dark:group-hover:text-orange-400 hover:underline' : theme.textSub}`}
                          >
                            {user.full_name || 'Unnamed Employee'}
                          </button>
                          <div className={`flex items-center gap-1.5 text-[10px] font-semibold mt-1 ${theme.textSub}`}>
                            <Building size={10} className={isActive ? (isDarkMode ? "text-orange-400" : "text-orange-500") : ""} />
                            <span className="truncate">{user.department || 'Migration'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => handleOpenEdit(user)} 
                        className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${theme.glassInnerCard} ${theme.textMain} hover:text-orange-500 hover:scale-110 active:scale-95 shrink-0`}
                        title="Edit Employee Dossier"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className={`p-4 space-y-2 flex-1 ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                    <div className={`flex justify-between items-center p-2.5 rounded-xl transition-colors duration-200 ${theme.glassInnerCard}`}>
                      <div className={`flex items-center gap-1.5 ${theme.textSub}`}>
                        <Hash size={12} className={isDarkMode ? "text-orange-400" : "text-orange-500"} />
                        <span className="font-bold text-[9px] uppercase tracking-widest">EMP CODE</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold tracking-wider text-[11px] ${theme.textMain}`}>{user.emp_code || 'NO-EMP-CODE'}</span>
                        <span className={`text-[8px] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest shadow-xs ${
                          isAdmin 
                            ? (isDarkMode ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-800 border border-purple-200') 
                            : (isDarkMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-100 text-orange-800 border border-orange-200')
                        }`}>
                          {user.role || 'Staff'}
                        </span>
                      </div>
                    </div>

                    <div className={`flex justify-between items-center p-2.5 rounded-xl transition-colors duration-200 ${theme.glassInnerCard}`}>
                      <div className={`flex items-center gap-1.5 ${theme.textSub}`}>
                        <Mail size={12} className="text-purple-500 dark:text-purple-400" />
                        <span className="font-bold text-[9px] uppercase tracking-widest">Email</span>
                      </div>
                      <span className={`font-semibold text-[10px] truncate max-w-36 ${theme.textMain}`} title={user.email}>{user.email}</span>
                    </div>

                    <div className={`flex justify-between items-center p-2.5 rounded-xl transition-colors duration-200 ${theme.glassInnerCard}`}>
                      <div className={`flex items-center gap-1.5 ${theme.textSub}`}>
                        <KeyRound size={12} className={isDarkMode ? "text-orange-400" : "text-orange-500"}/>
                        <span className="font-bold text-[9px] uppercase tracking-widest">Login Auth</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleManualAuthSync(user)}
                        className={`px-2.5 py-1 rounded-md border font-bold text-[8px] uppercase tracking-widest transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-600 hover:text-white' : 'bg-orange-50 hover:bg-orange-600 border-orange-200 hover:border-transparent text-orange-700 hover:text-white'}`}
                      >
                        Overwrite Pass
                      </button>
                    </div>
                  </div>

                  <div className={`p-4 border-t flex items-center justify-between ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                    <div className="flex items-center gap-1.5">
                      <Package size={12} className={theme.textSub} />
                      <div className="flex flex-col">
                        <span className={`text-[7px] font-bold uppercase tracking-widest ${theme.textSub}`}>Asset Load</span>
                        <span className={`text-[9px] font-bold tracking-wider uppercase ${user.assetCount > 0 ? (isDarkMode ? 'text-orange-400' : 'text-orange-500') : theme.textSub}`}>
                          {user.assetCount} Assigned
                        </span>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleToggleStatus(user)}
                      className={`px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border shadow-xs ${
                        isActive 
                          ? (isDarkMode ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200') 
                          : (isDarkMode ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200')
                      }`}
                    >
                      <Power size={10} /> {isActive ? 'Access Active' : 'Access Disabled'}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* 🌟 HR DOSSIER MODAL (FROSTED GLASS) WITH FIXED TOP MARGIN */}
        {isDossierModalOpen && (
          <div className={`fixed inset-0 flex flex-col items-center justify-start pt-16 sm:pt-24 pb-8 px-4 z-100 overflow-y-auto animate-in fade-in duration-200 ${isDarkMode ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/30 backdrop-blur-md'}`}>
            <div className={`relative max-w-3xl w-full flex flex-col shrink-0 overflow-hidden shadow-2xl border rounded-3xl animate-in zoom-in-95 duration-200 ${theme.glassCard}`}>
              
              {/* MODAL HEADER */}
              <div className={`p-4 sm:p-5 border-b flex flex-wrap gap-4 justify-between items-start sm:items-center shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-white/40 bg-white/30'}`}>
                <div>
                  <h3 className={`text-sm sm:text-base font-bold uppercase tracking-widest flex items-center gap-2 ${theme.textMain}`}>
                    {isEditing ? <Edit2 size={16} className="text-orange-500"/> : <UserCheck size={16} className="text-orange-500"/>} 
                    {isEditing ? 'Edit Employee Dossier' : 'Register New Employee'}
                  </h3>
                  {isEditing && <p className={`text-[9px] font-semibold mt-1 tracking-widest ${theme.textSub}`}>ID: {formData.id}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={handleDeleteStaff} 
                      disabled={isDeleting}
                      className={`px-3.5 py-1.5 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 shadow-xs ${isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white' : 'border-rose-300 bg-rose-50/50 text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500'}`}
                    >
                      <Trash2 size={12} /> {isDeleting ? 'Deleting...' : 'Delete Staff'}
                    </button>
                  )}
                  <button onClick={() => setIsDossierModalOpen(false)} className={`p-2 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-90 ${theme.glassInnerCard} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-500`}><X size={16}/></button>
                </div>
              </div>

              {/* MODAL BODY (SCROLLABLE FORM WITH ISOLATED Z-INDEXES) */}
              <form onSubmit={handleSaveDossier} className="flex flex-col relative w-full">
                <div className="p-4 sm:p-6 space-y-6 pb-40">
                  
                  {/* SECTION 1: Identity & Credentials */}
                  <div className={`relative z-70 p-5 ${theme.glassInnerCard} rounded-2xl border ${isDarkMode ? 'border-white/5' : 'border-white/40'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="text-orange-500" size={16}/>
                      <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMain}`}>1. Identity & Credentials</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Full Legal Name *</label>
                        <input 
                          type="text" required placeholder="e.g. Marcus Vance" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} 
                          className={`w-full p-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`} 
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Company Email *</label>
                        <input 
                          type="email" required placeholder="m.vance@company.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
                          className={`w-full p-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Employee Code</label>
                        <input 
                          type="text" placeholder="EMP-xxxx" value={formData.emp_code} onChange={e => setFormData({...formData, emp_code: e.target.value})} 
                          className={`w-full p-3 rounded-xl text-sm font-semibold uppercase outline-none transition-all border ${theme.inputBg}`} 
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Contact Phone</label>
                        <input 
                          type="text" placeholder="+1 (555) 019-2834" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} 
                          className={`w-full p-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`} 
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 mb-1.5 ${theme.textSub}`}><Lock size={10} className="text-orange-500"/> Login Password *</label>
                        <input 
                          type="text" required={!isEditing} placeholder={isEditing ? "Type to overwrite password" : "e.g. SecurePass#2026"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
                          className={`w-full p-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: HR & Organization (Higher Z-Index than Section 3) */}
                  <div className={`relative z-60 p-5 ${theme.glassInnerCard} rounded-2xl border ${isDarkMode ? 'border-white/5' : 'border-white/40'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Building className="text-orange-500" size={16}/>
                      <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMain}`}>2. HR Organization & Dates</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Department</label>
                        <PremiumGlassDropdown 
                          value={formData.department} 
                          onChange={(val: string) => setFormData({...formData, department: val})} 
                          options={[
                            {value: 'Migration', label: 'Migration'},
                            {value: 'Calling Team', label: 'Calling Team'},
                            {value: 'DOE', label: 'DOE'},
                            {value: 'Accounts', label: 'Accounts'},
                            {value: 'Education', label: 'Education'},
                            {value: 'Social Media', label: 'Social Media'},
                            {value: 'Administration', label: 'Administration'}
                          ]} 
                          theme={theme} 
                          isDarkMode={isDarkMode}
                          className="py-3 px-3"
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ${theme.textSub}`}><CalendarDays size={10} className="text-orange-500"/> Date of Birth</label>
                        <input 
                          type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} 
                          className={`w-full p-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`} 
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ${theme.textSub}`}><CalendarDays size={10} className="text-orange-500"/> Joining Date</label>
                        <input 
                          type="date" value={formData.joining_date} onChange={e => setFormData({...formData, joining_date: e.target.value})} 
                          className={`w-full p-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: System Access (Lower Z-Index than Section 2, Higher than Footer) */}
                  <div className={`relative z-50 p-5 ${theme.glassInnerCard} rounded-2xl border ${isDarkMode ? 'border-white/5' : 'border-white/40'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Power className="text-orange-500" size={16}/>
                      <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMain}`}>3. System Access & Roles</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>System Access Level</label>
                        <PremiumGlassDropdown 
                          value={formData.role} 
                          onChange={(val: string) => setFormData({...formData, role: val})} 
                          options={[
                            {value: 'Staff', label: '🟢 Staff Access'},
                            {value: 'Admin', label: '🟣 Admin Access'}
                          ]} 
                          theme={theme} 
                          isDarkMode={isDarkMode}
                          className="py-3 px-3"
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Employee Account State</label>
                        <PremiumGlassDropdown 
                          value={formData.status} 
                          onChange={(val: string) => setFormData({...formData, status: val})} 
                          options={[
                            {value: 'Active', label: '🟢 Active'},
                            {value: 'Disabled', label: '🔴 Disabled'}
                          ]} 
                          theme={theme} 
                          isDarkMode={isDarkMode}
                          className="py-3 px-3"
                        />
                      </div>
                    </div>
                  </div>

                </div>
                
                {/* MODAL FOOTER (Lowest Modal Z-Index so dropdowns pop over it) */}
                <div className={`relative z-5 p-4 sm:p-5 border-t flex gap-3 shrink-0 backdrop-blur-xl ${isDarkMode ? 'border-white/10 bg-zinc-900/60' : 'border-white/40 bg-white/60'}`}>
                  <button type="button" onClick={() => setIsDossierModalOpen(false)} className={`flex-1 py-3.5 rounded-xl ${theme.glassInnerCard} ${theme.textMain} hover:opacity-80 transition-all text-[11px] font-bold uppercase tracking-widest cursor-pointer shadow-xs active:scale-95 border ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-2 py-3.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest flex justify-center items-center gap-1.5 shadow-[0_4px_15px_rgba(249,115,22,0.4)] cursor-pointer transition-all active:scale-95 disabled:opacity-50 border border-orange-400">
                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{isSaving ? 'Syncing...' : (isEditing ? 'Save Dossier Updates' : 'Register New Account')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BULK CSV IMPORTER MODAL */}
        {isBulkModalOpen && (
          <div className={`fixed inset-0 flex flex-col items-center justify-start pt-24 sm:pt-28 px-4 z-100 animate-in fade-in duration-200 ${isDarkMode ? 'bg-black/50 backdrop-blur-md' : 'bg-black/20 backdrop-blur-md'}`}>
            <div className={`max-w-md w-full p-6 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.15)] border space-y-5 text-center animate-in zoom-in-95 duration-200 rounded-4xl ${theme.glassCard}`}>
              <div className={`flex justify-between items-center pb-3 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${theme.textMain}`}><Upload size={16} className="text-orange-500"/> Bulk CSV Import</h3>
                <button onClick={() => setIsBulkModalOpen(false)} className={`p-1.5 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-90 ${theme.glassInnerCard} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-500`}><X size={14}/></button>
              </div>

              <div className="space-y-3 text-left">
                <button onClick={downloadStaffCsvTemplate} className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer border shadow-xs ${theme.glassInnerCard} ${theme.textMain} hover:border-orange-400 dark:hover:border-orange-500 hover:text-orange-500`}>
                  <Download size={14}/> <span>1. Download CSV Template</span>
                </button>
                <p className={`text-[9px] font-semibold leading-relaxed px-1 ${theme.textSub}`}>Notice: Column 3 is <b className={theme.textMain}>Password</b>. Leave blank to keep existing passwords safe.</p>
              </div>

              <div className={`p-6 border-2 border-dashed rounded-3xl transition-all duration-200 flex flex-col items-center justify-center gap-3 hover:shadow-md ${theme.glassInnerCard} ${isDarkMode ? 'hover:border-orange-500/50' : 'hover:border-orange-300'}`}>
                <FileSpreadsheet size={40} className="text-orange-500 animate-pulse" />
                <input type="file" accept=".csv" onChange={e => setBulkFile(e.target.files?.[0] || null)} className={`w-full text-[10px] font-bold cursor-pointer transition-all file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:cursor-pointer ${theme.textMain} file:bg-orange-500 file:text-white hover:file:bg-orange-600 shadow-sm`} />
              </div>

              <button onClick={executeStaffBulkImport} disabled={isImporting || !bulkFile} className={`w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all duration-200 border ${bulkFile ? 'bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] cursor-pointer hover:scale-[1.02] active:scale-95 border-orange-400' : isDarkMode ? 'bg-[#27272a]/40 text-zinc-500 border-zinc-700 cursor-not-allowed' : 'bg-slate-300/40 text-slate-500 border-slate-300 cursor-not-allowed'}`}>
                {isImporting ? 'Parsing CSV Rows...' : '2. Execute Batch Staff Upload'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AdminStaffDirectoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4 text-slate-400 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-orange-500 dark:border-t-orange-500"></div>
        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-purple-300">Loading Directory...</span>
      </div>
    }>
      <AdminStaffDirectoryContent />
    </Suspense>
  );
}