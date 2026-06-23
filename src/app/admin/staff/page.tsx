'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Search, Users, Mail, Hash, Shield, 
  UserCheck, PlusCircle, Upload, Download, FileSpreadsheet, 
  X, RefreshCw, Save, Building, Phone, Power, Edit2, Package
} from 'lucide-react';

export default function AdminStaffDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Form State (Handles BOTH Create and Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({
    id: '', full_name: '', email: '', emp_code: '', 
    role: 'Staff Member', department: 'General', phone: '', status: 'Active'
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

  // 👤 OPEN MODAL TRIGGERS
  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ id: '', full_name: '', email: '', emp_code: '', role: 'Staff Member', department: 'Operations', phone: '', status: 'Active' });
    setIsDossierModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setIsEditing(true);
    setFormData({
      id: user.id, full_name: user.full_name || user.name || '', email: user.email || '',
      emp_code: user.emp_code || '', role: user.role || 'Staff Member', department: user.department || 'General',
      phone: user.phone || '', status: user.status || 'Active'
    });
    setIsDossierModalOpen(true);
  };

  // 💾 MASTER SAVE HANDLER (Creates OR Updates)
  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) return alert("Name and Email required.");

    setIsSaving(true);
    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email.toLowerCase().trim(),
        emp_code: formData.emp_code.toUpperCase().trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        role: formData.role,
        department: formData.department,
        phone: formData.phone || 'Unrecorded',
        status: formData.status
      };

      if (isEditing) {
        // UPDATE EXISTING
        const { error } = await supabase.from('profiles').update(payload).eq('id', formData.id);
        if (error) throw error;
        alert(`Dossier for ${formData.full_name} updated successfully!`);
      } else {
        // CREATE NEW
        const { error } = await supabase.from('profiles').insert([{ ...payload, id: generateSafeUuid() }]);
        if (error) throw error;
        alert(`New employee ${formData.full_name} activated!`);
      }

      setIsDossierModalOpen(false);
      fetchStaff();
    } catch (err: any) { alert(`Save Failed: ${err.message}`); } finally { setIsSaving(false); }
  };

  // ⚡ QUICK TOGGLE LOGIN STATUS DIRECTLY FROM CARD
  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'Active' ? 'Disabled' : 'Active';
    if (!window.confirm(`Are you sure you want to change ${user.full_name}'s network access to ${newStatus}?`)) return;

    try {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', user.id);
      if (error) throw error;
      setStaff(prev => prev.map(s => s.id === user.id ? { ...s, status: newStatus } : s));
    } catch (err: any) { alert(`Status Update Failed: ${err.message}`); }
  };

  // 📦 BULK IMPORTER
  const downloadStaffCsvTemplate = () => {
    const headers = "FullName,Email,EmpCode,Role,Department,Phone\n";
    const sample = "Alexander Vance,a.vance@company.com,EMP-901,Senior Developer,Engineering,+1-555-0192";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'VS_Staff_Batch_Template.csv'; a.click();
  };

  const executeStaffBulkImport = async () => {
    if (!bulkFile) return alert("Please select a CSV file.");
    setIsImporting(true);

    try {
      const text = await bulkFile.text();
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) throw new Error("CSV file contains headers but zero rows.");

      const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());
      const batchPayload: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const col: Record<string, string> = {};
        rawHeaders.forEach((h, idx) => { col[h] = (row[idx] || '').replace(/(^"|"$)/g, '').trim(); });

        const name = col['fullname'] || col['name'] || col['full_name'] || '';
        const email = col['email'] || col['emailaddress'] || col['e-mail'] || '';
        if (!email || !name) continue;

        batchPayload.push({
          id: generateSafeUuid(),
          full_name: name,
          email: email.toLowerCase(),
          emp_code: (col['empcode'] || col['emp_code'] || `EMP-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase(),
          role: col['role'] || col['jobtitle'] || 'Staff Member',
          department: col['department'] || col['dept'] || 'General',
          phone: col['phone'] || col['mobile'] || 'N/A',
          status: 'Active',
          created_at: new Date().toISOString()
        });
      }

      if (batchPayload.length === 0) throw new Error("Could not detect any valid Name/Email rows.");

      const { error } = await supabase.from('profiles').insert(batchPayload);
      if (error) throw new Error(`SUPABASE REJECTION: ${error.message}`);

      alert(`🎉 SUCCESS! ${batchPayload.length} employees imported.`);
      setIsBulkModalOpen(false); setBulkFile(null); fetchStaff();

    } catch (err: any) { alert(`❌ BATCH ABORTED:\n\n${err.message}`); } finally { setIsImporting(false); }
  };

  const filteredStaff = staff.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) ||
           s.emp_code?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans">
      
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">Staff Directory</h1>
              <span className="px-3 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-full">
                {staff.length} Active Profiles
              </span>
            </div>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Manage employee details, hardware holders, and network access limits</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto w-full md:w-auto">
          <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer">
            <FileSpreadsheet size={15} /> <span>Bulk Import CSV</span>
          </button>
          <button onClick={handleOpenAdd} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#002B49] hover:bg-[#001d33] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#002B49]/20 cursor-pointer">
            <PlusCircle size={16} /> <span>Add New Hire</span>
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs flex items-center">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, email, EMP code, or department..." 
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 🚀 OVERHAULED STAFF GRID */}
      {loading ? (
        <div className="w-full py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002B49]"></div></div>
      ) : filteredStaff.length === 0 ? (
        <div className="w-full py-20 bg-white rounded-3xl border border-gray-100 text-center space-y-2 shadow-2xs">
          <Users size={40} className="mx-auto text-gray-300" />
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">No Staff Found</h3>
          <p className="text-xs text-gray-400 font-medium">No matching employee records exist in the current view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map(user => {
            const isActive = user.status === 'Active';

            return (
              <div key={user.id} className={`bg-white p-6 rounded-3xl border shadow-2xs transition-all flex flex-col justify-between gap-4 group ${isActive ? 'border-gray-100 hover:border-[#002B49]' : 'border-rose-100 bg-rose-50/20'}`}>
                
                <div className="space-y-4">
                  {/* Top Bar: Clickable Name & Avatar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm ${isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-blue-500/20' : 'bg-gray-200 text-gray-400'}`}>
                        {user.full_name?.charAt(0) || <UserCheck size={20} />}
                      </div>
                      <div className="overflow-hidden">
                        {/* 🚀 CLICKABLE NAME TRIGGER */}
                        <button 
                          onClick={() => handleOpenEdit(user)}
                          className={`text-sm font-black text-left leading-tight truncate w-full hover:underline cursor-pointer ${isActive ? 'text-gray-900 hover:text-blue-600' : 'text-gray-500'}`}
                          title="Click to Edit Dossier"
                        >
                          {user.full_name || 'Unnamed Employee'}
                        </button>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 mt-1">
                          <Building size={12} className={isActive ? "text-indigo-500" : ""} />
                          <span className="truncate">{user.department || 'General'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Edit Icon */}
                    <button onClick={() => handleOpenEdit(user)} className="p-2 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-xl transition-colors shrink-0 cursor-pointer">
                      <Edit2 size={14} />
                    </button>
                  </div>

                  {/* Info Box */}
                  <div className={`space-y-2 p-3.5 rounded-2xl border text-xs ${isActive ? 'bg-gray-50 border-gray-100/80' : 'bg-white border-rose-100/50 opacity-70'}`}>
                    <div className="flex items-center gap-2 text-gray-700 font-mono font-bold">
                      <Hash size={13} className="text-blue-500 shrink-0" />
                      <span>{user.emp_code || 'NO-EMP-CODE'}</span>
                      <span className="ml-auto text-[9px] bg-gray-200/70 text-gray-600 px-2 py-0.5 rounded font-sans font-black uppercase tracking-wider">{user.role || 'Staff'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 font-medium overflow-hidden">
                      <Mail size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>

                    {user.phone && user.phone !== 'N/A' && (
                      <div className="flex items-center gap-2 text-gray-500 text-[11px]">
                        <Phone size={12} className="text-gray-400 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500">
                    <Package size={12}/>
                    {user.assetCount > 0 ? (
                      <span className="text-blue-600">{user.assetCount} Assets Held</span>
                    ) : '0 Assets'}
                  </div>

                  {/* ⚡ DIRECT STATUS TOGGLE */}
                  <button 
                    onClick={() => handleToggleStatus(user)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${isActive ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'}`}
                    title="Click to toggle network access"
                  >
                    <Power size={11} /> {isActive ? 'Access Active' : 'Access Disabled'}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 🟢 THE HR DOSSIER MODAL (Create & Edit) */}
      {isDossierModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div>
                <h3 className="text-sm font-black uppercase text-[#002B49] tracking-widest flex items-center gap-2">
                  {isEditing ? <Edit2 size={16} className="text-blue-600"/> : <UserCheck size={16} className="text-blue-600"/>} 
                  {isEditing ? 'Edit Employee Dossier' : 'Register New Employee'}
                </h3>
                {isEditing && <p className="text-[10px] font-mono text-gray-400 mt-1">ID: {formData.id}</p>}
              </div>
              <button onClick={() => setIsDossierModalOpen(false)} className="text-gray-400 hover:text-gray-900 bg-white p-2 rounded-full border border-gray-200 shadow-sm cursor-pointer"><X size={16}/></button>
            </div>

            <form onSubmit={handleSaveDossier} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              
              {/* Identity Matrix */}
              <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-800 block">1. Employee Identity</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Full Legal Name *</label>
                    <input type="text" required placeholder="e.g. Marcus Vance" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Company Email *</label>
                    <input type="email" required placeholder="m.vance@company.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Employee ID / Code</label>
                    <input type="text" placeholder="e.g. EMP-1042 (Auto-generates if blank)" value={formData.emp_code} onChange={e => setFormData({...formData, emp_code: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Contact Phone</label>
                    <input type="text" placeholder="+1 (555) 019-2834" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>

              {/* Organization Matrix */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/60 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 block">2. Organizational Role</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Department</label>
                    <input type="text" placeholder="e.g. Engineering, Sales" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-gray-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Job Title</label>
                    <input type="text" placeholder="e.g. Senior Developer" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-gray-500" />
                  </div>
                </div>
              </div>

              {/* Security Matrix */}
              <div className={`p-5 rounded-2xl border space-y-4 transition-colors ${formData.status === 'Active' ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/50 border-rose-200'}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest block ${formData.status === 'Active' ? 'text-emerald-800' : 'text-rose-800'}`}>3. Network Security Status</span>
                
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Employee Account State</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className={`w-full p-3 border rounded-xl text-xs font-black uppercase tracking-wider outline-none cursor-pointer ${formData.status === 'Active' ? 'bg-white border-emerald-300 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700'}`}
                  >
                    <option value="Active">🟢 Account is Active (Normal Access)</option>
                    <option value="Disabled">🔴 Account Disabled (Login Revoked)</option>
                  </select>
                  {formData.status === 'Disabled' && (
                    <p className="text-[10px] font-bold text-rose-600 mt-2 flex items-center gap-1"><Shield size={12}/> Disabling this account revokes their ability to log into the staff portal.</p>
                  )}
                </div>
              </div>

              {/* Submit Line */}
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsDossierModalOpen(false)} className="px-6 py-4 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-xs font-black uppercase tracking-wider flex justify-center items-center gap-2 shadow-lg cursor-pointer transition-all">
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{isSaving ? 'Syncing to Database...' : (isEditing ? 'Save Dossier Updates' : 'Activate Employee Account')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 LOUD BULK CSV IMPORTER MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6 text-center">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#002B49] flex items-center gap-2"><Upload size={16}/> Bulk CSV Staff Roster Import</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-900 cursor-pointer"><X size={18}/></button>
            </div>

            <div className="space-y-3 text-left">
              <button onClick={downloadStaffCsvTemplate} className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer">
                <Download size={15}/> <span>1. Download Staff CSV Template</span>
              </button>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed pl-1">Fill out the template. If an Employee Code is left blank, the script will automatically assign a secure `EMP-xxxx` tag to the user.</p>
            </div>

            <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors flex flex-col items-center justify-center gap-3">
              <FileSpreadsheet size={40} className="text-blue-600 animate-pulse" />
              <input type="file" accept=".csv" onChange={e => setBulkFile(e.target.files?.[0] || null)} className="text-xs font-bold text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#002B49] file:text-white file:cursor-pointer" />
            </div>

            <button onClick={executeStaffBulkImport} disabled={isImporting || !bulkFile} className={`w-full py-3.5 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md ${bulkFile ? 'bg-[#002B49] hover:bg-[#001d33] cursor-pointer' : 'bg-gray-300 cursor-not-allowed'}`}>
              {isImporting ? 'Parsing CSV Rows...' : '2. Execute Batch Staff Upload'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}