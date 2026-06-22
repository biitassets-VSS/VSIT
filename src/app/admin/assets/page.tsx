'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Laptop, PlusCircle, Search, QrCode, 
  User, Calendar, X, Save, Eye, Hash, RefreshCw, Tag, 
  Download, Printer, Edit2, ShieldCheck, AlertCircle, Camera, 
  Upload, FileSpreadsheet, DollarSign, Building2, CheckCircle2
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
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [viewAssetModal, setViewAssetModal] = useState<any>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  // 1. NEW ASSET ENTERPRISE FORM STATE
  const [newAssetCategory, setNewAssetCategory] = useState('Laptop');
  const [newAssetId, setNewAssetId] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetBrand, setNewAssetBrand] = useState('');
  const [newAssetSerial, setNewAssetSerial] = useState('');
  const [newAssetPurchaseDate, setNewAssetPurchaseDate] = useState('');
  const [newAssetWarranty, setNewAssetWarranty] = useState('');
  const [newAssetPrice, setNewAssetPrice] = useState('');
  const [newAssetVendor, setNewAssetVendor] = useState('');
  const [newAssetCondition, setNewAssetCondition] = useState('New'); // New, Refurbished, Repaired
  const [newAssetStatus, setNewAssetStatus] = useState('In Stock (Unassigned)'); // In Stock, Assigned, In Repair, Demo Use, Discard
  const [newAssetAssignee, setNewAssetAssignee] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Importer State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Asset Edit State inside View Modal
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [assetInspectionLog, setAssetInspectionLog] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => { fetchRegistryData(); }, []);

  useEffect(() => {
    if (isAddModalOpen) generateAssetId(newAssetCategory);
  }, [newAssetCategory, isAddModalOpen]);

  useEffect(() => {
    const scanId = searchParams.get('view');
    if (scanId && assets.length > 0) {
      const foundAsset = assets.find(a => a.id === scanId || a.asset_tag === scanId);
      if (foundAsset) openAssetViewModal(foundAsset);
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
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    setNewAssetId(`${prefix}-${randomSuffix}`);
    return `${prefix}-${randomSuffix}`;
  };

  const fetchRegistryData = async () => {
    setLoading(true);
    try {
      const { data: assetData } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
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
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getStockStatusBadge = (status: string) => {
    const s = status || 'In Stock (Unassigned)';
    if (s.includes('Assigned')) return 'bg-green-100 text-green-700 border-green-200';
    if (s.includes('Repair')) return 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse';
    if (s.includes('Demo')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (s.includes('Discard')) return 'bg-red-100 text-red-700 border-red-200 line-through';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const getConditionBadge = (cond: string) => {
    const c = cond || 'New';
    if (c === 'New') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (c === 'Refurbished') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const openAssetViewModal = async (asset: any) => {
    setViewAssetModal(asset);
    setIsEditingAsset(false);
    setEditForm({
      name: asset.asset_name || '',
      brand: asset.brand || '',
      serial: asset.serial_number || '',
      purchase_date: asset.purchase_date || '',
      warranty_expiry: asset.warranty_expiry || '',
      price: asset.price || '',
      vendor: asset.vendor || '',
      condition: asset.asset_condition || 'New',
      status: asset.status || 'In Stock (Unassigned)',
      assignee: asset.assigned_to || ''
    });

    setAssetInspectionLog(null);
    try {
      const { data } = await supabase.from('inspections').select('*').eq('asset_id', asset.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) setAssetInspectionLog(data);
    } catch (e) { console.error(e); }
  };

  const handleSaveNewAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName || !newAssetSerial) return alert("Model Name and Serial Number required.");
    
    setIsSaving(true);
    try {
      const cleanPrice = newAssetPrice ? parseFloat(newAssetPrice) : null;
      const cleanPurchase = newAssetPurchaseDate ? newAssetPurchaseDate : null;
      const cleanWarranty = newAssetWarranty ? newAssetWarranty : null;
      const resolvedStatus = newAssetAssignee ? 'Assigned' : newAssetStatus;

      const { error } = await supabase.from('assets').insert([{
        id: newAssetId,
        asset_tag: newAssetId,
        asset_name: newAssetName,
        brand: newAssetBrand || 'Unknown Brand',
        serial_number: newAssetSerial,
        category: newAssetCategory,
        purchase_date: cleanPurchase,
        warranty_expiry: cleanWarranty,
        price: cleanPrice,
        vendor: newAssetVendor || 'General Supplier',
        asset_condition: newAssetCondition,
        status: resolvedStatus,
        assigned_to: newAssetAssignee || null,
        inspection_status: 'Pending Verification',
        upcoming_inspection_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }]);

      if (error) throw error;
      alert(`Hardware ${newAssetId} fully logged into Enterprise Ledger!`);
      setIsAddModalOpen(false);
      
      setNewAssetName(''); setNewAssetBrand(''); setNewAssetSerial(''); setNewAssetPrice(''); setNewAssetVendor(''); setNewAssetAssignee('');
      fetchRegistryData();
    } catch (err: any) { alert(`Database Error: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleUpdateExistingAsset = async () => {
    setIsUpdating(true);
    try {
      const cleanPrice = editForm.price ? parseFloat(editForm.price) : null;
      const cleanPurchase = editForm.purchase_date ? editForm.purchase_date : null;
      const cleanWarranty = editForm.warranty_expiry ? editForm.warranty_expiry : null;
      
      let resolvedStatus = editForm.status;
      if (editForm.assignee && resolvedStatus === 'In Stock (Unassigned)') resolvedStatus = 'Assigned';
      if (!editForm.assignee && resolvedStatus === 'Assigned') resolvedStatus = 'In Stock (Unassigned)';

      const { error } = await supabase.from('assets').update({
        asset_name: editForm.name,
        brand: editForm.brand,
        serial_number: editForm.serial,
        purchase_date: cleanPurchase,
        warranty_expiry: cleanWarranty,
        price: cleanPrice,
        vendor: editForm.vendor,
        asset_condition: editForm.condition,
        status: resolvedStatus,
        assigned_to: editForm.assignee || null
      }).eq('id', viewAssetModal.id);

      if (error) throw error;

      const selectedStaff = staffList.find(s => s.id === editForm.assignee) || {};
      const updatedStaffName = selectedStaff.full_name || selectedStaff.name || editForm.assignee || 'Unassigned';

      setViewAssetModal((prev: any) => ({
        ...prev,
        asset_name: editForm.name, brand: editForm.brand, serial_number: editForm.serial,
        purchase_date: cleanPurchase, warranty_expiry: cleanWarranty, price: cleanPrice,
        vendor: editForm.vendor, asset_condition: editForm.condition, status: resolvedStatus,
        assigned_to: editForm.assignee, staff_name: updatedStaffName
      }));

      setIsEditingAsset(false);
      fetchRegistryData();
      alert("Asset file successfully updated!");
    } catch (err: any) { alert(`Error updating: ${err.message}`); } finally { setIsUpdating(false); }
  };

  const downloadSampleCsvTemplate = () => {
    const headers = "Category,ModelName,Brand,SerialNumber,PurchaseDate,WarrantyExpiryDate,Price,Vendor,Condition\n";
    const sampleData = "Laptop,MacBook Pro M3,Apple,SN-99482,2026-01-15,2029-01-15,1899.99,Apple Direct,New\nMouse,MX Master 3S,Logitech,LOGI-8821,2025-11-01,,99.50,Amazon,Refurbished";
    const blob = new Blob([headers + sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'VS_Hardware_Bulk_Template.csv'; a.click();
  };

  const executeBulkImport = async () => {
    if (!bulkFile) return alert("Please select a CSV file first.");
    setIsImporting(true);

    try {
      const text = await bulkFile.text();
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) throw new Error("CSV contains no data rows.");

      const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());
      const batchPayload: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const col: Record<string, string> = {};
        rawHeaders.forEach((h, index) => { col[h] = (row[index] || '').replace(/(^"|"$)/g, '').trim(); });

        if (!col['modelname'] || !col['serialnumber']) continue;

        const cat = col['category'] || 'Laptop';
        const newId = generateAssetId(cat);
        const pDate = col['purchasedate'] && !isNaN(Date.parse(col['purchasedate'])) ? col['purchasedate'] : null;
        const wDate = col['warrantyexpirydate'] && !isNaN(Date.parse(col['warrantyexpirydate'])) ? col['warrantyexpirydate'] : null;
        const numPrice = col['price'] ? parseFloat(col['price']) : null;

        batchPayload.push({
          id: newId,
          asset_tag: newId,
          asset_name: col['modelname'],
          brand: col['brand'] || 'Standard',
          serial_number: col['serialnumber'],
          category: cat,
          purchase_date: pDate,
          warranty_expiry: wDate,
          price: numPrice,
          vendor: col['vendor'] || 'Bulk Import',
          asset_condition: col['condition'] || 'New',
          status: 'In Stock (Unassigned)',
          inspection_status: 'Pending Verification',
          upcoming_inspection_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      if (batchPayload.length === 0) throw new Error("No valid hardware rows found to import.");

      const { error } = await supabase.from('assets').insert(batchPayload);
      if (error) throw error;

      alert(`🎉 Successfully imported ${batchPayload.length} hardware assets!`);
      setIsBulkModalOpen(false);
      setBulkFile(null);
      fetchRegistryData();
    } catch (err: any) { alert(`Bulk Import Failed: ${err.message}`); } finally { setIsImporting(false); }
  };

  const getCleanDisplayTag = (asset: any) => {
    if (!asset) return 'NO-TAG';
    if (asset.asset_tag && asset.asset_tag.includes('VS-')) return asset.asset_tag.toUpperCase();
    if (asset.id && asset.id.includes('VS-')) return asset.id.toUpperCase();
    const rawId = String(asset.asset_tag || asset.id || '');
    if (rawId.length > 20) return `TAG-${rawId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    return rawId.toUpperCase();
  };

  const filteredAssets = assets.filter(a => {
    const q = searchQuery.toLowerCase();
    return a.id.toLowerCase().includes(q) || a.asset_name?.toLowerCase().includes(q) || 
           a.serial_number?.toLowerCase().includes(q) || a.staff_name?.toLowerCase().includes(q) ||
           a.brand?.toLowerCase().includes(q) || a.status?.toLowerCase().includes(q);
  });

  const getAssetViewUrl = (asset: any) => {
    const baseDomain = typeof window !== 'undefined' ? window.location.origin : 'https://virtual-staffing.vercel.app';
    const targetRef = asset.asset_tag || asset.id;
    return `${baseDomain}/admin/assets?view=${targetRef}`;
  };

  const handlePrintPhysicalSticker = (asset: any, cleanTag: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getAssetViewUrl(asset))}`;
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    if (!printWindow) return alert("Pop-up blocked! Allow pop-ups to print stickers.");

    const printableMarkup = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sticker_${cleanTag}</title>
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; font-family: monospace; background: #fff; color: #000; }
            .label-box { width: 55mm; height: 55mm; padding: 4mm; box-sizing: border-box; text-align: center; border: 1px dashed #ccc; }
            .header { font-size: 9px; font-weight: bold; margin-bottom: 2px; }
            .qr { width: 30mm; height: 30mm; margin: 0 auto; display: block; }
            .tag { font-size: 16px; font-weight: 900; margin-top: 3px; }
            .model { font-size: 8px; color: #444; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            @media print { @page { size: 55mm 55mm; margin: 0; } body { padding: 0; } .label-box { border: none; } }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="header">VIRTUAL STAFFING IT</div>
            <img class="qr" src="${qrUrl}" onload="window.print(); window.close();" />
            <div class="tag">${cleanTag}</div>
            <div class="model">${asset.asset_name || 'Hardware Asset'}</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.open(); printWindow.document.write(printableMarkup); printWindow.document.close();
  };

  const handleDownloadStickerImage = async (asset: any, cleanTag: string) => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getAssetViewUrl(asset))}`;
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const base64Qr = await new Promise<string>((resolve) => {
        const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob);
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 600; canvas.height = 750;
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#002B49'; ctx.lineWidth = 12; ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.fillStyle = '#002B49'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VIRTUAL STAFFING IT ASSET', canvas.width / 2, 65);

      const qrImg = new Image();
      qrImg.src = base64Qr;
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 100, 95, 400, 400);
        ctx.fillStyle = '#002B49'; ctx.font = '900 56px monospace'; ctx.fillText(cleanTag, canvas.width / 2, 560);
        ctx.fillStyle = '#475569'; ctx.font = 'bold 22px sans-serif'; ctx.fillText(asset.asset_name?.slice(0, 36) || 'Hardware Asset', canvas.width / 2, 620);
        ctx.fillStyle = '#64748b'; ctx.font = '18px monospace'; ctx.fillText(`S/N: ${asset.serial_number || 'UNKNOWN'}`, canvas.width / 2, 665);
        ctx.fillStyle = '#94a3b8'; ctx.font = '12px sans-serif'; ctx.fillText('Property of Virtual Staffing Solutions — Do Not Remove', canvas.width / 2, 715);

        const link = document.createElement('a'); link.download = `Sticker_${cleanTag}.png`; link.href = canvas.toDataURL('image/png'); link.click();
      };
    } catch (err) { alert("Error rendering sticker image."); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans">
      
      {/* 🚀 COMMAND HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">Hardware Registry</h1>
              <span className="px-3 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-full">
                {assets.length} Total Units
              </span>
            </div>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Manage full hardware lifecycle, financial data, and inventory status</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto w-full md:w-auto">
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
          >
            <FileSpreadsheet size={15} />
            <span>Bulk Upload CSV</span>
          </button>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#002B49] hover:bg-[#001d33] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#002B49]/20"
          >
            <PlusCircle size={16} />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs flex items-center">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Asset ID, Model, Brand, Serial, Staff, or Status (e.g. 'In Repair')..." 
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* ASSETS GRID */}
      {loading ? (
        <div className="w-full py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002B49]"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAssets.map(asset => {
            const cleanDisplayTag = getCleanDisplayTag(asset);
            return (
              <div key={asset.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-colors">
                
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-black">
                      <Laptop size={18} />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-black text-gray-900 leading-tight truncate max-w-[170px]">{asset.asset_name}</h3>
                      <p className="text-[11px] font-bold text-gray-400 truncate">{asset.brand || 'Standard Brand'}</p>
                    </div>
                  </div>
                  <button onClick={() => openAssetViewModal(asset)} className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0">
                    <QrCode size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-md font-extrabold text-[9px] uppercase tracking-wider border ${getStockStatusBadge(asset.status)}`}>
                    {asset.status || 'In Stock'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider border ${getConditionBadge(asset.asset_condition)}`}>
                    {asset.asset_condition || 'New'}
                  </span>
                  {asset.price && (
                    <span className="ml-auto text-xs font-black text-gray-900 font-mono">
                      ${Number(asset.price).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="space-y-2 p-3.5 bg-gray-50 rounded-2xl border border-gray-100/60 text-xs">
                  <div className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Tag ID:</span> <span className="font-mono font-black text-blue-600">{cleanDisplayTag}</span></div>
                  <div className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Serial No:</span> <span className="font-mono font-black text-gray-700 truncate max-w-[140px]">{asset.serial_number || 'N/A'}</span></div>
                  <div className="flex justify-between pt-1 border-t border-gray-200/60"><span className="font-bold text-gray-400 uppercase text-[9px]">Assignee:</span> <span className="font-black text-gray-900 truncate max-w-[140px]">{asset.staff_name}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🟢 1. ENTERPRISE REGISTER ASSET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xs font-black uppercase text-[#002B49] tracking-widest flex items-center gap-2"><Laptop size={16}/> Enterprise Asset Logging Form</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={18}/></button>
            </div>

            <form onSubmit={handleSaveNewAsset} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              
              <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-100 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-800 block">1. Hardware Identity</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase">Category</label>
                    <select value={newAssetCategory} onChange={e => setNewAssetCategory(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none">
                      <option value="Laptop">Laptop</option><option value="Mouse">Mouse</option><option value="Keyboard">Keyboard</option><option value="Headphone">Headphone</option><option value="Other">Other Asset</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-600 uppercase">System Tag ID</label>
                    <input type="text" readOnly value={newAssetId} className="w-full mt-1 p-2.5 bg-blue-100/60 border border-blue-200 rounded-xl text-xs font-mono font-black text-blue-900 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase">Brand</label>
                    <input type="text" placeholder="e.g. Dell, Apple" value={newAssetBrand} onChange={e => setNewAssetBrand(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Model Name *</label>
                    <input type="text" required placeholder="e.g. Latitude 5420" value={newAssetName} onChange={e => setNewAssetName(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase">Serial Number *</label>
                  <input type="text" required placeholder="Scan or type factory S/N sticker..." value={newAssetSerial} onChange={e => setNewAssetSerial(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none" />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/60 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 flex items-center gap-1.5"><DollarSign size={13}/> 2. Financials & Warranty</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase">Purchase Price ($ USD)</label>
                    <input type="number" step="0.01" placeholder="0.00" value={newAssetPrice} onChange={e => setNewAssetPrice(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase">Supplier / Vendor</label>
                    <input type="text" placeholder="e.g. CDW, Apple Store" value={newAssetVendor} onChange={e => setNewAssetVendor(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase">Purchase Date</label>
                    <input type="date" value={newAssetPurchaseDate} onChange={e => setNewAssetPurchaseDate(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase">Warranty Expiry Date</label>
                    <input type="date" value={newAssetWarranty} onChange={e => setNewAssetWarranty(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none" />
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 block">3. Stock Logistics & Assignment</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase">Hardware Condition</label>
                    <select value={newAssetCondition} onChange={e => setNewAssetCondition(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-800 outline-none">
                      <option value="New">✨ New</option><option value="Refurbished">🔄 Refurbished</option><option value="Repaired">🛠️ Repaired</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase">Initial Stock Status</label>
                    <select value={newAssetStatus} onChange={e => setNewAssetStatus(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-800 outline-none">
                      <option value="In Stock (Unassigned)">📦 In Stock (Unassigned)</option>
                      <option value="Demo Use">🧪 Demo / Office Use</option>
                      <option value="In Repair">⚠️ In Repair</option>
                      <option value="Discard">🗑️ Discarded / Depreciated</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase">Instant Staff Assignment (Overrides Stock Status)</label>
                  <select value={newAssetAssignee} onChange={e => setNewAssetAssignee(e.target.value)} className="w-full mt-1 p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-gray-900 outline-none">
                    <option value="">-- Leave Unassigned in Warehouse --</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name || s.name} ({s.emp_code || s.email})</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full py-4 bg-[#002B49] hover:bg-[#001d33] text-white rounded-2xl text-xs font-black uppercase tracking-wider flex justify-center items-center gap-2 shadow-lg">
                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Writing to Postgres...' : 'Confirm Enterprise Registration'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 2. BULK CSV IMPORTER MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6 text-center">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#002B49] flex items-center gap-2"><Upload size={16}/> Bulk CSV Import</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={18}/></button>
            </div>

            <div className="space-y-3 text-left">
              <button onClick={downloadSampleCsvTemplate} className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
                <Download size={15}/> <span>1. Download CSV formatted Template</span>
              </button>
              <p className="text-[11px] text-gray-400 font-medium leading-relaxed pl-1">Fill out the Excel template. Do not rename the top column headers. The script will automatically assign secure `VS-LAP-` tags to every row.</p>
            </div>

            <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors flex flex-col items-center justify-center gap-3">
              <FileSpreadsheet size={40} className="text-emerald-600 animate-bounce" />
              <input type="file" accept=".csv" onChange={e => setBulkFile(e.target.files?.[0] || null)} className="text-xs font-bold text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#002B49] file:text-white file:cursor-pointer" />
            </div>

            <button onClick={executeBulkImport} disabled={isImporting || !bulkFile} className={`w-full py-3.5 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md ${bulkFile ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'}`}>
              {isImporting ? 'Parsing lines...' : '2. Execute Batch Upload'}
            </button>
          </div>
        </div>
      )}

      {/* 🚀 3. OVERHAULED COMMAND MODAL (View + Status Toggles + Live Edit + Compliance) */}
      {viewAssetModal && (() => {
        const cleanModalTag = getCleanDisplayTag(viewAssetModal);
        const logPhotos = assetInspectionLog?.photos ? Object.entries(assetInspectionLog.photos) : [];

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-gray-200">
              
              {/* LEFT COLUMN: QR LABEL & STICKER ENGINE */}
              <div className="w-full md:w-1/3 bg-gradient-to-b from-blue-50/80 to-white p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-gray-100 relative shrink-0">
                <button onClick={() => setViewAssetModal(null)} className="absolute md:hidden top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100 p-1.5 rounded-full"><X size={14}/></button>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#002B49] mb-6">Sticker Matrix</h3>
                
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-100 mb-4">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getAssetViewUrl(viewAssetModal))}`} alt="Asset QR Code" className="w-36 h-36 object-contain" />
                </div>

                <div className="bg-[#002B49] text-white py-2 px-6 rounded-xl shadow-md mb-8">
                  <h2 className="text-xl font-mono font-black tracking-widest">{cleanModalTag}</h2>
                </div>

                <div className="flex w-full gap-2 mt-auto">
                  <button onClick={() => handlePrintPhysicalSticker(viewAssetModal, cleanModalTag)} className="flex-1 py-3 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex justify-center items-center gap-1.5 shadow-md"><Printer size={14} /> Print</button>
                  <button onClick={() => handleDownloadStickerImage(viewAssetModal, cleanModalTag)} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex justify-center items-center gap-1.5 shadow-md"><Download size={14} /> PNG</button>
                </div>
              </div>

              {/* RIGHT COLUMN: SPECS, LIVE STATUS SWITCHER, EDITING, & COMPLIANCE */}
              <div className="w-full md:w-2/3 flex flex-col overflow-y-auto custom-scrollbar relative">
                <button onClick={() => setViewAssetModal(null)} className="hidden md:flex absolute top-5 right-5 text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full transition-colors z-10"><X size={16}/></button>

                <div className="p-8 space-y-8">
                  
                  {/* TOP BAR: QUICK STOCK STATUS & CONDITION CONTROLS */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Logistics State:</span>
                      <span className={`px-3 py-1 rounded-lg font-black text-xs uppercase tracking-wider border ${getStockStatusBadge(viewAssetModal.status)}`}>
                        {viewAssetModal.status || 'In Stock'}
                      </span>
                    </div>

                    {!isEditingAsset && (
                      <button onClick={() => setIsEditingAsset(true)} className="px-4 py-2 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs ml-auto">
                        <Edit2 size={13} /> Edit Full Ledger
                      </button>
                    )}
                  </div>

                  {/* SECTION 1: Details Grid vs Editor */}
                  <div>
                    {isEditingAsset ? (
                      <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-200 space-y-4 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center pb-2 border-b border-blue-100">
                          <span className="text-xs font-black uppercase tracking-wider text-blue-900">Editing Hardware Record</span>
                          <span className="text-xs font-mono font-bold text-blue-600">{cleanModalTag}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><label className="text-[10px] font-black text-gray-500 uppercase">Brand</label><input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                          <div><label className="text-[10px] font-black text-gray-500 uppercase">Model Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div><label className="text-[10px] font-black text-gray-500 uppercase">Price ($)</label><input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold font-mono outline-none" /></div>
                          <div className="sm:col-span-2"><label className="text-[10px] font-black text-gray-500 uppercase">Vendor</label><input type="text" value={editForm.vendor} onChange={e => setEditForm({...editForm, vendor: e.target.value})} className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><label className="text-[10px] font-black text-gray-500 uppercase">Purchase Date</label><input type="date" value={editForm.purchase_date} onChange={e => setEditForm({...editForm, purchase_date: e.target.value})} className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                          <div><label className="text-[10px] font-black text-gray-500 uppercase">Warranty Expiry</label><input type="date" value={editForm.warranty_expiry} onChange={e => setEditForm({...editForm, warranty_expiry: e.target.value})} className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-blue-100">
                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase">Condition</label>
                            <select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})} className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold text-gray-800 outline-none">
                              <option value="New">✨ New</option><option value="Refurbished">🔄 Refurbished</option><option value="Repaired">🛠️ Repaired</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase">Change Stock Status</label>
                            <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-black text-gray-800 outline-none">
                              <option value="In Stock (Unassigned)">📦 In Stock (Unassigned)</option><option value="Assigned">👤 Assigned</option><option value="Demo Use">🧪 Demo Use</option><option value="In Repair">⚠️ In Repair</option><option value="Discard">🗑️ Discarded</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase">Re-Assign to Staff</label>
                          <select value={editForm.assignee} onChange={e => setEditForm({...editForm, assignee: e.target.value})} className="w-full mt-1 p-2.5 bg-white border rounded-xl text-xs font-bold text-gray-900 outline-none">
                            <option value="">-- Warehouse Inventory (Unassigned) --</option>
                            {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.full_name || staff.name} ({staff.emp_code || staff.email})</option>)}
                          </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button onClick={() => setIsEditingAsset(false)} className="px-5 py-2.5 bg-white border text-gray-600 rounded-xl text-xs font-black uppercase">Cancel</button>
                          <button onClick={handleUpdateExistingAsset} disabled={isUpdating} className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-md">
                            {isUpdating ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Updates
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="bg-gray-50 p-3.5 rounded-2xl border"><p className="text-[9px] font-black text-gray-400 uppercase">Brand</p><p className="text-xs font-black text-gray-900 mt-0.5 truncate">{viewAssetModal.brand || 'N/A'}</p></div>
                          <div className="bg-gray-50 p-3.5 rounded-2xl border sm:col-span-2"><p className="text-[9px] font-black text-gray-400 uppercase">Model Name</p><p className="text-xs font-black text-gray-900 mt-0.5 truncate">{viewAssetModal.asset_name}</p></div>
                          <div className="bg-gray-50 p-3.5 rounded-2xl border"><p className="text-[9px] font-black text-gray-400 uppercase">Condition</p><span className={`mt-1 inline-block px-2 py-0.5 rounded font-black text-[10px] border ${getConditionBadge(viewAssetModal.asset_condition)}`}>{viewAssetModal.asset_condition || 'New'}</span></div>
                          <div className="bg-gray-50 p-3.5 rounded-2xl border"><p className="text-[9px] font-black text-gray-400 uppercase">Price ($)</p><p className="text-xs font-mono font-black text-gray-900 mt-0.5">{viewAssetModal.price ? `$${Number(viewAssetModal.price).toLocaleString()}` : 'Unrecorded'}</p></div>
                          <div className="bg-gray-50 p-3.5 rounded-2xl border"><p className="text-[9px] font-black text-gray-400 uppercase">Vendor</p><p className="text-xs font-bold text-gray-700 mt-0.5 truncate">{viewAssetModal.vendor || 'N/A'}</p></div>
                          <div className="bg-gray-50 p-3.5 rounded-2xl border"><p className="text-[9px] font-black text-gray-400 uppercase">Purchase Date</p><p className="text-xs font-mono font-bold text-gray-700 mt-0.5">{viewAssetModal.purchase_date || 'N/A'}</p></div>
                          <div className="bg-gray-50 p-3.5 rounded-2xl border sm:col-span-2"><p className="text-[9px] font-black text-gray-400 uppercase">Warranty Expiry</p><p className="text-xs font-mono font-bold text-blue-600 mt-0.5">{viewAssetModal.warranty_expiry || 'N/A'}</p></div>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">Assigned Employee Holder:</span>
                            <div className="flex items-center gap-2">
                              <User size={15} className="text-blue-600"/>
                              <span className="text-sm font-black text-gray-900">{viewAssetModal.staff_name}</span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-gray-400">S/N: {viewAssetModal.serial_number}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="border-gray-100" />

                  {/* SECTION 2: Compliance Portal */}
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-800 mb-4 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-500" /> Last Mobile Audit Log
                    </h3>

                    {!assetInspectionLog ? (
                      <div className="p-6 bg-orange-50 border border-orange-100 rounded-2xl text-center">
                        <AlertCircle size={24} className="mx-auto text-orange-400 mb-2" />
                        <p className="text-xs font-bold text-orange-800">No verification history found.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border">
                          <div><p className="text-[10px] font-black text-gray-400 uppercase">Audit Date</p><p className="mt-1 text-xs font-bold text-gray-800">{new Date(assetInspectionLog.created_at).toLocaleDateString()}</p></div>
                          <div className="text-right"><p className="text-[10px] font-black text-gray-400 uppercase">Audit Status</p><p className="mt-1 text-xs font-black uppercase text-green-600">{assetInspectionLog.status || 'Verified'}</p></div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1.5">Staff Condition Notes</p>
                          <p className="text-xs text-gray-700 italic bg-white p-3 border rounded-xl">"{assetInspectionLog.notes || 'No description.'}"</p>
                        </div>
                        {logPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2.5">
                            {logPhotos.map(([angle, url]: any) => (
                              <button key={angle} onClick={() => setPreviewPhotoModal(url)} className="w-14 h-14 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-500 cursor-pointer"><img src={url} alt="" className="w-full h-full object-cover"/></button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🔍 HIGH-RES PHOTO LIGHTBOX MODAL */}
      {previewPhotoModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4">
          <button onClick={() => setPreviewPhotoModal(null)} className="absolute top-6 right-6 w-14 h-14 bg-gray-800 hover:bg-gray-700 text-white rounded-full flex items-center justify-center cursor-pointer shadow-xl"><X size={24} /></button>
          <img src={previewPhotoModal} alt="High-Res Evidence" className="max-w-5xl max-h-[85vh] object-contain rounded-2xl border border-gray-700 shadow-2xl" />
        </div>
      )}

    </div>
  );
}