'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PackageSearch, Plus, UploadCloud, Search, 
  Filter, User, ArrowLeft, Download, 
  FileSpreadsheet, CheckCircle2, AlertCircle, Save,
  Printer, QrCode, FileText, Image as ImageIcon,
  DollarSign, Wrench, Hash, XCircle, Trash2, UserMinus
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
  serialNumber?: string;
  price?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  condition?: string;
  notes?: string;
  photos?: string[];
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Add Single Asset State
  const [singleAssetForm, setSingleAssetForm] = useState({
    tagId: '', serialNumber: '', name: '', category: '', price: '',
    purchaseDate: '', warrantyExpiry: '', condition: '', status: 'In Stock (Available)', notes: ''
  });

  // Mock Asset Data
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
      price: '3500', purchaseDate: '2023-02-10', warrantyExpiry: '2024-02-10', condition: 'Good', photos: []
    },
    { 
      id: '3', tagId: 'VS-LAP-300188', name: 'Apple MacBook Pro M2', category: 'Laptop', status: 'In Stock (Available)',
      serialNumber: 'C02F3983QQQ', price: '185000', purchaseDate: '2023-11-05', warrantyExpiry: '2026-11-05', condition: 'New', photos: []
    },
    { 
      id: '4', tagId: 'VS-OTH-300511', name: 'Dell 27" 4K Monitor', category: 'Other', status: 'Maintenance',
      serialNumber: 'DELL-MON-4K-99', price: '32000', purchaseDate: '2022-06-12', warrantyExpiry: '2025-06-12', condition: 'Poor',
      notes: 'Screen flickering issue reported. Sent to service center.', photos: []
    },
  ]);

  useEffect(() => {
    if (singleAssetForm.category && viewState === 'add_single') {
      const prefix = CATEGORY_PREFIX_MAP[singleAssetForm.category] || 'OTH';
      const uniqueNum = Math.floor(100000 + Math.random() * 900000);
      setSingleAssetForm(prev => ({ ...prev, tagId: `VS-${prefix}-${uniqueNum}` }));
    }
  }, [singleAssetForm.category, viewState]);

  // --- Bulk Upload & CSV Fixes ---
  const handleDownloadSample = () => {
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

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const rows = text.split('\n').slice(1); // Skip header
        const newAssets: Asset[] = [];
        
        rows.forEach((row, index) => {
          if (!row.trim()) return;
          const cols = row.split(',');
          newAssets.push({
            id: Date.now().toString() + index,
            category: cols[0] || 'Other',
            tagId: cols[1] || `VS-OTH-${Math.floor(100000 + Math.random() * 900000)}`,
            name: cols[2] || 'Unknown Asset',
            serialNumber: cols[3],
            price: cols[4],
            purchaseDate: cols[5],
            warrantyExpiry: cols[6],
            condition: cols[7],
            status: (cols[8]?.trim() as Asset['status']) || 'In Stock (Available)',
            photos: []
          });
        });

        setTimeout(() => {
          setAssets(prev => [...newAssets, ...prev]);
          setIsUploading(false);
          setSelectedFile(null);
          alert(`${newAssets.length} Assets uploaded successfully!`);
          setViewState('list');
        }, 1000);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleAddSingleSubmit = () => {
    if (!singleAssetForm.tagId || !singleAssetForm.name || !singleAssetForm.category) {
      return alert("Please fill in all the required fields (*).");
    }
    setIsUploading(true);
    setTimeout(() => {
      setAssets(prev => [{
        id: Date.now().toString(), ...singleAssetForm, status: singleAssetForm.status as any, photos: []
      }, ...prev]);
      setIsUploading(false);
      setSingleAssetForm({ tagId: '', serialNumber: '', name: '', category: '', price: '', purchaseDate: '', warrantyExpiry: '', condition: '', status: 'In Stock (Available)', notes: '' });
      alert('Asset successfully added to inventory!');
      setViewState('list');
    }, 800);
  };

  // --- Details Actions ---
  const updateAssetStatus = (newStatus: Asset['status']) => {
    if (!selectedAsset) return;
    
    // If assigning, mock add user. If unassigning, remove user.
    let assignedData = {};
    if (newStatus === 'Assigned') {
      assignedData = { assignedTo: 'New Employee', empCode: 'EMP-9999' };
    } else if (newStatus === 'In Stock (Available)' || newStatus === 'Maintenance' || newStatus === 'Retired') {
      assignedData = { assignedTo: undefined, empCode: undefined };
    }

    const updatedAsset = { ...selectedAsset, status: newStatus, ...assignedData };
    setAssets(assets.map(a => a.id === selectedAsset.id ? updatedAsset : a));
    setSelectedAsset(updatedAsset);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedAsset) {
      // Create a temporary local URL for the selected image
      const photoUrl = URL.createObjectURL(e.target.files[0]);
      const updatedAsset = { ...selectedAsset, photos: [...(selectedAsset.photos || []), photoUrl] };
      setAssets(assets.map(a => a.id === selectedAsset.id ? updatedAsset : a));
      setSelectedAsset(updatedAsset);
    }
  };

  const handlePrint = () => window.print();
  const openAssetDetails = (asset: Asset) => { setSelectedAsset(asset); setViewState('view_details'); };

  // Stats & Filters
  const totalAssets = assets.length;
  const availableAssets = assets.filter(a => a.status === 'In Stock (Available)').length;
  const assignedAssets = assets.filter(a => a.status === 'Assigned').length;
  const filteredAssets = assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.tagId.toLowerCase().includes(searchQuery.toLowerCase()));
  const printFilteredAssets = printCategoryFilter === 'All' ? assets : assets.filter(a => a.category === printCategoryFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      <style dangerouslySetInnerHTML={{__html: `@media print { body * { visibility: hidden; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }`}} />

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
              <button onClick={() => setViewState('print_tags')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm"><Printer size={18} /> Print Tags</button>
              <button onClick={() => setViewState('bulk_upload')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-[#008b74] hover:bg-[#e6f4f1] text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm"><UploadCloud size={18} /> Bulk Upload</button>
              <button onClick={() => setViewState('add_single')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#008b74] hover:bg-[#00705d] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm"><Plus size={18} /> Add Asset</button>
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
                <input type="text" placeholder="Search assets by name or tag ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#008b74]" />
              </div>
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
                        <div className="font-black text-sm text-[#008b74] cursor-pointer hover:underline" onClick={() => openAssetDetails(asset)}>{asset.name}</div>
                        <div className="text-[11px] font-bold text-gray-600 bg-gray-100 inline-flex items-center gap-1 px-2 py-0.5 rounded-md mt-1 border border-gray-200">
                          <QrCode size={10} /> {asset.tagId}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-600">{asset.category}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                          asset.status === 'In Stock (Available)' ? 'bg-[#e6f4f1] text-[#008b74] border-[#008b74]/20' :
                          asset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          asset.status === 'Maintenance' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>{asset.status}</span>
                      </td>
                      <td className="p-4">
                        {asset.assignedTo ? (
                          <div>
                            <div className="text-sm font-bold text-gray-900">{asset.assignedTo}</div>
                            <div className="text-xs font-medium text-gray-500">{asset.empCode}</div>
                          </div>
                        ) : (<span className="text-xs font-bold text-gray-400">-</span>)}
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
      {/* 2. VIEW DETAILS PAGE                       */}
      {/* ========================================== */}
      {viewState === 'view_details' && selectedAsset && (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Back to Assets
            </button>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              
              {/* Contextual Actions Based on Status */}
              {selectedAsset.status === 'Assigned' ? (
                <button onClick={() => updateAssetStatus('In Stock (Available)')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 flex items-center gap-2 shadow-sm">
                  <UserMinus size={16} /> Unassign User
                </button>
              ) : selectedAsset.status !== 'Retired' ? (
                <button onClick={() => updateAssetStatus('Assigned')} className="px-4 py-2 bg-[#008b74] text-white text-sm font-bold rounded-xl hover:bg-[#00705d] flex items-center gap-2 shadow-sm">
                  <User size={16} /> Assign User
                </button>
              ) : null}

              {selectedAsset.status !== 'Maintenance' && selectedAsset.status !== 'Retired' && (
                <button onClick={() => updateAssetStatus('Maintenance')} className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-bold rounded-xl hover:bg-orange-100 flex items-center gap-2 shadow-sm">
                  <Wrench size={16} /> Send to Repair
                </button>
              )}

              {selectedAsset.status === 'Maintenance' && (
                <button onClick={() => updateAssetStatus('In Stock (Available)')} className="px-4 py-2 bg-[#008b74] text-white text-sm font-bold rounded-xl hover:bg-[#00705d] flex items-center gap-2 shadow-sm">
                  <CheckCircle2 size={16} /> Mark Repaired
                </button>
              )}

              {selectedAsset.status !== 'Retired' && (
                 <button onClick={() => updateAssetStatus('Retired')} className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl hover:bg-red-100 flex items-center gap-2 shadow-sm">
                 <Trash2 size={16} /> Discard
               </button>
              )}

            </div>
          </div>

          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 p-6 sm:p-8 border-b border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                      selectedAsset.status === 'In Stock (Available)' ? 'bg-[#e6f4f1] text-[#008b74] border-[#008b74]/20' :
                      selectedAsset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      selectedAsset.status === 'Maintenance' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>{selectedAsset.status}</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{selectedAsset.category}</span>
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-1">{selectedAsset.name}</h2>
                <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                  <span className="flex items-center gap-1"><QrCode size={14}/> {selectedAsset.tagId}</span>
                  {selectedAsset.serialNumber && <span className="flex items-center gap-1"><Hash size={14}/> {selectedAsset.serialNumber}</span>}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left Column */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={16}/> Purchase & Warranty</h3>
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-500">Purchase Price</span><span className="text-sm font-black text-gray-900">{selectedAsset.price ? `₹ ${selectedAsset.price}` : 'N/A'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-500">Purchase Date</span><span className="text-sm font-black text-gray-900">{selectedAsset.purchaseDate || 'N/A'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-500">Warranty Expiry</span><span className="text-sm font-black text-[#008b74]">{selectedAsset.warrantyExpiry || 'N/A'}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={16}/> Notes & Condition</h3>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <div className="mb-4"><span className="text-sm font-bold text-gray-500 block mb-1">Current Condition</span><span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-700">{selectedAsset.condition || 'Not Specified'}</span></div>
                    <div><span className="text-sm font-bold text-gray-500 block mb-1">Additional Notes</span><p className="text-sm font-medium text-gray-800 bg-white p-3 rounded-xl border border-gray-200 min-h-[80px]">{selectedAsset.notes || 'No notes have been added.'}</p></div>
                  </div>
                </div>
              </div>

              {/* Right Column (Photos & Assignment) */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ImageIcon size={16}/> Inspection Photos</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Render existing photos */}
                    {selectedAsset.photos?.map((photoUrl, idx) => (
                      <div key={idx} className="aspect-square bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden relative group cursor-pointer">
                        <img src={photoUrl} alt="Asset" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">View Image</div>
                      </div>
                    ))}

                    {/* Hidden input to handle file selection */}
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                    
                    {/* Upload trigger button */}
                    <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-[#008b74] hover:text-[#008b74] transition cursor-pointer">
                      <Plus size={24} className="mb-1" />
                      <span className="text-xs font-bold">Upload Photo</span>
                    </div>
                  </div>
                </div>

                {selectedAsset.status === 'Assigned' && selectedAsset.assignedTo && (
                   <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={16}/> Current Assignment</h3>
                    <div className="bg-white border border-blue-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-lg">{selectedAsset.assignedTo.charAt(0)}</div>
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
      {/* 3 & 4. ADD ASSET & BULK UPLOAD (Unchanged Layout) */}
      {/* ========================================== */}
      {viewState === 'bulk_upload' && (
        <div className="space-y-6">
           <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"><ArrowLeft size={16} /> Back to Assets</button>
          <div className="bg-white p-6 sm:p-10 rounded-[24px] shadow-sm border border-gray-100 max-w-3xl mx-auto">
             <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#e6f4f1] text-[#008b74] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#008b74]/20"><FileSpreadsheet size={32} /></div>
              <h2 className="text-2xl font-black text-gray-900">Bulk Upload Assets</h2>
            </div>
            <div className="mb-8">
              <div className={`relative w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${selectedFile ? 'border-[#008b74] bg-[#e6f4f1]' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"/>
                {selectedFile ? (
                  <div className="text-center"><FileSpreadsheet size={36} className="text-[#008b74] mx-auto mb-2" /><p className="text-sm font-black text-[#00705d]">{selectedFile.name}</p></div>
                ) : (
                  <div className="text-center"><UploadCloud size={36} className="text-gray-400 mx-auto mb-2" /><p className="text-sm font-black text-gray-700">Click or drag CSV file here</p></div>
                )}
              </div>
              <button type="button" onClick={handleDownloadSample} className="text-[#008b74] text-sm font-bold mt-4 flex items-center justify-center gap-2 w-full hover:underline"><Download size={16} /> Download Sample CSV</button>
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