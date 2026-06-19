'use client';

import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, Plus, Search, Filter, Edit, 
  Trash2, X, Loader2, CheckCircle2, AlertCircle, Laptop, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface Asset {
  id: string;
  tag_id: string;
  name: string;
  category: string;
  serial_number: string;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Retired';
  emp_code: string | null;
  staff_name?: string;
  created_at: string;
}

interface StaffMember {
  emp_code: string;
  name: string;
}

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    tag_id: '',
    name: '',
    category: 'Laptop',
    serial_number: '',
    status: 'Available',
    emp_code: ''
  });

  const CATEGORIES = ['Laptop', 'Monitor', 'Mouse', 'Keyboard', 'Headphone', 'Mobile Phone', 'Other'];
  const STATUSES = ['Available', 'Assigned', 'Maintenance', 'Retired'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Staff for assignment dropdown and name mapping
      const { data: staffData } = await supabase.from('staff').select('emp_code, name');
      let staffMap: Record<string, string> = {};
      
      if (staffData) {
        setStaffList(staffData);
        staffData.forEach((s: any) => staffMap[s.emp_code] = s.name);
      }

      // Fetch Assets
      const { data: assetData, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (assetData) {
        const mappedAssets = assetData.map((a: any) => ({
          ...a,
          staff_name: a.emp_code ? (staffMap[a.emp_code] || 'Unknown Staff') : 'Unassigned'
        }));
        setAssets(mappedAssets);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        tag_id: asset.tag_id,
        name: asset.name,
        category: asset.category,
        serial_number: asset.serial_number || '',
        status: asset.status,
        emp_code: asset.emp_code || ''
      });
    } else {
      setEditingAsset(null);
      setFormData({
        tag_id: `TAG-${Math.floor(1000 + Math.random() * 9000)}`, // Auto-generate a tag
        name: '',
        category: 'Laptop',
        serial_number: '',
        status: 'Available',
        emp_code: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // If status is not 'Assigned', clear the emp_code
    const finalEmpCode = formData.status === 'Assigned' ? formData.emp_code : null;

    const payload = {
      tag_id: formData.tag_id,
      name: formData.name,
      category: formData.category,
      serial_number: formData.serial_number,
      status: formData.status,
      emp_code: finalEmpCode,
    };

    try {
      if (editingAsset) {
        const { error } = await supabase.from('assets').update(payload).eq('id', editingAsset.id);
        if (error) throw error;
        alert("Asset updated successfully!");
      } else {
        const { error } = await supabase.from('assets').insert([payload]);
        if (error) throw error;
        alert("New asset added successfully!");
      }
      setIsModalOpen(false);
      fetchData(); // Refresh list
    } catch (error: any) {
      alert("Error saving asset: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      try {
        const { error } = await supabase.from('assets').delete().eq('id', id);
        if (error) throw error;
        setAssets(assets.filter(a => a.id !== id));
      } catch (error: any) {
        alert("Error deleting asset: " + error.message);
      }
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          asset.tag_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || asset.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const availableCount = assets.filter(a => a.status === 'Available').length;
  const assignedCount = assets.filter(a => a.status === 'Assigned').length;

  if (isLoading) return <div className="flex justify-center min-h-[60vh] items-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER & STATS */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <PackageSearch size={28} className="text-orange-500" />
            Asset Inventory
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage and track all company hardware and devices.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="bg-green-50 border border-green-100 px-4 py-2 rounded-xl text-center flex-1 lg:flex-none">
            <p className="text-xs font-bold text-green-600 uppercase">Available</p>
            <p className="text-lg font-black text-green-900">{availableCount}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl text-center flex-1 lg:flex-none">
            <p className="text-xs font-bold text-blue-600 uppercase">Assigned</p>
            <p className="text-lg font-black text-blue-900">{assignedCount}</p>
          </div>
          <button onClick={() => handleOpenModal()} className="bg-gray-900 hover:bg-orange-600 text-white px-5 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-colors shadow-sm ml-2">
            <Plus size={18} /> Add Asset
          </button>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Asset Name or Tag ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter size={16} className="text-gray-400 shrink-0" />
          {['All', 'Available', 'Assigned', 'Maintenance', 'Retired'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-xs font-black whitespace-nowrap transition-colors ${
                filterStatus === status 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* ASSETS TABLE */}
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
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500 font-bold">No assets found matching your criteria.</td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-sm text-gray-900">{asset.name}</div>
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 w-fit px-2 py-0.5 rounded border border-gray-200">TAG: {asset.tag_id}</span>
                        <span className="text-[10px] font-bold text-gray-400">S/N: {asset.serial_number || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Laptop size={14} className="text-gray-400"/> {asset.category}
                      </div>
                    </td>
                    <td className="p-4">
                      {asset.status === 'Assigned' ? (
                        <div>
                          <p className="text-sm font-bold text-gray-900">{asset.staff_name}</p>
                          <p className="text-xs text-gray-500 font-medium">{asset.emp_code}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1 w-fit ${
                        asset.status === 'Available' ? 'bg-green-100 text-green-700' :
                        asset.status === 'Assigned' ? 'bg-blue-100 text-blue-700' :
                        asset.status === 'Maintenance' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {asset.status === 'Available' && <CheckCircle2 size={12}/>}
                        {asset.status === 'Maintenance' && <Settings size={12}/>}
                        {asset.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(asset)} className="p-2 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors border border-gray-200" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(asset.id, asset.name)} className="p-2 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg transition-colors border border-gray-200" title="Delete">
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

      {/* ADD / EDIT ASSET MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden my-8">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <PackageSearch className="text-orange-500" size={20} /> 
                  {editingAsset ? 'Edit Asset' : 'Add New Asset'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveAsset} className="p-6 space-y-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Asset Tag ID *</label>
                    <input required type="text" value={formData.tag_id} onChange={e => setFormData({...formData, tag_id: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Serial Number</label>
                    <input type="text" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold" placeholder="Optional" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Asset Name / Model *</label>
                  <input required type="text" placeholder="e.g. Dell XPS 15" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Category *</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold">
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Current Status *</label>
                    <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold">
                      {STATUSES.map(stat => <option key={stat} value={stat}>{stat}</option>)}
                    </select>
                  </div>
                </div>

                {/* Show assignment dropdown ONLY if status is set to Assigned */}
                {formData.status === 'Assigned' && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <label className="block text-xs font-black text-blue-800 uppercase mb-1.5 flex items-center gap-1"><AlertCircle size={14}/> Assign to Staff *</label>
                    <select required value={formData.emp_code} onChange={e => setFormData({...formData, emp_code: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800">
                      <option value="" disabled>Select Staff Member...</option>
                      {staffList.map(staff => (
                        <option key={staff.emp_code} value={staff.emp_code}>{staff.name} ({staff.emp_code})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition-all shadow-sm flex items-center justify-center gap-2 text-sm">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Save Asset'}
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}