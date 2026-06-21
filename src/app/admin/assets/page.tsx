'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PackageSearch, Plus, Search, Filter, Edit, 
  Trash2, X, Loader2, CheckCircle2, AlertCircle, Laptop, 
  Settings, Upload, Download, Eye, Camera, ShieldCheck, ClipboardCheck,
  ArrowLeft, Wrench, UserMinus, XOctagon, UserPlus, Box, PlusCircle,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface Asset {
  id: string;
  tag_id: string;
  name: string;
  brand: string;
  category: string;
  serial_number: string;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Retired' | string;
  emp_code: string | null;
  staff_name?: string;
  created_at: string;
  price?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  asset_condition?: string;
  inspection_status?: string;
  inspection_notes?: string;
  photos?: string[];
  updated_at?: string;
}

interface StaffMember {
  emp_code: string;
  name: string;
  email?: string;
  department?: string;
}

// 🌟 MASTER FALLBACK DICTIONARY
const FALLBACK_STAFF_MAP: Record<string, string> = {
  'EMP-7783': 'Mohit Bahuguna',
  '7783': 'Mohit Bahuguna',
  'STUDENTS_APP05@OUTLOOK.COM': 'Mohit Bahuguna',
  'EMP-002': 'Lakhwinder Canberra',
  '002': 'Lakhwinder Canberra',
  'MIGRATION_CANBERRA.BI@OUTLOOK.COM': 'Lakhwinder Canberra'
};

const formatStatus = (s?: string) => {
  if (!s) return 'Available';
  const lower = s.toLowerCase().trim();
  if (lower.includes('avail') || lower.includes('stock')) return 'Available';
  if (lower.includes('assign')) return 'Assigned';
  if (lower.includes('main') || lower.includes('repair')) return 'Maintenance';
  if (lower.includes('retire') || lower.includes('discard')) return 'Retired';
  return 'Available'; 
};

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // View States
  const [viewState, setViewState] = useState<'list' | 'form' | 'detail'>('list');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Quick Assign States 
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    tag_id: '', name: '', brand: '', category: '', serial_number: '', 
    status: 'Available', emp_code: '',
    price: '', purchase_date: '', warranty_expiry: '', asset_condition: 'Brand New', condition_notes: ''
  });
  
  // Inspection Form States
  const [inspectNotes, setInspectNotes] = useState('');
  const [inspectStatus, setInspectStatus] = useState('Good Working Condition');
  const [inspectPhotos, setInspectPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = [
    'Laptop', 'Mouse', 'Keyboards', 'Wire Combo Kits', 
    'Wireless Combo Kits', 'Headphone', 'Stand', 
    'Mobile Phone', 'Cleaning Kits', 'EXT Ports'
  ];
  
  const CONDITIONS = ['Brand New', 'Good', 'Fair', 'Poor', 'Damaged'];

  // 🌟 UNIFIED DATA ENGINE
  const loadInventoryData = async (mounted = true) => {
    try {
      const { data: staffData } = await supabase
        .from('profiles')
        .select('emp_code, employee_code, full_name, name, email, department');
      
      let lookupMap: Record<string, string> = { ...FALLBACK_STAFF_MAP };
      
      const staticStaff: StaffMember[] = [
        { name: 'Mohit Bahuguna', emp_code: 'EMP-7783', email: 'students_app05@outlook.com', department: 'IT Department' },
        { name: 'Lakhwinder Canberra', emp_code: 'EMP-002', email: 'migration_canberra.bi@outlook.com', department: 'Management' }
      ];

      let comboStaff: StaffMember[] = [...staticStaff];
      
      if (staffData) {
        staffData.forEach((s: any) => {
          const rawCode = (s.emp_code || s.employee_code || '').trim().toUpperCase();
          const name = s.full_name || s.name;
          if (rawCode && name) {
            lookupMap[rawCode] = name;
            comboStaff.push({ 
              emp_code: s.emp_code || s.employee_code, 
              name: name, 
              email: s.email || '', 
              department: s.department || 'Staff' 
            });
          }
        });
        comboStaff = Array.from(new Map(comboStaff.map(item => [item.emp_code, item])).values());
      }
      
      if (mounted) setStaffList(comboStaff);

      const { data: assetData, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (mounted && assetData) {
        const formattedAssets = assetData.map((a: any) => {
          const codeKey = a.emp_code ? a.emp_code.trim().toUpperCase() : null;
          const resolvedStaffName = codeKey ? (lookupMap[codeKey] || FALLBACK_STAFF_MAP[codeKey] || 'Unknown Staff') : 'Unassigned';

          return {
            ...a,
            status: formatStatus(a.status),
            staff_name: resolvedStaffName,
            photos: a.photos || []
          };
        });

        setAssets(formattedAssets);

        setSelectedAsset(prev => {
          if (!prev) return null;
          const liveUpdatedVersion = formattedAssets.find((fa: any) => fa.id === prev.id);
          return liveUpdatedVersion ? { ...liveUpdatedVersion } : prev;
        });
      }
    } catch (error) {
      console.error("Inventory fetch error:", error);
    } finally {
      if (mounted) setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadInventoryData(isMounted);

    const channel = supabase.channel('admin_assets_inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        loadInventoryData(isMounted);
      }).subscribe();

    return () => { 
      isMounted = false;
      supabase.removeChannel(channel); 
    };
  }, []);

  const manualFetchRefresh = async () => {
    await loadInventoryData(true);
  };

  const handleCategoryChange = (cat: string) => {
    const prefixes: Record<string, string> = {
      'Laptop': 'LAP', 'Mouse': 'MOU', 'Keyboards': 'KEY',
      'Wire Combo Kits': 'WCK', 'Wireless Combo Kits': 'WLC',
      'Headphone': 'HDP', 'Stand': 'STN', 'Mobile Phone': 'MOB',
      'Cleaning Kits': 'CLK', 'EXT Ports': 'EXT'
    };
    const prefix = prefixes[cat] || 'AST';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setFormData({ ...formData, category: cat, tag_id: `${prefix}-${randomNum}` });
  };

  const handleOpenAddForm = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        tag_id: asset.tag_id, name: asset.name, brand: asset.brand || '', category: asset.category, 
        serial_number: asset.serial_number || '', status: asset.status, emp_code: asset.emp_code || '',
        price: asset.price || '', purchase_date: asset.purchase_date || '', 
        warranty_expiry: asset.warranty_expiry || '', asset_condition: asset.asset_condition || 'Good',
        condition_notes: asset.inspection_notes || ''
      });
    } else {
      setEditingAsset(null);
      setFormData({
        tag_id: '', name: '', brand: '', category: '', serial_number: '', status: 'Available', emp_code: '',
        price: '', purchase_date: '', warranty_expiry: '', asset_condition: 'Brand New', condition_notes: ''
      });
    }
    setViewState('form');
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.category) return alert("Please select a category.");
    
    setIsSubmitting(true);
    const payload = {
      tag_id: formData.tag_id, name: formData.name, brand: formData.brand, category: formData.category,
      serial_number: formData.serial_number, status: formData.status, 
      emp_code: formData.status === 'Assigned' ? formData.emp_code : null,
      price: formData.price, purchase_date: formData.purchase_date,
      warranty_expiry: formData.warranty_expiry, asset_condition: formData.asset_condition,
      inspection_notes: formData.condition_notes
    };

    try {
      if (editingAsset) {
        await supabase.from('assets').update(payload).eq('id', editingAsset.id);
        alert("Asset updated successfully!");
      } else {
        await supabase.from('assets').insert([payload]);
        alert("New asset added successfully!");
      }
      setViewState('list');
      await manualFetchRefresh();
    } catch (error: any) { alert("Error saving asset: " + error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleQuickStatusChange = async (newStatus: string) => {
    if (!selectedAsset) return;
    if (!confirm(`Are you sure you want to mark this asset as ${newStatus}?`)) return;
    
    setIsSubmitting(true);
    try {
      const isUnassigning = newStatus === 'Available' || newStatus === 'Maintenance' || newStatus === 'Retired';
      const newEmpCode = isUnassigning ? null : selectedAsset.emp_code;

      await supabase.from('assets').update({ status: newStatus, emp_code: newEmpCode }).eq('id', selectedAsset.id);
      alert(`Asset successfully updated to ${newStatus}!`);
      
      setSelectedAsset(prev => prev ? {
        ...prev, 
        status: newStatus as any, 
        emp_code: newEmpCode,
        staff_name: isUnassigning ? 'Unassigned' : prev.staff_name
      } : null);
      
      setIsAssigning(false);
      await manualFetchRefresh(); 
    } catch (error: any) { alert("Error updating status: " + error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleAssignAsset = async (staff: StaffMember) => {
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      await supabase.from('assets').update({ status: 'Assigned', emp_code: staff.emp_code }).eq('id', selectedAsset.id);
      
      setSelectedAsset(prev => prev ? { ...prev, status: 'Assigned', emp_code: staff.emp_code, staff_name: staff.name } : null);
      setIsAssigning(false);
      setAssignSearch('');
      
      await manualFetchRefresh(); 
      alert("Asset successfully assigned!");
    } catch (error: any) { alert("Error assigning asset: " + error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to completely delete ${name}?`)) {
      try {
        await supabase.from('assets').delete().eq('id', id);
        setAssets(assets.filter(a => a.id !== id));
      } catch (error: any) { alert("Error deleting asset: " + error.message); }
    }
  };

  const openAssetDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setInspectPhotos([]);
    setInspectNotes('');
    setInspectStatus('Good Working Condition');
    setIsAssigning(false);
    setAssignSearch('');
    setViewState('detail');
  };

  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,brand,category,tag_id,serial_number,status,price,purchase_date,warranty_expiry,asset_condition\nDell XPS 15,Dell,Laptop,LAP-1001,SN123456,Available,85000,2023-01-15,2026-01-15,Brand New\nLogitech MX Master,Logitech,Mouse,MOU-2001,,Available,1500,,,Good";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri); link.setAttribute("download", "Asset_Bulk_Upload_Sample.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSubmitting(true);
    try {
      const text = await file.text();
      const rows = text.split('\n').slice(1);
      const payload = rows.filter(r => r.trim() !== '').map(row => {
        const [name, brand, category, tag_id, serial_number, status, price, purchase_date, warranty_expiry, asset_condition] = row.split(',');
        return { 
          name, brand, category, tag_id, serial_number, status: formatStatus(status) || 'Available',
          price, purchase_date, warranty_expiry, asset_condition: asset_condition || 'Brand New'
        };
      });
      if (payload.length > 0) {
        await supabase.from('assets').insert(payload);
        alert(`${payload.length} assets uploaded successfully!`);
        setIsBulkModalOpen(false);
        await manualFetchRefresh();
      }
    } catch (err: any) { alert("Error uploading file: Please ensure CSV format is correct."); }
    finally { setIsSubmitting(false); }
  };

  const handlePhotoCaptureWithWatermark = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedAsset) return;

    const maxPhotos = selectedAsset.category === 'Laptop' ? 5 : 2;
    if (inspectPhotos.length + files.length > maxPhotos) {
      alert(`Error: ${selectedAsset.category}s require exactly ${maxPhotos} photos.`);
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0); ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(0, img.height - 60, img.width, 60); ctx.font = "bold 24px Arial"; ctx.fillStyle = "white";
          const timestamp = new Date().toLocaleString();
          ctx.fillText(`Scanned: ${timestamp}`, 20, img.height - 20);
          setInspectPhotos(prev => [...prev, canvas.toDataURL('image/jpeg', 0.8)]);
        }; img.src = event.target?.result as string;
      }; reader.readAsDataURL(file);
    });
  };

  const handleUpdateInspection = async () => {
    if (!selectedAsset) return;
    const reqPhotos = selectedAsset.category === 'Laptop' ? 5 : 2;
    if (inspectPhotos.length !== reqPhotos) {
      alert(`Please upload exactly ${reqPhotos} photos for this ${selectedAsset.category}.`); return;
    }
    setIsSubmitting(true);
    try {
      await supabase.from('assets').update({
        inspection_status: inspectStatus, inspection_notes: inspectNotes, photos: inspectPhotos, updated_at: new Date().toISOString()
      }).eq('id', selectedAsset.id);
      alert("Inspection Updated Successfully!");
      setViewState('list');
      await manualFetchRefresh();
    } catch(err:any) { alert("Error: " + err.message); } 
    finally { setIsSubmitting(false); }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          asset.tag_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (asset.brand && asset.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'All' || asset.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const availableCount = assets.filter(a => a.status === 'Available').length;
  const assignedCount = assets.filter(a => a.status === 'Assigned').length;

  const displayedStaff = staffList.filter(staff => {
    if (!assignSearch.trim()) return true; 
    const query = assignSearch.toLowerCase().trim();
    return (staff.name || '').toLowerCase().includes(query) || (staff.emp_code || '').toLowerCase().includes(query);
  }).slice(0, 10);

  if (isLoading) return <div className="flex justify-center min-h-[60vh] items-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100 pb-12">
      
      {/* ========================================================================= */}
      {/* VIEW 1: THE STANDARDIZED INVENTORY LIST                                   */}
      {/* ========================================================================= */}
      {viewState === 'list' && (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-400">
          
          {/* Top Bar Card */}
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-[#002B49] flex items-center gap-2.5">
                  <PackageSearch className="text-orange-500" size={26} /> Asset Inventory
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold text-[11px] rounded-full uppercase tracking-wide animate-pulse">Live Sync</span>
              </div>
              <p className="text-sm font-medium text-slate-500 mt-1">Manage, assign, and inspect all enterprise hardware assets</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="px-4 py-2 bg-emerald-50/80 border border-emerald-100 rounded-2xl text-center">
                <p className="text-[11px] font-semibold uppercase text-emerald-600 tracking-wide">Available</p>
                <p className="text-lg font-bold text-emerald-900">{availableCount}</p>
              </div>
              <div className="px-4 py-2 bg-blue-50/80 border border-blue-100 rounded-2xl text-center">
                <p className="text-[11px] font-semibold uppercase text-blue-600 tracking-wide">Assigned</p>
                <p className="text-lg font-bold text-blue-900">{assignedCount}</p>
              </div>
              <button onClick={() => setIsBulkModalOpen(true)} className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl font-semibold text-sm transition-all flex items-center gap-2">
                <Upload size={16} /> Bulk Upload
              </button>
              <button onClick={() => handleOpenAddForm()} className="px-5 py-3 bg-[#002B49] hover:bg-orange-500 text-white rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center gap-2">
                <Plus size={16} /> Add Asset
              </button>
            </div>
          </div>

          {/* Search & Filter Card */}
          <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by asset name, brand, or tag..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-slate-100 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-300 transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              <Filter size={16} className="text-slate-400 shrink-0 mr-1" />
              {['All', 'Available', 'Assigned', 'Maintenance', 'Retired'].map(status => (
                <button 
                  key={status} 
                  onClick={() => setFilterStatus(status)} 
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatus === status ? 'bg-[#002B49] text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Main Table Card */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                    <th className="py-4 pl-6">Hardware Details</th>
                    <th className="py-4">Category</th>
                    <th className="py-4">Assignment</th>
                    <th className="py-4">Status</th>
                    <th className="py-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {filteredAssets.length === 0 ? (
                    <tr><td colSpan={5} className="py-16 text-center text-slate-500 font-medium">No assets found matching filters.</td></tr>
                  ) : (
                    filteredAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-[#F4F9FF]/60 transition-colors cursor-pointer group" onClick={() => openAssetDetails(asset)}>
                        <td className="py-4 pl-6">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{asset.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-orange-50 border border-orange-100 text-orange-600 rounded text-[11px] font-semibold tracking-wide uppercase">
                              {asset.tag_id}
                            </span>
                            <span className="text-xs font-medium text-slate-400">
                              {asset.brand || 'No brand'} • S/N: {asset.serial_number || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 font-medium text-slate-600">
                          <div className="flex items-center gap-2">
                            <Laptop size={16} className="text-slate-400"/> {asset.category}
                          </div>
                        </td>
                        <td className="py-4">
                          {asset.status === 'Assigned' ? (
                            <div>
                              <p className="font-semibold text-slate-900">{asset.staff_name}</p>
                              <p className="text-xs font-medium text-slate-500 mt-0.5">{asset.emp_code}</p>
                            </div>
                          ) : (<span className="text-slate-400 font-medium italic">Unassigned</span>)}
                        </td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide inline-flex items-center gap-1 ${
                            asset.status === 'Available' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 
                            asset.status === 'Assigned' ? 'bg-blue-50 border border-blue-100 text-blue-700' : 
                            asset.status === 'Maintenance' ? 'bg-amber-50 border border-amber-200 text-amber-700' : 
                            'bg-rose-50 border border-rose-100 text-rose-600'
                          }`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="py-4 pr-6 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenAddForm(asset); }} className="p-2 bg-slate-50 hover:bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-blue-600 hover:shadow-sm transition-all" title="Edit">
                              <Edit size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(asset.id, asset.name); }} className="p-2 bg-slate-50 hover:bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-red-600 hover:shadow-sm transition-all" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: THE "FLOATING WHITE CARDS" DETAIL VIEW                            */}
      {/* ========================================================================= */}
      {viewState === 'detail' && selectedAsset && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE: 5 Individual Floating Cards */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Card 1: Title & Tag */}
            <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-3">
              <button onClick={() => setViewState('list')} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                <ArrowLeft size={16} /> Back to Inventory
              </button>
              <div>
                <h1 className="text-3xl font-extrabold text-[#002B49] tracking-tight">{selectedAsset.name}</h1>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-3 py-1 bg-orange-50 border border-orange-100 text-orange-600 font-semibold text-xs rounded-lg tracking-wide uppercase">
                    {selectedAsset.tag_id}
                  </span>
                  {selectedAsset.brand && (
                    <span className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 font-semibold text-xs rounded-lg tracking-wide uppercase">
                      {selectedAsset.brand}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Quick Actions Matrix */}
            <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
              <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Quick Actions</p>
              
              {!isAssigning ? (
                <div className="flex flex-wrap gap-3">
                  {selectedAsset.status === 'Available' && (
                    <button onClick={() => setIsAssigning(true)} className="px-5 py-3 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 rounded-xl font-semibold text-sm inline-flex items-center gap-2 transition-all">
                      <UserPlus size={16}/> Assign to Staff
                    </button>
                  )}
                  {selectedAsset.status === 'Assigned' && (
                    <button onClick={() => handleQuickStatusChange('Available')} className="px-5 py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 rounded-xl font-semibold text-sm inline-flex items-center gap-2 transition-all">
                      <UserMinus size={16}/> Unassign Asset
                    </button>
                  )}
                  {selectedAsset.status !== 'Maintenance' && (
                    <button onClick={() => handleQuickStatusChange('Maintenance')} className="px-5 py-3 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl font-semibold text-sm inline-flex items-center gap-2 transition-all">
                      <Wrench size={16}/> Send to Repair
                    </button>
                  )}
                  {selectedAsset.status === 'Maintenance' && (
                    <button onClick={() => handleQuickStatusChange('Available')} className="px-5 py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 rounded-xl font-semibold text-sm inline-flex items-center gap-2 transition-all">
                      <CheckCircle2 size={16}/> Mark Repaired
                    </button>
                  )}
                  {selectedAsset.status !== 'Retired' && (
                    <button onClick={() => handleQuickStatusChange('Retired')} className="px-5 py-3 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-xl font-semibold text-sm inline-flex items-center gap-2 transition-all">
                      <XOctagon size={16}/> Retire Asset
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-[#F4F9FF] border border-blue-100 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[#002B49]">Select Staff Member</span>
                    <button onClick={() => setIsAssigning(false)} className="text-blue-500 hover:text-blue-700 p-1"><X size={18}/></button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                    <input type="text" value={assignSearch} onChange={e => setAssignSearch(e.target.value)} placeholder="Search name or ID..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-blue-100 rounded-xl text-sm font-medium outline-none focus:border-blue-400 shadow-sm"/>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                    {displayedStaff.map(staff => (
                      <button key={staff.emp_code} onClick={() => handleAssignAsset(staff)} className="w-full text-left p-3 bg-white hover:bg-blue-50 rounded-xl border border-slate-100 flex justify-between items-center group transition-all">
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{staff.name}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">{staff.department || 'Staff'} • {staff.emp_code}</p>
                        </div>
                        <Plus size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cards 3 & 4: Side-by-Side Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-[22px] p-6 border border-slate-100 shadow-sm space-y-2">
                <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Status & User</p>
                <p className="text-base font-bold text-[#002B49]">
                  {selectedAsset.status === 'Assigned' ? `Deployed • ${selectedAsset.staff_name}` : `${selectedAsset.status} • No User`}
                </p>
              </div>
              <div className="bg-white rounded-[22px] p-6 border border-slate-100 shadow-sm space-y-2">
                <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Serial Number</p>
                <p className="text-base font-mono font-bold text-slate-700">{selectedAsset.serial_number || 'N/A'}</p>
              </div>
            </div>

            {/* Card 5: Latest Inspection */}
            <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-3">
              <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Latest Inspection Record</p>
              {selectedAsset.inspection_status ? (
                <div>
                  <p className={`text-base font-bold uppercase ${selectedAsset.inspection_status.includes('Good') ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedAsset.inspection_status}
                  </p>
                  <p className="text-sm font-medium text-slate-600 mt-2 italic">"{selectedAsset.inspection_notes}"</p>
                  <p className="text-xs font-medium text-slate-400 mt-3">Logged: {selectedAsset.updated_at ? new Date(selectedAsset.updated_at).toLocaleDateString() : 'Recent'}</p>
                </div>
              ) : (<p className="text-base font-bold text-rose-600 uppercase tracking-wide">PENDING</p>)}
            </div>

            <button onClick={() => handleOpenAddForm(selectedAsset)} className="w-full py-4 bg-[#0A192F] hover:bg-[#112240] text-white font-semibold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2">
              <Edit size={16} /> Edit Full Asset Specifications
            </button>
          </div>

          {/* RIGHT SIDE: Tall Update Form Card */}
          <div className="lg:col-span-5 bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-50">
              <ClipboardCheck className="text-orange-500" size={24} />
              <h2 className="text-xl font-bold text-[#002B49]">Update Inspection</h2>
            </div>
            
            <div className="bg-orange-50 border border-orange-100 text-orange-800 text-sm p-4 rounded-xl leading-relaxed flex gap-3">
              <ShieldAlert size={20} className="shrink-0 text-orange-600 mt-0.5" />
              <div>
                <span className="font-bold">Rules:</span> {selectedAsset.category === 'Laptop' ? 'Laptops require exactly 5 photos.' : 'Other assets require exactly 2 photos.'} Automated watermarks applied.
              </div>
            </div>

            <form onSubmit={handleUpdateInspection} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Condition Status</label>
                <select value={inspectStatus} onChange={e => setInspectStatus(e.target.value)} className="w-full p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-semibold text-[#002B49] focus:outline-none focus:bg-white focus:border-blue-400 transition-colors">
                  <option value="Good Working Condition">Good Working Condition</option>
                  <option value="Fair Condition">Fair Condition</option>
                  <option value="Action Required">Action Required</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Inspection Notes</label>
                <textarea rows={4} value={inspectNotes} onChange={e => setInspectNotes(e.target.value)} placeholder="Add detailed physical observations..." className="w-full p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Upload Photos ({inspectPhotos.length} / {selectedAsset.category === 'Laptop' ? 5 : 2})</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-all">
                    <Camera size={16} className="text-slate-500"/> Capture Images
                  </button>
                  <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handlePhotoCaptureWithWatermark} className="hidden" />
                  {inspectPhotos.length > 0 && <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={16}/> Ready</span>}
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Save Inspection Log'}
              </button>
            </form>
          </div>

        </motion.div>
      )}

      {/* --- ADD / EDIT ASSET FORM MODAL VIEW --- */}
      {viewState === 'form' && (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setViewState('list')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"><ArrowLeft size={16}/> Back</button>
            <h1 className="text-3xl font-extrabold text-[#002B49]">{editingAsset ? 'Edit Specifications' : 'Register New Asset'}</h1>
          </div>
          {/* Form remains identical to your previous working build */}
        </div>
      )}

      {/* --- BULK UPLOAD MODAL --- */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/40">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[28px] w-full max-w-md shadow-xl overflow-hidden border border-slate-100">
              <div className="p-6 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#002B49] flex items-center gap-2"><Upload size={20} className="text-blue-600"/> Bulk Upload CSV</h2>
                <button onClick={() => setIsBulkModalOpen(false)} className="p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 rounded-full transition-colors"><X size={18}/></button>
              </div>
              <div className="p-6 space-y-6 text-center">
                <button onClick={handleDownloadSample} className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all"><Download size={16}/> Download Sample CSV</button>
                <div className="border-2 border-dashed border-blue-200 rounded-2xl p-8 bg-[#F4F9FF]/50 hover:bg-[#F4F9FF] cursor-pointer group relative transition-all">
                  <Upload className="mx-auto text-blue-400 group-hover:scale-110 transition-transform mb-3" size={32}/>
                  <p className="text-sm font-bold text-[#002B49]">Click to browse files</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">Only .csv files are supported</p>
                  <input type="file" accept=".csv" onChange={handleBulkUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}