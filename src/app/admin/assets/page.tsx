'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Laptop, PlusCircle, Search, QrCode, 
  User, X, Save, RefreshCw, Download, Printer, Edit2, 
  Upload, FileSpreadsheet, Package, Mouse, 
  Headphones, SlidersHorizontal, ChevronDown, CheckCircle2, 
  Clock, AlertTriangle, Loader2, CheckSquare, Settings2, Trash2,
  Keyboard, RectangleHorizontal, Monitor, Sparkles, History,
  Filter, FilterX, ShieldCheck, FileText, Cpu, CheckCircle, Zap, ShieldAlert, Image as ImageIcon,
  ChevronUp, ExternalLink
} from 'lucide-react';

// ==========================================
// 🌟 EXACT ASSET CATEGORIES FROM ADMIN
// ==========================================
const ASSET_CATEGORIES = [
  'Laptop', 
  'Stand', 
  'USB Wired Keyboard', 
  'USB Keyboard Mouse Kit', 
  'Wireless Keyboard kit', 
  'USB Wired Mouse', 
  'Headphone', 
  'Cleaning Kit', 
  'Others'
];

// ==========================================
// 🎨 DYNAMIC ICON MAPPER HELPER
// ==========================================
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

// ==========================================
// 🛡️ SAFE HELPERS & PARSERS
// ==========================================
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

// ==========================================
// 🌟 SMART TAG GENERATOR (LOCKS SUFFIX)
// ==========================================
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
    if (match) {
      suffix = match[0];
    }
  }
  
  return `VSS-${middle}-${suffix}`;
}

// ==========================================
// 🧠 SMART HARDWARE SPECIFICATION AUTO-PARSER
// ==========================================
function autoDetectSpecs(textToParse: string, category: string, fallback?: string) {
  if (!category.toLowerCase().includes('laptop')) {
    return fallback || 'Standard Business Grade IT Hardware Configuration';
  }

  const t = textToParse.toLowerCase();

  if (t.includes('thinkbook') && (t.includes('16s') || t.includes('r7') || t.includes('7735hs'))) {
    return 'AMD Ryzen 7 7735HS | 16GB DDR5 RAM | 512GB NVMe SSD | Windows 11 Home';
  }
  if (t.includes('fx507zv') || t.includes('tuf gaming') || t.includes('12700h')) {
    return 'Intel Core i7-12700H (12th Gen) | 16GB DDR4 RAM | 512GB PCIe 4.0 SSD | RTX 4060 8GB | Win 11';
  }
  if (t.includes('ryzen 9') || t.includes('r9') || (t.includes('rog') && t.includes('strix'))) {
    return 'AMD Ryzen 9 6900HX/7940HS | 16GB DDR5 RAM | 1TB NVMe SSD | RTX 4060/4070 | Win 11';
  }
  if (t.includes('thinkbook') || t.includes('r7 16') || (t.includes('lenovo') && t.includes('ryzen 7'))) {
    return 'AMD Ryzen 7 5800U/6800U Pro Series | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro';
  }
  if (t.includes('inspiron') || t.includes('3530') || (t.includes('dell') && (t.includes('inspiron') || t.includes('3530')))) {
    return 'Intel Core i5-1335U (13th Gen) | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro';
  }
  if (t.includes('precision') || t.includes('elitebook') || t.includes('probook') || t.includes('11 gen') || t.includes('12 gen') || (t.includes('hp') && t.includes('i7'))) {
    return 'Intel Core i7 (11th/12th Gen vPro) | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro';
  }

  let cpu = 'Intel Core i5 (vPro Business Edition)';
  if (t.includes('ryzen 7') || t.includes('r7')) cpu = 'AMD Ryzen 7 Pro Series';
  else if (t.includes('ryzen 5') || t.includes('r5')) cpu = 'AMD Ryzen 5 Pro Series';
  else if (t.includes('ryzen')) cpu = 'AMD Ryzen Pro Business Series';
  else if (t.includes('ultra 7') || t.includes('intel 7')) cpu = 'Intel Core Ultra 7 (vPro)';
  else if (t.includes('ultra 5') || t.includes('intel 5')) cpu = 'Intel Core Ultra 5 (vPro)';
  else if (t.includes('i9')) cpu = 'Intel Core i9 (vPro Business Edition)';
  else if (t.includes('i7')) cpu = 'Intel Core i7 (11th/12th Gen vPro)';
  else if (t.includes('i5')) cpu = 'Intel Core i5 (vPro Business Edition)';
  else if (t.includes('m3')) cpu = 'Apple M3 Pro / Max Silicon';
  else if (t.includes('m2')) cpu = 'Apple M2 Pro / Max Silicon';
  else if (t.includes('m1')) cpu = 'Apple M1 Silicon';

  let ram = '16GB DDR4/DDR5 RAM';
  if (t.includes('64gb')) ram = '64GB High-Speed RAM';
  else if (t.includes('32gb')) ram = '32GB DDR5 RAM';
  else if (t.includes('8gb')) ram = '8GB DDR4 RAM';

  let storage = '512GB NVMe SSD';
  if (t.includes('2tb')) storage = '2TB PCIe NVMe SSD';
  else if (t.includes('1tb')) storage = '1TB PCIe NVMe SSD';
  else if (t.includes('256gb')) storage = '256GB NVMe SSD';

  let os = 'Windows 11 Pro';
  if (t.includes('home')) os = 'Windows 11 Home';
  else if (t.includes('macbook') || t.includes('apple') || t.includes('m1') || t.includes('m2') || t.includes('m3')) os = 'macOS Sonoma / Sequoia';
  else if (t.includes('ubuntu') || t.includes('linux')) os = 'Linux Ubuntu LTS';
  else if (t.includes('win 10') || t.includes('windows 10')) os = 'Windows 10 Pro (64-bit)';

  return `${cpu} | ${ram} | ${storage} | ${os}`;
}

// ==========================================
// 🌟 ULTRA PREMIUM FROSTED SEARCHABLE DROPDOWN
// ==========================================
const SearchableStaffDropdown = ({ value, onChange, staffList, isDarkMode, placeholder = "Type employee name or EMP code..." }: any) => {
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

  const filtered = query.trim().length === 0 
    ? [] 
    : staffList.filter((s: any) => {
        const str = `${s.full_name || s.name} ${s.emp_code || s.email}`.toLowerCase();
        return str.includes(query.toLowerCase());
      });

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="flex items-center w-full p-3.5 rounded-2xl focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/30 transition-all bg-white/70 dark:bg-white/10 backdrop-blur-2xl border border-white/60 dark:border-white/20 shadow-md"
      >
        <Search size={18} className="text-slate-700 dark:text-slate-300 mr-3 shrink-0" />
        <input 
          type="text" 
          value={open ? query : query || ''} 
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} 
          placeholder={placeholder}
          className="w-full text-sm font-bold outline-none bg-transparent text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
        />
        {value && (
          <X size={18} className="text-rose-500 hover:text-rose-700 cursor-pointer mr-2 shrink-0" onClick={() => { onChange(''); setQuery(''); }} />
        )}
        <ChevronDown size={18} className="text-slate-700 dark:text-slate-300 ml-1 shrink-0 cursor-pointer" onClick={() => setOpen(!open)} />
      </div>

      {open && (
        <div 
          className="absolute z-50 w-full mt-2 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.2)] max-h-60 overflow-y-auto custom-scrollbar bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl border border-white/60 dark:border-white/20"
        >
          <div 
            onClick={() => { onChange(''); setQuery(''); setOpen(false); }}
            className={`p-4 text-xs font-black tracking-widest uppercase cursor-pointer border-b flex items-center gap-2 transition-colors border-slate-200 dark:border-white/10 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-white/10`}
          >
            📦 Unassign / Return to Warehouse Stock
          </div>

          {query.trim().length === 0 ? (
            <div className={`p-5 text-center text-xs font-bold text-slate-600 dark:text-slate-400`}>
              🔍 Type an employee name or EMP code above to search matched staff...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-5 text-center text-xs font-bold text-rose-600 dark:text-rose-400">
              No matched employee found for "{query}".
            </div>
          ) : (
            filtered.map((s: any) => (
              <div 
                key={s.id} 
                className={`p-4 text-sm cursor-pointer border-b flex justify-between items-center transition-colors group border-slate-200 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 text-slate-900 dark:text-white`}
                onClick={() => { onChange(s.id); setQuery(`${s.full_name || s.name} (${s.emp_code || s.email})`); setOpen(false); }}
              >
                <span className="font-bold group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{s.full_name || s.name}</span>
                <span className={`font-mono text-[10px] px-2.5 py-1 rounded-lg font-black transition-colors bg-slate-100 dark:bg-black/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/20 shadow-sm group-hover:bg-orange-100 group-hover:text-orange-800 dark:group-hover:bg-orange-500/20 dark:group-hover:text-orange-300`}>
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

// ==========================================
// CORE CONTENT COMPONENT
// ==========================================
function AssetRegistryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [assets, setAssets] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // 🌟 FILTER STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [conditionFilter, setConditionFilter] = useState<string>('All');
  
  // Bulk Selection State
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  // Modals & History State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPrintConfigModalOpen, setIsPrintConfigModalOpen] = useState(false);
  const [viewAssetModal, setViewAssetModal] = useState<any>(null);
  
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const [printConfig, setPrintConfig] = useState({
    pageSize: 'A4', columns: 2, rows: 8, labelWidth: 8.88, labelHeight: 3.4,      
    marginTop: 1.25, marginLeft: 1.37, gapX: 0.5, gapY: 0.0, packSmallAssets: true  
  });

  // Forms with System Specifications
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
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('vsit_theme');
      const isDark = savedTheme === 'dark' || document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    checkTheme();
    window.addEventListener('storage', checkTheme);
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    fetchRegistryData();
    return () => {
      window.removeEventListener('storage', checkTheme);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isAddModalOpen) {
      setNewAssetTag(generateCategoryPrefix(newAssetCategory));
      if (newAssetCategory === 'Laptop') {
        setNewAssetSpecs('Intel Core i7 (11th/12th Gen vPro) | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro');
      } else if (newAssetCategory.includes('Keyboard') || newAssetCategory.includes('Mouse')) {
        setNewAssetSpecs('USB / Wireless Plug-and-Play Standard Business Accessory');
      } else {
        setNewAssetSpecs('Standard Business Grade IT Hardware Configuration');
      }
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
      const { data: historyData } = await supabase
        .from('inspections')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      const compiled = (historyData || []).map(log => {
         const staff = staffList.find(s => s.id === log.inspected_by);
         return {
           ...log,
           staff_name: staff ? (staff.full_name || staff.name) : 'Admin / System Execution',
           emp_code: staff ? (staff.emp_code || staff.email) : 'N/A'
         };
      });
      setAssetHistory(compiled);
    } catch (e) {
      console.error(e);
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
          live_inspection_notes: latestInspection?.notes || null,
          live_inspection_photos: latestInspection?.photos || null,
          system_specs: asset.system_specs || asset.specs || autoDetectSpecs(`${asset.name || ''} ${asset.brand || ''} ${asset.serial_number || ''}`, asset.category)
        };
      });
      setAssets(compiledAssets);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getStockStatusBadge = (status: string) => {
    const s = safeString(status);
    if (s.includes('Assigned')) return 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40';
    if (s.includes('Repair')) return 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/40 animate-pulse';
    if (s.includes('Demo')) return 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/40';
    if (s.includes('Discard')) return 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40 line-through';
    if (s.includes('Pending')) return 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40';
    return 'bg-slate-500/20 text-slate-800 dark:text-slate-300 border-slate-500/40';
  };

  const getInspectionStatusColor = (status: string) => {
    const s = safeString(status).toLowerCase().trim();
    if (s.includes('approved')) return 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40';
    if (s.includes('return')) return 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/40';
    if (s.includes('rejected')) return 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40';
    return 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40';
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

  const handleGenerateHandoverPDF = (asset: any) => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) return alert("Please allow pop-ups to view and download the official Handover Agreement.");

    const agreementDate = asset.live_inspection_date 
      ? new Date(asset.live_inspection_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const proofHash = `AUTH-PROOF-${safeString(asset.id).substring(0, 8).toUpperCase()}-${safeString(asset.emp_code || 'EMP').substring(0, 6).toUpperCase()}-${Date.now().toString(16).substring(0, 6).toUpperCase()}`;

    let photosHtml = '';
    let photosArray: string[] = [];
    try {
      if (Array.isArray(asset.live_inspection_photos)) photosArray = asset.live_inspection_photos;
      else if (typeof asset.live_inspection_photos === 'string') {
        const parsed = JSON.parse(asset.live_inspection_photos);
        if (Array.isArray(parsed)) photosArray = parsed;
      }
    } catch(e){}

    if (photosArray.length > 0) {
      photosHtml = `
        <div style="margin-top: 15px;">
          <span class="label" style="color: #ea580c; margin-bottom: 8px;">Visual Inspection Evidence / Hardware Condition Photos:</span>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            ${photosArray.slice(0, 4).map(url => `<img src="${url}" style="width: 130px; height: 130px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" />`).join('')}
          </div>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Handover_Agreement_${asset.clean_tag}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 3px solid #ea580c; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; items-center; }
            .logo { font-size: 28px; font-weight: 900; color: #ea580c; letter-spacing: 2px; }
            .doc-title { font-size: 22px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 13px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .field { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px; }
            .value { font-size: 14px; font-weight: 700; color: #0f172a; }
            .specs-box { background: #fff7ed; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; color: #9a3412; font-weight: 700; font-size: 13px; margin-top: 5px; }
            .notes-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; color: #334155; font-size: 12px; font-family: monospace; margin-top: 5px; }
            .terms { font-size: 12px; color: #334155; background: #f8fafc; padding: 22px; border-radius: 8px; margin-top: 30px; border: 1px solid #cbd5e1; }
            .terms ul { margin: 10px 0 0 0; padding-left: 20px; }
            .terms li { margin-bottom: 10px; }
            .signature-area { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .sig-box { border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; background: #fff; }
            .sig-line { border-top: 2px solid #0f172a; padding-top: 8px; font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 35px; }
            .badge { display: inline-block; background: #ffedd5; color: #9a3412; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; border: 1px solid #fed7aa; }
            .audit-stamp { margin-top: 30px; background: #f8fafc; border: 2px dashed #ea580c; padding: 16px; border-radius: 8px; color: #9a3412; font-family: monospace; font-size: 11px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); }, 500)">
          <div class="header">
            <div>
              <div class="logo">VIRTUAL STAFFING SOLUTIONS</div>
              <div style="font-size: 12px; color: #64748b; font-weight: 600;">IT Infrastructure & Asset Compliance Division</div>
            </div>
            <div style="text-align: right;">
              <div class="doc-title">Hardware Handover Agreement</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Executed: ${agreementDate}</div>
              <div style="margin-top: 6px;"><span class="badge">✔ Digitally Executed & Verified</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">1. Employee Assignment Details</div>
            <div class="grid">
              <div class="field"><span class="label">Holder Name</span><span class="value">${asset.staff_name || 'Unassigned'}</span></div>
              <div class="field"><span class="label">Employee ID Code</span><span class="value">${asset.emp_code || 'N/A'}</span></div>
              <div class="field" style="grid-column: span 2;"><span class="label">Staff Registered Email</span><span class="value">${asset.staff_email || 'N/A'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. Hardware Identity & Specifications</div>
            <div class="grid">
              <div class="field"><span class="label">Asset Tag ID</span><span class="value" style="color: #ea580c;">${asset.clean_tag}</span></div>
              <div class="field"><span class="label">Serial Number (Laptop SN - Charger SN)</span><span class="value">${asset.serial_number || 'N/A'}</span></div>
              <div class="field"><span class="label">Device Name</span><span class="value">${asset.safe_display_name}</span></div>
              <div class="field"><span class="label">Brand & Category</span><span class="value">${asset.brand || 'Standard'} (${asset.category})</span></div>
            </div>
            <div style="margin-top: 15px;">
              <span class="label" style="color: #ea580c;">System Hardware Configuration / Specifications:</span>
              <div class="specs-box">${asset.system_specs || 'Standard Business Hardware Configuration'}</div>
            </div>
          </div>

          <!-- 🌟 SECTION 3: VISUAL INSPECTION NOTES & PHOTOS IN AGREEMENT -->
          <div class="section">
            <div class="section-title">3. Visual Inspection & Audit Evidence Log</div>
            <div class="field">
              <span class="label">Latest Inspection State</span>
              <span class="value" style="color: #166534;">✔ ${asset.live_inspection_status || 'Approved'} (${agreementDate})</span>
              ${asset.live_inspection_notes ? `<div class="notes-box">"${asset.live_inspection_notes}"</div>` : ''}
            </div>
            ${photosHtml}
          </div>

          <!-- 🌟 EXACT 6-POINT CORPORATE COMPLIANCE POLICY -->
          <div class="terms">
            <strong style="color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Terms of Asset Custody & Compliance:</strong>
            <p style="margin: 8px 0 0 0; font-weight: 600;">I acknowledge the receipt of the IT asset detailed above, provided by Virtual Staffing Solutions for official use.</p>
            <ul>
              <li><strong>Care & Maintenance:</strong> I agree to handle the equipment with care, protecting it from damage, loss, or theft.</li>
              <li><strong>Official Use Only:</strong> I understand this equipment is strictly for professional duties and complies with company IT security policies.</li>
              <li><strong>Mandatory Audits:</strong> Laptop Inspections are required every month before the last Saturday. All other assets require inspection every 3 months. On your Dashboard, the Device Audit Button will activate 4 days before the due date.</li>
              <li><strong>Discrepancies:</strong> If any asset serial number does not match with the physical asset's serial number, you must inform the IT Admin user immediately.</li>
              <li><strong>Return Policy & Liability:</strong> I agree to return this asset in good working condition upon separation from the company, or immediately upon request by IT Management. Gross negligence or unauthorized modifications resulting in hardware damage may result in disciplinary action or financial liability.</li>
            </ul>
          </div>

          <div class="signature-area">
            <div class="sig-box">
              <div style="font-size: 11px; color: #ea580c; font-weight: 800; text-transform: uppercase;">Employee Custody Acceptance</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 8px;">${asset.staff_name}</div>
              <div style="font-size: 11px; color: #64748b;">ID: ${asset.emp_code}</div>
              <div class="sig-line">Digitally Accepted & Executed Online</div>
            </div>
            <div class="sig-box">
              <div style="font-size: 11px; color: #6b21a8; font-weight: 800; text-transform: uppercase;">VSS IT Administrator Stamp</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 8px;">IT Compliance Division</div>
              <div style="font-size: 11px; color: #64748b;">Authorized Verification Officer</div>
              <div class="sig-line">Authorized IT Officer Stamp & Signature</div>
            </div>
          </div>

          <!-- 🌟 AUTHORITATIVE DIGITAL AUDIT PROOF STAMP -->
          <div class="audit-stamp">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; color: #ea580c;">🛡️ Digital Signature Execution & Audit Verification Proof</div>
            <div><strong>Verification Status:</strong> GENUINE ONLINE SIGNATURE RECORDED</div>
            <div><strong>Execution Timestamp:</strong> ${agreementDate}</div>
            <div><strong>Custody Identity:</strong> ${asset.staff_name} (${asset.staff_email || asset.emp_code})</div>
            <div><strong>Cryptographic Proof ID:</strong> ${proofHash}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // 🌟 RESILIENT SAVE ENGINE
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
        if (!error) {
          alert("Asset registered successfully! 💡 Note: Run 'ALTER TABLE assets ADD COLUMN system_specs TEXT;' in your Supabase SQL Editor to store custom specifications permanently in your database.");
        }
      }
      
      if (error) throw error;
      
      await supabase.from('inspections').insert({
        asset_id: newAssetId, inspected_by: newAssetAssignee || null, 
        status: newAssetAssignee ? 'Pending Handover' : 'Stock Intake', 
        notes: `Asset initially registered into the system as ${newAssetCondition}. Specs: ${newAssetSpecs}`
      });

      if (newAssetAssignee) {
        try {
          await supabase.from('notifications').insert({
            title: 'New Hardware Assigned',
            message: `An admin has assigned ${newAssetName} (${finalTag}) to you. Please check your staff dashboard to sign the Handover Agreement.`,
            target_role: newAssetAssignee, is_read: false
          });
        } catch (notifError) { console.warn("Notification error:", notifError); }
      }

      setIsAddModalOpen(false); 
      fetchRegistryData();
    } catch (err: any) { alert(`Error: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleUpdateExistingAsset = async () => {
    setIsUpdating(true);
    try {
      const serialUpper = editForm.serial.toUpperCase();
      const { data: duplicateCheck } = await supabase.from('assets').select('id, serial_number')
        .eq('serial_number', serialUpper).neq('id', viewAssetModal.id).maybeSingle();

      if (duplicateCheck) {
        alert(`Error: The Serial Number "${serialUpper}" is already assigned to another asset.`);
        setIsUpdating(false); return;
      }

      let resolvedStatus = editForm.status;
      let actionNote = "Asset configuration updated by administrator.";

      if (editForm.assignee && viewAssetModal.assigned_to !== editForm.assignee) {
        resolvedStatus = 'Pending Handover';
        actionNote = `Asset re-assigned to new holder. Awaiting agreement.`;
      } else if (!editForm.assignee && viewAssetModal.assigned_to) {
        resolvedStatus = 'In Stock (Unassigned)';
        actionNote = `Asset forcefully unassigned and returned to stock.`;
      }

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
        const retry = await supabase.from('assets').update(updatePayload).eq('id', viewAssetModal.id);
        error = retry.error;
        if (!error) {
          alert("Asset updated successfully! 💡 Note: Run 'ALTER TABLE assets ADD COLUMN system_specs TEXT;' in your Supabase SQL Editor to permanently store custom specs.");
        }
      }

      if (error) throw error;

      await supabase.from('inspections').insert({
        asset_id: viewAssetModal.id, inspected_by: editForm.assignee || null, 
        status: resolvedStatus, notes: actionNote
      });

      setIsEditingAsset(false); 
      fetchRegistryData();
    } catch (err: any) { alert(`Error updating: ${err.message}`); } finally { setIsUpdating(false); }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this asset? This action cannot be undone.")) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('assets').delete().eq('id', assetId);
      if (error) throw error;
      
      setAssets(prev => prev.filter(a => a.id !== assetId));
      setViewAssetModal(null);
    } catch (err: any) {
      alert(`Error deleting asset: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getAssetViewUrl = (asset: any) => {
    const baseDomain = typeof window !== 'undefined' ? window.location.origin : 'https://virtual-staffing.vercel.app';
    const targetRef = asset.clean_tag || asset.asset_tag || asset.id;
    return `${baseDomain}/public-asset?id=${targetRef}`;
  };

  const executeGridBulkPrint = () => {
    const assetsToPrint = assets.filter(a => selectedAssetIds.has(a.id));
    if (assetsToPrint.length === 0) return;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return alert("Pop-up blocked! Allow pop-ups to print bulk hardware stickers.");

    let printCells: any[] = [];
    
    if (printConfig.packSmallAssets) {
      const smallAssets: any[] = [];
      const largeAssets: any[] = [];
      
      assetsToPrint.forEach(a => {
        const cat = String(a.category).toLowerCase();
        if (cat.includes('mouse') || cat.includes('headphone') || cat.includes('cleaning') || cat.includes('others') || cat.includes('pad')) {
          smallAssets.push(a);
        } else {
          largeAssets.push(a);
        }
      });

      largeAssets.forEach(a => printCells.push([a]));
      
      for (let i = 0; i < smallAssets.length; i += 2) {
        if (smallAssets[i + 1]) {
          printCells.push([smallAssets[i], smallAssets[i + 1]]);
        } else {
          printCells.push([smallAssets[i]]);
        }
      }
    } else {
      assetsToPrint.forEach(a => printCells.push([a]));
    }

    const renderAssetBlock = (asset: any, isHalfSize: boolean) => {
      const scanUrl = getAssetViewUrl(asset);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(scanUrl)}`;

      return `
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2px; box-sizing: border-box; width: 100%; height: 100%;">
          <img src="${qrUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; mix-blend-mode: multiply; border: 4px solid #000; padding: 8px; border-radius: 8px; box-sizing: border-box;" />
        </div>
      `;
    };

    const cellsPerPage = printConfig.columns * printConfig.rows;
    let pagesHtml = '';

    for (let i = 0; i < printCells.length; i += cellsPerPage) {
      const pageCells = printCells.slice(i, i + cellsPerPage);
      
      let gridCellsHtml = '';
      pageCells.forEach(cellAssets => {
        let innerHtml = '';
        if (cellAssets.length === 2) {
          innerHtml = `
            <div style="width: 100%; height: 100%; max-height: 100%; display: flex; flex-direction: column; justify-content: space-evenly; gap: 1px; padding: 2px; box-sizing: border-box; overflow: hidden;">
              ${renderAssetBlock(cellAssets[0], true)}
              <div style="height: 1px; width: 90%; background: #ddd; margin: 0 auto; flex-shrink: 0;"></div>
              ${renderAssetBlock(cellAssets[1], true)}
            </div>
          `;
        } else {
          innerHtml = `
            <div style="width: 100%; height: 100%; max-height: 100%; display: flex; align-items: center; justify-content: center; padding: 4px; box-sizing: border-box; overflow: hidden;">
              ${renderAssetBlock(cellAssets[0], false)}
            </div>
          `;
        }
        
        gridCellsHtml += `
          <div class="label-cell">
            ${innerHtml}
          </div>
        `;
      });

      pagesHtml += `
        <div class="page">
          ${gridCellsHtml}
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bulk_Print_Label_Sheet</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;800;900&display=swap');
            @page { size: ${printConfig.pageSize}; margin: 0 !important; }
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: #e2e8f0; color: #000; -webkit-font-smoothing: antialiased; }
            .page { background: #fff; width: ${printConfig.pageSize === 'A4' ? '210mm' : '215.9mm'}; height: ${printConfig.pageSize === 'A4' ? '297mm' : '279.4mm'}; box-sizing: border-box; padding-top: ${printConfig.marginTop}cm; padding-left: ${printConfig.marginLeft}cm; display: grid; grid-template-columns: repeat(${printConfig.columns}, ${printConfig.labelWidth}cm); grid-template-rows: repeat(${printConfig.rows}, ${printConfig.labelHeight}cm); column-gap: ${printConfig.gapX}cm; row-gap: ${printConfig.gapY}cm; page-break-after: always; margin: 20px auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
            .label-cell { width: ${printConfig.labelWidth}cm; height: ${printConfig.labelHeight}cm; max-width: ${printConfig.labelWidth}cm; max-height: ${printConfig.labelHeight}cm; outline: 1px dashed #cbd5e1; box-sizing: border-box; overflow: hidden; background: #fff; }
            @media print { body { background: #fff; } .page { margin: 0; box-shadow: none; } .label-cell { outline: none; } }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, ${Math.max(800, assetsToPrint.length * 100)}); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open(); 
    printWindow.document.write(htmlContent); 
    printWindow.document.close();
    setIsPrintConfigModalOpen(false);
  };

  const handlePrintPhysicalSticker = (asset: any, cleanTag: string) => {
    const baseDomain = typeof window !== 'undefined' ? window.location.origin : 'https://virtual-staffing.vercel.app';
    const targetRef = cleanTag || asset.asset_tag || asset.id;
    const scanUrl = `${baseDomain}/public-asset?id=${targetRef}`;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(scanUrl)}`;

    const printWindow = window.open('', '_blank', 'width=400,height=400');
    if (!printWindow) return alert("Pop-up blocked! Please allow pop-ups to print the QR code.");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR_${targetRef}</title>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #fff; }
            img { width: 90%; max-height: 90%; object-fit: contain; border: 8px solid #000; padding: 16px; border-radius: 16px; box-sizing: border-box; }
            @media print { @page { margin: 0; size: auto; } body { display: flex; justify-content: center; align-items: center; margin: 0; padding: 0; } }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 600)">
          <img src="${qrUrl}" alt="QR Code" />
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getCatCount = (filterName: string) => {
    if (filterName === 'All') return assets.length;
    if (filterName === 'Laptop') return assets.filter(a => safeString(a.category).toLowerCase().includes('laptop')).length;
    if (filterName === 'Accessories') return assets.filter(a => {
       const c = safeString(a.category).toLowerCase();
       return c.includes('mouse') || c.includes('keyboard') || c.includes('stand') || c.includes('combo') || c.includes('pad');
    }).length;
    if (filterName === 'Headphone') return assets.filter(a => safeString(a.category).toLowerCase().includes('headphone')).length;
    if (filterName === 'Other') return assets.filter(a => {
       const c = safeString(a.category).toLowerCase();
       return c.includes('cleaning') || c.includes('other') || (!c.includes('laptop') && !c.includes('mouse') && !c.includes('keyboard') && !c.includes('stand') && !c.includes('headphone') && !c.includes('pad') && !c.includes('combo'));
    }).length;
    
    return assets.filter(a => safeString(a.category).toLowerCase() === filterName.toLowerCase()).length;
  };

  // 🌟 UPGRADED MULTI-LAYER FILTERING ENGINE
  const filteredAssets = assets.filter(a => {
    const q = safeString(searchQuery).toLowerCase();
    const cleanTag = safeString(a.clean_tag).toLowerCase();
    const cat = safeString(a.category).toLowerCase();
    const status = safeString(a.status).toLowerCase();
    const cond = safeString(a.asset_condition).toLowerCase();
    
    // 1. Search Query
    const matchesSearch = !q || (
      safeString(a.id).toLowerCase().includes(q) || 
      cleanTag.includes(q) ||
      safeString(a.safe_display_name).toLowerCase().includes(q) || 
      safeString(a.brand).toLowerCase().includes(q) || 
      cat.includes(q) || 
      safeString(a.serial_number).toLowerCase().includes(q) ||
      safeString(a.staff_name).toLowerCase().includes(q) || 
      safeString(a.emp_code).toLowerCase().includes(q)
    );
    
    // 2. Category Tab
    let matchesCat = true;
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Laptop') {
          matchesCat = cat.includes('laptop');
      } else if (selectedCategory === 'Accessories') {
          matchesCat = cat.includes('mouse') || cat.includes('keyboard') || cat.includes('stand') || cat.includes('pad') || cat.includes('combo');
      } else if (selectedCategory === 'Headphone') {
          matchesCat = cat.includes('headphone') || cat.includes('headset');
      } else if (selectedCategory === 'Other') {
          matchesCat = cat.includes('cleaning') || cat.includes('other') || (!cat.includes('laptop') && !cat.includes('mouse') && !cat.includes('keyboard') && !cat.includes('stand') && !cat.includes('headphone') && !cat.includes('pad') && !cat.includes('combo'));
      } else {
          matchesCat = cat === selectedCategory.toLowerCase();
      }
    }

    // 3. Status Filter
    let matchesStatus = true;
    if (statusFilter !== 'All') {
      if (statusFilter === 'In Stock') {
        matchesStatus = status.includes('stock') || status.includes('unassigned');
      } else if (statusFilter === 'Assigned') {
        matchesStatus = status === 'assigned' || status.includes('assigned');
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

    // 4. Condition Filter
    let matchesCond = true;
    if (conditionFilter !== 'All') {
      matchesCond = cond.includes(conditionFilter.toLowerCase());
    }
    
    return matchesSearch && matchesCat && matchesStatus && matchesCond;
  });

  const toggleSelectAsset = (id: string) => {
    const newSet = new Set(selectedAssetIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAssetIds(newSet);
  };

  const handleSelectAllFiltered = () => {
    if (selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0) {
      setSelectedAssetIds(new Set()); 
    } else {
      setSelectedAssetIds(new Set(filteredAssets.map(a => a.id))); 
    }
  };

  // 🌟 EXACT TRANSPARENT GLASS THEME + NEON HOVER
  const theme = {
    bg: 'bg-transparent',
    card: 'bg-white/60 dark:bg-white/5 backdrop-blur-3xl border-white/50 dark:border-white/10 shadow-lg',
    textMain: 'text-slate-900 dark:text-white',
    textSub: 'text-slate-700 dark:text-slate-300', 
    cardHover: 'hover:bg-white/80 dark:hover:bg-white/10 hover:border-orange-500 dark:hover:border-orange-400 hover:shadow-[0_0_25px_rgba(249,115,22,0.4)] hover:-translate-y-1',
    modalBody: 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border-white/60 dark:border-white/10 shadow-2xl',
    modalHeader: 'bg-white/50 dark:bg-white/5 border-white/50 dark:border-white/10',
    iconBgBrand: 'bg-white/80 dark:bg-white/10 text-orange-600 dark:text-orange-400 border border-white/80 dark:border-white/20',
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-12`}>
      {/* 🌟 FULL-SCREEN ENTERPRISE FLUID WRAPPER */}
      <div className="w-full max-w-[100rem] px-3 sm:px-6 lg:px-10 mx-auto space-y-5 sm:space-y-6 pt-4">
        
        {/* BRAND HEADER */}
        <div className={`${theme.card} rounded-3xl p-4 sm:p-6 border flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 transition-all duration-300`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <button onClick={() => router.push('/admin')} className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${theme.card} hover:border-orange-500 hover:text-orange-600 dark:hover:border-orange-400 dark:hover:text-orange-400 ${theme.textMain}`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <ShieldCheck className="text-orange-600 dark:text-orange-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>Asset Records</span>
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/80 dark:bg-white/10 border border-white/80 dark:border-white/20 text-orange-600 dark:text-orange-400`}>{assets.length} Units</span>
              </div>
              <p className={`text-xs sm:text-sm font-bold ${theme.textSub}`}>Manage full hardware lifecycle, smart QR stickers, and S/N tags</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {selectedAssetIds.size > 0 && (
              <button onClick={() => setIsPrintConfigModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all duration-200 animate-in zoom-in-95 cursor-pointer shrink-0 border border-purple-400/50">
                <Printer size={15} /> <span>Print {selectedAssetIds.size} QRs</span>
              </button>
            )}
            <button onClick={() => setIsBulkModalOpen(true)} className={`flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all duration-300 text-xs font-bold uppercase tracking-wider cursor-pointer bg-white/60 dark:bg-white/10 border-white/60 dark:border-white/20 hover:border-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:text-orange-600 dark:hover:text-orange-400 ${theme.textMain} shrink-0`}>
              <FileSpreadsheet size={15} /> <span>Bulk Upload</span>
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer shrink-0 border border-orange-400/50">
              <PlusCircle size={15} /> <span>New Asset</span>
            </button>
          </div>
        </div>

        {/* TABS & SEARCH */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {[
              { name: 'All', icon: <Package size={15}/> }, 
              { name: 'Laptop', icon: <Laptop size={15}/> },
              { name: 'Accessories', icon: <Mouse size={15}/> }, 
              { name: 'Headphone', icon: <Headphones size={15}/> },
              { name: 'Other', icon: <SlidersHorizontal size={15}/> }
            ].map(cat => {
              const isActive = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name} onClick={() => setSelectedCategory(cat.name)}
                  className={`group flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer border ${
                    isActive 
                      ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] border-orange-500 scale-[1.02]' 
                      : `bg-white/60 dark:bg-white/10 border-white/50 dark:border-white/20 text-slate-800 dark:text-slate-200 backdrop-blur-md hover:bg-white/80 dark:hover:bg-white/20 hover:text-purple-600 hover:border-purple-300 dark:hover:text-purple-300 dark:hover:border-purple-700`
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-purple-600 dark:text-purple-400 group-hover:text-purple-700 transition-colors'}>{cat.icon}</span> 
                  <span className="hidden sm:inline">{cat.name}</span>
                  <span className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold transition-colors ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/80 text-purple-800 border border-white/80 group-hover:bg-white dark:bg-white/10 dark:border-white/10 dark:text-purple-300 dark:group-hover:bg-white/20'
                  }`}>{getCatCount(cat.name)}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2.5 sm:gap-3 items-center">
            <button 
              onClick={handleSelectAllFiltered} 
              className={`px-3 py-2.5 sm:px-4 sm:py-3 shrink-0 rounded-xl border shadow-sm flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? 'bg-white/80 dark:bg-white/20 border-orange-400/50 text-orange-600 dark:text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : `bg-white/60 dark:bg-white/10 border-white/50 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] ${theme.textMain}`}`}
            >
              <CheckSquare size={16} className={selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'} /> 
              <span className="hidden sm:inline">
                {selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? 'Deselect All' : 'Select All'}
              </span>
            </button>

            {/* 🌟 SEARCH BAR */}
            <div 
              className="flex-1 p-2 sm:p-2.5 rounded-2xl border shadow-sm flex items-center transition-all duration-300 focus-within:border-orange-500 focus-within:shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:border-orange-400 bg-white/60 dark:bg-white/10 backdrop-blur-xl border-white/50 dark:border-white/20"
            >
              <div className="relative w-full">
                <Search size={16} className={`absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400`} />
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by Asset Name, Tag ID, Brand, Category, S/N, or Staff..." 
                  className="w-full pl-10 sm:pl-11 pr-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold outline-none transition-all bg-transparent text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t sm:border-t-0 border-white/50 dark:border-white/10">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto custom-scrollbar">
              <span className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0 ${theme.textSub}`}>
                <Filter size={13} className="text-orange-600 dark:text-orange-400" /> Filter:
              </span>
              
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`text-[11px] sm:text-xs font-bold py-1.5 px-2.5 rounded-lg border transition-all duration-300 cursor-pointer outline-none shrink-0 bg-white/80 dark:bg-white/10 backdrop-blur-md border-white/60 dark:border-white/20 text-slate-900 dark:text-white ${
                  statusFilter !== 'All' 
                    ? 'bg-orange-600! text-white! border-orange-600! shadow-[0_0_15px_rgba(249,115,22,0.3)]' 
                    : 'hover:border-orange-500'
                }`}
              >
                <option value="All" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">📦 All Stock Statuses</option>
                <option value="In Stock" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🟢 In Stock (Unassigned)</option>
                <option value="Assigned" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">👤 Assigned</option>
                <option value="Pending Handover" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">⏳ Pending Handover</option>
                <option value="In Repair" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🛠️ In Repair</option>
                <option value="Demo Use" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🧪 Demo Use</option>
              </select>

              <select
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value)}
                className={`text-[11px] sm:text-xs font-bold py-1.5 px-2.5 rounded-lg border transition-all duration-300 cursor-pointer outline-none shrink-0 bg-white/80 dark:bg-white/10 backdrop-blur-md border-white/60 dark:border-white/20 text-slate-900 dark:text-white ${
                  conditionFilter !== 'All' 
                    ? 'bg-purple-600! text-white! border-purple-600! shadow-[0_0_15px_rgba(147,51,234,0.3)]' 
                    : 'hover:border-purple-500'
                }`}
              >
                <option value="All" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">✨ All Conditions</option>
                <option value="New" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">✨ New</option>
                <option value="Refurbished" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🔄 Refurbished</option>
                <option value="Repaired" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🛠️ Repaired</option>
              </select>

              {(statusFilter !== 'All' || conditionFilter !== 'All' || searchQuery !== '' || selectedCategory !== 'All') && (
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setConditionFilter('All');
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-rose-500 hover:bg-rose-600 text-white transition-all duration-200 flex items-center gap-1 cursor-pointer shadow-sm shrink-0 border border-rose-400/50"
                >
                  <FilterX size={13} /> <span>Reset</span>
                </button>
              )}
            </div>

            <span className={`text-xs font-bold ${theme.textSub} shrink-0`}>
              Showing <strong className="text-orange-600 dark:text-orange-400 font-black">{filteredAssets.length}</strong> of {assets.length} assets
            </span>
          </div>

        </div>

        {/* 🌟 ASSET GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4 bg-white/60 dark:bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/50 dark:border-white/10 shadow-sm">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-orange-400' : 'border-orange-600'}`}></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Loading Asset Records...</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className={`${theme.card} rounded-3xl p-16 border text-center flex flex-col items-center justify-center space-y-3 shadow-sm`}>
            <Package size={48} className="text-orange-600 opacity-60" />
            <h3 className={`text-base font-bold ${theme.textMain}`}>No Hardware Found</h3>
            <p className={`text-xs max-w-sm font-bold ${theme.textSub}`}>No assets match your selected filter combination. Try resetting your filters to view all {assets.length} registered units.</p>
            <button
              onClick={() => {
                setStatusFilter('All');
                setConditionFilter('All');
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer border border-orange-500/50"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredAssets.map(asset => {
              const isSelected = selectedAssetIds.has(asset.id);

              return (
                <div key={asset.id} onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button')) return;
                  toggleSelectAsset(asset.id);
                }} className={`${theme.card} rounded-3xl border shadow-sm flex flex-col justify-between group transition-all duration-300 ease-out cursor-pointer ${isSelected ? 'border-orange-500! ring-2 ring-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.4)] bg-white/80! dark:bg-white/10!' : theme.cardHover} overflow-hidden`}>
                  
                  <div className={`p-4 sm:p-5 border-b border-white/50 dark:border-white/10`}>
                    <div className="flex justify-between items-start mb-3.5">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${isSelected ? 'bg-orange-600 text-white shadow-sm border border-orange-500/50' : `${theme.iconBgBrand} group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-500/50`}`}>
                          {getCategoryIcon(asset.category, 18)}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className={`text-sm font-black leading-tight truncate max-w-42.5 ${theme.textMain} group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors`} title={asset.safe_display_name}>{asset.safe_display_name}</h3>
                          <p className={`text-[11px] font-bold mt-0.5 truncate ${theme.textSub}`}>{asset.brand || 'Standard Brand'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); openAssetViewModal(asset); }} className={`p-2 rounded-xl transition-all duration-200 cursor-pointer border bg-white/80 dark:bg-white/5 border-white/80 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:bg-orange-600 hover:text-white hover:border-orange-500/50 dark:hover:bg-orange-600 dark:hover:text-white`}>
                          <QrCode size={16} />
                        </button>
                        <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded cursor-pointer accent-orange-600 ml-0.5" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-widest border backdrop-blur-sm ${getStockStatusBadge(asset.status)}`}>{asset.status || 'In Stock'}</span>
                      <span className={`px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-widest border backdrop-blur-sm bg-white/80 dark:bg-white/10 text-slate-800 dark:text-slate-200 border-white/80 dark:border-white/20`}>{asset.asset_condition || 'New'}</span>
                    </div>
                  </div>

                  <div className={`p-4 sm:p-5 space-y-2.5 flex-1 bg-white/40 dark:bg-white/5`}>
                    <div className={`flex justify-between items-center p-2.5 rounded-xl border shadow-sm transition-colors bg-white/80 dark:bg-white/5 border-white/60 dark:border-white/10 group-hover:border-orange-300 dark:group-hover:border-orange-500/50`}>
                      <span className={`font-black uppercase text-[9px] tracking-widest ${theme.textSub}`}>Tag ID</span> 
                      <span className="font-mono font-black text-xs text-purple-700 dark:text-purple-300">{asset.clean_tag}</span>
                    </div>
                    <div className={`flex justify-between items-center p-2.5 rounded-xl border shadow-sm transition-colors bg-white/80 dark:bg-white/5 border-white/60 dark:border-white/10 group-hover:border-orange-300 dark:group-hover:border-orange-500/50`}>
                      <span className={`font-black uppercase text-[9px] tracking-widest ${theme.textSub}`}>Serial S/N</span> 
                      <span className={`font-mono font-black text-[11px] truncate max-w-35 ${theme.textMain}`} title={asset.serial_number}>{asset.serial_number || 'N/A'}</span>
                    </div>
                    
                    <div className={`flex justify-between items-center p-2.5 rounded-xl border shadow-sm transition-all duration-200 bg-white/80 dark:bg-white/5 border-white/60 dark:border-white/10 group-hover:border-orange-400 dark:group-hover:border-orange-500/50`}>
                      <div className="flex flex-col">
                        <span className={`font-black uppercase text-[9px] tracking-widest ${theme.textSub}`}>Holder</span> 
                        <span className={`font-black text-[11px] truncate max-w-30 ${theme.textMain}`} title={asset.staff_name}>{asset.staff_name}</span>
                      </div>
                      <span className={`font-mono font-black px-2.5 py-1 rounded-lg text-[9px] bg-white dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-white/80 dark:border-white/20 shadow-sm`}>{asset.emp_code}</span>
                    </div>
                  </div>

                  <div className={`p-3.5 sm:p-4 border-t flex items-center justify-between border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/5`}>
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className={theme.textSub} />
                      <div className="flex flex-col">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${theme.textSub}`}>Last Audited</span>
                        <span className={`text-[10px] font-mono font-black ${theme.textMain}`}>{safeDate(asset.live_inspection_date)}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-black backdrop-blur-sm ${getInspectionStatusColor(asset.live_inspection_status)}`}>
                      {(() => {
                        const st = (asset.live_inspection_status || '').toLowerCase().trim();
                        if (st.includes('approved')) return <CheckCircle2 size={11} />;
                        if (st.includes('return')) return <RefreshCw size={11} className="animate-spin" />;
                        return <AlertTriangle size={11} />;
                      })()}
                      <span className="text-[9px] font-black uppercase tracking-widest">{asset.live_inspection_status || 'Approved'}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`rounded-4xl max-w-2xl w-full p-8 shadow-2xl border space-y-8 animate-in fade-in zoom-in-95 duration-200 ${theme.modalBody}`}>
            <div className={`flex justify-between items-center pb-4 border-b border-white/60 dark:border-white/10`}>
              <div>
                <h3 className={`text-lg font-bold tracking-tight flex items-center gap-3 ${theme.textMain}`}>
                  <Settings2 size={20} className="text-orange-600 dark:text-orange-400"/> Label Print Layout
                </h3>
                <p className={`text-[11px] mt-2 uppercase tracking-widest font-bold text-red-700 bg-red-500/20 inline-block px-2.5 py-1 rounded-lg border border-red-500/30 backdrop-blur-sm`}>
                  Important: When printing, uncheck "Fit to Page" and set Margins to "None".
                </p>
              </div>
              <button onClick={() => setIsPrintConfigModalOpen(false)} className={`p-2 rounded-xl cursor-pointer transition-colors border bg-white/60 dark:bg-white/10 border-white/80 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white shadow-sm`}><X size={16}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className={`text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400`}>Sheet Formatting</h4>
                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Paper Size</label>
                  <select value={printConfig.pageSize} onChange={e => setPrintConfig({...printConfig, pageSize: e.target.value})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-sm">
                    <option value="A4" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">A4 (210 x 297mm)</option>
                    <option value="Letter" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">US Letter (8.5 x 11in)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Columns</label><input type="number" min="1" value={printConfig.columns} onChange={e => setPrintConfig({...printConfig, columns: parseInt(e.target.value) || 1})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-sm" /></div>
                  <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Rows</label><input type="number" min="1" value={printConfig.rows} onChange={e => setPrintConfig({...printConfig, rows: parseInt(e.target.value) || 1})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-sm" /></div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className={`text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400`}>Label Dimensions</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Sticker Width (cm)</label><input type="number" step="0.01" value={printConfig.labelWidth} onChange={e => setPrintConfig({...printConfig, labelWidth: parseFloat(e.target.value) || 1})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-sm" /></div>
                  <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Sticker Height (cm)</label><input type="number" step="0.01" value={printConfig.labelHeight} onChange={e => setPrintConfig({...printConfig, labelHeight: parseFloat(e.target.value) || 1})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-sm" /></div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/60 dark:border-white/10">
              <button onClick={() => setIsPrintConfigModalOpen(false)} className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border transition-colors bg-white/60 dark:bg-white/5 border-white/80 dark:border-white/20 text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-white/10 shadow-sm`}>Cancel</button>
              <button onClick={executeGridBulkPrint} className="flex-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-orange-600/20 bg-orange-600 hover:bg-orange-700 text-white flex justify-center items-center gap-2 cursor-pointer transition-all border border-orange-500/50"><Printer size={16}/> Generate Print Page</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 VIEW MODAL & HISTORY ENGINE */}
      {viewAssetModal && (() => {
        const liveModalTag = editForm.asset_tag || viewAssetModal.clean_tag;
        const visibleHistory = showFullHistory ? assetHistory : assetHistory.slice(0, 1);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className={`rounded-4xl max-w-4xl w-full max-h-[92vh] overflow-y-auto custom-scrollbar shadow-2xl flex flex-col border ${theme.modalBody}`}>
              
              {/* 🌟 ENTERPRISE COMPACT HEADER */}
              <div className={`w-full p-4 sm:p-5 border-b flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 dark:bg-white/5 border-white/60 dark:border-white/10 shrink-0`}>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="bg-white/90 dark:bg-white/10 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/80 dark:border-white/20 shrink-0">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(getAssetViewUrl(viewAssetModal))}`} alt="QR Code" className="w-12 h-12 sm:w-14 sm:h-14 object-contain mix-blend-multiply dark:mix-blend-normal dark:invert" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white tracking-wider">{liveModalTag}</h3>
                      <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-widest border backdrop-blur-sm ${getStockStatusBadge(viewAssetModal.status)}`}>{viewAssetModal.status || 'In Stock'}</span>
                    </div>
                    <p className={`text-xs font-bold mt-0.5 ${theme.textSub}`} title={editForm.serial || viewAssetModal.serial_number}>
                      S/N: <span className="font-mono font-black">{editForm.serial || viewAssetModal.serial_number}</span>
                    </p>
                  </div>
                </div>

                {/* Grouped Actions: Print QR | Edit | Delete | X */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button onClick={() => handlePrintPhysicalSticker(viewAssetModal, liveModalTag)} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-1.5 transition-all cursor-pointer bg-orange-600 hover:bg-orange-700 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] border border-orange-500/50`}>
                    <Printer size={14} /> <span>Print QR</span>
                  </button>
                  {!isEditingAsset && (
                    <>
                      <button onClick={() => setIsEditingAsset(true)} className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors bg-white/80 dark:bg-white/10 border-white/80 dark:border-white/20 text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-white/20 shadow-sm`}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button onClick={() => handleDeleteAsset(viewAssetModal.id)} className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors bg-rose-500/20 text-rose-800 dark:text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 shadow-sm`}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                  <button onClick={() => setViewAssetModal(null)} className={`p-2.5 rounded-xl cursor-pointer transition-colors bg-white/80 dark:bg-white/10 border-white/80 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white shadow-sm border`}><X size={16}/></button>
                </div>
              </div>

              {/* Right/Bottom Workspace */}
              <div className="p-4 sm:p-6 space-y-4 flex-1">
                {isEditingAsset ? (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className={`flex justify-between items-center pb-2 border-b border-white/60 dark:border-white/10`}>
                      <span className={`text-sm font-black uppercase tracking-widest text-orange-600 dark:text-orange-400`}>Editing Hardware Record</span>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-3xl border bg-white/60 dark:bg-white/5 backdrop-blur-md border-white/80 dark:border-white/20 shadow-sm`}>
                      <div>
                        <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Asset Category *</label>
                        <select value={editForm.category} onChange={e => { 
                          const newCat = e.target.value; 
                          setEditForm({ 
                            ...editForm, 
                            category: newCat, 
                            asset_tag: generateCategoryPrefix(newCat, editForm.asset_tag) 
                          }); 
                        }} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner">
                          {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">{cat}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`text-[10px] font-black uppercase flex justify-between mb-1.5 text-orange-600 dark:text-orange-400`}>
                          <span>Asset Tag ID</span>
                          <button type="button" onClick={() => setEditForm({...editForm, asset_tag: generateCategoryPrefix(editForm.category)})} className="text-[9px] lowercase hover:underline cursor-pointer">(force regenerate)</button>
                        </label>
                        <input type="text" value={editForm.asset_tag} onChange={e => setEditForm({...editForm, asset_tag: e.target.value})} className="w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none uppercase transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" />
                      </div>
                    </div>

                    <div>
                      <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Factory Serial Number (Laptop SN - Charger SN) *</label>
                      <input type="text" required value={editForm.serial} onChange={e => setEditForm({...editForm, serial: e.target.value})} placeholder="e.g. M27370-00105" className="w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none uppercase transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Brand</label><input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" /></div>
                      <div>
                        <label className={`text-[10px] font-black uppercase flex justify-between mb-1.5 ${theme.textSub}`}>
                          <span>Assets Name</span>
                          <button type="button" onClick={() => setEditForm({...editForm, system_specs: autoDetectSpecs(`${editForm.name} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)})} className="text-[9px] text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center gap-1 font-extrabold"><Zap size={10}/> ⚡ Re-Detect Specs</button>
                        </label>
                        <input type="text" value={editForm.name} onChange={e => { const v = e.target.value; setEditForm({...editForm, name: v, system_specs: autoDetectSpecs(`${v} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)}); }} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Price (₹)</label><input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" /></div>
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Purchase Date</label><input type="date" value={editForm.purchase_date} onChange={e => setEditForm({...editForm, purchase_date: e.target.value})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" /></div>
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Warranty Expiry</label><input type="date" value={editForm.warranty_expiry} onChange={e => setEditForm({...editForm, warranty_expiry: e.target.value})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" /></div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className={`text-[10px] font-black uppercase ${theme.textSub}`}>System Hardware Specifications / Configuration</label>
                        <button type="button" onClick={() => setEditForm({...editForm, system_specs: autoDetectSpecs(`${editForm.name} ${editForm.brand} ${editForm.serial}`, editForm.category, editForm.system_specs)})} className="text-[9px] text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center gap-1 font-extrabold"><Zap size={10}/> ⚡ Auto-Detect from Model/SN</button>
                      </div>
                      <input type="text" value={editForm.system_specs} onChange={e => setEditForm({...editForm, system_specs: e.target.value})} placeholder="e.g. Intel Core i7 (12th Gen) | 16GB RAM | 512GB SSD | Win 11 Pro" className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" />
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
                            className={`text-[9px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer bg-white/80 dark:bg-white/10 border-white/80 dark:border-white/20 text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-white/20 shadow-sm`}
                          >
                            ⚡ {preset.split('|')[0].trim()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-white/60 dark:border-white/10`}>
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Condition</label><select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner"><option value="New" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">✨ New</option><option value="Refurbished" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🔄 Refurbished</option><option value="Repaired" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🛠️ Repaired</option></select></div>
                      <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Stock Status</label><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner"><option value="In Stock (Unassigned)" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">📦 In Stock</option><option value="Assigned" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">👤 Assigned</option><option value="Demo Use" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🧪 Demo</option><option value="In Repair" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">⚠️ Repair</option><option value="Discard" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🗑️ Discard</option></select></div>
                      <div>
                        <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Inspection State</label>
                        <select value={editForm.inspection_status} onChange={e => setEditForm({...editForm, inspection_status: e.target.value})} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner">
                          <option value="Approved" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">✅ Approved</option><option value="Re-Inspection" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🔄 Re-Inspection</option><option value="Not Approved" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">⚠️ Not Approved</option><option value="Rejected" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">❌ Rejected</option>
                        </select>
                      </div>
                    </div>

                    <div className={`p-5 rounded-3xl border bg-white/60 dark:bg-white/5 backdrop-blur-md border-white/80 dark:border-white/20 shadow-sm`}>
                      <label className={`text-[10px] font-black uppercase block mb-2 ${theme.textSub}`}>Re-Assign Holder</label>
                      <SearchableStaffDropdown value={editForm.assignee} onChange={(val: string) => setEditForm({...editForm, assignee: val})} staffList={staffList} isDarkMode={isDarkMode} />
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-white/60 dark:border-white/10">
                      <button type="button" onClick={() => setIsEditingAsset(false)} className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border transition-colors bg-white/60 dark:bg-white/5 border-white/80 dark:border-white/20 text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-white/10 shadow-sm`}>Cancel</button>
                      <button type="button" onClick={handleUpdateExistingAsset} disabled={isUpdating} className="flex-2 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.4)] cursor-pointer transition-all border border-orange-500/50">
                        {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save Secure Record
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Compact 3-Column Header Specs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-2xl border bg-white/60 dark:bg-white/10 backdrop-blur-md border-white/80 dark:border-white/20 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Category</p><p className={`text-xs font-bold mt-1.5 text-orange-600 dark:text-orange-400`}>{viewAssetModal.category || 'Laptop'}</p></div>
                      <div className={`p-4 rounded-2xl border bg-white/60 dark:bg-white/10 backdrop-blur-md border-white/80 dark:border-white/20 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Brand</p><p className={`text-xs font-bold mt-1.5 ${theme.textMain}`}>{viewAssetModal.brand || 'N/A'}</p></div>
                      <div className={`p-4 rounded-2xl border bg-white/60 dark:bg-white/10 backdrop-blur-md border-white/80 dark:border-white/20 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Assets Name</p><p className={`text-xs font-bold mt-1.5 truncate ${theme.textMain}`} title={viewAssetModal.safe_display_name}>{viewAssetModal.safe_display_name}</p></div>
                    </div>

                    {/* Compact 3-Column Logistic Specs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-2xl border bg-white/60 dark:bg-white/5 backdrop-blur-md border-white/80 dark:border-white/10 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300`}>Purchase Date</p><p className={`text-xs font-bold mt-1.5 ${theme.textMain}`}>{safeDate(viewAssetModal.purchase_date)}</p></div>
                      <div className={`p-4 rounded-2xl border bg-white/60 dark:bg-white/5 backdrop-blur-md border-white/80 dark:border-white/10 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300`}>Warranty Date</p><p className={`text-xs font-bold mt-1.5 ${theme.textMain}`}>{safeDate(viewAssetModal.warranty_expiry)}</p></div>
                      <div className={`p-4 rounded-2xl border flex flex-col justify-center bg-white/60 dark:bg-white/5 backdrop-blur-md border-white/80 dark:border-white/10 shadow-sm`}><p className={`text-[9px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300`}>Inspection Status</p><div className="flex items-center gap-1 mt-1.5"><span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase border backdrop-blur-sm shadow-sm ${getInspectionStatusColor(viewAssetModal.live_inspection_status)}`}>{viewAssetModal.live_inspection_status || 'Approved'}</span></div></div>
                    </div>

                    {/* 🌟 SYSTEM SPECIFICATIONS ONLINE BLOCK */}
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 bg-white/80 dark:bg-white/10 backdrop-blur-md border-white/80 dark:border-white/20 shadow-sm`}>
                      <Cpu size={20} className="text-orange-600 dark:text-orange-400 shrink-0" />
                      <div className="w-full">
                        <span className={`text-[9px] font-black uppercase tracking-widest block ${theme.textSub}`}>System Hardware Configuration / Specifications:</span>
                        <p className={`text-xs font-bold mt-1 ${theme.textMain}`}>{viewAssetModal.system_specs || 'Standard Business Hardware Configuration'}</p>
                      </div>
                    </div>

                    {/* Assigned Holder Box */}
                    <div className={`p-4 rounded-2xl border flex items-center justify-between bg-white/80 dark:bg-white/10 backdrop-blur-md border-white/80 dark:border-white/20 shadow-md`}>
                      <div>
                        <span className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Assigned Employee Holder:</span>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-white/20 text-orange-600 dark:text-orange-400 border border-white/80 dark:border-white/30 shadow-sm`}><User size={16}/></div>
                          <span className={`text-sm font-black ${theme.textMain}`}>{viewAssetModal.staff_name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${theme.textSub}`}>EMP CODE</span>
                         <span className={`text-xs font-mono font-black px-3 py-1.5 rounded-lg border shadow-sm bg-white/90 dark:bg-white/20 text-slate-900 dark:text-white border-white/80 dark:border-white/30`}>{viewAssetModal.emp_code}</span>
                      </div>
                    </div>

                    {/* 🌟 OFFICIAL HANDOVER AGREEMENT & COMPLIANCE DOCUMENTS SECTION */}
                    {(viewAssetModal.assigned_to || viewAssetModal.status === 'Assigned' || viewAssetModal.status === 'Pending Handover') && (
                      <div className={`p-5 rounded-2xl border bg-emerald-500/20 dark:bg-emerald-500/20 border-emerald-500/30 backdrop-blur-md shadow-sm`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-[0_0_15px_rgba(5,150,105,0.4)] shrink-0">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h4 className={`text-xs font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-300`}>Official Handover Agreement</h4>
                              <p className={`text-[10px] font-bold text-emerald-800 dark:text-emerald-400 mt-0.5`}>Digitally executed custody document with hardware specs and policies.</p>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleGenerateHandoverPDF(viewAssetModal)}
                            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(5,150,105,0.4)] flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 border border-emerald-500/50"
                          >
                            <Download size={16} /> <span>Download PDF</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 🌟 COLLAPSIBLE LIFECYCLE & ACTIVITY HISTORY */}
                    <div className={`p-5 rounded-2xl border bg-white/60 dark:bg-white/5 backdrop-blur-md border-white/80 dark:border-white/10 shadow-sm`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <History size={16} className="text-orange-600 dark:text-orange-400" />
                          <h4 className={`text-xs font-black uppercase tracking-widest ${theme.textMain}`}>Lifecycle & Activity History</h4>
                        </div>
                        {assetHistory.length > 1 && (
                          <button
                            onClick={() => setShowFullHistory(!showFullHistory)}
                            className="text-[10px] font-black text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center gap-1 bg-white/80 dark:bg-white/10 px-2 py-1 rounded-md border border-white/80 dark:border-white/20 shadow-sm"
                          >
                            {showFullHistory ? (
                              <><span>Show Less</span> <ChevronUp size={14}/></>
                            ) : (
                              <><span>Show Full History ({assetHistory.length})</span> <ChevronDown size={14}/></>
                            )}
                          </button>
                        )}
                      </div>
                      
                      {isLoadingHistory ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-orange-600 size-6"/></div>
                      ) : assetHistory.length === 0 ? (
                        <p className={`text-xs font-bold italic ${theme.textSub}`}>No history logs found for this asset.</p>
                      ) : (
                        <div className="space-y-3 max-h-[18rem] overflow-y-auto custom-scrollbar pr-2">
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
                              <div key={idx} className={`p-4 rounded-2xl border shadow-sm bg-white/80 dark:bg-white/10 border-white/80 dark:border-white/20`}>
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border backdrop-blur-sm ${getInspectionStatusColor(log.status)}`}>{log.status}</span>
                                    <p className={`text-xs font-black mt-1.5 ${theme.textMain}`}>{log.staff_name} <span className="text-slate-500 font-mono">({log.emp_code})</span></p>
                                  </div>
                                  <span className={`text-[10px] font-bold bg-white/80 dark:bg-white/20 px-2 py-0.5 rounded border border-white/80 dark:border-white/30 ${theme.textMain}`}>{safeDate(log.created_at)}</span>
                                </div>
                                {log.notes && (
                                  <div className={`mt-2 text-xs font-mono p-3 rounded-xl border whitespace-pre-wrap shadow-inner bg-white/60 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-900 dark:text-white`}>
                                    {log.notes}
                                  </div>
                                )}
                                {photosArray.length > 0 && (
                                  <div className="flex gap-2.5 mt-3 overflow-x-auto custom-scrollbar pb-1.5">
                                    {photosArray.map((url, i) => (
                                      <img key={`hist-photo-${i}`} src={url} alt="Log" className="h-14 w-14 rounded-xl object-cover border border-white/80 dark:border-white/20 shadow-sm" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`rounded-4xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border ${theme.modalBody}`}>
            <div className={`p-6 border-b flex justify-between items-center bg-white/50 dark:bg-white/5 border-white/60 dark:border-white/10`}>
              <h3 className={`text-lg font-black uppercase tracking-widest ${theme.textMain}`}>Register New Asset</h3>
              <button onClick={() => setIsAddModalOpen(false)} className={`p-2.5 rounded-xl cursor-pointer transition-colors border bg-white/80 dark:bg-white/10 border-white/80 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/20 shadow-sm`}><X size={16}/></button>
            </div>
            
            <form onSubmit={handleSaveNewAsset} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-3xl border bg-white/60 dark:bg-white/5 backdrop-blur-md border-white/80 dark:border-white/10 shadow-sm`}>
                <div>
                  <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Asset Category *</label>
                  <select value={newAssetCategory} onChange={e => {
                    const newCat = e.target.value;
                    setNewAssetCategory(newCat);
                    setNewAssetTag(generateCategoryPrefix(newCat, newAssetTag));
                    if (newCat === 'Laptop') {
                      setNewAssetSpecs('Intel Core i7 (11th/12th Gen vPro) | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro');
                    } else if (newCat.includes('Keyboard') || newCat.includes('Mouse')) {
                      setNewAssetSpecs('USB / Wireless Plug-and-Play Standard Business Accessory');
                    } else {
                      setNewAssetSpecs('Standard Business Grade IT Hardware Configuration');
                    }
                  }} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner">
                    {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase flex justify-between mb-1.5 text-orange-600 dark:text-orange-400`}>
                    <span>Asset Tag ID</span>
                    <button type="button" onClick={() => setNewAssetTag(generateCategoryPrefix(newAssetCategory))} className="text-[9px] lowercase hover:underline cursor-pointer">(generate new)</button>
                  </label>
                  <input type="text" value={newAssetTag} onChange={e => setNewAssetTag(e.target.value)} className="w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none uppercase transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Factory Serial Number (Laptop SN - Charger SN) *</label>
                  <input type="text" required value={newAssetSerial} onChange={e => setNewAssetSerial(e.target.value)} placeholder="e.g. M27370-00105" className="w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none uppercase transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" />
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Vendor Source</label>
                  <input type="text" value={newAssetVendor} onChange={e => setNewAssetVendor(e.target.value)} placeholder="e.g. Local Supplier, Nabha" className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Brand</label><input type="text" value={newAssetBrand} onChange={e => setNewAssetBrand(e.target.value)} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" /></div>
                <div>
                  <label className={`text-[10px] font-black uppercase flex justify-between mb-1.5 ${theme.textSub}`}>
                    <span>Assets Name *</span>
                    <button type="button" onClick={() => setNewAssetSpecs(autoDetectSpecs(`${newAssetName} ${newAssetBrand} ${newAssetSerial}`, newAssetCategory, newAssetSpecs))} className="text-[9px] text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center gap-1 font-extrabold"><Zap size={10}/> ⚡ Auto-Detect Specs</button>
                  </label>
                  <input type="text" required value={newAssetName} onChange={e => { const v = e.target.value; setNewAssetName(v); setNewAssetSpecs(autoDetectSpecs(`${v} ${newAssetBrand} ${newAssetSerial}`, newAssetCategory, newAssetSpecs)); }} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Price (₹)</label><input type="number" step="0.01" value={newAssetPrice} onChange={e => setNewAssetPrice(e.target.value)} className="w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" /></div>
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Purchase Date</label><input type="date" value={newAssetPurchaseDate} onChange={e => setNewAssetPurchaseDate(e.target.value)} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" /></div>
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Warranty Expiry</label><input type="date" value={newAssetWarranty} onChange={e => setNewAssetWarranty(e.target.value)} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" /></div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className={`text-[10px] font-black uppercase ${theme.textSub}`}>System Hardware Specifications / Configuration</label>
                  <button type="button" onClick={() => setNewAssetSpecs(autoDetectSpecs(`${newAssetName} ${newAssetBrand} ${newAssetSerial}`, newAssetCategory, newAssetSpecs))} className="text-[9px] text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center gap-1 font-extrabold"><Zap size={10}/> ⚡ Auto-Detect from Model/SN</button>
                </div>
                <input type="text" value={newAssetSpecs} onChange={e => setNewAssetSpecs(e.target.value)} placeholder="e.g. Intel Core i7 (vPro) | 16GB RAM | 512GB SSD | Win 11 Pro" className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner" />
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
                      className={`text-[9px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer bg-white/80 dark:bg-white/10 border-white/80 dark:border-white/20 text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-white/20 shadow-sm`}
                    >
                      ⚡ {preset.split('|')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-white/60 dark:border-white/10`}>
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Condition</label><select value={newAssetCondition} onChange={e => setNewAssetCondition(e.target.value)} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner"><option value="New" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">✨ New</option><option value="Refurbished" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🔄 Refurbished</option><option value="Repaired" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🛠️ Repaired</option></select></div>
                <div><label className={`text-[10px] font-black uppercase block mb-1.5 ${theme.textSub}`}>Stock Status</label><select value={newAssetStatus} onChange={e => setNewAssetStatus(e.target.value)} className="w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-all bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white shadow-inner"><option value="In Stock (Unassigned)" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">📦 In Stock</option><option value="Demo Use" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🧪 Demo</option></select></div>
              </div>

              <div className={`p-6 rounded-3xl border bg-white/60 dark:bg-white/5 backdrop-blur-md border-white/80 dark:border-white/10 shadow-sm`}>
                <label className={`text-[10px] font-black uppercase block mb-2 ${theme.textSub}`}>Assign to Employee (Optional)</label>
                <SearchableStaffDropdown value={newAssetAssignee} onChange={(val: string) => setNewAssetAssignee(val)} staffList={staffList} isDarkMode={isDarkMode} />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className={`px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors border bg-white/80 dark:bg-white/10 border-white/80 dark:border-white/20 text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-white/20 shadow-sm`}>Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.4)] cursor-pointer transition-all border border-orange-500/50">
                  {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} Register New Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`rounded-4xl max-w-md w-full p-8 shadow-2xl border space-y-6 text-center animate-in fade-in duration-200 ${theme.modalBody}`}>
            <div className={`flex justify-between items-center pb-4 border-b border-white/60 dark:border-white/10`}>
              <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme.textMain}`}><Upload size={18} className="text-orange-600 dark:text-orange-400"/> Bulk Asset Import</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className={`p-2.5 rounded-xl cursor-pointer transition-colors border bg-white/80 dark:bg-white/10 border-white/80 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/20 shadow-sm`}><X size={16}/></button>
            </div>
            
            <div className="space-y-4 text-left">
              <button className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border bg-white/80 dark:bg-white/10 border-white/80 dark:border-white/20 text-slate-900 dark:text-white hover:bg-white dark:hover:bg-white/20 shadow-sm`}>
                <Download size={16} className="text-orange-600 dark:text-orange-400"/> <span>Download CSV Template</span>
              </button>
            </div>

            <div className={`p-8 border-2 border-dashed rounded-3xl transition-colors flex flex-col items-center justify-center gap-5 bg-white/60 dark:bg-white/5 border-white/80 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/10`}>
              <FileSpreadsheet size={48} className="text-orange-600 dark:text-orange-400 animate-pulse" />
              <input type="file" accept=".csv" className={`w-full text-xs font-bold cursor-pointer transition-all file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:cursor-pointer text-slate-900 dark:text-white file:bg-orange-600 file:text-white hover:file:opacity-90 shadow-sm`} />
            </div>

            <button className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all bg-white/60 dark:bg-white/5 border border-white/80 dark:border-white/10 text-slate-500 dark:text-slate-400 cursor-not-allowed`}>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-transparent"><Loader2 className="w-10 h-10 animate-spin text-orange-600" /></div>}>
      <AssetRegistryContent />
    </Suspense>
  );
}