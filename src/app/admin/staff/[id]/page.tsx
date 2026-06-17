'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, UserCheck, Package, Hash, Mail, Phone, 
  CalendarDays, Power, Eye, X, ImageIcon, Info, ShieldCheck, 
  ClipboardCheck, AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Staff { 
  empId: string; name: string; department: string; isActive: boolean;
  email?: string; phone?: string; joiningDate?: string;
}

interface Asset { 
  id: string; name: string; tagId: string; category?: string; assignedToEmpId?: string;
  imageUrl?: string; status?: string;
  inspectionStatus?: 'Passed' | 'Failed' | 'Pending';
  inspectionNotes?: string;
  inspectionPhotos?: string[];
}

export default function StaffProfilePage() {
  const params = useParams();
  const paramId = params?.id as string | undefined;
  
  const [staff, setStaff] = useState<Staff | null>(null);
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    if (!paramId) return;
    const currentId = decodeURIComponent(paramId).trim().toLowerCase();
    
    // Fetch Staff
    const savedStaff = localStorage.getItem('vsit_staff_users');
    let allStaff: Staff[] = savedStaff ? JSON.parse(savedStaff) : [
      { empId: 'EMP-001', name: 'Lakhwinder Singh', department: 'IT Department', isActive: true, email: 'lakhwinder@vsit.com', phone: '+91 9876543210' },
      { empId: 'EMP-505', name: 'Demo Staff', department: 'Demo Dept', isActive: true, email: 'demo@vsit.com' } 
    ];
    setStaff(allStaff.find(s => s.empId?.trim().toLowerCase() === currentId) || null);

    // Fetch Assets & add Mock Inspection data for the popup demo
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) {
      const parsedAssets: Asset[] = JSON.parse(savedAssets);
      const filtered = parsedAssets.filter(a => a.assignedToEmpId?.trim().toLowerCase() === currentId);
      
      // Inject demo inspection data if none exists
      setAssignedAssets(filtered.map(a => ({
        ...a,
        inspectionStatus: a.inspectionStatus || 'Passed',
        inspectionNotes: a.inspectionNotes || 'Asset is in excellent working condition. No physical damage reported.',
        inspectionPhotos: a.inspectionPhotos || [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=200',
          'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=200'
        ]
      })));
    }
    setIsLoading(false);
  }, [paramId]);

  if (isLoading) return <div className="p-10 text-center font-bold text-gray-400">Loading...</div>;
  if (!staff) return <div className="p-10 text-center text-red-500 font-bold">Staff member not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">
      
      <Link href="/admin/staff" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 w-fit">
        <ArrowLeft size={16} /> Back
      </Link>

      {/* Staff Header */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-16 w-16 sm:h-20 sm:w-20 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center text-teal-600 shrink-0">
            <UserCheck size={32} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">{staff.name}</h1>
            <p className="text-xs sm:text-sm font-bold text-gray-500 mt-1">{staff.department} • {staff.empId}</p>
            <div className="mt-2">
              <span className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-black rounded-lg uppercase inline-flex items-center gap-1 ${staff.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                <Power size={12} /> {staff.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 relative z-10">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-gray-700 break-all"><Mail size={14} className="text-gray-400 shrink-0"/> {staff.email || 'N/A'}</div>
          <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-gray-700"><Phone size={14} className="text-gray-400 shrink-0"/> {staff.phone || 'N/A'}</div>
        </div>
      </div>

      {/* Assigned Assets */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 sm:p-6">
        <h3 className="text-sm font-black text-gray-800 uppercase mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
          <Package size={18} className="text-teal-500"/> Assigned Assets ({assignedAssets.length})
        </h3>
        
        {assignedAssets.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm font-bold bg-gray-50 rounded-xl border border-gray-100">No assets assigned.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assignedAssets.map(asset => (
              <div key={asset.id} className="p-3 sm:p-4 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center gap-3 sm:gap-4 group">
                
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
                  {asset.imageUrl ? <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-400" />}
                </div>

                <div className="flex-1 min-w-0 flex flex-col items-start">
                  {/* Clickable Asset Name */}
                  <button onClick={() => setSelectedAsset(asset)} className="font-black text-sm sm:text-base text-gray-900 text-left hover:text-teal-600 truncate w-full transition-colors">
                    {asset.name}
                  </button>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="text-[10px] font-mono bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-md"><Hash size={10} className="inline"/> {asset.tagId}</span>
                  </div>
                </div>

                <button onClick={() => setSelectedAsset(asset)} className="w-10 h-10 shrink-0 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-colors">
                  <Eye size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL WITH INSPECTION DETAILS */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedAsset(null)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="w-full h-48 sm:h-56 bg-gray-100 relative shrink-0">
                {selectedAsset.imageUrl ? <img src={selectedAsset.imageUrl} alt={selectedAsset.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300"><ImageIcon size={48} /></div>}
                
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
                <button onClick={() => setSelectedAsset(null)} className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full"><X size={20} /></button>
                <span className="absolute bottom-4 left-4 px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase rounded-lg shadow-sm flex items-center gap-1.5">
                  <ShieldCheck size={12}/> {selectedAsset.status || 'Assigned'}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-4">{selectedAsset.name}</h3>
                
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Tag ID</p>
                    <p className="text-xs sm:text-sm font-mono font-bold text-gray-800 flex items-center gap-1"><Hash size={12} className="text-teal-500"/>{selectedAsset.tagId}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Category</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1"><Package size={12} className="text-teal-500"/>{selectedAsset.category || 'N/A'}</p>
                  </div>
                </div>

                {/* NEW: Inspection Data Box */}
                <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100">
                  <h4 className="text-xs font-black uppercase text-teal-800 mb-3 flex items-center gap-2">
                    <ClipboardCheck size={16}/> Inspection Record
                  </h4>
                  
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600">Latest Status:</span>
                    {selectedAsset.inspectionStatus === 'Passed' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-md flex items-center gap-1"><CheckCircle2 size={12}/> Passed</span>}
                    {selectedAsset.inspectionStatus === 'Failed' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-md flex items-center gap-1"><AlertCircle size={12}/> Failed</span>}
                  </div>

                  <div className="mb-4">
                    <span className="text-xs font-bold text-gray-600 block mb-1">Inspector Notes:</span>
                    <p className="text-sm font-medium text-gray-700 bg-white p-3 rounded-xl border border-teal-100">
                      "{selectedAsset.inspectionNotes}"
                    </p>
                  </div>

                  {/* Inspection Photos */}
                  {selectedAsset.inspectionPhotos && selectedAsset.inspectionPhotos.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-gray-600 block mb-2">Attached Photos:</span>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {selectedAsset.inspectionPhotos.map((photo, idx) => (
                          <img key={idx} src={photo} alt="Inspection Proof" className="w-16 h-16 rounded-lg object-cover border border-teal-200 shadow-sm shrink-0" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Link href={`/admin/assets/${selectedAsset.id}`} className="mt-5 w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold text-center rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                  <Info size={16}/> View Full Asset Page
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
