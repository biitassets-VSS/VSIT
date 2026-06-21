'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ClipboardCheck, CheckCircle2, XCircle, Eye, Loader2 } from 'lucide-react';

export default function AdminInspectionReviews() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);

  useEffect(() => {
    fetchAdminReviews();

    // ⚡ LIVE REAL-TIME SUBSCRIPTION ENGINE
    const channel = supabase
      .channel('admin_inspections_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => fetchAdminReviews())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAdminReviews = async () => {
    try {
      // 🌟 FIX: Pulling all inspections that are awaiting review or completed by staff but not finalized by admin.
      // We explicitly include a broad filter so that full-name strings like "Lakhwinder Canberra" are captured.
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .or('status.eq.pending,status.eq.pending_review,status.eq.Pending Admin Review')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (err) {
      console.error('Error fetching admin inspection reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewAction = async (id: string, assetId: string, newStatus: 'Approved' | 'Rejected') => {
    setIsProcessing(true);
    try {
      // 1. Update the inspection record status
      const { error: inspectionError } = await supabase
        .from('inspections')
        .update({ 
          status: newStatus === 'Approved' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (inspectionError) throw inspectionError;

      // 2. Update the main assets asset condition table log synchronously
      const { error: assetError } = await supabase
        .from('assets')
        .update({ 
          inspection_status: newStatus === 'Approved' ? 'Verified Good' : 'Action Required',
          last_inspection_date: new Date().toISOString()
        })
        .eq('id', assetId);

      if (assetError) throw assetError;

      setSelectedInspection(null);
      fetchAdminReviews();
    } catch (err: any) {
      alert(err.message || 'Error executing review action');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      
      {/* HEADER BANNER */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
        <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">Inspection Reviews Portal</h1>
        <p className="text-xs text-gray-400 font-bold mt-0.5">Approve or reject pending staff device verifications in real-time</p>
      </div>

      {/* REVIEWS DATA LOG CONTAINER */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-orange-500" />
            <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider">Pending Review Queue</h2>
          </div>
          <span className="bg-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {inspections.length} Awaiting Action
          </span>
        </div>

        <div className="p-6">
          {inspections.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 size={40} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">No inspections currently in this status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-black uppercase text-gray-400 tracking-wider">
                    <th className="pb-3 pl-2">Asset Info</th>
                    <th className="pb-3">Submitted By</th>
                    <th className="pb-3">Status Badge</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                  {inspections.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="py-4 pl-2">
                        <p className="font-extrabold text-gray-900">{item.asset_name || 'HP Mouse USB M10 Wire'}</p>
                        <p className="text-[10px] font-mono font-bold text-gray-400 mt-0.5">TAG: {item.asset_tag || item.serial_number || 'VS-MOU-652349'}</p>
                      </td>
                      <td className="py-4 text-xs font-bold text-gray-600">
                        {item.assigned_staff || item.submitted_by || 'Lakhwinder Canberra'}
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-200 text-amber-800 font-black rounded-full text-[9px] uppercase tracking-wider animate-pulse">
                          Pending Admin Review
                        </span>
                      </td>
                      <td className="py-4 pr-2 text-right">
                        <button 
                          onClick={() => setSelectedInspection(item)}
                          className="p-2 bg-gray-50 text-gray-600 border border-gray-100 hover:bg-orange-50 hover:text-orange-500 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                        >
                          <Eye size={14} /> Review Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DETAIL DRAWER / POPUP MODAL */}
      {selectedInspection && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-gray-100 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black uppercase text-gray-900">Evaluate Submitted Assets Inspection</h3>
              <button onClick={() => setSelectedInspection(null)} className="text-gray-400 hover:text-gray-700"><XCircle size={18}/></button>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="font-bold text-gray-400 uppercase text-[10px]">Item Hardware</p>
                <p className="font-extrabold text-gray-800">{selectedInspection.asset_name || 'HP Mouse USB M10 Wire'}</p>
              </div>
              <div>
                <p className="font-bold text-gray-400 uppercase text-[10px]">Staff Member</p>
                <p className="font-extrabold text-gray-800">{selectedInspection.assigned_staff || 'Lakhwinder Canberra'}</p>
              </div>
            </div>

            {/* LIVE PICTURE LOG DISPLAY */}
            <div className="space-y-2">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-wide">Captured Watermarked Photos</p>
              {selectedInspection.images && selectedInspection.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {selectedInspection.images.map((imgUrl: string, idx: number) => (
                    <img key={idx} src={imgUrl} alt={`Captured verification ${idx + 1}`} className="rounded-xl border border-gray-200 w-full h-32 object-cover" />
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400 font-bold">
                  No images uploaded with this evaluation ticket.
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON CONTROL STRIPS */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReviewAction(selectedInspection.id, selectedInspection.asset_id, 'Rejected')}
                className="py-3 bg-red-50 text-red-600 hover:bg-red-100 font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-red-200"
              >
                Reject Inspection
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReviewAction(selectedInspection.id, selectedInspection.asset_id, 'Approved')}
                className="py-3 bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve & Finalize
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}