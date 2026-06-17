'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Settings2, UserCheck, Search, X, Package, Trash2, CheckCircle2 } from 'lucide-react';

type UsageStatus = 'Assigned' | 'Unassigned' | 'Demo Use' | 'Under Repair' | 'Discarded';

interface Asset {
  id: string; tagId: string; serialNumber: string; name: string; category: string; brand?: string; vendor?: string; status: UsageStatus; assignedToName?: string; assignedToEmpId?: string; lastInspection?: string;
}
interface Staff { empId: string; name: string; department: string; }

const mockStaff: Staff[] = [
  { empId: 'EMP-001', name: 'Lakhwinder Singh', department: 'IT Department' },
  { empId: 'EMP-002', name: 'Sarah Connor', department: 'Migrations' },
];
const CATEGORIES = ['Laptops', 'Monitors', 'Keyboards', 'Mouse', 'Headphones', 'Stands', 'Cleaning Kits', 'Others'];

export default function EditAssetPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;

  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);

  useEffect(() => {
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) {
      const parsed = JSON.parse(savedAssets) as Asset[];
      setAllAssets(parsed);
      const foundAsset = parsed.find(a => a.id === assetId);
      if (foundAsset) setAsset(foundAsset);
    }
    setIsLoading(false);
  }, [assetId]);

  const handleChange = (field: keyof Asset, value: string) => {
    if (asset) setAsset({ ...asset, [field]: value });
  };

  const handleStatusChange = (newStatus: UsageStatus) => {
    if (asset) {
      const updated = { ...asset, status: newStatus };
      if (newStatus !== 'Assigned') { updated.assignedToEmpId = ''; updated.assignedToName = ''; }
      setAsset(updated);
    }
  };

  const handleStaffSelect = (staff: Staff) => {
    if (asset) setAsset({ ...asset, assignedToEmpId: staff.empId, assignedToName: staff.name, status: 'Assigned' });
    setIsStaffDropdownOpen(false); setStaffSearchQuery('');
  };

  const handleSaveChanges = () => {
    if (asset) {
      const updatedAssets = allAssets.map(a => a.id === asset.id ? asset : a);
      localStorage.setItem('vsit_assets_inventory', JSON.stringify(updatedAssets));
      alert("Asset details updated!");
      router.push('/admin/assets');
    }
  };

  const handleDelete = () => {
    if (confirm("Permanently delete this asset?")) {
      const updatedAssets = allAssets.filter(a => a.id !== assetId);
      localStorage.setItem('vsit_assets_inventory', JSON.stringify(updatedAssets));
      router.push('/admin/assets');
    }
  };

  const filteredStaff = mockStaff.filter(s => s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || s.empId.toLowerCase().includes(staffSearchQuery.toLowerCase()));

  if (isLoading) return <div className="p-10 flex justify-center text-gray-400 animate-pulse">Loading...</div>;
  if (!asset) return <div className="p-10 text-center text-red-500 font-bold">Asset not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/assets" className="p-2 bg-white rounded-full border border-gray-200 shadow-sm"><ArrowLeft size={20} className="text-gray-600" /></Link>
          <div><h1 className="text-2xl font-black text-gray-900">Edit Asset</h1><p className="text-sm text-gray-500 mt-1">ID: {asset.id}</p></div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleDelete} className="flex gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-bold"><Trash2 size={16} /> Delete</button>
          <button onClick={handleSaveChanges} className="flex gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold"><Save size={16} /> Save</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div>
          <h3 className="text-sm font-black uppercase mb-4 flex items-center gap-2 border-b pb-2"><Package size={16} className="text-blue-500"/> Core Identifiers</h3>
          <div className="grid grid-cols-2 gap-5">
            <div><label className="block text-xs font-bold mb-2">Tag ID</label><input type="text" value={asset.tagId} onChange={(e) => handleChange('tagId', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border font-mono font-bold" /></div>
            <div><label className="block text-xs font-bold mb-2">Serial Number</label><input type="text" value={asset.serialNumber} onChange={(e) => handleChange('serialNumber', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border font-mono font-bold" /></div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase mb-4 flex items-center gap-2 border-b pb-2"><Settings2 size={16} className="text-blue-500"/> Hardware Specs</h3>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div><label className="block text-xs font-bold mb-2">Name</label><input type="text" value={asset.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border text-sm font-bold" /></div>
            <div><label className="block text-xs font-bold mb-2">Category</label><select value={asset.category} onChange={(e) => handleChange('category', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border text-sm font-bold">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div><label className="block text-xs font-bold mb-2">Brand</label><input type="text" value={asset.brand || ''} onChange={(e) => handleChange('brand', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border text-sm font-bold" /></div>
            <div><label className="block text-xs font-bold mb-2">Vendor</label><input type="text" value={asset.vendor || ''} onChange={(e) => handleChange('vendor', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border text-sm font-bold" /></div>
          </div>
        </div>

        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
          <h3 className="text-sm font-black uppercase mb-4 flex items-center gap-2"><UserCheck size={16} className="text-blue-500"/> Assignment</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold mb-2">Status</label>
              <select value={asset.status} onChange={(e) => handleStatusChange(e.target.value as UsageStatus)} className="w-full px-4 py-3 rounded-xl border text-sm font-bold bg-white">
                <option value="Unassigned">Unassigned</option><option value="Demo Use">Demo Use</option><option value="Assigned">Assigned</option><option value="Under Repair">Under Repair</option><option value="Discarded">Discarded</option>
              </select>
            </div>
            <div className="relative">
              <label className="block text-xs font-bold mb-2">Assigned Employee</label>
              <div onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)} className={`w-full px-4 py-3 rounded-xl border text-sm font-bold cursor-pointer flex justify-between bg-white ${asset.assignedToEmpId ? 'border-blue-300 bg-blue-100 text-blue-900' : 'border-gray-200 text-gray-400'}`}>
                {asset.assignedToEmpId ? `${asset.assignedToName} (${asset.assignedToEmpId})` : 'Click to assign staff...'}<Search size={16}/>
              </div>
              {isStaffDropdownOpen && (
                <div className="absolute z-20 w-full mt-2 bg-white rounded-2xl shadow-xl border overflow-hidden max-h-60 flex flex-col">
                  <div className="p-2 border-b bg-gray-50"><input autoFocus type="text" placeholder="Search..." value={staffSearchQuery} onChange={(e) => setStaffSearchQuery(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                  <div className="overflow-y-auto">{filteredStaff.map(staff => (
                    <div key={staff.empId} onClick={() => handleStaffSelect(staff)} className="p-3 hover:bg-blue-50 cursor-pointer border-b"><p className="text-sm font-bold">{staff.name}</p></div>
                  ))}</div>
                </div>
              )}
              {asset.assignedToEmpId && <button type="button" onClick={() => handleStatusChange('Unassigned')} className="text-xs font-bold text-red-500 mt-3 hover:underline flex items-center gap-1"><X size={14}/> Remove Assignment</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
