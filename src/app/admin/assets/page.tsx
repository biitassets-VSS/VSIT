'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Laptop, PlusCircle, Search, QrCode, 
  User, X, Save, RefreshCw, Download, Printer, Edit2, 
  Upload, FileSpreadsheet, Package, Mouse, 
  Keyboard, Headphones, SlidersHorizontal, Smartphone
} from 'lucide-react';

// 1. EXACT CATEGORY MATCHES AS REQUESTED
const ASSET_CATEGORIES = [
  'Laptop', 
  'Stand', 
  'Keyboard USB', 
  'Combo Keyboard with Mouse kit USB', 
  'Wireless Keyboard kit', 
  'Mouse', 
  'Headphone', 
  'Cleaning kit', 
  'Mouse PAD', 
  'Others'
];

export default function AssetRegistryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [viewAssetModal, setViewAssetModal] = useState<any>(null);

  // Add Form
  const [newAssetCategory, setNewAssetCategory] = useState('Laptop');
  const [newAssetTag, setNewAssetTag] = useState(''); 
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetBrand, setNewAssetBrand] = useState('');
  const [newAssetSerial, setNewAssetSerial] = useState('');
  const [newAssetPrice, setNewAssetPrice] = useState('');
  const [newAssetVendor, setNewAssetVendor] = useState('');
  const [newAssetPurchaseDate, setNewAssetPurchaseDate] = useState('');
  const [newAssetWarranty, setNewAssetWarranty] = useState('');
  const [newAssetCondition, setNewAssetCondition] = useState('New');
  const [newAssetStatus, setNewAssetStatus] = useState('In Stock (Unassigned)');
  const [newAssetAssignee, setNewAssetAssignee] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Importer State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Edit State
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => { fetchRegistryData(); }, []);

  useEffect(() => {
    if (isAddModalOpen) setNewAssetTag(generateCategoryPrefix(newAssetCategory));
  }, [newAssetCategory, isAddModalOpen]);

  useEffect(() => {
    const scanId = searchParams.get('view');
    if (scanId && assets.length > 0) {
      const foundAsset = assets.find(a => a.id === scanId || a.asset_tag === scanId || a.clean_tag === scanId);
      if (foundAsset) openAssetViewModal(foundAsset);
    }
  }, [searchParams, assets]);

  // 🚀 SMART PREFIX GENERATOR (Exactly mapped to your rules)
  const generateCategoryPrefix = (category: string, existingUuid?: string) => {
    let prefix = 'VS-AST';
    const cat = (category || '').toLowerCase();
    
    if (cat.includes('laptop')) prefix = 'VS-LAP';
    else if (cat.includes('combo') || cat.includes('keyboard')) prefix = 'VS-KB';
    else if (cat.includes('mouse pad') || cat === 'mouse pad') prefix = 'VS-PAD';
    else if (cat.includes('mouse')) prefix = 'VS-MO';
    else if (cat.includes('headphone')) prefix = 'VS-HDP';
    else if (cat.includes('cleaning')) prefix = 'VS-CLN';
    else if (cat.includes('stand')) prefix = 'VS-STN';

    if (existingUuid && existingUuid.length > 20) {
      const numsOnly = existingUuid.replace(/[^0-9]/g, '');
      const stableDigits = numsOnly.length >= 5 ? numsOnly.slice(-5) : '10482';
      return `${prefix}-${stableDigits}`;
    }

    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${randomDigits}`;
  };

  const generateSafeUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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
            // 🛡️ FRONTEND FIX: Read from "name" first, fallback to "asset_name" safely
            safe_display_name: asset.name || asset.asset_name || 'Unnamed Asset',
            staff_name: assignee.full_name || assignee.name || asset.assigned_to || 'Unassigned',
            emp_code: assignee.emp_code || assignee.emp_id || 'N/A',
            clean_tag: (asset.asset_tag && asset.asset_tag.length < 20) ? asset.asset_tag : generateCategoryPrefix(asset.category, asset.id)
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

  const openAssetViewModal = (asset: any) => {
    const stableTag = asset.clean_tag || generateCategoryPrefix(asset.category, asset.id);

    setViewAssetModal({ ...asset, clean_tag: stableTag });
    setIsEditingAsset(false);
    
    setEditForm({
      category: asset.category || 'Laptop',
      asset_tag: stableTag,
      serial: asset.serial_number || '',
      name: asset.name || asset.asset_name || '', // 🛡️ Load from either DB column
      brand: asset.brand || '', 
      price: asset.price || '', 
      vendor: asset.vendor || '', 
      purchase_date: asset.purchase_date || '', 
      warranty_expiry: asset.warranty_expiry || '',
      condition: asset.asset_condition || 'New',
      status: asset.status || 'In Stock (Unassigned)', 
      assignee: asset.assigned_to || ''
    });
  };

  const handleSaveNewAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName || !newAssetSerial) return alert("Model Name and Serial Number are required.");
    
    setIsSaving(true);
    try {
      const cleanPrice = newAssetPrice ? parseFloat(newAssetPrice) : null;
      const resolvedStatus = newAssetAssignee ? 'Assigned' : newAssetStatus;
      const finalTag = newAssetTag || generateCategoryPrefix(newAssetCategory);

      // 🚨 DB FIX: STRICTLY INSERT INTO "name"
      const { error } = await supabase.from('assets').insert([{
        id: generateSafeUuid(),
        asset_tag: finalTag.toUpperCase(), 
        name: newAssetName, // <-- FIXED
        brand: newAssetBrand || 'Standard',
        serial_number: newAssetSerial.toUpperCase(), 
        category: newAssetCategory, 
        price: cleanPrice, 
        vendor: newAssetVendor || 'Direct', 
        purchase_date: newAssetPurchaseDate || null, 
        warranty_expiry: newAssetWarranty || null,
        asset_condition: newAssetCondition,
        status: resolvedStatus, 
        assigned_to: newAssetAssignee || null, 
        inspection_status: 'Logged'
      }]);

      if (error) throw error;
      alert(`Hardware ${finalTag} registered successfully!`);
      setIsAddModalOpen(false);
      setNewAssetName(''); setNewAssetBrand(''); setNewAssetSerial(''); setNewAssetPrice(''); setNewAssetAssignee('');
      fetchRegistryData();
    } catch (err: any) { alert(`Database Error: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleUpdateExistingAsset = async () => {
    setIsUpdating(true);
    try {
      const cleanPrice = editForm.price ? parseFloat(editForm.price) : null;
      let resolvedStatus = editForm.status;
      if (editForm.assignee && resolvedStatus === 'In Stock (Unassigned)') resolvedStatus = 'Assigned';
      if (!editForm.assignee && resolvedStatus === 'Assigned') resolvedStatus = 'In Stock (Unassigned)';

      // 🚨 DB FIX: STRICTLY UPDATE "name"
      const updatePayload = {
        category: editForm.category,
        serial_number: editForm.serial.toUpperCase(),
        asset_tag: editForm.asset_tag.toUpperCase(),
        name: editForm.name, // <-- FIXED
        brand: editForm.brand, 
        price: cleanPrice,
        vendor: editForm.vendor, 
        purchase_date: editForm.purchase_date || null, 
        warranty_expiry: editForm.warranty_expiry || null, 
        asset_condition: editForm.condition, 
        status: resolvedStatus,
        assigned_to: editForm.assignee || null
      };

      const { error } = await supabase.from('assets').update(updatePayload).eq('id', viewAssetModal.id);
      if (error) throw error;

      const selectedStaff = staffList.find(s => s.id === editForm.assignee) || {};
      const updatedStaffName = selectedStaff.full_name || selectedStaff.name || editForm.assignee || 'Unassigned';

      setViewAssetModal((prev: any) => ({
        ...prev, ...updatePayload, clean_tag: editForm.asset_tag.toUpperCase(), staff_name: updatedStaffName, safe_display_name: editForm.name
      }));

      setIsEditingAsset(false); fetchRegistryData(); alert("Hardware record patched successfully!");
    } catch (err: any) { alert(`Error updating: ${err.message}`); } finally { setIsUpdating(false); }
  };

  // ==========================================
  // 🟢 BULK CSV PARSER
  // ==========================================
  const parseCsvRow = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { result.push(current); current = ''; } 
      else current += char;
    }
    result.push(current);
    return result.map(s => s.trim().replace(/^"|"$/g, ''));
  };

  const downloadSampleCsvTemplate = () => {
    const headers = "Category,Brand,Model Name,Serial Number,Asset Tag,Price,Vendor,Purchase Date,Warranty Expiry,Condition\n";
    const row1 = 'Laptop,Apple,MacBook Pro M3,SN-99482,VS-LAP-15361,1899.99,Apple Direct,2025-01-10,2028-01-10,New\n';
    const row2 = '"Combo Keyboard with Mouse kit USB",Logitech,MK270 Combo,LOGI-SN882,,,45.99,Amazon Business,2025-02-15,,New\n';
    const row3 = 'Headphone,Jabra,Evolve2 65,JAB-9941,VS-HDP-88210,180.00,B&H Photo,2025-01-01,,Refurbished\n';
    const row4 = 'Mouse PAD,Logitech,Studio Series,PAD-112,,,,,,New\n';
    
    const blob = new Blob([headers + row1 + row2 + row3 + row4], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'VSS_Hardware_Bulk_Upload_Template.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const executeBulkImport = async () => {
    if (!bulkFile) return alert("Please upload a CSV file first.");
    setIsImporting(true);

    const parseDateForPostgres = (dateStr: string) => {
      if (!dateStr) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parseInt(parts[0]) > 12) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
      return null;
    };

    try {
      const text = await bulkFile.text();
      
      const cleanText = text.replace(/^\uFEFF/, '');
      const lines = cleanText.split(/\r?\n/).filter(line => line.replace(/,/g, '').trim().length > 0);
      if (lines.length < 2) throw new Error("CSV contains no actual data rows.");

      const rawHeaders = parseCsvRow(lines[0]).map(h => h.replace(/[^a-z0-9]/gi, '').toLowerCase());
      const batchPayload: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvRow(lines[i]);
        const col: Record<string, string> = {};
        rawHeaders.forEach((h, index) => { col[h] = row[index] || ''; });

        const modelName = col['modelname'] || col['model'] || col['name'] || col['assetname'] || '';
        const serialNum = col['serialnumber'] || col['serial'] || col['sn'] || '';

        if (!modelName && !serialNum) continue; 

        const cat = col['category'] || col['type'] || 'Others';
        const rawTag = col['assettag'] || col['tag'] || col['id'] || '';
        const finalAssetTag = rawTag.toUpperCase() || generateCategoryPrefix(cat);

        const rawPrice = col['price'] || col['cost'] || '';
        const numPrice = rawPrice ? parseFloat(rawPrice.replace(/[^0-9.]/g, '')) : null;

        const safePurchaseDate = parseDateForPostgres(col['purchasedate'] || col['date']);
        const safeWarrantyDate = parseDateForPostgres(col['warrantyexpiry'] || col['warranty']);

        // 🚨 DB FIX: STRICTLY INSERT INTO "name"
        batchPayload.push({
          id: generateSafeUuid(), 
          asset_tag: finalAssetTag, 
          name: modelName || 'Standard Asset', // <-- FIXED
          brand: col['brand'] || col['manufacturer'] || 'Generic',
          serial_number: (serialNum || 'UNKNOWN-SN').toUpperCase(), 
          category: cat, 
          purchase_date: safePurchaseDate, 
          warranty_expiry: safeWarrantyDate,
          price: isNaN(numPrice as number) ? null : numPrice, 
          vendor: col['vendor'] || col['supplier'] || 'Bulk Upload', 
          asset_condition: col['condition'] || col['state'] || 'New',
          status: 'In Stock (Unassigned)', 
          inspection_status: 'Logged'
        });
      }

      if (batchPayload.length === 0) {
        throw new Error(`Not valid Hardware rows discovered.`);
      }

      const { error } = await supabase.from('assets').insert(batchPayload);
      if (error) throw new Error(`DATABASE ERROR: ${error.message}`);

      alert(`🎉 Batch successful! Uploaded ${batchPayload.length} new hardware assets.`);
      setIsBulkModalOpen(false); setBulkFile(null); fetchRegistryData();
    } catch (err: any) { alert(`❌ IMPORT REJECTED:\n\n${err.message}`); } finally { setIsImporting(false); }
  };

  const getAssetViewUrl = (asset: any) => {
    const baseDomain = typeof window !== 'undefined' ? window.location.origin : 'https://virtual-staffing.vercel.app';
    const targetRef = asset.clean_tag || asset.asset_tag || asset.id;
    return `${baseDomain}/admin/assets?view=${targetRef}`;
  };

  // ==========================================
  // 🖨️ PHYSICAL STICKER PRINT MATRIX
  // ==========================================
  const handlePrintPhysicalSticker = (asset: any, cleanTag: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getAssetViewUrl(asset))}`;
    const printWindow = window.open('', '_blank', 'width=500,height=500');
    if (!printWindow) return alert("Pop-up blocked! Allow pop-ups to print hardware stickers.");

    const cat = (asset.category || '').toLowerCase();

    // Default: Standard 50mm x 50mm Square (Laptops, Cleaning Kits, Others)
    let boxCss = "width: 50mm; height: 50mm; padding: 2mm;";
    let qrCss = "width: 25mm; height: 25mm;";
    let titleCss = "font-size: 10px;";
    let snCss = "font-size: 8px;";
    let tagCss = "font-size: 13px; padding: 2px 6px;";

    if (cat.includes('mouse') && !cat.includes('pad') && !cat.includes('combo')) {
      // 🐭 Micro Belly Sticker (Small: 32x22mm)
      boxCss = "width: 32mm; height: 22mm; padding: 1mm;";
      qrCss = "width: 11mm; height: 11mm;";
      titleCss = "font-size: 6px;";
      snCss = "font-size: 5px;";
      tagCss = "font-size: 8px; padding: 1px 3px;";
    } else if (cat.includes('headphone')) {
      // 🎧 Vertical Headband Wrap (Vertical: 20x45mm)
      boxCss = "width: 20mm; height: 45mm; padding: 1.5mm; display: flex; flex-direction: column; justify-content: space-between;";
      qrCss = "width: 15mm; height: 15mm;";
      titleCss = "font-size: 7px;";
      snCss = "font-size: 6px;";
      tagCss = "font-size: 8px; padding: 2px 0; width: 100%; text-align: center;";
    } else if (cat.includes('keyboard') || cat.includes('stand') || cat.includes('combo')) {
      // ⌨️ Horizontal Strip (Horizontal: 60x20mm)
      boxCss = "width: 60mm; height: 20mm; padding: 1.5mm; display: flex; flex-direction: row; justify-content: space-between; align-items: center;";
      qrCss = "width: 16mm; height: 16mm; margin: 0 4px 0 0;";
      titleCss = "font-size: 8px; text-align: left;";
      snCss = "font-size: 6px; text-align: left;";
      tagCss = "font-size: 10px; padding: 1px 4px; margin-top: 2px;";
    }

    const printableMarkup = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sticker_${cleanTag}</title>
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; font-family: monospace; background: #fff; color: #000; }
            .label-box { ${boxCss} box-sizing: border-box; text-align: center; border: 1px dashed #bbb; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
            .header { font-weight: 900; ${titleCss} margin-bottom: 2px; text-transform: uppercase; font-family: sans-serif; }
            .qr { ${qrCss} margin: 2px auto; display: block; object-fit: contain; }
            .sn { ${snCss} color: #111; font-family: sans-serif; font-weight: 800; margin-top: 2px; }
            .tag { ${tagCss} font-weight: 900; font-family: monospace; margin-top: 3px; background: #000; color: #fff; border-radius: 3px; letter-spacing: 0.5px; }
            ${cat.includes('keyboard') || cat.includes('stand') || cat.includes('combo') ? '.label-box { flex-direction: row; text-align: left; } .info-col { display: flex; flex-direction: column; justify-content: center; flex: 1; }' : ''}
            @media print { @page { margin: 0; } body { padding: 0; } .label-box { border: none; } }
          </style>
        </head>
        <body>
          <div class="label-box">
            ${cat.includes('keyboard') || cat.includes('stand') || cat.includes('combo') ? `<img class="qr" src="${qrUrl}" onload="window.print(); window.close();" /><div class="info-col"><div class="header">VSS-Assets</div><div class="sn">S/N: ${asset.serial_number || 'FACTORY-SN'}</div><div class="tag">${cleanTag}</div></div>` : `
            <div class="header">VSS-Assets</div>
            <img class="qr" src="${qrUrl}" onload="window.print(); window.close();" />
            <div class="sn">S/N: ${asset.serial_number || 'FACTORY-SN'}</div>
            <div class="tag">${cleanTag}</div>
            `}
          </div>
        </body>
      </html>
    `;
    printWindow.document.open(); printWindow.document.write(printableMarkup); printWindow.document.close();
  };

  const getCatCount = (filterName: string) => {
    if (filterName === 'All') return assets.length;
    if (filterName === 'Accessories') {
      return assets.filter(a => ['Mouse', 'Keyboard USB', 'Combo Keyboard with Mouse kit USB', 'Wireless Keyboard kit', 'Mouse PAD', 'Stand'].includes(a.category)).length;
    }
    if (filterName === 'Other') return assets.filter(a => ['Cleaning kit', 'Others'].includes(a.category)).length;
    return assets.filter(a => a.category?.toLowerCase() === filterName.toLowerCase()).length;
  };

  const filteredAssets = assets.filter(a => {
    const q = searchQuery.toLowerCase();
    const cleanTag = (a.clean_tag || '').toLowerCase();
    const matchesSearch = !q || (
      a.id.toLowerCase().includes(q) || cleanTag.includes(q) ||
      (a.safe_display_name || '').toLowerCase().includes(q) || 
      (a.serial_number || '').toLowerCase().includes(q) ||
      (a.staff_name || '').toLowerCase().includes(q) || 
      (a.brand || '').toLowerCase().includes(q)
    );

    let matchesCat = true;
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Accessories') {
        matchesCat = ['Mouse', 'Keyboard USB', 'Combo Keyboard with Mouse kit USB', 'Wireless Keyboard kit', 'Mouse PAD', 'Stand'].includes(a.category);
      } else if (selectedCategory === 'Other') {
        matchesCat = ['Cleaning kit', 'Others'].includes(a.category);
      } else matchesCat = a.category === selectedCategory;
    }

    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans text-slate-800">
      
      {/* HEADER WITH BULK UPLOAD BUTTON */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">Hardware Registry</h1>
              <span className="px-3 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-full">{assets.length} Units</span>
            </div>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Manage full hardware lifecycle, smart QR stickers, and S/N tags</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsBulkModalOpen(true)} 
            className="flex items-center gap-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <FileSpreadsheet size={16} /> <span>Bulk Upload CSV</span>
          </button>

          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="flex items-center gap-2 px-6 py-3 bg-[#002B49] hover:bg-[#001d33] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-[#002B49]/20 cursor-pointer"
          >
            <PlusCircle size={16} /> <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* CATEGORY TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { name: 'All', icon: <Package size={14}/> },
          { name: 'Laptop', icon: <Laptop size={14}/> },
          { name: 'Accessories', icon: <Mouse size={14}/> },
          { name: 'Headphone', icon: <Headphones size={14}/> },
          { name: 'Other', icon: <SlidersHorizontal size={14}/> },
        ].map(cat => (
          <button
            key={cat.name} onClick={() => setSelectedCategory(cat.name)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer ${
              selectedCategory === cat.name ? 'bg-[#002B49] text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200/80'
            }`}
          >
            {cat.icon} <span>{cat.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-500 font-mono">{getCatCount(cat.name)}</span>
          </button>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-3 rounded-3xl border border-gray-100 shadow-2xs flex items-center">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Tag ID, Model, Brand, Serial S/N, or Holder Name..." 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* ASSET GRID */}
      {loading ? (
        <div className="w-full py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002B49]"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAssets.map(asset => (
            <div key={asset.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-black">
                    <Laptop size={18}/>
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-sm font-black text-gray-900 leading-tight truncate max-w-[170px]">{asset.safe_display_name}</h3>
                    <p className="text-[11px] font-bold text-gray-400 truncate">{asset.brand || 'Standard Brand'}</p>
                  </div>
                </div>
                <button onClick={() => openAssetViewModal(asset)} className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer">
                  <QrCode size={16} />
                </button>
              </div>

              <div className="flex items-center gap-1.5 mb-3">
                <span className={`px-2.5 py-0.5 rounded-md font-extrabold text-[9px] uppercase tracking-wider border ${getStockStatusBadge(asset.status)}`}>{asset.status || 'In Stock'}</span>
                <span className="px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider border text-emerald-600 bg-emerald-50 border-emerald-200">{asset.asset_condition || 'New'}</span>
                {asset.price && <span className="ml-auto text-xs font-black text-gray-900 font-mono">${Number(asset.price).toLocaleString()}</span>}
              </div>

              <div className="space-y-1.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100/60 text-xs">
                <div className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Tag ID:</span> <span className="font-mono font-black text-blue-600">{asset.clean_tag}</span></div>
                <div className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[9px]">Serial S/N:</span> <span className="font-mono font-black text-gray-700 truncate max-w-[140px]">{asset.serial_number || 'N/A'}</span></div>
                <div className="flex justify-between pt-1 border-t border-gray-200/60"><span className="font-bold text-gray-400 uppercase text-[9px]">Holder:</span> <span className="font-black text-gray-900 truncate max-w-[140px]">{asset.staff_name}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#002B49] flex items-center gap-2"><Upload size={16}/> Bulk Hardware Intake</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-900 cursor-pointer"><X size={18}/></button>
            </div>

            <div className="space-y-3 text-left">
              <button 
                onClick={downloadSampleCsvTemplate} 
                className="w-full py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download size={16}/> <span>1. Download Verified Sample CSV</span>
              </button>
              <p className="text-[11px] text-gray-400 font-medium leading-relaxed pl-1">
                The sample format is perfectly mapped to Postgres. You can leave the <b>Asset Tag</b> column completely blank to let VSS auto-tag your items based on their Category!
              </p>
            </div>

            <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors flex flex-col items-center justify-center gap-3">
              <FileSpreadsheet size={40} className="text-emerald-600 animate-bounce" />
              <input 
                type="file" accept=".csv" 
                onChange={e => setBulkFile(e.target.files?.[0] || null)} 
                className="text-xs font-bold text-gray-700 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#002B49] file:text-white file:cursor-pointer w-full" 
              />
            </div>

            <button 
              onClick={executeBulkImport} 
              disabled={isImporting || !bulkFile} 
              className={`w-full py-4 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg ${bulkFile ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              {isImporting ? 'Parsing Postgres Rows...' : '2. Execute Batch Registration'}
            </button>
          </div>
        </div>
      )}

      {/* REGISTER MANUAL ASSET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xs font-black uppercase text-[#002B49] tracking-widest flex items-center gap-2"><Laptop size={16}/> Hardware Asset Intake</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={18}/></button>
            </div>

            <form onSubmit={handleSaveNewAsset} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-100 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-800 block">1. Identity & Classification</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Asset Category</label>
                    <select 
                      value={newAssetCategory} 
                      onChange={e => {
                        const cat = e.target.value;
                        setNewAssetCategory(cat);
                        setNewAssetTag(generateCategoryPrefix(cat));
                      }} 
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-600 uppercase block mb-1">Auto Tag Prefix</label>
                    <input type="text" value={newAssetTag} onChange={e => setNewAssetTag(e.target.value)} className="w-full p-2.5 bg-white border border-blue-300 rounded-xl text-xs font-mono font-black text-blue-900 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Brand</label><input type="text" placeholder="Dell, Sony" value={newAssetBrand} onChange={e => setNewAssetBrand(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                  <div className="sm:col-span-2"><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Model Name *</label><input type="text" required placeholder="MacBook Pro M3" value={newAssetName} onChange={e => setNewAssetName(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                </div>

                <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Factory Serial Number (S/N) *</label><input type="text" required placeholder="Scan S/N barcode..." value={newAssetSerial} onChange={e => setNewAssetSerial(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-xs font-mono font-bold outline-none uppercase" /></div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 block">2. Financials</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Price ($ USD)</label><input type="number" step="0.01" placeholder="280.00" value={newAssetPrice} onChange={e => setNewAssetPrice(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs font-mono font-bold outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Vendor</label><input type="text" placeholder="Amazon" value={newAssetVendor} onChange={e => setNewAssetVendor(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full py-4 bg-[#002B49] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer">Confirm Registration</button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW & EDIT MODAL (Screenshot EXACT Match) */}
      {viewAssetModal && (() => {
        const liveModalTag = editForm.asset_tag || viewAssetModal.clean_tag;
        
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-gray-200">
              
              {/* Left Column: QR Matrix */}
              <div className="w-full md:w-1/3 bg-gradient-to-b from-blue-50/80 to-white p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-gray-100 relative shrink-0">
                <button onClick={() => setViewAssetModal(null)} className="absolute md:hidden top-4 right-4 text-gray-400 bg-gray-100 p-1.5 rounded-full"><X size={14}/></button>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#002B49] mb-6">Sticker Matrix</h3>
                
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-100 mb-4">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getAssetViewUrl(viewAssetModal))}`} alt="QR Code" className="w-36 h-36 object-contain" />
                </div>

                <div className="mb-1 w-full bg-[#002B49] text-white rounded-xl py-3 text-center truncate">
                  <span className="text-lg font-mono font-black tracking-widest">{liveModalTag}</span>
                </div>
                
                <p className="text-[10px] font-bold font-mono text-gray-500 mb-8 mt-2">S/N: {editForm.serial || viewAssetModal.serial_number}</p>

                <div className="flex w-full gap-2 mt-auto">
                  <button onClick={() => handlePrintPhysicalSticker(viewAssetModal, liveModalTag)} className="flex-1 py-3.5 bg-[#002B49] hover:bg-[#001d33] text-white rounded-xl text-xs font-black uppercase tracking-wider flex justify-center items-center gap-2 shadow-md cursor-pointer">
                    <Printer size={15} /> Print Physical Sticker
                  </button>
                </div>
              </div>

              {/* Right Column: Editor Workspace */}
              <div className="w-full md:w-2/3 flex flex-col overflow-y-auto custom-scrollbar relative">
                <button onClick={() => setViewAssetModal(null)} className="hidden md:flex absolute top-5 right-5 text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full cursor-pointer z-10"><X size={16}/></button>

                <div className="p-8 space-y-6">
                  
                  <div className="flex items-center pb-4 border-b border-gray-100 gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Logistics State:</span>
                    <span className={`px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider border ${getStockStatusBadge(viewAssetModal.status)}`}>{viewAssetModal.status || 'In Stock'}</span>

                    {!isEditingAsset && (
                      <button onClick={() => setIsEditingAsset(true)} className="px-4 py-2 bg-[#002B49] text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer ml-auto">
                        <Edit2 size={13} /> Edit Record
                      </button>
                    )}
                  </div>

                  {isEditingAsset ? (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      
                      <div className="flex justify-between items-center pb-2 border-b border-blue-100">
                        <span className="text-sm font-black uppercase tracking-wider text-blue-900">Editing Hardware Record</span>
                        <span className="text-xs font-mono font-bold text-blue-600">{liveModalTag}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Asset Category *</label>
                          <select 
                            value={editForm.category} 
                            onChange={e => {
                              const newCat = e.target.value;
                              const newPrefixTag = generateCategoryPrefix(newCat);
                              setEditForm({ ...editForm, category: newCat, asset_tag: newPrefixTag });
                            }}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none cursor-pointer"
                          >
                            {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-blue-700 uppercase flex justify-between mb-1">
                            <span>Asset Tag ID</span>
                            <button type="button" onClick={() => setEditForm({...editForm, asset_tag: generateCategoryPrefix(editForm.category)})} className="text-[9px] lowercase text-blue-500 hover:underline cursor-pointer">(generate)</button>
                          </label>
                          <input type="text" value={editForm.asset_tag} onChange={e => setEditForm({...editForm, asset_tag: e.target.value})} className="w-full p-2.5 bg-white border border-blue-300 rounded-xl text-xs font-mono font-black text-blue-900 outline-none uppercase" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Factory Serial Number (S/N) *</label>
                        <input type="text" required value={editForm.serial} onChange={e => setEditForm({...editForm, serial: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none uppercase" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Brand</label><input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full p-2.5 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                        <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Model Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2.5 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Price ($ USD)</label><input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full p-2.5 bg-white border rounded-xl text-xs font-mono font-bold outline-none" /></div>
                        <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Vendor</label><input type="text" value={editForm.vendor} onChange={e => setEditForm({...editForm, vendor: e.target.value})} className="w-full p-2.5 bg-white border rounded-xl text-xs font-bold outline-none" /></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                        <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Condition</label><select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})} className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none"><option value="New">✨ New</option><option value="Refurbished">🔄 Refurbished</option><option value="Repaired">🛠️ Repaired</option></select></div>
                        <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Stock Status</label><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full p-2.5 border rounded-xl text-xs font-black outline-none"><option value="In Stock (Unassigned)">📦 In Stock (Unassigned)</option><option value="Assigned">👤 Assigned</option><option value="Demo Use">🧪 Demo Use</option><option value="In Repair">⚠️ In Repair</option><option value="Discard">🗑️ Discarded</option></select></div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Re-Assign to Staff</label>
                        <select value={editForm.assignee} onChange={e => setEditForm({...editForm, assignee: e.target.value})} className="w-full p-3 bg-white border rounded-xl text-xs font-bold outline-none">
                          <option value="">-- Warehouse Inventory (Unassigned) --</option>
                          {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.full_name || staff.name} ({staff.emp_code || staff.email})</option>)}
                        </select>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsEditingAsset(false)} className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase cursor-pointer">Cancel</button>
                        <button type="button" onClick={handleUpdateExistingAsset} disabled={isUpdating} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg cursor-pointer">
                          {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save Updates
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-gray-50 p-3.5 rounded-2xl border"><p className="text-[9px] font-black text-gray-400 uppercase">Category</p><p className="text-xs font-black text-blue-600 mt-0.5">{viewAssetModal.category || 'Laptop'}</p></div>
                        <div className="bg-gray-50 p-3.5 rounded-2xl border sm:col-span-2"><p className="text-[9px] font-black text-gray-400 uppercase">Serial Number (S/N)</p><p className="text-xs font-mono font-black text-gray-900 mt-0.5">{viewAssetModal.serial_number || 'N/A'}</p></div>
                        <div className="bg-gray-50 p-3.5 rounded-2xl border"><p className="text-[9px] font-black text-gray-400 uppercase">Brand</p><p className="text-xs font-black text-gray-900 mt-0.5">{viewAssetModal.brand || 'N/A'}</p></div>
                        <div className="bg-gray-50 p-3.5 rounded-2xl border sm:col-span-2"><p className="text-[9px] font-black text-gray-400 uppercase">Model Name</p><p className="text-xs font-black text-gray-900 mt-0.5">{viewAssetModal.safe_display_name}</p></div>
                      </div>

                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">Assigned Employee Holder:</span>
                          <div className="flex items-center gap-2">
                            <User size={15} className="text-blue-600"/>
                            <span className="text-sm font-black text-gray-900">{viewAssetModal.staff_name}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-blue-900">{liveModalTag}</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}