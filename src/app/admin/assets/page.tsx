'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Laptop, PlusCircle, Search, QrCode, 
  User, Calendar, X, Save, Eye, Hash
} from 'lucide-react';

export default function AssetRegistryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewAssetModal, setViewAssetModal] = useState<any>(null);

  // New Asset Form State
  const [newAssetCategory, setNewAssetCategory] = useState('Laptop');
  const [newAssetId, setNewAssetId] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetSerial, setNewAssetSerial] = useState('');
  const [newAssetAssignee, setNewAssetAssignee] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRegistryData();
  }, []);

  // 🎯 THE AUTO-GENERATOR ENGINE: Watches the Category and generates the ID
  useEffect(() => {
    if (isAddModalOpen) {
      generateAssetId(newAssetCategory);
    }
  }, [newAssetCategory, isAddModalOpen]);

  // Checks if someone scanned a QR code and landed here
  useEffect(() => {
    const scanId = searchParams.get('view');
    if (scanId && assets.length > 0) {
      const foundAsset = assets.find(a => a.id === scanId);
      if (foundAsset) setViewAssetModal(foundAsset);
    }
  }, [searchParams, assets]);

  const generateAssetId = (category: string) => {
    let prefix = 'VS-AST';
    const cat = category.toLowerCase();
    
    if (cat.includes('laptop')) prefix = 'VS-LAP';
    else if (cat.includes('mouse')) prefix = 'VS-MO';
    else if (cat.includes('keyboard')) prefix = 'VS-KB';
    else if (cat.includes('headphone')) prefix = 'VS-HP';
    else if (cat.includes('cleaning')) prefix = 'VS-CLN';
    
    // Generates a 5-digit random number to append to the prefix
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    setNewAssetId(`${prefix}-${randomSuffix}`);
  };

  const fetchRegistryData = async () => {
    setLoading(true);
    try {
      // Fetch Assets
      const { data: assetData } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      
      // Fetch Staff for Assignment Dropdown
      const { data: staffData } = await supabase.from('profiles').select('*');
      
      if (staffData) setStaffList(staffData);
      
      if (assetData) {
        const compiledAssets = assetData.map(asset => {
          const assignee = (staffData || []).find(s => s.id === asset.assigned_to || s.email === asset.assigned_to) || {};
          return {
            ...asset,
            staff_name: assignee.full_name || assignee.name || asset.assigned_to || 'Unassigned',
            emp_code: assignee.emp_code || assignee.emp_id || 'N/A'
          };
        });
        setAssets(compiledAssets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName || !newAssetSerial) return alert("Name and Serial Number required.");
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('assets').insert([{
        id: newAssetId, // Using our custom generated ID!
        asset_name: newAssetName,
        serial_number: newAssetSerial,
        category: newAssetCategory,
        status: newAssetAssignee ? 'Assigned' : 'Available',
        assigned_to: newAssetAssignee || null,
        inspection_status: 'Pending Verification',
        upcoming_inspection_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Next month
      }]);

      if (error) throw error;

      alert(`Asset ${newAssetId} successfully registered!`);
      setIsAddModalOpen(false);
      
      // Reset form
      setNewAssetName('');
      setNewAssetSerial('');
      setNewAssetAssignee('');
      
      fetchRegistryData();
    } catch (err: any) {
      alert(`Error saving asset: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAssets = assets.filter(a => {
    const q = searchQuery.toLowerCase();
    return a.id.toLowerCase().includes(q) || 
           a.asset_name?.toLowerCase().includes(q) || 
           a.serial_number?.toLowerCase().includes(q) ||
           a.staff_name?.toLowerCase().includes(q);
  });

  // Helper to build the Scannable View URL
  const getAssetViewUrl = (id: string) => {
    const baseDomain = typeof window !== 'undefined' ? window.location.origin : 'https://virtual-staffing.vercel.app';
    return `${baseDomain}/admin/assets?view=${id}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans">
      
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">Hardware Registry</h1>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Manage full hardware lifecycle, assignments, and serial tags</p>
          </div>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#002B49] hover:bg-[#001d33] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#002B49]/20 self-start md:self-auto"
        >
          <PlusCircle size={16} />
          <span>Register New Asset</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs flex items-center">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Asset ID (VS-LAP-12345), Name, Serial, or Staff..." 
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* ASSET LIST GRID */}
      {loading ? (
        <div className="w-full py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002B49]"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAssets.map(asset => (
            <div key={asset.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-colors">
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Laptop size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 leading-tight truncate max-w-[160px]">{asset.asset_name}</h3>
                    <div className="flex items-center gap-1 mt-0.5 text-gray-400">
                      <Hash size={10} />
                      <span className="text-[10px] font-mono font-bold tracking-wider">{asset.id}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setViewAssetModal(asset)} className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                  <QrCode size={16} />
                </button>
              </div>

              <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Serial No:</span>
                  <span className="font-mono font-black text-gray-700">{asset.serial_number || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Assigned To:</span>
                  <span className="font-black text-gray-900">{asset.staff_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                    asset.status === 'Assigned' ? 'bg-green-100 text-green-700' : 
                    asset.status === 'Available' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {asset.status || 'Available'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🟢 NEW ASSET REGISTRATION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black uppercase text-[#002B49] tracking-wider">Register Hardware</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={18}/></button>
            </div>

            <form onSubmit={handleSaveNewAsset} className="p-6 space-y-5">
              
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">1. Category</label>
                  <select value={newAssetCategory} onChange={e => setNewAssetCategory(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#002B49]">
                    <option value="Laptop">Laptop</option>
                    <option value="Mouse">Mouse</option>
                    <option value="Keyboard">Keyboard</option>
                    <option value="Headphone">Headphone</option>
                    <option value="Other">Other Asset</option>
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-blue-600">Auto-Generated ID</label>
                  <input type="text" readOnly value={newAssetId} className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs font-mono font-black text-blue-700 outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">2. Asset Model Name</label>
                <input type="text" required value={newAssetName} onChange={e => setNewAssetName(e.target.value)} placeholder="e.g. HP EliteBook 840 G8" className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#002B49]" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">3. Factory Serial Number</label>
                <input type="text" required value={newAssetSerial} onChange={e => setNewAssetSerial(e.target.value)} placeholder="Enter S/N from sticker..." className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-[#002B49]" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">4. Assign To Staff (Optional)</label>
                <select value={newAssetAssignee} onChange={e => setNewAssetAssignee(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#002B49]">
                  <option value="">-- Keep in Inventory / Unassigned --</option>
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.full_name || staff.name} ({staff.emp_code || staff.email})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isSaving} className="w-full py-3.5 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-xs font-black uppercase tracking-wider flex justify-center items-center gap-2 shadow-md">
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{isSaving ? 'Registering...' : 'Save & Generate Label'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔍 ASSET VIEW & QR CODE MODAL */}
      {viewAssetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-gray-100 text-center">
            
            <div className="bg-blue-50 p-8 flex flex-col items-center justify-center border-b border-blue-100 relative">
              <button onClick={() => setViewAssetModal(null)} className="absolute top-4 right-4 text-blue-400 hover:text-blue-800 bg-white p-1 rounded-full shadow-sm"><X size={16}/></button>
              
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-100 mb-4">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getAssetViewUrl(viewAssetModal.id))}`} 
                  alt="Asset QR Code" 
                  className="w-32 h-32 object-contain"
                />
              </div>
              <h2 className="text-xl font-mono font-black text-[#002B49] tracking-widest">{viewAssetModal.id}</h2>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Official Asset Label</p>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hardware Model</p>
                <p className="text-sm font-bold text-gray-900">{viewAssetModal.asset_name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Serial Number</p>
                  <p className="text-xs font-mono font-bold text-gray-900 truncate">{viewAssetModal.serial_number}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assignment</p>
                  <p className="text-xs font-bold text-gray-900 truncate">{viewAssetModal.staff_name}</p>
                </div>
              </div>

              <div className="pt-2">
                <button onClick={() => window.print()} className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex justify-center items-center gap-2">
                  <QrCode size={16} />
                  <span>Print Label</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}