'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Search, X, Trash2, 
  Hash, Barcode, Monitor, LayoutGrid, Tag, Store, UserCheck
} from 'lucide-react';

type UsageStatus = 'Assigned' | 'Unassigned' | 'Demo Use' | 'Under Repair' | 'Discarded';

interface Asset {
  id: string; tagId: string; serialNumber: string; name: string; category: string; brand?: string; vendor?: string; status: UsageStatus; assignedToName?: string; assignedToEmpId?: string; lastInspection?: string;
}
interface Staff { empId: string; name: string; department: string; }

const mockStaff: Staff[] = [
  { empId: 'EMP-001', name: 'Lakhwinder Singh', department: 'IT Department' },
  { empId: 'EMP-002', name: 'Sarah Connor', department: 'Migrations' },
  { empId: 'EMP-003', name: 'John Doe', department: 'Accounts' },
  { empId: 'EMP-004', name: 'Jane Smith', department: 'Edu Calling' },
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
      
      // 🚀 REAL-TIME UPDATE TRIGGER FOR SIDEBAR
      window.dispatchEvent(new Event('inventoryUpdated')); 
      
      alert("Asset details updated!");
      router.push('/admin/assets');
    }
  };

  const handleDelete = () => {
    if (confirm("Permanently delete this asset?")) {
      const updatedAssets = allAssets.filter(a => a.id !== assetId);
      localStorage.setItem('vsit_assets_inventory', JSON.stringify(updatedAssets));
      
      // 🚀 REAL-TIME UPDATE TRIGGER FOR SIDEBAR
      window.dispatchEvent(new Event('inventoryUpdated')); 
      
      router.push('/admin/assets');
    }
  };

  const filteredStaff = mockStaff.filter(s => s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || s.empId.toLowerCase().includes(staffSearchQuery.toLowerCase()));

  if (isLoading) return <div className="p-10 flex justify-center text-gray-400 animate-pulse">Loading...</div>;
  if (!asset) return <div className="p-10 text-center text-red-500 font-bold">Asset not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-3xl mx-auto">
      
      <div className="flex items-center justify-between">
        <Link href="/admin/assets" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} /> Back to Inventory
        </Link>
        <button onClick={handleDelete} className="flex gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all">
          <Trash2 size={16} /> Delete Asset
        </button>
      </div>

      <div className="bg-white rounded-[24px] w-full shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-black text-gray-900">Edit Asset Details</h2>
            <p className="text-xs font-bold text-gray-400 mt-1">ID: {asset.id}</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2"><Hash size={14} className="text-gray-400"/> Asset Tag ID</label><input type="text" value={asset.tagId} onChange={(e) => handleChange('tagId', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-mono uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" /></div>
            <div><label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2"><Barcode size={14} className="text-gray-400"/> Serial Number</label><input type="text" value={asset.serialNumber} onChange={(e) => handleChange('serialNumber', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-mono uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2"><Monitor size={14} className="text-gray-400"/> Hardware Name</label><input type="text" value={asset.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
            <div><label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2"><LayoutGrid size={14} className="text-gray-400"/> Category</label><select value={asset.category} onChange={(e) => handleChange('category', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium cursor-pointer transition-all">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border border-gray-100">
            <div><label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2"><Tag size={14} className="text-gray-400"/> Brand</label><input type="text" value={asset.brand || ''} onChange={(e) => handleChange('brand', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
            <div><label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2"><Store size={14} className="text-gray-400"/> Vendor</label><input type="text" value={asset.vendor || ''} onChange={(e) => handleChange('vendor', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all" /></div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-4"><UserCheck size={14} /> Usage & Assignment Status</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Current Status</label><select value={asset.status} onChange={(e) => handleStatusChange(e.target.value as UsageStatus)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium cursor-pointer transition-all shadow-sm"><option value="Unassigned">Unassigned</option><option value="Demo Use">Demo Use</option><option value="Assigned">Assigned (To Staff)</option><option value="Under Repair">Under Repair</option><option value="Discarded">Discarded</option></select></div>
              <div className="relative"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Assigned Employee</label><div onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)} className={`w-full px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer flex justify-between items-center transition-all shadow-sm bg-white ${asset.assignedToEmpId ? 'border-blue-300 text-blue-900' : 'border-gray-200 text-gray-400'}`}>{asset.assignedToEmpId ? `${asset.assignedToName}` : 'Select Staff...'}<Search size={16} className={asset.assignedToEmpId ? 'text-blue-500' : 'text-gray-400'}/></div>
                {isStaffDropdownOpen && (<div className="absolute z-20 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-60 flex flex-col"><div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0"><input autoFocus type="text" placeholder="Search Name..." value={staffSearchQuery} onChange={(e) => setStaffSearchQuery(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" /></div><div className="overflow-y-auto">{filteredStaff.map(staff => (<div key={staff.empId} onClick={() => handleStaffSelect(staff)} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50"><p className="text-sm font-bold text-gray-900">{staff.name}</p></div>))}</div></div>)}
                {asset.assignedToEmpId && (<button type="button" onClick={() => handleStatusChange('Unassigned')} className="text-[10px] font-bold text-red-500 mt-2 hover:underline flex items-center gap-1"><X size={12}/> Remove Assignment</button>)}
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-4">
            <Link href="/admin/assets" className="flex items-center justify-center px-6 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors w-1/3">Cancel</Link>
            <button onClick={handleSaveChanges} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-200">Save Changes</button>
          </div>

        </div>
      </div>
    </div>
  );
}
