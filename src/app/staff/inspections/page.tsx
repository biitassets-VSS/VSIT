'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, Search, AlertCircle, Clock, 
  CheckCircle2, Laptop, ChevronRight, Loader2, 
  Calendar, Camera, X, ShieldCheck
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [inspectingAsset, setInspectingAsset] = useState<InspectionAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [verifyTag, setVerifyTag] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});

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

  const handleStartInspection = (asset: InspectionAsset) => {
    setInspectingAsset(asset);
    setStep(1);
    setVerifyTag('');
    setNotes('');
    setPhotos({});
    setIsModalOpen(true);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingAsset) return;

    if (verifyTag.trim().toLowerCase() === inspectingAsset.tag_id.toLowerCase()) {
      setStep(2); // Serial Number is automatically verified if Tag matches
    } else {
      alert("Verification Failed: The Tag ID you entered does not match.");
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
    if (!notes.trim()) return alert("Current condition notes are required!");
    setIsSubmitting(true);

    try {
      const newPhotosArray = Object.values(photos);
      const combinedPhotos = [...(inspectingAsset.photos || []), ...newPhotosArray];

      const dbPayload = {
        inspection_status: 'Pending Admin Review', // Forces Admin to approve
        inspection_notes: notes,
        photos: combinedPhotos
      };

      const { error } = await supabase
        .from('assets')
        .update(dbPayload)
        .eq('id', inspectingAsset.id);

      if (error) throw error;

      const updatedAssets = assets.map(a => 
        a.id === inspectingAsset.id ? { ...a, ...dbPayload } : a
      );
      setAssets(updatedAssets);
      
      alert("Inspection sent to Admin for review!");
      setIsModalOpen(false);

    } catch (error: any) {
      alert("Failed to submit: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.tag_id?.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'Needs Action') {
      return asset.inspection_status === 'Pending' || asset.inspection_status === 'Re-Inspection' || isOverdue(asset.next_inspection_date);
    }
    if (filter === 'In Review') return asset.inspection_status === 'Pending Admin Review';
    return matchesSearch;
  });

  if (isLoading) return <div className="flex justify-center min-h-[60vh] items-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardCheck size={28} className="text-orange-500" /> My Asset Inspections
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Submit condition checks for Admin verification.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
          {['All', 'Needs Action', 'In Review'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === f ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="p-4 text-xs font-black text-gray-500 uppercase">Equipment</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase">Status</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => {
                const needsAction = asset.inspection_status === 'Pending' || asset.inspection_status === 'Re-Inspection' || isOverdue(asset.next_inspection_date);
                return (
                  <motion.tr key={asset.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${needsAction ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                          <Laptop size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{asset.name}</p>
                          <p className="text-xs font-bold text-gray-500">{asset.tag_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 w-fit ${
                        asset.inspection_status === 'Pending Admin Review' ? 'bg-blue-100 text-blue-700' :
                        asset.inspection_status === 'Re-Inspection' ? 'bg-red-100 text-red-700' :
                        asset.inspection_status === 'Good' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        <Clock size={14}/> {asset.inspection_status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleStartInspection(asset)}
                        disabled={asset.inspection_status === 'Pending Admin Review'}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          needsAction ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {asset.inspection_status === 'Pending Admin Review' ? 'Under Review' : 'Start Inspection'} <ChevronRight size={14} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && inspectingAsset && (
          <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 relative">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                <h2 className="text-xl font-black text-gray-900">{step === 1 ? 'Step 1: Enter Tag ID' : 'Step 2: Condition & Photos'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>

              <div className="p-6">
                {step === 1 && (
                  <form onSubmit={handleVerify} className="space-y-6">
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex gap-3 text-orange-800">
                      <ShieldCheck className="shrink-0" />
                      <p className="text-sm font-bold">You are inspecting: <span className="font-black">{inspectingAsset.name}</span></p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Enter Asset Tag ID <span className="text-red-500">*</span></label>
                      <input required value={verifyTag} onChange={(e) => setVerifyTag(e.target.value)} placeholder="e.g. TAG-1234" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none uppercase font-bold" />
                    </div>
                    <button type="submit" className="w-full py-4 rounded-xl font-black text-white bg-orange-600 hover:bg-orange-700">Verify Details</button>
                  </form>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-green-800 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold uppercase">Verified Successfully</p>
                        <p className="font-black">{inspectingAsset.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase">Serial No:</p>
                        <p className="font-mono font-bold bg-white px-2 rounded border border-green-200">{inspectingAsset.serial_number || 'N/A'}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Current Condition Notes <span className="text-red-500">*</span></label>
                      <textarea required value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe current condition, scratches, or issues..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none resize-none h-24"></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Photo Evidence ({Object.keys(photos).length}/{requiredPhotos.length})</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {requiredPhotos.map((label) => (
                          <div key={label} className="relative group">
                            {photos[label] ? (
                              <div className="aspect-square rounded-xl overflow-hidden border-2 border-green-500">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={photos[label]} alt={label} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 bg-gray-50">
                                <Camera className="text-gray-400 mb-2" size={24} />
                                <span className="text-xs font-bold text-gray-600">{label}</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoCapture(label, e.target.files?.[0])} />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={handleFinalSubmit} disabled={!canSubmit || isSubmitting} className={`w-full py-4 rounded-xl font-black text-white ${canSubmit ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-300'}`}>
                      {isSubmitting ? 'Submitting...' : 'Send to Admin for Review'}
                    </button>
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