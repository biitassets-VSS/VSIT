'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Search, Users, Mail, Hash, Shield, 
  UserCheck, PlusCircle, Upload, Download, FileSpreadsheet, 
  X, RefreshCw, Save, Building, Phone, AlertCircle
} from 'lucide-react';

export default function AdminStaffDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Single Manual Employee Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newRole, setNewRole] = useState('Staff Member');
  const [newDept, setNewDept] = useState('Operations');
  const [newPhone, setNewPhone] = useState('');
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

  // Bulletproof fallback UUID generator for non-crypto browser contexts
  const generateSafeUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 👤 MANUAL SINGLE HIRE REGISTRATION
  const handleRegisterSingleStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return alert("Name and Email required.");

    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').insert([{
        id: generateSafeUuid(),
        full_name: newName,
        email: newEmail.toLowerCase().trim(),
        emp_code: newEmpCode.toUpperCase().trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        role: newRole,
        department: newDept,
        phone: newPhone || 'Unrecorded'
      }]);

      if (error) throw error;

      alert(`Employee dossier for ${newName} successfully activated!`);
      setIsAddModalOpen(false);
      setNewName(''); setNewEmail(''); setNewEmpCode(''); setNewPhone('');
      fetchStaff();
    } catch (err: any) { alert(`Registration Failed: ${err.message}`); } finally { setIsSaving(false); }
  };

  // 📦 THE OVERHAULED, LOUD CSV BATCH IMPORTER
  const downloadStaffCsvTemplate = () => {
    const headers = "FullName,Email,EmpCode,Role,Department,Phone\n";
    const sample = "Alexander Vance,a.vance@company.com,EMP-901,Senior Developer,Engineering,+1-555-0192\nSamantha Traylor,s.traylor@company.com,EMP-902,Logistics Officer,Warehouse,+1-555-0144";
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
      if (lines.length < 2) throw new Error("CSV file contains headers but zero employee rows.");

      const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());
      const batchPayload: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const col: Record<string, string> = {};
        rawHeaders.forEach((h, idx) => { col[h] = (row[idx] || '').replace(/(^"|"$)/g, '').trim(); });

        // Highly forgiving multi-header keyword matcher
        const name = col['fullname'] || col['name'] || col['full_name'] || '';
        const email = col['email'] || col['emailaddress'] || col['e-mail'] || '';
        const code = col['empcode'] || col['emp_code'] || col['employeeid'] || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
        const role = col['role'] || col['jobtitle'] || 'Staff Member';
        const dept = col['department'] || col['dept'] || 'General';
        const phone = col['phone'] || col['mobile'] || '';

        if (!email || !name) continue; // Skip blank lines safely

        batchPayload.push({
          id: generateSafeUuid(),
          full_name: name,
          email: email.toLowerCase(),
          emp_code: code.toUpperCase(),
          role: role,
          department: dept,
          phone: phone || 'N/A',
          created_at: new Date().toISOString()
        });
      }

      if (batchPayload.length === 0) throw new Error("Could not detect any rows containing both a valid Name and Email.");

      // 🚨 THE CRITICAL STEP: We explicitly capture Supabase's rejection object!
      const { error } = await supabase.from('profiles').insert(batchPayload);

      if (error) {
        throw new Error(`SUPABASE SQL REJECTION:\n\n${error.message}\n(Error Code: ${error.code})\n\nTip: Check if one of these email addresses is already inside the database.`);
      }

      alert(`🎉 SUCCESS! ${batchPayload.length} employee accounts injected into active directory.`);
      setIsBulkModalOpen(false);
      setBulkFile(null);
      fetchStaff(); // <-- instantly forces Next.js to repaint the grid!

    } catch (err: any) { 
      alert(`❌ BATCH ABORTED:\n\n${err.message}`); 
    } finally { 
      setIsImporting(false); 
    }
  };

  const filteredStaff = staff.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) ||
           s.emp_code?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q) ||
           s.role?.toLowerCase().includes(q);
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
              <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">Staff & Access Directory</h1>
              <span className="px-3 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-full">
                {staff.length} Active Profiles
              </span>
            </div>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Manage employee hardware holders, organizational codes, and network access</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto w-full md:w-auto">
          <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer">
            <FileSpreadsheet size={15} /> <span>Bulk Import CSV</span>
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#002B49] hover:bg-[#001d33] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#002B49]/20 cursor-pointer">
            <PlusCircle size={16} /> <span>Add Manual Hire</span>
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs flex items-center">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, email, EMP code, department, or title..." 
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* STAFF GRID */}
      {loading ? (
        <div className="w-full py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002B49]"></div></div>
      ) : filteredStaff.length === 0 ? (
        <div className="w-full py-20 bg-white rounded-3xl border border-gray-100 text-center space-y-2 shadow-2xs">
          <Users size={40} className="mx-auto text-gray-300" />
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">No Staff Found</h3>
          <p className="text-xs text-gray-400 font-medium">No matching employee records exist in the current filtered view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map(user => (
            <div key={user.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between gap-4 group">
              
              <div className="space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-base shadow-md shadow-emerald-500/20 shrink-0">
                    {user.full_name?.charAt(0) || user.name?.charAt(0) || <UserCheck size={20} />}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-sm font-black text-gray-900 truncate group-hover:text-[#002B49] transition-colors">{user.full_name || user.name || 'Unnamed Employee'}</h3>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mt-0.5">
                      <Building size={12} />
                      <span className="truncate">{user.department || 'General'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 bg-gray-50 p-3.5 rounded-2xl border border-gray-100/80 text-xs">
                  <div className="flex items-center gap-2 text-gray-700 font-mono font-bold">
                    <Hash size={13} className="text-blue-500 shrink-0" />
                    <span>{user.emp_code || 'NO-EMP-CODE'}</span>
                    <span className="ml-auto text-[10px] bg-gray-200/70 text-gray-600 px-2 py-0.5 rounded font-sans font-black">{user.role || 'Staff'}</span>
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

              {/* Hardware Assignment Footer Badge */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Assigned Equipment:</span>
                <span className={`px-3 py-1 rounded-xl text-[11px] font-black tracking-wider ${user.assetCount > 0 ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                  {user.assetCount} Units Held
                </span>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 🟢 1. MANUAL SINGLE HIRE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xs font-black uppercase text-[#002B49] tracking-widest flex items-center gap-1.5"><UserCheck size={16}/> Register New Employee Dossier</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-900 cursor-pointer"><X size={18}/></button>
            </div>

            <form onSubmit={handleRegisterSingleStaff} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Full Legal Name *</label><input type="text" required placeholder="e.g. Marcus Vance" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-xs font-bold outline-none focus:bg-white" /></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Company Email *</label><input type="email" required placeholder="m.vance@company.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-xs font-bold outline-none focus:bg-white" /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Employee ID / Code</label><input type="text" placeholder="e.g. EMP-1042" value={newEmpCode} onChange={e => setNewEmpCode(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-xs font-mono font-bold outline-none focus:bg-white" /></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Department</label><input type="text" placeholder="e.g. Engineering, Sales" value={newDept} onChange={e => setNewDept(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-xs font-bold outline-none focus:bg-white" /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Job Title / Role</label><input type="text" placeholder="e.g. System Administrator" value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-xs font-bold outline-none focus:bg-white" /></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Contact Phone</label><input type="text" placeholder="+1 (555) 019-2834" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-xs font-bold outline-none focus:bg-white" /></div>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isSaving} className="w-full py-3.5 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer">
                  {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                  <span>{isSaving ? 'Registering...' : 'Activate Account Dossier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 2. LOUD BULK CSV IMPORTER MODAL */}
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