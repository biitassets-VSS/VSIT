'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Package, UserCheck, Edit, Trash2, Power, X, 
  Plus, UploadCloud, Download, Mail, Phone, CalendarDays, Lock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

// Updated Staff Interface mapped to Supabase Schema
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
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Staff from real DB
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .order('created_at', { ascending: false });

        if (staffError) throw staffError;

        if (staffData) {
          const mappedStaff = staffData.map((dbStaff: any) => ({
            id: dbStaff.id,
            empId: dbStaff.emp_code,
            name: dbStaff.name,
            department: dbStaff.department,
            isActive: dbStaff.status === 'Active',
            email: dbStaff.email,
            password: dbStaff.password || '',
            phone: dbStaff.contact_number || '',
            dob: dbStaff.dob || '',
            joiningDate: dbStaff.joining_date || ''
          }));
          setStaffList(mappedStaff);
        }

        // 2. Fetch Assets to show assignments
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

  // --- ACTIONS (Supabase Synced) ---

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

  const handleDeleteStaff = async (empId: string) => {
    if (window.confirm("Are you sure you want to delete this user? They will no longer be able to log in.")) {
      try {
        const { error } = await supabase.from('staff').delete().eq('emp_code', empId);
        if (error) throw error;
        setStaffList(staffList.filter(staff => staff.empId !== empId));
      } catch (error: any) {
        alert("Failed to delete staff: " + error.message);
      }
    }
  };

  const handleOpenAdd = () => {
    setFormData({ isActive: true, department: 'IT Department' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: Staff) => {
    setFormData(staff);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const dbPayload = {
        name: formData.name,
        department: formData.department,
        contact_number: formData.phone,
        email: formData.email,
        password: formData.password,
        dob: formData.dob,
        joining_date: formData.joiningDate,
        status: formData.isActive ? 'Active' : 'Inactive',
      };

      if (isEditing && formData.empId) {
        // Update existing staff
        const { error } = await supabase.from('staff').update(dbPayload).eq('emp_code', formData.empId);
        if (error) throw error;
        
        setStaffList(staffList.map(s => s.empId === formData.empId ? formData as Staff : s));
        alert("Staff updated successfully!");
      } else {
        // Insert new staff
        const newId = `EMP-${Math.floor(Math.random() * 9000) + 1000}`;
        const newStaffPayload = { ...dbPayload, emp_code: newId };
        
        const { data, error } = await supabase.from('staff').insert([newStaffPayload]).select();
        if (error) throw error;

        if (data) {
          const newStaff: Staff = { ...formData, empId: newId, isActive: formData.isActive || false } as Staff;
          setStaffList([newStaff, ...staffList]);
        }
        alert("Staff created successfully!");
      }
      setIsModalOpen(false);
    } catch (error: any) {
      alert("Error saving staff: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- BULK UPLOAD LOGIC ---

  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Email,Password,Phone,Department,DateOfBirth,JoiningDate\nJane Smith,jane@vsit.com,pass123,1234567890,Accounts,1995-01-01,2023-01-01\nJohn Doe,john@vsit.com,secure789,9876543210,IT Department,1992-05-15,2024-02-10";
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
        const rows = text.split('\n').slice(1); // Skip Header
        const newStaffDB: any[] = [];
        
        // --- HELPER FUNCTION TO FIX DATES FOR SUPABASE ---
        const formatToDBDate = (dateString?: string) => {
          if (!dateString) return undefined;
          const cleanDate = dateString.trim();
          
          // If already YYYY-MM-DD, return as is
          if (cleanDate.includes('-') && cleanDate.split('-')[0].length === 4) {
            return cleanDate;
          }
          
          // If DD/MM/YYYY or DD-MM-YYYY, convert to YYYY-MM-DD
          const parts = cleanDate.split(/[\/\-]/);
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            if (year.length === 4) return `${year}-${month}-${day}`;
          }
          return cleanDate; // Fallback
        };

        rows.forEach((row) => {
          // Remove hidden carriage returns from CSV
          const cleanRow = row.replace(/\r/g, ''); 
          if (!cleanRow.trim()) return;
          
          const cols = cleanRow.split(',');
          const name = cols[0]?.trim();
          const email = cols[1]?.trim();
          const password = cols[2]?.trim();
          const phone = cols[3]?.trim();
          const department = cols[4]?.trim() || 'IT Department';
          const dob = cols[5]?.trim();
          const joiningDate = cols[6]?.trim();

          if (name && email) {
            const staffEntry: any = {
              emp_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
              name: name,
              email: email,
              department: department,
              status: 'Active'
            };

            if (password) staffEntry.password = password;
            if (phone) staffEntry.contact_number = phone;
            if (dob) staffEntry.dob = formatToDBDate(dob);
            if (joiningDate) staffEntry.joining_date = formatToDBDate(joiningDate);

            newStaffDB.push(staffEntry);
          }
        });

        try {
          const { data, error } = await supabase.from('staff').insert(newStaffDB).select();
          
          if (error) {
            console.error("SUPABASE REJECTED UPLOAD:", error);
            throw error; 
          }

          alert(`${newStaffDB.length} Staff members uploaded successfully!`);
          setIsBulkModalOpen(false);
          setSelectedFile(null);
          window.location.reload(); // Refresh to fetch new list from DB
        } catch (error: any) {
          console.error("Full Error Details:", error);
          alert(`Upload Failed: ${error.message || error.details || 'Check console for details'}`);
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
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map((staff) => {
                const assignedAssets = assets.filter(a => a.assignedToEmpId === staff.empId);
                return (
                  <tr key={staff.empId} className={`transition-colors ${staff.isActive ? 'hover:bg-gray-50/50' : 'bg-gray-50/50 opacity-75'}`}>
                    
                    {/* Name & ID */}
                    <td className="p-4 pl-6">
                      <Link href={`/admin/staff/${staff.empId}`} className={`font-bold hover:underline inline-flex items-center gap-2 ${staff.isActive ? 'text-blue-600 hover:text-blue-800' : 'text-gray-500'}`}>
                        <UserCheck size={16} className={staff.isActive ? "text-blue-400" : "text-gray-400"} /> {staff.name}
                      </Link>
                      <br/>
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-1 inline-block">{staff.empId}</span>
                    </td>

                    {/* Contact Info */}
                    <td className="p-4">
                      <div className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mb-1"><Mail size={12} className="text-gray-400"/> {staff.email}</div>
                      <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Phone size={12} className="text-gray-400"/> {staff.phone || '-'}</div>
                    </td>

                    {/* Dept & Dates */}
                    <td className="p-4">
                      <div className="text-sm font-black text-gray-700">{staff.department}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Joined: {staff.joiningDate || '-'}</div>
                    </td>

                    {/* Assigned Assets */}
                    <td className="p-4">
                      {assignedAssets.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {assignedAssets.map(asset => (
                            <Link key={asset.id} href={`/admin/assets`} className="text-xs font-bold text-gray-700 hover:text-blue-600 hover:underline inline-flex items-center gap-1 w-fit"><Package size={12} className="text-gray-400"/> {asset.name} ({asset.tagId})</Link>
                          ))}
                        </div>
                      ) : <span className="text-xs text-gray-400 font-medium">No assets assigned</span>}
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <button onClick={() => handleToggleStatus(staff)} title={staff.isActive ? "Disable Login" : "Enable Login"} className={`px-3 py-1 text-[11px] font-black rounded-lg uppercase tracking-wide inline-flex items-center gap-1 transition-all ${staff.isActive ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}>
                        <Power size={12} /> {staff.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(staff)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteStaff(staff.empId)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* ADD / EDIT STAFF MODAL                    */}
      {/* ========================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  {isEditing ? <Edit size={20} className="text-blue-600"/> : <Plus size={20} className="text-blue-600"/>} 
                  {isEditing ? 'Edit Staff Details' : 'Create Staff Profile'}
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
                  <div className="flex items-center pt-8">
                    <input type="checkbox" id="statusToggle" checked={formData.isActive || false} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"/>
                    <label htmlFor="statusToggle" className="ml-2 text-sm font-bold text-gray-700 cursor-pointer">Account is Active (Can Login)</label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Mail size={14}/> Login Email</label>
                    <input type="email" required placeholder="name@vsit.com" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Lock size={14}/> Login Password</label>
                    <input type="text" placeholder="Assign a secure password" value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                  <button type="submit" disabled={isUploading} className="flex-1 px-4 py-3 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl transition-all">
                    {isUploading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Staff Member')}
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

                {/* Upload Section with File Selection Logic */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload CSV File</label>
                  
                  {/* Connect the onClick to trigger the hidden input */}
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
                    
                    {/* Hidden file input */}
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