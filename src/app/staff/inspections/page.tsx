'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, Search, AlertCircle, Clock, 
  CheckCircle2, Laptop, ChevronRight, Loader2, 
  Calendar, Camera, X, ShieldCheck, CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface InspectionAsset {
  id: string;
  tag_id: string;
  serial_number: string | null;
  name: string;
  category: string;
  inspection_status: string;
  last_inspection_date: string;
  next_inspection_date: string;
  photos: string[];
}

export default function StaffInspectionsPage() {
  const [assets, setAssets] = useState<InspectionAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');

  // --- WIZARD / MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [inspectingAsset, setInspectingAsset] = useState<InspectionAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Verification
  const [verifyTag, setVerifyTag] = useState('');
  const [verifySerial, setVerifySerial] = useState('');

  // Step 2: Condition & Photos
  const [inspectionStatus, setInspectionStatus] = useState('Passed');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});

  // Fetch Real Data
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
            serial_number: asset.serial_number,
            name: asset.name,
            category: asset.category,
            inspection_status: asset.inspection_status || 'Pending',
            last_inspection_date: asset.last_inspection_date || '-',
            next_inspection_date: asset.next_inspection_date || '-',
            photos: asset.photos || []
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

  // --- WIZARD LOGIC ---

  const handleStartInspection = (asset: InspectionAsset) => {
    setInspectingAsset(asset);
    setStep(1);
    setVerifyTag('');
    setVerifySerial('');
    setInspectionStatus('Passed');
    setNotes('');
    setPhotos({});
    setIsModalOpen(true);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingAsset) return;

    const tagMatch = verifyTag.trim().toLowerCase() === inspectingAsset.tag_id.toLowerCase();
    
    // Only verify serial if the database actually has a serial number for this asset
    const serialMatch = inspectingAsset.serial_number 
      ? verifySerial.trim().toLowerCase() === inspectingAsset.serial_number.toLowerCase() 
      : true;

    if (tagMatch && serialMatch) {
      setStep(2);
    } else {
      alert("Verification Failed: The Tag ID or Serial Number you entered does not match this asset.");
    }
  };

  const requiredPhotos = inspectingAsset?.category?.toLowerCase() === 'laptop' 
    ? ['Top Side', 'Keyboard & Screen', 'Right Side', 'Left Side', 'Bottom Side']
    : ['Front/Top Side', 'Back Side'];

  const canSubmit = requiredPhotos.every(label => photos[label]);

  const handlePhotoCapture = (label: string, file: File | undefined) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0);

        // Auto Watermark
        const dateText = `Captured: ${new Date().toLocaleString()}`;
        const fontSize = Math.max(30, img.width / 25);
        ctx.font = `bold ${fontSize}px Arial`;
        const padding = 20;
        const textWidth = ctx.measureText(dateText).width;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, img.height - (fontSize + padding * 2), textWidth + padding * 2, fontSize + padding * 2);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(dateText, padding, img.height - padding);

        const watermarkedImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setPhotos(prev => ({ ...prev, [label]: watermarkedImageBase64 }));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFinalSubmit = async () => {
    if (!inspectingAsset) return;
    setIsSubmitting(true);

    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const nextDate = new Date(today.setMonth(today.getMonth() + 6));
      const nextDateStr = nextDate.toISOString().split('T')[0];

      // Convert photo dictionary to array and combine with existing photos
      const newPhotosArray = Object.values(photos);
      const combinedPhotos = [...(inspectingAsset.photos || []), ...newPhotosArray];

      const dbPayload = {
        inspection_status: inspectionStatus,
        last_inspection_date: todayStr,
        next_inspection_date: nextDateStr,
        inspection_notes: notes,
        photos: combinedPhotos
      };

      const { error } = await supabase
        .from('assets')
        .update(dbPayload)
        .eq('id', inspectingAsset.id);

      if (error) throw error;

      // Update UI
      const updatedAssets = assets.map(a => 
        a.id === inspectingAsset.id ? { ...a, ...dbPayload } : a
      );
      setAssets(updatedAssets);
      
      alert("Inspection Submitted successfully! Sent to Admin for review.");
      setIsModalOpen(false);

    } catch (error: any) {
      alert("Failed to submit inspection: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto relative">
      
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
                          onClick={() => handleStartInspection(asset)}
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
      {/* 2-STEP INSPECTION WIZARD MODAL            */}
      {/* ========================================= */}
      <AnimatePresence>
        {isModalOpen && inspectingAsset && (
          <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 relative">
              
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                <h2 className="text-xl font-black text-gray-900">
                  {step === 1 ? 'Step 1: Verify Asset' : 'Step 2: Condition & Capture'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                
                {/* STEP 1: VERIFICATION */}
                {step === 1 && (
                  <form onSubmit={handleVerify} className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800">
                      <ShieldCheck className="shrink-0" />
                      <div>
                        <p className="text-sm font-bold">You are inspecting: <span className="font-black">{inspectingAsset.name}</span></p>
                        <p className="text-xs font-medium mt-1">Please enter the exact Asset Tag ID (and Serial Number if applicable) of the physical equipment to verify you have it.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Asset Tag ID <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                          <input 
                            required 
                            value={verifyTag}
                            onChange={(e) => setVerifyTag(e.target.value)}
                            placeholder="e.g., VS-MOU-123456" 
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold" 
                          />
                        </div>
                      </div>

                      {inspectingAsset.serial_number && (
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Serial Number <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input 
                              required 
                              value={verifySerial}
                              onChange={(e) => setVerifySerial(e.target.value)}
                              placeholder="Enter Serial Number" 
                              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold" 
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button type="submit" className="w-full py-4 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md mt-4">
                      Verify Details & Continue
                    </button>
                  </form>
                )}

                {/* STEP 2: CAPTURE & NOTES */}
                {step === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    
                    {/* Status Selection */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-3">Overall Functional Status:</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-all ${inspectionStatus === 'Passed' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                          <input type="radio" value="Passed" checked={inspectionStatus === 'Passed'} onChange={(e) => setInspectionStatus(e.target.value)} className="hidden" />
                          <CheckSquare size={24} />
                          <span className="text-xs font-black uppercase">Passed</span>
                        </label>
                        <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-all ${inspectionStatus === 'Pending Repair' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                          <input type="radio" value="Pending Repair" checked={inspectionStatus === 'Pending Repair'} onChange={(e) => setInspectionStatus(e.target.value)} className="hidden" />
                          <Clock size={24} />
                          <span className="text-xs font-black uppercase">Needs Repair</span>
                        </label>
                        <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-all ${inspectionStatus === 'Failed' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                          <input type="radio" value="Failed" checked={inspectionStatus === 'Failed'} onChange={(e) => setInspectionStatus(e.target.value)} className="hidden" />
                          <AlertCircle size={24} />
                          <span className="text-xs font-black uppercase">Failed/Broken</span>
                        </label>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Condition Notes</label>
                      <textarea 
                        required={inspectionStatus !== 'Passed'}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={inspectionStatus === 'Passed' ? "Optional: Describe any minor wear and tear..." : "Required: Describe exactly what is broken or malfunctioning..."}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none h-24"
                      ></textarea>
                    </div>

                    {/* Photo Capture Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-bold text-gray-700">Live Photo Capture</label>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${canSubmit ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {Object.keys(photos).length} / {requiredPhotos.length} photos
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {requiredPhotos.map((label) => (
                          <div key={label} className="relative group">
                            {photos[label] ? (
                              <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-green-500 shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={photos[label]} alt={label} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <label className="cursor-pointer text-white font-bold text-xs bg-black/50 px-3 py-2 rounded-lg hover:bg-black/70">
                                    Retake
                                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoCapture(label, e.target.files?.[0])} />
                                  </label>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-[10px] font-bold py-1 text-center">
                                  {label} ✓
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-colors p-2">
                                <Camera className="text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" size={24} />
                                <span className="text-xs font-bold text-gray-600 group-hover:text-blue-600 text-center">{label}</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoCapture(label, e.target.files?.[0])} />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex gap-3">
                      <button type="button" onClick={() => setStep(1)} className="px-6 py-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm">
                        Back
                      </button>
                      <button 
                        onClick={handleFinalSubmit}
                        disabled={!canSubmit || isSubmitting}
                        className={`flex-1 py-4 rounded-xl font-black text-white text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                          canSubmit ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Uploading securely...</> : (canSubmit ? 'Submit Inspection to Admin' : 'Complete All Required Photos')}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>

  );
}