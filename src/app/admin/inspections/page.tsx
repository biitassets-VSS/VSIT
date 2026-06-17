'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Eye, ArrowLeft, CheckCircle2, 
  XCircle, Maximize2, MessageSquare, Search, 
  User, Calendar, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
interface InspectionReview {
  id: string;
  assetTag: string;
  assetName: string;
  submittedBy: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes: string;
  photos: string[];
}

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<InspectionReview[]>([]);
  const [viewState, setViewState] = useState<'list' | 'review'>('list');
  const [selectedItem, setSelectedItem] = useState<InspectionReview | null>(null);
  
  // Modals & Forms
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    // Simulated Data: In a real app, you would fetch items with 'Pending' status from localStorage or DB
    // Here we generate 2 realistic mock inspections for you to test the UI immediately.
    setInspections([
      {
        id: 'INSP-001',
        assetTag: 'AST-1042',
        assetName: 'Dell XPS 15 Laptop',
        submittedBy: 'Rahul Sharma',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        notes: 'Screen and keyboard are in good condition. Ports are working fine. Found a minor scratch on the back panel but no major damage.',
        photos: [
          'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        id: 'INSP-002',
        assetTag: 'AST-2099',
        assetName: 'Logitech Wireless Mouse',
        submittedBy: 'Priya Desai',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        notes: 'Scroll wheel is slightly loose, but it works. Battery compartment is clean.',
        photos: [
          'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80'
        ]
      }
    ]);
  }, []);

  const openReview = (item: InspectionReview) => {
    setSelectedItem(item);
    setViewState('review');
    setIsRejecting(false);
    setRejectReason('');
  };

  const handleApprove = () => {
    if (!selectedItem) return;
    // Update List
    setInspections(prev => prev.filter(i => i.id !== selectedItem.id));
    alert(`${selectedItem.assetTag} has been Approved and marked Inspected.`);
    setViewState('list');
  };

  const submitRejection = () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    if (!selectedItem) return;
    
    // Update List
    setInspections(prev => prev.filter(i => i.id !== selectedItem.id));
    alert(`${selectedItem.assetTag} rejected. Reason: ${rejectReason}. Notification sent to staff.`);
    setViewState('list');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardCheck size={28} className="text-teal-600" />
            Inspection Approvals
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Review staff submissions, approve assets, or request re-inspections.</p>
        </div>
      </div>

      {/* ========================================== */}
      {/* VIEW: LIST PENDING INSPECTIONS             */}
      {/* ========================================== */}
      {viewState === 'list' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">Pending Reviews ({inspections.length})</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input type="text" placeholder="Search Tag..." className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-teal-500" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-black text-gray-500 uppercase">Asset Details</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase hidden sm:table-cell">Submitted By</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase hidden md:table-cell">Date</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 font-bold">
                      <CheckCircle2 size={32} className="mx-auto mb-3 text-gray-300" />
                      All caught up! No pending inspections.
                    </td>
                  </tr>
                ) : (
                  inspections.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-teal-50/30 transition-colors group">
                      <td className="p-4">
                        <div className="font-black text-sm text-gray-900">{item.assetName}</div>
                        <div className="text-xs font-bold text-teal-600 bg-teal-50 inline-block px-2 py-0.5 rounded-md mt-1 border border-teal-100">
                          {item.assetTag}
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                          <User size={14} className="text-gray-400"/> {item.submittedBy}
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell text-sm font-bold text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400"/> {item.date}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => openReview(item)} className="px-4 py-2 bg-gray-900 hover:bg-teal-600 text-white text-xs font-black rounded-lg transition-colors inline-flex items-center gap-2 shadow-sm">
                          <Eye size={14} /> Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW: DETAILED REVIEW MODE                 */}
      {/* ========================================== */}
      {viewState === 'review' && selectedItem && (
        <div className="space-y-6">
          <button onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Pending List
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: DETAILS & PHOTOS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Asset Header Info */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 uppercase tracking-wider mb-2 inline-block">Pending Review</span>
                    <h2 className="text-2xl font-black text-gray-900">{selectedItem.assetName}</h2>
                    <p className="text-sm font-bold text-gray-500 mt-1 uppercase">{selectedItem.assetTag}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-gray-400">Submitted By</p>
                    <p className="text-sm font-black text-gray-800">{selectedItem.submittedBy}</p>
                    <p className="text-xs font-bold text-gray-500 mt-0.5">{selectedItem.date}</p>
                  </div>
                </div>

                {/* Staff Notes */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-2">
                    <MessageSquare size={16} className="text-blue-500"/> Staff Inspection Notes
                  </h3>
                  <p className="text-sm font-medium text-gray-700 leading-relaxed">
                    "{selectedItem.notes}"
                  </p>
                </div>
              </div>

              {/* Photo Gallery */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-4">Uploaded Photos ({selectedItem.photos.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedItem.photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 group bg-gray-50">
                      <img src={photo} alt="Inspection" className="w-full h-full object-cover" />
                      {/* Hover Overlay for clear view */}
                      <div className="absolute inset-0 bg-gray-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => setEnlargedPhoto(photo)} className="bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg transform scale-95 group-hover:scale-100 transition-all">
                          <Maximize2 size={16} /> View Clear
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ACTION PANEL */}
            <div className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-6">
                <h3 className="text-lg font-black text-gray-900 mb-6 border-b border-gray-100 pb-3">Admin Decision</h3>
                
                {!isRejecting ? (
                  <div className="space-y-4">
                    <button onClick={handleApprove} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-sm transition-all flex justify-center items-center gap-2 text-lg">
                      <CheckCircle2 size={22} />
                      Approve & Mark Inspected
                    </button>
                    <button onClick={() => setIsRejecting(true)} className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-black rounded-2xl transition-all flex justify-center items-center gap-2 text-lg">
                      <XCircle size={22} />
                      Reject Inspection
                    </button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                      <label className="block text-sm font-black text-red-900 flex items-center gap-2 mb-2">
                        <AlertCircle size={16} /> Reason for Rejection *
                      </label>
                      <textarea 
                        autoFocus
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why this inspection failed (e.g. Blurry photos, didn't report screen crack...)"
                        className="w-full bg-white border border-red-200 p-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400"
                        rows={4}
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button onClick={() => setIsRejecting(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
                        Cancel
                      </button>
                      <button onClick={submitRejection} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-sm transition-colors">
                        Submit Rejection
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* FULL SCREEN PHOTO LIGHTBOX                 */}
      {/* ========================================== */}
      <AnimatePresence>
        {enlargedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          >
            {/* Close Button */}
            <button 
              onClick={() => setEnlargedPhoto(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <XCircle size={32} />
            </button>
            
            {/* The Image */}
            <motion.img 
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.9 }}
              src={enlargedPhoto} 
              alt="Enlarged" 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-gray-800"
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
