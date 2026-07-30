'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Laptop, PlusCircle, Search, QrCode, 
  User, X, Save, RefreshCw, Download, Printer, Edit2, 
  Upload, FileSpreadsheet, Package, Mouse, 
  Headphones, SlidersHorizontal, ChevronDown, ChevronUp, CheckCircle2, 
  Clock, AlertTriangle, Loader2, CheckSquare, Settings2, Trash2,
  Keyboard, RectangleHorizontal, Monitor, Sparkles, History,
  Filter, FilterX, ShieldCheck, FileText, Cpu, Zap
} from 'lucide-react';

// ==========================================
// 🌟 EXACT ASSET CATEGORIES FROM ADMIN
// ==========================================
const ASSET_CATEGORIES = [
  'Laptop', 'Stand', 'USB Wired Keyboard', 'USB Keyboard Mouse Kit', 
  'Wireless Keyboard kit', 'USB Wired Mouse', 'Headphone', 'Cleaning Kit', 'Others'
];

function getCategoryIcon(category: string, size = 18) {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('laptop')) return <Laptop size={size} />;
  if (cat.includes('stand')) return <Monitor size={size} />;
  if (cat.includes('keyboard') || cat.includes('combo')) return <Keyboard size={size} />;
  if (cat.includes('mouse pad') || cat.includes('pad')) return <RectangleHorizontal size={size} />;
  if (cat.includes('mouse')) return <Mouse size={size} />;
  if (cat.includes('headphone')) return <Headphones size={size} />;
  if (cat.includes('cleaning')) return <Sparkles size={size} />;
  return <Package size={size} />;
}

function safeDate(dateStr: any) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function safeString(val: any) {
  if (val === null || val === undefined) return '';
  return String(val);
}

function generateSafeUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateCategoryPrefix(category: string, existingTagId?: string) {
  let middle = 'OTH';
  const cat = safeString(category).toLowerCase();
  
  if (cat.includes('laptop')) middle = 'LAP';
  else if (cat.includes('wireless keyboard')) middle = 'WKM';
  else if (cat.includes('combo') || cat.includes('mouse kit')) middle = 'CKM';
  else if (cat.includes('wired keyboard') || cat === 'keyboard usb') middle = 'KMU';
  else if (cat.includes('mouse')) middle = 'MOU';
  else if (cat.includes('headphone')) middle = 'HDP';
  else if (cat.includes('stand')) middle = 'STD';
  else if (cat.includes('cleaning')) middle = 'CKT';
  else middle = 'OTH';

  let suffix = Math.floor(1000 + Math.random() * 9000).toString();

  if (existingTagId) {
    const match = existingTagId.match(/\d{4}$/); 
    if (match) suffix = match[0];
  }
  return `VSS-${middle}-${suffix}`;
}

function autoDetectSpecs(textToParse: string, category: string, fallback?: string) {
  if (!category.toLowerCase().includes('laptop')) return fallback || 'Standard Business Grade IT Hardware Configuration';
  const t = textToParse.toLowerCase();
  if (t.includes('thinkbook') && (t.includes('16s') || t.includes('r7') || t.includes('7735hs'))) return 'AMD Ryzen 7 7735HS | 16GB DDR5 RAM | 512GB NVMe SSD | Windows 11 Home';
  if (t.includes('fx507zv') || t.includes('tuf gaming') || t.includes('12700h')) return 'Intel Core i7-12700H (12th Gen) | 16GB DDR4 RAM | 512GB PCIe 4.0 SSD | RTX 4060 8GB | Win 11';
  if (t.includes('ryzen 9') || t.includes('r9') || (t.includes('rog') && t.includes('strix'))) return 'AMD Ryzen 9 6900HX/7940HS | 16GB DDR5 RAM | 1TB NVMe SSD | RTX 4060/4070 | Win 11';
  if (t.includes('thinkbook') || t.includes('r7 16') || (t.includes('lenovo') && t.includes('ryzen 7'))) return 'AMD Ryzen 7 5800U/6800U Pro Series | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro';
  if (t.includes('inspiron') || t.includes('3530') || (t.includes('dell') && (t.includes('inspiron') || t.includes('3530')))) return 'Intel Core i5-1335U (13th Gen) | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro';
  if (t.includes('precision') || t.includes('elitebook') || t.includes('probook') || t.includes('11 gen') || t.includes('12 gen') || (t.includes('hp') && t.includes('i7'))) return 'Intel Core i7 (11th/12th Gen vPro) | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro';
  
  let cpu = 'Intel Core i5 (vPro Business Edition)';
  if (t.includes('ryzen 7') || t.includes('r7')) cpu = 'AMD Ryzen 7 Pro Series';
  else if (t.includes('i7')) cpu = 'Intel Core i7 (11th/12th Gen vPro)';
  return `${cpu} | 16GB RAM | 512GB NVMe SSD | Windows 11 Pro`;
}

const SearchableStaffDropdown = ({ value, onChange, staffList, isDarkMode, placeholder = "Type employee name or EMP code..." }: any) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const s = staffList.find((st: any) => st.id === value);
      if (s) setQuery(`${s.full_name || s.name} (${s.emp_code || s.email})`);
    } else setQuery('');
  }, [value, staffList]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim().length === 0 ? [] : staffList.filter((s: any) => `${s.full_name || s.name} ${s.emp_code || s.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex items-center w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus-within:bg-white focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/10 rounded-xl transition-all shadow-sm">
        <Search size={16} className="text-slate-500 mr-2 shrink-0" />
        <input type="text" value={open ? query : query || ''} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} className="w-full text-sm font-bold outline-none bg-transparent text-slate-900 placeholder:text-slate-400" />
        {value && <X size={16} className="text-rose-500 hover:text-rose-700 cursor-pointer mr-2" onClick={() => { onChange(''); setQuery(''); }} />}
        <ChevronDown size={16} className="text-slate-500 cursor-pointer" onClick={() => setOpen(!open)} />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-2 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] max-h-60 overflow-y-auto custom-scrollbar bg-white/90 backdrop-blur-xl border border-white/60">
          <div onClick={() => { onChange(''); setQuery(''); setOpen(false); }} className="p-4 text-xs font-bold uppercase cursor-pointer border-b border-white/60 text-orange-600 hover:bg-white/50">📦 Unassign / Return to Stock</div>
          {query.trim().length === 0 ? (
            <div className="p-4 text-center text-xs font-bold text-slate-500">🔍 Type an employee name or EMP code above...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-xs font-bold text-rose-500">No matched employee found for "{query}".</div>
          ) : (
            filtered.map((s: any) => (
              <div key={s.id} className="p-4 text-sm cursor-pointer border-b border-white/60 flex justify-between items-center hover:bg-white/50 text-slate-900" onClick={() => { onChange(s.id); setQuery(`${s.full_name || s.name} (${s.emp_code || s.email})`); setOpen(false); }}>
                <span className="font-bold">{s.full_name || s.name}</span>
                <span className="font-mono text-[10px] px-2 py-1 rounded-md font-bold bg-white/60 text-slate-700 border border-white/80">{s.emp_code || s.email}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

function AssetRegistryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [conditionFilter, setConditionFilter] = useState<string>('All');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPrintConfigModalOpen, setIsPrintConfigModalOpen] = useState(false);
  const [viewAssetModal, setViewAssetModal] = useState<any>(null);
  
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const [printConfig, setPrintConfig] = useState({ pageSize: 'A4', columns: 2, rows: 8, labelWidth: 8.88, labelHeight: 3.4, marginTop: 1.25, marginLeft: 1.37, gapX: 0.5, gapY: 0.0, packSmallAssets: true });

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
  const [newAssetSpecs, setNewAssetSpecs] = useState('Intel Core i7 (11th/12th Gen vPro) | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro');
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    fetchRegistryData();
  }, []);

  useEffect(() => {
    if (isAddModalOpen) {
      setNewAssetTag(generateCategoryPrefix(newAssetCategory));
      if (newAssetCategory === 'Laptop') setNewAssetSpecs('Intel Core i7 (11th/12th Gen vPro) | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro');
      else if (newAssetCategory.includes('Keyboard') || newAssetCategory.includes('Mouse')) setNewAssetSpecs('USB / Wireless Plug-and-Play Standard Business Accessory');
      else setNewAssetSpecs('Standard Business Grade IT Hardware Configuration');
    }
  }, [isAddModalOpen, newAssetCategory]);

  useEffect(() => {
    if (viewAssetModal && !isEditingAsset) {
      setShowFullHistory(false);
      loadAssetHistory(viewAssetModal.id);
    }
  }, [viewAssetModal, isEditingAsset]);

  const loadAssetHistory = async (assetId: string) => {
    setIsLoadingHistory(true);
    try {
      const { data: historyData } = await supabase.from('inspections').select('*').eq('asset_id', assetId).order('created_at', { ascending: false });
      const compiled = (historyData || []).map(log => {
         const staff = staffList.find(s => s.id === log.inspected_by);
         return { ...log, staff_name: staff ? (staff.full_name || staff.name) : 'Admin / System Execution', emp_code: staff ? (staff.emp_code || staff.email) : 'N/A' };
      });
      setAssetHistory(compiled);
    } catch (e) {} finally { setIsLoadingHistory(false); }
  };

  const fetchRegistryData = async () => {
    setLoading(true);
    try {
      const [assetRes, staffRes, inspectionRes] = await Promise.all([
        supabase.from('assets').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('inspections').select('asset_id, status, notes, photos, created_at').order('created_at', { ascending: false })
      ]);
      const assetData = assetRes.data || [];
      const staffData = staffRes.data || [];
      const inspectionData = inspectionRes.data || [];
      setStaffList(staffData);
      
      const compiledAssets = assetData.map(asset => {
        const assignee = staffData.find(s => s.id === asset.assigned_to || s.email === asset.assigned_to) || {};
        const latestInspection = inspectionData.find(i => i.asset_id === asset.id);
        return {
          ...asset,
          safe_display_name: asset.name || asset.asset_name || 'Unnamed Asset',
          staff_name: assignee.full_name || assignee.name || asset.assigned_to || 'Unassigned',
          emp_code: assignee.emp_code || assignee.emp_id || 'N/A',
          staff_email: assignee.email || 'N/A',
          clean_tag: (asset.asset_tag && String(asset.asset_tag).length < 20) ? asset.asset_tag : generateCategoryPrefix(asset.category, asset.id),
          live_inspection_status: latestInspection?.status || asset.inspection_status || 'Approved',
          live_inspection_date: latestInspection?.created_at || asset.last_inspection_date || null,
          system_specs: asset.system_specs || asset.specs || autoDetectSpecs(`${asset.name || ''} ${asset.brand || ''} ${asset.serial_number || ''}`, asset.category)
        };
      });
      setAssets(compiledAssets);
    } catch (err) {} finally { setLoading(false); }
  };

  const getStockStatusBadge = (status: string) => {
    const s = safeString(status);
    if (s.includes('Assigned')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (s.includes('Repair')) return 'bg-orange-100 text-orange-800 border-orange-300 animate-pulse';
    if (s.includes('Demo')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (s.includes('Pending')) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const getInspectionStatusColor = (status: string) => {
    const s = safeString(status).toLowerCase().trim();
    if (s.includes('approved')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (s.includes('return')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (s.includes('rejected')) return 'bg-rose-100 text-rose-800 border-rose-300';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  const openAssetViewModal = (asset: any) => {
    const stableTag = asset.clean_tag || generateCategoryPrefix(asset.category, asset.id);
    setViewAssetModal({ ...asset, clean_tag: stableTag });
    setIsEditingAsset(false);
    setEditForm({
      category: asset.category || 'Laptop', asset_tag: stableTag, serial: asset.serial_number || '',
      name: asset.safe_display_name, brand: asset.brand || '', price: asset.price || '', 
      vendor: asset.vendor || '', purchase_date: asset.purchase_date || '', warranty_expiry: asset.warranty_expiry || '',
      condition: asset.asset_condition || 'New', status: asset.status || 'In Stock (Unassigned)', 
      inspection_status: asset.live_inspection_status || 'Approved', assignee: asset.assigned_to || '',
      system_specs: asset.system_specs || ''
    });
  };

  const handleSaveNewAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName || !newAssetSerial) return alert("Assets Name and Serial Number are required.");
    setIsSaving(true);
    try {
      const serialUpper = newAssetSerial.toUpperCase();
      const { data: existingSerial } = await supabase.from('assets').select('serial_number').eq('serial_number', serialUpper).maybeSingle();

      if (existingSerial) {
        alert(`Error: An asset with the Serial Number "${serialUpper}" already exists in the system.`);
        setIsSaving(false); return;
      }

      const resolvedStatus = newAssetAssignee ? 'Pending Handover' : newAssetStatus;
      const finalTag = newAssetTag || generateCategoryPrefix(newAssetCategory);
      const newAssetId = generateSafeUuid();
      
      const payload: any = {
        id: newAssetId, asset_tag: finalTag.toUpperCase(), name: newAssetName, 
        brand: newAssetBrand || 'Standard', serial_number: serialUpper, 
        category: newAssetCategory, price: newAssetPrice ? parseFloat(newAssetPrice) : null, 
        vendor: newAssetVendor || 'Direct', purchase_date: newAssetPurchaseDate || null, 
        warranty_expiry: newAssetWarranty || null, asset_condition: newAssetCondition,
        status: resolvedStatus, assigned_to: newAssetAssignee || null, inspection_status: 'Approved',
        system_specs: newAssetSpecs || 'Standard Business Configuration'
      };

      let { error } = await supabase.from('assets').insert([payload]);
      if (error && (error.message.includes('system_specs') || error.message.includes('column'))) {
        delete payload.system_specs;
        const retry = await supabase.from('assets').insert([payload]);
        error = retry.error;
      }
      if (error) throw error;
      
      await supabase.from('inspections').insert({ asset_id: newAssetId, inspected_by: newAssetAssignee || null, status: newAssetAssignee ? 'Pending Handover' : 'Stock Intake', notes: `Asset initially registered.` });
      setIsAddModalOpen(false); 
      fetchRegistryData();
    } catch (err: any) { alert(`Error: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleUpdateExistingAsset = async () => {
    setIsUpdating(true);
    try {
      const serialUpper = editForm.serial.toUpperCase();
      const { data: duplicateCheck } = await supabase.from('assets').select('id, serial_number').eq('serial_number', serialUpper).neq('id', viewAssetModal.id).maybeSingle();
      if (duplicateCheck) { alert(`Error: Serial Number in use.`); setIsUpdating(false); return; }

      let resolvedStatus = editForm.status;
      if (editForm.assignee && viewAssetModal.assigned_to !== editForm.assignee) resolvedStatus = 'Pending Handover';
      else if (!editForm.assignee && viewAssetModal.assigned_to) resolvedStatus = 'In Stock (Unassigned)';

      const updatePayload: any = {
        category: editForm.category, serial_number: serialUpper, asset_tag: editForm.asset_tag.toUpperCase(),
        name: editForm.name, brand: editForm.brand, price: editForm.price ? parseFloat(editForm.price) : null,
        vendor: editForm.vendor, purchase_date: editForm.purchase_date || null, warranty_expiry: editForm.warranty_expiry || null, 
        asset_condition: editForm.condition, status: resolvedStatus, inspection_status: editForm.inspection_status || 'Approved',
        assigned_to: editForm.assignee || null, system_specs: editForm.system_specs || ''
      };

      let { error } = await supabase.from('assets').update(updatePayload).eq('id', viewAssetModal.id);
      if (error && (error.message.includes('system_specs') || error.message.includes('column'))) {
        delete updatePayload.system_specs;
        await supabase.from('assets').update(updatePayload).eq('id', viewAssetModal.id);
      }

      setIsEditingAsset(false); 
      fetchRegistryData();
    } catch (err: any) { alert(`Error updating: ${err.message}`); } finally { setIsUpdating(false); }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this asset?")) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('assets').delete().eq('id', assetId);
      if (error) throw error;
      setAssets(prev => prev.filter(a => a.id !== assetId));
      setViewAssetModal(null);
    } catch (err: any) { alert(`Error deleting asset: ${err.message}`); } finally { setIsUpdating(false); }
  };

  const getCatCount = (filterName: string) => {
    if (filterName === 'All') return assets.length;
    if (filterName === 'Laptop') return assets.filter(a => safeString(a.category).toLowerCase().includes('laptop')).length;
    if (filterName === 'Accessories') return assets.filter(a => { const c = safeString(a.category).toLowerCase(); return c.includes('mouse') || c.includes('keyboard') || c.includes('stand') || c.includes('combo') || c.includes('pad'); }).length;
    if (filterName === 'Headphone') return assets.filter(a => safeString(a.category).toLowerCase().includes('headphone')).length;
    if (filterName === 'Other') return assets.filter(a => { const c = safeString(a.category).toLowerCase(); return c.includes('cleaning') || c.includes('other') || (!c.includes('laptop') && !c.includes('mouse') && !c.includes('keyboard') && !c.includes('stand') && !c.includes('headphone') && !c.includes('pad') && !c.includes('combo')); }).length;
    return assets.filter(a => safeString(a.category).toLowerCase() === filterName.toLowerCase()).length;
  };

  const filteredAssets = assets.filter(a => {
    const q = safeString(searchQuery).toLowerCase();
    const cleanTag = safeString(a.clean_tag).toLowerCase();
    const cat = safeString(a.category).toLowerCase();
    const status = safeString(a.status).toLowerCase();
    const cond = safeString(a.asset_condition).toLowerCase();
    
    const matchesSearch = !q || (safeString(a.id).toLowerCase().includes(q) || cleanTag.includes(q) || safeString(a.safe_display_name).toLowerCase().includes(q) || safeString(a.brand).toLowerCase().includes(q) || cat.includes(q) || safeString(a.serial_number).toLowerCase().includes(q) || safeString(a.staff_name).toLowerCase().includes(q) || safeString(a.emp_code).toLowerCase().includes(q));
    
    let matchesCat = true;
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Laptop') matchesCat = cat.includes('laptop');
      else if (selectedCategory === 'Accessories') matchesCat = cat.includes('mouse') || cat.includes('keyboard') || cat.includes('stand') || cat.includes('pad') || cat.includes('combo');
      else if (selectedCategory === 'Headphone') matchesCat = cat.includes('headphone') || cat.includes('headset');
      else if (selectedCategory === 'Other') matchesCat = cat.includes('cleaning') || cat.includes('other') || (!cat.includes('laptop') && !cat.includes('mouse') && !cat.includes('keyboard') && !cat.includes('stand') && !cat.includes('headphone') && !cat.includes('pad') && !cat.includes('combo'));
      else matchesCat = cat === selectedCategory.toLowerCase();
    }

    let matchesStatus = true;
    if (statusFilter !== 'All') {
      if (statusFilter === 'In Stock') matchesStatus = status.includes('stock') || status.includes('unassigned');
      else if (statusFilter === 'Assigned') matchesStatus = status === 'assigned' || status.includes('assigned');
      else if (statusFilter === 'Pending Handover') matchesStatus = status.includes('pending');
      else if (statusFilter === 'In Repair') matchesStatus = status.includes('repair');
      else if (statusFilter === 'Demo Use') matchesStatus = status.includes('demo');
      else matchesStatus = status === statusFilter.toLowerCase();
    }

    let matchesCond = true;
    if (conditionFilter !== 'All') matchesCond = cond.includes(conditionFilter.toLowerCase());
    
    return matchesSearch && matchesCat && matchesStatus && matchesCond;
  });

  const toggleSelectAsset = (id: string) => {
    const newSet = new Set(selectedAssetIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedAssetIds(newSet);
  };

  const handleSelectAllFiltered = () => {
    if (selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0) setSelectedAssetIds(new Set()); 
    else setSelectedAssetIds(new Set(filteredAssets.map(a => a.id))); 
  };

  const executeGridBulkPrint = () => {
    alert('Bulk print triggered for ' + selectedAssetIds.size + ' assets.');
    setIsPrintConfigModalOpen(false);
  }

  const handleGenerateHandoverPDF = (asset: any) => {
    alert('PDF Handover generation triggered for ' + asset.safe_display_name);
  }

  const handlePrintPhysicalSticker = (asset: any, cleanTag: string) => {
    alert('Print single sticker triggered for ' + cleanTag);
  }

  const getAssetViewUrl = (asset: any) => {
    return `https://virtual-staffing.vercel.app/public-asset?id=${asset.clean_tag || asset.id}`;
  };

  // 🌟 EXACT TRANSPARENT MAC OS MATTE GLASS THEME
  const theme = {
    bg: 'bg-transparent',
    card: 'bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]',
    cardHover: 'hover:bg-white/60 hover:border-orange-400 hover:shadow-[0_8px_32px_rgba(249,115,22,0.15)] hover:-translate-y-1 transition-all duration-300',
    modalBody: 'bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]',
    textMain: 'text-slate-900',
    textSub: 'text-slate-700',
  };

  return (
    <div className={`min-h-screen bg-[#FCF9F8] relative overflow-hidden font-sans antialiased pb-12`}>
      {/* 🌟 GLOBAL BACKGROUND ORBS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-225 h-125 pointer-events-none z-0 flex justify-between items-center opacity-50">
        <div className="w-112.5 h-112.5 bg-[#FFD1B3] rounded-full blur-[120px]"></div>
        <div className="w-112.5 h-112.5 bg-[#D8B4FE] rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-400 px-4 sm:px-6 lg:px-10 mx-auto space-y-6 pt-6 relative z-10">
        
        {/* BRAND HEADER */}
        <div className={`${theme.card} p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5`}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className={`p-3 bg-white/60 border border-white/80 hover:bg-white/90 shadow-sm rounded-xl text-slate-800 transition-all cursor-pointer`}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <ShieldCheck className="text-orange-600 w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
                  <span>Asset Records</span>
                </h1>
                <span className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest bg-white/60 border border-white/80 text-orange-600 shadow-sm`}>{assets.length} Units</span>
              </div>
              <p className={`text-sm font-bold ${theme.textSub}`}>Manage full hardware lifecycle, smart QR stickers, and S/N tags</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedAssetIds.size > 0 && (
              <button onClick={() => setIsPrintConfigModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer">
                <Printer size={16} /> <span>Print {selectedAssetIds.size} QRs</span>
              </button>
            )}
            <button onClick={() => setIsBulkModalOpen(true)} className={`flex items-center gap-2 px-5 py-3 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl transition-all text-xs font-bold uppercase tracking-wider cursor-pointer`}>
              <FileSpreadsheet size={16} /> <span>Bulk Upload</span>
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer">
              <PlusCircle size={16} /> <span>New Asset</span>
            </button>
          </div>
        </div>

        {/* TABS & SEARCH */}
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
            {[
              { name: 'All', icon: <Package size={16}/> }, 
              { name: 'Laptop', icon: <Laptop size={16}/> },
              { name: 'Accessories', icon: <Mouse size={16}/> }, 
              { name: 'Headphone', icon: <Headphones size={16}/> },
              { name: 'Other', icon: <SlidersHorizontal size={16}/> }
            ].map(cat => {
              const isActive = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name} onClick={() => setSelectedCategory(cat.name)}
                  className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] scale-[1.02]' 
                      : `bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm`
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-purple-600 group-hover:text-purple-700 transition-colors'}>{cat.icon}</span> 
                  <span className="hidden sm:inline">{cat.name}</span>
                  <span className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-black transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white/80 text-purple-700 border border-white/80'
                  }`}>{getCatCount(cat.name)}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <button 
              onClick={handleSelectAllFiltered} 
              className={`px-4 py-3 shrink-0 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm`}
            >
              <CheckSquare size={18} className={selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? 'text-orange-600' : 'text-purple-600'} /> 
              <span>{selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>

            {/* 🌟 SEARCH BAR */}
            <div className="flex-1 p-3 bg-white/80 border border-white/80 text-slate-900 focus-within:bg-white focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/10 rounded-xl transition-all shadow-sm flex items-center">
              <div className="relative w-full">
                <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-500`} />
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by Asset Name, Tag ID, Brand, Category, S/N, or Staff..." 
                  className="w-full pl-12 pr-4 py-1.5 text-sm font-bold outline-none bg-transparent placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto custom-scrollbar">
              <span className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0 ${theme.textMain}`}>
                <Filter size={16} className="text-orange-600" /> Filter:
              </span>
              
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`text-xs font-bold py-2.5 px-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none cursor-pointer`}
              >
                <option value="All">📦 All Stock Statuses</option>
                <option value="In Stock">🟢 In Stock (Unassigned)</option>
                <option value="Assigned">👤 Assigned</option>
                <option value="Pending Handover">⏳ Pending Handover</option>
                <option value="In Repair">🛠️ In Repair</option>
                <option value="Demo Use">🧪 Demo Use</option>
              </select>

              <select
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value)}
                className={`text-xs font-bold py-2.5 px-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none cursor-pointer`}
              >
                <option value="All">✨ All Conditions</option>
                <option value="New">✨ New</option>
                <option value="Refurbished">🔄 Refurbished</option>
                <option value="Repaired">🛠️ Repaired</option>
              </select>

              {(statusFilter !== 'All' || conditionFilter !== 'All' || searchQuery !== '' || selectedCategory !== 'All') && (
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setConditionFilter('All');
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-600 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
                >
                  <FilterX size={14} /> <span>Reset</span>
                </button>
              )}
            </div>

            <span className={`text-sm font-bold ${theme.textSub} shrink-0`}>
              Showing <strong className="text-orange-600 font-black">{filteredAssets.length}</strong> of {assets.length} assets
            </span>
          </div>
        </div>

        {/* 🌟 ASSET GRID */}
        {loading ? (
          <div className={`${theme.card} w-full py-32 flex flex-col items-center justify-center gap-4`}>
            <div className={`animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600`}></div>
            <span className={`text-sm font-bold tracking-widest uppercase ${theme.textMain}`}>Loading Asset Records...</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className={`${theme.card} p-16 text-center flex flex-col items-center justify-center space-y-4`}>
            <Package size={56} className="text-orange-600 opacity-80" />
            <h3 className={`text-xl font-black ${theme.textMain}`}>No Hardware Found</h3>
            <p className={`text-sm font-bold max-w-md ${theme.textSub}`}>No assets match your selected filter combination.</p>
            <button onClick={() => { setStatusFilter('All'); setConditionFilter('All'); setSearchQuery(''); setSelectedCategory('All'); }} className="mt-4 px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] rounded-xl text-sm font-bold uppercase tracking-wider cursor-pointer">
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredAssets.map(asset => {
              const isSelected = selectedAssetIds.has(asset.id);

              return (
                <div key={asset.id} onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button')) return;
                  toggleSelectAsset(asset.id);
                }} className={`${theme.card} flex flex-col justify-between group cursor-pointer ${isSelected ? 'border-orange-400 shadow-[0_8px_32px_rgba(249,115,22,0.15)] bg-white/70' : theme.cardHover} overflow-hidden`}>
                  
                  <div className={`p-5 sm:p-6 border-b border-white/60`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/80 text-orange-600 border border-white/80 shadow-sm`}>
                          {getCategoryIcon(asset.category, 20)}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className={`text-base font-black leading-tight truncate max-w-44 ${theme.textMain}`}>{asset.safe_display_name}</h3>
                          <p className={`text-xs font-bold mt-1 truncate ${theme.textSub}`}>{asset.brand || 'Standard Brand'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); openAssetViewModal(asset); }} className={`p-2.5 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl cursor-pointer`}>
                          <QrCode size={18} />
                        </button>
                        <input type="checkbox" checked={isSelected} readOnly className="w-5 h-5 rounded cursor-pointer accent-orange-600" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border backdrop-blur-sm shadow-sm ${getStockStatusBadge(asset.status)}`}>{asset.status || 'In Stock'}</span>
                      <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border backdrop-blur-sm shadow-sm bg-white/80 border-white/80 text-slate-800`}>{asset.asset_condition || 'New'}</span>
                    </div>
                  </div>

                  <div className={`p-5 sm:p-6 space-y-3 flex-1 bg-white/30`}>
                    <div className={`flex justify-between items-center p-3 bg-white/70 border border-white/80 text-slate-900 rounded-xl shadow-sm`}>
                      <span className={`font-black uppercase text-[10px] tracking-widest ${theme.textSub}`}>Tag ID</span> 
                      <span className="font-mono font-black text-sm text-purple-700">{asset.clean_tag}</span>
                    </div>
                    <div className={`flex justify-between items-center p-3 bg-white/70 border border-white/80 text-slate-900 rounded-xl shadow-sm`}>
                      <span className={`font-black uppercase text-[10px] tracking-widest ${theme.textSub}`}>Serial S/N</span> 
                      <span className={`font-mono font-black text-xs truncate max-w-35 ${theme.textMain}`} title={asset.serial_number}>{asset.serial_number || 'N/A'}</span>
                    </div>
                    
                    <div className={`flex justify-between items-center p-3 bg-white/70 border border-white/80 text-slate-900 rounded-xl shadow-sm`}>
                      <div className="flex flex-col">
                        <span className={`font-black uppercase text-[10px] tracking-widest ${theme.textSub}`}>Holder</span> 
                        <span className={`font-black text-xs truncate max-w-32 ${theme.textMain} mt-0.5`} title={asset.staff_name}>{asset.staff_name}</span>
                      </div>
                      <span className={`font-mono font-black px-3 py-1.5 rounded-xl text-[10px] bg-white border border-white/80 text-slate-800 shadow-sm`}>{asset.emp_code}</span>
                    </div>
                  </div>

                  <div className={`p-4 sm:p-5 border-t border-white/60 bg-white/40 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className={theme.textSub} />
                      <div className="flex flex-col">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Last Audited</span>
                        <span className={`text-[11px] font-mono font-black ${theme.textMain}`}>{safeDate(asset.live_inspection_date)}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black backdrop-blur-sm shadow-sm ${getInspectionStatusColor(asset.live_inspection_status)}`}>
                      {(() => {
                        const st = (asset.live_inspection_status || '').toLowerCase().trim();
                        if (st.includes('approved')) return <CheckCircle2 size={14} />;
                        if (st.includes('return')) return <RefreshCw size={14} className="animate-spin" />;
                        return <AlertTriangle size={14} />;
                      })()}
                      <span className="text-[10px] font-black uppercase tracking-widest">{asset.live_inspection_status || 'Approved'}</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🚀 PRINT SETTINGS UI MODAL */}
      {isPrintConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className={`max-w-2xl w-full p-8 space-y-8 animate-in fade-in zoom-in-95 duration-200 ${theme.modalBody}`}>
            <div className={`flex justify-between items-center pb-4 border-b border-white/60`}>
              <div>
                <h3 className={`text-lg font-bold tracking-tight flex items-center gap-3 ${theme.textMain}`}>
                  <Settings2 size={20} className="text-orange-600"/> Label Print Layout
                </h3>
                <p className={`text-[11px] mt-2 uppercase tracking-widest font-bold text-red-700 bg-red-100 inline-block px-2.5 py-1 rounded-lg border border-red-200 backdrop-blur-sm`}>
                  Important: When printing, uncheck "Fit to Page" and set Margins to "None".
                </p>
              </div>
              <button onClick={() => setIsPrintConfigModalOpen(false)} className={`p-2 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl cursor-pointer`}><X size={16}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className={`text-xs font-bold uppercase tracking-widest text-orange-600`}>Sheet Formatting</h4>
                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Paper Size</label>
                  <select value={printConfig.pageSize} onChange={e => setPrintConfig({...printConfig, pageSize: e.target.value})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none cursor-pointer">
                    <option value="A4">A4 (210 x 297mm)</option>
                    <option value="Letter">US Letter (8.5 x 11in)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Columns</label><input type="number" min="1" value={printConfig.columns} onChange={e => setPrintConfig({...printConfig, columns: parseInt(e.target.value) || 1})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" /></div>
                  <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Rows</label><input type="number" min="1" value={printConfig.rows} onChange={e => setPrintConfig({...printConfig, rows: parseInt(e.target.value) || 1})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" /></div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className={`text-xs font-bold uppercase tracking-widest text-orange-600`}>Label Dimensions</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Sticker Width (cm)</label><input type="number" step="0.01" value={printConfig.labelWidth} onChange={e => setPrintConfig({...printConfig, labelWidth: parseFloat(e.target.value) || 1})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" /></div>
                  <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Sticker Height (cm)</label><input type="number" step="0.01" value={printConfig.labelHeight} onChange={e => setPrintConfig({...printConfig, labelHeight: parseFloat(e.target.value) || 1})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" /></div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/60">
              <button onClick={() => setIsPrintConfigModalOpen(false)} className={`flex-1 py-3.5 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl transition-colors cursor-pointer text-xs font-bold uppercase tracking-wider`}>Cancel</button>
              <button onClick={executeGridBulkPrint} className="flex-2 py-3.5 bg-orange-600 hover:bg-orange-700 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] rounded-xl text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 cursor-pointer transition-all"><Printer size={16}/> Generate Print Page</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 VIEW MODAL & HISTORY ENGINE */}
      {viewAssetModal && (() => {
        const liveModalTag = editForm.asset_tag || viewAssetModal.clean_tag;
        const visibleHistory = showFullHistory ? assetHistory : assetHistory.slice(0, 1);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/20 backdrop-blur-sm">
            <div className={`max-w-4xl w-full max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col ${theme.modalBody}`}>
              
              {/* 🌟 ENTERPRISE COMPACT HEADER */}
              <div className={`w-full p-4 sm:p-5 border-b flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 border-white/60 shrink-0`}>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/80 shrink-0">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(getAssetViewUrl(viewAssetModal))}`} alt="QR Code" className="w-12 h-12 sm:w-14 sm:h-14 object-contain mix-blend-multiply" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base sm:text-lg font-bold font-mono ${theme.textMain} tracking-wider`}>{liveModalTag}</h3>
                      <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-widest border backdrop-blur-sm ${getStockStatusBadge(viewAssetModal.status)}`}>{viewAssetModal.status || 'In Stock'}</span>
                    </div>
                    <p className={`text-xs font-bold mt-0.5 ${theme.textSub}`} title={editForm.serial || viewAssetModal.serial_number}>
                      S/N: <span className="font-mono font-black">{editForm.serial || viewAssetModal.serial_number}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button onClick={() => handlePrintPhysicalSticker(viewAssetModal, liveModalTag)} className={`flex-1 sm:flex-none px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] rounded-xl text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-1.5 transition-all cursor-pointer`}>
                    <Printer size={14} /> <span>Print QR</span>
                  </button>
                  {!isEditingAsset && (
                    <>
                      <button onClick={() => setIsEditingAsset(true)} className={`px-4 py-2.5 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors`}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button onClick={() => handleDeleteAsset(viewAssetModal.id)} className={`px-4 py-2.5 bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300 shadow-sm rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors`}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                  <button onClick={() => setViewAssetModal(null)} className={`p-2.5 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl cursor-pointer transition-colors`}><X size={16}/></button>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4 flex-1">
                {isEditingAsset ? (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className={`flex justify-between items-center pb-2 border-b border-white/60`}>
                      <span className={`text-sm font-black uppercase tracking-widest text-orange-600`}>Editing Hardware Record</span>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm`}>
                      <div>
                        <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Asset Category *</label>
                        <select value={editForm.category} onChange={e => { 
                          const newCat = e.target.value; 
                          setEditForm({ ...editForm, category: newCat, asset_tag: generateCategoryPrefix(newCat, editForm.asset_tag) }); 
                        }} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none">
                          {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`text-[10px] font-black uppercase flex justify-between mb-1.5 text-orange-600`}>
                          <span>Asset Tag ID</span>
                          <button type="button" onClick={() => setEditForm({...editForm, asset_tag: generateCategoryPrefix(editForm.category)})} className="text-[9px] lowercase hover:underline cursor-pointer">(force regenerate)</button>
                        </label>
                        <input type="text" value={editForm.asset_tag} onChange={e => setEditForm({...editForm, asset_tag: e.target.value})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl font-mono uppercase transition-all shadow-sm outline-none" />
                      </div>
                    </div>

                    <div>
                      <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Factory Serial Number (Laptop SN - Charger SN) *</label>
                      <input type="text" required value={editForm.serial} onChange={e => setEditForm({...editForm, serial: e.target.value})} placeholder="e.g. M27370-00105" className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl font-mono uppercase transition-all shadow-sm outline-none" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Brand</label><input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" /></div>
                      <div>
                        <label className={`text-[10px] font-black uppercase flex justify-between mb-1.5 ${theme.textSub}`}>
                          <span>Assets Name</span>
                          <button type="button" onClick={() => setEditForm({...editForm, system_specs: autoDetectSpecs(`${editForm.name} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)})} className="text-[9px] text-orange-600 hover:underline cursor-pointer flex items-center gap-1 font-extrabold"><Zap size={10}/> ⚡ Re-Detect Specs</button>
                        </label>
                        <input type="text" value={editForm.name} onChange={e => { const v = e.target.value; setEditForm({...editForm, name: v, system_specs: autoDetectSpecs(`${v} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)}); }} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Price (₹)</label><input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl font-mono transition-all shadow-sm outline-none" /></div>
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Purchase Date</label><input type="date" value={editForm.purchase_date} onChange={e => setEditForm({...editForm, purchase_date: e.target.value})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" /></div>
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Warranty Expiry</label><input type="date" value={editForm.warranty_expiry} onChange={e => setEditForm({...editForm, warranty_expiry: e.target.value})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" /></div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className={`text-[10px] font-black uppercase ${theme.textSub}`}>System Hardware Specifications / Configuration</label>
                        <button type="button" onClick={() => setEditForm({...editForm, system_specs: autoDetectSpecs(`${editForm.name} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)})} className="text-[9px] text-orange-600 hover:underline cursor-pointer flex items-center gap-1 font-extrabold"><Zap size={10}/> ⚡ Auto-Detect from Model/SN</button>
                      </div>
                      <input type="text" value={editForm.system_specs} onChange={e => setEditForm({...editForm, system_specs: e.target.value})} placeholder="e.g. Intel Core i7 (12th Gen) | 16GB RAM | 512GB SSD | Win 11 Pro" className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" />
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {[
                          "AMD Ryzen 7 7735HS | 16GB RAM | 512GB SSD | Win 11 Home",
                          "Intel Core i7-12700H (12th Gen) | 16GB RAM | 512GB SSD | RTX 4060 | Win 11",
                          "Intel Core i5 (vPro) | 16GB RAM | 512GB SSD | Win 11 Pro",
                          "Intel Core i7 (vPro) | 16GB RAM | 512GB SSD | Win 11 Pro",
                          "AMD Ryzen 7 Pro | 16GB RAM | 512GB SSD | Win 11 Pro"
                        ].map((preset, pIdx) => (
                          <button
                            key={`preset-edit-${pIdx}`}
                            type="button"
                            onClick={() => setEditForm({...editForm, system_specs: preset})}
                            className={`text-[9px] px-2.5 py-1 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-lg font-bold transition-all cursor-pointer`}
                          >
                            ⚡ {preset.split('|')[0].trim()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-white/60`}>
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Condition</label><select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none"><option value="New">✨ New</option><option value="Refurbished">🔄 Refurbished</option><option value="Repaired">🛠️ Repaired</option></select></div>
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Stock Status</label><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none"><option value="In Stock (Unassigned)">📦 In Stock</option><option value="Assigned">👤 Assigned</option><option value="Demo Use">🧪 Demo</option><option value="In Repair">⚠️ Repair</option><option value="Discard">🗑️ Discard</option></select></div>
                      <div>
                        <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Inspection State</label>
                        <select value={editForm.inspection_status} onChange={e => setEditForm({...editForm, inspection_status: e.target.value})} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none">
                          <option value="Approved">✅ Approved</option><option value="Re-Inspection">🔄 Re-Inspection</option><option value="Not Approved">⚠️ Not Approved</option><option value="Rejected">❌ Rejected</option>
                        </select>
                      </div>
                    </div>

                    <div className={`p-5 bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]`}>
                      <label className={`text-[10px] font-black uppercase block mb-2 ${theme.textSub}`}>Re-Assign Holder</label>
                      <SearchableStaffDropdown value={editForm.assignee} onChange={(val: string) => setEditForm({...editForm, assignee: val})} staffList={staffList} isDarkMode={false} />
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-white/60">
                      <button type="button" onClick={() => setIsEditingAsset(false)} className={`flex-1 py-3.5 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors`}>Cancel</button>
                      <button type="button" onClick={handleUpdateExistingAsset} disabled={isUpdating} className="flex-2 py-3.5 bg-orange-600 hover:bg-orange-700 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all">
                        {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save Secure Record
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`p-4 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Category</p><p className={`text-xs font-bold mt-1.5 text-orange-600`}>{viewAssetModal.category || 'Laptop'}</p></div>
                      <div className={`p-4 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Brand</p><p className={`text-xs font-bold mt-1.5 ${theme.textMain}`}>{viewAssetModal.brand || 'N/A'}</p></div>
                      <div className={`p-4 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Assets Name</p><p className={`text-xs font-bold mt-1.5 truncate ${theme.textMain}`} title={viewAssetModal.safe_display_name}>{viewAssetModal.safe_display_name}</p></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`p-4 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Purchase Date</p><p className={`text-xs font-bold mt-1.5 ${theme.textMain}`}>{safeDate(viewAssetModal.purchase_date)}</p></div>
                      <div className={`p-4 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Warranty Date</p><p className={`text-xs font-bold mt-1.5 ${theme.textMain}`}>{safeDate(viewAssetModal.warranty_expiry)}</p></div>
                      <div className={`p-4 flex flex-col justify-center bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Inspection Status</p><div className="flex items-center gap-1 mt-1.5"><span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase border backdrop-blur-sm shadow-sm ${getInspectionStatusColor(viewAssetModal.live_inspection_status)}`}>{viewAssetModal.live_inspection_status || 'Approved'}</span></div></div>
                    </div>

                    <div className={`p-4 flex items-center gap-4 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm`}>
                      <Cpu size={20} className="text-orange-600 shrink-0" />
                      <div className="w-full">
                        <span className={`text-[9px] font-black uppercase tracking-widest block ${theme.textSub}`}>System Hardware Configuration / Specifications:</span>
                        <p className={`text-xs font-bold mt-1 ${theme.textMain}`}>{viewAssetModal.system_specs || 'Standard Business Hardware Configuration'}</p>
                      </div>
                    </div>

                    <div className={`p-4 flex items-center justify-between bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]`}>
                      <div>
                        <span className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Assigned Employee Holder:</span>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white border border-white/80 text-orange-600 shadow-sm`}><User size={16}/></div>
                          <span className={`text-sm font-black ${theme.textMain}`}>{viewAssetModal.staff_name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${theme.textSub}`}>EMP CODE</span>
                         <span className={`text-xs font-mono font-black px-3 py-1.5 bg-white border border-white/80 text-slate-900 shadow-sm rounded-xl`}>{viewAssetModal.emp_code}</span>
                      </div>
                    </div>

                    {(viewAssetModal.assigned_to || viewAssetModal.status === 'Assigned' || viewAssetModal.status === 'Pending Handover') && (
                      <div className={`p-5 bg-emerald-50 border border-emerald-200 backdrop-blur-md rounded-3xl shadow-sm`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-[0_4px_15px_rgba(5,150,105,0.3)] shrink-0">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h4 className={`text-xs font-black uppercase tracking-widest text-emerald-900`}>Official Handover Agreement</h4>
                              <p className={`text-[10px] font-bold text-emerald-700 mt-0.5`}>Digitally executed custody document with hardware specs and policies.</p>
                            </div>
                          </div>
                          <button onClick={() => handleGenerateHandoverPDF(viewAssetModal)} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_15px_rgba(5,150,105,0.3)] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0">
                            <Download size={16} /> <span>Download PDF</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={`p-5 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <History size={16} className="text-orange-600" />
                          <h4 className={`text-xs font-black uppercase tracking-widest ${theme.textMain}`}>Lifecycle & Activity History</h4>
                        </div>
                        {assetHistory.length > 1 && (
                          <button onClick={() => setShowFullHistory(!showFullHistory)} className="text-[10px] font-black text-orange-600 hover:underline cursor-pointer flex items-center gap-1 bg-white/80 border border-white/80 shadow-sm px-2 py-1 rounded-md">
                            {showFullHistory ? (<><span>Show Less</span> <ChevronUp size={14}/></>) : (<><span>Show Full History ({assetHistory.length})</span> <ChevronDown size={14}/></>)}
                          </button>
                        )}
                      </div>
                      
                      {isLoadingHistory ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-orange-600 size-6"/></div>
                      ) : assetHistory.length === 0 ? (
                        <p className={`text-xs font-bold italic ${theme.textSub}`}>No history logs found for this asset.</p>
                      ) : (
                        <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                          {visibleHistory.map((log, idx) => {
                            let photosArray: string[] = [];
                            try {
                              if (Array.isArray(log.photos)) photosArray = log.photos;
                              else if (typeof log.photos === 'string') {
                                const parsed = JSON.parse(log.photos);
                                if (Array.isArray(parsed)) photosArray = parsed;
                              }
                            } catch(e){}

                            return (
                              <div key={idx} className={`p-4 bg-white/80 border border-white/80 text-slate-900 rounded-xl shadow-sm`}>
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border backdrop-blur-sm ${getInspectionStatusColor(log.status)}`}>{log.status}</span>
                                    <p className={`text-xs font-black mt-1.5 ${theme.textMain}`}>{log.staff_name} <span className="text-slate-500 font-mono">({log.emp_code})</span></p>
                                  </div>
                                  <span className={`text-[10px] font-bold bg-white/60 border border-white/80 text-slate-800 shadow-sm px-2 py-0.5 rounded`}>{safeDate(log.created_at)}</span>
                                </div>
                                {log.notes && (
                                  <div className={`mt-2 text-xs font-mono p-3 bg-white border border-white/80 text-slate-900 rounded-xl shadow-inner whitespace-pre-wrap`}>
                                    {log.notes}
                                  </div>
                                )}
                                {photosArray.length > 0 && (
                                  <div className="flex gap-2.5 mt-3 overflow-x-auto custom-scrollbar pb-1.5">
                                    {photosArray.map((url, i) => (
                                      <img key={`hist-photo-${i}`} src={url} alt="Log" className="h-14 w-14 rounded-xl object-cover border border-white/80 shadow-sm" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🚀 ADD NEW ASSET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className={`max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] ${theme.modalBody}`}>
            <div className={`p-6 border-b border-white/60 flex justify-between items-center bg-white/50`}>
              <h3 className={`text-lg font-black uppercase tracking-widest ${theme.textMain}`}>Register New Asset</h3>
              <button onClick={() => setIsAddModalOpen(false)} className={`p-2.5 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl cursor-pointer transition-colors`}><X size={16}/></button>
            </div>
            
            <form onSubmit={handleSaveNewAsset} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm`}>
                <div>
                  <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Asset Category *</label>
                  <select value={newAssetCategory} onChange={e => {
                    const newCat = e.target.value;
                    setNewAssetCategory(newCat);
                    setNewAssetTag(generateCategoryPrefix(newCat, newAssetTag));
                    if (newCat === 'Laptop') setNewAssetSpecs('Intel Core i7 (11th/12th Gen vPro) | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro');
                    else if (newCat.includes('Keyboard') || newCat.includes('Mouse')) setNewAssetSpecs('USB / Wireless Plug-and-Play Standard Business Accessory');
                    else setNewAssetSpecs('Standard Business Grade IT Hardware Configuration');
                  }} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none">
                    {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase flex justify-between mb-1.5 text-orange-600`}>
                    <span>Asset Tag ID</span>
                    <button type="button" onClick={() => setNewAssetTag(generateCategoryPrefix(newAssetCategory))} className="text-[9px] lowercase hover:underline cursor-pointer">(generate new)</button>
                  </label>
                  <input type="text" value={newAssetTag} onChange={e => setNewAssetTag(e.target.value)} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl font-mono uppercase transition-all shadow-sm outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Factory Serial Number (Laptop SN - Charger SN) *</label>
                  <input type="text" required value={newAssetSerial} onChange={e => setNewAssetSerial(e.target.value)} placeholder="e.g. M27370-00105" className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl font-mono uppercase transition-all shadow-sm outline-none" />
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Vendor Source</label>
                  <input type="text" value={newAssetVendor} onChange={e => setNewAssetVendor(e.target.value)} placeholder="e.g. Local Supplier, Nabha" className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Brand</label><input type="text" value={newAssetBrand} onChange={e => setNewAssetBrand(e.target.value)} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" /></div>
                <div>
                  <label className={`text-[10px] font-black uppercase flex justify-between mb-1.5 ${theme.textSub}`}>
                    <span>Assets Name *</span>
                    <button type="button" onClick={() => setNewAssetSpecs(autoDetectSpecs(`${newAssetName} ${newAssetBrand} ${newAssetSerial}`, newAssetCategory, newAssetSpecs))} className="text-[9px] text-orange-600 hover:underline cursor-pointer flex items-center gap-1 font-extrabold"><Zap size={10}/> ⚡ Auto-Detect Specs</button>
                  </label>
                  <input type="text" required value={newAssetName} onChange={e => { const v = e.target.value; setNewAssetName(v); setNewAssetSpecs(autoDetectSpecs(`${v} ${newAssetBrand} ${newAssetSerial}`, newAssetCategory, newAssetSpecs)); }} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Price (₹)</label><input type="number" step="0.01" value={newAssetPrice} onChange={e => setNewAssetPrice(e.target.value)} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl font-mono transition-all shadow-sm outline-none" /></div>
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Purchase Date</label><input type="date" value={newAssetPurchaseDate} onChange={e => setNewAssetPurchaseDate(e.target.value)} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" /></div>
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Warranty Expiry</label><input type="date" value={newAssetWarranty} onChange={e => setNewAssetWarranty(e.target.value)} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" /></div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className={`text-[10px] font-black uppercase ${theme.textSub}`}>System Hardware Specifications / Configuration</label>
                  <button type="button" onClick={() => setNewAssetSpecs(autoDetectSpecs(`${newAssetName} ${newAssetBrand} ${newAssetSerial}`, newAssetCategory, newAssetSpecs))} className="text-[9px] text-orange-600 hover:underline cursor-pointer flex items-center gap-1 font-extrabold"><Zap size={10}/> ⚡ Auto-Detect from Model/SN</button>
                </div>
                <input type="text" value={newAssetSpecs} onChange={e => setNewAssetSpecs(e.target.value)} placeholder="e.g. Intel Core i7 (vPro) | 16GB RAM | 512GB SSD | Win 11 Pro" className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none" />
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {[
                    "AMD Ryzen 7 7735HS | 16GB RAM | 512GB SSD | Win 11 Home",
                    "Intel Core i7-12700H (12th Gen) | 16GB RAM | 512GB SSD | RTX 4060 | Win 11",
                    "Intel Core i5 (vPro) | 16GB RAM | 512GB SSD | Win 11 Pro",
                    "Intel Core i7 (vPro) | 16GB RAM | 512GB SSD | Win 11 Pro",
                    "AMD Ryzen 7 Pro | 16GB RAM | 512GB SSD | Win 11 Pro"
                  ].map((preset, pIdx) => (
                    <button
                      key={`preset-add-${pIdx}`}
                      type="button"
                      onClick={() => setNewAssetSpecs(preset)}
                      className={`text-[9px] px-2.5 py-1 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-lg font-bold transition-all cursor-pointer`}
                    >
                      ⚡ {preset.split('|')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-white/60`}>
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Condition</label><select value={newAssetCondition} onChange={e => setNewAssetCondition(e.target.value)} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none"><option value="New">✨ New</option><option value="Refurbished">🔄 Refurbished</option><option value="Repaired">🛠️ Repaired</option></select></div>
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Stock Status</label><select value={newAssetStatus} onChange={e => setNewAssetStatus(e.target.value)} className="w-full p-3.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl transition-all shadow-sm outline-none"><option value="In Stock (Unassigned)">📦 In Stock</option><option value="Demo Use">🧪 Demo</option></select></div>
              </div>

              <div className={`p-5 bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]`}>
                <label className={`text-[10px] font-black uppercase block mb-2 ${theme.textSub}`}>Assign to Employee (Optional)</label>
                <SearchableStaffDropdown value={newAssetAssignee} onChange={(val: string) => setNewAssetAssignee(val)} staffList={staffList} isDarkMode={false} />
              </div>

              <div className="flex gap-4 pt-6 border-t border-white/60">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className={`px-8 py-4 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors`}>Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all">
                  {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} Register New Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className={`max-w-md w-full p-8 text-center animate-in fade-in duration-200 ${theme.modalBody} space-y-6`}>
            <div className={`flex justify-between items-center pb-4 border-b border-white/60`}>
              <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme.textMain}`}><Upload size={18} className="text-orange-600"/> Bulk Asset Import</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className={`p-2.5 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl cursor-pointer transition-colors`}><X size={16}/></button>
            </div>
            
            <div className="space-y-4 text-left">
              <button className={`w-full py-4 bg-white/60 border border-white/80 text-slate-800 hover:bg-white/90 shadow-sm rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer`}>
                <Download size={16} className="text-orange-600"/> <span>Download CSV Template</span>
              </button>
            </div>

            <div className={`p-8 border-2 border-dashed border-white/80 bg-white/50 hover:bg-white/60 rounded-3xl transition-colors flex flex-col items-center justify-center gap-5`}>
              <FileSpreadsheet size={48} className="text-orange-600 animate-pulse" />
              <input type="file" accept=".csv" className={`w-full text-xs font-bold cursor-pointer transition-all file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:cursor-pointer text-slate-900 file:bg-orange-600 file:text-white hover:file:opacity-90 shadow-sm`} />
            </div>

            <button className={`w-full py-4 bg-white/40 border border-white/80 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm cursor-not-allowed`}>
              Execute Batch Upload
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AssetRegistryPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FCF9F8]"><Loader2 className="w-12 h-12 animate-spin text-orange-600" /></div>}>
      <AssetRegistryContent />
    </Suspense>
  );
}