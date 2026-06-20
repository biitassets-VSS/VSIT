'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  ArrowLeft, Mail, Phone, CalendarDays, 
  Power, Edit, Trash2, Package, ShieldCheck, ShieldAlert, Loader2, Lock, Briefcase, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface StaffDetail {
  id: string;
  emp_code: string;
  name: string;
  department: string;
  status: string;
  email: string;
  password?: string;
  contact_number: string;
  dob?: string;
  joining_date?: string;
}

interface Asset {
  id: string;
  name: string;
  tag_id: string;
}

export default function StaffProfileView() {
  const params = useParams();
  const router = useRouter();
  const empId = params?.empId as string;

  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Explicit diagnostic state strings to bypass {} stringify issue
  const [errorDetails, setErrorDetails] = useState<string>('');

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<StaffDetail>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchStaffData = async () => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('emp_code', empId)
        .single();

      if (staffError) throw staffError;
      setStaff(staffData);

      if (staffData?.email) {
        const cleanEmail = staffData.email.trim().toLowerCase();
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();
        
        if (profileData) setHasProfile(true);
      }

      const { data: assetsData } = await supabase
        .from('assets')
        .select('id, name, tag_id')
        .eq('emp_code', empId);

      if (assetsData) setAssets(assetsData);

    } catch (error: any) {
      console.error("Error loading profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (empId) {
      fetchStaffData();
    }
  }, [empId]);

  const isAccessGranted = staff?.status === 'Active' && hasProfile;

  const handleSyncAccount = async () => {
    if (!staff || !staff.email) return alert("Valid email required.");
    setIsProcessing(true);
    setErrorDetails('');

    try {
      const cleanEmail = staff.email.replace(/\s+/g, '').toLowerCase(); 
      const loginPassword = (staff.password || `Vsit@2026`).replace(/\s+/g, '');

      if (loginPassword.length < 6) {
        setErrorDetails("Password Validation: Length must be at least 6 characters.");
        setIsProcessing(false);
        return;
      }

      const authClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: cleanEmail,
        password: loginPassword,
      });

      let authUserId = authData?.user?.id;

      if (authError) {
        // Direct string property inspection to unmask native engine errors
        const detailedMsg = authError.message || authError.status?.toString() || "Unknown Auth Error";
        
        if (detailedMsg.toLowerCase().includes('already registered') || detailedMsg.toLowerCase().includes('exists')) {
          const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
          if (existingProfile?.id) {
            authUserId = existingProfile.id;
          } else {
            setErrorDetails(`Auth Block: User account exists in Authentication -> Users dashboard but has no profile row. Please remove the email address "${cleanEmail}" from your Supabase Auth dashboard, then try again.`);
            setIsProcessing(false);
            return;
          }
        } else {
          setErrorDetails(`Supabase Auth Core Rejection: ${detailedMsg}`);
          setIsProcessing(false);
          return;
        }
      }

      if (!authUserId) {
        setErrorDetails("Data Alignment Issue: Auth user creation did not return a valid unique ID.");
        setIsProcessing(false);
        return;
      }

      // Insert target row into profiles
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authUserId,
        email: cleanEmail,
        name: staff.name,
        full_name: staff.name,
        emp_code: staff.emp_code,
        role: 'staff'
      });

      if (profileError) {
        setErrorDetails(`Profiles Table Policy Block (RLS): ${profileError.message || 'Row Level Security violation'}`);
        setIsProcessing(false);
        return;
      }

      // Sync active tracking directory state
      const { error: staffUpdateError } = await supabase
        .from('staff')
        .update({ status: 'Active', password: loginPassword, email: cleanEmail })
        .eq('emp_code', staff.emp_code);

      if (staffUpdateError) {
        setErrorDetails(`Staff Table Directory Update Failed: ${staffUpdateError.message}`);
        setIsProcessing(false);
        return;
      }
      
      alert("Account activated successfully!");
      fetchStaffData();
    } catch (error: any) {
      setErrorDetails(`Execution exception intercepted: ${error?.message || 'Check browser developer tools console tab'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLER: OPEN EDIT MODAL ---
  const handleOpenEdit = () => {
    if (!staff) return;
    setEditFormData({
      name: staff.name,
      contact_number: staff.contact_number,
      dob: staff.dob,
      joining_date: staff.joining_date,
      department: staff.department,
      password: staff.password,
    });
    setIsEditModalOpen(true);
  };

  // --- HANDLER: SAVE EDITED STAFF ---
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setIsUpdating(true);

    try {
      const { error: staffError } = await supabase
        .from('staff')
        .update({
          name: editFormData.name,
          contact_number: editFormData.contact_number,
          dob: editFormData.dob,
          joining_date: editFormData.joining_date,
          department: editFormData.department,
          password: editFormData.password,
        })
        .eq('emp_code', staff.emp_code);

      if (staffError) throw new Error(staffError.message);

      if (hasProfile) {
        await supabase
          .from('profiles')
          .update({
            name: editFormData.name,
            full_name: editFormData.name,
          })
          .eq('emp_code', staff.emp_code);
      }

      setStaff({ ...staff, ...editFormData } as StaffDetail);
      alert("Staff details updated successfully!");
      setIsEditModalOpen(false);
      fetchStaffData();
    } catch (error: any) {
      alert("Error updating staff: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeactivateLogin = async () => {
    if (!staff || !confirm("Are you sure you want to deactivate login access?")) return;
    try {
      await supabase.from('staff').update({ status: 'Inactive' }).eq('emp_code', staff.emp_code);
      setStaff({ ...staff, status: 'Inactive' });
      fetchStaffData();
    } catch (error: any) {
      alert("Error deactivating: " + error.message);
    }
  };

  const handleDeleteStaff = async () => {
    if (!staff || !confirm("Are you sure you want to completely delete this staff member? This cannot be undone.")) return;
    try {
      await supabase.from('staff').delete().eq('emp_code', staff.emp_code);
      router.push('/admin/staff');
    } catch (error: any) {
      alert("Error deleting staff: " + error.message);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-[#006456]" /></div>;
  if (!staff) return <div className="p-10 text-center font-bold text-gray-500">Staff member not found.</div>;

  const initials = staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 sm:px-0 pt-4">
      
      <Link href="/admin/staff" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors w-fit">
        <ArrowLeft size={16} /> Back to Staff List
      </Link>

      {/* 🚨 VISIBLE TEXT LOG SYSTEM 🚨 */}
      {errorDetails && (
        <div className="bg-red-50 border-2 border-red-500 p-5 rounded-2xl shadow-sm text-red-900">
          <p className="font-black uppercase tracking-wide text-red-700 mb-2">Sync Diagnostic Log:</p>
          <div className="font-mono text-xs bg-white p-3 rounded-xl border border-red-200 whitespace-pre-wrap">
            {errorDetails}
          </div>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-96 h-96 opacity-10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2 ${isAccessGranted ? 'bg-green-500' : 'bg-red-500'}`} />

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-20 h-20 bg-[#e6f7eb] text-[#008a4b] font-black text-2xl rounded-full flex items-center justify-center border-4 border-green-50 shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#002B49] mb-2 tracking-tight">{staff.name}</h1>
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 text-gray-600 font-bold text-xs px-2.5 py-1 rounded-md border border-gray-200 uppercase tracking-wider">
                {staff.emp_code}
              </span>
              
              {isAccessGranted ? (
                <span className="bg-[#e6f7eb] text-[#008a4b] font-black text-xs px-2.5 py-1 rounded-md border border-green-200 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck size={14} /> ACTIVE LOGIN
                </span>
              ) : (
                <span className="bg-red-50 text-red-700 font-black text-xs px-2.5 py-1 rounded-md border border-red-200 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  <ShieldAlert size={14} /> CONFIGURING
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
          {!isAccessGranted && (
            <button onClick={handleSyncAccount} disabled={isProcessing} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl transition-all shadow-sm">
              {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <ShieldCheck size={16}/>} Activate & Sync Account
            </button>
          )}
          {isAccessGranted && (
            <button onClick={handleDeactivateLogin} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-bold rounded-xl transition-all">
              <Power size={16}/> Deactivate Login
            </button>
          )}
          <button onClick={handleOpenEdit} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 text-sm font-bold rounded-xl transition-all">
            <Edit size={16}/> Edit Details
          </button>
          <button onClick={handleDeleteStaff} className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-400 hover:text-red-600 rounded-xl transition-all">
            <Trash2 size={18}/>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-[#002B49] mb-6 border-b border-gray-100 pb-3">Personal & Contact Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Email Address</p>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Mail size={16} className="text-orange-500" /> {staff.email}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</p>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Phone size={16} className="text-orange-500" /> {staff.contact_number || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Date of Birth</p>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CalendarDays size={16} className="text-orange-500" /> {staff.dob || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Joining Date</p>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CalendarDays size={16} className="text-orange-500" /> {staff.joining_date || '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-[#002B49] mb-6 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Briefcase className="text-blue-600" size={20}/> Work Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Department</p>
                <p className="text-sm font-bold text-gray-900">{staff.department}</p>
              </div>
              {staff.password && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Live Account Password</p>
                  <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 max-w-[240px] flex items-center gap-2">
                    <Lock size={14} className="text-[#008a4b]"/>
                    <span className="font-mono text-xs">{staff.password}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100 h-full min-h-[300px]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-lg font-black text-[#002B49] flex items-center gap-2">
                <Package className="text-blue-600" size={20}/> Assigned Assets
              </h2>
              <span className="w-6 h-6 bg-blue-50 text-blue-600 font-black text-xs rounded-full flex items-center justify-center">
                {assets.length}
              </span>
            </div>

            {assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center mt-12 opacity-60">
                <Package size={48} className="text-gray-300 mb-3" strokeWidth={1} />
                <p className="text-sm font-bold text-gray-500">No assets currently assigned.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset.id} className="block p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <h4 className="text-sm font-black text-[#002B49]">{asset.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{asset.tag_id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-[24px] shadow-2xl overflow-hidden border border-gray-100">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-[#002B49] flex items-center gap-2">
                  <Edit size={20} className="text-orange-500"/> Edit Staff Details
                </h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleUpdateStaff} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <h3 className="text-sm font-black text-[#002B49] border-b border-gray-100 pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Full Name</label>
                    <input type="text" required value={editFormData.name || ''} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold"/>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Phone Number</label>
                    <input type="tel" value={editFormData.contact_number || ''} onChange={(e) => setEditFormData({...editFormData, contact_number: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold"/>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2"><CalendarDays size={14}/> Date of Birth</label>
                    <input type="date" value={editFormData.dob || ''} onChange={(e) => setEditFormData({...editFormData, dob: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold"/>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2"><CalendarDays size={14}/> Joining Date</label>
                    <input type="date" value={editFormData.joining_date || ''} onChange={(e) => setEditFormData({...editFormData, joining_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold"/>
                  </div>
                </div>

                <h3 className="text-sm font-black text-[#002B49] border-b border-gray-100 pb-2 pt-2">Work Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Department</label>
                    <input type="text" required value={editFormData.department || ''} onChange={(e) => setEditFormData({...editFormData, department: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold"/>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2"><Lock size={14}/> Update System Password</label>
                    <input type="text" value={editFormData.password || ''} onChange={(e) => setEditFormData({...editFormData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold"/>
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-3.5 text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                  <button type="submit" disabled={isUpdating} className="flex-1 px-4 py-3.5 text-sm font-black bg-orange-600 text-white hover:bg-orange-700 shadow-sm rounded-xl transition-all flex justify-center">
                    {isUpdating ? 'Saving...' : 'Save Changes'}
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