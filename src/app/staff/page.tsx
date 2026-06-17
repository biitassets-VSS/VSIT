'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, CheckCircle2, AlertCircle, Camera, 
  ArrowLeft, Trash2, MessageSquare, ShieldAlert, Send,
  Ticket, PlusCircle, Timer, PauseCircle, MonitorUp, ImagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
interface AssignedAsset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: string;
  inspectionStatus: 'Due' | 'Pending Approval' | 'Inspected' | 'Re-inspection';
  adminFeedback?: string;
}

interface StaffTicket {
  id: string;
  title: string;
  status: 'Open' | 'In Progress' | 'Hold' | 'Resolved';
  estimatedTime?: string;
}

// --- Photo Rules ---
const laptopPhotoRequirements = [
  "Top side", "Display and Keyboard", "Right Side port", "Left Side port", "Back side with Tag id Sticker"
];
const standardPhotoRequirements = [
  "Front View / Main Photo", "Back side with Tag id Sticker"
];

export default function StaffDashboardPage() {
  // Mock Staff Data
  const staffUser = {
    name: 'Rahul Sharma',
    empCode: 'EMP-1042',
    department: 'Engineering'
  };

  // --- State ---
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [activeTickets, setActiveTickets] = useState<StaffTicket[]>([]);
  
  // View Controller
  const [viewState, setViewState] = useState<'dashboard' | 'inspecting' | 'raising_ticket' | 'requesting_asset'>('dashboard');
  
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  
  // Forms State
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ticketForm, setTicketForm] = useState({ title: '', category: 'Hardware', priority: 'Medium', description: '' });
  const [ticketPhoto, setTicketPhoto] = useState<string | null>(null); // NEW: Screenshot state for Tickets

  const [assetRequestForm, setAssetRequestForm] = useState({ category: 'Mouse', reason: '' });

  useEffect(() => {
    setAssets([
      {
        id: 'AST-1042', tagId: 'AST-1042', name: 'Dell XPS 15 Laptop', category: 'Laptop', 
        status: 'Assigned', inspectionStatus: 'Re-inspection', 
        adminFeedback: "The 'Left Side port' photo is too blurry. Please retake."
      },
      {
        id: 'AST-2099', tagId: 'AST-2099', name: 'Logitech MX Master 3', category: 'Mouse', 
        status: 'Assigned', inspectionStatus: 'Due'
      }
    ]);

    setActiveTickets([
      { id: 'TKT-9021', title: 'Laptop Screen Flickering', status: 'In Progress', estimatedTime: '15 Min' },
      { id: 'TKT-9025', title: 'Keyboard Keys Sticking', status: 'Hold', estimatedTime: 'Hold' }
    ]);
  }, []);

  // --- Handlers ---
  const openInspection = (asset: AssignedAsset) => {
    setSelectedAsset(asset);
    setPhotos({});
    setNotes('');
    setViewState('inspecting');
  };

  const handleSubmitTicket = () => {
    if (!ticketForm.title || !ticketForm.description) return alert("Please fill in all fields.");
    setIsSubmitting(true);
    setTimeout(() => {
      setActiveTickets(prev => [{
        id: `TKT-${Math.floor(Math.random() * 9000) + 1000}`,
        title: ticketForm.title,
        status: 'Open'
      }, ...prev]);
      setIsSubmitting(false);
      setViewState('dashboard');
      setTicketForm({ title: '', category: 'Hardware', priority: 'Medium', description: '' });
      setTicketPhoto(null); // Reset photo
      alert('Ticket raised successfully!');
    }, 1000);
  };

  // NEW: Ticket Screenshot Upload Handler
  const handleTicketPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setTicketPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitAssetRequest = () => {
    if (!assetRequestForm.reason) return alert("Please provide a reason.");
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setViewState('dashboard');
      setAssetRequestForm({ category: 'Mouse', reason: '' });
      alert('Asset request submitted to Admin for approval!');
    }, 1000);
  };

  const handleSubmitInspection = () => {
    if (!selectedAsset) return;
    const requiredLabels = selectedAsset.category.toLowerCase().includes('laptop') ? laptopPhotoRequirements : standardPhotoRequirements;
    const missingPhotos = requiredLabels.filter(label => !photos[label]);
    
    if (missingPhotos.length > 0) {
      alert(`Please upload the following missing photos:\n- ${missingPhotos.join('\n- ')}`);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, inspectionStatus: 'Pending Approval' } : a));
      alert('Inspection submitted successfully!');
      setIsSubmitting(false);
      setViewState('dashboard');
    }, 1000);
  };

  // --- Photo Upload Logic with Watermark (For Inspections) ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let width = img.width, height = img.height;
        const MAX_DIMENSION = 1200;
        if (width > height && width > MAX_DIMENSION) { height = Math.round((height * MAX_DIMENSION) / width); width = MAX_DIMENSION; }
        else if (height > MAX_DIMENSION) { width = Math.round((width * MAX_DIMENSION) / height); height = MAX_DIMENSION; }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const watermarkText = new Date().toLocaleString();
        const fontSize = Math.max(20, height * 0.035); 
        ctx.font = `bold ${fontSize}px Arial`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; ctx.lineWidth = Math.max(3, fontSize * 0.15);
        ctx.strokeText(watermarkText, width - 20, height - 20);
        ctx.fillStyle = 'rgba(255, 255, 255, 1)'; ctx.fillText(watermarkText, width - 20, height - 20);
        setPhotos(prev => ({ ...prev, [label]: canvas.toDataURL('image/jpeg', 0.85) }));
        e.target.value = '';
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (label: string) => setPhotos(prev => { const p = { ...prev }; delete p[label]; return p; });

  const isLaptop = selectedAsset?.category?.toLowerCase().includes('laptop');
  const requiredLabels = isLaptop ? laptopPhotoRequirements : standardPhotoRequirements;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 sm:px-0">
      
      {/* ========================================== */}
      {/* 1. VIEW: STAFF DASHBOARD (OVERVIEW)        */}
      {/* ========================================== */}
      {viewState === 'dashboard' && (
        <>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Welcome, {staffUser.name} 👋</h1>
              <p className="text-sm font-medium text-gray-500 mt-1">Manage your assigned hardware and complete inspections.</p>
            </div>
            <div className="bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">Emp Code</span>
              <span className="text-lg font-black text-teal-900">{staffUser.empCode}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setViewState('raising_ticket')} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors text-left group">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                <Ticket size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-[15px]">Raise IT Ticket</h3>
                <p className="text-xs font-bold text-gray-500 mt-0.5">Report a broken device or software issue</p>
              </div>
            </button>

            <button onClick={() => setViewState('requesting_asset')} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-left group">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                <PlusCircle size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-[15px]">Request New Asset</h3>
                <p className="text-xs font-bold text-gray-500 mt-0.5">Need a mouse, keyboard, or monitor?</p>
              </div>
            </button>
          </div>

          {/* ACTIVE TICKETS & ETAs */}
          {activeTickets.length > 0 && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4">
                <Ticket size={20} className="text-teal-600" /> My Active Support Tickets
              </h2>
              <div className="space-y-3">
                {activeTickets.map(ticket => (
                  <div key={ticket.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl border bg-gray-50 border-gray-200 gap-3">
                    <div>
                      <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                        {ticket.title} <span className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-500 uppercase">{ticket.id}</span>
                      </h4>
                      <span className="text-xs font-bold text-blue-600 mt-1.5 inline-block">Status: {ticket.status}</span>
                    </div>
                    {ticket.estimatedTime && (
                      <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-black text-xs uppercase shadow-sm ${ticket.estimatedTime === 'Hold' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        {ticket.estimatedTime === 'Hold' ? <PauseCircle size={14}/> : <Timer size={14}/>}
                        {ticket.estimatedTime === 'Hold' ? 'On Hold' : `ETA: ${ticket.estimatedTime}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ASSETS */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-2">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Package size={20} className="text-teal-600" /> My Assigned Assets ({assets.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {assets.map((asset) => (
                <div key={asset.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-200 flex flex-col justify-between hover:border-teal-300 transition-colors group">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-black bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-gray-600 uppercase tracking-wider">{asset.category}</span>
                      {asset.inspectionStatus === 'Inspected' && <CheckCircle2 size={20} className="text-green-500" />}
                      {asset.inspectionStatus === 'Re-inspection' && <ShieldAlert size={20} className="text-orange-500 animate-pulse" />}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">{asset.name}</h3>
                    <p className="text-sm font-bold text-gray-500 uppercase">{asset.tagId}</p>
                  </div>
                  <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between">
                    <span className={`text-xs font-black uppercase tracking-wider ${asset.inspectionStatus === 'Due' ? 'text-blue-600' : asset.inspectionStatus === 'Re-inspection' ? 'text-orange-600' : asset.inspectionStatus === 'Pending Approval' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {asset.inspectionStatus}
                    </span>
                    {(asset.inspectionStatus === 'Due' || asset.inspectionStatus === 'Re-inspection') ? (
                      <button onClick={() => openInspection(asset)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-colors flex items-center gap-2">
                        <Camera size={14} /> Start Inspection
                      </button>
                    ) : asset.inspectionStatus === 'Pending Approval' ? (
                      <span className="text-xs font-bold text-gray-400">Waiting for Admin...</span>
                    ) : <span className="text-xs font-bold text-gray-400">Up to date</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* 2. VIEW: RAISE IT TICKET FORM              */}
      {/* ========================================== */}
      {viewState === 'raising_ticket' && (
        <div className="space-y-6">
          <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl">
            <div className="mb-6 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
                <Ticket size={24} />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Raise IT Ticket</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Describe the issue you are facing so Admin can help.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Issue Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Laptop screen flickering" 
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Category</label>
                  <select 
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Hardware">Hardware Issue</option>
                    <option value="Software">Software / Access</option>
                    <option value="Network">Network / Internet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Priority</label>
                  <select 
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Description</label>
                <textarea 
                  rows={4}
                  placeholder="Provide more details..." 
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-medium focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* NEW: SCREENSHOT UPLOAD SECTION */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Attach Screenshot (Optional)</label>
                {ticketPhoto ? (
                  <div className="relative w-32 h-32 rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
                    <img src={ticketPhoto} alt="Screenshot" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setTicketPhoto(null)} 
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-md transition-colors z-20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full sm:w-64 h-32 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-teal-50 hover:border-teal-400 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleTicketPhotoUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                    />
                    <ImagePlus size={24} className="text-gray-400 mb-2" />
                    <span className="text-xs font-bold text-gray-500">Upload Image</span>
                  </div>
                )}
              </div>

              <button 
                onClick={handleSubmitTicket}
                disabled={isSubmitting}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-md transition-all flex justify-center items-center gap-2 mt-4"
              >
                {isSubmitting ? 'Submitting...' : <><Send size={18} /> Submit Ticket</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. VIEW: REQUEST NEW ASSET FORM            */}
      {/* ========================================== */}
      {viewState === 'requesting_asset' && (
        <div className="space-y-6">
          <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl">
            <div className="mb-6 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <MonitorUp size={24} />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Request New Asset</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Submit a request to Admin for new hardware.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">What do you need?</label>
                <select 
                  value={assetRequestForm.category}
                  onChange={(e) => setAssetRequestForm({...assetRequestForm, category: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none"
                >
                  <option value="Mouse">Mouse</option>
                  <option value="Keyboard">Keyboard</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Headphones">Headphones</option>
                  <option value="Laptop Replacement">Laptop Replacement</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Reason for Request</label>
                <textarea 
                  rows={4}
                  placeholder="Why do you need this asset? (e.g. Current mouse is broken, need a secondary monitor for design work...)" 
                  value={assetRequestForm.reason}
                  onChange={(e) => setAssetRequestForm({...assetRequestForm, reason: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-medium focus:border-teal-500 focus:outline-none"
                />
              </div>

              <button 
                onClick={handleSubmitAssetRequest}
                disabled={isSubmitting}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
              >
                {isSubmitting ? 'Submitting...' : <><Send size={18} /> Send Request to Admin</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. VIEW: INSPECTION UPLOAD FORM            */}
      {/* ========================================== */}
      {viewState === 'inspecting' && selectedAsset && (
        <div className="space-y-6">
          <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 border-b border-gray-100 pb-6">
              <div>
                <span className="text-xs font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg border border-teal-100 uppercase tracking-wider mb-2 inline-block">New Inspection</span>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900">{selectedAsset.name}</h2>
                <p className="text-sm font-bold text-gray-500 mt-1 uppercase">
                  {selectedAsset.tagId} &bull; Category: {selectedAsset.category}
                </p>
              </div>
            </div>

            {selectedAsset.inspectionStatus === 'Re-inspection' && selectedAsset.adminFeedback && (
              <div className="mb-8 bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <h3 className="text-sm font-black text-orange-900 flex items-center gap-2 mb-2">
                  <ShieldAlert size={18} className="text-orange-600" /> Admin requested a Re-inspection
                </h3>
                <p className="text-sm font-bold text-orange-800 leading-relaxed">
                  "{selectedAsset.adminFeedback}"
                </p>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                <Camera size={20} className="text-teal-600" /> Upload Photos
              </h3>
              <p className="text-sm font-bold text-teal-800 bg-teal-50 p-3 sm:p-4 rounded-xl border border-teal-100 mb-6">
                {isLaptop ? 'Laptop Rules: All 5 angles required.' : 'Standard Rules: 2 angles required.'} Photos are watermarked.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {requiredLabels.map((label, index) => (
                  <div key={index} className="flex flex-col">
                    <label className="text-[11px] sm:text-xs uppercase font-black text-gray-500 mb-2 h-8 flex items-end break-words leading-tight">
                      {label} *
                    </label>
                    {photos[label] ? (
                      <div className="relative w-full aspect-square rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
                        <img src={photos[label]} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-sm"><CheckCircle2 size={12} /></div>
                        <button type="button" onClick={() => removePhoto(label)} className="absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl shadow-md transition-colors z-20">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative w-full aspect-square rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-teal-50 hover:border-teal-400 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                        <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoUpload(e, label)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"/>
                        <Camera size={28} className="text-gray-400 mb-2" />
                        <span className="text-[11px] font-bold text-gray-500 text-center px-2">Tap to Add</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare size={20} className="text-teal-600" /> Condition Notes
              </h3>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe current condition..."
                className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-teal-500"
                rows={4}
              />
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button 
                onClick={handleSubmitInspection}
                disabled={isSubmitting} 
                className="w-full sm:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white text-[15px] font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 min-w-[200px]"
              >
                {isSubmitting ? 'Submitting...' : <><Send size={18}/> Submit to Admin</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
