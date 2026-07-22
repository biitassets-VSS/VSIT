'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  CheckCircle2, XCircle, Loader2, Package, 
  Search, AlertTriangle, History, ArrowRightLeft,
  Clock, XOctagon, Monitor, User, ArrowRight
} from 'lucide-react';

export default function AdminReplacementsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [historyRequests, setHistoryRequests] = useState<any[]>([]);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [modal, setModal] = useState<{ isOpen: boolean; data: any }>({
    isOpen: false,
    data: null
  });

  const [selectedReplacementId, setSelectedReplacementId] = useState<string>('');

  useEffect(() => {
    fetchData();

    // ⚡ REAL-TIME LISTENER FOR NEW REPLACEMENT REQUESTS
    const replacementChannel = supabase
      .channel('replacements-alerts')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, (payload) => {
        const newAsset = payload.new;
        const oldAsset = payload.old;
        
        if (newAsset.status === 'Replacement Requested' && oldAsset.status !== 'Replacement Requested') {
          toast.error(`New Replacement Request: ${newAsset.name || newAsset.model}`, {
            duration: 6000,
            icon: '🔄',
            style: { background: '#18181b', color: '#fff', fontWeight: 'bold' }
          });
          fetchData(); // Refresh the list automatically
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(replacementChannel); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. FETCH PENDING REPLACEMENTS
      const { data: pendingAssets } = await supabase
        .from('assets')
        .select('*')
        .eq('status', 'Replacement Requested');

      const pendUserIds = [...new Set(pendingAssets?.map(a => a.assigned_to).filter(Boolean))];
      
      let pendProfiles: any[] = [];
      if (pendUserIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('*').in('id', pendUserIds);
        pendProfiles = profs || [];
      }

      const compiledPending = (pendingAssets || []).map(asset => ({
        ...asset,
        user_profile: pendProfiles.find(p => p.id === asset.assigned_to) || null
      }));

      setPendingRequests(compiledPending);

      // 2. FETCH AVAILABLE INVENTORY (For the swap dropdown)
      const { data: availableAssets } = await supabase
        .from('assets')
        .select('id, name, serial_number, asset_tag, category')
        .eq('status', 'In Stock (Unassigned)');
      
      setAvailableInventory(availableAssets || []);

      // 3. FETCH HISTORY
      const { data: historyInsps } = await supabase
        .from('inspections')
        .select('*, assets(*)')
        .in('status', ['Replacement Approved', 'Replacement Rejected']) 
        .order('created_at', { ascending: false });

      const histUserIds = [...new Set(historyInsps?.map(i => i.inspected_by).filter(Boolean))];
      
      let histProfiles: any[] = [];
      if (histUserIds.length > 0) {
        const { data: p } = await supabase.from('profiles').select('*').in('id', histUserIds);
        histProfiles = p || [];
      }

      const compiledHistory = (historyInsps || []).map(insp => ({
        ...insp, 
        user_profile: histProfiles.find(p => p.id === insp.inspected_by) || null
      }));

      setHistoryRequests(compiledHistory);

    } catch (error) {
      console.error('Error fetching replacement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSwap = async (oldAsset: any) => {
    if (!selectedReplacementId) return alert("Please select a new asset from the inventory to issue.");
    if (!window.confirm("Confirm replacement? The old device will be unassigned and the new device will be assigned to this staff member.")) return;
    
    setProcessingId(oldAsset.id);
    const newAsset = availableInventory.find(a => a.id === selectedReplacementId);
    
    try {
      // 1. UNASSIGN OLD ASSET & MARK AS UNDER REPAIR
      await supabase.from('assets').update({ 
        assigned_to: null, 
        status: 'In Repair' 
      }).eq('id', oldAsset.id);

      // 2. ASSIGN NEW ASSET TO STAFF
      await supabase.from('assets').update({ 
        assigned_to: oldAsset.assigned_to, 
        status: 'Assigned' 
      }).eq('id', selectedReplacementId);

      // 3. LOG THE INSPECTION/ACTION
      await supabase.from('inspections').insert({
        asset_id: oldAsset.id, 
        inspected_by: oldAsset.assigned_to, 
        status: 'Replacement Approved', 
        notes: `[ADMIN SWAP] Old S/N: ${oldAsset.serial_number} replaced with New S/N: ${newAsset.serial_number}`
      });

      // 4. NOTIFY THE STAFF MEMBER
      await supabase.from('notifications').insert({
        target_role: oldAsset.assigned_to,
        title: 'Hardware Replaced',
        message: `Your replacement request has been approved. You have been assigned a new device: ${newAsset.name} (S/N: ${newAsset.serial_number}).`,
        is_read: false
      });

      setModal({ isOpen: false, data: null });
      setSelectedReplacementId('');
      toast.success('Asset successfully replaced & assigned.');
      fetchData(); 
    } catch (error: any) {
      toast.error(`Error processing swap: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReplacement = async (oldAsset: any) => {
    const reason = window.prompt("Enter reason for rejection (e.g., Damage not covered, device works fine):");
    if (reason === null) return;

    setProcessingId(oldAsset.id);
    try {
      // Revert status back to assigned
      await supabase.from('assets').update({ status: 'Assigned' }).eq('id', oldAsset.id);

      // Log Rejection
      await supabase.from('inspections').insert({
        asset_id: oldAsset.id, 
        inspected_by: oldAsset.assigned_to, 
        status: 'Replacement Rejected', 
        notes: `Admin Rejected Swap: ${reason}`
      });

      // Notify User
      await supabase.from('notifications').insert({
        target_role: oldAsset.assigned_to,
        title: 'Replacement Request Denied',
        message: `Your request to replace ${oldAsset.name} was denied. Reason: ${reason}`,
        is_read: false
      });

      setModal({ isOpen: false, data: null });
      toast.success('Replacement request denied.');
      fetchData();
    } catch (error: any) {
      toast.error(`Error rejecting request: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const openSwapModal = (request: any) => {
    setModal({ isOpen: true, data: request });
    setSelectedReplacementId('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Syncing Swap Records...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Tabs */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                <ArrowRightLeft className="text-blue-600" /> Hardware Replacements
              </h1>
              <p className="text-sm font-semibold text-slate-500 mt-2">
                Process faulty device requests and assign new inventory to staff.
              </p>
            </div>
          </div>

          {/* TAB BAR */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'pending' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Clock size={16} /> Pending Requests
              {pendingRequests.length > 0 && <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px]">{pendingRequests.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-slate-100 text-slate-700 border border-slate-300' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <History size={16} /> Processed Swaps
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* PENDING TAB CONTENT */}
        {/* ========================================== */}
        {activeTab === 'pending' && (
          <div className="animate-in fade-in duration-300">
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center space-y-3">
                <Monitor size={48} className="mx-auto text-slate-300" />
                <p className="text-slate-500 font-bold">No pending replacement requests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingRequests.map((request, index) => {
                  const staffName = request.user_profile?.full_name || request.user_profile?.name || 'Unknown User';
                  const staffEmpCode = request.user_profile?.emp_code || request.user_profile?.emp_id || 'NO-ID';

                  return (
                    <div key={`pending-${request.id}-${index}`} className="bg-white p-6 rounded-2xl border border-blue-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:border-blue-300 transition-colors">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-md">Swap Requested</span>
                          <h3 className="font-bold text-lg text-slate-900 leading-none">{request.name || request.model}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-500">
                          <span className="bg-slate-100 px-2 py-1 rounded-md">Tag: {request.asset_tag}</span>
                          <span className="bg-slate-100 px-2 py-1 rounded-md">S/N: {request.serial_number}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-600 mt-3 flex items-center gap-2">
                          <User size={14} className="text-blue-500"/>
                          Requested by: <strong className="text-slate-900">{staffName}</strong> ({staffEmpCode})
                        </p>
                      </div>

                      <div className="w-full md:w-auto">
                        <button onClick={() => openSwapModal(request)} className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors">
                          <ArrowRightLeft size={16} /> Process Swap
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* HISTORY TAB CONTENT */}
        {/* ========================================== */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-300">
            {historyRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center space-y-3">
                <History size={48} className="mx-auto text-slate-300" />
                <p className="text-slate-500 font-bold">No historical replacement records found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {historyRequests.map((record, index) => {
                  const staffName = record.user_profile?.full_name || record.user_profile?.name || 'Unknown User';
                  const isApproved = record.status === 'Replacement Approved';
                  const processDate = record.created_at ? new Date(record.created_at).toLocaleString() : 'Unknown Date';

                  return (
                    <div key={`history-${record.id}-${index}`} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col shadow-sm opacity-90">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md flex items-center gap-1 ${isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {isApproved ? <CheckCircle2 size={12}/> : <XOctagon size={12}/>} {isApproved ? 'Swap Approved' : 'Swap Rejected'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">{processDate}</span>
                        </div>
                      </div>
                      
                      <h3 className="font-bold text-base text-slate-900">{record.assets?.name || 'Hardware Device'}</h3>
                      <p className="text-xs font-mono text-slate-500 mt-1">Faulty S/N: {record.assets?.serial_number || 'N/A'}</p>
                      
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Execution Notes</p>
                        <p className="text-sm font-semibold text-slate-700">{record.notes}</p>
                      </div>

                      <p className="text-xs font-semibold text-slate-500 mt-4 flex items-center gap-1.5">
                        <User size={12}/> Requested by: <strong className="text-slate-900">{staffName}</strong> 
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* PROCESSING SWAP MODAL */}
      {/* ========================================== */}
      {modal.isOpen && modal.data && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-blue-50 border-b border-blue-100 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-blue-900 text-sm tracking-tight uppercase flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-blue-600"/> Execute Device Swap
              </h3>
              <button onClick={() => setModal({ isOpen: false, data: null })} className="p-2 rounded-full hover:bg-blue-200/50 text-blue-500 transition-colors"><XCircle size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Old Asset Info */}
              <div className="p-5 border-2 border-dashed border-rose-200 bg-rose-50/50 rounded-2xl relative">
                <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-black text-rose-500 uppercase tracking-widest">Target: Faulty Asset</div>
                <h4 className="font-bold text-slate-900 mt-2">{modal.data.name}</h4>
                <div className="flex gap-4 mt-2 text-sm font-mono text-slate-600">
                  <span>S/N: {modal.data.serial_number}</span>
                  <span>Tag: {modal.data.asset_tag}</span>
                </div>
                <p className="text-sm font-semibold text-slate-600 mt-3 border-t border-rose-200/50 pt-3">
                  Currently Assigned To: <strong className="text-slate-900">{modal.data.user_profile?.full_name || 'Unknown'}</strong>
                </p>
              </div>

              <div className="flex justify-center text-slate-300">
                <ArrowRight size={24} className="rotate-90 md:rotate-0" />
              </div>

              {/* New Asset Selection */}
              <div className="p-5 border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-2xl relative">
                <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-black text-emerald-500 uppercase tracking-widest">Select Replacement (In Stock)</div>
                
                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Choose from Available Inventory</label>
                  <select 
                    value={selectedReplacementId} 
                    onChange={(e) => setSelectedReplacementId(e.target.value)}
                    className="w-full p-4 rounded-xl border border-emerald-200 bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold text-slate-900"
                  >
                    <option value="">-- Select a replacement device --</option>
                    {availableInventory
                      // Optionally filter to suggest same category first
                      .sort((a, b) => a.category === modal.data.category ? -1 : 1)
                      .map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name} (S/N: {asset.serial_number}) - {asset.category}
                        </option>
                    ))}
                  </select>
                  {availableInventory.length === 0 && (
                    <p className="text-xs text-rose-500 mt-2 font-bold flex items-center gap-1"><AlertTriangle size={12}/> No unassigned assets found in inventory.</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-3 text-sm text-slate-600 font-medium">
                <AlertTriangle size={24} className="text-amber-500 shrink-0" />
                <p>Approving this will instantly unassign the faulty asset, mark it as "Under Repair", and assign the selected replacement device to the staff member.</p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between gap-3 shrink-0">
              <button onClick={() => handleRejectReplacement(modal.data)} className="px-6 py-3 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors">
                Reject Swap Request
              </button>
              <button disabled={!selectedReplacementId || processingId === modal.data.id} onClick={() => handleApproveSwap(modal.data)} className="px-8 py-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {processingId === modal.data.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                Confirm & Assign Replacement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}