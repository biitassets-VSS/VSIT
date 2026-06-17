'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, Search, Plus, Hash, UserCheck, Eye, X, 
  ImageIcon, Info, ShieldCheck, ClipboardCheck, 
  AlertCircle, CheckCircle2, CalendarDays, Filter, 
  Edit3, AlignLeft, UploadCloud, Save, Clock, ImagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
interface Asset { 
  id: string; 
  name: string; 
  tagId: string; 
  category?: string; 
  assignedToEmpId?: string;
  assignedToName?: string;
  imageUrl?: string; 
  status?: 'In Stock' | 'Assigned' | 'Repair' | 'Discard';
  inspectionStatus?: 'Passed' | 'Failed' | 'Pending';
  inspectionNotes?: string;
  lastInspectionDate?: string;
  upcomingInspectionDate?: string;
  inspectionAlert?: 'On Track' | 'Due Soon' | 'Overdue';
  inspectionPhotos?: string[];
}

interface Staff { empId: string; name: string; }

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null); // For View
  const [editAsset, setEditAsset] = useState<Asset | null>(null);         // For Edit
  const [showBulkUpload, setShowBulkUpload] = useState(false);            // For Bulk Upload

  useEffect(() => {
    // 1. Load Staff (for assignment dropdown)
    const savedStaff = localStorage.getItem('vsit_staff_users');
    if (savedStaff) setStaffList(JSON.parse(savedStaff));
    else setStaffList([
      { empId: 'EMP-001', name: 'Lakhwinder Singh' },
      { empId: 'EMP-505', name: 'Demo Staff' }
    ]);

    // 2. Load Assets
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) {
      setAssets(JSON.parse(savedAssets));
    } else {
      // High-quality Demo Data matching new requirements
      setAssets([
        { 
          id: 'A-100', name: 'MacBook Pro M2', tagId: 'TAG-8099', category: 'Laptops', 
          assignedToEmpId: 'EMP-001', assignedToName: 'Lakhwinder Singh', status: 'Assigned',
          imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=1000',
          inspectionStatus: 'Passed', lastInspectionDate: '2024-05-12', upcomingInspectionDate: '2024-11-12', inspectionAlert: 'On Track',
          inspectionNotes: 'Asset is in excellent condition. Keyboard and screen passed all diagnostics.',
          inspectionPhotos: [
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=200',
            'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=200',
            'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=200'
          ] // Laptop rule: 5 slots, 3 filled, 2 will show empty
        },
        { 
          id: 'A-101', name: 'Dell 27" 4K Monitor', tagId: 'TAG-8100', category: 'Accessories', 
          status: 'In Stock', assignedToEmpId: '', assignedToName: '',
          imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=1000',
          inspectionStatus: 'Pending', lastInspectionDate: '2023-12-01', upcomingInspectionDate: '2024-05-10', inspectionAlert: 'Overdue',
          inspectionNotes: 'Quarterly check required before reassignment.',
          inspectionPhotos: [] // Other rule: 2 slots, both will show empty
        },
        { 
          id: 'A-102', name: 'Logitech MX Master 3', tagId: 'TAG-8105', category: 'Peripherals', 
          assignedToEmpId: 'EMP-505', assignedToName: 'Demo Staff', status: 'Repair',
          inspectionStatus: 'Failed', lastInspectionDate: '2024-05-14', upcomingInspectionDate: '2024-06-14', inspectionAlert: 'Due Soon',
          inspectionNotes: 'Scroll wheel sticking. Bluetooth drops intermittently.',
          inspectionPhotos: ['https://images.unsplash.com/photo-1585565804112-f201f68c48b4?auto=format&fit=crop&q=80&w=200']
        }
      ]);
    }
    setIsLoading(false);
  }, []);

  // Handle Save Edit
  const handleSaveEdit = () => {
    if (!editAsset) return;
    const updatedAssets = assets.map(a => a.id === editAsset.id ? editAsset : a);
    setAssets(updatedAssets);
    localStorage.setItem('vsit_assets_inventory', JSON.stringify(updatedAssets));
    setEditAsset(null);
  };

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    asset.tagId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Package size={24} className="text-teal-600" /> Asset Inventory
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage, inspect, and track company devices.</p>
        </div>
        
        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
          <button onClick={() => setShowBulkUpload(true)} className="w-full sm:w-auto px-5 py-3 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 border border-teal-200">
            <UploadCloud size={18} /> Bulk Upload
          </button>
          <Link href="/admin/assets/new" className="w-full sm:w-auto px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
            <Plus size={18} /> Add New Asset
          </Link>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl">
          <Search size={18} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by asset name or Tag ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 placeholder:text-gray-400"
          />
        </div>
        <button className="p-4 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
          <Filter size={18} />
        </button>
      </div>

      {/* ASSET LIST */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-10 text-center font-bold text-gray-400 bg-white rounded-3xl border border-gray-100">Loading Assets...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm font-bold bg-white rounded-3xl border border-gray-100">No assets found.</div>
        ) : (
          filteredAssets.map(asset => (
            <div key={asset.id} className="bg-white border border-gray-100 shadow-sm rounded-3xl hover:border-teal-300 transition-all flex flex-col lg:flex-row p-5 gap-5 group relative overflow-hidden">
              
              {/* Asset Core Details */}
              <div className="flex gap-4 lg:w-1/3 lg:border-r border-gray-100 lg:pr-5">
                <div className="w-20 h-20 shrink-0 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center relative border border-gray-200">
                  {asset.imageUrl ? <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-gray-400" />}
                  {/* Status Indicator Dot */}
                  <div className={`absolute top-1.5 right-1.5 w-3 h-3 rounded-full border-2 border-white ${asset.status === 'Repair' ? 'bg-orange-500' : asset.status === 'Discard' ? 'bg-red-500' : asset.status === 'In Stock' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <button onClick={() => setSelectedAsset(asset)} className="font-black text-lg text-gray-900 text-left hover:text-teal-600 truncate w-full transition-colors leading-tight">
                    {asset.name}
                  </button>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] font-mono bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md border border-teal-100 flex items-center gap-1">
                      <Hash size={10}/> {asset.tagId}
                    </span>
                    {asset.assignedToName ? (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-100">
                        <UserCheck size={10}/> {asset.assignedToName}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Inspection Quick View */}
              <div className="flex-1 flex flex-col justify-center bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {asset.inspectionStatus === 'Passed' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-md flex items-center gap-1"><CheckCircle2 size={12}/> Passed</span>}
                    {asset.inspectionStatus === 'Failed' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-md flex items-center gap-1"><AlertCircle size={12}/> Failed</span>}
                    {asset.inspectionStatus === 'Pending' && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black uppercase rounded-md flex items-center gap-1"><ShieldCheck size={12}/> Pending</span>}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">
                    <Clock size={12} className="text-teal-500"/> Last: {asset.lastInspectionDate || 'N/A'}
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-600 line-clamp-2 flex items-start gap-1.5">
                   <AlignLeft size={14} className="text-gray-400 shrink-0 mt-0.5"/>
                   {asset.inspectionNotes || "No inspection notes available."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row lg:flex-col items-center justify-center gap-3 lg:border-l border-gray-100 lg:pl-5 pt-4 lg:pt-0 border-t lg:border-t-0">
                <button 
                  onClick={() => setEditAsset({...asset})}
                  className="flex-1 lg:flex-none w-full lg:w-12 h-10 lg:h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-colors gap-2 lg:gap-0 font-bold text-sm"
                >
                  <Edit3 size={18} /> <span className="lg:hidden">Edit</span>
                </button>
                <button 
                  onClick={() => setSelectedAsset(asset)}
                  className="flex-1 lg:flex-none w-full lg:w-12 h-10 lg:h-12 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-colors gap-2 lg:gap-0 font-bold text-sm border border-gray-100"
                >
                  <Eye size={18} /> <span className="lg:hidden">View</span>
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. EDIT ASSET MODAL                                                       */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {editAsset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setEditAsset(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><Edit3 className="text-teal-600"/> Edit Asset Details</h3>
                <button onClick={() => setEditAsset(null)} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                {/* Name & Tag */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Asset Name</label>
                    <input type="text" value={editAsset.name} onChange={(e) => setEditAsset({...editAsset, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tag ID</label>
                    <input type="text" value={editAsset.tagId} onChange={(e) => setEditAsset({...editAsset, tagId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-teal-500" />
                  </div>
                </div>

                {/* Status & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
                    <select value={editAsset.status} onChange={(e) => setEditAsset({...editAsset, status: e.target.value as any})} className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500">
                      <option value="In Stock">In Stock</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Repair">Repair</option>
                      <option value="Discard">Discard</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
                    <input type="text" value={editAsset.category || ''} onChange={(e) => setEditAsset({...editAsset, category: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500" />
                  </div>
                </div>

                {/* Assignment */}
                <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 mt-2">
                  <label className="text-[11px] font-bold text-teal-800 uppercase tracking-wider mb-2 block flex items-center gap-2"><UserCheck size={14}/> Assign to Staff</label>
                  <select 
                    value={editAsset.assignedToEmpId || ''} 
                    onChange={(e) => {
                      const empId = e.target.value;
                      const staff = staffList.find(s => s.empId === empId);
                      setEditAsset({
                        ...editAsset, 
                        assignedToEmpId: empId, 
                        assignedToName: staff ? staff.name : '',
                        status: empId ? 'Assigned' : editAsset.status === 'Assigned' ? 'In Stock' : editAsset.status // Auto status update
                      });
                    }} 
                    className="w-full bg-white border border-teal-200 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {staffList.map(s => <option key={s.empId} value={s.empId}>{s.name} ({s.empId})</option>)}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-2">Assigning staff will automatically set status to 'Assigned'.</p>
                </div>

                <button onClick={handleSaveEdit} className="w-full mt-4 py-3.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                  <Save size={18}/> Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. VIEW DETAILS MODAL (With Timeline & Photo Rules)                       */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedAsset(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
            >
              {/* IMAGE HEADER */}
              <div className="w-full h-48 bg-gray-100 relative shrink-0">
                {selectedAsset.imageUrl ? <img src={selectedAsset.imageUrl} alt={selectedAsset.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300"><ImageIcon size={48} /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent"></div>
                <button onClick={() => setSelectedAsset(null)} className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full"><X size={20} /></button>
                
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <h3 className="text-2xl font-black text-white leading-tight drop-shadow-md">{selectedAsset.name}</h3>
                    <p className="text-gray-300 font-mono text-sm font-bold flex items-center gap-1 drop-shadow-md"><Hash size={12}/> {selectedAsset.tagId}</p>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg shadow-sm border ${selectedAsset.status === 'Repair' ? 'bg-orange-500/90 text-white border-orange-400' : selectedAsset.status === 'Discard' ? 'bg-red-500/90 text-white border-red-400' : selectedAsset.status === 'In Stock' ? 'bg-green-500/90 text-white border-green-400' : 'bg-blue-500/90 text-white border-blue-400'}`}>
                    {selectedAsset.status}
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                
                {/* ASSIGNMENT INFO */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm border border-gray-100">
                    <UserCheck size={20}/>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Current Assignment</p>
                    <p className="text-sm font-black text-gray-800">{selectedAsset.assignedToName || 'Unassigned - In Storage'}</p>
                  </div>
                </div>

                {/* INSPECTION TIMELINE & DETAILS */}
                <div className="bg-teal-50/40 rounded-2xl p-4 border border-teal-100">
                  <h4 className="text-xs font-black uppercase text-teal-800 flex items-center gap-2 border-b border-teal-100 pb-2 mb-3">
                    <ClipboardCheck size={16}/> Inspection Details
                  </h4>
                  
                  {/* Timeline */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><CheckCircle2 size={10}/> Last Checked</p>
                      <p className="text-xs font-black text-gray-800">{selectedAsset.lastInspectionDate || 'No Record'}</p>
                    </div>
                    <div className={`p-3 rounded-xl border shadow-sm ${selectedAsset.inspectionAlert === 'Overdue' ? 'bg-red-50 border-red-100' : selectedAsset.inspectionAlert === 'Due Soon' ? 'bg-orange-50 border-orange-100' : 'bg-white border-teal-100'}`}>
                      <p className={`text-[10px] font-bold uppercase mb-1 flex items-center gap-1 ${selectedAsset.inspectionAlert === 'Overdue' ? 'text-red-500' : 'text-gray-400'}`}><Clock size={10}/> Next Due</p>
                      <p className="text-xs font-black text-gray-800">{selectedAsset.upcomingInspectionDate || 'N/A'}</p>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${selectedAsset.inspectionAlert === 'Overdue' ? 'bg-red-100 text-red-600' : selectedAsset.inspectionAlert === 'Due Soon' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>{selectedAsset.inspectionAlert || 'Unknown'}</span>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-gray-700 bg-white p-3 rounded-xl border border-teal-100 mb-4 shadow-sm">
                    "{selectedAsset.inspectionNotes || "No notes recorded."}"
                  </p>

                  {/* DYNAMIC PHOTO SLOTS (Laptop = 5, Others = 2) */}
                  <div>
                    <span className="text-xs font-bold text-gray-600 block mb-2 flex justify-between">
                      Attached Photos
                      <span className="text-teal-600 font-mono">{(selectedAsset.category || '').toLowerCase().includes('laptop') ? 'Laptop (5 req)' : 'Standard (2 req)'}</span>
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {/* Render exactly 5 slots for laptops, 2 for others */}
                      {Array.from({ length: (selectedAsset.category || '').toLowerCase().includes('laptop') ? 5 : 2 }).map((_, idx) => {
                        const photoUrl = selectedAsset.inspectionPhotos?.[idx];
                        return photoUrl ? (
                          <img key={idx} src={photoUrl} alt={`Proof ${idx+1}`} className="w-16 h-16 rounded-lg object-cover border border-teal-200 shadow-sm shrink-0" />
                        ) : (
                          <div key={idx} className="w-16 h-16 rounded-lg border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center shrink-0 text-gray-300">
                            <ImagePlus size={16} />
                            <span className="text-[8px] font-bold mt-1">Empty</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setSelectedAsset(null); setEditAsset({...selectedAsset}); }} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold text-center rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Edit3 size={16}/> Quick Edit
                  </button>
                  <Link href={`/admin/assets/${selectedAsset.id}`} className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold text-center rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <Info size={16}/> Full Asset Page
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. BULK UPLOAD MODAL (UI Visual)                                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBulkUpload && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowBulkUpload(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 text-center"
            >
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Bulk Upload Assets</h3>
              <p className="text-sm font-medium text-gray-500 mb-6">Upload a CSV or Excel file to add multiple assets at once.</p>
              
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 mb-6 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center">
                <span className="text-sm font-bold text-gray-700">Click to Browse</span>
                <span className="text-xs text-gray-400 mt-1">or drag and drop file here</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowBulkUpload(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancel</button>
                <button onClick={() => setShowBulkUpload(false)} className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">Upload Data</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
