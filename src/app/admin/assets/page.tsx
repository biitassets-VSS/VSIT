'use client';

import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, Plus, UploadCloud, Search, 
  Filter, User, ArrowLeft, Download, 
  FileSpreadsheet, CheckCircle2, AlertCircle, Save,
  Printer, QrCode, FileText, Image as ImageIcon,
  Calendar, DollarSign, Wrench, Hash
} from 'lucide-react';

// --- Interfaces ---
interface Asset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: 'In Stock (Available)' | 'Assigned' | 'Maintenance' | 'Retired';
  assignedTo?: string;
  empCode?: string;
  // Extended fields for detail view
  serialNumber?: string;
  price?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  condition?: string;
  notes?: string;
  photos?: string[];
}

// --- Category Prefix Mapping for Auto-Generation ---
const CATEGORY_PREFIX_MAP: Record<string, string> = {
  'Laptop': 'LAP',
  'Headphone': 'HDP',
  'Keyboard': 'KBD',
  'Wired Keyboard Combo': 'WKC',
  'Wireless Keyboard Combo': 'WMC',
  'Stand': 'STN',
  'Cleaning Kit': 'CLN',
  'Mobile Phone': 'MOB',
  'Other': 'OTH'
};

export default function AdminAssetsPage() {
  const [viewState, setViewState] = useState<'list' | 'add_single' | 'bulk_upload' | 'print_tags' | 'view_details'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [printCategoryFilter, setPrintCategoryFilter] = useState('All');
  
  // View Details State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Bulk Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Add Single Asset State
  const [singleAssetForm, setSingleAssetForm] = useState({
    tagId: '',
    serialNumber: '',
    name: '',
    category: '',
    price: '',
    purchaseDate: '',
    warrantyExpiry: '',
    condition: '',
    status: 'In Stock (Available)',
    notes: ''
  });

  // Mock Asset Data (Extended with new fields)
  const [assets, setAssets] = useState<Asset[]>([
    { 
      id: '1', tagId: 'VS-LAP-104291', name: 'Dell XPS 15 Laptop', category: 'Laptop', status: 'Assigned', 
      assignedTo: 'Rahul Sharma', empCode: 'EMP-1042', serialNumber: 'SN-9982348X', price: '125000', 
      purchaseDate: '2023-01-15', warrantyExpiry: '2026-01-15', condition: 'Good', 
      notes: 'Handed over with charger and wireless mouse.', photos: [] 
    },
    { 
      id: '2', tagId: 'VS-WMC-209932', name: 'Logitech Wireless Combo', category: 'Wireless Keyboard Combo', 
      status: 'Assigned', assignedTo: 'Rahul Sharma', empCode: 'EMP-1042', serialNumber: 'SN-112233', 
      price: '3500', purchaseDate: '2023-02-10', warrantyExpiry: '2024-02-10', condition: 'Good' 
    },
    { 
      id: '3', tagId: 'VS-LAP-300188', name: 'Apple MacBook Pro M2', category: 'Laptop', status: 'In Stock (Available)',
      serialNumber: 'C02F3983QQQ', price: '185000', purchaseDate: '2023-11-05', warrantyExpiry: '2026-11-05', condition: 'New'
    },
    { 
      id: '4', tagId: 'VS-OTH-300511', name: 'Dell 27" 4K Monitor', category: 'Other', status: 'Maintenance',
      serialNumber: 'DELL-MON-4K-99', price: '32000', purchaseDate: '2022-06-12', warrantyExpiry: '2025-06-12', condition: 'Poor',
      notes: 'Screen flickering issue reported. Sent to service center.'
    },
  ]);

  // --- AUTO GENERATE ASSET TAG ID WHEN CATEGORY CHANGES ---
  useEffect(() => {
    if (singleAssetForm.category && viewState === 'add_single') {
      const prefix = CATEGORY_PREFIX_MAP[singleAssetForm.category] || 'OTH';
      const uniqueNum = Math.floor(100000 + Math.random() * 900000);
      setSingleAssetForm(prev => ({ ...prev, tagId: `VS-${prefix}-${uniqueNum}` }));
    }
  }, [singleAssetForm.category, viewState]);

  // --- Handlers ---
  const handleDownloadSample = () => {
    // UPDATED: Headers perfectly match the Add New Asset form from your screenshot
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Category,Asset Tag,Asset Name,Serial Number,Price / Cost,Purchase Date,Warranty Expiry,Asset Condition,Current Status\n"
      + "Laptop,VS-LAP-123456,Dell XPS 15 Laptop,SN-9982348X,120000,2023-01-15,2026-01-15,New,In Stock (Available)\n"
      + "Keyboard,VS-KBD-654321,Logitech K850,SN-112233,4500,2023-05-20,2024-05-20,Good,Assigned";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Asset_Bulk_Upload_Sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]);
  };

  const handleBulkUploadSubmit = () => {
    if (!selectedFile) return alert("Please select a file first.");
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setSelectedFile(null);
      alert("Assets uploaded successfully!");
      setViewState('list');
    }, 1500);
  };

  const handleAddSingleSubmit = () => {
    if (!singleAssetForm.tagId || !singleAssetForm.name || !singleAssetForm.category) {
      return alert("Please fill in all the required fields (*).");
    }
    
    setIsUploading(true);
    setTimeout(() => {
      setAssets(prev => [{
        id: Date.now().toString(),
        ...singleAssetForm,
        status: singleAssetForm.status as any
      }, ...prev]);
      
      setIsUploading(false);
      setSingleAssetForm({
        tagId: '', serialNumber: '', name: '', category: '', price: '',
        purchaseDate: '', warrantyExpiry: '', condition: '', status: 'In Stock (Available)', notes: ''
      });
      alert('Asset successfully added to inventory!');
      setViewState('list');
    }, 800);
  };

  const handlePrint = () => {
    window.print();
  };

  const openAssetDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setViewState('view_details');
  };

  // Stats & Filters
  const totalAssets = assets.length;
  const availableAssets = assets.filter(a => a.status === 'In Stock (Available)').length;
  const assignedAssets = assets.filter(a => a.status === 'Assigned').length;

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.tagId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const printFilteredAssets = printCategoryFilter === 'All' 
    ? assets 
    : assets.filter(a => a.category === printCategoryFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* ========================================== */}
      {/* 1. ASSET LIST VIEW                         */}
      {/* ========================================== */}
      {viewState === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <PackageSearch size={28} className="text-[#008b74]" /> Asset Inventory
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1">Manage, track, and upload company hardware.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button 
                type="button"
                onClick={() => setViewState('print_tags')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                <Printer size={18} /> Print Tags
              </button>
              <button 
                type="button"
                onClick={() => setViewState('bulk_upload')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-[#008b74] hover:bg-[#e6f4f1] text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                <UploadCloud size={18} /> Bulk Upload
              </button>
              <button 
                type="button"
                onClick={() => setViewState('add_single')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#008b74] hover:bg-[#00705d] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                <Plus size={18} /> Add Asset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600"><PackageSearch size={24}/></div>
              <div><p className="text-xs font-bold text-gray-500 uppercase">Total Assets</p><p className="text-2xl font-black text-gray-900">{totalAssets}</p></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#e6f4f1] flex items-center justify-center text-[#008b74]"><CheckCircle2 size={24}/></div>
              <div><p className="text-xs font-bold text-gray-500 uppercase">Available</p><p className="text-2xl font-black text-gray-900">{availableAssets}</p></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><User size={24}/></div>
              <div><p className="text-xs font-bold text-gray-500 uppercase">Assigned</p><p className="text-2xl font-black text-gray-900">{assignedAssets}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:w-96">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search assets by name or tag ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#008b74]"
                />
              </div>
              <button type="button" className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
                <Filter size={16} /> Filter
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Asset Details</th>
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Category</th>
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Status</th>
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(asset => (
                    <tr key={asset.id} className="border-b border-gray-50 hover:bg-[#f2faf8] transition-colors">
                      <td className="p-4">
                        {/* Name is now clickable to open details */}
                        <div 
                          className="font-black text-sm text-[#008b74] cursor-pointer hover:underline"
                          onClick={() => openAssetDetails(asset)}
                        >
                          {asset.name}
                        </div>
                        <div className="text-[11px] font-bold text-gray-600 bg-gray-100 inline-flex items-center gap-1 px-2 py-0.5 rounded-md mt-1 border border-gray-200">
                          <QrCode size={10} /> {asset.tagId}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-600">{asset.category}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                          asset.status === 'In Stock (Available)' ? 'bg-[#e6f4f1] text-[#008b74] border-[#008b74]/20' :
                          asset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {asset.assignedTo ? (
                          <div>
                            <div className="text-sm font-bold text-gray-900">{asset.assignedTo}</div>
                            <div className="text-xs font-medium text-gray-500">{asset.empCode}</div>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* 2. VIEW DETAILS PAGE (NEW)                 */}
      {/* ========================================== */}
      {viewState === 'view_details' && selectedAsset && (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-2">
            <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Back to Assets
            </button>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 flex items-center gap-2 transition">
                <Wrench size={16} /> Mark Maintenance
              </button>
              <button className="px-4 py-2 bg-[#008b74] text-white text-sm font-bold rounded-xl hover:bg-[#00705d] flex items-center gap-2 transition shadow-md">
                <User size={16} /> Assign User
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
            {/* Header Area */}
            <div className="bg-gray-50 p-6 sm:p-8 border-b border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                      selectedAsset.status === 'In Stock (Available)' ? 'bg-[#e6f4f1] text-[#008b74] border-[#008b74]/20' :
                      selectedAsset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                    {selectedAsset.status}
                  </span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{selectedAsset.category}</span>
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-1">{selectedAsset.name}</h2>
                <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                  <span className="flex items-center gap-1"><QrCode size={14}/> {selectedAsset.tagId}</span>
                  {selectedAsset.serialNumber && <span className="flex items-center gap-1"><Hash size={14}/> {selectedAsset.serialNumber}</span>}
                </div>
              </div>
              
              <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-center min-w-[150px]">
                <QrCode size={64} className="mx-auto text-gray-900 mb-2" />
                <p className="text-[10px] font-black uppercase text-gray-400">Scan to View</p>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              
              {/* Left Column: Details */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={16}/> Purchase & Warranty</h3>
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500">Purchase Price</span>
                      <span className="text-sm font-black text-gray-900">{selectedAsset.price ? `₹ ${selectedAsset.price}` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500">Purchase Date</span>
                      <span className="text-sm font-black text-gray-900">{selectedAsset.purchaseDate || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500">Warranty Expiry</span>
                      <span className="text-sm font-black text-[#008b74]">{selectedAsset.warrantyExpiry || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={16}/> Asset Notes & Condition</h3>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <div className="mb-4">
                      <span className="text-sm font-bold text-gray-500 block mb-1">Current Condition</span>
                      <span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-700">{selectedAsset.condition || 'Not Specified'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-500 block mb-1">Additional Notes</span>
                      <p className="text-sm font-medium text-gray-800 bg-white p-3 rounded-xl border border-gray-200 min-h-[80px]">
                        {selectedAsset.notes || 'No notes have been added for this asset yet.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Photos & Assignment */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ImageIcon size={16}/> Inspection Photos</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Mock Photo Slots */}
                    <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-[#008b74] hover:text-[#008b74] transition cursor-pointer">
                      <Plus size={24} className="mb-1" />
                      <span className="text-xs font-bold">Add Photo</span>
                    </div>
                    <div className="aspect-square bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 overflow-hidden relative group cursor-pointer">
                      <ImageIcon size={32} className="opacity-50" />
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">View Image</div>
                    </div>
                  </div>
                </div>

                {selectedAsset.status === 'Assigned' && selectedAsset.assignedTo && (
                   <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={16}/> Current Assignment</h3>
                    <div className="bg-white border border-blue-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-lg">
                        {selectedAsset.assignedTo.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-black text-gray-900">{selectedAsset.assignedTo}</div>
                        <div className="text-xs font-bold text-gray-500">{selectedAsset.empCode}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. PRINT LABELS VIEW                       */}
      {/* ========================================== */}
      {viewState === 'print_tags' && (
        <div className="space-y-6">
          <div className="no-print flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Back to Assets
            </button>
            <div className="flex items-center gap-4">
              <select 
                value={printCategoryFilter}
                onChange={(e) => setPrintCategoryFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-[#008b74]"
              >
                <option value="All">All Categories</option>
                {Object.keys(CATEGORY_PREFIX_MAP).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-colors">
                <Printer size={16}/> Print Now
              </button>
            </div>
          </div>

          <div id="printable-area" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {printFilteredAssets.map(asset => (
                <div key={asset.id} className="border-2 border-gray-900 rounded-xl p-4 flex flex-col items-center text-center bg-white">
                  <div className="font-black text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b-2 border-gray-100 w-full pb-1">VS Asset Tag</div>
                  <QrCode size={48} className="text-gray-900 mb-3" />
                  <div className="font-black text-lg text-gray-900 tracking-tight">{asset.tagId}</div>
                  <div className="text-xs font-bold text-gray-600 mt-1 line-clamp-1">{asset.name}</div>
                </div>
              ))}
              {printFilteredAssets.length === 0 && (
                <div className="col-span-full py-10 text-center text-gray-500 font-bold">No assets found for this category.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. ADD NEW ASSET VIEW                      */}
      {/* ========================================== */}
      {viewState === 'add_single' && (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Back to Assets
            </button>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Add New Asset</h2>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleAddSingleSubmit(); }} className="space-y-6">
            
            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-5 pb-4 border-b border-gray-100">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Category <span className="text-red-500">*</span></label>
                  <select 
                    value={singleAssetForm.category}
                    onChange={(e) => setSingleAssetForm({...singleAssetForm, category: e.target.value})}
                    className={`w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium focus:border-[#008b74] focus:ring-1 focus:ring-[#008b74] focus:outline-none ${!singleAssetForm.category ? 'text-gray-400' : 'text-gray-700'}`}
                  >
                    <option value="" disabled>Select Category...</option>
                    {Object.keys(CATEGORY_PREFIX_MAP).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <p className="text-[10px] font-bold text-[#008b74] mt-1 flex items-center gap-1"><AlertCircle size={10}/> Select category first to auto-generate Asset Tag</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Tag <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    readOnly
                    placeholder="Auto-generated (e.g. VS-LAP-123456)" 
                    value={singleAssetForm.tagId}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-bold text-gray-900 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dell XPS 15 Laptop" 
                    value={singleAssetForm.name}
                    onChange={(e) => setSingleAssetForm({...singleAssetForm, name: e.target.value})}
                    className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-[#008b74] focus:outline-none placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Serial Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SN-9982348X" 
                    value={singleAssetForm.serialNumber}
                    onChange={(e) => setSingleAssetForm({...singleAssetForm, serialNumber: e.target.value})}
                    className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-[#008b74] focus:outline-none placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-5 pb-4 border-b border-gray-100">Purchase & Warranty</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Price / Cost</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input type="number" placeholder="0.00" value={singleAssetForm.price} onChange={(e) => setSingleAssetForm({...singleAssetForm, price: e.target.value})} className="w-full bg-white border border-gray-200 pl-8 pr-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-[#008b74] focus:outline-none placeholder-gray-400"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Purchase Date</label>
                  <input type="date" value={singleAssetForm.purchaseDate} onChange={(e) => setSingleAssetForm({...singleAssetForm, purchaseDate: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-[#008b74] focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Warranty Expiry</label>
                  <input type="date" value={singleAssetForm.warrantyExpiry} onChange={(e) => setSingleAssetForm({...singleAssetForm, warrantyExpiry: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-[#008b74] focus:outline-none"/>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-5 pb-4 border-b border-gray-100">Condition & Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Condition</label>
                  <select value={singleAssetForm.condition} onChange={(e) => setSingleAssetForm({...singleAssetForm, condition: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium focus:border-[#008b74] focus:outline-none">
                    <option value="" disabled>Select...</option>
                    <option value="New">New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Current Status <span className="text-red-500">*</span></label>
                  <select value={singleAssetForm.status} onChange={(e) => setSingleAssetForm({...singleAssetForm, status: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-[#008b74] focus:outline-none">
                    <option value="In Stock (Available)">In Stock (Available)</option>
                    <option value="Maintenance">Maintenance / Repair</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
              <button type="button" onClick={() => setViewState('list')} className="px-6 py-3.5 border border-gray-200 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm">Cancel</button>
              <button type="submit" disabled={isUploading} className="px-8 py-3.5 bg-[#008b74] hover:bg-[#00705d] text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 text-sm">
                {isUploading ? 'Saving...' : <><Save size={18} /> Save Asset</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* 5. BULK UPLOAD VIEW                        */}
      {/* ========================================== */}
      {viewState === 'bulk_upload' && (
        <div className="space-y-6">
           <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Assets
          </button>
          <div className="bg-white p-6 sm:p-10 rounded-[24px] shadow-sm border border-gray-100 max-w-3xl mx-auto">
             <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#e6f4f1] text-[#008b74] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#008b74]/20">
                <FileSpreadsheet size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Bulk Upload Assets</h2>
            </div>
            <div className="mb-8">
              <div className={`relative w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${selectedFile ? 'border-[#008b74] bg-[#e6f4f1]' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"/>
                {selectedFile ? (
                  <div className="text-center">
                    <FileSpreadsheet size={36} className="text-[#008b74] mx-auto mb-2" />
                    <p className="text-sm font-black text-[#00705d]">{selectedFile.name}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <UploadCloud size={36} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-black text-gray-700">Click or drag file here</p>
                  </div>
                )}
              </div>
              
              <button 
                type="button" 
                onClick={handleDownloadSample} 
                className="text-[#008b74] text-sm font-bold mt-4 flex items-center justify-center gap-2 w-full hover:underline"
              >
                <Download size={16} /> Download Sample CSV
              </button>
            </div>
            <button type="button" onClick={handleBulkUploadSubmit} disabled={isUploading || !selectedFile} className={`w-full py-4 rounded-xl font-black text-sm shadow-md transition-all flex justify-center items-center gap-2 ${selectedFile ? 'bg-[#008b74] hover:bg-[#00705d] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {isUploading ? 'Processing Data...' : <><UploadCloud size={18} /> Upload Assets</>}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}