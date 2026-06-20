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

  // Checkbox & Activation States
  const [showLoginSetup, setShowLoginSetup] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<StaffDetail>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!empId) return;

    const fetchStaffData = async () => {
      try {
        // 1. Fetch Staff Data
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('emp_code', empId)
          .single();

        if (staffError) throw staffError;
        setStaff(staffData);
        if (staffData?.password) setPasswordInput(staffData.password);

        // 2. Check if they exist in Profiles table
        if (staffData?.email) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', staffData.email)
            .maybeSingle();
          
          if (profileData) setHasProfile(true);
        }

        // 3. Fetch Assigned Assets
        const { data: assetsData } = await supabase
          .from('assets')
          .select('id, name, tag_id')
          .eq('emp_code', empId);

        if (assetsData) setAssets(assetsData);

      } catch (error) {
        console.error("Error fetching staff details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaffData();
  }, [empId]);

  const isAccessGranted = staff?.status === 'Active' && hasProfile;

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
      // 1. Update main Staff table
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

      // 2. Update Profiles table (if they have login access)
      if (hasProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: editFormData.name,
            full_name: editFormData.name,
          })
          .eq('emp_code', staff.emp_code);
          
        if (profileError) throw new Error(profileError.message);
      }

      // Update UI instantly
      setStaff({ ...staff, ...editFormData } as StaffDetail);
      if (editFormData.password) setPasswordInput(editFormData.password);

      alert("Staff details updated successfully!");
      setIsEditModalOpen(false);
    } catch (error: any) {
      alert("Error updating staff: " + (error.message || "Unknown Error"));
    } finally {
      setIsUpdating(false);
    }
  };

  // --- HANDLER: DEACTIVATE LOGIN ---
  const handleDeactivateLogin = async () => {
    if (!staff || !confirm("Are you sure you want to deactivate login access for this staff member?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('staff').update({ status: 'Inactive' }).eq('emp_code', staff.emp_code);
      if (error) throw new Error(error.message);
      
      setStaff({ ...staff, status: 'Inactive' });
      setShowLoginSetup(false);
    } catch (error: any) {
      alert("Error deactivating: " + (error.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLER: GRANT LOGIN ACCESS ---
  const handleEnableLogin = async () => {
    if (!staff || !staff.email) return alert("Staff member must have a valid email address.");
    
    const cleanEmail = staff.email.trim();
    const cleanPassword = passwordInput.trim();

    if (!cleanPassword || cleanPassword.length < 6) {
      return alert("Supabase requires passwords to be at least 6 characters long.");
    }
    
    setIsProcessing(true);
    try {
      // 1. Create Supabase Auth User (Silently)
      const authClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { error: authError } = await authClient.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
      });

      // Safely parse Supabase Auth Errors
      if (authError) {
        const errorMsg = authError.message || String(authError);
        
        // If the user already exists in the Auth tab from previous testing, we ignore the error and force activation!
        const isAlreadyRegistered = errorMsg.toLowerCase().includes('already registered') || errorMsg.toLowerCase().includes('user already exists');
        
        if (!isAlreadyRegistered) {
          throw new Error(`Auth Error: ${errorMsg}`);
        }
      }

      // 2. Save to Profiles Table
      const { error: profileError } = await supabase.from('profiles').upsert({
        email: cleanEmail,
        name: staff.name,
        full_name: staff.name,
        emp_code: staff.emp_code,
        role: 'staff'
      });

      if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`);

      // 3. Update Staff Status & Password
      const { error: staffUpdateError } = await supabase.from('staff').update({ 
        status: 'Active', 
        password: cleanPassword 
      }).eq('emp_code', staff.emp_code);

      if (staffUpdateError) throw new Error(`Staff update failed: ${staffUpdateError.message}`);

      // Success Updates
      setHasProfile(true);
      setStaff({ ...staff, status: 'Active', password: cleanPassword });
      setShowLoginSetup(false);
      alert("Login access granted successfully!");

    } catch (error: any) {
      console.error("Full Login Grant Error:", error);
      alert("Error granting access: " + (error.message || "Unknown error occurred."));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLER: DELETE STAFF ---
  const handleDeleteStaff = async () => {
    if (!staff || !confirm("Are you sure you want to completely delete this staff member? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from('staff').delete().eq('emp_code', staff.emp_code);
      if (error) throw new Error(error.message);
      router.push('/admin/staff');
    } catch (error: any) {
      alert("Error deleting staff: " + (error.message || "Unknown error"));
    }
  };

  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-[#006456]" /></div>;
  if (!staff) return <div className="p-10 text-center font-bold text-gray-500">Staff member not found.</div>;

  const initials = staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 sm:px-0 pt-4">
      
      {/* Back Link */}
      <Link href="/admin/staff" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors w-fit">
        <ArrowLeft size={16} /> Back to Staff List
      </Link>

      {/* ========================================== */}
      {/* HEADER CARD                                */}
      {/* ========================================== */}
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
                  <ShieldCheck size={14} /> ACTIVE
                </span>
              ) : (
                <span className="bg-red-50 text-red-700 font-black text-xs px-2.5 py-1 rounded-md border border-red-200 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  <ShieldAlert size={14} /> DEACTIVATED
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
          {isAccessGranted && (
            <button onClick={handleDeactivateLogin} disabled={isProcessing} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-bold rounded-xl transition-all">
              {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Power size={16}/>} Deactivate Login
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
        
        {/* ========================================== */}
        {/* LEFT COLUMN: DETAILS & LOGIN CONTROLS      */}
        {/* ========================================== */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CARD 1: Personal & Contact Info */}
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

          {/* CARD 2: Work Information */}
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
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">System Password</p>
                  <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 max-w-[200px] flex items-center gap-2">
                    <Lock size={14} className="text-gray-400"/>
                    {staff.password}
                  </div>
                </div>
              )}
            </div>

            {!isAccessGranted && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <input 
                    type="checkbox" 
                    id="enableLogin" 
                    checked={showLoginSetup} 
                    onChange={e => setShowLoginSetup(e.target.checked)} 
                    className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer" 
                  />
                  <label htmlFor="enableLogin" className="text-sm font-black text-[#002B49] cursor-pointer tracking-wide">
                    Account is Active (Can Login Staff User)
                  </label>
                </div>
                
                {showLoginSetup && (
                  <div className="mt-4 p-5 border border-teal-100 bg-teal-50/50 rounded-xl space-y-4 animate-in fade-in zoom-in duration-300">
                    <div>
                      <label className="block text-xs font-black text-teal-800 uppercase mb-2 tracking-wide">Assign Login Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                        <input 
                          type="text" 
                          value={passwordInput} 
                          onChange={e => setPasswordInput(e.target.value)} 
                          placeholder="Type a secure password (min 6 characters)..." 
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-teal-200 outline-none focus:border-teal-500 text-sm font-bold shadow-sm bg-white"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleEnableLogin} 
                      disabled={isProcessing} 
                      className="w-full py-3.5 bg-[#006456] hover:bg-teal-800 text-white font-black text-sm rounded-xl transition-colors shadow-sm flex justify-center items-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><ShieldCheck size={18}/> Save Profile & Grant Login Access</>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT COLUMN: ASSIGNED ASSETS              */}
        {/* ========================================== */}
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
                  <Link key={asset.id} href="/admin/assets" className="block p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-teal-300 hover:shadow-sm transition-all group">
                    <h4 className="text-sm font-black text-[#002B49] group-hover:text-teal-700 transition-colors">{asset.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{asset.tag_id}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* EDIT STAFF MODAL                            */}
      {/* ========================================= */}
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
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-wide">Full Name</label>
                    <input type="text" required value={editFormData.name || ''} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold"/>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-wide">Phone Number</label>
                    <input type="tel" value={editFormData.contact_number || ''} onChange={(e) => setEditFormData({...editFormData, contact_number: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold"/>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-wide flex items-center gap-1.5"><CalendarDays size={14}/> Date of Birth</label>
                    <input type="date" value={editFormData.dob || ''} onChange={(e) => setEditFormData({...editFormData, dob: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold"/>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-wide flex items-center gap-1.5"><CalendarDays size={14}/> Joining Date</label>
                    <input type="date" value={editFormData.joining_date || ''} onChange={(e) => setEditFormData({...editFormData, joining_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold"/>
                  </div>
                </div>

                <h3 className="text-sm font-black text-[#002B49] border-b border-gray-100 pb-2 pt-2">Work Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-wide">Department</label>
                    <select required value={editFormData.department || ''} onChange={(e) => setEditFormData({...editFormData, department: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold">
                      <option value="">Select Department...</option>
                      <option value="IT Department">IT Department</option>
                      <option value="Migrations">Migrations</option>
                      <option value="Accounts">Accounts</option>
                      <option value="Edu Calling">Edu Calling</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-wide flex items-center gap-1.5"><Lock size={14}/> Update System Password</label>
                    <input type="text" placeholder="Assign a new secure password" value={editFormData.password || ''} onChange={(e) => setEditFormData({...editFormData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold"/>
                    <p className="text-[10px] text-gray-400 mt-1 font-bold italic">*Note: This only updates the directory password record.</p>
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