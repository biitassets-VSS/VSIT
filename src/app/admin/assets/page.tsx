'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PackageSearch, Plus, Search, Filter, Edit, 
  Trash2, X, Loader2, CheckCircle2, AlertCircle, Laptop, 
  Settings, Upload, Download, Eye, Camera, ShieldCheck, ClipboardCheck,
  ArrowLeft, Wrench, UserMinus, XOctagon, UserPlus, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewState, setViewState] = useState<'list' | 'form' | 'detail'>('list');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    tag_id: '', name: '', brand: '', category: 'Laptop', serial_number: '', 
    status: 'Available', emp_code: '', price: '', purchase_date: '', 
    warranty_expiry: '', asset_condition: 'Brand New', condition_notes: ''
  });

  const CATEGORIES = ['Laptop', 'Mouse', 'Keyboards', 'Wire Combo Kits', 'Wireless Combo Kits', 'Headphone', 'Stand', 'Mobile Phone', 'Cleaning Kits', 'EXT Ports'];

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: s } = await supabase.from('staff').select('emp_code, name');
    const { data: a } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (s) setStaffList(s);
    if (a) {
      const staffMap = s ? Object.fromEntries(s.map(st => [st.emp_code, st.name])) : {};
      setAssets(a.map(at => ({ ...at, staff_name: staffMap[at.emp_code] || 'Unassigned' })));
    }
    setIsLoading(false);
  };

  const handleCategoryChange = (cat: string) => {
    const prefixes: Record<string, string> = { 'Laptop': 'LAP', 'Mouse': 'MOU', 'Keyboards': 'KEY', 'Headphone': 'HDP', 'Mobile Phone': 'MOB' };
    const prefix = prefixes[cat] || 'AST';
    setFormData({ ...formData, category: cat, tag_id: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}` });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = { ...formData, emp_code: formData.status === 'Assigned' ? formData.emp_code : null };
    if (selectedAsset?.id) {
      await supabase.from('assets').update(payload).eq('id', selectedAsset.id);
    } else {
      await supabase.from('assets').insert([payload]);
    }
    setIsSubmitting(false);
    setViewState('list');
    fetchData();
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <PackageSearch size={28} className="text-orange-500" /> Asset Inventory
        </h1>
        <div className="flex gap-3">
          <button onClick={() => setIsBulkModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-sm">Bulk Upload</button>
          <button onClick={() => { setViewState('form'); setSelectedAsset(null); }} className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-black text-sm">+ Add New Asset</button>
        </div>
      </div>

      {/* LIST VIEW */}
      {viewState === 'list' && (
        <div className="bg-white rounded-[24px] shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-black">
              <tr><th className="p-4">Name</th><th className="p-4">Brand</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th></tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id} className="border-t hover:bg-orange-50/30 cursor-pointer" onClick={() => { setSelectedAsset(a); setViewState('detail'); }}>
                  <td className="p-4 font-bold text-sm">{a.name} <span className="text-[10px] block text-gray-400">{a.tag_id}</span></td>
                  <td className="p-4 text-sm font-medium">{a.brand}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${a.status === 'Assigned' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{a.status}</span></td>
                  <td className="p-4 text-right font-black text-teal-600 text-sm">Manage</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FORM VIEW */}
      {viewState === 'form' && (
        <form onSubmit={handleSave} className="bg-white p-8 rounded-[24px] shadow-sm border space-y-6">
          <button type="button" onClick={() => setViewState('list')} className="text-sm font-bold flex items-center gap-2"><ArrowLeft size={16}/> Back</button>
          <h2 className="text-2xl font-black">{selectedAsset ? 'Edit Asset' : 'Add New Asset'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <select className="w-full p-3 rounded-xl border" onChange={e => handleCategoryChange(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="w-full p-3 rounded-xl border" placeholder="Tag ID" value={formData.tag_id} readOnly />
            <input className="w-full p-3 rounded-xl border" placeholder="Asset Name" onChange={e => setFormData({...formData, name: e.target.value})} />
            <input className="w-full p-3 rounded-xl border" placeholder="Brand" onChange={e => setFormData({...formData, brand: e.target.value})} />
          </div>
          <button type="submit" className="bg-teal-600 text-white px-8 py-3 rounded-xl font-black">Save Asset</button>
        </form>
      )}

      {/* DETAIL VIEW */}
      {viewState === 'detail' && (
        <div className="bg-white p-8 rounded-[24px] shadow-lg border">
          <button onClick={() => setViewState('list')} className="mb-6 flex items-center gap-2 font-bold text-gray-500"><ArrowLeft size={16}/> Back</button>
          <div className="flex justify-between">
            <div>
              <h2 className="text-3xl font-black">{selectedAsset.name}</h2>
              <p className="text-orange-600 font-bold">{selectedAsset.tag_id}</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => setViewState('form')} className="px-4 py-2 border rounded-lg font-bold">Edit</button>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold">Start Inspection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}