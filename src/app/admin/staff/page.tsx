'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, Search, Package, UserCheck, Power, X, 
  Plus, UploadCloud, Download, Mail, Phone, CalendarDays, Lock, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface Staff { 
  id?: string;
  empId: string; 
  name: string; 
  department: string; 
  isActive: boolean; 
  email: string;
  password?: string;
  phone: string; 
  dob?: string;
  joiningDate?: string;
  role?: string;
}

interface Asset { id: string; name: string; tagId: string; assignedToEmpId?: string; }

export default function StaffPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  // Form & Upload State
  const [formData, setFormData] = useState<Partial<Staff>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch staff
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id, emp_code, name, department, status, email, password, contact_number, dob, joining_date, created_at')
          .order('created_at', { ascending: false });

        if (staffError) throw staffError;

        // Fetch roles from profiles table
        const { data: profileData } = await supabase.from('profiles').select('email, role');

        if (staffData) {
          const mappedStaff = staffData.map((dbStaff: any) => {
            const userProfile = profileData?.find(p => p.email === dbStaff.email);
            return {
              id: dbStaff.id,
              empId: dbStaff.emp_code,
              name: dbStaff.name,
              department: dbStaff.department,
              isActive: dbStaff.status === 'Active',
              email: dbStaff.email,
              password: dbStaff.password || '',
              phone: dbStaff.contact_number || '',
              dob: dbStaff.dob || '',
              joiningDate: dbStaff.joining_date || '',
              role: userProfile?.role || 'staff'
            };
          });
          setStaffList(mappedStaff);
        }

        const { data: assetsData } = await supabase.from('assets').select('id, name, tag_id, emp_code');
        if (assetsData) {
          setAssets(assetsData.map((a: any) => ({
            id: a.id,
            name: a.name,
            tagId: a.tag_id,
            assignedToEmpId: a.emp_code
          })));
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchData();
  }, []);

  const handleToggleStatus = async (staff: Staff) => {
    const newStatus = staff.isActive ? 'Inactive' : 'Active';
    try {
      const { error } = await supabase.from('staff').update({ status: newStatus }).eq('emp_code', staff.empId);
      if (error) throw error;
      setStaffList(staffList.map(s => s.empId === staff.empId ? { ...s, isActive: !s.isActive } : s));
    } catch (error: any) {
      alert("Failed to update status: " + error.message);
    }
  };

  const handleOpenAdd = () => {
    setFormData({ isActive: true, department: 'IT Department', role: 'staff' });
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const newId = `EMP-${Math.floor(Math.random() * 9000) + 1000}`;

      // 1. CREATE AUTH USER SILENTLY (so it doesn't log the Admin out)
      if (formData.email && formData.password) {
        const authClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false } }
        );

        const { error: authError } = await authClient.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError && !authError.message.includes('already registered')) {
          throw new Error("Could not create login account: " + authError.message);
        }
      }

      // 2. SAVE ROLE TO PROFILES TABLE
      await supabase.from('profiles').upsert({
        email: formData.email,
        name: formData.name,
        emp_code: newId,
        role: formData.role || 'staff'
      });

      // 3. SAVE DETAILS TO STAFF TABLE
      const dbPayload = {
        emp_code: newId,
        name: formData.name,
        department: formData.department,
        contact_number: formData.phone,
        email: formData.email,
        password: formData.password,
        dob: formData.dob,
        joining_date: formData.joiningDate,
        status: formData.isActive ? 'Active' : 'Inactive',
      };
      
      const { data, error } = await supabase.from('staff').insert([dbPayload]).select();
      if (error) throw error;

      if (data) {
        const newStaff: Staff = { ...formData, empId: newId, isActive: formData.isActive || false, role: formData.role || 'staff' } as Staff;
        setStaffList([newStaff, ...staffList]);
      }
      
      alert("Staff created successfully! They can now log in.");
      setIsModalOpen(false);
    } catch (error: any) {
      alert("Error saving staff: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- BULK UPLOAD LOGIC ---
  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Email,Password,Phone,Department,DateOfBirth,JoiningDate\nJane Smith,jane@vsit.com,pass123,1234567890,Accounts,1995-01-01,2023-01-01";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Staff_Bulk_Upload_Sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleBulkUploadSubmit = async () => {
    if (!selectedFile) return alert("Please select a file first.");
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (text) {
        const rows = text.split('\n').slice(1);
        const newStaffDB: any[] = [];
        
        const formatToDBDate = (dateString?: string) => {
          if (!dateString) return undefined;
          const cleanDate = dateString.trim();
          if (cleanDate.includes('-') && cleanDate.split('-')[0].length === 4) return cleanDate;
          const parts = cleanDate.split(/[\/\-]/);
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            if (year.length === 4) return `${year}-${month}-${day}`;
          }
          return cleanDate;
        };

        rows.forEach((row) => {
          const cleanRow = row.replace(/\r/g, ''); 
          if (!cleanRow.trim()) return;
          const cols = cleanRow.split(',');
          if (cols[0]?.trim() && cols[1]?.trim()) {
            newStaffDB.push({
              emp_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
              name: cols[0].trim(),
              email: cols[1].trim(),
              password: cols[2]?.trim(),
              contact_number: cols[3]?.trim(),
              department: cols[4]?.trim() || 'IT Department',
              dob: formatToDBDate(cols[5]?.trim()),
              joining_date: formatToDBDate(cols[6]?.trim()),
              status: 'Active'
            });
          }
        });

        try {
          const { error } = await supabase.from('staff').insert(newStaffDB);
          if (error) throw error; 
          alert(`${newStaffDB.length} Staff members uploaded successfully!`);
          setIsBulkModalOpen(false);
          setSelectedFile(null);
          window.location.reload(); 
        } catch (error: any) {
          alert(`Upload Failed: ${error.message || 'Check console'}`);
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsText(selectedFile);
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoaded) return <div className="p-10 text-center font-bold text-gray-500">Loading Database...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" /> Staff & Users
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage employees, credentials, statuses, and assigned assets.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-all">
            <UploadCloud size={18}/> Bulk Upload
          </button>
          <button onClick={handleOpenAdd} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm rounded-xl transition-all">
            <Plus size={18}/> Add Staff
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search Name, ID, or Email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-black">
                <th className="p-4 pl-6">Staff Member</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Department & Dates</th>
                <th className="p-4">Assigned Assets</th>
                <th className="p-4 text-center">Login Status</th>
                <th className="p-4 pr-6 text-center">System Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map((staff) => {
                const assignedAssets = assets.filter(a => a.assignedToEmpId === staff.empId);
                return (
                  <tr key={staff.empId} className={`transition-colors ${staff.isActive ? 'hover:bg-gray-50/50' : 'bg-gray-50/50 opacity-75'}`}>
                    
                    <td className="p-4 pl-6">
                      <Link href={`/admin/staff/${staff.empId}`} className={`font-bold hover:underline inline-flex items-center gap-2 ${staff.isActive ? 'text-blue-600 hover:text-blue-800' : 'text-gray-500'}`}>
                        <UserCheck size={16} className={staff.isActive ? "text-blue-400" : "text-gray-400"} /> {staff.name}
                      </Link>
                      <br/>
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-1 inline-block">{staff.empId}</span>
                    </td>

                    <td className="p-4">
                      <div className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mb-1"><Mail size={12} className="text-gray-400"/> {staff.email}</div>
                      <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Phone size={12} className="text-gray-400"/> {staff.phone || '-'}</div>
                    </td>

                    <td className="p-4">
                      <div className="text-sm font-black text-gray-700">{staff.department}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Joined: {staff.joiningDate || '-'}</div>
                    </td>

                    <td className="p-4">
                      {assignedAssets.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {assignedAssets.map(asset => (
                            <Link key={asset.id} href={`/admin/assets`} className="text-xs font-bold text-gray-700 hover:text-blue-600 hover:underline inline-flex items-center gap-1 w-fit"><Package size={12} className="text-gray-400"/> {asset.name} ({asset.tagId})</Link>
                          ))}
                        </div>
                      ) : <span className="text-xs text-gray-400 font-medium">No assets assigned</span>}
                    </td>

                    <td className="p-4 text-center">
                      <button onClick={() => handleToggleStatus(staff)} title={staff.isActive ? "Disable Login" : "Enable Login"} className={`px-3 py-1 text-[11px] font-black rounded-lg uppercase tracking-wide inline-flex items-center gap-1 transition-all ${staff.isActive ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}>
                        <Power size={12} /> {staff.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    <td className="p-4 pr-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                        staff.role === 'admin' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {staff.role === 'admin' ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                        {staff.role || 'Staff'}
                      </span>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* ADD STAFF MODAL                           */}
      {/* ========================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  <Plus size={20} className="text-blue-600"/> Create Staff Profile
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveStaff} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                
                <h3 className="text-sm font-black text-gray-800 border-b pb-2">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                    <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone Number</label>
                    <input type="tel" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><CalendarDays size={14}/> Date of Birth</label>
                    <input type="date" value={formData.dob || ''} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><CalendarDays size={14}/> Joining Date</label>
                    <input type="date" value={formData.joiningDate || ''} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                </div>

                <h3 className="text-sm font-black text-gray-800 border-b pb-2 pt-2">Account & Login</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Department</label>
                    <select required value={formData.department || ''} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium">
                      <option value="">Select Department...</option>
                      <option value="IT Department">IT Department</option>
                      <option value="Migrations">Migrations</option>
                      <option value="Accounts">Accounts</option>
                      <option value="Edu Calling">Edu Calling</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">System Role</label>
                    <select required value={formData.role || 'staff'} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium">
                      <option value="staff">Standard Staff</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Mail size={14}/> Login Email</label>
                    <input type="email" required placeholder="name@vsit.com" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Lock size={14}/> Login Password</label>
                    <input type="text" placeholder="Assign a secure password" value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                  <div className="flex items-center md:col-span-2 pt-2">
                    <input type="checkbox" id="statusToggle" checked={formData.isActive || false} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"/>
                    <label htmlFor="statusToggle" className="ml-2 text-sm font-bold text-gray-700 cursor-pointer">Account is Active (Can Login)</label>
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                  <button type="submit" disabled={isUploading} className="flex-1 px-4 py-3 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl transition-all">
                    {isUploading ? 'Creating...' : 'Create Staff & Allow Login'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================= */}
      {/* BULK UPLOAD STAFF MODAL                   */}
      {/* ========================================= */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsBulkModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><UploadCloud size={20} className="text-blue-600"/> Bulk Upload Staff</h2>
                <button onClick={() => setIsBulkModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6">
                
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <h3 className="text-sm font-black text-blue-900 mb-1">Need the correct format?</h3>
                  <p className="text-xs text-blue-700 font-medium mb-3">Download the template, fill in your staff details, and upload it below.</p>
                  <button onClick={handleDownloadSample} className="px-4 py-2 bg-white border border-blue-200 text-blue-700 text-xs font-bold rounded-xl shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center gap-2">
                    <Download size={14}/> Download Sample CSV
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload CSV File</label>
                  
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${selectedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <UploadCloud size={32} className={`${selectedFile ? 'text-blue-500' : 'text-gray-400'} mb-2`}/>
                    
                    {selectedFile ? (
                      <span className="text-sm font-black text-blue-700">{selectedFile.name}</span>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-gray-600">Click or drag file to upload</span>
                        <span className="text-xs text-gray-400 font-medium mt-1">.CSV files only</span>
                      </>
                    )}
                    
                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl">Cancel</button>
                  <button 
                    onClick={handleBulkUploadSubmit} 
                    disabled={isUploading || !selectedFile}
                    className={`flex-1 px-4 py-3 text-sm font-bold shadow-sm rounded-xl ${!selectedFile ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {isUploading ? 'Processing...' : 'Process Upload'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}