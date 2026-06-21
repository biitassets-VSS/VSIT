'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, Search, PlusCircle, UserCheck, UserX, Mail, Shield, 
  Loader2, X, ArrowLeft, Calendar, Phone, Edit, Trash2, Key, Upload, FileSpreadsheet, Building2
} from 'lucide-react';

export default function AdminStaffManagement() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detailed Staff Profile View State
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // Modal Control States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    dob: '',
    joiningDate: '',
    department: 'IT Department',
    role: 'staff',
    email: '',
    password: ''
  });

  // Edit Form Fields State
  const [editFormData, setEditFormData] = useState({
    id: '',
    fullName: '',
    phone: '',
    dob: '',
    joiningDate: '',
    department: 'IT Department',
    role: 'staff',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchStaffProfiles('');
  }, []);

  const fetchStaffProfiles = async (search: string, updateSelectedId?: string) => {
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        const mockData = [
          { id: '1', full_name: 'Mohit Bahuguna', name: 'Mohit Bahuguna', emp_code: 'EMP-7783', email: 'students_app05@outlook.com', phone: '7009173693', dob: '2001-08-11', joining_date: '2023-01-29', department: 'IT Department', password: 'Vsit@2026', role: 'staff', is_active: true },
          { id: '2', full_name: 'Lakhwinder Canberra', name: 'Lakhwinder Canberra', emp_code: 'EMP-002', email: 'migration_canberra.bi@outlook.com', phone: '614000000', dob: '1995-04-12', joining_date: '2022-10-15', department: 'Management', password: 'Vsit@2026', role: 'admin', is_active: false }
        ];
        setProfiles(mockData);
        if (updateSelectedId) {
          const updated = mockData.find(p => p.id === updateSelectedId);
          if (updated) setSelectedProfile(updated);
        }
        setIsLoading(false);
        return;
      }

      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%,emp_code.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProfiles(data || []);

      if (updateSelectedId && data) {
        const updated = data.find(p => p.id === updateSelectedId || p.email === updateSelectedId);
        if (updated) setSelectedProfile(updated);
      }
    } catch (err) {
      console.error('Error tracking staff listings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedProfile || isToggling) return;
    setIsToggling(true);
    const targetNewStatus = !selectedProfile.is_active;

    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        selectedProfile.is_active = targetNewStatus;
        setIsToggling(false);
        return;
      }

      const idLookup = selectedProfile.id;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: targetNewStatus })
        .eq('id', idLookup);

      if (error) throw error;
      
      await fetchStaffProfiles(searchQuery, idLookup);
    } catch (err: any) {
      alert(err.message || "Failed to alter status");
    } finally {
      setIsToggling(false);
    }
  };

  const openEditModal = () => {
    if (!selectedProfile) return;
    setEditFormData({
      id: selectedProfile.id,
      fullName: selectedProfile.full_name || selectedProfile.name || '',
      phone: selectedProfile.phone === 'N/A' ? '' : selectedProfile.phone || '',
      dob: selectedProfile.dob === 'N/A' ? '' : selectedProfile.dob || '',
      joiningDate: selectedProfile.joining_date === 'N/A' ? '' : selectedProfile.joining_date || '',
      department: selectedProfile.department || 'IT Department',
      role: selectedProfile.role || 'staff',
      email: selectedProfile.email || '',
      password: selectedProfile.password || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        const updatedMock = {
          ...selectedProfile,
          full_name: editFormData.fullName,
          name: editFormData.fullName,
          phone: editFormData.phone || 'N/A',
          dob: editFormData.dob || 'N/A',
          joining_date: editFormData.joiningDate || 'N/A',
          department: editFormData.department,
          role: editFormData.role,
          email: editFormData.email,
          password: editFormData.password
        };
        setSelectedProfile(updatedMock);
        setProfiles(prev => prev.map(p => p.id === editFormData.id ? updatedMock : p));
        setIsEditModalOpen(false);
        alert('Demo staff updates saved locally!');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.fullName,
          name: editFormData.fullName,
          email: editFormData.email,
          phone: editFormData.phone || null,
          dob: editFormData.dob || null,
          joining_date: editFormData.joiningDate || null,
          department: editFormData.department,
          password: editFormData.password,
          role: editFormData.role
        })
        .eq('id', editFormData.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      await fetchStaffProfiles(searchQuery, editFormData.id);
      alert('Staff record updated successfully in live database!');
    } catch (err: any) {
      alert(err.message || 'Error updating record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    fetchStaffProfiles(val);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const generatedEmpCode = `EMP-${randomId}`;

      const { error } = await supabase.from('profiles').insert([
        {
          full_name: formData.fullName,
          name: formData.fullName,
          email: formData.email,
          emp_code: generatedEmpCode,
          phone: formData.phone || null,
          dob: formData.dob || null,
          joining_date: formData.joiningDate || null,
          department: formData.department,
          password: formData.password,
          role: formData.role,
          is_active: true
        }
      ]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({
        fullName: '', phone: '', dob: '', joiningDate: '',
        department: 'IT Department', role: 'staff', email: '', password: ''
      });
      fetchStaffProfiles(searchQuery);
    } catch (err: any) {
      alert(err.message || 'Error inserting profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-teal-600 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8 bg-[#F8FAFC] min-h-screen font-sans animate-in fade-in duration-300">
      
      {/* DETAILED PROFILE COMPONENT SCREEN */}
      {selectedProfile ? (
        <div className="space-y-6 max-w-6xl mx-auto animate-in slide-in-from-right duration-200">
          <button 
            onClick={() => setSelectedProfile(null)}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm w-fit"
          >
            <ArrowLeft size={16} /> Back to Staff List
          </button>

          {/* MAIN ACCOUNT HERO BANNER */}
          <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="flex items-center gap-5 w-full sm:w-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-black text-xl flex items-center justify-center shadow-inner uppercase">
                {(selectedProfile.full_name || 'ST').split(' ').map((n:any)=>n[0]).join('').slice(0,2)}
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#002B49]">{selectedProfile.full_name || selectedProfile.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[11px] font-mono font-bold tracking-wide border border-gray-200">{selectedProfile.emp_code}</span>
                  
                  {/* HERO BANNER PREMIUM ACCESS MODIFIER SHIELD */}
                  <button 
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={isToggling}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer select-none shadow-sm ${
                      selectedProfile.is_active 
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:scale-102' 
                        : 'bg-rose-50/80 border-rose-200 text-red-600 hover:bg-rose-100 hover:scale-102'
                    }`}
                  >
                    {isToggling ? <Loader2 size={11} className="animate-spin" /> : selectedProfile.is_active ? <UserCheck size={11} /> : <UserX size={11} />}
                    {selectedProfile.is_active ? 'Active Layer (Access Allowed)' : 'Deactivated / Blocked Session'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button 
                onClick={openEditModal}
                className="flex items-center gap-1.5 px-4 py-2 border border-orange-200 text-orange-600 font-bold text-xs uppercase tracking-wide rounded-xl bg-orange-50/50 hover:bg-orange-50 transition-all"
              >
                <Edit size={14}/> Edit Details
              </button>
              <button className="p-2 border border-gray-200 text-gray-400 hover:text-red-500 bg-white rounded-xl transition-all"><Trash2 size={16}/></button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              
              <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-base font-black text-[#002B49] pb-2 border-b border-gray-50">Personal & Contact Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                  <div className="space-y-1">
                    <p className="text-gray-400 uppercase tracking-wider text-[10px]">Email Address</p>
                    <p className="text-gray-800 flex items-center gap-1.5 font-extrabold text-sm"><Mail size={14} className="text-orange-500" /> {selectedProfile.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 uppercase tracking-wider text-[10px]">Phone Number</p>
                    <p className="text-gray-800 flex items-center gap-1.5 font-extrabold text-sm"><Phone size={14} className="text-orange-500" /> {selectedProfile.phone || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 pt-2">
                    <p className="text-gray-400 uppercase tracking-wider text-[10px]">Date of Birth</p>
                    <p className="text-gray-800 flex items-center gap-1.5 font-extrabold text-sm"><Calendar size={14} className="text-orange-500" /> {selectedProfile.dob || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 pt-2">
                    <p className="text-gray-400 uppercase tracking-wider text-[10px]">Joining Date</p>
                    <p className="text-gray-800 flex items-center gap-1.5 font-extrabold text-sm"><Calendar size={14} className="text-orange-500" /> {selectedProfile.joining_date || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-base font-black text-[#002B49] pb-2 border-b border-gray-50">Work Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                  <div className="space-y-1">
                    <p className="text-gray-400 uppercase tracking-wider text-[10px]">Department</p>
                    <p className="text-gray-800 font-extrabold text-sm flex items-center gap-1.5"><Building2 size={14} className="text-teal-600" /> {selectedProfile.department || 'IT Department'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 uppercase tracking-wider text-[10px]">Live Account Password</p>
                    <div className="flex items-center gap-2 max-w-xs bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 mt-1">
                      <Key size={14} className="text-emerald-600" />
                      <input type="text" readOnly value={selectedProfile.password || 'Vsit@2026'} className="bg-transparent font-mono font-bold text-gray-700 outline-none border-none text-xs w-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 text-center space-y-12">
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <h3 className="text-xs font-black uppercase text-[#002B49] tracking-wider">Assigned Assets</h3>
                <span className="w-5 h-5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full flex items-center justify-center">0</span>
              </div>
              <div className="py-8">
                <div className="text-2xl mx-auto mb-2">📦</div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">No assets currently assigned.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* MAIN USER DIRECTORY */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 gap-4">
            <div>
              <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide flex items-center gap-2">
                <Users className="text-orange-500" size={22} /> Staff Registry & Access Control
              </h1>
              <p className="text-xs text-gray-400 font-bold mt-0.5">Manage corporate user identities, profile bindings, and permissions</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setIsBulkOpen(true)} className="flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all"><FileSpreadsheet size={15} /> Bulk Upload</button>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-1.5 px-4 py-3 bg-[#004D40] hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0"><PlusCircle size={15} /> Add New Staff Member</button>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-4 border border-gray-100 shadow-sm relative max-w-md">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search by name, email, or employee code..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-xl text-sm font-medium text-gray-800 outline-none transition-all" />
          </div>

          {/* MAIN DATA GRID WITH IMPROVED PREMIUM SHIELD BADGE STYLING */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6">
              {profiles.length === 0 ? (
                <div className="text-center py-16"><Users size={40} className="text-gray-300 mx-auto mb-2" /><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">No matching staff users found in directories.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] font-black uppercase text-gray-400 tracking-wider">
                        <th className="pb-3 pl-2">Staff Member / ID</th>
                        <th className="pb-3">Department</th>
                        <th className="pb-3">Contact Email</th>
                        <th className="pb-3">Access Level</th>
                        <th className="pb-3 pr-2 text-right">Access Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                      {profiles.map((user) => (
                        <tr key={user.id || user.email} onClick={() => setSelectedProfile(user)} className="hover:bg-gray-50/60 transition-colors cursor-pointer group">
                          <td className="py-4 pl-2 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 font-black text-xs text-[#002B49] flex items-center justify-center border border-slate-200 uppercase">{(user.full_name || user.name || 'ST').slice(0, 2)}</div>
                            <div>
                              <p className="font-extrabold text-gray-900 group-hover:text-orange-500 transition-colors">{user.full_name || user.name}</p>
                              <p className="text-[10px] font-mono font-bold text-orange-600 mt-0.5">{user.emp_code || 'EMP-7783'}</p>
                            </div>
                          </td>
                          
                          {/* 🌟 PREMIUM REFINED DEPARTMENT SHIELD TYPE BADGE */}
                          <td className="py-4 text-xs">
                            <span className="px-2.5 py-1 bg-teal-50/70 border border-teal-200/50 text-teal-800 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                              <Building2 size={11} className="text-teal-600" />
                              {user.department || 'IT Department'}
                            </span>
                          </td>
                          
                          <td className="py-4 text-xs font-bold text-gray-500">{user.email}</td>
                          <td className="py-4 text-xs">
                            <span className="px-2.5 py-0.5 rounded-md font-black uppercase text-[10px] tracking-wide border bg-slate-50 text-slate-700 border-slate-200">
                              {user.role || 'staff'}
                            </span>
                          </td>
                          
                          {/* 🌟 TRANSOM TRANSPARENT SECURE GLOW STATUS STRIP PIPES */}
                          <td className="py-4 pr-2 text-right">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm ${
                              user.is_active 
                                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700' 
                                : 'bg-rose-50/80 border-rose-200 text-rose-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                              {user.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* CREATE STAFF MODAL POPUP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleCreateStaff} className="bg-white rounded-3xl max-w-xl w-full p-6 border border-gray-100 shadow-2xl space-y-5 my-8 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100"><h3 className="text-base font-black uppercase text-[#002B49] flex items-center gap-1.5"><span className="text-emerald-600 font-normal text-xl">+</span> Create Staff Profile</h3><button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={18}/></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label><input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="e.g. Mohit Bahuguna" className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-600 text-gray-800" /></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</label><input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. 7009173693" className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-600 text-gray-800" /></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Date of Birth</label><input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-600 text-gray-700" /></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Joining Date</label><input type="date" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-600 text-gray-700" /></div>
            </div>
            <div className="pt-2 border-t border-gray-50">
              <h4 className="text-xs font-black text-teal-700 uppercase tracking-wider mb-3">Account & Login</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Department</label><select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none"><option value="IT Department">IT Department</option><option value="HR Department">HR Department</option><option value="Management">Management</option></select></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">System Role</label><select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none"><option value="staff">Standard Staff</option><option value="admin">Administrator Layer</option></select></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Login Email</label><input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="name@vsit.com" className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-600 text-gray-800" /></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Login Password</label><input type="text" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Assign a secure password" className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-600 text-gray-800" /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
              <button type="button" onClick={() => setIsModalOpen(false)} className="py-3 bg-gray-100 hover:bg-gray-200 font-bold text-xs uppercase tracking-wider rounded-xl text-gray-700 transition-all">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="py-3 bg-[#004D40] hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2">{isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Create Staff Member'}</button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT STAFF POPUP MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleUpdateStaff} className="bg-white rounded-3xl max-w-xl w-full p-6 border border-gray-100 shadow-2xl space-y-5 my-8 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 text-orange-600">
              <h3 className="text-base font-black uppercase flex items-center gap-1.5"><Edit size={16}/> Update Profile Information</h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label><input type="text" required value={editFormData.fullName} onChange={e => setEditFormData({...editFormData, fullName: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-500 text-gray-800" /></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</label><input type="text" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} placeholder="Provide number" className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-500 text-gray-800" /></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Date of Birth</label><input type="date" value={editFormData.dob} onChange={e => setEditFormData({...editFormData, dob: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-500 text-gray-700" /></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Joining Date</label><input type="date" value={editFormData.joiningDate} onChange={e => setEditFormData({...editFormData, joiningDate: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-500 text-gray-700" /></div>
            </div>
            <div className="pt-2 border-t border-gray-50">
              <h4 className="text-xs font-black text-orange-600 uppercase tracking-wider mb-3">Work & Credentials Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Department</label><select value={editFormData.department} onChange={e => setEditFormData({...editFormData, department: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none"><option value="IT Department">IT Department</option><option value="HR Department">HR Department</option><option value="Management">Management</option></select></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">System Role</label><select value={editFormData.role} onChange={e => setEditFormData({...editFormData, role: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none"><option value="staff">Standard Staff</option><option value="admin">Administrator Layer</option></select></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Login Email</label><input type="email" required value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-500 text-gray-800" /></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Login Password</label><input type="text" required value={editFormData.password} onChange={e => setEditFormData({...editFormData, password: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-500 text-gray-800" /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="py-3 bg-gray-100 hover:bg-gray-200 font-bold text-xs uppercase tracking-wider rounded-xl text-gray-700 transition-all">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="py-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2">{isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Save Updates'}</button>
            </div>
          </form>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {isBulkOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl max-w-md w-full p-6 border border-gray-100 shadow-2xl space-y-4"><div className="flex justify-between items-center pb-2 border-b border-gray-100"><h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2"><Upload size={16} className="text-orange-500" /> Bulk Provisioning Pipeline</h3><button type="button" onClick={() => setIsBulkOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={18}/></button></div><div className="p-4 bg-orange-50/50 border border-orange-100 text-[11px] font-bold text-orange-800 rounded-xl space-y-1"><p className="font-black uppercase tracking-wide">Expected Schema Header:</p><p className="font-mono text-gray-600 break-all">full_name, phone, dob, joining_date, department, email, password</p></div><div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center bg-gray-50 relative cursor-pointer hover:bg-gray-100/50 transition-colors"><FileSpreadsheet className="mx-auto text-gray-400 mb-2" size={32} /><p className="text-xs text-gray-600 font-extrabold">Drop CSV / Spreadsheet Document here</p><input type="file" accept=".csv,.xlsx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={() => { alert('Bulk configuration loaded!'); setIsBulkOpen(false); }} /></div></div></div>
      )}

    </div>
  );
}