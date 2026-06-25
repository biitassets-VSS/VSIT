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

export default function AdminStaffDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => { fetchStaff(); }, []);

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

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) return alert("Name and Email required.");

    setIsSaving(true);
    try {
      const payload: any = {
        full_name: formData.full_name,
        email: formData.email.toLowerCase().trim(),
        emp_code: formData.emp_code.toUpperCase().trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        role: formData.role || 'Staff',
        department: formData.department || 'Migration',
        phone: formData.phone || null,
        dob: formData.dob || null,
        joining_date: formData.joining_date || null,
        status: formData.status
      };

      if (formData.password) {
        payload.password = formData.password.trim();
      } else if (!isEditing) {
        payload.password = 'vsit1234'; 
      }

      if (isEditing) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', formData.id);
        if (error) throw error;
        alert(`Dossier for ${formData.full_name} updated successfully!`);
      } else {
        const { error } = await supabase.from('profiles').insert([{ ...payload, id: generateSafeUuid() }]);
        if (error?.code === '23505') throw new Error(`The email address ${payload.email} is already registered to another employee.`);
        if (error) throw error;
        alert(`New employee ${formData.full_name} activated with password: ${payload.password}`);
      }

      setIsDossierModalOpen(false); fetchStaff();
    } catch (err: any) { alert(`Save Failed: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'Active' ? 'Disabled' : 'Active';
    if (!window.confirm(`Are you sure you want to change ${user.full_name}'s network access to ${newStatus}?`)) return;

    try {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', user.id);
      if (error) throw error;
      setStaff(prev => prev.map(s => s.id === user.id ? { ...s, status: newStatus } : s));
    } catch (err: any) { alert(`Status Update Failed: ${err.message}`); }
  };

  // ==========================================
  // 🟢 ARMORED BULK CSV PARSER & PATCH ENGINE
  // ==========================================
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

      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvRow(lines[i]);
        const col: Record<string, string> = {};
        rawHeaders.forEach((h, idx) => { col[h] = row[idx] || ''; });

        const name = col['fullname'] || col['name'] || col['full_name'] || '';
        const rawEmail = col['email'] || col['emailaddress'] || col['e-mail'] || '';
        const cleanEmail = rawEmail.toLowerCase().trim();

        if (!cleanEmail || !name) continue; 

        const pass = col['password'] || col['pass'] || '';
        const rawCode = col['empcode'] || col['emp_code'] || col['id'] || '';
        const empCode = rawCode ? rawCode.toUpperCase() : `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

        const existingDbUser = profileDbMap.get(cleanEmail);

        if (existingDbUser) {
          const patchPayload: any = { id: existingDbUser.id, email: existingDbUser.email };
          
          if (name) patchPayload.full_name = name;
          if (pass) patchPayload.password = pass;
          if (rawCode) patchPayload.emp_code = rawCode.toUpperCase();
          
          const role = col['accessrole'] || col['role'] || col['access'];
          if (role) patchPayload.role = role;
          
          const dept = col['department'] || col['dept'];
          if (dept) patchPayload.department = dept;
          
          const phone = col['phone'] || col['mobile'];
          if (phone) patchPayload.phone = phone;
          
          const dob = col['dob'] || col['dateofbirth'];
          if (dob) patchPayload.dob = dob;
          
          const join = col['joiningdate'] || col['joining_date'];
          if (join) patchPayload.joining_date = join;

          existingToPatch.push(patchPayload);
          patchedCount++;
        } else {
          newHiresToInsert.push({
            id: generateSafeUuid(),
            full_name: name,
            email: cleanEmail,
            password: pass || 'vsit1234', 
            emp_code: empCode,
            role: col['accessrole'] || col['role'] || col['access'] || 'Staff',
            department: col['department'] || col['dept'] || 'Migration',
            phone: col['phone'] || col['mobile'] || null,
            dob: col['dob'] || col['dateofbirth'] || null,
            joining_date: col['joiningdate'] || col['joining_date'] || null,
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

      alert(`🎉 BATCH FINISHED!\n\n• Created ${newHiresToInsert.length} brand new staff profiles.\n• Successfully patched missing fields for ${patchedCount} existing employees.`);
      setIsBulkModalOpen(false); setBulkFile(null); fetchStaff();

    } catch (err: any) { alert(`❌ BATCH ABORTED:\n\n${err.message}`); } finally { setIsImporting(false); }
  };

  const filteredStaff = staff.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) ||
           s.emp_code?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 font-sans text-slate-900 bg-slate-50/50 min-h-screen">
      
      {/* 🌟 PREMIUM HEADER */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 cursor-pointer transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Staff Directory</h1>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full">
                {staff.length} Active Profiles
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">Manage employee records, passwords, and system access levels</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm">
            <FileSpreadsheet size={16} /> <span>Bulk Upload</span>
          </button>
          <button onClick={handleOpenAdd} className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-blue-600/20 cursor-pointer transition-all">
            <PlusCircle size={16} /> <span>Add New Hire</span>
          </button>
        </div>
      </div>

      {/* 🌟 SEARCH BAR */}
      <div className="bg-white p-2.5 rounded-3xl border border-slate-200 shadow-sm flex items-center">
        <div className="relative w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, email, EMP code, or department..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
          />
        </div>
      </div>

      {/* 🌟 STAFF GRID */}
      {loading ? (
        <div className="w-full py-32 flex flex-col items-center justify-center gap-4 text-slate-400">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
          <span className="text-[11px] font-black tracking-widest uppercase">Loading Directory</span>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="w-full py-24 bg-white rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
          <Users size={48} className="mx-auto text-slate-300" />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">No Staff Found</h3>
          <p className="text-xs text-slate-400 font-bold">No matching employee records exist in the current view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStaff.map(user => {
            const isActive = user.status === 'Active';
            const isAdmin = user.role?.toLowerCase() === 'admin';

            return (
              <div key={user.id} className={`bg-white rounded-3xl border shadow-sm transition-all flex flex-col justify-between group hover:shadow-md ${isActive ? 'border-slate-200 hover:border-blue-300' : 'border-rose-200 bg-rose-50/30'}`}>
                
                <div className="p-6 border-b border-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 overflow-hidden">
                      
                      {/* 🌟 FROSTED GLASS AVATAR */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 relative overflow-hidden shadow-sm ${
                        isActive 
                          ? (isAdmin 
                              ? 'bg-purple-500/10 text-purple-600 border border-purple-200/50 shadow-[0_4px_12px_rgba(168,85,247,0.05)]' 
                              : 'bg-blue-500/10 text-blue-600 border border-blue-200/50 shadow-[0_4px_12px_rgba(59,130,246,0.05)]') 
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {/* Internal Shine Gradient for Glass Effect */}
                        {isActive && <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-80 z-0"></div>}
                        <span className="relative z-10">{user.full_name?.charAt(0) || <UserCheck size={20} />}</span>
                      </div>

                      <div className="overflow-hidden">
                        <button 
                          onClick={() => handleOpenEdit(user)}
                          className={`text-base font-black text-left leading-tight truncate w-full hover:underline cursor-pointer ${isActive ? 'text-slate-900 hover:text-blue-600' : 'text-slate-500'}`}
                        >
                          {user.full_name || 'Unnamed Employee'}
                        </button>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mt-1.5">
                          <Building size={13} className={isActive ? "text-blue-500" : ""} />
                          <span className="truncate">{user.department || 'Migration'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button onClick={() => handleOpenEdit(user)} className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors shrink-0 cursor-pointer border border-slate-100">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-3 bg-slate-50/50 flex-1">
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Hash size={14} className="text-blue-500" />
                      <span className="font-bold text-[10px] uppercase tracking-widest">EMP CODE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 text-xs">{user.emp_code || 'NO-EMP-CODE'}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.role || 'Staff'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail size={14} className="text-slate-400" />
                      <span className="font-bold text-[10px] uppercase tracking-widest">Email</span>
                    </div>
                    <span className="font-bold text-slate-700 text-xs truncate max-w-[160px]" title={user.email}>{user.email}</span>
                  </div>

                  {/* 🔑 ADMIN "SUPER-VISION" PASSWORD WARNING BADGE */}
                  <div className={`flex justify-between items-center bg-white p-3 rounded-xl border shadow-xs ${user.password ? 'border-emerald-100' : 'border-amber-200 bg-amber-50/50'}`}>
                    <div className="flex items-center gap-2 text-slate-500">
                      <KeyRound size={14} className={user.password ? "text-emerald-500" : "text-amber-500"}/>
                      <span className="font-bold text-[10px] uppercase tracking-widest">Login Auth</span>
                    </div>
                    <span className={`font-mono font-black text-[10px] uppercase tracking-widest ${user.password ? 'text-emerald-700' : 'text-amber-700 animate-pulse'}`}>
                      {user.password ? 'Secure' : '⚠️ Missing'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-slate-400" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Asset Load</span>
                      <span className={`text-[10px] font-black tracking-widest uppercase ${user.assetCount > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                        {user.assetCount} Assigned
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleToggleStatus(user)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer border ${isActive ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'}`}
                  >
                    <Power size={12} /> {isActive ? 'Access Active' : 'Access Disabled'}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 🟢 THE HR DOSSIER MODAL */}
      {isDossierModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                  {isEditing ? <Edit2 size={16} className="text-blue-600"/> : <UserCheck size={16} className="text-blue-600"/>} 
                  {isEditing ? 'Edit Employee Dossier' : 'Register New Employee'}
                </h3>
                {isEditing && <p className="text-[10px] font-mono font-bold text-slate-400 mt-1 tracking-widest">ID: {formData.id}</p>}
              </div>
              <button onClick={() => setIsDossierModalOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white p-2 rounded-full border border-slate-200 shadow-sm cursor-pointer"><X size={16}/></button>
            </div>

            <form onSubmit={handleSaveDossier} className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
              
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">1</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Employee Identity & Auth</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Full Legal Name *</label>
                    <input type="text" required placeholder="e.g. Marcus Vance" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Company Email *</label>
                    <input type="email" required placeholder="m.vance@company.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-amber-600 uppercase flex items-center gap-1.5 mb-1.5"><Lock size={12}/> Portal Login Password *</label>
                    <input type="text" required={!isEditing} placeholder={isEditing ? "Type to overwrite password" : "e.g. SecurePass#2026"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3.5 bg-amber-50/50 border border-amber-200 focus:bg-amber-50 focus:border-amber-500 rounded-xl text-xs font-mono font-bold outline-none text-amber-900 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Contact Phone</label>
                    <input type="text" placeholder="+1 (555) 019-2834" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Employee Code</label>
                    <input type="text" placeholder="EMP-xxxx" value={formData.emp_code} onChange={e => setFormData({...formData, emp_code: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-mono font-black text-slate-900 outline-none uppercase transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1.5"><CalendarDays size={12}/> Date of Birth</label>
                    <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1.5"><CalendarDays size={12}/> Joining Date</label>
                    <input type="date" value={formData.joining_date} onChange={e => setFormData({...formData, joining_date: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">2</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Organizational Assignment</span>
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Department</label>
                  <select 
                    value={formData.department} 
                    onChange={e => setFormData({...formData, department: e.target.value})} 
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer"
                  >
                    <option value="Migration">Migration</option>
                    <option value="Calling Team">Calling Team</option>
                    <option value="DOE">DOE</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Education">Education</option>
                  </select>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border transition-colors ${formData.status === 'Active' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
                <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4 ${formData.status === 'Active' ? 'text-emerald-800' : 'text-rose-800'}`}>
                  <ShieldCheck size={14} /> 3. System Access & Security
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">System Access Level</label>
                    <select 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value})} 
                      className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs font-black uppercase tracking-widest outline-none cursor-pointer text-slate-700 shadow-sm"
                    >
                      <option value="Staff">🟢 Staff Access</option>
                      <option value="Admin">🟣 Admin Access</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Employee Account State</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})} 
                      className={`w-full p-3.5 border rounded-xl text-xs font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm ${formData.status === 'Active' ? 'bg-white border-emerald-300 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700'}`}
                    >
                      <option value="Active">🟢 Account Active</option>
                      <option value="Disabled">🔴 Account Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-4">
                <button type="button" onClick={() => setIsDossierModalOpen(false)} className="px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-all">
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{isSaving ? 'Syncing to Database...' : (isEditing ? 'Save Dossier Updates' : 'Activate Employee Account')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 BULK CSV IMPORTER MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-6 text-center animate-in fade-in duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><Upload size={18}/> Bulk CSV Staff Import</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full cursor-pointer"><X size={16}/></button>
            </div>

            <div className="space-y-4 text-left">
              <button onClick={downloadStaffCsvTemplate} className="w-full py-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer">
                <Download size={16}/> <span>1. Download Staff CSV Template</span>
              </button>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-1">Notice: Column 3 is <b>Password</b>. If you upload an existing staff member to add a missing phone number, leave the password blank and it will keep their old password safe.</p>
            </div>

            <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center gap-4">
              <FileSpreadsheet size={48} className="text-blue-600 animate-pulse" />
              <input type="file" accept=".csv" onChange={e => setBulkFile(e.target.files?.[0] || null)} className="text-xs font-bold text-slate-700 file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-900 file:text-white file:cursor-pointer w-full transition-all" />
            </div>

            <button onClick={executeStaffBulkImport} disabled={isImporting || !bulkFile} className={`w-full py-4.5 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all ${bulkFile ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'}`}>
              {isImporting ? 'Parsing CSV Rows...' : '2. Execute Batch Staff Upload'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}