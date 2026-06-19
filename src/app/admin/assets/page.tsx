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
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  
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
      const staffMap = Object.fromEntries(s.map((st: any) => [st.emp_code, st.name]));
      setAssets(a.map((at: any) => ({ ...at, staff_name: staffMap[at.emp_code] || 'Unassigned' })));
    }
    setIsLoading(false);
  };

  const handleCategoryChange = (cat: string) => {
    const prefixes: Record<string, string> = { 'Laptop': 'LAP', 'Mouse': 'MOU', 'Keyboards': 'KEY', 'Headphone': 'HDP', 'Mobile Phone': 'MOB' };
    const prefix = prefixes[cat] || 'AST';
    setFormData({ ...formData, category: cat, tag_id: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}` });
  };

  const handleAction = async (newStatus: string, empCode: string | null = null) => {
    await supabase.from('assets').update({ status: newStatus, emp_code: empCode }).eq('id', selectedAsset.id);
    setIsAssigning(false);
    fetchData();
    setSelectedAsset((prev: any) => ({ ...prev, status: newStatus, emp_code: empCode }));
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {viewState === 'list' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
            <h1 className="text-2xl font-black">Asset Inventory</h1>
            <button onClick={() => { setViewState('form'); setFormData({ tag_id: '', name: '', brand: '', category: 'Laptop', serial_number: '', status: 'Available', emp_code: '', price: '', purchase_date: '', warranty_expiry: '', asset_condition: 'Brand New', condition_notes: '' }); }} className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold">+ Add Asset</button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-black">
                <tr><th className="p-4">Name</th><th className="p-4">Category</th><th className="p-4">Status</th><th className="p-4">Action</th></tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedAsset(a); setViewState('detail'); }}>
                    <td className="p-4 font-bold">{a.name} <span className="text-[10px] block text-gray-400">{a.tag_id}</span></td>
                    <td className="p-4 text-sm">{a.category}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${a.status === 'Assigned' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{a.status}</span></td>
                    <td className="p-4"><button className="text-orange-600 font-bold text-sm">View Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewState === 'detail' && (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <button onClick={() => setViewState('list')} className="mb-6 flex items-center gap-2 font-bold text-gray-500"><ArrowLeft size={16}/> Back</button>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-3xl font-black">{selectedAsset.name}</h2>
              <p className="text-orange-600 font-bold mb-4">{selectedAsset.tag_id}</p>
              <div className="flex items-center gap-2 mb-6">
                {selectedAsset.status === 'Assigned' && <Shield className="text-blue-500" />}
                <p className="font-bold text-lg">{selectedAsset.status} {selectedAsset.staff_name !== 'Unassigned' && `• Assigned to ${selectedAsset.staff_name}`}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-gray-900">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                {selectedAsset.status === 'Available' && <button onClick={() => setIsAssigning(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Assign Asset</button>}
                {selectedAsset.status === 'Assigned' && <button onClick={() => handleAction('Available', null)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold">Unassign</button>}
                {selectedAsset.status !== 'Maintenance' && <button onClick={() => handleAction('Maintenance')} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold">Send to Repair</button>}
                <button onClick={() => handleAction('Retired')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Discard Asset</button>
              </div>

              {isAssigning && (
                <div className="bg-gray-50 p-4 rounded-xl border">
                  <input placeholder="Search Staff..." className="w-full p-2 mb-2 rounded border" onChange={(e) => setAssignSearch(e.target.value)} />
                  {staffList.filter(s => s.name.toLowerCase().includes(assignSearch.toLowerCase())).map(s => (
                    <div key={s.emp_code} className="p-2 border-b cursor-pointer hover:bg-white" onClick={() => handleAction('Assigned', s.emp_code)}>{s.name}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* (View for 'form' omitted for brevity, ensure you use the previous working form code here) */}
    </div>
  );
}