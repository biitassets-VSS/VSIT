'use client';

import React, { useState, useMemo } from 'react';
import { 
  Laptop, Monitor, Search, Plus, UserCheck, 
  Settings2, Wrench, Package, Box, CheckCircle2, X, AlertCircle, Trash2
} from 'lucide-react';

// --- TYPES ---
type UsageStatus = 'Assigned' | 'Unassigned' | 'Demo Use' | 'Under Repair' | 'Discarded';

interface Asset {
  id: string;
  tagId: string;
  serialNumber: string;
  name: string;
  category: string;
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

const initialAssets: Asset[] = [
  { id: '1', tagId: 'TAG-1045', serialNumber: 'SN-MAC-001', name: 'MacBook Pro 14"', category: 'Laptops', status: 'Assigned', assignedToName: 'Lakhwinder Singh', assignedToEmpId: 'EMP-001', lastInspection: '2023-10-01' },
  { id: '2', tagId: 'TAG-2099', serialNumber: 'SN-DEL-442', name: 'Dell UltraSharp 27"', category: 'Monitors', status: 'Unassigned', lastInspection: '2023-09-15' },
  { id: '3', tagId: 'TAG-3011', serialNumber: 'SN-LOG-991', name: 'Logitech MX Master 3', category: 'Mouse', status: 'Demo Use', lastInspection: '2023-10-10' },
  { id: '4', tagId: 'TAG-1088', serialNumber: 'SN-MAC-002', name: 'MacBook Air M1', category: 'Laptops', status: 'Under Repair', lastInspection: '2023-08-20' },
];

const CATEGORIES = ['Laptops', 'Monitors', 'Keyboards', 'Mouse', 'Headphones', 'Stands', 'Cleaning Kits', 'Others'];

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [searchAssetQuery, setSearchAssetQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Asset Form State
  const [formData, setFormData] = useState({
    tagId: '',
    serialNumber: '',
    name: '',
    category: 'Laptops',
    status: 'Unassigned' as UsageStatus,
    assignedToEmpId: '',
    assignedToName: '',
  });

  // Staff Combobox Search State
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);

  // --- DASHBOARD CALCULATIONS ---
  const stats = useMemo(() => {
    return {
      total: assets.length,
      assigned: assets.filter(a => a.status === 'Assigned').length,
      inStock: assets.filter(a => a.status === 'Unassigned' || a.status === 'Demo Use').length,
      repair: assets.filter(a => a.status === 'Under Repair').length,
      discarded: assets.filter(a => a.status === 'Discarded').length,
    };
  }, [assets]);

  const categoryStats = useMemo(() => {
    return CATEGORIES.map(cat => ({
      name: cat,
      total: assets.filter(a => a.category === cat).length,
      assigned: assets.filter(a => a.category === cat && a.status === 'Assigned').length,
      inStock: assets.filter(a => a.category === cat && (a.status === 'Unassigned' || a.status === 'Demo Use')).length,
    }));
  }, [assets]);

  // --- AUTO STATUS LOGIC (THE MAGIC) ---
  const handleStatusChange = (newStatus: UsageStatus) => {
    setFormData(prev => {
      const updated = { ...prev, status: newStatus };
      // If it's not assigned, clear the staff data automatically
      if (newStatus !== 'Assigned') {
        updated.assignedToEmpId = '';
        updated.assignedToName = '';
      }
      return updated;
    });
  };

  const handleStaffSelect = (staff: Staff) => {
    setFormData(prev => ({
      ...prev,
      assignedToEmpId: staff.empId,
      assignedToName: staff.name,
      status: 'Assigned' // Auto-update status to Assigned!
    }));
    setIsStaffDropdownOpen(false);
    setStaffSearchQuery('');
  };

  // --- HANDLERS ---
  const handleOpenModal = () => {
    const randomTag = `TAG-${Math.floor(Math.random() * 9000) + 1000}`;
    setFormData({ tagId: randomTag, serialNumber: '', name: '', category: 'Laptops', status: 'Unassigned', assignedToEmpId: '', assignedToName: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAsset: Asset = {
      id: `AST-${Date.now()}`,
      ...formData,
      lastInspection: 'Pending'
    };
    setAssets([newAsset, ...assets]);
    setIsModalOpen(false);
    alert("Asset successfully added to inventory!");
  };

  // Filter staff for Combobox
  const filteredStaff = mockStaff.filter(s => 
    s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || 
    s.empId.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  // Filter Assets for Table
  const filteredAssets = assets.filter(a => 
    a.tagId.toLowerCase().includes(searchAssetQuery.toLowerCase()) || 
    a.serialNumber.toLowerCase().includes(searchAssetQuery.toLowerCase()) ||
    a.name.toLowerCase().includes(searchAssetQuery.toLowerCase())
  );

  const getStatusColor = (status: UsageStatus) => {
    switch(status) {
      case 'Assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Unassigned': return 'bg-green-100 text-green-700 border-green-200';
      case 'Demo Use': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Under Repair': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Discarded': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* TOP HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Package className="text-blue-600" /> Asset Inventory
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage stock, track assignments, and view office usage.</p>
        </div>
        <button onClick={handleOpenModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-md transition-all font-bold text-sm">
          <Plus size={18} /> Add New Asset
        </button>
      </div>

      {/* 📊 KPI DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Total Assets</span>
          <span className="text-3xl font-black text-gray-900">{stats.total}</span>
        </div>
        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex flex-col justify-center">
          <span className="text-blue-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><UserCheck size={14}/> Assigned</span>
          <span className="text-3xl font-black text-blue-900">{stats.assigned}</span>
        </div>
        <div className="bg-green-50 p-5 rounded-2xl border border-green-100 flex flex-col justify-center">
          <span className="text-green-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Box size={14}/> In Stock / Demo</span>
          <span className="text-3xl font-black text-green-900">{stats.inStock}</span>
        </div>
        <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex flex-col justify-center">
          <span className="text-orange-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Wrench size={14}/> Repair</span>
          <span className="text-3xl font-black text-orange-900">{stats.repair}</span>
        </div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex flex-col justify-center">
          <span className="text-red-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Trash2 size={14}/> Discarded</span>
          <span className="text-3xl font-black text-red-900">{stats.discarded}</span>
        </div>
      </div>

      {/* 📂 CATEGORY BREAKDOWN */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Category Breakdown</h3>
        <div className="flex flex-wrap gap-3">
          {categoryStats.filter(c => c.total > 0).map(cat => (
            <div key={cat.name} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex flex-col min-w-[120px]">
              <span className="text-xs font-bold text-gray-500">{cat.name}</span>
              <div className="flex items-end justify-between mt-1">
                <span className="text-lg font-black text-gray-900">{cat.total}</span>
                <span className="text-[10px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-100">
                  {cat.assigned} Assg
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🔍 SEARCH & TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Serial Number, Tag ID, or Name..." 
              value={searchAssetQuery} onChange={(e) => setSearchAssetQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-black">
                <th className="p-4 pl-6">Asset Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status & Assignment</th>
                <th className="p-4">Last Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6">
                    <p className="font-bold text-gray-900">{asset.name}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{asset.tagId}</span>
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{asset.serialNumber}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-bold text-gray-600">{asset.category}</td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                      {asset.status === 'Assigned' && (
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                          <UserCheck size={12} className="text-blue-500"/> {asset.assignedToName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-500">{asset.lastInspection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚀 THE "ADD NEW ASSET" MODAL WITH COMBOBOX */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Plus className="text-blue-600"/> Add New Asset
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Asset Identifiers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Asset Tag ID</label>
                  <input required type="text" value={formData.tagId} onChange={(e) => setFormData({...formData, tagId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-mono uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Serial Number (S/N)</label>
                  <input required type="text" value={formData.serialNumber} onChange={(e) => setFormData({...formData, serialNumber: e.target.value})} placeholder="e.g. C02XG1..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-mono uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              {/* Hardware Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Hardware Name/Model</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. MacBook Pro 16 M2" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold cursor-pointer">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* USAGE TYPE & AUTO ASSIGNMENT LOGIC */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Settings2 size={16} className="text-blue-500"/> Usage & Assignment Status
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Current Status</label>
                    <select 
                      value={formData.status} 
                      onChange={(e) => handleStatusChange(e.target.value as UsageStatus)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold cursor-pointer"
                    >
                      <option value="Unassigned">Unassigned (In Stock)</option>
                      <option value="Demo Use">Demo Use (Office Only)</option>
                      <option value="Assigned">Assigned (To Staff)</option>
                      <option value="Under Repair">Under Repair</option>
                      <option value="Discarded">Discarded</option>
                    </select>
                    {formData.status === 'Demo Use' && (
                      <p className="text-[10px] text-purple-600 font-bold mt-2 bg-purple-50 p-2 rounded-lg">* Demo items are kept in office and NOT assigned to a specific employee ID.</p>
                    )}
                  </div>

                  {/* SEARCHABLE STAFF COMBOBOX */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 mb-2">Assign To Employee</label>
                    
                    {/* The Visual Input/Button */}
                    <div 
                      onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold cursor-pointer flex justify-between items-center transition-all ${
                        formData.assignedToEmpId 
                          ? 'border-blue-300 bg-blue-50 text-blue-900' 
                          : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {formData.assignedToEmpId 
                        ? `${formData.assignedToName} (${formData.assignedToEmpId})` 
                        : 'Select Staff Member...'}
                      <Search size={16} className="text-gray-400"/>
                    </div>

                    {/* The Dropdown List */}
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
                                <Plus size={14} className="text-blue-400 opacity-0 group-hover:opacity-100"/>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {formData.assignedToEmpId && (
                      <button 
                        type="button"
                        onClick={() => handleStatusChange('Unassigned')}
                        className="text-[10px] font-bold text-red-500 mt-2 hover:underline flex items-center gap-1"
                      >
                        <X size={10}/> Clear Assignment
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 border-t border-gray-100 flex gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors w-1/3">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2">
                  <CheckCircle2 size={18}/> Save to Inventory
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
