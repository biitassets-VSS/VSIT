'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Search, Users, Mail, Hash, UserCheck, 
  PlusCircle, Upload, Download, FileSpreadsheet, 
  X, RefreshCw, Save, Building, Power, Edit2, 
  Package, CalendarDays, Lock, KeyRound, ShieldCheck
} from 'lucide-react';
// 🌟 FIXED IMPORT: Points directly to your server action file
import { setupStaffAuth } from './actions';

export default function AdminStaffDirectoryPage() {
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

  // Bulk Importer State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // 🌟 THEME SYNC
  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') setIsDarkMode(true);
    fetchStaff();
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
      alert(`Employee profile successfully saved and activated with password: ${targetPassword}`);

      setIsDossierModalOpen(false); fetchStaff();
    } catch (err: any) { alert(`Save Failed: ${err.message}`); } finally { setIsSaving(false); }
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

  // 🌟 CARBON BLACK THEME DICTIONARY
  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-slate-50',
    card: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200/60',
    cardHover: isDarkMode ? 'hover:border-[#3f3f46] hover:bg-[#18181b]' : 'hover:border-blue-300 hover:shadow-md',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-800',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500', 
    inputBg: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a] focus:border-blue-500 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900 placeholder-slate-400',
    modalOverlay: 'bg-black/80 backdrop-blur-sm z-50',
    modalBody: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200',
    modalHeader: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-slate-50 border-slate-100',
    iconBgBlue: isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-10`}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* HEADER */}
        <div className={`${theme.card} rounded-3xl p-5 md:p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors`}>
          <div className="flex items-center gap-5">
            <button onClick={() => router.push('/admin')} className={`p-2.5 rounded-xl border transition-colors ${theme.card} ${theme.cardHover} ${theme.textSub}`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`text-2xl font-semibold tracking-tight ${theme.textMain}`}>Staff Directory</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest ${isDarkMode ? 'bg-[#27272a] text-zinc-300' : 'bg-slate-100 text-slate-700'}`}>
                  {staff.length} Active Profiles
                </span>
              </div>
              <p className={`text-sm ${theme.textSub}`}>Manage employee records, passwords, and system access levels</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsBulkModalOpen(true)} className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-colors text-xs font-semibold uppercase tracking-wider ${theme.card} ${theme.cardHover} ${theme.textMain}`}>
              <FileSpreadsheet size={16} /> <span>Bulk Upload</span>
            </button>
            <button onClick={handleOpenAdd} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-lg shadow-blue-600/20 transition-all">
              <PlusCircle size={16} /> <span>Add New Hire</span>
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className={`p-2.5 rounded-2xl border shadow-sm flex items-center transition-colors ${theme.card}`}>
          <div className="relative w-full">
            <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
            <input 
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by staff name, email, EMP code, or department..." 
              className={`w-full pl-12 pr-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`}
            />
          </div>
        </div>

        {/* STAFF GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-zinc-500' : 'border-blue-600'}`}></div>
            <span className={`text-[11px] font-semibold tracking-widest uppercase ${theme.textSub}`}>Loading Directory</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm ${theme.card}`}>
            <Users size={48} className={`mx-auto ${isDarkMode ? 'text-zinc-700' : 'text-slate-300'}`} />
            <h3 className={`text-sm font-semibold uppercase tracking-widest ${theme.textMain}`}>No Staff Found</h3>
            <p className={`text-xs ${theme.textSub}`}>No matching employee records exist in the current view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredStaff.map(user => {
              const isActive = user.status === 'Active';
              const isAdmin = user.role?.toLowerCase() === 'admin';

              return (
                <div key={user.id} className={`rounded-3xl border shadow-sm flex flex-col justify-between group transition-all overflow-hidden ${
                  isActive ? theme.card + ' ' + theme.cardHover : isDarkMode ? 'bg-rose-950/10 border-rose-900/30' : 'bg-rose-50/30 border-rose-200'
                }`}>
                  
                  <div className={`p-5 border-b ${isDarkMode ? 'border-[#27272a]' : 'border-slate-50'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 shadow-sm ${
                          isActive 
                            ? (isAdmin 
                                ? (isDarkMode ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-100 text-purple-600 border border-purple-200/50') 
                                : (isDarkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-100 text-blue-600 border border-blue-200/50')) 
                            : (isDarkMode ? 'bg-zinc-900 text-zinc-600 border border-zinc-800' : 'bg-slate-100 text-slate-400 border border-slate-200')
                        }`}>
                          <span className="relative z-10">{user.full_name?.charAt(0) || <UserCheck size={20} />}</span>
                        </div>

                        <div className="overflow-hidden">
                          <button 
                            onClick={() => handleOpenEdit(user)}
                            className={`text-sm font-semibold text-left leading-tight truncate w-full hover:underline cursor-pointer ${isActive ? theme.textMain + ' hover:text-blue-500' : theme.textSub}`}
                          >
                            {user.full_name || 'Unnamed Employee'}
                          </button>
                          <div className={`flex items-center gap-1.5 text-[11px] font-medium mt-1 ${theme.textSub}`}>
                            <Building size={12} className={isActive ? (isDarkMode ? "text-blue-400" : "text-blue-500") : ""} />
                            <span className="truncate">{user.department || 'Migration'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <button onClick={() => handleOpenEdit(user)} className={`p-2.5 rounded-xl transition-colors cursor-pointer border ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:bg-[#27272a] hover:text-white' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}>
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className={`p-5 space-y-3 flex-1 ${isDarkMode ? 'bg-[#0a0a0a]/50' : 'bg-slate-50/50'}`}>
                    
                    <div className={`flex justify-between items-center p-3 rounded-xl border shadow-sm ${theme.card}`}>
                      <div className={`flex items-center gap-2 ${theme.textSub}`}>
                        <Hash size={14} className={isDarkMode ? "text-blue-400" : "text-blue-500"} />
                        <span className="font-semibold text-[9px] uppercase tracking-widest">EMP CODE</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-[11px] ${theme.textMain}`}>{user.emp_code || 'NO-EMP-CODE'}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${
                          isAdmin 
                            ? (isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700') 
                            : (isDarkMode ? 'bg-[#27272a] text-zinc-300' : 'bg-slate-100 text-slate-600')
                        }`}>
                          {user.role || 'Staff'}
                        </span>
                      </div>
                    </div>

                    <div className={`flex justify-between items-center p-3 rounded-xl border shadow-sm ${theme.card}`}>
                      <div className={`flex items-center gap-2 ${theme.textSub}`}>
                        <Mail size={14} />
                        <span className="font-semibold text-[9px] uppercase tracking-widest">Email</span>
                      </div>
                      <span className={`font-medium text-[11px] truncate max-w-[160px] ${theme.textMain}`} title={user.email}>{user.email}</span>
                    </div>

                    <div className={`flex justify-between items-center p-3 rounded-xl border shadow-sm ${theme.card}`}>
                      <div className={`flex items-center gap-2 ${theme.textSub}`}>
                        <KeyRound size={14} className={isDarkMode ? "text-blue-400" : "text-blue-500"}/>
                        <span className="font-semibold text-[9px] uppercase tracking-widest">Login Auth</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleManualAuthSync(user)}
                        className={`px-3 py-1 rounded-lg border font-semibold text-[9px] uppercase tracking-widest transition-all cursor-pointer ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 hover:text-white' : 'bg-blue-50 hover:bg-blue-600 border-blue-200 hover:border-transparent text-blue-700 hover:text-white'}`}
                      >
                        Overwrite Pass
                      </button>
                    </div>
                  </div>

                  <div className={`p-4 border-t flex items-center justify-between ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-slate-100/80 border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                      <Package size={14} className={theme.textSub} />
                      <div className="flex flex-col">
                        <span className={`text-[8px] font-bold uppercase tracking-widest ${theme.textSub}`}>Asset Load</span>
                        <span className={`text-[10px] font-bold tracking-wider uppercase ${user.assetCount > 0 ? (isDarkMode ? 'text-blue-400' : 'text-blue-700') : theme.textSub}`}>
                          {user.assetCount} Assigned
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleToggleStatus(user)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isActive 
                          ? (isDarkMode ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200') 
                          : (isDarkMode ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200')
                      }`}
                    >
                      <Power size={12} /> {isActive ? 'Access Active' : 'Access Disabled'}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* HR DOSSIER MODAL */}
        {isDossierModalOpen && (
          <div className={`fixed inset-0 flex items-center justify-center p-4 ${theme.modalOverlay}`}>
            <div className={`rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border flex flex-col max-h-[90vh] ${theme.modalBody}`}>
              
              <div className={`p-6 border-b flex justify-between items-center ${theme.modalHeader}`}>
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${theme.textMain}`}>
                    {isEditing ? <Edit2 size={16} className={isDarkMode ? "text-blue-400" : "text-blue-600"}/> : <UserCheck size={16} className={isDarkMode ? "text-blue-400" : "text-blue-600"}/>} 
                    {isEditing ? 'Edit Employee Dossier' : 'Register New Employee'}
                  </h3>
                  {isEditing && <p className={`text-[10px] font-mono font-medium mt-1 tracking-widest ${theme.textSub}`}>ID: {formData.id}</p>}
                </div>
                <button onClick={() => setIsDossierModalOpen(false)} className={`p-2 rounded-full border shadow-sm cursor-pointer transition-colors ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}><X size={16}/></button>
              </div>

              <form onSubmit={handleSaveDossier} className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
                
                <div className="space-y-5">
                  <div className={`flex items-center gap-3 border-b pb-2 ${isDarkMode ? 'border-[#27272a]' : 'border-slate-100'}`}>
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${theme.textMain}`}>Employee Identity & Auth</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Full Legal Name *</label>
                      <input type="text" required placeholder="e.g. Marcus Vance" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} />
                    </div>
                    <div>
                      <label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Company Email *</label>
                      <input type="email" required placeholder="m.vance@company.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={`text-[10px] font-semibold uppercase flex items-center gap-1.5 mb-1.5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}><Lock size={12}/> Portal Login Password *</label>
                      <input type="text" required={!isEditing} placeholder={isEditing ? "Type to overwrite password" : "e.g. SecurePass#2026"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-mono font-semibold outline-none transition-all border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 focus:border-amber-400' : 'bg-amber-50/50 border-amber-200 text-amber-900 focus:border-amber-500 focus:bg-amber-50'}`} />
                    </div>
                    <div>
                      <label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Contact Phone</label>
                      <input type="text" placeholder="+1 (555) 019-2834" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Employee Code</label>
                      <input type="text" placeholder="EMP-xxxx" value={formData.emp_code} onChange={e => setFormData({...formData, emp_code: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-mono font-bold uppercase outline-none transition-all border ${theme.inputBg}`} />
                    </div>
                    <div>
                      <label className={`text-[10px] font-semibold uppercase flex items-center gap-1.5 mb-1.5 ${theme.textSub}`}><CalendarDays size={12}/> Date of Birth</label>
                      <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} />
                    </div>
                    <div>
                      <label className={`text-[10px] font-semibold uppercase flex items-center gap-1.5 mb-1.5 ${theme.textSub}`}><CalendarDays size={12}/> Joining Date</label>
                      <input type="date" value={formData.joining_date} onChange={e => setFormData({...formData, joining_date: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className={`flex items-center gap-3 border-b pb-2 ${isDarkMode ? 'border-[#27272a]' : 'border-slate-100'}`}>
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${theme.textMain}`}>Organizational Assignment</span>
                  </div>
                  
                  <div>
                    <label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Department</label>
                    <select 
                      value={formData.department} 
                      onChange={e => setFormData({...formData, department: e.target.value})} 
                      className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all cursor-pointer border ${theme.inputBg}`}
                    >
                      <option value="Migration">Migration</option>
                      <option value="Calling Team">Calling Team</option>
                      <option value="DOE">DOE</option>
                      <option value="Accounts">Accounts</option>
                      <option value="Education">Education</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Administration">Administration</option>
                    </select>
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border transition-colors ${
                  formData.status === 'Active' 
                    ? (isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200') 
                    : (isDarkMode ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50/50 border-rose-200')
                }`}>
                  <span className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-4 ${formData.status === 'Active' ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-800') : (isDarkMode ? 'text-rose-400' : 'text-rose-800')}`}>
                    <ShieldCheck size={14} /> 3. System Access & Security
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>System Access Level</label>
                      <select 
                        value={formData.role} 
                        onChange={e => setFormData({...formData, role: e.target.value})} 
                        className={`w-full p-3.5 rounded-xl text-xs font-bold uppercase tracking-widest outline-none cursor-pointer shadow-sm border ${theme.inputBg}`}
                      >
                        <option value="Staff">🟢 Staff Access</option>
                        <option value="Admin">🟣 Admin Access</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Employee Account State</label>
                      <select 
                        value={formData.status} 
                        onChange={e => setFormData({...formData, status: e.target.value})} 
                        className={`w-full p-3.5 rounded-xl text-xs font-bold uppercase tracking-widest outline-none cursor-pointer shadow-sm border ${
                          formData.status === 'Active' 
                            ? (isDarkMode ? 'bg-[#0a0a0a] border-emerald-500/50 text-emerald-400' : 'bg-white border-emerald-300 text-emerald-700') 
                            : (isDarkMode ? 'bg-[#0a0a0a] border-rose-500/50 text-rose-400' : 'bg-rose-50 border-rose-300 text-rose-700')
                        }`}
                      >
                        <option value="Active">🟢 Account Active</option>
                        <option value="Disabled">🔴 Account Disabled</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-4">
                  <button type="button" onClick={() => setIsDossierModalOpen(false)} className={`px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors border ${isDarkMode ? 'bg-[#121212] border-[#27272a] text-zinc-300 hover:bg-[#18181b]' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-all">
                    {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{isSaving ? 'Syncing to Database...' : (isEditing ? 'Save Dossier Updates' : 'Activate Employee Account')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BULK CSV IMPORTER MODAL */}
        {isBulkModalOpen && (
          <div className={`fixed inset-0 flex items-center justify-center p-4 ${theme.modalOverlay}`}>
            <div className={`rounded-3xl max-w-md w-full p-8 shadow-2xl border space-y-6 text-center animate-in fade-in duration-200 ${theme.modalBody}`}>
              <div className={`flex justify-between items-center pb-4 border-b ${isDarkMode ? 'border-[#27272a]' : 'border-slate-100'}`}>
                <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${theme.textMain}`}><Upload size={18}/> Bulk CSV Staff Import</h3>
                <button onClick={() => setIsBulkModalOpen(false)} className={`p-2 rounded-full cursor-pointer transition-colors border ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white' : 'text-slate-400 hover:text-slate-900 bg-slate-100'}`}><X size={16}/></button>
              </div>

              <div className="space-y-4 text-left">
                <button onClick={downloadStaffCsvTemplate} className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'}`}>
                  <Download size={16}/> <span>1. Download Staff CSV Template</span>
                </button>
                <p className={`text-[11px] font-medium leading-relaxed px-1 ${theme.textSub}`}>Notice: Column 3 is <b>Password</b>. If you upload an existing staff member to add a missing phone number, leave the password blank and it will keep their old password safe.</p>
              </div>

              <div className={`p-8 border-2 border-dashed rounded-2xl transition-colors flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'border-[#3f3f46] bg-[#0a0a0a] hover:bg-[#18181b]' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                <FileSpreadsheet size={48} className="text-blue-500 animate-pulse" />
                <input type="file" accept=".csv" onChange={e => setBulkFile(e.target.files?.[0] || null)} className={`w-full text-xs font-semibold cursor-pointer transition-all file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:cursor-pointer ${isDarkMode ? 'text-zinc-400 file:bg-blue-600 file:text-white hover:file:bg-blue-700' : 'text-slate-700 file:bg-slate-900 file:text-white'}`} />
              </div>

              <button onClick={executeStaffBulkImport} disabled={isImporting || !bulkFile} className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all ${bulkFile ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 cursor-pointer' : isDarkMode ? 'bg-[#27272a] text-zinc-500 cursor-not-allowed' : 'bg-slate-300 text-white cursor-not-allowed'}`}>
                {isImporting ? 'Parsing CSV Rows...' : '2. Execute Batch Staff Upload'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}