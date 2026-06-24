'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Laptop, PlusCircle, Search, QrCode, 
  User, X, Save, RefreshCw, Download, Printer, Edit2, 
  Upload, FileSpreadsheet, Package, Mouse, 
  Headphones, SlidersHorizontal, ChevronDown, CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';

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

// ==========================================
// SEARCHABLE STAFF DROPDOWN COMPONENT
// ==========================================
const SearchableStaffDropdown = ({ value, onChange, staffList, placeholder = "Search name or emp code..." }: any) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const s = staffList.find((st: any) => st.id === value);
      if (s) setQuery(`${s.full_name || s.name} (${s.emp_code || s.email})`);
    } else {
      setQuery('');
    }
  }, [value, staffList]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = staffList.filter((s: any) => {
    const str = `${s.full_name || s.name} ${s.emp_code || s.email}`.toLowerCase();
    return str.includes(query.toLowerCase());
  });

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex items-center w-full p-3 bg-white border border-slate-200 rounded-xl focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
        <Search size={14} className="text-slate-400 mr-2 shrink-0" />
        <input 
          type="text" 
          value={open ? query : query || ''} 
          onChange={e => { setQuery(e.target.value); setOpen(true); onChange(''); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full text-xs font-bold text-slate-900 outline-none bg-transparent"
        />
        <ChevronDown size={14} className="text-slate-400 ml-2 shrink-0 cursor-pointer" onClick={() => setOpen(!open)} />
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar overflow-hidden">
          <div className="p-3 bg-slate-50 hover:bg-slate-100 text-[11px] font-black tracking-widest uppercase cursor-pointer text-slate-500 border-b border-slate-100" onClick={() => { onChange(''); setQuery(''); setOpen(false); }}>
            -- Warehouse Inventory (Unassigned) --
          </div>
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 font-bold">No staff found matching query.</div>
          ) : (
            filtered.map((s: any) => (
              <div 
                key={s.id} className="p-3.5 hover:bg-blue-50 text-xs cursor-pointer border-b border-slate-50 flex justify-between items-center transition-colors group"
                onClick={() => { onChange(s.id); setQuery(`${s.full_name || s.name} (${s.emp_code || s.email})`); setOpen(false); }}
              >
                <span className="font-bold text-slate-900 group-hover:text-blue-700">{s.full_name || s.name}</span>
                <span className="text-slate-400 font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  {s.emp_code || s.email}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

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

  const generateCategoryPrefix = (category: string, existingUuid?: string) => {
    let prefix = 'VS-OTH';
    const cat = (category || '').toLowerCase();
    
    if (cat.includes('laptop')) prefix = 'VS-LAP';
    else if (cat.includes('mouse pad') || cat === 'mouse pad') prefix = 'VS-PAD';
    else if (cat.includes('mouse')) prefix = 'VSS-MOU'; 
    else if (cat.includes('combo') || cat.includes('keyboard')) prefix = 'VS-KBD';
    else if (cat.includes('headphone')) prefix = 'VS-HDP';
    else if (cat.includes('cleaning')) prefix = 'VS-CLN';
    else if (cat.includes('stand')) prefix = 'VS-STN';

    if (existingUuid && existingUuid.length > 20) {
      const numsOnly = existingUuid.replace(/[^0-9]/g, '');
      const stableDigits = numsOnly.length >= 4 ? numsOnly.slice(-4) : '4082';
      return `${prefix}-${stableDigits}`;
    }

    const fourRandomDigits = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${fourRandomDigits}`;
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
      const [assetRes, staffRes, inspectionRes] = await Promise.all([
        supabase.from('assets').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('inspections').select('asset_id, status, created_at').order('created_at', { ascending: false })
      ]);

      const assetData = assetRes.data;
      const staffData = staffRes.data;
      const inspectionData = inspectionRes.data || [];

      if (staffData) setStaffList(staffData);
      
      if (assetData) {
        const compiledAssets = assetData.map(asset => {
          const assignee = (staffData || []).find(s => s.id === asset.assigned_to || s.email === asset.assigned_to) || {};
          const latestInspection = inspectionData.find(i => i.asset_id === asset.id);

          return {
            ...asset,
            safe_display_name: asset.name || asset.asset_name || 'Unnamed Asset',
            staff_name: assignee.full_name || assignee.name || asset.assigned_to || 'Unassigned',
            emp_code: assignee.emp_code || assignee.emp_id || 'N/A',
            clean_tag: (asset.asset_tag && asset.asset_tag.length < 20) ? asset.asset_tag : generateCategoryPrefix(asset.category, asset.id),
            
            // Inject real-time inspection data defaulting to 'Approved' for manual legacy items
            live_inspection_status: latestInspection?.status || asset.inspection_status || 'Approved',
            live_inspection_date: latestInspection?.created_at || asset.last_inspection_date || null
          };
        });
        setAssets(compiledAssets);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getStockStatusBadge = (status: string) => {
    const s = status || 'In Stock (Unassigned)';
    if (s.includes('Assigned')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes('Repair')) return 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse';
    if (s.includes('Demo')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (s.includes('Discard')) return 'bg-rose-100 text-rose-700 border-rose-200 line-through';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  // 🎨 Semantic Color Palette strictly for your 4 requested states
  const getInspectionStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'approved') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s === 're-inspection') return 'text-amber-700 bg-amber-50 border-amber-200';
    if (s === 'not approved') return 'text-orange-700 bg-orange-50 border-orange-200';
    if (s === 'rejected') return 'text-rose-700 bg-rose-50 border-rose-200 font-black';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const openAssetViewModal = (asset: any) => {
    const stableTag = asset.clean_tag || generateCategoryPrefix(asset.category, asset.id);

    setViewAssetModal({ ...asset, clean_tag: stableTag });
    setIsEditingAsset(false);
    
    setEditForm({
      category: asset.category || 'Laptop',
      asset_tag: stableTag,
      serial: asset.serial_number || '',
      name: asset.safe_display_name, 
      brand: asset.brand || '', 
      price: asset.price || '', 
      vendor: asset.vendor || '', 
      purchase_date: asset.purchase_date || '', 
      warranty_expiry: asset.warranty_expiry || '',
      condition: asset.asset_condition || 'New',
      status: asset.status || 'In Stock (Unassigned)', 
      inspection_status: asset.live_inspection_status || 'Approved',
      assignee: asset.assigned_to || ''
    });
  };

  const handleSaveNewAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName || !newAssetSerial) return alert("Assets Name and Serial Number are required.");
    
    setIsSaving(true);
    try {
      const cleanPrice = newAssetPrice ? parseFloat(newAssetPrice) : null;
      const resolvedStatus = newAssetAssignee ? 'Assigned' : newAssetStatus;
      const finalTag = newAssetTag || generateCategoryPrefix(newAssetCategory);

      const { error } = await supabase.from('assets').insert([{
        id: generateSafeUuid(),
        asset_tag: finalTag.toUpperCase(), 
        name: newAssetName, 
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
        inspection_status: 'Approved' // <-- New manual entries start automatically Approved
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

      const updatePayload = {
        category: editForm.category,
        serial_number: editForm.serial.toUpperCase(),
        asset_tag: editForm.asset_tag.toUpperCase(),
        name: editForm.name, 
        brand: editForm.brand, 
        price: cleanPrice,
        vendor: editForm.vendor, 
        purchase_date: editForm.purchase_date || null, 
        warranty_expiry: editForm.warranty_expiry || null, 
        asset_condition: editForm.condition, 
        status: resolvedStatus,
        inspection_status: editForm.inspection_status || 'Approved',
        assigned_to: editForm.assignee || null
      };

      const { error } = await supabase.from('assets').update(updatePayload).eq('id', viewAssetModal.id);
      if (error) throw error;

      const selectedStaff = staffList.find(s => s.id === editForm.assignee) || {};
      const updatedStaffName = selectedStaff.full_name || selectedStaff.name || editForm.assignee || 'Unassigned';
      const updatedEmpCode = selectedStaff.emp_code || selectedStaff.emp_id || 'N/A';

      setViewAssetModal((prev: any) => ({
        ...prev, 
        ...updatePayload, 
        clean_tag: editForm.asset_tag.toUpperCase(), 
        staff_name: updatedStaffName, 
        emp_code: updatedEmpCode,
        safe_display_name: editForm.name,
        live_inspection_status: editForm.inspection_status
      }));

      setIsEditingAsset(false); fetchRegistryData(); alert("Hardware record patched successfully!");
    } catch (err: any) { alert(`Error updating: ${err.message}`); } finally { setIsUpdating(false); }
  };

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
    const headers = "Category,Brand,Assets Name,Serial Number,Asset Tag,Price,Vendor,Purchase Date,Warranty Expiry,Condition\n";
    const row1 = 'Laptop,Apple,MacBook Pro M3,SN-99482,VS-LAP-1536,189999.00,Apple Direct,2025-01-10,2028-01-10,New\n';
    const row2 = 'Mouse,Logitech,MX Master 3S,LOGI-SN882,VSS-MOU-8820,8499.00,Amazon Business,2025-02-15,,New\n';
    const row3 = 'Headphone,Jabra,Evolve2 65,JAB-9941,VS-HDP-8821,18500.00,B&H Photo,2025-01-01,,Refurbished\n';
    
    const blob = new Blob([headers + row1 + row2 + row3], { type: 'text/csv;charset=utf-8;' });
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
        if (parseInt(parts[0]) > 12) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
      return null;
    };

    try {
      const text = await bulkFile.text();
      const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
      
      if (lines.length < 2) throw new Error("CSV contains no actual data rows.");

      const rawHeaders = parseCsvRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const batchPayload: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvRow(lines[i]);
        const col: Record<string, string> = {};
        rawHeaders.forEach((h, index) => { col[h] = row[index] || ''; });

        const modelName = col['modelname'] || col['model'] || col['name'] || col['assetname'] || col['assetsname'] || '';
        const serialNum = col['serialnumber'] || col['serial'] || col['sn'] || '';
        const cat = col['category'] || 'Others';

        if (!modelName && !serialNum) continue;

        const rawTag = col['assettag'] || col['tag'] || '';
        const finalAssetTag = rawTag.toUpperCase() || generateCategoryPrefix(cat);

        const rawPrice = col['price'] || col['cost'] || '';
        const numPrice = rawPrice ? parseFloat(rawPrice.replace(/[^0-9.]/g, '')) : null;

        batchPayload.push({
          id: generateSafeUuid(),
          asset_tag: finalAssetTag,
          name: modelName,
          brand: col['brand'] || 'Generic',
          serial_number: serialNum.toUpperCase(),
          category: cat,
          price: isNaN(numPrice as number) ? null : numPrice,
          vendor: col['vendor'] || col['supplier'] || 'Bulk Upload',
          purchase_date: parseDateForPostgres(col['purchasedate'] || col['date']),
          warranty_expiry: parseDateForPostgres(col['warrantyexpiry'] || col['warranty']),
          asset_condition: col['condition'] || 'New',
          status: 'In Stock (Unassigned)',
          inspection_status: 'Approved' // <-- Bulk items default to Approved
        });
      }

      if (batchPayload.length === 0) throw new Error("No hardware data rows found after the header.");

      const { error } = await supabase.from('assets').insert(batchPayload);
      if (error) throw new Error(error.message);

      alert(`Success! Imported ${batchPayload.length} assets.`);
      setIsBulkModalOpen(false); setBulkFile(null);
      fetchRegistryData();
    } catch (err: any) { alert(`❌ IMPORT REJECTED:\n\n${err.message}`); } 
    finally { setIsImporting(false); }
  };

  const getAssetViewUrl = (asset: any) => {
    const baseDomain = typeof window !== 'undefined' ? window.location.origin : 'https://virtual-staffing.vercel.app';
    const targetRef = asset.clean_tag || asset.asset_tag || asset.id;
    return `${baseDomain}/admin/assets?view=${targetRef}`;
  };

  const handlePrintPhysicalSticker = (asset: any, cleanTag: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getAssetViewUrl(asset))}`;
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    if (!printWindow) return alert("Pop-up blocked! Allow pop-ups to print hardware stickers.");

    const cat = (asset.category || '').toLowerCase();
    let markupContent = '';

    if (cat.includes('mouse') && !cat.includes('pad') && !cat.includes('combo')) {
      markupContent = `
        <div style="width: 32mm; height: 22mm; box-sizing: border-box; padding: 1mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: 700; letter-spacing: 0.2px; margin-bottom: 1px;">VSS</div>
          <img src="${qrUrl}" style="width: 11mm; height: 11mm; display: block;" />
          <div style="font-size: 8pt; font-weight: 600; margin-top: 2px;">${cleanTag}</div>
          <div style="font-size: 5.5pt; color: #222; font-weight: 400;">S/N: ${asset.serial_number || 'N/A'}</div>
        </div>
      `;
    } else if (cat.includes('headphone')) {
      markupContent = `
        <div style="width: 20mm; height: 45mm; box-sizing: border-box; padding: 2mm 1mm; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
          <div style="font-size: 8pt; font-weight: 700;">VSS</div>
          <img src="${qrUrl}" style="width: 14mm; height: 14mm; display: block;" />
          <div>
            <div style="font-size: 7.5pt; font-weight: 600;">${cleanTag}</div>
            <div style="font-size: 5.5pt; color: #333; margin-top: 2px; word-break: break-all;">S/N: ${asset.serial_number || 'N/A'}</div>
          </div>
        </div>
      `;
    } else if (cat.includes('keyboard') || cat.includes('stand') || cat.includes('combo')) {
      markupContent = `
        <div style="width: 60mm; height: 20mm; box-sizing: border-box; padding: 2mm; display: flex; flex-direction: row; justify-content: space-between; align-items: center;">
          <img src="${qrUrl}" style="width: 16mm; height: 16mm; display: block;" />
          <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding-left: 3mm; flex-grow: 1; overflow: hidden;">
            <div style="font-size: 7pt; font-weight: 700; color: #555;">VSS ASSETS</div>
            <div style="font-size: 9.5pt; font-weight: 600; color: #000; margin: 1px 0;">${cleanTag}</div>
            <div style="font-size: 6.5pt; color: #222;">S/N: ${asset.serial_number || 'N/A'}</div>
          </div>
        </div>
      `;
    } else {
      markupContent = `
        <div style="width: 50mm; height: 50mm; box-sizing: border-box; padding: 3mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
          <div style="font-size: 11pt; font-weight: 700; margin-bottom: 2px;">VSS ASSETS</div>
          <img src="${qrUrl}" style="width: 26mm; height: 26mm; display: block; margin: 2px 0;" />
          <div style="font-size: 10pt; font-weight: 600; margin-top: 3px;">${cleanTag}</div>
          <div style="font-size: 7pt; color: #333; margin-top: 2px;">S/N: ${asset.serial_number || 'N/A'}</div>
        </div>
      `;
    }

    const printableDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print_${cleanTag}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; font-family: 'Inter', sans-serif; background: #fff; color: #000; }
            @media print { @page { margin: 0mm; size: auto; } body { padding: 0; background: #fff; } }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 300)">
          ${markupContent}
        </body>
      </html>
    `;

    printWindow.document.open(); 
    printWindow.document.write(printableDocument); 
    printWindow.document.close();
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
      (a.emp_code || '').toLowerCase().includes(q) || 
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
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 font-sans text-slate-900 bg-slate-50/50 min-h-screen">
      
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 cursor-pointer transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Hardware Registry</h1>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-full">{assets.length} Units</span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">Manage full hardware lifecycle, smart QR stickers, and S/N tags</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm">
            <FileSpreadsheet size={16} /> <span>Bulk Upload</span>
          </button>

          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-blue-600/20 cursor-pointer transition-all">
            <PlusCircle size={16} /> <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {[
            { name: 'All', icon: <Package size={14}/> },
            { name: 'Laptop', icon: <Laptop size={14}/> },
            { name: 'Accessories', icon: <Mouse size={14}/> },
            { name: 'Headphone', icon: <Headphones size={14}/> },
            { name: 'Other', icon: <SlidersHorizontal size={14}/> },
          ].map(cat => (
            <button
              key={cat.name} onClick={() => setSelectedCategory(cat.name)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shrink-0 cursor-pointer transition-all ${
                selectedCategory === cat.name ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.icon} <span>{cat.name}</span>
              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${selectedCategory === cat.name ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>{getCatCount(cat.name)}</span>
            </button>
          ))}
        </div>

        <div className="bg-white p-2.5 rounded-3xl border border-slate-200 shadow-sm flex items-center">
          <div className="relative w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Tag ID, Assets Name, S/N, Holder Name, or EMP Code..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* ASSET GRID */}
      {loading ? (
        <div className="w-full py-32 flex flex-col items-center justify-center gap-4 text-slate-400">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
          <span className="text-[11px] font-black tracking-widest uppercase">Loading Database</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAssets.map(asset => (
            <div key={asset.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md hover:border-blue-300 transition-all overflow-hidden">
              
              <div className="p-6 border-b border-slate-50">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Laptop size={20}/>
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-black text-slate-900 leading-tight truncate max-w-[170px]" title={asset.safe_display_name}>{asset.safe_display_name}</h3>
                      <p className="text-[11px] font-bold text-slate-500 truncate">{asset.brand || 'Standard Brand'}</p>
                    </div>
                  </div>
                  <button onClick={() => openAssetViewModal(asset)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-slate-100">
                    <QrCode size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md font-black text-[9px] uppercase tracking-widest border ${getStockStatusBadge(asset.status)}`}>{asset.status || 'In Stock'}</span>
                  <span className="px-2.5 py-1 rounded-md font-black text-[9px] uppercase tracking-widest border text-slate-600 bg-slate-50 border-slate-200">{asset.asset_condition || 'New'}</span>
                  {asset.price && <span className="ml-auto text-xs font-black text-slate-900 font-mono">₹{Number(asset.price).toLocaleString('en-IN')}</span>}
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 space-y-3 flex-1">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                  <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest">Tag ID</span> 
                  <span className="font-mono font-black text-blue-600 text-xs">{asset.clean_tag}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                  <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest">Serial S/N</span> 
                  <span className="font-mono font-black text-slate-700 text-[11px] truncate max-w-[140px]" title={asset.serial_number}>{asset.serial_number || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-xs group-hover:border-blue-100 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest">Holder</span> 
                    <span className="font-black text-slate-900 text-[11px] truncate max-w-[120px]" title={asset.staff_name}>{asset.staff_name}</span>
                  </div>
                  <span className="font-mono font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg text-[9px]">{asset.emp_code}</span>
                </div>
              </div>

              {/* 🚨 LIVE INSPECTION FOOTER */}
              <div className="p-4 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Last Audited</span>
                    <span className="text-[10px] font-mono font-bold text-slate-700">{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-IN') : 'No Log'}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${getInspectionStatusColor(asset.live_inspection_status)}`}>
                  {(() => {
                    const st = (asset.live_inspection_status || '').toLowerCase().trim();
                    if (st === 'approved') return <CheckCircle2 size={12} className="text-emerald-600" />;
                    if (st === 're-inspection') return <RefreshCw size={12} className="text-amber-600 animate-spin" />;
                    return <AlertTriangle size={12} className="text-rose-600" />;
                  })()}
                  <span className="text-[9px] font-black uppercase tracking-widest">{asset.live_inspection_status || 'Approved'}</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><Upload size={18}/> Bulk Hardware Intake</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer bg-slate-100 p-2 rounded-full"><X size={16}/></button>
            </div>

            <div className="space-y-4 text-left">
              <button 
                onClick={downloadSampleCsvTemplate} 
                className="w-full py-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download size={16}/> <span>1. Download Verified Sample CSV</span>
              </button>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-1">
                The sample format is perfectly mapped to Postgres. You can leave the <b className="text-slate-800 font-black">Asset Tag</b> column completely blank to let VSS auto-tag your items based on their Category!
              </p>
            </div>

            <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center gap-4">
              <FileSpreadsheet size={48} className="text-emerald-600 animate-bounce" />
              <input 
                type="file" accept=".csv" 
                onChange={e => setBulkFile(e.target.files?.[0] || null)} 
                className="text-xs font-bold text-slate-700 file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-900 file:text-white file:cursor-pointer w-full file:transition-colors file:hover:bg-slate-800" 
              />
            </div>

            <button 
              onClick={executeBulkImport} 
              disabled={isImporting || !bulkFile} 
              className={`w-full py-4.5 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all ${bulkFile ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-emerald-600/20' : 'bg-slate-300 cursor-not-allowed'}`}
            >
              {isImporting ? 'Parsing Postgres Rows...' : '2. Execute Batch Registration'}
            </button>
          </div>
        </div>
      )}

      {/* REGISTER MANUAL ASSET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest flex items-center gap-2"><Laptop size={18}/> Hardware Asset Intake</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white p-2 rounded-full shadow-sm"><X size={16}/></button>
            </div>

            <form onSubmit={handleSaveNewAsset} className="p-6 md:p-8 overflow-y-auto space-y-8 custom-scrollbar">
              
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">1</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Identity & Classification</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Asset Category</label>
                    <select 
                      value={newAssetCategory} 
                      onChange={e => {
                        const cat = e.target.value;
                        setNewAssetCategory(cat);
                        setNewAssetTag(generateCategoryPrefix(cat));
                      }} 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer transition-all"
                    >
                      {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-600 uppercase block mb-1.5">Auto Tag Prefix</label>
                    <input type="text" value={newAssetTag} onChange={e => setNewAssetTag(e.target.value)} className="w-full p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-mono font-black text-blue-900 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Brand</label><input type="text" placeholder="Dell, Sony" value={newAssetBrand} onChange={e => setNewAssetBrand(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" /></div>
                  <div className="sm:col-span-2"><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Assets Name *</label><input type="text" required placeholder="MacBook Pro M3" value={newAssetName} onChange={e => setNewAssetName(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" /></div>
                </div>

                <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Factory Serial Number (S/N) *</label><input type="text" required placeholder="Scan S/N barcode..." value={newAssetSerial} onChange={e => setNewAssetSerial(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-mono font-black text-slate-900 outline-none uppercase transition-all" /></div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">2</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Financial Data</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Price (₹ INR)</label><input type="number" step="0.01" placeholder="280.00" value={newAssetPrice} onChange={e => setNewAssetPrice(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none transition-all" /></div>
                  <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Vendor</label><input type="text" placeholder="Amazon" value={newAssetVendor} onChange={e => setNewAssetVendor(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" /></div>
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full py-4.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 cursor-pointer transition-all">Confirm Registration</button>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 VIEW & EDIT MODAL */}
      {viewAssetModal && (() => {
        const liveModalTag = editForm.asset_tag || viewAssetModal.clean_tag;
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-slate-200">
              
              {/* Left Column: QR Matrix */}
              <div className="w-full md:w-1/3 bg-slate-50 p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-200 relative shrink-0">
                <button onClick={() => setViewAssetModal(null)} className="absolute md:hidden top-4 right-4 text-slate-400 bg-white p-2 rounded-full shadow-sm"><X size={14}/></button>
                
                <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 mb-8">VSS</h3>
                
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-6">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getAssetViewUrl(viewAssetModal))}`} alt="QR Code" className="w-40 h-40 object-contain" />
                </div>

                <div className="mb-2 w-full bg-slate-900 text-white rounded-xl py-3.5 text-center truncate shadow-md">
                  <span className="text-lg font-mono font-black tracking-widest">{liveModalTag}</span>
                </div>
                
                <p className="text-[11px] font-black font-mono text-slate-500 mb-8 mt-1 text-center w-full truncate px-2" title={editForm.serial || viewAssetModal.serial_number}>
                  S/N: {editForm.serial || viewAssetModal.serial_number}
                </p>

                <div className="flex w-full gap-2 mt-auto">
                  <button onClick={() => handlePrintPhysicalSticker(viewAssetModal, liveModalTag)} className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-[11px] font-black uppercase tracking-widest flex justify-center items-center gap-2 transition-colors cursor-pointer">
                    <Printer size={16} /> Print Sticker
                  </button>
                </div>
              </div>

              {/* Right Column: Editor Workspace */}
              <div className="w-full md:w-2/3 flex flex-col overflow-y-auto custom-scrollbar relative bg-white">
                <button onClick={() => setViewAssetModal(null)} className="hidden md:flex absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-100 p-2.5 rounded-full cursor-pointer z-10 transition-colors"><X size={18}/></button>

                <div className="p-8 md:p-10 space-y-8">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logistics State:</span>
                      <span className={`px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider border ${getStockStatusBadge(viewAssetModal.status)}`}>{viewAssetModal.status || 'In Stock'}</span>
                    </div>

                    {!isEditingAsset && (
                      <button onClick={() => setIsEditingAsset(true)} className="px-5 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer transition-colors sm:ml-auto">
                        <Edit2 size={14} /> Edit Record
                      </button>
                    )}
                  </div>

                  {isEditingAsset ? (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      
                      <div className="flex justify-between items-center pb-3 border-b border-blue-100">
                        <span className="text-sm font-black uppercase tracking-widest text-blue-900">Editing Hardware Record</span>
                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{liveModalTag}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 bg-blue-50/30 rounded-2xl border border-blue-100">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Asset Category *</label>
                          <select 
                            value={editForm.category} 
                            onChange={e => {
                              const newCat = e.target.value;
                              const newPrefixTag = generateCategoryPrefix(newCat);
                              setEditForm({ ...editForm, category: newCat, asset_tag: newPrefixTag });
                            }}
                            className="w-full p-3.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer shadow-xs transition-colors"
                          >
                            {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-blue-700 uppercase flex justify-between mb-1.5">
                            <span>Asset Tag ID</span>
                            <button type="button" onClick={() => setEditForm({...editForm, asset_tag: generateCategoryPrefix(editForm.category)})} className="text-[9px] lowercase text-blue-500 hover:underline cursor-pointer">(auto-generate)</button>
                          </label>
                          <input type="text" value={editForm.asset_tag} onChange={e => setEditForm({...editForm, asset_tag: e.target.value})} className="w-full p-3.5 bg-white border border-blue-300 focus:border-blue-500 rounded-xl text-xs font-mono font-black text-blue-900 outline-none uppercase shadow-xs transition-colors" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Factory Serial Number (S/N) *</label>
                        <input type="text" required value={editForm.serial} onChange={e => setEditForm({...editForm, serial: e.target.value})} placeholder="Scan factory S/N barcode..." className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-mono font-black text-slate-900 outline-none uppercase transition-all" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Brand</label><input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" /></div>
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Assets Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" /></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Price (₹)</label><input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none transition-all" /></div>
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Purchase Date</label><input type="date" value={editForm.purchase_date} onChange={e => setEditForm({...editForm, purchase_date: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" /></div>
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Warranty Expiry</label><input type="date" value={editForm.warranty_expiry} onChange={e => setEditForm({...editForm, warranty_expiry: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all" /></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Condition</label><select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})} className="w-full p-3.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all"><option value="New">✨ New</option><option value="Refurbished">🔄 Refurbished</option><option value="Repaired">🛠️ Repaired</option></select></div>
                        <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Stock Status</label><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full p-3.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-black text-slate-900 outline-none transition-all"><option value="In Stock (Unassigned)">📦 In Stock</option><option value="Assigned">👤 Assigned</option><option value="Demo Use">🧪 Demo</option><option value="In Repair">⚠️ Repair</option><option value="Discard">🗑️ Discard</option></select></div>
                        
                        {/* 🚨 UPDATED STRICT 4-PARAMETER UNIVERSE */}
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Inspection State</label>
                          <select value={editForm.inspection_status} onChange={e => setEditForm({...editForm, inspection_status: e.target.value})} className="w-full p-3.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all">
                            <option value="Approved">✅ Approved</option>
                            <option value="Re-Inspection">🔄 Re-Inspection</option>
                            <option value="Not Approved">⚠️ Not Approved</option>
                            <option value="Rejected">❌ Rejected</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Re-Assign Holder</label>
                        <SearchableStaffDropdown value={editForm.assignee} onChange={(val: string) => setEditForm({...editForm, assignee: val})} staffList={staffList} />
                      </div>

                      <div className="flex gap-4 pt-6">
                        <button type="button" onClick={() => setIsEditingAsset(false)} className="px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-colors">Cancel</button>
                        <button type="button" onClick={handleUpdateExistingAsset} disabled={isUpdating} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-all">
                          {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save Secure Record
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</p><p className="text-sm font-black text-blue-600 mt-1">{viewAssetModal.category || 'Laptop'}</p></div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 sm:col-span-2"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Serial Number (S/N)</p><p className="text-sm font-mono font-black text-slate-900 mt-1">{viewAssetModal.serial_number || 'N/A'}</p></div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand</p><p className="text-sm font-black text-slate-900 mt-1">{viewAssetModal.brand || 'N/A'}</p></div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 sm:col-span-2"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assets Name</p><p className="text-sm font-black text-slate-900 mt-1">{viewAssetModal.safe_display_name}</p></div>
                      </div>

                      {/* 🚨 LIVE ROW 3 WITH CUSTOM COLORED INSPECTION BADGE */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-100/60"><p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Purchase Date</p><p className="text-xs font-bold text-slate-900 mt-1.5">{viewAssetModal.purchase_date ? new Date(viewAssetModal.purchase_date).toLocaleDateString('en-IN') : 'Not Recorded'}</p></div>
                        <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-100/60"><p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Warranty Date</p><p className="text-xs font-bold text-slate-900 mt-1.5">{viewAssetModal.warranty_expiry ? new Date(viewAssetModal.warranty_expiry).toLocaleDateString('en-IN') : 'No Warranty'}</p></div>
                        <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-100/60 flex flex-col justify-center">
                          <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Inspection Status</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${getInspectionStatusColor(viewAssetModal.live_inspection_status)}`}>
                              {viewAssetModal.live_inspection_status || 'Approved'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Assigned Employee Holder:</span>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><User size={16}/></div>
                            <span className="text-base font-black text-slate-900">{viewAssetModal.staff_name}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">EMP CODE</span>
                           <span className="text-sm font-mono font-black text-blue-800 bg-white px-3 py-1 rounded-lg border border-blue-100 shadow-xs">{viewAssetModal.emp_code}</span>
                        </div>
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