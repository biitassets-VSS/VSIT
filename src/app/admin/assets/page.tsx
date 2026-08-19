'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Laptop, PlusCircle, Search, QrCode, 
  User, X, Save, RefreshCw, Download, Printer, Edit2, 
  Upload, FileSpreadsheet, Package, Mouse, 
  Headphones, SlidersHorizontal, ChevronDown, ChevronUp, CheckCircle2, 
  Clock, AlertTriangle, Loader2, CheckSquare, Trash2,
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

const PremiumGlassDropdown = ({ value, onChange, options, theme, isDarkMode, className = "px-3 py-3" }: any) => {
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
        className={`flex items-center justify-between w-full ${className} ${theme.inputBg} rounded-xl transition-all shadow-sm cursor-pointer border ${
          open ? 'border-orange-500 ring-2 ring-orange-500/20' : isDarkMode ? 'border-white/20' : 'border-white/60'
        }`}
      >
        <span className={`text-sm font-semibold truncate pr-4 ${theme.textMain}`}>{selectedLabel}</span>
        <ChevronDown size={16} className={`${theme.textSub} shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className={`absolute top-full left-0 mt-1 w-full min-w-48 p-1.5 rounded-xl shadow-2xl backdrop-blur-3xl border ${
          isDarkMode ? 'bg-zinc-900/95 border-zinc-700/80 shadow-black' : 'bg-white/95 border-white/90 shadow-slate-300/50'
        } overflow-hidden`}>
          <div className="max-h-56 overflow-y-auto scrollbar-none flex flex-col gap-0.5">
            {options.map((opt:any) => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`px-3 py-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-all flex items-center gap-2 ${
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
      <div className={`flex items-center w-full p-3 ${theme.inputBg} rounded-xl transition-all shadow-sm border ${open ? 'border-orange-500 ring-2 ring-orange-500/20' : isDarkMode ? 'border-white/20' : 'border-white/60'}`}>
        <Search size={16} className={`mr-2 shrink-0 ${theme.textSub}`} />
        <input type="text" value={open ? query : query || ''} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} className={`w-full text-sm font-semibold outline-none bg-transparent ${theme.textMain} placeholder:text-slate-500 dark:placeholder:text-zinc-400`} />
        {value && <X size={16} className="text-rose-500 hover:text-rose-700 cursor-pointer mr-2" onClick={() => { onChange(''); setQuery(''); }} />}
        <ChevronDown size={16} className={`cursor-pointer ${theme.textSub}`} onClick={() => setOpen(!open)} />
      </div>
      
      {open && (
        <div className={`absolute top-full left-0 mt-1 w-full p-1.5 rounded-xl shadow-2xl backdrop-blur-3xl border ${
          isDarkMode ? 'bg-zinc-900/95 border-zinc-700/80 shadow-black' : 'bg-white/95 border-slate-200/90 shadow-slate-300/50'
        } overflow-hidden`}>
          <div onClick={() => { onChange(''); setQuery(''); setOpen(false); }} className={`p-2.5 text-xs font-bold uppercase cursor-pointer rounded-lg flex items-center justify-center gap-2 mb-1 ${isDarkMode ? 'text-orange-400 bg-zinc-800 hover:bg-zinc-700' : 'text-orange-600 bg-slate-100 hover:bg-slate-200'}`}>
            <Package size={14}/> Unassign / Return to Stock
          </div>
          
          <div className="max-h-56 overflow-y-auto scrollbar-none flex flex-col gap-0.5">
            {query.trim().length === 0 ? (
              <div className={`p-3 text-center text-xs font-semibold ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>🔍 Type an employee name or EMP code...</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-center text-xs font-semibold text-rose-500">No employee found for "{query}".</div>
            ) : (
              filtered.map((s: any) => (
                <div key={s.id} className={`p-3 text-xs cursor-pointer rounded-lg flex justify-between items-center transition-all ${isDarkMode ? 'text-zinc-200 hover:bg-zinc-800' : 'text-slate-800 hover:bg-slate-100'}`} onClick={() => { onChange(s.id); setQuery(`${s.full_name || s.name} (${s.emp_code || s.email})`); setOpen(false); }}>
                  <span className="font-semibold text-sm">{s.full_name || s.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold shadow-sm ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>{s.emp_code || s.email}</span>
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
  const [adminName, setAdminName] = useState('Admin');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [conditionFilter, setConditionFilter] = useState<string>('All');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [viewAssetModal, setViewAssetModal] = useState<any>(null);
  
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

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
    { value: 'Pending Handover', label: '⏳ Pending Handover' },
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
    { value: 'Pending Handover', label: '⏳ Pending Handover' },
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

    const rawSession = localStorage.getItem('vsit_admin_session') || localStorage.getItem('user');
    if (rawSession) {
      try {
        const activeUser = JSON.parse(rawSession);
        setAdminName(activeUser.full_name || activeUser.name || 'System Administrator');
      } catch (e) {
        setAdminName(rawSession.split('@')[0] || 'System Administrator');
      }
    }

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
      loadAssetHistory(viewAssetModal.id, viewAssetModal.clean_tag || viewAssetModal.asset_tag, viewAssetModal.serial_number);
    }
  }, [viewAssetModal, isEditingAsset]);

  // 🌟 ROBUST OMNI-MATCH HISTORY ENGINE (WITH MULTI-PASS INHERITANCE FOR LEGACY & RETURN LOGS)
  const loadAssetHistory = async (assetId: string, assetTag?: string, serialNumber?: string) => {
    setIsLoadingHistory(true);
    try {
      const queries = [ 
        supabase.from('inspections').select('*').eq('asset_id', assetId).order('created_at', { ascending: false }),
        supabase.from('replacements').select('*').eq('old_asset_id', assetId).order('created_at', { ascending: false })
      ];
      
      if (assetTag) {
        queries.push(supabase.from('inspections').select('*').ilike('asset_tag', `%${assetTag}%`).order('created_at', { ascending: false }));
        queries.push(supabase.from('inspections').select('*').ilike('asset_id', `%${assetTag}%`).order('created_at', { ascending: false }));
        queries.push(supabase.from('replacements').select('*').ilike('asset_tag', `%${assetTag}%`).order('created_at', { ascending: false }));
      }
      if (serialNumber) {
        queries.push(supabase.from('inspections').select('*').ilike('serial_number', `%${serialNumber}%`).order('created_at', { ascending: false }));
        queries.push(supabase.from('inspections').select('*').ilike('asset_id', `%${serialNumber}%`).order('created_at', { ascending: false }));
        queries.push(supabase.from('replacements').select('*').ilike('serial_number', `%${serialNumber}%`).order('created_at', { ascending: false }));
      }

      const results = await Promise.allSettled(queries);
      let rawLogs: any[] = [];
      
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.data) {
          const normalized = res.value.data.map(item => {
            if (item.old_asset_id || item.reason) {
              return {
                ...item,
                asset_id: item.old_asset_id || item.asset_id,
                inspected_by: item.user_id || item.staff_id || item.requested_by || item.created_by || item.inspected_by,
                user_name: item.user_name || item.employee_name || item.full_name || item.staff_name,
                emp_code: item.emp_code || item.employee_code,
                notes: item.notes || `[RETURN / REPLACEMENT REQUEST] Reason: ${item.reason || 'N/A'} | Condition: ${item.condition || 'N/A'}`,
                status: item.status || 'Return Requested',
                is_replacement: true
              };
            }
            return item;
          });
          rawLogs = [...rawLogs, ...normalized];
        }
      });

      const uniqueLogsMap = new Map();
      rawLogs.forEach((item, index) => {
        const key = item.id || `${item.asset_id}-${item.created_at}-${index}`;
        uniqueLogsMap.set(key, item);
      });
      let uniqueLogs = Array.from(uniqueLogsMap.values());
      
      if (uniqueLogs.length === 0 && (viewAssetModal.assigned_to || viewAssetModal.status === 'Assigned' || viewAssetModal.status === 'Pending Handover')) {
          uniqueLogs.push({
              id: 'synthetic-recovery-log',
              status: viewAssetModal.live_inspection_status || 'Approved',
              created_at: viewAssetModal.live_inspection_date || new Date().toISOString(),
              notes: `Digitally Signed Handover Agreement by ${viewAssetModal.staff_name} (${viewAssetModal.emp_code}) (Auto-recovered)`,
              inspected_by: viewAssetModal.assigned_to,
              user_name: viewAssetModal.staff_name,
              emp_code: viewAssetModal.emp_code
          });
      }

      uniqueLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // PASS 1: Resolve direct profile matches, DB columns, and regex extractions
      let knownAssetStaffName: string | null = null;
      let knownAssetEmpCode: string | null = null;

      const pass1 = uniqueLogs.map(log => {
         const ib = String(log.inspected_by || log.user_id || log.staff_id || log.requested_by || log.created_by || '').toLowerCase().trim();
         const ue = String(log.user_email || log.email || '').toLowerCase().trim();
         const uid = String(log.user_id || '').toLowerCase().trim();
         
         const staff = staffList.find(s => {
             const sId = String(s.id).toLowerCase().trim();
             const sEmail = String(s.email).toLowerCase().trim();
             const sEmpCode = String(s.emp_code || s.emp_id).toLowerCase().trim();
             return (ib && (sId === ib || sEmpCode === ib)) || (uid && sId === uid) || (ue && sEmail === ue);
         });
         
         let staffName = log.user_name || log.staff_name || log.full_name || log.employee_name || log.name;
         if (staffName && (staffName.includes('Unknown') || staffName === 'null' || staffName.trim() === '')) {
             staffName = null;
         }

         let empCode = log.emp_code || log.employee_code;
         if (empCode && (empCode.includes('N/A') || empCode === 'null' || empCode.trim() === '')) {
             empCode = null;
         }

         if (!staffName && staff) {
             staffName = staff.full_name || staff.name;
             empCode = empCode || staff.emp_code || staff.email;
         }

         const notesStr = String(log.notes || '');

         if (!staffName && notesStr) {
             let m = notesStr.match(/by\s+([A-Za-z\s\.]+?)(?:\s*\(\s*EMP|\s+on\b|\s+at\b|$)/i);
             if (m && !m[1].toLowerCase().includes('admin') && !m[1].toLowerCase().includes('system')) staffName = m[1].trim();

             if (!staffName) {
                 m = notesStr.match(/(?:assigned|handed over)\s+to\s+([A-Za-z\s\.]+?)(?:\s*\(\s*EMP|\s+on\b|$)/i);
                 if (m && !m[1].toLowerCase().includes('admin')) staffName = m[1].trim();
             }

             if (!staffName) {
                 m = notesStr.match(/(?:previous holder|holder):?\s+([A-Za-z\s\.]+?)(?:\s*\(\s*EMP|$)/i);
                 if (m && !m[1].toLowerCase().includes('admin')) staffName = m[1].trim();
             }

             if (staffName) staffName = staffName.replace(/\s+(upon|processed|awaiting|signed).*$/i, '').trim();
         }

         if (!empCode && notesStr) {
             const empMatch = notesStr.match(/(EMP-\d+)/i);
             if (empMatch) empCode = empMatch[1].toUpperCase();
         }

         if (staffName && !staffName.includes('Administrator') && !staffName.includes('Unknown')) {
             knownAssetStaffName = staffName;
             if (empCode && empCode !== 'N/A') knownAssetEmpCode = empCode;
         }

         return { ...log, staff_name: staffName, emp_code: empCode };
      });

      // PASS 2: Inheritance for Return/Replacement/Approval logs that lack explicit user names
      const compiled = pass1.map(log => {
         let staffName = log.staff_name;
         let empCode = log.emp_code;

         if (!staffName || staffName.includes('Unknown') || staffName.trim() === '') {
             const statusLow = String(log.status || '').toLowerCase();
             const notesLow = String(log.notes || '').toLowerCase();

             const isReturnOrExchange = statusLow.includes('return') || statusLow.includes('replace') || notesLow.includes('return') || notesLow.includes('replace') || log.is_replacement;

             if (isReturnOrExchange && knownAssetStaffName) {
                 staffName = knownAssetStaffName;
                 empCode = empCode || knownAssetEmpCode || 'N/A';
             } else if (statusLow === 'stock intake' || statusLow === 'in stock' || notesLow.includes('by admin') || notesLow.includes('returned to inventory')) {
                 staffName = 'Administrator / System';
                 empCode = 'SYS-ADMIN';
             } else if (knownAssetStaffName) {
                 staffName = knownAssetStaffName;
                 empCode = empCode || knownAssetEmpCode || 'N/A';
             } else if (viewAssetModal.staff_name && !viewAssetModal.staff_name.includes('Unknown') && viewAssetModal.staff_name !== 'Unassigned') {
                 staffName = viewAssetModal.staff_name;
                 empCode = empCode || viewAssetModal.emp_code;
             } else {
                 staffName = 'Unknown Staff';
                 empCode = 'N/A';
             }
         }

         if (!empCode || empCode.trim() === '' || empCode === 'null') {
             if (staffName === 'Administrator / System') empCode = 'SYS-ADMIN';
             else empCode = 'N/A';
         }

         return { ...log, staff_name: staffName, emp_code: empCode };
      });

      setAssetHistory(compiled);
    } catch (e) {
      console.error("History fetch error:", e);
    } finally { 
      setIsLoadingHistory(false); 
    }
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
        const assignedToStr = String(asset.assigned_to || '').trim();
        const isActuallyUnassigned = !assignedToStr || assignedToStr.toLowerCase() === 'unassigned' || assignedToStr.toLowerCase() === 'null';

        const assignee = isActuallyUnassigned ? {} : (staffData.find(s => 
            String(s.id).toLowerCase() === assignedToStr.toLowerCase() || 
            String(s.email).toLowerCase() === assignedToStr.toLowerCase() ||
            String(s.emp_code).toLowerCase() === assignedToStr.toLowerCase() ||
            String(s.emp_id).toLowerCase() === assignedToStr.toLowerCase()
        ) || {});
        
        const latestInspection = inspectionData.find(i => String(i.asset_id) === String(asset.id));
        let displayStatus = asset.status || 'In Stock (Unassigned)';
        
        if (isActuallyUnassigned && displayStatus.toLowerCase().includes('pending handover')) {
            displayStatus = 'In Stock (Unassigned)';
        }

        let sName = assignee.full_name || assignee.name;
        if (!sName && !isActuallyUnassigned) sName = 'Unknown User ID';
        if (isActuallyUnassigned) sName = 'Unassigned';

        return {
          ...asset,
          status: displayStatus,
          safe_display_name: asset.name || asset.asset_name || 'Unnamed Asset',
          staff_name: sName,
          emp_code: assignee.emp_code || assignee.emp_id || 'N/A',
          staff_email: assignee.email || 'N/A',
          department: assignee.department || assignee.designation || 'N/A', 
          clean_tag: (asset.asset_tag && String(asset.asset_tag).length < 20) ? asset.asset_tag : generateCategoryPrefix(asset.category, asset.id),
          live_inspection_status: latestInspection?.status || asset.inspection_status || 'Approved',
          live_inspection_date: latestInspection?.created_at || asset.last_inspection_date || null,
          latest_notes: latestInspection?.notes || null,
          latest_photos: latestInspection?.photos || null,
          system_specs: asset.system_specs || asset.specs || autoDetectSpecs(`${asset.name || ''} ${asset.brand || ''} ${asset.serial_number || ''}`, asset.category)
        };
      });
      setAssets(compiledAssets);
    } catch (err) {} finally { setLoading(false); }
  };

  const getStockStatusBadge = (status: string) => {
    const s = safeString(status);
    if (s.includes('Assigned')) return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 shadow-sm';
    if (s.includes('Repair')) return 'bg-orange-500/10 border border-orange-500/30 text-orange-500 shadow-sm animate-pulse';
    if (s.includes('Demo')) return 'bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-sm';
    if (s.includes('Pending')) return 'bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-sm';
    return 'bg-blue-500/10 border border-blue-500/30 text-blue-500 shadow-sm';
  };

  const getInspectionStatusColor = (status: string) => {
    const s = safeString(status).toLowerCase().trim();
    if (s.includes('approved') || s.includes('pass')) return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30';
    if (s.includes('return')) return 'text-purple-600 bg-purple-500/10 border-purple-500/30';
    if (s.includes('replace')) return 'text-indigo-600 bg-indigo-500/10 border-indigo-500/30';
    if (s.includes('rejected') || s.includes('fail')) return 'text-rose-600 bg-rose-500/10 border-rose-500/30';
    if (s.includes('pending handover')) return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
    return 'text-blue-600 bg-blue-500/10 border-blue-500/30';
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

      let resolvedStatus = newAssetAssignee ? 'Pending Handover' : newAssetStatus;
      if (!newAssetAssignee && resolvedStatus.toLowerCase().includes('pending')) {
          resolvedStatus = 'In Stock (Unassigned)';
      }

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
      
      const assigneeObj = staffList.find(s => s.id === newAssetAssignee);
      const aName = assigneeObj ? (assigneeObj.full_name || assigneeObj.name) : '';
      const aCode = assigneeObj ? (assigneeObj.emp_code || assigneeObj.email) : '';

      await supabase.from('inspections').insert({ 
        asset_id: newAssetId, 
        inspected_by: newAssetAssignee || null, 
        user_name: aName || 'Administrator',
        emp_code: aCode || 'SYS',
        status: newAssetAssignee ? 'Pending Handover' : 'Stock Intake', 
        notes: newAssetAssignee ? `Asset assigned to ${aName} (${aCode}) upon registration.` : `Asset initially registered and verified into stock.` 
      });

      if (newAssetAssignee) {
        try {
          await supabase.from('notifications').insert([{
            target_user: newAssetAssignee,
            title: '🔔 New Asset Assigned',
            message: `You have been assigned a new hardware asset: ${newAssetName} (${finalTag.toUpperCase()}). Please complete the handover visual verification.`,
            is_read: false,
            type: 'info'
          }]);
        } catch (notifErr) { console.error('Notification failed:', notifErr); }
      }

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

      const isNewAssignee = editForm.assignee && viewAssetModal.assigned_to !== editForm.assignee;
      
      let resolvedStatus = editForm.status;
      let resolvedInspectionStatus = editForm.inspection_status || 'Approved';

      if (isNewAssignee) {
        resolvedStatus = 'Pending Handover';
        resolvedInspectionStatus = 'Pending Handover';
      } else if (!editForm.assignee && viewAssetModal.assigned_to) {
        resolvedStatus = 'In Stock (Unassigned)';
        resolvedInspectionStatus = 'Approved';
      }

      if (!editForm.assignee && (resolvedStatus.toLowerCase().includes('pending') || resolvedStatus.toLowerCase().includes('assigned'))) {
          resolvedStatus = 'In Stock (Unassigned)';
      }

      const updatePayload: any = {
        category: editForm.category, serial_number: serialUpper, asset_tag: editForm.asset_tag.toUpperCase(),
        name: editForm.name, brand: editForm.brand, price: editForm.price ? parseFloat(editForm.price) : null,
        vendor: editForm.vendor, purchase_date: editForm.purchase_date || null, warranty_expiry: editForm.warranty_expiry || null, 
        asset_condition: editForm.condition, status: resolvedStatus, inspection_status: resolvedInspectionStatus,
        assigned_to: editForm.assignee || null, system_specs: editForm.system_specs || ''
      };

      let { error } = await supabase.from('assets').update(updatePayload).eq('id', viewAssetModal.id);
      if (error && (error.message.includes('system_specs') || error.message.includes('column'))) {
        delete updatePayload.system_specs;
        await supabase.from('assets').update(updatePayload).eq('id', viewAssetModal.id);
      }

      if (isNewAssignee) {
        const assignedStaff = staffList.find(s => s.id === editForm.assignee);
        const staffName = assignedStaff ? (assignedStaff.full_name || assignedStaff.name) : 'Unknown Staff';
        const empCode = assignedStaff ? (assignedStaff.emp_code || assignedStaff.email) : 'N/A';

        await supabase.from('inspections').insert({
          asset_id: viewAssetModal.id,
          inspected_by: editForm.assignee,
          user_name: staffName,
          emp_code: empCode,
          status: 'Pending Handover',
          notes: `Asset assigned to new holder: ${staffName} (${empCode}). Awaiting custodian verification and sign-off.`
        });

        try {
          await supabase.from('notifications').insert([{
            target_user: editForm.assignee,
            title: '🔔 New Asset Assigned',
            message: `You have been assigned a new asset: ${editForm.name} (${editForm.asset_tag}). Please open your staff dashboard to complete the handover agreement.`,
            is_read: false,
            type: 'info'
          }]);
        } catch (e) { console.error('Notification failed:', e); }

      } else if (!editForm.assignee && viewAssetModal.assigned_to) {
        const prevStaffName = viewAssetModal.staff_name.includes('Unknown') ? 'Previous Staff' : viewAssetModal.staff_name;
        const prevEmpCode = viewAssetModal.emp_code.includes('N/A') ? 'UNKNOWN' : viewAssetModal.emp_code;

        await supabase.from('inspections').insert({
            asset_id: viewAssetModal.id,
            status: 'Stock Intake',
            user_name: 'Administrator',
            emp_code: 'SYS-ADMIN',
            notes: `Asset returned to inventory and unassigned. Previous Holder: ${prevStaffName} (${prevEmpCode}). Processed by Admin.`
        });
      } else if (viewAssetModal.status !== resolvedStatus || viewAssetModal.asset_condition !== editForm.condition || viewAssetModal.live_inspection_status !== resolvedInspectionStatus) {
        await supabase.from('inspections').insert({
            asset_id: viewAssetModal.id,
            status: resolvedInspectionStatus,
            user_name: adminName,
            emp_code: 'SYS-ADMIN',
            notes: `Asset metadata updated by Admin. Status: ${resolvedStatus} | Condition: ${editForm.condition}`
        });
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
      if (statusFilter === 'In Stock') {
        matchesStatus = status.includes('stock') || status.includes('unassigned');
      } else if (statusFilter === 'Assigned') {
        matchesStatus = (status.includes('assigned') && !status.includes('unassigned')) || status === 'assigned';
      } else if (statusFilter === 'Pending Handover') {
        matchesStatus = status.includes('pending');
      } else if (statusFilter === 'In Repair') {
        matchesStatus = status.includes('repair');
      } else if (statusFilter === 'Demo Use') {
        matchesStatus = status.includes('demo');
      } else {
        matchesStatus = status === statusFilter.toLowerCase();
      }
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

  const getAssetViewUrl = (asset: any) => {
    const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://virtual-staffing.vercel.app';
    // Clean URL with only the asset tag ID -> fetches live data on scan
    return `${currentDomain}/public-asset?id=${encodeURIComponent(asset.clean_tag || asset.id)}`;
  };

  const executeGridBulkPrint = (assetsToPrint: any[]) => {
    if (!assetsToPrint || assetsToPrint.length === 0) return;

    const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const pages = chunkArray(assetsToPrint, 24);

    const pagesHtml = pages.map(pageAssets => {
      const stickersHtml = pageAssets.map(asset => {
        const cleanTag = asset.clean_tag || generateCategoryPrefix(asset.category, asset.id);
        const urlToEncode = getAssetViewUrl(asset);
        const catLow = String(asset.category || '').toLowerCase();
        
        const isSmallItem = catLow.includes('mouse') || catLow.includes('headphone');

        if (isSmallItem) {
          const smallQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlToEncode)}`;
          return `
            <div class="sticker">
              <div class="sub-sticker">
                <img src="${smallQrUrl}" class="qr-code-micro" />
                <span class="tag-id-micro">${cleanTag}</span>
              </div>
              <div class="sub-sticker border-left">
                <img src="${smallQrUrl}" class="qr-code-micro" />
                <span class="tag-id-micro">${cleanTag}</span>
              </div>
            </div>
          `;
        } else {
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(urlToEncode)}`;
          return `
            <div class="sticker">
              <img src="${qrUrl}" class="qr-code" />
              <div class="tag-info">
                <span class="tag-label">ASSET TAG ID</span>
                <span class="tag-id">${cleanTag}</span>
              </div>
            </div>
          `;
        }
      }).join('');
      return `<div class="page">${stickersHtml}</div>`;
    }).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset_QR_Labels</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            
            @page { size: A4; margin: 0; }
            
            body { 
              margin: 0; 
              padding: 0; 
              font-family: 'Inter', sans-serif; 
              background: white; 
              -webkit-print-color-adjust: exact; 
              color: #000;
            }
            
            .page {
              width: 210mm;
              height: 297mm;
              padding-top: 12.5mm;
              padding-left: 4.5mm; 
              box-sizing: border-box;
              display: grid;
              grid-template-columns: repeat(3, 6.7cm);
              grid-template-rows: repeat(8, 3.4cm);
              align-content: start;
              justify-content: start;
              page-break-after: always;
            }
            
            .sticker {
              width: 6.7cm;
              height: 3.4cm;
              display: flex;
              align-items: center;
              justify-content: flex-start;
              padding: 3mm; 
              box-sizing: border-box;
              border: 1px dashed #cbd5e1; 
              overflow: hidden;
            }
            
            .qr-code { 
              height: 100%; 
              aspect-ratio: 1/1; 
              object-fit: contain; 
              margin-right: 12px;
            }
            .tag-info { 
              display: flex; 
              flex-direction: column; 
              justify-content: center; 
            }
            .tag-label { 
              font-size: 8px; 
              color: #64748b; 
              font-weight: 700; 
              text-transform: uppercase; 
              margin-bottom: 2px; 
            }
            .tag-id { 
              font-size: 11px; 
              font-weight: 700; 
              color: #0f172a; 
              word-break: break-all;
            }

            .sub-sticker {
              flex: 1;
              height: 100%;
              display: flex;
              flex-direction: column; 
              align-items: center;
              justify-content: center;
              gap: 3px;
              box-sizing: border-box;
              padding: 1mm;
            }
            .border-left {
              border-left: 1px dashed #94a3b8; 
            }
            .qr-code-micro {
              height: 1.4cm; 
              width: 1.4cm;
              object-fit: contain;
            }
            .tag-id-micro {
              font-size: 6px; 
              font-weight: 800;
              color: #000;
              text-align: center;
              word-break: break-all;
              line-height: 1.1;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 800); };
          </script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      alert("Pop-up blocked. Please allow pop-ups to generate the print layout.");
    }
  };

  const handlePrintPhysicalSticker = (asset: any, cleanTag: string) => {
    executeGridBulkPrint([asset]);
  };

  // 🌟 BRANDED HTML/CSS PDF GENERATOR WITH ULTRA-PREMIUM KEBAB-CASE SVG STAMPS
  const handleGenerateHandoverPDF = (asset: any) => {
    
    const sourceDate = asset.live_inspection_date ? new Date(asset.live_inspection_date) : new Date();
    const printDate = sourceDate.toLocaleString('en-IN', { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
    }).replace(/,/g, '');

    const assetTag = asset.clean_tag || asset.asset_tag;
    const staffName = asset.staff_name || 'Unassigned';
    const empCode = asset.emp_code || 'N/A';
    const staffEmail = asset.staff_email || 'N/A';
    const condition = asset.asset_condition || 'New';

    const adminAuthCode = `SEC-ADM-${Math.floor(Math.random() * 9000) + 1000}`;
    const adminNameDisplay = "SYSTEM.ADMIN";
    
    let photosHtml = '<p style="font-style: italic; color: #64748b; font-size: 12px; margin: 0;">No inspection photos available on record.</p>';
    if (asset.latest_photos) {
      let photosArr: string[] = [];
      try {
        if (Array.isArray(asset.latest_photos)) photosArr = asset.latest_photos;
        else if (typeof asset.latest_photos === 'string' && asset.latest_photos.startsWith('[')) {
          const parsed = JSON.parse(asset.latest_photos);
          if (Array.isArray(parsed)) photosArr = parsed;
        } else if (asset.latest_photos && typeof asset.latest_photos === 'object') {
          photosArr = Object.values(asset.latest_photos);
        }
      } catch(e){}
      if (photosArr.length > 0) {
        photosHtml = '<div style="display: flex; gap: 10px; flex-wrap: wrap;">' + 
          photosArr.map((url: string) => `<img src="${url}" style="width: 140px; height: 140px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);" />`).join('') + 
          '</div>';
      }
    }

    const notesHtml = asset.latest_notes 
      ? `<p style="font-family: monospace; font-size: 13px; color: #1e293b; margin: 0; background: #f1f5f9; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${asset.latest_notes}</p>` 
      : '<p style="font-size: 12px; color: #64748b; margin: 0;">No inspector notes recorded.</p>';

    const deviceVerificationCode = `AUTH-${assetTag.split('-').pop()}-${Math.floor(Math.random() * 9000) + 1000}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Handover Agreement - ${assetTag}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');
            
            html, body { 
              background-color: #f8fafc !important; 
              color: #1e293b !important;
              font-family: 'Inter', sans-serif; 
              line-height: 1.6; 
              margin: 0; 
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .page-container {
              max-width: 850px;
              margin: 40px auto;
              padding: 50px;
              background-color: #ffffff;
              border-radius: 16px;
              box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
              position: relative;
              z-index: 10;
              border: 1px solid #e2e8f0;
            }
            
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.03;
              width: 80%;
              height: 80%;
              background-image: url('/logo.png');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              z-index: -10;
              pointer-events: none;
            }

            .header { 
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 24px; 
              margin-top: 10px;
              margin-bottom: 30px; 
            }
            .brand-wrapper { display: flex; flex-direction: column; }
            .logo-text { 
              font-size: 32px; 
              line-height: 1.1;
              font-weight: 900; 
              background: linear-gradient(to right, #f97316, #ea580c);
              -webkit-background-clip: text;
              color: transparent;
              text-transform: uppercase; 
              letter-spacing: 1px;
              margin: 0;
            }
            .logo-sub { font-size: 13px; font-weight: 800; color: #334155; letter-spacing: 0.5px; margin-top: 8px; }
            .header-right { text-align: right; }
            .doc-title { 
              font-size: 22px; 
              line-height: 1.1;
              font-weight: 900; 
              color: #0f172a; 
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .doc-meta { font-size: 12px; color: #64748b; font-weight: 700; margin-top: 4px; }
            .badge {
              display: inline-block;
              float: right;
              padding: 6px 12px;
              background: #ecfdf5;
              border: 1px solid #10b981;
              color: #059669;
              border-radius: 8px;
              font-size: 11px;
              font-weight: 800;
              margin-top: 12px;
              box-shadow: 0 2px 4px rgba(16,185,129,0.1);
            }
            
            .attention-box { 
              background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
              border: 1px solid #fecdd3; 
              border-radius: 12px; 
              padding: 16px; 
              margin-bottom: 24px; 
            }
            .attention-title { color: #e11d48; font-size: 14px; font-weight: 800; margin-bottom: 6px; display:flex; align-items:center; gap:6px;}
            .attention-text { color: #9f1239; font-size: 12px; font-weight: 600; margin: 0; }

            .section { margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            .section-title { font-size: 15px; font-weight: 900; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; text-transform: uppercase;}
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .info-group { display: flex; flex-direction: column; gap: 4px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9; }
            .info-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
            .info-value { font-size: 14px; font-weight: 700; color: #0f172a; }
            .info-value.tag { color: #ea580c; font-family: monospace; font-size: 16px; }

            .evidence-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            
            .terms { font-size: 12px; color: #334155; }
            .terms p { margin-top: 0; font-weight: 500; }
            .terms ul { padding-left: 20px; margin-bottom: 16px; }
            .terms li { margin-bottom: 8px; }
            .terms strong { color: #0f172a; }

            .esign-box {
              background: #f8fafc;
              border: 1px dashed #cbd5e1;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 30px;
              text-align: center;
            }
            .esign-title { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .esign-main { font-size: 13px; font-weight: 700; color: #0f172a; }
            .esign-sub { font-size: 11px; color: #94a3b8; margin: 4px 0 0; }

            .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px; }
            .sig-block { width: 45%; position: relative; }

            .sig-line { border-bottom: 1px solid #cbd5e1; height: 20px; margin-top: 15px; margin-bottom: 8px; }
            .sig-name { font-weight: 900; font-size: 16px; color: #0f172a; margin-top: 10px; position:relative; z-index:20; }
            .sig-role { font-size: 11px; font-weight: 800; color: #8b5cf6; text-transform: uppercase; letter-spacing: 1px; position:relative; z-index:20; }

            @media print {
              html, body { background: white !important; }
              .page-container { padding: 0; margin: 0; border: none; box-shadow: none; }
              .watermark { position: fixed; }
              .info-group { border: 1px solid #e2e8f0; }
            }
          </style>
        </head>
        <body>
          <div class="watermark"></div>
          <div class="page-container">
            <div class="header">
              <div class="brand-wrapper">
                <h1 class="logo-text">VIRTUAL STAFFING<br/>SOLUTIONS</h1>
                <div class="logo-sub">IT Infrastructure & Asset Compliance Division</div>
              </div>
              <div class="header-right">
                <div class="doc-title">HARDWARE HANDOVER<br/>AGREEMENT</div>
                <div class="doc-meta">Release Date: ${printDate.split(',')[0]}</div>
                <div class="doc-meta">Digital Signed Date: ${printDate}</div>
                <div class="badge">✓ DIGITALLY EXECUTED & VERIFIED</div>
              </div>
            </div>

            <div class="attention-box">
              <div class="attention-title">⚠️ ATTENTION REQUIRED</div>
              <p class="attention-text">Please review this agreement carefully. Match the current condition and health of the asset against the attached photos and read the notes carefully. If everything is in order, then sign. Otherwise, DO NOT sign and raise a ticket to the admin immediately.</p>
            </div>

            <!-- SECTION 1: EMPLOYEE PROFILE -->
            <div class="section">
              <div class="section-title">1. Custodian Profile & Auth</div>
              <div class="info-grid">
                <div class="info-group">
                  <span class="info-label">Assigned Employee:</span>
                  <span class="info-value">${staffName}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Employee Code:</span>
                  <span class="info-value font-mono">${empCode}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Login Email Address:</span>
                  <span class="info-value">${staffEmail}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Authorization Role:</span>
                  <span class="info-value">Staff / Custodian</span>
                </div>
              </div>
            </div>

            <!-- SECTION 2: ASSET DETAILS -->
            <div class="section">
              <div class="section-title">2. Hardware Specifications & Asset Details</div>
              <div class="info-grid">
                <div class="info-group">
                  <span class="info-label">Asset Name:</span>
                  <span class="info-value">${asset.safe_display_name}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Asset Category:</span>
                  <span class="info-value">${asset.category || 'Hardware'}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Asset Tag ID:</span>
                  <span class="info-value tag">${assetTag}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Factory Serial (S/N):</span>
                  <span class="info-value font-mono">${asset.serial_number || 'N/A'}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Brand / Model:</span>
                  <span class="info-value">${asset.brand || 'Standard'}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Hardware Specifications:</span>
                  <span class="info-value">${asset.system_specs || 'Standard Business Configuration'}</span>
                </div>
                <div class="info-group" style="grid-column: span 2;">
                  <span class="info-label">Physical Condition:</span>
                  <span class="info-value">${condition}</span>
                </div>
              </div>
            </div>

            <div class="evidence-box">
              <div class="section-title" style="border:none; margin-bottom: 16px; padding:0; color:#ea580c;">Latest Inspection & Condition Evidence</div>
              <div style="margin-bottom: 20px;">
                <span class="info-label">Inspector Notes:</span>
                ${notesHtml}
              </div>
              <div>
                <span class="info-label">Asset Photos:</span>
                ${photosHtml}
              </div>
            </div>

            <div class="section" style="border:none; padding: 0; background: transparent; box-shadow: none;">
              <div class="section-title">3. Terms and Conditions</div>
              <div class="terms">
                <p>By signing this document, I acknowledge receipt of the IT asset(s) listed above in good working condition. I agree to the following terms:</p>
                <ul style="list-style-type: none; padding-left: 0;">
                  <li><strong>Custody & Care:</strong> I am solely responsible for the safety, security, and proper care of the equipment assigned to me.</li>
                  <li><strong>Acceptable Use:</strong> The asset is to be used strictly for official company business. Unauthorized software installation or tampering with security settings is strictly prohibited.</li>
                  <li><strong>Return Policy:</strong> I agree to return the equipment in its original condition (fair wear and tear excepted) upon termination of employment or immediately upon request by the IT Department.</li>
                  <li><strong>Damage/Loss:</strong> I will immediately report any damage, loss, or theft of the asset to the IT Department. I understand that I may be held financially liable for damages caused by negligence.</li>
                </ul>
                
                <h4 style="margin-top: 24px; margin-bottom: 10px; color: #0f172a; font-size: 13px; font-weight: 800;">Inspection Rules</h4>
                <ul style="list-style-type: disc;">
                  <li><strong>Laptops:</strong> Every month Last Saturday Due Date, you need inspection Done before due date, upload current condition photos and note every month.</li>
                  <li><strong>Other Accessories:</strong> Every 3 month you need inspection Done before due date, upload current condition photos and notes Before Due date.</li>
                  <li><strong>Exchange Assets:</strong> Without Admin Permission you could not exchange any assets without Admin Approval.</li>
                </ul>
              </div>
            </div>

            <div class="esign-box">
              <div class="esign-title">Logistics E-Signature Log</div>
              <div class="esign-main">✓ Digitally Signed Handover Agreement by ${staffName} on ${printDate}</div>
              <p class="esign-sub">This document was securely logged in the VSS IT Asset Management System and serves as a legally binding electronic signature.</p>
            </div>

            <div class="signatures">
              
              <!-- ADMIN SIGNATURE BLOCK -->
              <div class="sig-block">
                <!-- SCALLOPED SILVER METALLIC HOLOGRAM (ADMIN) -->
                <div class="hologram-stamp-svg" style="left: 10px; right: auto; transform: rotate(-8deg);">
                  <svg viewBox="0 0 1000 1000" width="130" height="130" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient id="holo-base-admin" cx="50%" cy="50%" r="70%">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="20%" stop-color="#e2e8f0"/>
                        <stop offset="40%" stop-color="#fbcfe8"/>
                        <stop offset="60%" stop-color="#e0f2fe"/>
                        <stop offset="80%" stop-color="#f8fafc"/>
                        <stop offset="100%" stop-color="#cbd5e1"/>
                      </radialGradient>
                      
                      <linearGradient id="glassTopAdmin" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
                        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
                      </linearGradient>
                      <linearGradient id="glassBotAdmin" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
                        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
                      </linearGradient>

                      <path id="topArcAdmin" d="M 100 500 A 400 400 0 1 1 900 500"/>
                      <path id="botArcAdmin" d="M 900 500 A 400 400 0 1 1 100 500"/>
                    </defs>

                    <g>
                      <circle cx="500" cy="500" r="450" fill="none" stroke="#d7dbe0" stroke-width="60" stroke-dasharray="0 50" stroke-linecap="round"/>
                      <circle cx="500" cy="500" r="450" fill="url(#holo-base-admin)"/>
                      
                      <g stroke="#ffffff" stroke-width="4" opacity="0.8" fill="none">
                        <circle cx="500" cy="500" r="320" />
                        <circle cx="500" cy="500" r="180" />
                        <path d="M 180,500 L 820,500 M 500,180 L 500,820 M 273,273 L 727,727 M 273,727 L 727,273" />
                        <path d="M 500,180 L 727,727 L 273,500 Z" />
                        <path d="M 500,180 L 273,727 L 820,500 Z" />
                      </g>

                      <circle cx="500" cy="500" r="350" fill="none" stroke="#ffffff" stroke-width="10" opacity="0.5"/>

                      <text font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#334155" letter-spacing="12">
                        <textPath href="#topArcAdmin" startOffset="50%" text-anchor="middle">ADMIN VERIFIED • ADMIN VERIFIED</textPath>
                      </text>
                      <text font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#334155" letter-spacing="12">
                        <textPath href="#botArcAdmin" startOffset="50%" text-anchor="middle">VERIFIED AUTHENTIC</textPath>
                      </text>

                      <path d="M 220,320 Q 500,120 780,320 Q 500,220 220,320 Z" fill="url(#glassTopAdmin)"/>
                      <path d="M 220,680 Q 500,880 780,680 Q 500,780 220,680 Z" fill="url(#glassBotAdmin)"/>

                      <text x="500" y="440" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="120" font-weight="900" fill="#000000">DIGITAL</text>
                      <text x="500" y="510" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="60" font-weight="900" fill="#000000" letter-spacing="4">AUTHENTICITY</text>
                      
                      <line x1="220" y1="540" x2="780" y2="540" stroke="#000000" stroke-width="8"/>

                      <text x="500" y="610" text-anchor="middle" font-family="Courier New, monospace" font-size="42" font-weight="900" fill="#334155">ADMIN: LAKHWINDER.BI</text>
                      <text x="500" y="670" text-anchor="middle" font-family="Courier New, monospace" font-size="38" font-weight="900" fill="#64748b">ID: ${deviceVerificationCode}</text>
                    </g>
                  </svg>
                </div>
                
                <div style="height: 10px;"></div>
                <div class="sig-line"></div>
                <div class="sig-name">System Administrator</div>
                <div class="sig-role">VSS IT Department</div>
              </div>

              <!-- STAFF SIGNATURE BLOCK -->
              <div class="sig-block">
                <!-- SCALLOPED SILVER METALLIC HOLOGRAM (STAFF) -->
                <div class="hologram-stamp-svg">
                  <svg viewBox="0 0 1000 1000" width="130" height="130" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient id="holo-base-staff" cx="50%" cy="50%" r="70%">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="20%" stop-color="#e2e8f0"/>
                        <stop offset="40%" stop-color="#dcfce7"/>
                        <stop offset="60%" stop-color="#e0f2fe"/>
                        <stop offset="80%" stop-color="#f8fafc"/>
                        <stop offset="100%" stop-color="#cbd5e1"/>
                      </radialGradient>
                      
                      <linearGradient id="glassTopStaff" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
                        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
                      </linearGradient>
                      <linearGradient id="glassBotStaff" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
                        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
                      </linearGradient>

                      <path id="topArcStaff" d="M 100 500 A 400 400 0 1 1 900 500"/>
                      <path id="botArcStaff" d="M 900 500 A 400 400 0 1 1 100 500"/>
                    </defs>

                    <g>
                      <circle cx="500" cy="500" r="450" fill="none" stroke="#d7dbe0" stroke-width="60" stroke-dasharray="0 50" stroke-linecap="round"/>
                      <circle cx="500" cy="500" r="450" fill="url(#holo-base-staff)"/>
                      
                      <g stroke="#ffffff" stroke-width="4" opacity="0.8" fill="none">
                        <circle cx="500" cy="500" r="320" />
                        <circle cx="500" cy="500" r="180" />
                        <path d="M 180,500 L 820,500 M 500,180 L 500,820 M 273,273 L 727,727 M 273,727 L 727,273" />
                        <path d="M 500,180 L 727,727 L 273,500 Z" />
                        <path d="M 500,180 L 273,727 L 820,500 Z" />
                      </g>

                      <circle cx="500" cy="500" r="350" fill="none" stroke="#ffffff" stroke-width="10" opacity="0.5"/>

                      <text font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#334155" letter-spacing="12">
                        <textPath href="#topArcStaff" startOffset="50%" text-anchor="middle">DIGITALLY SIGNED • DIGITALLY SIGNED</textPath>
                      </text>
                      <text font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#334155" letter-spacing="12">
                        <textPath href="#botArcStaff" startOffset="50%" text-anchor="middle">VERIFIED AUTHENTIC</textPath>
                      </text>

                      <path d="M 220,320 Q 500,120 780,320 Q 500,220 220,320 Z" fill="url(#glassTopStaff)"/>
                      <path d="M 220,680 Q 500,880 780,680 Q 500,780 220,680 Z" fill="url(#glassBotStaff)"/>

                      <text x="500" y="440" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="120" font-weight="900" fill="#000000">DIGITAL</text>
                      <text x="500" y="510" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="60" font-weight="900" fill="#000000" letter-spacing="4">AUTHENTICITY</text>
                      
                      <line x1="220" y1="540" x2="780" y2="540" stroke="#000000" stroke-width="8"/>

                      <text x="500" y="610" text-anchor="middle" font-family="Courier New, monospace" font-size="42" font-weight="900" fill="#334155">EMP: ${empCode}</text>
                      <text x="500" y="670" text-anchor="middle" font-family="Courier New, monospace" font-size="38" font-weight="900" fill="#64748b">ID: ${deviceVerificationCode}</text>
                    </g>
                  </svg>
                </div>
                
                <div style="height: 10px;"></div>
                <div class="sig-line"></div>
                <div class="sig-name">${staffName}</div>
                <div class="sig-role">Authorized Custodian</div>
              </div>
            </div>

          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 750);
            };
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups for this site to generate the Handover Agreement PDF.");
    }
  }

  // 🌟 TRUE GLASSMORPHISM THEME (PREMIUM 2026 - V4 CANONICAL)
  const theme = {
    bg: 'bg-transparent font-sans',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-800',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-600',
    
    glassCard: isDarkMode 
      ? 'bg-zinc-900/30 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/30 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',
    
    glassInnerCard: isDarkMode 
      ? 'bg-black/20 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/20 backdrop-blur-lg border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]',
    
    glassItem: isDarkMode
      ? 'bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300 hover:bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
      : 'bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-300 hover:bg-white/60',
    
    inputBg: isDarkMode 
      ? 'bg-black/40 border border-white/20 text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 placeholder-zinc-500' 
      : 'bg-white/40 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] text-slate-800 focus:bg-white/60 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder-slate-500',
    
    tabActive: 'bg-linear-to-r from-orange-500 to-orange-600 text-white shadow-md border border-orange-400 scale-105',
  };

  return (
    <div className={`w-full min-h-screen flex flex-col relative transition-colors duration-1000 ${theme.bg}`}>
      {/* 🌟 GLOBAL BACKGROUND ORBS */}
      <div className="fixed top-[-5%] left-[-5%] w-[45vw] h-[45vh] bg-orange-500/20 dark:bg-orange-600/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[45vw] h-[45vh] bg-purple-500/20 dark:bg-purple-700/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      <div className="w-full flex-1 flex flex-col p-4 sm:p-6 lg:p-8 2xl:px-12 mx-auto gap-4 sm:gap-6 relative z-10">
        
        {/* BRAND HEADER (Shrinks to fit) */}
        <div className={`shrink-0 ${theme.glassCard} rounded-4xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5`}>
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
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm`}>{assets.length} Units</span>
              </div>
              <p className={`text-xs font-semibold ${theme.textSub}`}>Manage full hardware lifecycle, smart QR stickers, and S/N tags</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedAssetIds.size > 0 && (
              <button onClick={() => executeGridBulkPrint(assets.filter(a => selectedAssetIds.has(a.id)))} className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border border-purple-500">
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

        {/* TABS & SEARCH (Shrinks to fit) */}
        <div className="shrink-0 space-y-4">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
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

            {/* SEARCH BAR */}
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

          {/* FILTER TABS */}
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
                  className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm shrink-0 border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
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

        {/* 🌟 ASSET GRID - MAXIMUM PAGE SCROLL */}
        <div className="w-full mt-2 pb-20">
          {loading ? (
            <div className={`w-full py-32 ${theme.glassCard} rounded-3xl flex flex-col items-center justify-center gap-3`}>
              <Loader2 size={32} className="animate-spin text-orange-500" />
              <span className={`text-[11px] font-bold tracking-widest uppercase ${theme.textMain}`}>Loading Asset Records...</span>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className={`w-full py-32 ${theme.glassCard} rounded-3xl text-center flex flex-col items-center justify-center space-y-3`}>
              <Package size={48} className="text-orange-500 opacity-80" />
              <h3 className={`text-lg font-bold ${theme.textMain}`}>No Hardware Found</h3>
              <p className={`text-[11px] font-medium max-w-sm ${theme.textSub}`}>No assets match your selected filter combination.</p>
              <button onClick={() => { setStatusFilter('All'); setConditionFilter('All'); setSearchQuery(''); setSelectedCategory('All'); }} className="mt-3 px-6 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-orange-400">
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
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
                          <input type="checkbox" checked={isSelected} onChange={() => {}} className="w-3.5 h-3.5 rounded cursor-pointer accent-orange-500" />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all duration-300 cursor-default ${getStockStatusBadge(asset.status)}`}>{asset.status}</span>
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
                        <span className={`font-mono font-semibold px-1.5 py-0.5 rounded text-[9px] shadow-sm shrink-0 border ${isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>{asset.emp_code}</span>
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
                          if (st.includes('approved') || st.includes('pass')) return <CheckCircle2 size={10} />;
                          if (st.includes('return') || st.includes('replace')) return <RefreshCw size={10} className="animate-spin" />;
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
      </div>

      {/* VIEW MODAL & HISTORY ENGINE */}
      {viewAssetModal && (() => {
        const liveModalTag = editForm.asset_tag || viewAssetModal.clean_tag;
        const visibleHistory = showFullHistory ? assetHistory : assetHistory.slice(0, 1);

        return (
          <div className={`fixed top-16 sm:top-20 inset-x-0 bottom-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto ${isDarkMode ? 'bg-slate-950/60' : 'bg-slate-900/20'}`}>
            <div className={`relative max-w-3xl w-full flex flex-col overflow-hidden flex-1 max-h-full ${theme.glassCard} rounded-3xl sm:rounded-4xl border-2 shadow-[0_32px_80px_rgba(0,0,0,0.4)] ${isDarkMode ? 'border-orange-500/30' : 'border-white/80'}`}>
              
              <div className={`w-full p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/50 border-slate-200/60'} shrink-0 relative z-30`}>
                <button onClick={() => setViewAssetModal(null)} className={`absolute top-4 right-4 p-2 rounded-full ${theme.glassInnerCard} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-400 transition-all cursor-pointer shadow-sm active:scale-90 z-40`}><X size={16}/></button>

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

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end shrink-0 mt-1 md:mt-0 pr-10 md:pr-12">
                  <button onClick={() => handlePrintPhysicalSticker(viewAssetModal, liveModalTag)} className={`px-4 py-2 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-xl text-[10px] font-bold uppercase tracking-wider flex justify-center items-center gap-1.5 transition-all cursor-pointer border border-orange-400`}>
                    <Printer size={14} /> <span>Print QR</span>
                  </button>
                  {!isEditingAsset && (
                    <>
                      <button onClick={() => setIsEditingAsset(true)} className={`px-4 py-2 ${theme.glassInnerCard} ${theme.textMain} hover:opacity-90 hover:text-orange-500 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors`}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button onClick={() => handleDeleteAsset(viewAssetModal.id)} className={`px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors`}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5 ${isEditingAsset ? 'pb-32' : 'pb-6'}`}>
                {isEditingAsset ? (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className={`flex justify-between items-center pb-1.5 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest text-orange-500`}>Editing Hardware Record</span>
                    </div>

                    <div className={`relative z-70 grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 ${theme.glassInnerCard} rounded-3xl border ${isDarkMode ? 'border-white/10' : 'border-white/70'}`}>
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Asset Category *</label>
                        <PremiumGlassDropdown 
                          value={editForm.category} 
                          onChange={(newCat: string) => { 
                            setEditForm({ ...editForm, category: newCat, asset_tag: generateCategoryPrefix(newCat, editForm.asset_tag) }); 
                          }} 
                          options={ASSET_CATEGORIES.map(c => ({ value: c, label: c }))} 
                          theme={theme} 
                          isDarkMode={isDarkMode}
                          className="py-3 px-3"
                        />
                      </div>
                      <div>
                        <div className={`flex flex-wrap justify-between items-center gap-2 mb-1.5`}>
                          <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMain}`}>Asset Tag ID</label>
                          <button type="button" onClick={() => setEditForm({...editForm, asset_tag: generateCategoryPrefix(editForm.category)})} className="px-2 py-1 rounded-md bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs border border-orange-400 cursor-pointer active:scale-95">
                            <RefreshCw size={12} className="shrink-0" />
                            <span>Generate New</span>
                          </button>
                        </div>
                        <input type="text" value={editForm.asset_tag} onChange={e => setEditForm({...editForm, asset_tag: e.target.value})} className={`w-full p-3 ${theme.inputBg} rounded-xl font-mono uppercase text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                    </div>

                    <div className="relative z-60">
                      <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Factory Serial Number (Laptop S/N) *</label>
                      <input type="text" required value={editForm.serial} onChange={e => setEditForm({...editForm, serial: e.target.value})} placeholder="e.g. M27370-00105" className={`w-full p-3 ${theme.inputBg} rounded-xl font-mono uppercase text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                    </div>

                    <div className="relative z-50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Brand / Manufacturer</label>
                        <input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                      <div>
                        <div className={`flex flex-wrap justify-between items-center gap-2 mb-1.5`}>
                          <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMain}`}>Asset Name *</label>
                          <button type="button" onClick={() => setEditForm({...editForm, system_specs: autoDetectSpecs(`${editForm.name} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)})} className="px-2.5 py-1 rounded-lg bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-[0_4px_15px_rgba(249,115,22,0.4)] border border-orange-400 cursor-pointer active:scale-95">
                            <Zap size={12} className="shrink-0" />
                            <span>Auto-Detect Specs</span>
                          </button>
                        </div>
                        <input type="text" value={editForm.name} onChange={e => { const v = e.target.value; setEditForm({...editForm, name: v, system_specs: autoDetectSpecs(`${v} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)}); }} className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                    </div>

                    <div className="relative z-40 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Price (₹)</label>
                        <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className={`w-full p-3 ${theme.inputBg} rounded-xl font-mono text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Purchase Date</label>
                        <input type="date" value={editForm.purchase_date} onChange={e => setEditForm({...editForm, purchase_date: e.target.value})} className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Warranty Expiry</label>
                        <input type="date" value={editForm.warranty_expiry} onChange={e => setEditForm({...editForm, warranty_expiry: e.target.value})} className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
                      </div>
                    </div>

                    <div className="relative z-30 space-y-2">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMain}`}>System Hardware Specifications</label>
                        <button type="button" onClick={() => setEditForm({...editForm, system_specs: autoDetectSpecs(`${editForm.name} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)})} className="px-2.5 py-1 rounded-md bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs border border-orange-400 cursor-pointer active:scale-95">
                          <Zap size={12} className="shrink-0" />
                          <span>Auto-Detect</span>
                        </button>
                      </div>
                      <input type="text" value={editForm.system_specs} onChange={e => setEditForm({...editForm, system_specs: e.target.value})} placeholder="e.g. Intel Core i7 (vPro) | 16GB RAM | 512GB SSD | Win 11 Pro" className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} />
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
                          className="py-3 px-3"
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
                          className="py-3 px-3"
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
                          className="py-3 px-3"
                        />
                      </div>
                    </div>

                    <div className={`relative z-10 p-5 ${theme.glassInnerCard} rounded-3xl border ${isDarkMode ? 'border-white/10' : 'border-white/80'}`}>
                      <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>Re-Assign Holder</label>
                      <SearchableStaffDropdown value={editForm.assignee} onChange={(val: string) => setEditForm({...editForm, assignee: val})} staffList={staffList} placeholder="Type employee name or EMP code..." theme={theme} isDarkMode={isDarkMode} />
                    </div>

                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`p-4 sm:p-5 ${theme.glassInnerCard} rounded-3xl`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Category</p><p className={`text-sm font-bold mt-1 text-orange-500`}>{viewAssetModal.category || 'Laptop'}</p></div>
                      <div className={`p-4 sm:p-5 ${theme.glassInnerCard} rounded-3xl`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Brand</p><p className={`text-sm font-bold mt-1 ${theme.textMain}`}>{viewAssetModal.brand || 'N/A'}</p></div>
                      <div className={`p-4 sm:p-5 ${theme.glassInnerCard} rounded-3xl`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Assets Name</p><p className={`text-sm font-bold mt-1 truncate ${theme.textMain}`} title={viewAssetModal.safe_display_name}>{viewAssetModal.safe_display_name}</p></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`p-4 sm:p-5 ${theme.glassInnerCard} rounded-3xl`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Purchase Date</p><p className={`text-sm font-semibold mt-1 ${theme.textMain}`}>{safeDate(viewAssetModal.purchase_date)}</p></div>
                      <div className={`p-4 sm:p-5 ${theme.glassInnerCard} rounded-3xl`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Warranty Date</p><p className={`text-sm font-semibold mt-1 ${theme.textMain}`}>{safeDate(viewAssetModal.warranty_expiry)}</p></div>
                      <div className={`p-4 sm:p-5 flex flex-col justify-center ${theme.glassInnerCard} rounded-3xl`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Inspection Status</p><div className="flex items-center gap-1 mt-1.5"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${getInspectionStatusColor(viewAssetModal.live_inspection_status)}`}>{viewAssetModal.live_inspection_status || 'Approved'}</span></div></div>
                    </div>

                    <div className={`p-4 sm:p-5 flex items-center gap-3 ${theme.glassInnerCard} rounded-3xl`}>
                      <Cpu size={24} className="text-orange-500 shrink-0" />
                      <div className="w-full">
                        <span className={`text-[10px] font-bold uppercase tracking-widest block ${theme.textSub}`}>System Hardware Configuration:</span>
                        <p className={`text-sm font-semibold mt-0.5 ${theme.textMain}`}>{viewAssetModal.system_specs || 'Standard Business Hardware Configuration'}</p>
                      </div>
                    </div>

                    <div className={`p-4 sm:p-5 flex items-center justify-between ${theme.glassInnerCard} rounded-3xl`}>
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${theme.textSub}`}>Assigned Employee Holder:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme.glassCard} text-orange-500`}><User size={18}/></div>
                          <span className={`text-base font-bold ${theme.textMain}`}>{viewAssetModal.staff_name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${theme.textSub}`}>EMP CODE</span>
                         <span className={`font-mono font-bold px-3 py-1.5 rounded-xl text-[11px] border shadow-xs ${isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-200'} shrink-0`}>
                           {viewAssetModal.emp_code}
                         </span>
                      </div>
                    </div>

                    {(viewAssetModal.assigned_to || viewAssetModal.status === 'Assigned' || viewAssetModal.status === 'Pending Handover') && (
                      <div className={`p-4 sm:p-5 ${theme.glassInnerCard} rounded-3xl`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl flex items-center justify-center shrink-0 text-orange-500 ${theme.glassCard}`}>
                              <FileText size={20} />
                            </div>
                            <div>
                              <h4 className={`text-[11px] font-bold uppercase tracking-widest ${theme.textMain}`}>Official Handover Agreement</h4>
                              <p className={`text-[10px] font-semibold mt-0.5 ${theme.textSub}`}>Digitally executed custody document with specs and policies.</p>
                            </div>
                          </div>
                          <button onClick={() => handleGenerateHandoverPDF(viewAssetModal)} className={`px-5 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 border border-orange-400 active:scale-95`}>
                            <Download size={14} /> <span>PDF</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={`p-5 ${theme.glassInnerCard} rounded-3xl`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <HistoryIcon size={16} className="text-orange-500" />
                          <h4 className={`text-[12px] font-bold uppercase tracking-widest ${theme.textMain}`}>Lifecycle & Activity History</h4>
                        </div>
                        {assetHistory.length > 1 && (
                          <button onClick={() => setShowFullHistory(!showFullHistory)} className={`text-[10px] font-bold text-orange-500 hover:underline cursor-pointer flex items-center gap-1 ${theme.glassCard} px-2.5 py-1.5 rounded-lg`}>
                            {showFullHistory ? (<><span>Show Less</span> <ChevronUp size={14}/></>) : (<><span>Full History ({assetHistory.length})</span> <ChevronDown size={14}/></>)}
                          </button>
                        )}
                      </div>
                      
                      {isLoadingHistory ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-orange-500 size-6"/></div>
                      ) : assetHistory.length === 0 ? (
                        <p className={`text-[12px] font-medium italic ${theme.textSub}`}>No history logs found for this asset.</p>
                      ) : (
                        <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                          {visibleHistory.map((log, idx) => {
                            let photosArray: string[] = [];
                            try {
                              if (Array.isArray(log.photos)) photosArray = log.photos;
                              else if (typeof log.photos === 'string' && log.photos.startsWith('[')) {
                                const parsed = JSON.parse(log.photos);
                                if (Array.isArray(parsed)) photosArray = parsed;
                              } else if (log.photos && typeof log.photos === 'object') {
                                photosArray = Object.values(log.photos);
                              }
                            } catch(e){}

                            return (
                              <div key={idx} className={`p-4 ${theme.glassCard} rounded-2xl shadow-xs border ${isDarkMode ? 'border-white/10' : 'border-white/60'}`}>
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border transition-all ${getInspectionStatusColor(log.status)}`}>{log.status}</span>
                                    <p className={`text-sm font-bold mt-2 ${theme.textMain}`}>{log.staff_name} <span className="text-purple-500 dark:text-purple-400 font-mono">({log.emp_code})</span></p>
                                  </div>
                                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${theme.glassInnerCard} ${theme.textSub}`}>{safeDate(log.created_at)}</span>
                                </div>
                                {log.notes && (
                                  <div className={`mt-2 text-sm font-medium p-3 ${theme.glassInnerCard} ${theme.textMain} rounded-xl whitespace-pre-wrap border ${isDarkMode ? 'border-white/10' : 'border-white/60'}`}>
                                    {log.notes}
                                  </div>
                                )}
                                {photosArray.length > 0 && (
                                  <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
                                    {photosArray.map((url, i) => (
                                      <img key={`hist-photo-${i}`} src={url} alt="Log" className="h-12 w-12 rounded-xl object-cover border border-white/20 shadow-xs" />
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

              {isEditingAsset && (
                <div className={`p-4 sm:p-5 shrink-0 flex gap-3 border-t ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-white/40 bg-white/30'} z-50`}>
                  <button type="button" onClick={() => setIsEditingAsset(false)} className={`px-6 py-3.5 rounded-xl ${theme.glassInnerCard} ${theme.textMain} hover:opacity-80 transition-all text-[11px] font-bold uppercase tracking-widest cursor-pointer shadow-xs active:scale-95`}>Cancel</button>
                  <button type="button" onClick={handleUpdateExistingAsset} disabled={isUpdating} className="flex-1 py-3.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-orange-400 active:scale-95 disabled:opacity-50">
                    {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save Secure Record
                  </button>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* ADD NEW ASSET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-24 sm:pt-28 pb-6 px-4 backdrop-blur-xl animate-in fade-in duration-200 bg-black/20">
          <div className={`relative max-w-2xl w-full flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.15)] border flex-1 max-h-full rounded-4xl animate-in zoom-in-95 duration-200 ${theme.glassCard}`}>
            
            <div className={`p-4 sm:p-5 border-b flex justify-between items-center relative z-30 shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-white/50 bg-white/40'}`}>
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
              <button onClick={() => setIsAddModalOpen(false)} className={`absolute top-4 right-4 p-2 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-90 ${theme.glassInnerCard} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-400 z-40`} title="Close Modal">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveNewAsset} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-4 sm:p-6 space-y-5 pb-8">
                
                <div className={`relative z-70 grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 ${theme.glassInnerCard} rounded-3xl border ${isDarkMode ? 'border-white/10' : 'border-white/80'}`}>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textMain}`}>
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
                      className="py-3 px-3"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                      <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMain}`}>
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
                      className={`w-full p-3 ${theme.inputBg} rounded-xl font-mono uppercase text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                </div>

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
                      className={`w-full p-3 ${theme.inputBg} rounded-xl font-mono uppercase text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
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
                      className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                </div>

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
                      className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
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
                      className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                </div>

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
                      className={`w-full p-3 ${theme.inputBg} rounded-xl font-mono text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
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
                      className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
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
                      className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
                    />
                  </div>
                </div>

                <div className="relative z-30 space-y-2">
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
                    className={`w-full p-3 ${theme.inputBg} rounded-xl text-sm font-semibold transition-all outline-none border ${isDarkMode ? 'border-white/20' : 'border-white/70'}`} 
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
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
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
                      className="py-3 px-3"
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
                      className="py-3 px-3"
                    />
                  </div>
                </div>

                <div className={`relative z-10 p-5 ${theme.glassInnerCard} rounded-3xl border ${isDarkMode ? 'border-white/10' : 'border-white/80'}`}>
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
              <div className={`p-4 sm:p-5 shrink-0 flex gap-4 border-t ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-white/40 bg-white/30'}`}>
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className={`px-6 py-3.5 rounded-xl ${theme.glassInnerCard} ${theme.textMain} hover:opacity-80 transition-all text-[11px] font-bold uppercase tracking-widest cursor-pointer shadow-xs active:scale-95`}
                >
                  Cancel
                </button>

                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="flex-1 py-3.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all border border-orange-500 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} 
                  <span>Register New Asset</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-start pt-24 sm:pt-28 px-4 backdrop-blur-md animate-in fade-in duration-200 bg-black/20">
          <div className={`max-w-md w-full p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200 ${theme.glassCard} rounded-4xl border-2 ${isDarkMode ? 'border-orange-500/30' : 'border-white/80'} space-y-5`}>
            <div className={`flex justify-between items-center pb-3 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${theme.textMain}`}><Upload size={18} className="text-orange-500"/> Bulk Asset Import</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className={`p-2 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-90 ${theme.glassInnerCard} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-400`}><X size={16}/></button>
            </div>
            
            <div className="space-y-4 text-left">
              <button className={`w-full py-3.5 ${theme.glassInnerCard} ${theme.textMain} hover:border-orange-500 hover:text-orange-500 rounded-2xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm`}>
                <Download size={16} className="text-orange-500"/> <span>Download CSV Template</span>
              </button>
            </div>

            <div className={`p-8 border-2 border-dashed ${theme.glassInnerCard} rounded-3xl transition-colors flex flex-col items-center justify-center gap-4 hover:border-orange-500/50`}>
              <FileSpreadsheet size={48} className="text-orange-500 animate-pulse" />
              <input type="file" accept=".csv" className={`w-full text-xs font-bold cursor-pointer transition-all file:mr-3 file:py-2.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:cursor-pointer ${theme.textMain} file:bg-orange-500 file:text-white hover:file:opacity-90 shadow-xs`} />
            </div>

            <button className={`w-full py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all border ${isDarkMode ? 'bg-zinc-800/40 text-zinc-500 border-zinc-700/50' : 'bg-slate-300/40 text-slate-500 border-slate-300/60'} cursor-not-allowed`}>
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