'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PackageSearch, Plus, Search, Filter, Edit, 
  Trash2, X, Loader2, CheckCircle2, AlertCircle, Laptop, 
  Settings, Upload, Download, Eye, Camera, ShieldCheck, ClipboardCheck,
  ArrowLeft, Wrench, UserMinus, XOctagon, UserPlus
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
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Retired' | string; // Allowed string to handle bad DB data safely
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
}

// --- HELPER: Normalizes Status to exactly match UI needs ---
const formatStatus = (s?: string) => {
  if (!s) return 'Available';
  const lower = s.toLowerCase().trim();
  if (lower.includes('avail') || lower.includes('stock')) return 'Available';
  if (lower.includes('assign')) return 'Assigned';
  if (lower.includes('main') || lower.includes('repair')) return 'Maintenance';
  if (lower.includes('retire') || lower.includes('discard')) return 'Retired';
  return 'Available'; // Safe default
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
  const [inspectStatus, setInspectStatus] = useState('Good');
  const [inspectPhotos, setInspectPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = [
    'Laptop', 'Mouse', 'Keyboards', 'Wire Combo Kits', 
    'Wireless Combo Kits', 'Headphone', 'Stand', 
    'Mobile Phone', 'Cleaning Kits', 'EXT Ports'
  ];
  
  const CONDITIONS = ['Brand New', 'Good', 'Fair', 'Poor', 'Damaged'];
  const STATUSES = ['Available', 'Assigned', 'Maintenance', 'Retired'];

  // 1. FETCH DATA & LIVE SYNC
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const { data: staffData } = await supabase.from('profiles').select('emp_code, employee_code, full_name, name');
        let staffMap: Record<string, string> = {};
        let formattedStaffList: StaffMember[] = [];
        
        if (staffData) {
          staffData.forEach((s: any) => {
            const code = s.emp_code || s.employee_code;
            const name = s.full_name || s.name;
            if (code && name) {
              staffMap[code] = name;
              formattedStaffList.push({ emp_code: code, name: name });
            }
          });
          if (isMounted) setStaffList(formattedStaffList);
        }

        const { data: assetData, error } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        if (isMounted && assetData) {
          setAssets(assetData.map((a: any) => ({
            ...a,
            status: formatStatus(a.status), // FIX: Standardize status for perfect counting
            staff_name: a.emp_code ? (staffMap[a.emp_code] || 'Unknown Staff') : 'Unassigned',
            photos: a.photos || []
          })));
        }
      } catch (error) {
        console.error("Error fetching assets:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    // LIVE WEBSOCKET: Automatically refresh counts when anything changes in the DB
    const channel = supabase.channel('admin_assets_inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        fetchData();
      }).subscribe();

    return () => { 
      isMounted = false;
      supabase.removeChannel(channel); 
    };
  }, []);

  // Use a separate manual fetch function for explicit saves/updates so we don't rely entirely on sockets
  const manualFetchRefresh = async () => {
     const { data: staffData } = await supabase.from('profiles').select('emp_code, employee_code, full_name, name');
      let staffMap: Record<string, string> = {};
      if (staffData) {
        staffData.forEach((s: any) => {
          const code = s.emp_code || s.employee_code;
          const name = s.full_name || s.name;
          if (code && name) staffMap[code] = name;
        });
      }

      const { data: assetData } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      if (assetData) {
        setAssets(assetData.map((a: any) => ({
          ...a,
          status: formatStatus(a.status),
          staff_name: a.emp_code ? (staffMap[a.emp_code] || 'Unknown Staff') : 'Unassigned',
          photos: a.photos || []
        })));
      }
  }

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
    } catch (error: any) {
      alert("Error saving asset: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- QUICK ACTIONS ---
  const handleQuickStatusChange = async (newStatus: string) => {
    if (!selectedAsset) return;
    if (!confirm(`Are you sure you want to mark this asset as ${newStatus}?`)) return;
    
    setIsSubmitting(true);
    try {
      const isUnassigning = newStatus === 'Available' || newStatus === 'Maintenance' || newStatus === 'Retired';
      const newEmpCode = isUnassigning ? null : selectedAsset.emp_code;

      await supabase.from('assets').update({ 
        status: newStatus, 
        emp_code: newEmpCode 
      }).eq('id', selectedAsset.id);
      
      alert(`Asset successfully updated to ${newStatus}!`);
      
      setSelectedAsset(prev => prev ? {
        ...prev, 
        status: newStatus as any, 
        emp_code: newEmpCode,
        staff_name: isUnassigning ? 'Unassigned' : prev.staff_name
      } : null);
      
      setIsAssigning(false);
      await manualFetchRefresh(); 
    } catch (error: any) {
      alert("Error updating status: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignAsset = async (empCode: string) => {
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      await supabase.from('assets').update({
        status: 'Assigned',
        emp_code: empCode
      }).eq('id', selectedAsset.id);

      const staffName = staffList.find(s => s.emp_code === empCode)?.name || 'Unknown';
      
      setSelectedAsset(prev => prev ? {
        ...prev,
        status: 'Assigned',
        emp_code: empCode,
        staff_name: staffName
      } : null);

      setIsAssigning(false);
      setAssignSearch('');
      await manualFetchRefresh();
      alert("Asset successfully assigned!");
    } catch (error: any) {
      alert("Error assigning asset: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
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
    setInspectStatus('Good');
    setIsAssigning(false);
    setAssignSearch('');
    setViewState('detail');
  };

  // --- BULK UPLOAD ---
  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,brand,category,tag_id,serial_number,status,price,purchase_date,warranty_expiry,asset_condition\nDell XPS 15,Dell,Laptop,LAP-1001,SN123456,Available,85000,2023-01-15,2026-01-15,Brand New\nLogitech MX Master,Logitech,Mouse,MOU-2001,,Available,1500,,,Good";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Asset_Bulk_Upload_Sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // --- PHOTOS ---
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
          ctx.drawImage(img, 0, 0);
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(0, img.height - 60, img.width, 60);
          ctx.font = "bold 24px Arial";
          ctx.fillStyle = "white";
          const timestamp = new Date().toLocaleString();
          ctx.fillText(`Scanned: ${timestamp}`, 20, img.height - 20);
          setInspectPhotos(prev => [...prev, canvas.toDataURL('image/jpeg', 0.8)]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpdateInspection = async () => {
    if (!selectedAsset) return;
    const reqPhotos = selectedAsset.category === 'Laptop' ? 5 : 2;
    if (inspectPhotos.length !== reqPhotos) {
      alert(`Please upload exactly ${reqPhotos} photos for this ${selectedAsset.category}.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await supabase.from('assets').update({
        inspection_status: inspectStatus,
        inspection_notes: inspectNotes,
        photos: inspectPhotos,
        updated_at: new Date().toISOString()
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

  // FIX: Because formatStatus is running on fetch, these counts will now be 100% accurate
  const availableCount = assets.filter(a => a.status === 'Available').length;
  const assignedCount = assets.filter(a => a.status === 'Assigned').length;

  if (isLoading) return <div className="flex justify-center min-h-[60vh] items-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      
      {/* ============================================================== */}
      {/* 1. LIST VIEW                                                   */}
      {/* ============================================================== */}
      {viewState === 'list' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <PackageSearch size={28} className="text-orange-500" /> Asset Inventory
                </h1>
                <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full animate-pulse">Live Sync Active</span>
              </div>
              <p className="text-sm font-medium text-gray-500 mt-1">Manage and track all company hardware and devices.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="bg-green-50 border border-green-100 px-4 py-2 rounded-xl text-center"><p className="text-xs font-bold text-green-600 uppercase">Available</p><p className="text-lg font-black text-green-900">{availableCount}</p></div>
              <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl text-center"><p className="text-xs font-bold text-blue-600 uppercase">Assigned</p><p className="text-lg font-black text-blue-900">{assignedCount}</p></div>
              <button onClick={() => setIsBulkModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-colors shadow-sm"><Upload size={18} /> Bulk Upload</button>
              <button onClick={() => handleOpenAddForm()} className="bg-gray-900 hover:bg-orange-600 text-white px-5 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-colors shadow-sm"><Plus size={18} /> Add Asset</button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search by Asset Name, Brand or Tag ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"/>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              <Filter size={16} className="text-gray-400 shrink-0" />
              {['All', 'Available', 'Assigned', 'Maintenance', 'Retired'].map(status => (
                <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-2 rounded-lg text-xs font-black whitespace-nowrap transition-colors ${filterStatus === status ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>{status}</button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Asset Details</th>
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Category</th>
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Assignment</th>
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Status</th>
                    <th className="p-4 text-xs font-black text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-500 font-bold">No assets found matching your criteria.</td></tr>
                  ) : (
                    filteredAssets.map((asset) => (
                      <tr key={asset.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors cursor-pointer group" onClick={() => openAssetDetails(asset)}>
                        <td className="p-4">
                          <div className="font-black text-sm text-gray-900 group-hover:text-orange-600 transition-colors">{asset.name}</div>
                          <div className="flex flex-col gap-1 mt-1">
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 w-fit px-2 py-0.5 rounded border border-gray-200 hover:underline">TAG: {asset.tag_id}</span>
                            <span className="text-[10px] font-bold text-gray-400">Brand: {asset.brand || 'N/A'} | S/N: {asset.serial_number || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4"><div className="flex items-center gap-2 text-sm font-bold text-gray-700"><Laptop size={14} className="text-gray-400"/> {asset.category}</div></td>
                        <td className="p-4">
                          {asset.status === 'Assigned' ? (<div><p className="text-sm font-bold text-gray-900">{asset.staff_name}</p><p className="text-xs text-gray-500 font-medium">{asset.emp_code}</p></div>) : (<span className="text-xs text-gray-400 font-medium italic">Unassigned</span>)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1 w-fit ${asset.status === 'Available' ? 'bg-green-100 text-green-700' : asset.status === 'Assigned' ? 'bg-blue-100 text-blue-700' : asset.status === 'Maintenance' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                            {asset.status === 'Available' && <CheckCircle2 size={12}/>}{asset.status === 'Maintenance' && <Settings size={12}/>}{asset.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenAddForm(asset); }} className="p-2 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors border border-gray-200" title="Edit"><Edit size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(asset.id, asset.name); }} className="p-2 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg transition-colors border border-gray-200" title="Delete"><Trash2 size={16} /></button>
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

      {/* ============================================================== */}
      {/* 2. ADD / EDIT ASSET FORM                                       */}
      {/* ============================================================== */}
      {viewState === 'form' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-transparent py-2">
            <button onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Back to Assets
            </button>
            <h1 className="text-2xl font-black text-gray-900">{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h1>
          </div>

          <form onSubmit={handleSaveAsset} className="space-y-6">
            
            {/* Basic Information */}
            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-6">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Category *</label>
                  <select required value={formData.category} onChange={e => handleCategoryChange(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium">
                    <option value="" disabled>Select Category...</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Tag *</label>
                  <input required type="text" value={formData.tag_id} onChange={e => setFormData({...formData, tag_id: e.target.value})} placeholder="e.g. AST-1042" className="w-full px-4 py-3 rounded-xl border-2 border-teal-500 bg-white focus:outline-none text-sm font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Name *</label>
                  <input required type="text" placeholder="e.g. Dell XPS 15 Laptop" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Brand</label>
                  <input type="text" placeholder="e.g. Dell, Apple, HP" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Serial Number</label>
                  <input type="text" placeholder="e.g. SN-9982348X" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium" />
                </div>
              </div>
            </div>

            {/* Purchase & Warranty */}
            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-6">Purchase & Warranty</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Price / Cost *</label>
                  <span className="absolute left-4 bottom-3.5 text-gray-500 font-bold">₹</span>
                  <input type="number" required placeholder="0.00" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium" />
                </div>
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Purchase Date *</label>
                  <input type="date" required value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium" />
                </div>
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Warranty Expiry</label>
                  <input type="date" value={formData.warranty_expiry} onChange={e => setFormData({...formData, warranty_expiry: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium" />
                </div>
              </div>
            </div>

            {/* Condition & Status */}
            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-6">Condition & Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Condition *</label>
                  <select required value={formData.asset_condition} onChange={e => setFormData({...formData, asset_condition: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium">
                    {CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Current Status *</label>
                  <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium">
                    <option value="Available">In Stock (Available)</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
              </div>

              {formData.status === 'Assigned' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <label className="block text-sm font-black text-blue-900 mb-2 flex items-center gap-1"><AlertCircle size={16}/> Assign to Staff *</label>
                  <select required value={formData.emp_code} onChange={e => setFormData({...formData, emp_code: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800">
                    <option value="" disabled>Select Staff Member...</option>
                    {staffList.map(staff => (<option key={staff.emp_code} value={staff.emp_code}>{staff.name} ({staff.emp_code})</option>))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Condition Notes</label>
                <textarea rows={3} placeholder="Describe any physical issues..." value={formData.condition_notes} onChange={e => setFormData({...formData, condition_notes: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium resize-none"/>
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <button type="button" onClick={() => setViewState('list')} className="px-8 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 transition-all shadow-sm flex items-center gap-2">
                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Save Asset Record'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ============================================================== */}
      {/* 3. ASSET DETAILS & INSPECTION MODAL (DEEP VIEW)                */}
      {/* ============================================================== */}
      {viewState === 'detail' && selectedAsset && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto bg-white rounded-[24px] shadow-2xl overflow-hidden my-4 flex flex-col md:flex-row border border-gray-100">
          
          {/* LEFT SIDE: DETAILS */}
          <div className="w-full md:w-1/2 bg-gray-50 border-r border-gray-100 p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <button onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-4"><ArrowLeft size={16} /> Back</button>
                <h2 className="text-2xl font-black text-gray-900">{selectedAsset.name}</h2>
                <div className="flex gap-2 mt-1">
                  <p className="text-sm font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">{selectedAsset.tag_id}</p>
                  {selectedAsset.brand && <p className="text-sm font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded border border-gray-300">{selectedAsset.brand}</p>}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              
              {/* QUICK ACTIONS PANEL */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
                 
                 {!isAssigning ? (
                   <div className="flex flex-wrap gap-2">
                      {selectedAsset.status === 'Available' && (
                        <button onClick={() => setIsAssigning(true)} className="px-3 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center gap-1"><UserPlus size={14}/> Assign to Staff</button>
                      )}
                      {selectedAsset.status === 'Assigned' && (
                        <button onClick={() => handleQuickStatusChange('Available')} className="px-3 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200 hover:bg-green-100 flex items-center gap-1"><UserMinus size={14}/> Unassign Asset</button>
                      )}
                      {selectedAsset.status !== 'Maintenance' && (
                        <button onClick={() => handleQuickStatusChange('Maintenance')} className="px-3 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 hover:bg-amber-100 flex items-center gap-1"><Wrench size={14}/> Send to Repair</button>
                      )}
                      {selectedAsset.status === 'Maintenance' && (
                        <button onClick={() => handleQuickStatusChange('Available')} className="px-3 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200 hover:bg-green-100 flex items-center gap-1"><CheckCircle2 size={14}/> Mark Repaired (Available)</button>
                      )}
                      {selectedAsset.status !== 'Retired' && (
                        <button onClick={() => handleQuickStatusChange('Retired')} className="px-3 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200 hover:bg-red-100 flex items-center gap-1"><XOctagon size={14}/> Discard / Retire</button>
                      )}
                   </div>
                 ) : (
                   <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-3 animate-in fade-in zoom-in duration-300">
                     <div className="flex justify-between items-center">
                       <span className="text-xs font-black text-blue-900 uppercase">Select Staff Member</span>
                       <button onClick={() => setIsAssigning(false)} className="text-blue-400 hover:text-blue-700"><X size={14}/></button>
                     </div>
                     <div className="relative">
                       <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                       <input type="text" placeholder="Search by name or ID..." value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-lg text-xs font-medium border border-gray-200 outline-none focus:border-blue-500" />
                     </div>
                     <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                       {staffList.filter(s => s.name.toLowerCase().includes(assignSearch.toLowerCase()) || s.emp_code.toLowerCase().includes(assignSearch.toLowerCase())).map(staff => (
                         <div key={staff.emp_code} className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 hover:bg-blue-100 hover:border-blue-300 cursor-pointer transition-colors" onClick={() => handleAssignAsset(staff.emp_code)}>
                           <div>
                             <p className="text-xs font-bold text-gray-900">{staff.name}</p>
                             <p className="text-[10px] font-medium text-gray-500">{staff.emp_code}</p>
                           </div>
                           <Plus size={14} className="text-blue-600"/>
                         </div>
                       ))}
                       {staffList.filter(s => s.name.toLowerCase().includes(assignSearch.toLowerCase()) || s.emp_code.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 && (
                         <p className="text-xs text-center text-gray-500 py-2">No staff found.</p>
                       )}
                     </div>
                   </div>
                 )}
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Status & User</p>
                  {selectedAsset.status === 'Assigned' ? (
                     <div className="flex items-center gap-1.5">
                       <ShieldCheck size={14} className="text-blue-500" />
                       <span className="font-bold text-gray-900 text-sm">Assigned • {selectedAsset.staff_name}</span>
                     </div>
                  ) : (
                     <p className="font-bold text-gray-900 text-sm">{selectedAsset.status} • No User</p>
                  )}
                </div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Serial Number</p><p className="font-bold text-gray-900 text-sm">{selectedAsset.serial_number || 'N/A'}</p></div>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Latest Inspection Record</p>
                {selectedAsset.inspection_status ? (
                  <>
                    <p className={`font-black text-sm uppercase ${selectedAsset.inspection_status === 'Good' ? 'text-green-600' : 'text-red-600'}`}>{selectedAsset.inspection_status}</p>
                    <p className="text-xs text-gray-600 mt-1 font-medium italic">"{selectedAsset.inspection_notes}"</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-2">Last Updated: {selectedAsset.updated_at ? new Date(selectedAsset.updated_at).toLocaleDateString() : 'Unknown'}</p>
                    {selectedAsset.photos && selectedAsset.photos.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {selectedAsset.photos.map((p, i) => <img key={i} src={p} alt="Inspection" className="w-12 h-12 rounded object-cover border border-gray-200" />)}
                      </div>
                    )}
                  </>
                ) : (<p className="text-sm font-medium text-gray-500 italic">No inspection data recorded yet.</p>)}
              </div>
            </div>
            <button onClick={() => handleOpenAddForm(selectedAsset)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-800 mt-4"><Edit size={16}/> Edit Full Details</button>
          </div>

          {/* RIGHT SIDE: INSPECT ACTION */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 bg-white relative border-l border-gray-100">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-6"><ClipboardCheck className="text-orange-500"/> Update Inspection</h3>
            
            <div className="space-y-5">
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-xs font-bold text-orange-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                Rules: {selectedAsset.category === 'Laptop' ? 'Laptops require exactly 5 photos.' : 'Other assets require exactly 2 photos.'} All photos will be automatically watermarked.
              </div>

              <div><label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Condition Status</label><select value={inspectStatus} onChange={e => setInspectStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold"><option value="Good">Good Working Condition</option><option value="Scratched">Minor Damage / Scratched</option><option value="Faulty">Faulty / Broken</option></select></div>
              <div><label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Inspection Notes</label><textarea rows={3} placeholder="Add detailed notes here..." value={inspectNotes} onChange={e => setInspectNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium resize-none"/></div>
              
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Upload Photos ({inspectPhotos.length} / {selectedAsset.category === 'Laptop' ? 5 : 2})</label>
                <div className="flex gap-4 items-center">
                  <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-50"><Camera size={16}/> Choose Images</button>
                  <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handlePhotoCaptureWithWatermark} className="hidden" />
                  {inspectPhotos.length > 0 && <span className="text-xs font-black text-green-600 flex items-center gap-1"><CheckCircle2 size={14}/> Ready</span>}
                </div>
              </div>

              <button onClick={handleUpdateInspection} disabled={isSubmitting} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition-all shadow-sm flex items-center justify-center gap-2 text-sm mt-4">
                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Save Inspection Record'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- BULK UPLOAD MODAL --- */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-blue-50"><h2 className="text-lg font-black text-blue-900 flex items-center gap-2"><Upload size={20}/> Bulk Upload CSV</h2><button onClick={() => setIsBulkModalOpen(false)} className="p-2 text-blue-400 hover:bg-blue-100 rounded-full"><X size={20} /></button></div>
              <div className="p-6 space-y-6 text-center">
                <button onClick={handleDownloadSample} className="w-full py-3 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100"><Download size={18}/> Download Sample Format</button>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer group relative">
                  <Upload className="mx-auto text-gray-400 group-hover:text-blue-500 mb-3" size={32}/>
                  <p className="text-sm font-bold text-gray-700">Click to Select CSV File</p>
                  <p className="text-xs text-gray-400 mt-1">Only .csv files are supported</p>
                  <input type="file" accept=".csv" onChange={handleBulkUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                {isSubmitting && <p className="text-sm text-blue-600 font-bold flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16}/> Uploading Assets...</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}