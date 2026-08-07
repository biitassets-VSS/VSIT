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
  Keyboard, RectangleHorizontal, Monitor, Sparkles, History as HistoryIcon,
  Filter, FilterX, ShieldCheck, FileText, Cpu, Zap
} from 'lucide-react';

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

const PremiumGlassDropdown = ({ value, onChange, options, theme, isDarkMode, className = "px-3 py-2.5" }: any) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o:any) => o.value === value)?.label || value;

  return (
    <div className={`relative w-full ${open ? 'z-50' : 'z-10'}`} ref={wrapperRef}>
      <div 
        onClick={() => setOpen(!open)} 
        className={`flex items-center justify-between w-full ${className} ${theme.inputBg} rounded-xl transition-all shadow-xs cursor-pointer border ${
          open ? 'border-orange-500 ring-2 ring-orange-500/20' : isDarkMode ? 'border-white/20' : 'border-white/70'
        }`}
      >
        <span className={`text-xs font-semibold truncate pr-4 ${theme.text}`}>{selectedLabel}</span>
        <ChevronDown size={14} className={`${theme.subText} shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className={`absolute top-full left-0 mt-1 w-full min-w-48 p-1.5 rounded-xl shadow-2xl backdrop-blur-3xl border ${
          isDarkMode ? 'bg-zinc-900/95 border-zinc-700/80 shadow-black' : 'bg-white/95 border-slate-200/90 shadow-slate-300/50'
        } overflow-hidden`}>
          <div className="max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
            {options.map((opt:any) => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all flex items-center gap-2 ${
                  value === opt.value
                    ? 'bg-linear-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : (isDarkMode ? 'text-zinc-200 hover:bg-zinc-800/90' : 'text-slate-800 hover:bg-slate-100')
                }`}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SearchableStaffDropdown = ({ value, onChange, staffList, placeholder = "Type employee name or EMP code...", theme, isDarkMode }: any) => {
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
    <div className={`relative w-full ${open ? 'z-50' : 'z-10'}`} ref={wrapperRef}>
      <div className={`flex items-center w-full p-2.5 ${theme.inputBg} rounded-xl transition-all shadow-xs border ${open ? 'border-orange-500 ring-2 ring-orange-500/20' : isDarkMode ? 'border-white/20' : 'border-white/70'}`}>
        <Search size={14} className={`mr-2 shrink-0 ${theme.subText}`} />
        <input type="text" value={open ? query : query || ''} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} className={`w-full text-xs font-semibold outline-none bg-transparent ${theme.text} placeholder:text-slate-400 dark:placeholder:text-zinc-500`} />
        {value && <X size={14} className="text-rose-500 hover:text-rose-700 cursor-pointer mr-2" onClick={() => { onChange(''); setQuery(''); }} />}
        <ChevronDown size={14} className={`cursor-pointer ${theme.subText}`} onClick={() => setOpen(!open)} />
      </div>
      
      {open && (
        <div className={`absolute top-full left-0 mt-1 w-full p-1.5 rounded-xl shadow-2xl backdrop-blur-3xl border ${
          isDarkMode ? 'bg-zinc-900/95 border-zinc-700/80 shadow-black' : 'bg-white/95 border-slate-200/90 shadow-slate-300/50'
        } overflow-hidden`}>
          <div onClick={() => { onChange(''); setQuery(''); setOpen(false); }} className={`p-2.5 text-[10px] font-bold uppercase cursor-pointer rounded-lg flex items-center justify-center gap-2 mb-1 ${isDarkMode ? 'text-orange-400 bg-zinc-800 hover:bg-zinc-700' : 'text-orange-600 bg-slate-100 hover:bg-slate-200'}`}>
            <Package size={14}/> Unassign / Return to Stock
          </div>
          
          <div className="max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
            {query.trim().length === 0 ? (
              <div className={`p-3 text-center text-[11px] font-semibold ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>🔍 Type an employee name or EMP code...</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-center text-[11px] font-semibold text-rose-500">No employee found for "{query}".</div>
            ) : (
              filtered.map((s: any) => (
                <div key={s.id} className={`p-2.5 text-[11px] cursor-pointer rounded-lg flex justify-between items-center transition-all ${isDarkMode ? 'text-zinc-200 hover:bg-zinc-800' : 'text-slate-800 hover:bg-slate-100'}`} onClick={() => { onChange(s.id); setQuery(`${s.full_name || s.name} (${s.emp_code || s.email})`); setOpen(false); }}>
                  <span className="font-semibold">{s.full_name || s.name}</span>
                  <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold shadow-xs ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>{s.emp_code || s.email}</span>
                </div>
              ))
            )}
          </div>
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [conditionFilter, setConditionFilter] = useState<string>('All');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

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

  const filterStatusOptions = [
    { value: 'All', label: '📦 All Stock Statuses' },
    { value: 'In Stock', label: '🟢 In Stock (Unassigned)' },
    { value: 'Assigned', label: '👤 Assigned' },
    { value: 'Pending Handover', label: '⏳ Pending Handover' },
    { value: 'In Repair', label: '🛠️ In Repair' },
    { value: 'Demo Use', label: '🧪 Demo Use' }
  ];

  const filterConditionOptions = [
    { value: 'All', label: '✨ All Conditions' },
    { value: 'New', label: '✨ New' },
    { value: 'Refurbished', label: '🔄 Refurbished' },
    { value: 'Repaired', label: '🛠️ Repaired' }
  ];

  const formConditionOptions = [
    { value: 'New', label: '✨ New' },
    { value: 'Refurbished', label: '🔄 Refurbished' },
    { value: 'Repaired', label: '🛠️ Repaired' }
  ];

  const formStatusOptions = [
    { value: 'In Stock (Unassigned)', label: '📦 In Stock' },
    { value: 'Assigned', label: '👤 Assigned' },
    { value: 'Demo Use', label: '🧪 Demo' },
    { value: 'In Repair', label: '⚠️ Repair' },
    { value: 'Discard', label: '🗑️ Discard' }
  ];

  const newAssetStockOptions = [
    { value: 'In Stock (Unassigned)', label: '📦 In Stock' },
    { value: 'Demo Use', label: '🧪 Demo' }
  ];

  const inspectionOptions = [
    { value: 'Approved', label: '✅ Approved' },
    { value: 'Re-Inspection', label: '🔄 Re-Inspection' },
    { value: 'Not Approved', label: '⚠️ Not Approved' },
    { value: 'Rejected', label: '❌ Rejected' }
  ];

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
    };
    
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    fetchRegistryData();

    return () => observer.disconnect();
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
    if (s.includes('Assigned')) return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 shadow-xs';
    if (s.includes('Repair')) return 'bg-orange-500/10 border border-orange-500/30 text-orange-500 shadow-xs animate-pulse';
    if (s.includes('Demo')) return 'bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-xs';
    if (s.includes('Pending')) return 'bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-xs';
    return 'bg-blue-500/10 border border-blue-500/30 text-blue-500 shadow-xs';
  };

  const getInspectionStatusColor = (status: string) => {
    const s = safeString(status).toLowerCase().trim();
    if (s.includes('approved')) return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 shadow-xs';
    if (s.includes('return')) return 'bg-purple-500/10 border border-purple-500/30 text-purple-500 shadow-xs';
    if (s.includes('rejected')) return 'bg-rose-500/10 border border-rose-500/30 text-rose-500 shadow-xs';
    return 'bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-xs';
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

  const theme = {
    bg: 'bg-transparent',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/30 backdrop-blur-[40px] backdrop-saturate-[1.5] border border-white/50 shadow-[0_16px_40px_rgba(31,38,135,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',
    glassInnerCard: isDarkMode 
      ? 'bg-black/30 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]' 
      : 'bg-white/50 backdrop-blur-xl border border-white/70 shadow-xs shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]',
    glassItem: isDarkMode
      ? 'bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300'
      : 'bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-300',
    inputBg: isDarkMode 
      ? 'bg-black/40 border border-white/10 text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20' 
      : 'bg-white/50 border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] text-slate-900 focus:bg-white/70 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10',
    tabActive: 'bg-orange-500 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] border border-orange-500 scale-[1.02]',
  };

  return (
    <div className={`min-h-screen ${theme.bg} relative overflow-x-hidden font-sans antialiased pb-12 transition-colors duration-1000`}>
      <div className="fixed top-[-5%] left-[-5%] w-[45vw] h-[45vh] bg-orange-500/20 dark:bg-orange-600/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[45vw] h-[45vh] bg-purple-500/20 dark:bg-purple-700/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 mx-auto space-y-6 pt-6 relative z-10">
        
        {/* BRAND HEADER */}
        <div className={`${theme.glassCard} rounded-4xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5`}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className={`p-3 ${theme.glassItem} rounded-2xl ${theme.textSub} hover:scale-105 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 transition-all cursor-pointer`}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <ShieldCheck className="text-orange-500 w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
                  <span>Asset Records</span>
                </h1>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-xs`}>{assets.length} Units</span>
              </div>
              <p className={`text-xs font-semibold ${theme.textSub}`}>Manage full hardware lifecycle, smart QR stickers, and S/N tags</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedAssetIds.size > 0 && (
              <button onClick={() => setIsPrintConfigModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border border-purple-500">
                <Printer size={14} /> <span>Print {selectedAssetIds.size} QRs</span>
              </button>
            )}
            <button onClick={() => setIsBulkModalOpen(true)} className={`flex items-center gap-1.5 px-4 py-2.5 ${theme.glassItem} ${theme.textMain} hover:opacity-90 rounded-xl transition-all hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 text-[11px] font-bold uppercase tracking-wider cursor-pointer`}>
              <FileSpreadsheet size={14} className="text-orange-500" /> <span>Bulk Upload</span>
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border border-orange-400">
              <PlusCircle size={14} /> <span>New Asset</span>
            </button>
          </div>
        </div>

        {/* TABS & SEARCH */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
            {[
              { name: 'All', icon: <Package size={14}/> }, 
              { name: 'Laptop', icon: <Laptop size={14}/> },
              { name: 'Accessories', icon: <Mouse size={14}/> }, 
              { name: 'Headphone', icon: <Headphones size={14}/> },
              { name: 'Other', icon: <SlidersHorizontal size={14}/> }
            ].map(cat => {
              const isActive = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name} onClick={() => setSelectedCategory(cat.name)}
                  className={`group flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer border ${
                    isActive ? theme.tabActive : `${theme.glassItem} ${theme.textSub} hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-orange-500 group-hover:text-orange-600 dark:text-orange-400 dark:group-hover:text-orange-300 transition-colors'}>{cat.icon}</span> 
                  <span className="hidden sm:inline">{cat.name}</span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                  }`}>{getCatCount(cat.name)}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <button 
              onClick={handleSelectAllFiltered} 
              className={`px-3 py-2.5 shrink-0 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-all hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 cursor-pointer ${theme.glassItem} ${theme.textMain}`}
            >
              <CheckSquare size={16} className={selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? 'text-orange-500' : 'text-purple-500'} /> 
              <span>{selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>

            <div className={`flex-1 p-1 ${theme.inputBg} rounded-xl transition-all border flex items-center`}>
              <div className="relative w-full">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by Asset Name, Tag ID, Brand, Category, S/N, or Staff..." 
                  className={`w-full pl-9 pr-3 py-1.5 text-xs font-semibold outline-none bg-transparent ${theme.textMain} placeholder:text-slate-400 dark:placeholder:text-zinc-500 border-0 shadow-none`}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${theme.textMain}`}>
                <Filter size={14} className="text-orange-500" /> Filter:
              </span>
              
              <div className="w-40">
                <PremiumGlassDropdown 
                  value={statusFilter} 
                  onChange={setStatusFilter} 
                  options={filterStatusOptions} 
                  theme={theme} 
                  isDarkMode={isDarkMode}
                  className="py-2 px-3"
                />
              </div>

              <div className="w-40">
                <PremiumGlassDropdown 
                  value={conditionFilter} 
                  onChange={setConditionFilter} 
                  options={filterConditionOptions} 
                  theme={theme} 
                  isDarkMode={isDarkMode}
                  className="py-2 px-3"
                />
              </div>

              {(statusFilter !== 'All' || conditionFilter !== 'All' || searchQuery !== '' || selectedCategory !== 'All') && (
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setConditionFilter('All');
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs shrink-0 border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  <FilterX size={12} className="text-orange-500" /> <span>Reset</span>
                </button>
              )}
            </div>

            <span className={`text-[10px] font-semibold ${theme.textSub} shrink-0`}>
              Showing <strong className="text-orange-500 font-bold">{filteredAssets.length}</strong> of {assets.length}
            </span>
          </div>
        </div>

        {/* ASSET GRID */}
        {loading ? (
          <div className={`${theme.glassCard} rounded-3xl w-full py-24 flex flex-col items-center justify-center gap-3`}>
            <Loader2 size={32} className="animate-spin text-orange-500" />
            <span className={`text-[11px] font-bold tracking-widest uppercase ${theme.textMain}`}>Loading Asset Records...</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className={`${theme.glassCard} rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-3`}>
            <Package size={48} className="text-orange-500 opacity-80" />
            <h3 className={`text-lg font-bold ${theme.textMain}`}>No Hardware Found</h3>
            <p className={`text-[11px] font-medium max-w-sm ${theme.textSub}`}>No assets match your selected filter combination.</p>
            <button onClick={() => { setStatusFilter('All'); setConditionFilter('All'); setSearchQuery(''); setSelectedCategory('All'); }} className="mt-3 px-6 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-orange-400">
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredAssets.map(asset => {
              const isSelected = selectedAssetIds.has(asset.id);

              return (
                <div key={asset.id} onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('input')) return;
                  toggleSelectAsset(asset.id);
                }} className={`${theme.glassItem} rounded-3xl flex flex-col justify-between group cursor-pointer ${isSelected ? 'border-orange-500/80 ring-2 ring-orange-500/50 bg-orange-500/5' : 'hover:-translate-y-1 hover:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 dark:hover:shadow-[0_0_20px_rgba(249,115,22,0.6)]'} overflow-hidden`}>
                  
                  <div className={`p-4 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${theme.glassInnerCard} text-orange-500`}>
                          {getCategoryIcon(asset.category, 16)}
                        </div>
                        <div className="overflow-hidden min-w-0">
                          <h3 className={`text-xs font-bold leading-tight truncate ${theme.textMain}`} title={asset.safe_display_name}>{asset.safe_display_name}</h3>
                          <p className={`text-[10px] font-medium mt-0.5 truncate ${theme.textSub}`}>{asset.brand || 'Standard Brand'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <button onClick={(e) => { e.stopPropagation(); openAssetViewModal(asset); }} className={`p-2 ${theme.glassInnerCard} ${theme.textMain} hover:scale-110 hover:text-orange-500 cursor-pointer transition-transform rounded-lg`}>
                          <QrCode size={14} />
                        </button>
                        <input type="checkbox" checked={isSelected} readOnly className="w-3.5 h-3.5 rounded cursor-pointer accent-orange-500" />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all duration-300 cursor-default ${getStockStatusBadge(asset.status)}`}>{asset.status || 'In Stock'}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider border border-zinc-500/30 text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 cursor-default`}>{asset.asset_condition || 'New'}</span>
                    </div>
                  </div>

                  <div className={`p-4 space-y-2 flex-1 ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                    <div className={`flex justify-between items-center p-2 ${theme.glassInnerCard} rounded-xl`}>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${theme.textSub}`}>Tag ID</span> 
                      <span className="font-mono font-semibold text-[10px] text-orange-500 dark:text-orange-400">{asset.clean_tag}</span>
                    </div>
                    <div className={`flex justify-between items-center p-2 ${theme.glassInnerCard} rounded-xl`}>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${theme.textSub}`}>Serial S/N</span> 
                      <span className={`font-mono font-medium text-[10px] truncate max-w-28 ${theme.textMain}`} title={asset.serial_number}>{asset.serial_number || 'N/A'}</span>
                    </div>
                    
                    <div className={`flex justify-between items-center p-2 ${theme.glassInnerCard} rounded-xl`}>
                      <div className="flex flex-col min-w-0 pr-1.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${theme.textSub}`}>Holder</span> 
                        <span className={`font-medium text-[10px] truncate ${theme.textMain} mt-0.5`} title={asset.staff_name}>{asset.staff_name}</span>
                      </div>
                      <span className={`font-mono font-semibold px-1.5 py-0.5 rounded text-[9px] shadow-xs shrink-0 border ${isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>{asset.emp_code}</span>
                    </div>
                  </div>

                  <div className={`p-3 sm:p-4 border-t ${isDarkMode ? 'border-white/10' : 'border-white/40'} flex items-center justify-between`}>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className={theme.textSub} />
                      <div className="flex flex-col">
                        <span className={`text-[7px] font-bold uppercase tracking-wider ${theme.textSub}`}>Last Audited</span>
                        <span className={`text-[9px] font-mono font-medium ${theme.textMain}`}>{safeDate(asset.live_inspection_date)}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg font-semibold transition-all duration-300 cursor-default ${getInspectionStatusColor(asset.live_inspection_status)}`}>
                      {(() => {
                        const st = (asset.live_inspection_status || '').toLowerCase().trim();
                        if (st.includes('approved')) return <CheckCircle2 size={10} />;
                        if (st.includes('return')) return <RefreshCw size={10} className="animate-spin" />;
                        return <AlertTriangle size={10} />;
                      })()}
                      <span className="text-[8px] font-bold uppercase tracking-wider">{asset.live_inspection_status || 'Approved'}</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRINT SETTINGS UI MODAL */}
      {isPrintConfigModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 ${isDarkMode ? 'bg-slate-950/60' : 'bg-slate-900/40'}`}>
          <div className={`max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 ${theme.glassCard} rounded-3xl border-2 ${isDarkMode ? 'border-orange-500/30' : 'border-white/80'}`}>
            <div className={`flex justify-between items-center pb-3 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <div>
                <h3 className={`text-base font-bold tracking-tight flex items-center gap-2 ${theme.textMain}`}>
                  <Settings2 size={18} className="text-orange-500"/> Label Print Layout
                </h3>
                <p className={`text-[9px] mt-1 uppercase tracking-widest font-bold text-amber-600 bg-amber-500/10 inline-block px-2.5 py-0.5 rounded-lg border border-amber-500/20`}>
                  Important: Uncheck "Fit to Page", set Margins to "None".
                </p>
              </div>
              <button onClick={() => setIsPrintConfigModalOpen(false)} className={`p-2 ${theme.glassInnerCard} ${theme.textMain} hover:bg-rose-500 hover:text-white transition-all rounded-full cursor-pointer`}><X size={14}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <h4 className={`text-[11px] font-bold uppercase tracking-widest text-orange-500`}>Sheet Formatting</h4>
                <div>
                  <label className={`text-[9px] font-bold uppercase block mb-1 ${theme.textSub}`}>Paper Size</label>
                  <PremiumGlassDropdown 
                    value={printConfig.pageSize} 
                    onChange={(val: string) => setPrintConfig({...printConfig, pageSize: val})} 
                    options={[
                      { value: 'A4', label: 'A4 (210 x 297mm)' },
                      { value: 'Letter', label: 'US Letter (8.5 x 11in)' }
                    ]} 
                    theme={theme} 
                    isDarkMode={isDarkMode}
                    className="py-2 px-3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div><label className={`text-[9px] font-bold uppercase block mb-1 ${theme.textSub}`}>Columns</label><input type="number" min="1" value={printConfig.columns} onChange={e => setPrintConfig({...printConfig, columns: parseInt(e.target.value) || 1})} className={`w-full p-2 ${theme.inputBg} rounded-xl outline-none font-semibold text-xs`} /></div>
                  <div><label className={`text-[9px] font-bold uppercase block mb-1 ${theme.textSub}`}>Rows</label><input type="number" min="1" value={printConfig.rows} onChange={e => setPrintConfig({...printConfig, rows: parseInt(e.target.value) || 1})} className={`w-full p-2 ${theme.inputBg} rounded-xl outline-none font-semibold text-xs`} /></div>
                </div>
              </div>
              <div className="space-y-2.5">
                <h4 className={`text-[11px] font-bold uppercase tracking-widest text-orange-500`}>Label Dimensions</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div><label className={`text-[9px] font-bold uppercase block mb-1 ${theme.textSub}`}>Width (cm)</label><input type="number" step="0.01" value={printConfig.labelWidth} onChange={e => setPrintConfig({...printConfig, labelWidth: parseFloat(e.target.value) || 1})} className={`w-full p-2 ${theme.inputBg} rounded-xl outline-none font-semibold text-xs`} /></div>
                  <div><label className={`text-[9px] font-bold uppercase block mb-1 ${theme.textSub}`}>Height (cm)</label><input type="number" step="0.01" value={printConfig.labelHeight} onChange={e => setPrintConfig({...printConfig, labelHeight: parseFloat(e.target.value) || 1})} className={`w-full p-2 ${theme.inputBg} rounded-xl outline-none font-semibold text-xs`} /></div>
                </div>
              </div>
            </div>

            <div className={`flex gap-3 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <button onClick={() => setIsPrintConfigModalOpen(false)} className={`flex-1 py-2.5 ${theme.glassInnerCard} ${theme.textMain} hover:opacity-90 rounded-xl transition-colors cursor-pointer text-[11px] font-bold uppercase tracking-wider`}>Cancel</button>
              <button onClick={executeGridBulkPrint} className="flex-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] rounded-xl text-[11px] font-bold uppercase tracking-wider flex justify-center items-center gap-1.5 cursor-pointer transition-all border border-purple-500"><Printer size={14}/> Generate Print Page</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 VIEW MODAL & HISTORY ENGINE (NO OVERLAP) */}
      {viewAssetModal && (() => {
        const liveModalTag = editForm.asset_tag || viewAssetModal.clean_tag;
        const visibleHistory = showFullHistory ? assetHistory : assetHistory.slice(0, 1);

        return (
          <div className={`fixed inset-0 z-50 flex flex-col justify-center items-center p-3 sm:p-4 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto ${isDarkMode ? 'bg-slate-950/60' : 'bg-slate-900/20'}`}>
            <div className={`max-w-3xl w-full max-h-[80vh] my-auto overflow-hidden flex flex-col ${theme.glassCard} rounded-4xl border-2 shadow-[0_32px_80px_rgba(0,0,0,0.4)] ${isDarkMode ? 'border-orange-500/30' : 'border-white/80'}`}>
              
              {/* HEADER WITH PROPER MARGIN & NO OVERLAP */}
              <div className={`w-full p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/50 border-slate-200/60'} shrink-0 relative z-30`}>
                <div className="flex items-center gap-3 w-full md:w-auto min-w-0 pr-12">
                  <div className={`p-2 rounded-xl ${theme.glassInnerCard} shrink-0`}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(getAssetViewUrl(viewAssetModal))}`} alt="QR Code" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-sm sm:text-base font-bold font-mono ${theme.textMain} tracking-wider truncate`}>{liveModalTag}</h3>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider cursor-default shrink-0 ${getStockStatusBadge(viewAssetModal.status)}`}>{viewAssetModal.status || 'In Stock'}</span>
                    </div>
                    <p className={`text-[11px] font-semibold mt-0.5 truncate ${theme.textSub}`} title={editForm.serial || viewAssetModal.serial_number}>
                      S/N: <span className="font-mono font-bold">{editForm.serial || viewAssetModal.serial_number}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end shrink-0 mt-1 md:mt-0 pr-12 md:pr-14">
                  <button onClick={() => handlePrintPhysicalSticker(viewAssetModal, liveModalTag)} className={`px-3 py-1.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-xl text-[10px] font-bold uppercase tracking-wider flex justify-center items-center gap-1.5 transition-all cursor-pointer border border-orange-400`}>
                    <Printer size={14} /> <span>Print QR</span>
                  </button>
                  {!isEditingAsset && (
                    <>
                      <button onClick={() => setIsEditingAsset(true)} className={`px-3 py-1.5 ${theme.glassInnerCard} ${theme.textMain} hover:opacity-90 hover:text-orange-500 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors`}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button onClick={() => handleDeleteAsset(viewAssetModal.id)} className={`px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors`}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>

                <button onClick={() => setViewAssetModal(null)} className={`absolute top-4 right-4 p-2 rounded-full ${theme.glassInnerCard} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-400 transition-all cursor-pointer shadow-xs active:scale-90 z-40`}><X size={16}/></button>
              </div>

              {/* SCROLLABLE BODY */}
              <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 ${isEditingAsset ? 'pb-32' : 'pb-4'}`}>
                {isEditingAsset ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className={`flex justify-between items-center pb-1.5 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest text-orange-500`}>Editing Hardware Record</span>
                    </div>

                    <div className={`relative z-70 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 ${theme.glassInnerCard} rounded-3xl border ${isDarkMode ? 'border-white/10' : 'border-white/70'}`}>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Asset Category *</label>
                        <PremiumGlassDropdown 
                          value={editForm.category} 
                          onChange={(newCat: string) => { 
                            setEditForm({ ...editForm, category: newCat, asset_tag: generateCategoryPrefix(newCat, editForm.asset_tag) }); 
                          }} 
                          options={ASSET_CATEGORIES.map(c => ({ value: c, label: c }))} 
                          theme={theme} 
                          isDarkMode={isDarkMode}
                          className="py-2.5 px-3"
                        />
                      </div>
                      <div>
                        <div className={`flex flex-wrap justify-between items-center gap-2 mb-1.5`}>
                          <label className={`text-[9px] font-bold uppercase tracking-widest ${theme.textMain}`}>Asset Tag ID</label>
                          <button type="button" onClick={() => setEditForm({...editForm, asset_tag: generateCategoryPrefix(editForm.category)})} className="px-2 py-0.5 rounded-md bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs border border-orange-400 cursor-pointer active:scale-95">
                            <RefreshCw size={10} className="shrink-0" />
                            <span>Generate New</span>
                          </button>
                        </div>
                        <input type="text" value={editForm.asset_tag} onChange={e => setEditForm({...editForm, asset_tag: e.target.value})} className={`w-full p-2.5 ${theme.inputBg} rounded-xl font-mono uppercase text-xs font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                    </div>

                    <div className="relative z-60">
                      <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Factory Serial Number (Laptop S/N) *</label>
                      <input type="text" required value={editForm.serial} onChange={e => setEditForm({...editForm, serial: e.target.value})} placeholder="e.g. M27370-00105" className={`w-full p-2.5 ${theme.inputBg} rounded-xl font-mono uppercase text-xs font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                    </div>

                    <div className="relative z-50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Brand / Manufacturer</label>
                        <input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-xs font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                      <div>
                        <div className={`flex flex-wrap justify-between items-center gap-2 mb-1.5`}>
                          <label className={`text-[9px] font-bold uppercase tracking-widest ${theme.textMain}`}>Asset Name *</label>
                          <button type="button" onClick={() => setEditForm({...editForm, system_specs: autoDetectSpecs(`${editForm.name} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)})} className="px-2.5 py-1 rounded-lg bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-[0_4px_15px_rgba(249,115,22,0.4)] border border-orange-400 cursor-pointer active:scale-95">
                            <Zap size={10} className="shrink-0" />
                            <span>Auto-Detect Specs</span>
                          </button>
                        </div>
                        <input type="text" value={editForm.name} onChange={e => { const v = e.target.value; setEditForm({...editForm, name: v, system_specs: autoDetectSpecs(`${v} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)}); }} className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-xs font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                    </div>

                    <div className="relative z-40 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Price (₹)</label>
                        <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className={`w-full p-2.5 ${theme.inputBg} rounded-xl font-mono text-xs font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Purchase Date</label>
                        <input type="date" value={editForm.purchase_date} onChange={e => setEditForm({...editForm, purchase_date: e.target.value})} className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-xs font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Warranty Expiry</label>
                        <input type="date" value={editForm.warranty_expiry} onChange={e => setEditForm({...editForm, warranty_expiry: e.target.value})} className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-xs font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                    </div>

                    <div className="relative z-30 space-y-2">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <label className={`text-[9px] font-bold uppercase tracking-widest ${theme.textMain}`}>System Hardware Specifications</label>
                        <button type="button" onClick={() => setEditForm({...editForm, system_specs: autoDetectSpecs(`${editForm.name} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)})} className="px-2 py-0.5 rounded-md bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs border border-orange-400 cursor-pointer active:scale-95">
                          <Zap size={10} className="shrink-0" />
                          <span>Auto-Detect</span>
                        </button>
                      </div>
                      <input type="text" value={editForm.system_specs} onChange={e => setEditForm({...editForm, system_specs: e.target.value})} placeholder="e.g. Intel Core i7 (vPro) | 16GB RAM | 512GB SSD | Win 11 Pro" className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-xs font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                    </div>

                    <div className={`relative z-20 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Condition</label>
                        <PremiumGlassDropdown 
                          value={editForm.condition} 
                          onChange={(val: string) => setEditForm({...editForm, condition: val})} 
                          options={formConditionOptions} 
                          theme={theme} 
                          isDarkMode={isDarkMode}
                          className="py-2.5 px-3"
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Stock Status</label>
                        <PremiumGlassDropdown 
                          value={editForm.status} 
                          onChange={(val: string) => setEditForm({...editForm, status: val})} 
                          options={formStatusOptions} 
                          theme={theme} 
                          isDarkMode={isDarkMode}
                          className="py-2.5 px-3"
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Inspection State</label>
                        <PremiumGlassDropdown 
                          value={editForm.inspection_status} 
                          onChange={(val: string) => setEditForm({...editForm, inspection_status: val})} 
                          options={inspectionOptions} 
                          theme={theme} 
                          isDarkMode={isDarkMode}
                          className="py-2.5 px-3"
                        />
                      </div>
                    </div>

                    <div className={`relative z-10 p-4 ${theme.glassInnerCard} rounded-3xl border ${isDarkMode ? 'border-white/10' : 'border-white/80'}`}>
                      <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Re-Assign Holder</label>
                      <SearchableStaffDropdown value={editForm.assignee} onChange={(val: string) => setEditForm({...editForm, assignee: val})} staffList={staffList} placeholder="Type employee name or EMP code..." theme={theme} isDarkMode={isDarkMode} />
                    </div>

                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className={`p-3.5 ${theme.glassInnerCard} rounded-2xl`}><p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Category</p><p className={`text-xs font-bold mt-1 text-orange-500`}>{viewAssetModal.category || 'Laptop'}</p></div>
                      <div className={`p-3.5 ${theme.glassInnerCard} rounded-2xl`}><p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Brand</p><p className={`text-xs font-bold mt-1 ${theme.textMain}`}>{viewAssetModal.brand || 'N/A'}</p></div>
                      <div className={`p-3.5 ${theme.glassInnerCard} rounded-2xl`}><p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Assets Name</p><p className={`text-xs font-bold mt-1 truncate ${theme.textMain}`} title={viewAssetModal.safe_display_name}>{viewAssetModal.safe_display_name}</p></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className={`p-3.5 ${theme.glassInnerCard} rounded-2xl`}><p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Purchase Date</p><p className={`text-xs font-semibold mt-1 ${theme.textMain}`}>{safeDate(viewAssetModal.purchase_date)}</p></div>
                      <div className={`p-3.5 ${theme.glassInnerCard} rounded-2xl`}><p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Warranty Date</p><p className={`text-xs font-semibold mt-1 ${theme.textMain}`}>{safeDate(viewAssetModal.warranty_expiry)}</p></div>
                      <div className={`p-3.5 flex flex-col justify-center ${theme.glassInnerCard} rounded-2xl`}><p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Inspection Status</p><div className="flex items-center gap-1 mt-1"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase transition-all ${getInspectionStatusColor(viewAssetModal.live_inspection_status)}`}>{viewAssetModal.live_inspection_status || 'Approved'}</span></div></div>
                    </div>

                    <div className={`p-3.5 flex items-center gap-3 ${theme.glassInnerCard} rounded-2xl`}>
                      <Cpu size={18} className="text-orange-500 shrink-0" />
                      <div className="w-full">
                        <span className={`text-[9px] font-bold uppercase tracking-widest block ${theme.textSub}`}>System Hardware Configuration:</span>
                        <p className={`text-xs font-semibold mt-0.5 ${theme.textMain}`}>{viewAssetModal.system_specs || 'Standard Business Hardware Configuration'}</p>
                      </div>
                    </div>

                    <div className={`p-3.5 flex items-center justify-between ${theme.glassInnerCard} rounded-2xl`}>
                      <div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest block mb-0.5 ${theme.textSub}`}>Assigned Employee Holder:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.glassInnerCard} text-orange-500`}><User size={14}/></div>
                          <span className={`text-sm font-bold ${theme.textMain}`}>{viewAssetModal.staff_name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className={`text-[8px] font-bold uppercase tracking-widest mb-0.5 ${theme.textSub}`}>EMP CODE</span>
                         <span className={`font-mono font-bold px-3 py-1.5 rounded-lg text-[10px] border shadow-xs ${isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-200'} shrink-0`}>
                           {viewAssetModal.emp_code}
                         </span>
                      </div>
                    </div>

                    {(viewAssetModal.assigned_to || viewAssetModal.status === 'Assigned' || viewAssetModal.status === 'Pending Handover') && (
                      <div className={`p-4 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md rounded-2xl shadow-xs`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] shrink-0 border border-emerald-400">
                              <FileText size={16} />
                            </div>
                            <div>
                              <h4 className={`text-[11px] font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400`}>Official Handover Agreement</h4>
                              <p className={`text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-500/80 mt-0.5`}>Digitally executed custody document with specs and policies.</p>
                            </div>
                          </div>
                          <button onClick={() => handleGenerateHandoverPDF(viewAssetModal)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 border border-emerald-400">
                            <Download size={14} /> <span>PDF</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={`p-4 ${theme.glassInnerCard} rounded-3xl`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <HistoryIcon size={14} className="text-orange-500" />
                          <h4 className={`text-[11px] font-bold uppercase tracking-widest ${theme.textMain}`}>Lifecycle & Activity History</h4>
                        </div>
                        {assetHistory.length > 1 && (
                          <button onClick={() => setShowFullHistory(!showFullHistory)} className={`text-[9px] font-bold text-orange-500 hover:underline cursor-pointer flex items-center gap-1 ${theme.glassInnerCard} px-2 py-1 rounded-lg`}>
                            {showFullHistory ? (<><span>Show Less</span> <ChevronUp size={12}/></>) : (<><span>Full History ({assetHistory.length})</span> <ChevronDown size={12}/></>)}
                          </button>
                        )}
                      </div>
                      
                      {isLoadingHistory ? (
                        <div className="flex justify-center p-3"><Loader2 className="animate-spin text-orange-500 size-5"/></div>
                      ) : assetHistory.length === 0 ? (
                        <p className={`text-[11px] font-medium italic ${theme.textSub}`}>No history logs found for this asset.</p>
                      ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
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
                              <div key={idx} className={`p-3 ${theme.glassInnerCard} rounded-2xl shadow-xs border ${isDarkMode ? 'border-white/10' : 'border-white/60'}`}>
                                <div className="flex justify-between items-start mb-1.5">
                                  <div>
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border transition-all ${getInspectionStatusColor(log.status)}`}>{log.status}</span>
                                    <p className={`text-xs font-bold mt-1.5 ${theme.textMain}`}>{log.staff_name} <span className="text-purple-500 dark:text-purple-400 font-mono">({log.emp_code})</span></p>
                                  </div>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${theme.glassInnerCard} ${theme.textSub}`}>{safeDate(log.created_at)}</span>
                                </div>
                                {log.notes && (
                                  <div className={`mt-1.5 text-xs font-medium p-2.5 ${theme.glassInnerCard} ${theme.textMain} rounded-xl whitespace-pre-wrap border ${isDarkMode ? 'border-white/10' : 'border-white/60'}`}>
                                    {log.notes}
                                  </div>
                                )}
                                {photosArray.length > 0 && (
                                  <div className="flex gap-2 mt-2 overflow-x-auto custom-scrollbar pb-1">
                                    {photosArray.map((url, i) => (
                                      <img key={`hist-photo-${i}`} src={url} alt="Log" className="h-10 w-10 rounded-lg object-cover border border-white/20 shadow-xs" />
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

              {/* FIXED FOOTER */}
              {isEditingAsset && (
                <div className={`p-4 sm:p-5 shrink-0 flex gap-3 border-t ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/60 bg-white/50'}`}>
                  <button type="button" onClick={() => setIsEditingAsset(false)} className={`px-6 py-2.5 rounded-xl ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700' : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'} backdrop-blur-xl border transition-all text-[11px] font-bold uppercase tracking-widest cursor-pointer shadow-xs active:scale-95`}>Cancel</button>
                  <button type="button" onClick={handleUpdateExistingAsset} disabled={isUpdating} className="flex-1 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-xs rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-orange-400 active:scale-95 disabled:opacity-50">
                    {isUpdating ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Secure Record
                  </button>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* 🚀 ADD NEW ASSET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xl animate-in fade-in duration-200">
          <div 
            className={`max-w-2xl w-full max-h-[85vh] my-auto overflow-hidden flex flex-col ${theme.glassCard} rounded-4xl border-2 ${
              isDarkMode ? 'border-orange-500/30 bg-zinc-900/80' : 'border-white/90 bg-white/70'
            } shadow-[0_32px_80px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200`}
          >
            {/* MAC OS MODAL HEADER */}
            <div 
              className={`p-4 sm:p-5 border-b ${
                isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/60 bg-white/50'
              } backdrop-blur-2xl flex items-center justify-between shrink-0 relative z-30`}
            >
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className={`absolute top-3.5 right-3.5 p-2 rounded-full ${theme.glassInnerCard} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-400 transition-all cursor-pointer shadow-xs active:scale-90 z-20`}
                title="Close Modal"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 pr-12 min-w-0">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 shrink-0">
                  <PlusCircle size={20} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <h3 className={`text-sm sm:text-base font-bold tracking-tight truncate ${theme.textMain}`}>
                    Register New Asset
                  </h3>
                  <p className={`text-[10px] font-semibold truncate ${theme.textSub}`}>
                    Add a new hardware unit to your IT inventory
                  </p>
                </div>
              </div>
            </div>
            
            {/* FORM BODY */}
            <form onSubmit={handleSaveNewAsset} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-4 sm:p-6 space-y-5 pb-32">
                
                {/* SECTION 1: CATEGORY & TAG */}
                <div className={`relative z-70 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 ${theme.glassInnerCard} rounded-3xl border ${isDarkMode ? 'border-white/10' : 'border-white/80'}`}>
                  <div>
                    <label className={`text-[9px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
                      Asset Category *
                    </label>
                    <PremiumGlassDropdown 
                      value={newAssetCategory} 
                      onChange={(newCat: string) => { 
                        setNewAssetCategory(newCat);
                        setNewAssetTag(generateCategoryPrefix(newCat, newAssetTag));
                        if (newCat === 'Laptop') setNewAssetSpecs('Intel Core i7 (11th/12th Gen vPro) | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro');
                        else if (newCat.includes('Keyboard') || newCat.includes('Mouse')) setNewAssetSpecs('USB / Wireless Plug-and-Play Standard Business Accessory');
                        else setNewAssetSpecs('Standard Business Grade IT Hardware Configuration');
                      }} 
                      options={ASSET_CATEGORIES.map(c => ({ value: c, label: c }))} 
                      theme={theme} 
                      isDarkMode={isDarkMode}
                      className="py-2.5 px-3.5"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                      <label className={`text-[9px] font-bold uppercase tracking-widest ${theme.textMain}`}>
                        Asset Tag ID
                      </label>
                      
                      <button 
                        type="button" 
                        onClick={() => setNewAssetTag(generateCategoryPrefix(newAssetCategory))} 
                        className="px-2.5 py-1 rounded-lg bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-[0_4px_15px_rgba(249,115,22,0.4)] border border-orange-400 cursor-pointer active:scale-95"
                      >
                        <RefreshCw size={12} className="shrink-0" />
                        <span>Generate New</span>
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={newAssetTag} 
                      onChange={e => setNewAssetTag(e.target.value)} 
                      className={`w-full p-2.5 ${theme.inputBg} rounded-xl font-mono uppercase text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                </div>

                {/* SECTION 2: SERIAL & VENDOR */}
                <div className="relative z-60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
                      Factory Serial Number (Laptop S/N) *
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={newAssetSerial} 
                      onChange={e => setNewAssetSerial(e.target.value)} 
                      placeholder="e.g. M27370-00105" 
                      className={`w-full p-2.5 ${theme.inputBg} rounded-xl font-mono uppercase text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
                      Vendor Source
                    </label>
                    <input 
                      type="text" 
                      value={newAssetVendor} 
                      onChange={e => setNewAssetVendor(e.target.value)} 
                      placeholder="e.g. Local Supplier, Nabha" 
                      className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                </div>

                {/* SECTION 3: BRAND & NAME */}
                <div className="relative z-50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
                      Brand / Manufacturer
                    </label>
                    <input 
                      type="text" 
                      value={newAssetBrand} 
                      onChange={e => setNewAssetBrand(e.target.value)} 
                      placeholder="e.g. Lenovo, Dell, HP"
                      className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                      <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMain}`}>
                        Asset Name *
                      </label>

                      <button 
                        type="button" 
                        onClick={() => setNewAssetSpecs(autoDetectSpecs(`${newAssetName} ${newAssetBrand} ${newAssetSerial}`, newAssetCategory, newAssetSpecs))} 
                        className="px-2.5 py-1 rounded-lg bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-[0_4px_15px_rgba(249,115,22,0.4)] border border-orange-400 cursor-pointer active:scale-95"
                      >
                        <Zap size={12} className="shrink-0" />
                        <span>Auto-Detect Specs</span>
                      </button>
                    </div>
                    <input 
                      type="text" 
                      required 
                      value={newAssetName} 
                      onChange={e => { 
                        const v = e.target.value; 
                        setNewAssetName(v); 
                        setNewAssetSpecs(autoDetectSpecs(`${v} ${newAssetBrand} ${newAssetSerial}`, newAssetCategory, newAssetSpecs)); 
                      }} 
                      placeholder="e.g. ThinkBook 16s G6"
                      className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                </div>

                {/* SECTION 4: FINANCIALS & DATES */}
                <div className="relative z-40 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
                      Purchase Price (₹)
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={newAssetPrice} 
                      onChange={e => setNewAssetPrice(e.target.value)} 
                      placeholder="0.00"
                      className={`w-full p-2.5 ${theme.inputBg} rounded-xl font-mono text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
                      Purchase Date
                    </label>
                    <input 
                      type="date" 
                      value={newAssetPurchaseDate} 
                      onChange={e => setNewAssetPurchaseDate(e.target.value)} 
                      className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
                      Warranty Expiry
                    </label>
                    <input 
                      type="date" 
                      value={newAssetWarranty} 
                      onChange={e => setNewAssetWarranty(e.target.value)} 
                      className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                </div>

                {/* SECTION 5: HARDWARE SPECIFICATIONS & CHIPS */}
                <div className="relative z-30 space-y-2.5">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMain}`}>
                      Hardware Specifications
                    </label>
                    
                    <button 
                      type="button" 
                      onClick={() => setNewAssetSpecs(autoDetectSpecs(`${newAssetName} ${newAssetBrand} ${newAssetSerial}`, newAssetCategory, newAssetSpecs))} 
                      className="px-2.5 py-1 rounded-lg bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-[0_4px_15px_rgba(249,115,22,0.4)] border border-orange-400 cursor-pointer active:scale-95"
                    >
                      <Zap size={12} className="shrink-0" />
                      <span>Auto-Detect</span>
                    </button>
                  </div>

                  <input 
                    type="text" 
                    value={newAssetSpecs} 
                    onChange={e => setNewAssetSpecs(e.target.value)} 
                    placeholder="e.g. Intel Core i7 (vPro) | 16GB RAM | 512GB SSD | Win 11 Pro" 
                    className={`w-full p-2.5 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                  />

                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-2 pt-1.5">
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
                        className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer border ${
                          newAssetSpecs === preset
                            ? 'bg-orange-500 text-white border-orange-500 shadow-xs scale-105'
                            : `${theme.glassInnerCard} ${theme.textMain} hover:border-orange-500/50 hover:bg-orange-500/10 border-white/60`
                        }`}
                      >
                        ⚡ {preset.split('|')[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SECTION 6: CONDITION & STATUS */}
                <div className={`relative z-20 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
                      Condition State
                    </label>
                    <PremiumGlassDropdown 
                      value={newAssetCondition} 
                      onChange={(val: string) => setNewAssetCondition(val)} 
                      options={formConditionOptions} 
                      theme={theme} 
                      isDarkMode={isDarkMode}
                      className="py-2.5 px-3.5"
                    />
                  </div>

                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
                      Initial Stock Status
                    </label>
                    <PremiumGlassDropdown 
                      value={newAssetStatus} 
                      onChange={(val: string) => setNewAssetStatus(val)} 
                      options={newAssetStockOptions} 
                      theme={theme} 
                      isDarkMode={isDarkMode}
                      className="py-2.5 px-3.5"
                    />
                  </div>
                </div>

                {/* SECTION 7: STAFF ASSIGNEE DROPDOWN */}
                <div className={`relative z-10 p-4 ${theme.glassInnerCard} rounded-3xl border ${isDarkMode ? 'border-white/10' : 'border-white/80'}`}>
                  <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
                    Assign to Employee Holder (Optional)
                  </label>
                  <SearchableStaffDropdown 
                    value={newAssetAssignee} 
                    onChange={(val: string) => setNewAssetAssignee(val)} 
                    staffList={staffList} 
                    placeholder="Type employee name or EMP code..." 
                    theme={theme} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className={`p-4 sm:p-5 shrink-0 flex gap-4 border-t ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/60 bg-white/50'}`}>
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className={`px-6 py-3 rounded-xl ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700' : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'} backdrop-blur-xl border transition-all text-[11px] font-bold uppercase tracking-widest cursor-pointer shadow-xs active:scale-95`}
                >
                  Cancel
                </button>

                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="flex-1 py-3 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all border border-orange-500 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} 
                  <span>Register New Asset</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 🚀 BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-200 ${theme.glassCard} rounded-4xl border-2 ${isDarkMode ? 'border-orange-500/30' : 'border-white/80'} space-y-5`}>
            <div className={`flex justify-between items-center pb-3 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${theme.textMain}`}><Upload size={18} className="text-orange-500"/> Bulk Asset Import</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className={`p-2.5 ${theme.glassInnerCard} ${theme.textMain} hover:scale-105 cursor-pointer transition-colors rounded-full`}><X size={16}/></button>
            </div>
            
            <div className="space-y-4 text-left">
              <button className={`w-full py-3.5 ${theme.glassInnerCard} ${theme.textMain} hover:opacity-90 rounded-2xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer`}>
                <Download size={16} className="text-orange-500"/> <span>Download CSV Template</span>
              </button>
            </div>

            <div className={`p-8 border-2 border-dashed ${isDarkMode ? 'border-white/20 bg-white/5' : 'border-slate-300 bg-white/40'} rounded-3xl transition-colors flex flex-col items-center justify-center gap-4`}>
              <FileSpreadsheet size={48} className="text-orange-500 animate-pulse" />
              <input type="file" accept=".csv" className={`w-full text-xs font-bold cursor-pointer transition-all file:mr-3 file:py-2.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:cursor-pointer ${theme.textMain} file:bg-orange-500 file:text-white hover:file:opacity-90 shadow-xs`} />
            </div>

            <button className={`w-full py-3.5 bg-zinc-500/20 text-zinc-500 rounded-2xl text-[11px] font-bold uppercase tracking-wider border border-zinc-500/20 cursor-not-allowed`}>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-transparent transition-colors"><Loader2 className="w-12 h-12 animate-spin text-orange-500" /></div>}>
      <AssetRegistryContent />
    </Suspense>
  );
}