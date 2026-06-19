'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Edit, Power, Trash2, Mail, Phone, CalendarDays, 
  Briefcase, Package, ShieldCheck, ShieldAlert, Loader2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface StaffDetail {
  id: string;
  emp_code: string;
  name: string;
  email: string;
  contact_number: string;
  department: string;
  status: string;
  dob: string;
  joining_date: string;
  password?: string;
}

interface AssignedAsset {
  id: string;
  name: string;
  tag_id: string;
  status: string;
}

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const empId = params.id as string;

  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<StaffDetail>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStaffData();
  }, [empId]);

  const fetchStaffData = async () => {
    try {
      // 1. Fetch Staff Details
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('emp_code', empId)
        .single();

      if (staffError) throw staffError;
      setStaff(staffData);

      // 2. Fetch Assigned Assets
      const { data: assetData } = await supabase
        .from('assets')
        .select('id, name, tag_id, status')
        .eq('emp_code', empId);

      if (assetData) setAssets(assetData);
      
    } catch (error) {
      console.error("Error fetching staff details:", error);
      alert("Staff member not found.");
      router.push('/admin/staff');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleToggleStatus = async () => {
    if (!staff) return;
    const newStatus = staff.status === 'Active' ? 'Inactive' : 'Active';
    
    try {
      const { error } = await supabase
        .from('staff')
        .update({ status: newStatus })
        .eq('emp_code', empId);

      if (error) throw error;
      setStaff({ ...staff, status: newStatus });
    } catch (error: any) {
      alert("Failed to update status: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this staff member? This cannot be undone.")) {
      try {
        const { error } = await supabase.from('staff').delete().eq('emp_code', empId);
        if (error) throw error;
        router.push('/admin/staff');
      } catch (error: any) {
        alert("Failed to delete: " + error.message);
      }
    }
  };

  const handleOpenEdit = () => {
    setFormData(staff || {});
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('staff')
        .update(formData)
        .eq('emp_code', empId);

      if (error) throw error;
      
      setStaff(formData as StaffDetail);
      setIsEditModalOpen(false);
      alert("Profile updated successfully!");
    } catch (error: any) {
      alert("Failed to update profile: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!staff) return null;

  const isActive = staff.status === 'Active';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      
      {/* HEADER & BACK BUTTON */}
      <div className="flex items-center justify-between">
        <Link href="/admin/staff" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors">
          <ArrowLeft size={16} /> Back to Staff List
        </Link>
      </div>

      {/* TOP PROFILE CARD */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        
        {/* Decorative Background Element */}
        <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-20 -mr-10 -mt-10 pointer-events-none ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>

        <div className="flex items-center gap-5 z-10">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black shadow-sm border-4 ${isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {staff.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">{staff.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-mono bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-bold">{staff.emp_code}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isActive ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                {staff.status}
              </span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap gap-3 z-10 w-full md:w-auto">
          <button 
            onClick={handleToggleStatus} 
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm ${
              isActive ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
            }`}
          >
            <Power size={18} /> {isActive ? 'Deactivate Login' : 'Activate Login'}
          </button>
          <button 
            onClick={handleOpenEdit} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 text-sm font-bold rounded-xl transition-all shadow-sm"
          >
            <Edit size={18} /> Edit Details
          </button>
          <button 
            onClick={handleDelete} 
            className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-xl transition-all"
            title="Delete Staff"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: Contact & Work Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-gray-800 mb-6 border-b pb-3">Personal & Contact Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2"><Mail size={16} className="text-orange-500" /> {staff.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</p>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2"><Phone size={16} className="text-orange-500" /> {staff.contact_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date of Birth</p>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2"><CalendarDays size={16} className="text-orange-500" /> {staff.dob || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Joining Date</p>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2"><CalendarDays size={16} className="text-orange-500" /> {staff.joining_date || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-gray-800 mb-6 border-b pb-3 flex items-center gap-2">
              <Briefcase className="text-blue-500" /> Work Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Department</p>
                <p className="text-sm font-black text-gray-900">{staff.department}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">System Password</p>
                <p className="text-sm font-mono text-gray-600 bg-gray-50 p-2 rounded border inline-block">{staff.password || '••••••••'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Assigned Assets */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Package className="text-indigo-500" /> Assigned Assets
              </h3>
              <span className="bg-indigo-100 text-indigo-700 font-black text-xs px-2.5 py-1 rounded-full">{assets.length}</span>
            </div>
            
            {assets.length === 0 ? (
              <div className="text-center py-10">
                <Package size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm font-bold text-gray-500">No assets currently assigned.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {assets.map((asset) => (
                  <li key={asset.id} className="bg-gray-50 border border-gray-100 p-3 rounded-xl hover:border-indigo-200 transition-colors">
                    <Link href={`/admin/assets/${asset.id}`} className="block">
                      <p className="text-sm font-black text-gray-900 hover:text-indigo-600">{asset.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-mono text-gray-500">{asset.tag_id}</span>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">{asset.status}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* EDIT MODAL                                */}
      {/* ========================================= */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><Edit size={20} className="text-orange-500"/> Edit Profile</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                    <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Department</label>
                    <select required value={formData.department || ''} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium">
                      <option value="IT Department">IT Department</option>
                      <option value="Migrations">Migrations</option>
                      <option value="Accounts">Accounts</option>
                      <option value="Edu Calling">Edu Calling</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                    <input type="email" required value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone Number</label>
                    <input type="tel" value={formData.contact_number || ''} onChange={(e) => setFormData({...formData, contact_number: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date of Birth</label>
                    <input type="date" value={formData.dob || ''} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Joining Date</label>
                    <input type="date" value={formData.joining_date || ''} onChange={(e) => setFormData({...formData, joining_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"/>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">System Password</label>
                    <input type="text" value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"/>
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-1 px-4 py-3 text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-sm rounded-xl transition-all">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}