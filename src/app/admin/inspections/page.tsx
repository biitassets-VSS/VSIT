'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Eye, ArrowLeft, CheckCircle2, 
  XCircle, Maximize2, MessageSquare, Search, 
  User, Calendar, AlertCircle, RefreshCcw, CameraOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
interface InspectionReview {
  id: string;
  assetTag: string;
  assetName: string;
  category: string; // Used to determine photo rules
  submittedBy: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Re-inspection';
  notes: string;
  photos: Record<string, string>; // Maps "Label" -> "Photo URL"
}

// --- Photo Rules ---
const laptopPhotoRequirements = [
  "Top side", 
  "Display and Keyboard", 
  "Right Side port", 
  "Left Side port", 
  "Back side with Tag id Sticker"
];
const standardPhotoRequirements = [
  "Front View / Main Photo", 
  "Back side with Tag id Sticker"
];

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<InspectionReview[]>([]);
  const [viewState, setViewState] = useState<'list' | 'review'>('list');
  const [selectedItem, setSelectedItem] = useState<InspectionReview | null>(null);
  
  // Modals & Forms
  const [enlargedPhoto, setEnlargedPhoto] = useState<{url: string, label: string} | null>(null);
  const [actionState, setActionState] = useState<'none' | 'reinspect' | 'reject'>('none');
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    // Simulated Data with Correct Labeled Photos
    setInspections([
      {
        id: 'INSP-001',
        assetTag: 'AST-1042',
        assetName: 'Dell XPS 15 Laptop',
        category: 'Laptop',
        submittedBy: 'Rahul Sharma',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        notes: 'Screen and keyboard are in good condition. Ports are working fine. Found a minor scratch on the back panel but no major damage.',
        photos: {
          "Top side": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80",
          "Display and Keyboard": "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80",
          "Right Side port": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80",
          "Left Side port": "https://images.unsplash.com/photo-1629131726692-1accd0c53ce0?auto=format&fit=crop&w=800&q=80",
          "Back side with Tag id Sticker": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        id: 'INSP-002',
        assetTag: 'AST-2099',
        assetName: 'Logitech Wireless Mouse',
        category: 'Mouse',
        submittedBy: 'Priya Desai',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        notes: 'Scroll wheel is slightly loose, but it works. Battery compartment is clean.',
        photos: {
          "Front View / Main Photo": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
          "Back side with Tag id Sticker": "https://images.unsplash.com/photo-1615663245857-ac1eeb536fcb?auto=format&fit=crop&w=800&q=80" // Simulated tag photo
        }
      }
    ]);
  }, []);

  const openReview = (item: InspectionReview) => {
    setSelectedItem(item);
    setViewState('review');
    setActionState('none');
    setActionNote('');
  };

  const handleApprove = () => {
    if (!selectedItem) return;
    setInspections(prev => prev.filter(i => i.id !== selectedItem.id));
    alert(`Success: ${selectedItem.assetTag} has been Approved and marked Inspected.`);
    setViewState('list');
  };

  const submitAction = () => {
    if (!actionNote.trim()) {
      alert(`Please provide a reason for ${actionState === 'reinspect' ? 'the re-inspection' : 'rejection'}.`);
      return;
    }
    if (!selectedItem) return;
    
    setInspections(prev => prev.filter(i => i.id !== selectedItem.id));
    
    if (actionState === 'reinspect') {
      alert(`Notification sent: Staff must re-inspect ${selectedItem.assetTag}. \nReason: ${actionNote}`);
    } else {
      alert(`${selectedItem.assetTag} rejected. Reason: ${actionNote}.`);
    }
    
    setViewState('list');
  };

  // Determine which labels to show based on category
  const isLaptop = selectedItem?.category?.toLowerCase().includes('laptop');
  const requiredLabels = isLaptop ? laptopPhotoRequirements : standardPhotoRequirements;

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
            <div className="relative hidden sm:block">
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
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase tracking-wider mb-2 inline-block">Reviewing Submission</span>
                    <h2 className="text-2xl font-black text-gray-900">{selectedItem.assetName}</h2>
                    <p className="text-sm font-bold text-gray-500 mt-1 uppercase">
                      {selectedItem.assetTag} &bull; Category: {selectedItem.category}
                    </p>
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
                    {selectedItem.notes || "No notes provided by staff."}
                  </p>
                </div>
              </div>

              {/* Labeled Photo Gallery (Strictly checks expected slots) */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-2">
                  Photo Verification
                </h3>
                <p className="text-sm font-bold text-gray-500 mb-6">
                  {isLaptop ? 'Laptop rules active: 5 angles required.' : 'Standard rules active: 2 angles required.'}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {requiredLabels.map((label, index) => {
                    const photoUrl = selectedItem.photos[label];
                    
                    return (
                      <div key={index} className="flex flex-col">
                        <label className="text-[11px] uppercase font-black text-teal-800 mb-2 leading-tight min-h-[28px] flex items-end">
                          {label}
                        </label>
                        
                        {photoUrl ? (
                          <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 group bg-gray-50 shadow-sm">
                            <img src={photoUrl} alt={label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                              <button 
                                onClick={() => setEnlargedPhoto({ url: photoUrl, label: label })} 
                                className="bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg transform scale-95 group-hover:scale-100 transition-all"
                              >
                                <Maximize2 size={16} /> View Clear
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative aspect-square rounded-2xl border-2 border-dashed border-red-300 bg-red-50 flex flex-col items-center justify-center text-center p-4">
                            <CameraOff size={28} className="text-red-400 mb-2" />
                            <span className="text-xs font-black text-red-600">Missing Photo</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ACTION PANEL */}
            <div className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-6">
                <h3 className="text-lg font-black text-gray-900 mb-6 border-b border-gray-100 pb-3">Admin Decision</h3>
                
                {actionState === 'none' ? (
                  <div className="space-y-4">
                    <button onClick={handleApprove} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-sm transition-all flex justify-center items-center gap-2 text-lg">
                      <CheckCircle2 size={22} /> Approve & Mark Inspected
                    </button>
                    <button onClick={() => setActionState('reinspect')} className="w-full py-4 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 font-black rounded-2xl transition-all flex justify-center items-center gap-2 text-[15px]">
                      <RefreshCcw size={20} /> Request Re-inspection
                    </button>
                    <button onClick={() => setActionState('reject')} className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-black rounded-2xl transition-all flex justify-center items-center gap-2 text-[15px]">
                      <XCircle size={20} /> Reject & Close
                    </button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className={`p-4 rounded-2xl border ${
                      actionState === 'reinspect' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <label className={`block text-sm font-black flex items-center gap-2 mb-2 ${
                        actionState === 'reinspect' ? 'text-orange-900' : 'text-red-900'
                      }`}>
                        <AlertCircle size={16} /> 
                        {actionState === 'reinspect' ? 'Instructions for Staff *' : 'Reason for Rejection *'}
                      </label>
                      <textarea 
                        autoFocus
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        placeholder={
                          actionState === 'reinspect' 
                            ? "E.g. The 'Left Side port' photo is missing, please retake..." 
                            : "Explain why this submission is being completely rejected..."
                        }
                        className={`w-full bg-white border p-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 ${
                          actionState === 'reinspect' ? 'border-orange-200 focus:ring-orange-400' : 'border-red-200 focus:ring-red-400'
                        }`}
                        rows={4}
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button onClick={() => setActionState('none')} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
                        Cancel
                      </button>
                      <button onClick={submitAction} className={`flex-1 py-3 text-white font-black rounded-xl shadow-sm transition-colors ${
                        actionState === 'reinspect' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-700'
                      }`}>
                        {actionState === 'reinspect' ? 'Send Request' : 'Submit Rejection'}
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
            className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <button 
              onClick={() => setEnlargedPhoto(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
            >
              <XCircle size={32} />
            </button>
            
            <motion.img 
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.9 }}
              src={enlargedPhoto.url} 
              alt="Enlarged" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-gray-800"
            />
            
            {/* Context Label at bottom of Lightbox */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="mt-6 px-6 py-3 bg-gray-800 text-white rounded-full text-sm font-black tracking-wider uppercase shadow-lg border border-gray-700"
            >
              {enlargedPhoto.label}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
