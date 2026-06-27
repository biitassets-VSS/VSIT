'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  X, Edit2, Printer, Search, User, 
  Package, Wrench, Trash2, CheckCircle2, Loader2, UserMinus
} from 'lucide-react';

export default function AssetDetailModal({ asset, onClose, onUpdate }: any) {
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State Management
  const [logisticsState, setLogisticsState] = useState(asset?.status || 'In Stock');
  const [assignedUser, setAssignedUser] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStaffAndPreload();
  }, [asset]);

  const fetchStaffAndPreload = async () => {
    setLoading(true);
    try {
      // 1. Fetch all staff for the search dropdown
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, emp_code, status').eq('status', 'Active');
      if (profiles) setStaffList(profiles);

      // 2. If asset is already assigned, find that user's full details
      if (asset?.assigned_to && profiles) {
        const foundUser = profiles.find(p => p.id === asset.assigned_to);
        if (foundUser) setAssignedUser(foundUser);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter staff based on Name or Auto-Generated EMP Code
  const filteredStaff = staffList.filter(s => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    return (s.full_name?.toLowerCase().includes(q) || s.emp_code?.toLowerCase().includes(q));
  });

  const handleStateChange = (newState: string) => {
    setLogisticsState(newState);
    // If we mark it as anything other than 'Assigned', we automatically clear the user
    if (newState !== 'Assigned') {
      setAssignedUser(null);
      setSearchQuery('');
    }
  };

  const handleSelectStaff = (staff: any) => {
    setAssignedUser(staff);
    setLogisticsState('Assigned');
    setSearchQuery('');
  };

  const handleUnassign = () => {
    setAssignedUser(null);
    setLogisticsState('In Stock'); // Unassigning defaults back to In Stock
  };

  const handleCommitChanges = async () => {
    setIsSaving(true);
    try {
      const payload = {
        status: logisticsState,
        assigned_to: assignedUser ? assignedUser.id : null,
      };

      const { error } = await supabase.from('assets').update(payload).eq('id', asset.id);
      if (error) throw error;
      
      alert('Asset updated successfully!');
      if (onUpdate) onUpdate(); // Refresh the parent table
      onClose();
    } catch (err: any) {
      alert(`Failed to update asset: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getLogisticsColor = (state: string) => {
    switch (state?.toUpperCase()) {
      case 'ASSIGNED': return 'bg-emerald-100 text-emerald-800';
      case 'IN STOCK': return 'bg-blue-100 text-blue-800';
      case 'REPAIR': return 'bg-amber-100 text-amber-800';
      case 'DISCARDED': return 'bg-rose-100 text-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-5xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* LEFT COLUMN: IDENTIFICATION */}
        <div className="w-full md:w-1/3 bg-slate-50 p-8 flex flex-col items-center border-r border-slate-100">
          <h2 className="text-xl font-black text-[#002B49] tracking-widest mb-6 uppercase">VSS</h2>
          
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-6 w-full max-w-[240px] aspect-square flex items-center justify-center">
             {/* Replace with your actual QR code logic/image */}
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${asset?.asset_tag || 'NO-TAG'}`} alt="QR" className="w-full h-full object-contain mix-blend-multiply opacity-90"/>
          </div>

          <div className="bg-[#0b132b] text-white w-full py-4 rounded-2xl text-center shadow-lg shadow-[#0b132b]/20 mb-3">
            <span className="text-lg font-black tracking-widest">{asset?.asset_tag || 'VS-TAG-UNKNOWN'}</span>
          </div>
          <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-auto">
            S/N: {asset?.serial_number || 'N/A'}
          </span>

          <button className="mt-8 w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2">
            <Printer size={16}/> Print Sticker
          </button>
        </div>

        {/* RIGHT COLUMN: DATA & WORKBENCH */}
        <div className="w-full md:w-2/3 p-8 flex flex-col bg-white max-h-[85vh] overflow-y-auto custom-scrollbar">
          
          {/* HEADER */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logistics State:</span>
              <span className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${getLogisticsColor(logisticsState)}`}>
                {logisticsState}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                <Edit2 size={14}/> Edit Record
              </button>
              <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors">
                <X size={18}/>
              </button>
            </div>
          </div>

          {/* ASSET DATA GRID */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Category</p>
              <p className="text-sm font-black text-blue-600">{asset?.category || 'Laptop'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Serial Number (S/N)</p>
              <p className="text-xs font-black text-slate-800 break-all">{asset?.serial_number || 'N/A'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Brand</p>
              <p className="text-sm font-black text-slate-800">{asset?.brand || 'Lenovo'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Assets Name</p>
              <p className="text-sm font-black text-slate-800 truncate">{asset?.asset_name || asset?.model || 'Thinkbook 16S'}</p>
            </div>
          </div>

          {/* DATES & INSPECTION */}
          <div className="grid grid-cols-3 gap-4 mb-8 border-b border-slate-100 pb-8">
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-purple-600 mb-1">Purchase Date</p>
              <p className="text-sm font-bold text-slate-800">{asset?.purchase_date || 'N/A'}</p>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-purple-600 mb-1">Warranty Date</p>
              <p className="text-sm font-bold text-slate-800">{asset?.warranty_date || 'N/A'}</p>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-purple-600 mb-1">Inspection Status</p>
              <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded uppercase tracking-wider mt-0.5">
                {asset?.inspection_status || 'Pending'}
              </span>
            </div>
          </div>

          {/* 🌟 NEW: ACTION WORKBENCH */}
          <div className="mt-auto bg-slate-50 p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Action Workbench</h3>
              
              {/* Quick State Toggles */}
              <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200">
                <button onClick={() => handleStateChange('In Stock')} className={`p-2 rounded-lg transition-all ${logisticsState === 'In Stock' ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-50'}`} title="Move to Stock">
                  <Package size={16} />
                </button>
                <button onClick={() => handleStateChange('Assigned')} className={`p-2 rounded-lg transition-all ${logisticsState === 'Assigned' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`} title="Assign to Staff">
                  <User size={16} />
                </button>
                <button onClick={() => handleStateChange('Repair')} className={`p-2 rounded-lg transition-all ${logisticsState === 'Repair' ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:bg-slate-50'}`} title="Send to Repair">
                  <Wrench size={16} />
                </button>
                <button onClick={() => handleStateChange('Discarded')} className={`p-2 rounded-lg transition-all ${logisticsState === 'Discarded' ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:bg-slate-50'}`} title="Discard Asset">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* If state is ASSIGNED, show the Staff Search OR the Selected User */}
            {logisticsState === 'Assigned' && (
              <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm shadow-blue-100 relative">
                
                {!assignedUser ? (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Search Staff Directory</p>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by Employee Name or EMP Code (e.g. 1001)..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold outline-none transition-all"
                      />
                    </div>

                    {/* SEARCH RESULTS DROPDOWN */}
                    {searchQuery && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-10 max-h-[200px] overflow-y-auto">
                        {loading && <p className="p-4 text-xs font-bold text-slate-400 flex gap-2"><Loader2 className="animate-spin" size={14}/> Fetching...</p>}
                        {!loading && filteredStaff.length === 0 && <p className="p-4 text-xs font-bold text-slate-400">No staff found matching "{searchQuery}"</p>}
                        
                        {filteredStaff.map(staff => (
                          <div key={staff.id} onClick={() => handleSelectStaff(staff)} className="p-3 border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between">
                            <div>
                              <p className="text-sm font-black text-slate-900">{staff.full_name}</p>
                              <p className="text-[10px] font-bold text-slate-500">{staff.email}</p>
                            </div>
                            <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-black border border-slate-200">
                              {staff.emp_code}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  // DISPLAY SELECTED/ASSIGNED USER
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Assigned Employee Holder:</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                          {assignedUser.full_name?.charAt(0) || <User size={16}/>}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{assignedUser.full_name}</p>
                          <p className="text-[10px] font-bold text-slate-500">{assignedUser.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-black border border-slate-200">
                        {assignedUser.emp_code || 'N/A'}
                      </span>
                      <button onClick={handleUnassign} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors">
                        <UserMinus size={12}/> Unassign (To Stock)
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* SAVE BUTTON */}
            <button 
              onClick={handleCommitChanges}
              disabled={isSaving || (logisticsState === 'Assigned' && !assignedUser)}
              className="mt-4 w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {isSaving ? 'Syncing to Database...' : 'Commit Status Update'}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}