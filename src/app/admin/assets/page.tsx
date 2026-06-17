'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Save, Settings2, UserCheck, Search, X, 
  Package, Trash2, CheckCircle2 
} from 'lucide-react';

// --- TYPES ---
type UsageStatus = 'Assigned' | 'Unassigned' | 'Demo Use' | 'Under Repair' | 'Discarded';

interface Asset {
  id: string;
  tagId: string;
  serialNumber: string;
  name: string;
  category: string;
  brand?: string;
  vendor?: string;
  status: UsageStatus;
  assignedToName?: string;
  assignedToEmpId?: string;
  lastInspection?: string;
}

interface Staff {
  empId: string;
  name: string;
  department: string;
}

// --- MOCK DATABASE ---
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

  // Staff Search States
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);

  // 1. Load Asset from LocalStorage
  useEffect(() => {
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) {
      const parsed = JSON.parse(savedAssets) as Asset[];
      setAllAssets(parsed);
      const foundAsset = parsed.find(a => a.id === assetId);
      if (foundAsset) {
        setAsset(foundAsset);
      }
    }
    setIsLoading(false);
  }, [assetId]);

  // 2. Handle Inputs
  const handleChange = (field: keyof Asset, value: string) => {
    if (asset) setAsset({ ...asset, [field]: value });
  };

  const handleStatusChange = (newStatus: UsageStatus) => {
    if (asset) {
      const updated = { ...asset, status: newStatus };
      if (newStatus !== 'Assigned') {
        updated.assignedToEmpId = '';
        updated.assignedToName = '';
      }
      setAsset(updated);
    }
  };

  const handleStaffSelect = (staff: Staff) => {
    if (asset) {
      setAsset({
        ...asset,
        assignedToEmpId: staff.empId,
        assignedToName: staff.name,
        status: 'Assigned'
      });
    }
    setIsStaffDropdownOpen(false);
    setStaffSearchQuery('');
  };

  // 3. Save Changes back to LocalStorage
  const handleSaveChanges = () => {
    if (asset) {
      const updatedAssets = allAssets.map(a => a.id === asset.id ? asset : a);
      localStorage.setItem('vsit_assets_inventory', JSON.stringify(updatedAssets));
      alert("Asset details updated successfully!");
      router.push('/admin/assets'); // Go back to inventory list
    }
  };

  // 4. Delete Asset
  const handleDelete = () => {
    if (confirm("Are you sure you want to permanently delete this asset?")) {
      const updatedAssets = allAssets.filter(a => a.id !== assetId);
      localStorage.setItem('vsit_assets_inventory', JSON.stringify(updatedAssets));
      router.push('/admin/assets');
    }
  };

  const filteredStaff = mockStaff.filter(s => 
    s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || 
    s.empId.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  if (isLoading) return <div className="p-10 flex justify-center text-gray-400 animate-pulse">Loading Asset Details...</div>;
  if (!asset) return <div className="p-10 text-center text-red-500 font-bold">Asset not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/assets" className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              Edit Asset
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1">ID: {asset.id}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleDelete} className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl shadow-sm transition-all font-bold text-sm">
            <Trash2 size={16} /> Delete
          </button>
          <button onClick={handleSaveChanges} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl shadow-md transition-all font-bold text-sm">
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-8">
        <div className="space-y-8">
          
          {/* IDENTIFIERS */}
          <div>
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Package size={16} className="text-blue-500"/> Core Identifiers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Asset Tag ID</label>
                <input type="text" value={asset.tagId} onChange={(e) => handleChange('tagId', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-mono uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Serial Number (S/N)</label>
                <input type="text" value={asset.serialNumber} onChange={(e) => handleChange('serialNumber', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-mono uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          {/* HARDWARE DETAILS */}
          <div>
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Settings2 size={16} className="text-blue-500"/> Hardware Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Hardware Name/Model</label>
                <input type="text" value={asset.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category</label>
                <select value={asset.category} onChange={(e) => handleChange('category', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold cursor-pointer">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Brand</label>
                <input type="text" value={asset.brand || ''} onChange={(e) => handleChange('brand', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Vendor/Supplier</label>
                <input type="text" value={asset.vendor || ''} onChange={(e) => handleChange('vendor', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold" />
              </div>
            </div>
          </div>

          {/* STATUS & ASSIGNMENT */}
          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserCheck size={16} className="text-blue-500"/> Assignment & Status
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">Current Status</label>
                <select 
                  value={asset.status} 
                  onChange={(e) => handleStatusChange(e.target.value as UsageStatus)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold cursor-pointer shadow-sm"
                >
                  <option value="Unassigned">Unassigned (In Stock)</option>
                  <option value="Demo Use">Demo Use (Office Only)</option>
                  <option value="Assigned">Assigned (To Staff)</option>
                  <option value="Under Repair">Under Repair</option>
                  <option value="Discarded">Discarded</option>
                </select>
              </div>

              {/* SEARCHABLE STAFF COMBOBOX */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 mb-2">Assigned Employee</label>
                
                <div 
                  onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-bold cursor-pointer flex justify-between items-center transition-all shadow-sm ${
                    asset.assignedToEmpId 
                      ? 'border-blue-300 bg-blue-100 text-blue-900' 
                      : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {asset.assignedToEmpId 
                    ? `${asset.assignedToName} (${asset.assignedToEmpId})` 
                    : 'Click to assign staff...'}
                  <Search size={16} className={asset.assignedToEmpId ? "text-blue-600" : "text-gray-400"}/>
                </div>

                {isStaffDropdownOpen && (
                  <div className="absolute z-20 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-60 flex flex-col">
                    <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0">
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Search Name or EMP ID..." 
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden">
                      {filteredStaff.length === 0 ? (
                        <p className="p-4 text-center text-xs text-gray-500 font-bold">No staff found.</p>
                      ) : (
                        filteredStaff.map(staff => (
                          <div 
                            key={staff.empId} 
                            onClick={() => handleStaffSelect(staff)}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center group"
                          >
                            <div>
                              <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700">{staff.name}</p>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">{staff.empId} • {staff.department}</p>
                            </div>
                            <CheckCircle2 size={14} className="text-blue-500 opacity-0 group-hover:opacity-100"/>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* UNASSIGN BUTTON */}
                {asset.assignedToEmpId && (
                  <button 
                    type="button"
                    onClick={() => handleStatusChange('Unassigned')}
                    className="text-xs font-bold text-red-500 mt-3 hover:underline flex items-center gap-1"
                  >
                    <X size={14}/> Remove Assignment (Unassign)
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
