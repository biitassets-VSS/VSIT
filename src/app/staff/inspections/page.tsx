'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Search, AlertCircle, Clock, 
  CheckCircle2, Laptop, ChevronRight, Loader2, Calendar, X, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface InspectionAsset {
  id: string;
  tag_id: string;
  name: string;
  category: string;
  inspection_status: string;
  last_inspection_date: string;
  next_inspection_date: string;
}

export default function StaffInspectionsPage() {
  const [assets, setAssets] = useState<InspectionAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');

  // Modal & Form States
  const [inspectingAsset, setInspectingAsset] = useState<InspectionAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inspectionForm, setInspectionForm] = useState({
    status: 'Passed',
    notes: ''
  });

  useEffect(() => {
    const fetchInspections = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return;

        const { data: staffProfile } = await supabase
          .from('staff')
          .select('emp_code')
          .eq('email', user.email)
          .single();

        if (!staffProfile) return;

        const { data: myAssets, error } = await supabase
          .from('assets')
          .select('*')
          .eq('emp_code', staffProfile.emp_code)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (myAssets) {
          const cleanedAssets = myAssets.map((asset: any) => ({
            id: asset.id,
            tag_id: asset.tag_id,
            name: asset.name,
            category: asset.category,
            inspection_status: asset.inspection_status || 'Pending',
            last_inspection_date: asset.last_inspection_date || '-',
            next_inspection_date: asset.next_inspection_date || '-',
          }));
          setAssets(cleanedAssets);
        }
      } catch (error) {
        console.error("Error fetching inspections:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInspections();
  }, []);

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr || dateStr === '-') return false;
    return new Date(dateStr) < new Date();
  };

  // --- SUBMIT INSPECTION LOGIC ---
  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingAsset) return;
    
    setIsSubmitting(true);

    try {
      // Calculate Dates
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Set next inspection 6 months from today (You can change this number)
      const nextDate = new Date(today.setMonth(today.getMonth() + 6));
      const nextDateStr = nextDate.toISOString().split('T')[0];

      const dbPayload = {
        inspection_status: inspectionForm.status,
        last_inspection_date: todayStr,
        next_inspection_date: nextDateStr,
        inspection_notes: inspectionForm.notes
      };

      // Save to Supabase
      const { error } = await supabase
        .from('assets')
        .update(dbPayload)
        .eq('id', inspectingAsset.id);

      if (error) throw error;

      // Update Local State so UI refreshes instantly
      const updatedAssets = assets.map(a => 
        a.id === inspectingAsset.id ? { ...a, ...dbPayload } : a
      );
      
      setAssets(updatedAssets);
      setInspectingAsset(null); // Close modal
      alert("Inspection saved successfully!");

    } catch (error: any) {
      alert("Failed to save inspection: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openInspectionModal = (asset: InspectionAsset) => {
    setInspectingAsset(asset);
    setInspectionForm({ status: 'Passed', notes: '' }); // Reset form
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.tag_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'Needs Action') {
      return asset.inspection_status === 'Pending' || asset.inspection_status === 'Failed' || asset.inspection_status === 'Pending Repair' || isOverdue(asset.next_inspection_date);
    }
    if (filter === 'Passed') {
      return asset.inspection_status === 'Passed';
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardCheck size={28} className="text-blue-600" /> My Asset Inspections
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Complete periodic health checks for your assigned equipment.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search assets..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 transition-all" 
          />
        </div>
        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
          {['All', 'Needs Action', 'Passed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === f ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* LIST OF INSPECTIONS */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-[24px] p-10 text-center shadow-sm border border-gray-100">
          <ClipboardCheck size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-black text-gray-800">All caught up!</h3>
          <p className="text-sm font-medium text-gray-500 mt-2">
            You don't have any pending inspections for the selected filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Equipment</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Current Status</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Dates</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => {
                  const overdue = isOverdue(asset.next_inspection_date);
                  const needsAction = asset.inspection_status === 'Pending' || asset.inspection_status === 'Failed' || asset.inspection_status === 'Pending Repair' || overdue;

                  return (
                    <motion.tr 
                      key={asset.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${needsAction ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                            <Laptop size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{asset.name}</p>
                            <p className="text-xs font-bold text-gray-500 mt-0.5">{asset.tag_id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 w-fit ${
                          asset.inspection_status === 'Passed' ? 'bg-green-100 text-green-700' :
                          asset.inspection_status === 'Failed' ? 'bg-red-100 text-red-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {asset.inspection_status === 'Passed' ? <CheckCircle2 size={14}/> : 
                           asset.inspection_status === 'Failed' ? <AlertCircle size={14}/> : 
                           <Clock size={14}/>}
                          {asset.inspection_status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-gray-400"/> Last: {asset.last_inspection_date || 'Never'}
                          </p>
                          <p className={`text-[11px] font-bold flex items-center gap-1 ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
                            <Calendar size={12} className={overdue ? 'text-red-500' : 'text-gray-400'}/> Due: {asset.next_inspection_date || 'Pending'}
                          </p>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <button 
                          onClick={() => openInspectionModal(asset)}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            needsAction ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {needsAction ? 'Start Inspection' : 'Re-inspect'} <ChevronRight size={14} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* INSTANT INSPECTION MODAL                  */}
      {/* ========================================= */}
      <AnimatePresence>
        {inspectingAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setInspectingAsset(null)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Health Inspection</h2>
                  <p className="text-xs font-bold text-gray-500 mt-1">{inspectingAsset.name} ({inspectingAsset.tag_id})</p>
                </div>
                <button onClick={() => setInspectingAsset(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveInspection} className="p-6 space-y-6">
                
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">Is this equipment working properly?</label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-all ${inspectionForm.status === 'Passed' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                      <input type="radio" name="status" value="Passed" checked={inspectionForm.status === 'Passed'} onChange={(e) => setInspectionForm({...inspectionForm, status: e.target.value})} className="hidden" />
                      <CheckCircle2 size={24} />
                      <span className="text-xs font-black uppercase">Passed</span>
                    </label>
                    <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-all ${inspectionForm.status === 'Pending Repair' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                      <input type="radio" name="status" value="Pending Repair" checked={inspectionForm.status === 'Pending Repair'} onChange={(e) => setInspectionForm({...inspectionForm, status: e.target.value})} className="hidden" />
                      <Clock size={24} />
                      <span className="text-xs font-black uppercase">Needs Repair</span>
                    </label>
                    <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-all ${inspectionForm.status === 'Failed' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                      <input type="radio" name="status" value="Failed" checked={inspectionForm.status === 'Failed'} onChange={(e) => setInspectionForm({...inspectionForm, status: e.target.value})} className="hidden" />
                      <AlertCircle size={24} />
                      <span className="text-xs font-black uppercase">Failed/Broken</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Inspection Notes</label>
                  <textarea 
                    rows={4} 
                    required={inspectionForm.status !== 'Passed'}
                    placeholder={inspectionForm.status === 'Passed' ? "Any optional comments..." : "Please describe what is wrong with the equipment..."}
                    value={inspectionForm.notes} 
                    onChange={(e) => setInspectionForm({...inspectionForm, notes: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-medium focus:border-blue-500 focus:outline-none resize-none"
                  />
                  {inspectionForm.status !== 'Passed' && <p className="text-[10px] font-bold text-red-500 mt-1">* Notes are required for items that need repair or have failed.</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setInspectingAsset(null)} className="flex-1 px-4 py-3.5 text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3.5 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl transition-all flex items-center justify-center gap-2">
                    {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Complete Inspection</>}
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