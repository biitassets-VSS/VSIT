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
  Filter, FilterX, ShieldCheck, FileText, Cpu, CheckCircle
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
function getCategoryIcon(category: string, size = 20) {
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
// SEARCHABLE STAFF DROPDOWN COMPONENT 
// ==========================================
const SearchableStaffDropdown = ({ value, onChange, staffList, isDarkMode, placeholder = "Search name or emp code..." }: any) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const t = {
    bg: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-white border-slate-300',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    menu: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200',
    hover: isDarkMode ? 'hover:bg-purple-950/40' : 'hover:bg-purple-50',
    header: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a] text-zinc-500' : 'bg-slate-50 border-slate-100 text-slate-500',
  };

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
      <div className={`flex items-center w-full p-3.5 border rounded-xl focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-600/20 transition-all ${t.bg}`}>
        <Search size={14} className={`${t.textSub} mr-2 shrink-0`} />
        <input 
          type="text" value={open ? query : query || ''} 
          onChange={e => { setQuery(e.target.value); setOpen(true); onChange(''); }}
          onFocus={() => setOpen(true)} placeholder={placeholder}
          className={`w-full text-xs font-semibold outline-none bg-transparent ${t.text}`}
        />
        <ChevronDown size={14} className={`${t.textSub} ml-2 shrink-0 cursor-pointer`} onClick={() => setOpen(!open)} />
      </div>

      {open && (
        <div className={`absolute z-50 w-full mt-2 border rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar ${t.menu}`}>
          <div className={`p-3 text-[11px] font-bold tracking-widest uppercase cursor-pointer border-b ${t.header}`} onClick={() => { onChange(''); setQuery(''); setOpen(false); }}>
            -- Warehouse Inventory (Unassigned) --
          </div>
          {filtered.length === 0 ? (
            <div className={`p-4 text-center text-xs font-semibold ${t.textSub}`}>No staff found matching query.</div>
          ) : (
            filtered.map((s: any) => (
              <div 
                key={s.id} className={`p-3.5 text-xs cursor-pointer border-b ${isDarkMode ? 'border-[#27272a]/50' : 'border-slate-50'} flex justify-between items-center transition-colors group ${t.hover}`}
                onClick={() => { onChange(s.id); setQuery(`${s.full_name || s.name} (${s.emp_code || s.email})`); setOpen(false); }}
              >
                <span className={`font-semibold group-hover:text-purple-700 dark:group-hover:text-purple-400 ${t.text}`}>{s.full_name || s.name}</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-md transition-colors ${isDarkMode ? 'bg-[#18181b] text-zinc-400 group-hover:bg-purple-500/20 group-hover:text-purple-300' : 'bg-slate-100 text-slate-600 group-hover:bg-purple-100 group-hover:text-purple-700'}`}>
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
  const [newAssetSpecs, setNewAssetSpecs] = useState('Intel Core i5/i7 | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro');
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    fetchRegistryData();
  }, []);

  useEffect(() => {
    if (isAddModalOpen) {
      setNewAssetTag(generateCategoryPrefix(newAssetCategory));
      if (newAssetCategory === 'Laptop') {
        setNewAssetSpecs('Intel Core i5/i7 | 16GB DDR4 RAM | 512GB NVMe SSD | Windows 11 Pro');
      } else if (newAssetCategory.includes('Keyboard') || newAssetCategory.includes('Mouse')) {
        setNewAssetSpecs('USB / Wireless Plug-and-Play Standard Business Accessory');
      } else {
        setNewAssetSpecs('Standard Business Grade IT Hardware Configuration');
      }
    }
  }, [isAddModalOpen, newAssetCategory]);

  // 🌟 ASSET HISTORY ENGINE
  useEffect(() => {
    if (viewAssetModal && !isEditingAsset) {
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
          system_specs: asset.system_specs || asset.specs || (String(asset.category).toLowerCase().includes('laptop') ? 'Intel Core i5/i7 | 16GB RAM | 512GB SSD | Win 11 Pro' : 'Standard Business Hardware Configuration')
        };
      });
      setAssets(compiledAssets);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getStockStatusBadge = (status: string) => {
    const s = safeString(status);
    if (s.includes('Assigned')) return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (s.includes('Repair')) return isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse' : 'bg-orange-50 text-orange-800 border-orange-300 animate-pulse';
    if (s.includes('Demo')) return isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-800 border-purple-300';
    if (s.includes('Discard')) return isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 line-through' : 'bg-rose-50 text-rose-800 border-rose-300 line-through';
    if (s.includes('Pending')) return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-800 border-amber-300';
    return isDarkMode ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 'bg-purple-100/80 text-purple-900 border-purple-300';
  };

  const getInspectionStatusColor = (status: string) => {
    const s = safeString(status).toLowerCase().trim();
    if (s.includes('approved')) return isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-800 bg-emerald-50 border-emerald-300';
    if (s.includes('return')) return isDarkMode ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-purple-800 bg-purple-50 border-purple-300';
    if (s.includes('rejected')) return isDarkMode ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-800 bg-rose-50 border-rose-300';
    return isDarkMode ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-800 bg-amber-50 border-amber-300';
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

  // 🌟 OFFICIAL HANDOVER AGREEMENT GENERATOR & PDF EXPORTER
  const handleGenerateHandoverPDF = (asset: any) => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) return alert("Please allow pop-ups to view and download the official Handover Agreement.");

    const agreementDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Handover_Agreement_${asset.clean_tag}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 3px solid #6b21a8; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; items-center; }
            .logo { font-size: 28px; font-weight: 900; color: #6b21a8; letter-spacing: 2px; }
            .doc-title { font-size: 22px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 13px; font-weight: 800; color: #6b21a8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .field { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px; }
            .value { font-size: 14px; font-weight: 700; color: #0f172a; }
            .specs-box { background: #fff7ed; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; color: #9a3412; font-weight: 600; font-size: 13px; margin-top: 5px; }
            .terms { font-size: 12px; color: #475569; background: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 30px; }
            .terms ul { margin: 10px 0 0 0; padding-left: 20px; }
            .terms li { margin-bottom: 8px; }
            .signature-area { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; pt: 20px; }
            .sig-line { border-top: 2px solid #0f172a; padding-top: 10px; font-size: 12px; font-weight: 700; color: #0f172a; }
            .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; border: 1px solid #bbf7d0; }
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
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Date: ${agreementDate}</div>
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
              <div class="field"><span class="label">Asset Tag ID</span><span class="value" style="color: #6b21a8;">${asset.clean_tag}</span></div>
              <div class="field"><span class="label">Serial Number (S/N)</span><span class="value">${asset.serial_number || 'N/A'}</span></div>
              <div class="field"><span class="label">Device Name</span><span class="value">${asset.safe_display_name}</span></div>
              <div class="field"><span class="label">Brand & Category</span><span class="value">${asset.brand || 'Standard'} (${asset.category})</span></div>
            </div>
            <div style="margin-top: 15px;">
              <span class="label" style="color: #c2410c;">System Hardware Configuration / Specifications:</span>
              <div class="specs-box">${asset.system_specs || 'Standard Business Hardware Configuration'}</div>
            </div>
          </div>

          <div class="terms">
            <strong style="color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Terms of Asset Custody & Compliance:</strong>
            <ul>
              <li>The employee acknowledges receipt of the specified IT hardware in full working order and stated condition.</li>
              <li>This device is the exclusive property of Virtual Staffing Solutions and is provided strictly for authorized professional use.</li>
              <li>The custodian agrees to safeguard the asset against physical damage, unauthorized software modifications, or third-party access.</li>
              <li>In the event of resignation, termination, or administrative recall, the employee agrees to surrender the equipment immediately along with all accompanying accessories.</li>
            </ul>
          </div>

          <div class="signature-area">
            <div>
              <div style="font-family: monospace; font-size: 14px; color: #166534; font-weight: 700; margin-bottom: 20px;">Digitally Signed & Accepted Online</div>
              <div class="sig-line">Employee Signature (${asset.staff_name})</div>
            </div>
            <div>
              <div style="font-family: monospace; font-size: 14px; color: #6b21a8; font-weight: 700; margin-bottom: 20px;">VSS IT Administrator Stamp</div>
              <div class="sig-line">Authorized IT Officer Stamp & Signature</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
      
      const { error } = await supabase.from('assets').insert([{
        id: newAssetId, asset_tag: finalTag.toUpperCase(), name: newAssetName, 
        brand: newAssetBrand || 'Standard', serial_number: serialUpper, 
        category: newAssetCategory, price: newAssetPrice ? parseFloat(newAssetPrice) : null, 
        vendor: newAssetVendor || 'Direct', purchase_date: newAssetPurchaseDate || null, 
        warranty_expiry: newAssetWarranty || null, asset_condition: newAssetCondition,
        status: resolvedStatus, assigned_to: newAssetAssignee || null, inspection_status: 'Approved',
        system_specs: newAssetSpecs || 'Standard Business Configuration'
      }]);
      
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

      const updatePayload = {
        category: editForm.category, serial_number: serialUpper, asset_tag: editForm.asset_tag.toUpperCase(),
        name: editForm.name, brand: editForm.brand, price: editForm.price ? parseFloat(editForm.price) : null,
        vendor: editForm.vendor, purchase_date: editForm.purchase_date || null, warranty_expiry: editForm.warranty_expiry || null, 
        asset_condition: editForm.condition, status: resolvedStatus, inspection_status: editForm.inspection_status || 'Approved',
        assigned_to: editForm.assignee || null, system_specs: editForm.system_specs || ''
      };

      const { error } = await supabase.from('assets').update(updatePayload).eq('id', viewAssetModal.id);
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

  const theme = {
    bg: isDarkMode ? 'bg-[#0b0712]' : 'bg-slate-50',
    card: isDarkMode ? 'bg-[#150f24] border-purple-900/40' : 'bg-white border-slate-200/80',
    textMain: isDarkMode ? 'text-purple-50' : 'text-slate-900',
    textSub: isDarkMode ? 'text-purple-300/70' : 'text-slate-500', 
    inputBg: isDarkMode ? 'bg-[#0f0a1c] border-purple-900/60 focus:border-purple-500 text-purple-100 placeholder-purple-400/50' : 'bg-slate-50 border-slate-200 focus:border-purple-600 text-slate-900 placeholder-slate-400 font-medium',
    cardHover: isDarkMode ? 'hover:border-purple-600/70 hover:bg-[#1c1430] hover:shadow-xl hover:-translate-y-1' : 'hover:border-purple-300 hover:shadow-md hover:-translate-y-1',
    modalBody: isDarkMode ? 'bg-[#150f24] border-purple-900/60' : 'bg-white border-purple-200',
    modalHeader: isDarkMode ? 'bg-[#0f0a1c] border-purple-900/60' : 'bg-purple-50/50 border-purple-100',
    iconBgBrand: isDarkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-50 text-purple-700 font-bold',
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-12`}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* BRAND HEADER */}
        <div className={`${theme.card} rounded-3xl p-5 md:p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300`}>
          <div className="flex items-center gap-5">
            <button onClick={() => router.push('/admin')} className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${theme.card} hover:border-purple-500 hover:text-purple-600 ${theme.textSub}`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`text-2xl font-black tracking-tight ${theme.textMain} flex items-center gap-2.5`}>
                  <ShieldCheck className="text-purple-600 dark:text-purple-400" />
                  Hardware Registry 
                </h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'bg-purple-900/50 text-purple-200 border border-purple-800/50' : 'bg-purple-50 text-purple-800 border border-purple-200'}`}>{assets.length} Units</span>
              </div>
              <p className={`text-sm font-medium ${theme.textSub}`}>Manage full hardware lifecycle, smart QR stickers, and S/N tags</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedAssetIds.size > 0 && (
              <button onClick={() => setIsPrintConfigModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-purple-600/20 transition-all duration-200 animate-in zoom-in-95 cursor-pointer">
                <Printer size={16} /> <span>Print {selectedAssetIds.size} QRs</span>
              </button>
            )}
            <button onClick={() => setIsBulkModalOpen(true)} className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all duration-200 text-xs font-bold uppercase tracking-wider cursor-pointer ${theme.card} hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-300 ${theme.textMain}`}>
              <FileSpreadsheet size={16} /> <span>Bulk Upload</span>
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-purple-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer">
              <PlusCircle size={16} /> <span>Register Asset</span>
            </button>
          </div>
        </div>

        {/* TABS, SEARCH & 🌟 EXACT APPROVED TAB STYLING */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
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
                  className={`group flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer border ${
                    isActive 
                      ? 'bg-purple-600 text-white shadow-md border-purple-600 scale-[1.02]' 
                      : `${theme.card} ${theme.textSub} hover:text-purple-600 hover:border-purple-300 dark:hover:text-purple-300 dark:hover:border-purple-700`
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-purple-500 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors'}>{cat.icon}</span> 
                  <span>{cat.name}</span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold transition-colors ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-100 text-slate-600 group-hover:bg-purple-50 group-hover:text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 dark:group-hover:bg-purple-900/80 dark:group-hover:text-white'
                  }`}>{getCatCount(cat.name)}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 items-center">
            <button 
              onClick={handleSelectAllFiltered} 
              className={`px-4 py-3.5 shrink-0 rounded-xl border shadow-sm flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? (isDarkMode ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-purple-50 border-purple-300 text-purple-800') : `${theme.card} hover:border-purple-400 ${theme.textMain}`}`}
            >
              <CheckSquare size={16} className={selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-purple-500'} /> 
              <span className="hidden sm:inline">
                {selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? 'Deselect All' : 'Select All'}
              </span>
            </button>

            <div className={`flex-1 p-2.5 rounded-2xl border shadow-sm flex items-center transition-all duration-200 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-600/10 hover:border-purple-300 ${theme.card}`}>
              <div className="relative w-full">
                <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
                <input 
                  type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by Brand, Tag ID, Category, Assets Name, S/N, or Staff Name..." 
                  className={`w-full pl-12 pr-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`}
                />
              </div>
            </div>
          </div>

          {/* 🌟 DEDICATED DROPDOWN FILTER BAR (100% LIGHT & DARK MODE READABILITY) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme.textSub}`}>
                <Filter size={14} className="text-purple-600 dark:text-purple-400" /> Filter By:
              </span>
              
              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all duration-200 cursor-pointer ${
                  statusFilter !== 'All' 
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md' 
                    : 'bg-white text-slate-800 border-slate-300 hover:border-purple-500 dark:bg-[#150f24] dark:text-purple-100 dark:border-purple-900/60 dark:hover:border-purple-500'
                }`}
              >
                <option value="All" className="bg-white text-slate-900 font-medium dark:bg-zinc-900 dark:text-white">📦 All Stock Statuses</option>
                <option value="In Stock" className="bg-white text-slate-900 font-medium dark:bg-zinc-900 dark:text-white">🟢 In Stock (Unassigned)</option>
                <option value="Assigned" className="bg-white text-slate-900 font-medium dark:bg-zinc-900 dark:text-white">👤 Assigned</option>
                <option value="Pending Handover" className="bg-white text-slate-900 font-medium dark:bg-zinc-900 dark:text-white">⏳ Pending Handover</option>
                <option value="In Repair" className="bg-white text-slate-900 font-medium dark:bg-zinc-900 dark:text-white">🛠️ In Repair</option>
                <option value="Demo Use" className="bg-white text-slate-900 font-medium dark:bg-zinc-900 dark:text-white">🧪 Demo Use</option>
              </select>

              {/* Condition Dropdown */}
              <select
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all duration-200 cursor-pointer ${
                  conditionFilter !== 'All' 
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md' 
                    : 'bg-white text-slate-800 border-slate-300 hover:border-purple-500 dark:bg-[#150f24] dark:text-purple-100 dark:border-purple-900/60 dark:hover:border-purple-500'
                }`}
              >
                <option value="All" className="bg-white text-slate-900 font-medium dark:bg-zinc-900 dark:text-white">✨ All Conditions</option>
                <option value="New" className="bg-white text-slate-900 font-medium dark:bg-zinc-900 dark:text-white">✨ New</option>
                <option value="Refurbished" className="bg-white text-slate-900 font-medium dark:bg-zinc-900 dark:text-white">🔄 Refurbished</option>
                <option value="Repaired" className="bg-white text-slate-900 font-medium dark:bg-zinc-900 dark:text-white">🛠️ Repaired</option>
              </select>

              {/* Clear Filters Button */}
              {(statusFilter !== 'All' || conditionFilter !== 'All' || searchQuery !== '' || selectedCategory !== 'All') && (
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setConditionFilter('All');
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all duration-200 flex items-center gap-1 cursor-pointer shadow-sm bg-white dark:bg-zinc-900 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
                >
                  <FilterX size={14} /> Reset All Filters
                </button>
              )}
            </div>

            {/* Showing Count */}
            <span className={`text-xs font-bold ${theme.textSub}`}>
              Showing <strong className={`text-purple-700 dark:text-purple-300 font-black`}>{filteredAssets.length}</strong> of {assets.length} assets
            </span>
          </div>

        </div>

        {/* ASSET GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-purple-400' : 'border-purple-600'}`}></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Loading Brand Registry...</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className={`${theme.card} rounded-3xl p-16 border text-center flex flex-col items-center justify-center space-y-3 shadow-sm`}>
            <Package size={48} className="text-purple-600 opacity-60" />
            <h3 className={`text-base font-bold ${theme.textMain}`}>No Hardware Found</h3>
            <p className={`text-xs max-w-sm font-medium ${theme.textSub}`}>No assets match your selected filter combination. Try resetting your filters to view all 213 registered units.</p>
            <button
              onClick={() => {
                setStatusFilter('All');
                setConditionFilter('All');
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAssets.map(asset => {
              const isSelected = selectedAssetIds.has(asset.id);

              return (
                <div key={asset.id} onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button')) return;
                  toggleSelectAsset(asset.id);
                }} className={`${theme.card} rounded-3xl border shadow-sm flex flex-col justify-between group transition-all duration-300 cursor-pointer ${isSelected ? (isDarkMode ? '!border-purple-500 ring-2 ring-purple-500 !bg-purple-950/40' : '!border-purple-500 ring-2 ring-purple-500 !bg-purple-50/40') : theme.cardHover} overflow-hidden`}>
                  
                  <div className={`p-5 border-b ${isDarkMode ? 'border-purple-900/40' : 'border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${isSelected ? 'bg-purple-600 text-white shadow-md' : `${theme.iconBgBrand} group-hover:bg-purple-600 group-hover:text-white shadow-sm`}`}>
                          {getCategoryIcon(asset.category, 20)}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className={`text-sm font-bold leading-tight truncate max-w-[170px] ${theme.textMain} group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors`} title={asset.safe_display_name}>{asset.safe_display_name}</h3>
                          <p className={`text-[11px] font-medium mt-0.5 truncate ${theme.textSub}`}>{asset.brand || 'Standard Brand'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); openAssetViewModal(asset); }} className={`p-2 rounded-xl transition-all duration-200 cursor-pointer border ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:bg-purple-900 hover:text-white hover:border-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-purple-600 hover:text-white hover:border-purple-600'}`}>
                          <QrCode size={18} />
                        </button>
                        <input type="checkbox" checked={isSelected} readOnly className="w-5 h-5 rounded cursor-pointer accent-purple-600 ml-1" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-md font-bold text-[9px] uppercase tracking-widest border ${getStockStatusBadge(asset.status)}`}>{asset.status || 'In Stock'}</span>
                      <span className={`px-2.5 py-1 rounded-md font-bold text-[9px] uppercase tracking-widest border ${isDarkMode ? 'bg-purple-900/30 text-purple-200 border-purple-800/40' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{asset.asset_condition || 'New'}</span>
                    </div>
                  </div>

                  <div className={`p-5 space-y-3 flex-1 ${isDarkMode ? 'bg-[#0f0a1c]/60' : 'bg-slate-50/50'}`}>
                    <div className={`flex justify-between items-center p-3 rounded-xl border shadow-sm transition-colors ${theme.card} group-hover:border-purple-300 dark:group-hover:border-purple-800`}>
                      <span className={`font-bold uppercase text-[9px] tracking-widest ${theme.textSub}`}>Tag ID</span> 
                      <span className={`font-mono font-extrabold text-xs ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>{asset.clean_tag}</span>
                    </div>
                    <div className={`flex justify-between items-center p-3 rounded-xl border shadow-sm transition-colors ${theme.card} group-hover:border-purple-300 dark:group-hover:border-purple-800`}>
                      <span className={`font-bold uppercase text-[9px] tracking-widest ${theme.textSub}`}>Serial S/N</span> 
                      <span className={`font-mono font-bold text-[11px] truncate max-w-[140px] ${theme.textMain}`} title={asset.serial_number}>{asset.serial_number || 'N/A'}</span>
                    </div>
                    
                    <div className={`flex justify-between items-center p-3 rounded-xl border shadow-sm transition-all duration-200 ${theme.card} group-hover:border-purple-400 dark:group-hover:border-purple-700`}>
                      <div className="flex flex-col">
                        <span className={`font-bold uppercase text-[9px] tracking-widest ${theme.textSub}`}>Holder</span> 
                        <span className={`font-bold text-[11px] truncate max-w-[120px] ${theme.textMain}`} title={asset.staff_name}>{asset.staff_name}</span>
                      </div>
                      <span className={`font-mono font-bold px-2 py-1 rounded-lg text-[9px] ${isDarkMode ? 'bg-purple-950 text-purple-300 border border-purple-800/50' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{asset.emp_code}</span>
                    </div>
                  </div>

                  <div className={`p-4 border-t flex items-center justify-between ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/40' : 'bg-slate-100/60 border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className={theme.textSub} />
                      <div className="flex flex-col">
                        <span className={`text-[8px] font-extrabold uppercase tracking-widest ${theme.textSub}`}>Last Audited</span>
                        <span className={`text-[10px] font-mono font-bold ${theme.textMain}`}>{safeDate(asset.live_inspection_date)}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold ${getInspectionStatusColor(asset.live_inspection_status)}`}>
                      {(() => {
                        const st = (asset.live_inspection_status || '').toLowerCase().trim();
                        if (st.includes('approved')) return <CheckCircle2 size={12} />;
                        if (st.includes('return')) return <RefreshCw size={12} className="animate-spin" />;
                        return <AlertTriangle size={12} />;
                      })()}
                      <span className="text-[9px] font-bold uppercase tracking-widest">{asset.live_inspection_status || 'Approved'}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`rounded-3xl max-w-2xl w-full p-8 shadow-2xl border space-y-8 animate-in fade-in zoom-in-95 duration-200 ${theme.modalBody}`}>
            <div className={`flex justify-between items-center pb-4 border-b ${isDarkMode ? 'border-purple-900/50' : 'border-slate-100'}`}>
              <div>
                <h3 className={`text-lg font-bold tracking-tight flex items-center gap-3 ${theme.textMain}`}>
                  <Settings2 size={20} className="text-purple-600"/> Label Print Layout
                </h3>
                <p className={`text-[11px] mt-1 uppercase tracking-widest font-bold text-red-600 bg-red-50 inline-block px-2 py-1 rounded border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50`}>
                  Important: When printing, uncheck "Fit to Page" and set Margins to "None".
                </p>
              </div>
              <button onClick={() => setIsPrintConfigModalOpen(false)} className={`p-2 rounded-full cursor-pointer transition-colors border ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900 bg-slate-100'}`}><X size={16}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <h4 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>Sheet Formatting</h4>
                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Paper Size</label>
                  <select value={printConfig.pageSize} onChange={e => setPrintConfig({...printConfig, pageSize: e.target.value})} className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all ${theme.inputBg}`}>
                    <option value="A4">A4 (210 x 297mm)</option>
                    <option value="Letter">US Letter (8.5 x 11in)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Columns</label>
                    <input type="number" min="1" value={printConfig.columns} onChange={e => setPrintConfig({...printConfig, columns: parseInt(e.target.value) || 1})} className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all ${theme.inputBg}`} />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Rows</label>
                    <input type="number" min="1" value={printConfig.rows} onChange={e => setPrintConfig({...printConfig, rows: parseInt(e.target.value) || 1})} className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all ${theme.inputBg}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Top Margin (cm)</label>
                    <input type="number" step="0.01" value={printConfig.marginTop} onChange={e => setPrintConfig({...printConfig, marginTop: parseFloat(e.target.value) || 0})} className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all ${theme.inputBg}`} />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Left Margin (cm)</label>
                    <input type="number" step="0.01" value={printConfig.marginLeft} onChange={e => setPrintConfig({...printConfig, marginLeft: parseFloat(e.target.value) || 0})} className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all ${theme.inputBg}`} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>Label Dimensions</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Sticker Width (cm)</label>
                    <input type="number" step="0.01" value={printConfig.labelWidth} onChange={e => setPrintConfig({...printConfig, labelWidth: parseFloat(e.target.value) || 1})} className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all ${theme.inputBg}`} />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Sticker Height (cm)</label>
                    <input type="number" step="0.01" value={printConfig.labelHeight} onChange={e => setPrintConfig({...printConfig, labelHeight: parseFloat(e.target.value) || 1})} className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all ${theme.inputBg}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Col Gap (cm)</label>
                    <input type="number" step="0.1" value={printConfig.gapX} onChange={e => setPrintConfig({...printConfig, gapX: parseFloat(e.target.value) || 0})} className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all ${theme.inputBg}`} />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Row Gap (cm)</label>
                    <input type="number" step="0.1" value={printConfig.gapY} onChange={e => setPrintConfig({...printConfig, gapY: parseFloat(e.target.value) || 0})} className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all ${theme.inputBg}`} />
                  </div>
                </div>

                <div className={`mt-4 p-4 rounded-xl border ${isDarkMode ? 'bg-purple-950/40 border-purple-800/50' : 'bg-purple-50 border-purple-200'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={printConfig.packSmallAssets}
                      onChange={e => setPrintConfig({...printConfig, packSmallAssets: e.target.checked})}
                      className="w-5 h-5 accent-purple-600 rounded cursor-pointer" 
                    />
                    <div>
                      <span className={`text-sm font-bold block ${theme.textMain}`}>Smart Packing</span>
                      <span className={`text-[10px] font-medium mt-0.5 block ${theme.textSub}`}>Fit 2 accessories in 1 physical sticker</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-purple-200/40 dark:border-purple-900/40">
              <button onClick={() => setIsPrintConfigModalOpen(false)} className={`flex-1 py-4 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border transition-colors ${theme.card} ${theme.textSub} hover:text-slate-800 dark:hover:text-white`}>
                Cancel
              </button>
              <button onClick={executeGridBulkPrint} className="flex-[2] py-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg bg-purple-600 hover:bg-purple-700 text-white flex justify-center items-center gap-2 cursor-pointer transition-all shadow-purple-600/20">
                <Printer size={16}/> Generate Print Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 VIEW MODAL & HISTORY ENGINE (UPGRADED WITH COMPACT MOBILE LAYOUT AND HANDOVER PDF) */}
      {viewAssetModal && (() => {
        const liveModalTag = editForm.asset_tag || viewAssetModal.clean_tag;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className={`rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto md:overflow-hidden shadow-2xl flex flex-col md:flex-row border ${theme.modalBody}`}>
              
              {/* Left Column: COMPACT ON MOBILE QR Matrix Design */}
              <div className={`w-full md:w-[35%] p-5 md:p-8 flex flex-col items-center border-b md:border-b-0 md:border-r ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-purple-50/50 border-purple-100'} relative shrink-0`}>
                <button onClick={() => setViewAssetModal(null)} className={`absolute md:hidden top-4 right-4 p-2 rounded-full shadow-sm ${isDarkMode ? 'bg-[#18181b] text-zinc-400' : 'bg-white text-slate-500'}`}><X size={14}/></button>
                
                <h3 className={`text-xl md:text-2xl font-black tracking-widest uppercase mb-4 md:mb-8 mt-2 md:mt-4 text-purple-800 dark:text-purple-300`}>VSS</h3>
                
                <div className="bg-white p-3 md:p-5 rounded-2xl md:rounded-[1.5rem] shadow-md border border-purple-100 mb-4 md:mb-8 relative group">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getAssetViewUrl(viewAssetModal))}`} alt="QR Code" className="w-28 h-28 sm:w-36 sm:h-36 md:w-48 md:h-48 object-contain" />
                </div>

                <div className={`text-lg sm:text-xl md:text-2xl font-extrabold tracking-widest mb-1 md:mb-3 text-purple-700 dark:text-purple-400 font-mono`}>
                  {liveModalTag}
                </div>
                
                <p className={`text-xs md:text-sm font-bold tracking-wide ${theme.textSub} mb-4 md:mb-8 text-center truncate px-2 w-full`} title={editForm.serial || viewAssetModal.serial_number}>
                  S/N: {editForm.serial || viewAssetModal.serial_number}
                </p>

                <div className="flex w-full gap-2 mt-auto">
                  <button onClick={() => handlePrintPhysicalSticker(viewAssetModal, liveModalTag)} className={`flex-1 py-3.5 md:py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-all cursor-pointer ${isDarkMode ? 'bg-purple-900/50 hover:bg-purple-800/60 text-purple-200 border border-purple-800' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20'}`}>
                    <Printer size={16} /> Print Sticker
                  </button>
                </div>
              </div>

              {/* Right Column: Editor Workspace & History Log */}
              <div className={`w-full md:w-[65%] flex flex-col overflow-y-auto custom-scrollbar relative ${theme.modalBody}`}>
                <button onClick={() => setViewAssetModal(null)} className={`hidden md:flex absolute top-6 right-6 p-2.5 rounded-full cursor-pointer z-10 transition-colors ${isDarkMode ? 'bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white' : 'bg-purple-100 hover:bg-purple-200 text-purple-800'}`}><X size={18}/></button>

                <div className="p-5 sm:p-6 md:p-10 space-y-6 md:space-y-8">
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b gap-4 ${isDarkMode ? 'border-purple-900/50' : 'border-purple-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Logistics State:</span>
                      <span className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider border ${getStockStatusBadge(viewAssetModal.status)}`}>{viewAssetModal.status || 'In Stock'}</span>
                    </div>

                    {!isEditingAsset && (
                      <div className="flex gap-2 sm:ml-auto">
                        <button onClick={() => handleDeleteAsset(viewAssetModal.id)} className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase flex items-center gap-2 cursor-pointer transition-colors ${isDarkMode ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20' : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200'}`}>
                          <Trash2 size={14} /> Delete
                        </button>
                        <button onClick={() => setIsEditingAsset(true)} className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase flex items-center gap-2 cursor-pointer transition-colors ${isDarkMode ? 'bg-purple-900/40 text-purple-300 hover:bg-purple-700 hover:text-white border border-purple-800/50' : 'bg-purple-100 text-purple-900 hover:bg-purple-700 hover:text-white border border-purple-200'}`}>
                          <Edit2 size={14} /> Edit
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingAsset ? (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className={`flex justify-between items-center pb-3 border-b ${isDarkMode ? 'border-purple-900/50' : 'border-purple-200'}`}>
                        <span className={`text-sm font-bold uppercase tracking-widest text-purple-800 dark:text-purple-300`}>Editing Hardware Record</span>
                      </div>

                      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-purple-50/50 border-purple-200/70'}`}>
                        <div>
                          <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Asset Category *</label>
                          <select value={editForm.category} onChange={e => { 
                            const newCat = e.target.value; 
                            setEditForm({ 
                              ...editForm, 
                              category: newCat, 
                              asset_tag: generateCategoryPrefix(newCat, editForm.asset_tag) 
                            }); 
                          }} className={`w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-colors border ${theme.inputBg}`}>
                            {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={`text-[10px] font-bold uppercase flex justify-between mb-1.5 text-purple-700 dark:text-purple-400`}>
                            <span>Asset Tag ID</span>
                            <button type="button" onClick={() => setEditForm({...editForm, asset_tag: generateCategoryPrefix(editForm.category)})} className="text-[9px] lowercase hover:underline cursor-pointer">(force regenerate)</button>
                          </label>
                          <input type="text" value={editForm.asset_tag} onChange={e => setEditForm({...editForm, asset_tag: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none uppercase transition-colors border ${isDarkMode ? 'bg-[#0f0a1c] border-purple-500/50 text-purple-400 focus:border-purple-400' : 'bg-white border-purple-300 text-purple-700 focus:border-purple-500'}`} />
                        </div>
                      </div>

                      <div>
                        <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Factory Serial Number (S/N) *</label>
                        <input type="text" required value={editForm.serial} onChange={e => setEditForm({...editForm, serial: e.target.value})} placeholder="Scan factory S/N barcode..." className={`w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none uppercase transition-all border ${theme.inputBg}`} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Brand</label><input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                        <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Assets Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Price (₹)</label><input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-mono font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                        <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Purchase Date</label><input type="date" value={editForm.purchase_date} onChange={e => setEditForm({...editForm, purchase_date: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                        <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Warranty Expiry</label><input type="date" value={editForm.warranty_expiry} onChange={e => setEditForm({...editForm, warranty_expiry: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                      </div>

                      <div>
                        <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>System Hardware Specifications / Configuration</label>
                        <input type="text" value={editForm.system_specs} onChange={e => setEditForm({...editForm, system_specs: e.target.value})} placeholder="e.g. Intel Core i7 | 16GB RAM | 512GB SSD | Win 11 Pro" className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} />
                      </div>

                      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t ${isDarkMode ? 'border-purple-900/50' : 'border-purple-200'}`}>
                        <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Condition</label><select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`}><option value="New">✨ New</option><option value="Refurbished">🔄 Refurbished</option><option value="Repaired">🛠️ Repaired</option></select></div>
                        <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Stock Status</label><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`}><option value="In Stock (Unassigned)">📦 In Stock</option><option value="Assigned">👤 Assigned</option><option value="Demo Use">🧪 Demo</option><option value="In Repair">⚠️ Repair</option><option value="Discard">🗑️ Discard</option></select></div>
                        <div>
                          <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Inspection State</label>
                          <select value={editForm.inspection_status} onChange={e => setEditForm({...editForm, inspection_status: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`}>
                            <option value="Approved">✅ Approved</option><option value="Re-Inspection">🔄 Re-Inspection</option><option value="Not Approved">⚠️ Not Approved</option><option value="Rejected">❌ Rejected</option>
                          </select>
                        </div>
                      </div>

                      <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-purple-50 border-purple-200'}`}>
                        <label className={`text-[10px] font-bold uppercase block mb-2 ${theme.textSub}`}>Re-Assign Holder</label>
                        <SearchableStaffDropdown value={editForm.assignee} onChange={(val: string) => setEditForm({...editForm, assignee: val})} staffList={staffList} isDarkMode={isDarkMode} />
                      </div>

                      <div className="flex gap-4 pt-6">
                        <button type="button" onClick={() => setIsEditingAsset(false)} className={`px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors border ${isDarkMode ? 'bg-[#150f24] border-purple-900/50 text-zinc-300 hover:bg-purple-900/30' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'}`}>Cancel</button>
                        <button type="button" onClick={handleUpdateExistingAsset} disabled={isUpdating} className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer transition-all">
                          {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save Secure Record
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-2xl border ${theme.modalHeader}`}><p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Category</p><p className={`text-sm font-bold mt-1 text-purple-800 dark:text-purple-300`}>{viewAssetModal.category || 'Laptop'}</p></div>
                        <div className={`p-4 rounded-2xl border sm:col-span-2 ${theme.modalHeader}`}><p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Serial Number (S/N)</p><p className={`text-sm font-mono font-bold mt-1 ${theme.textMain}`}>{viewAssetModal.serial_number || 'N/A'}</p></div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-2xl border ${theme.modalHeader}`}><p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Brand</p><p className={`text-sm font-bold mt-1 ${theme.textMain}`}>{viewAssetModal.brand || 'N/A'}</p></div>
                        <div className={`p-4 rounded-2xl border sm:col-span-2 ${theme.modalHeader}`}><p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Assets Name</p><p className={`text-sm font-bold mt-1 ${theme.textMain}`}>{viewAssetModal.safe_display_name}</p></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-purple-500/5 border-purple-500/10' : 'bg-purple-50/40 border-purple-100/70'}`}><p className={`text-[9px] font-bold uppercase tracking-widest text-purple-700 dark:text-purple-400`}>Purchase Date</p><p className={`text-xs font-bold mt-1.5 ${theme.textMain}`}>{safeDate(viewAssetModal.purchase_date)}</p></div>
                        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-purple-500/5 border-purple-500/10' : 'bg-purple-50/40 border-purple-100/70'}`}><p className={`text-[9px] font-bold uppercase tracking-widest text-purple-700 dark:text-purple-400`}>Warranty Date</p><p className={`text-xs font-bold mt-1.5 ${theme.textMain}`}>{safeDate(viewAssetModal.warranty_expiry)}</p></div>
                        <div className={`p-4 rounded-2xl border flex flex-col justify-center ${isDarkMode ? 'bg-purple-500/5 border-purple-500/10' : 'bg-purple-50/40 border-purple-100/70'}`}><p className={`text-[9px] font-bold uppercase tracking-widest text-purple-700 dark:text-purple-400`}>Inspection Status</p><div className="flex items-center gap-1.5 mt-1.5"><span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${getInspectionStatusColor(viewAssetModal.live_inspection_status)}`}>{viewAssetModal.live_inspection_status || 'Approved'}</span></div></div>
                      </div>

                      {/* 🌟 SYSTEM SPECIFICATIONS ONLINE BLOCK */}
                      <div className={`p-4.5 rounded-2xl border flex items-start gap-3.5 ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-purple-50/70 border-purple-200'}`}>
                        <Cpu size={20} className="text-purple-700 dark:text-purple-400 shrink-0 mt-0.5" />
                        <div className="w-full">
                          <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${theme.textSub}`}>System Hardware Configuration / Specifications:</span>
                          <p className={`text-xs md:text-sm font-semibold leading-relaxed ${theme.textMain}`}>{viewAssetModal.system_specs || 'Standard Business Hardware Configuration'}</p>
                        </div>
                      </div>

                      <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-purple-100 border-purple-300'}`}>
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Assigned Employee Holder:</span>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.iconBgBrand}`}><User size={16}/></div>
                            <span className={`text-base font-bold ${theme.textMain}`}>{viewAssetModal.staff_name}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${theme.textSub}`}>EMP CODE</span>
                           <span className={`text-sm font-mono font-bold px-3 py-1 rounded-lg border shadow-sm ${isDarkMode ? 'bg-[#150f24] border-purple-800 text-purple-300' : 'bg-white border-purple-300 text-purple-950'}`}>{viewAssetModal.emp_code}</span>
                        </div>
                      </div>

                      {/* 🌟 OFFICIAL HANDOVER AGREEMENT & COMPLIANCE DOCUMENTS SECTION */}
                      {(viewAssetModal.assigned_to || viewAssetModal.status === 'Assigned' || viewAssetModal.status === 'Pending Handover') && (
                        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50/80 border-emerald-200'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm shrink-0">
                                <FileText size={20} />
                              </div>
                              <div>
                                <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>Official Handover Agreement</h4>
                                <p className={`text-[11px] font-semibold mt-0.5 ${isDarkMode ? 'text-emerald-200/80' : 'text-emerald-800'}`}>Digitally executed custody document with hardware specs and usage policies.</p>
                              </div>
                            </div>

                            <button 
                              onClick={() => handleGenerateHandoverPDF(viewAssetModal)}
                              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
                            >
                              <Download size={15} /> <span>View / Download PDF</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 🌟 LIFECYCLE & ACTIVITY HISTORY */}
                      <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-purple-50/70 border-purple-200'}`}>
                        <div className="flex items-center gap-2 mb-4">
                          <History size={16} className="text-purple-700 dark:text-purple-400" />
                          <h4 className={`text-xs font-black uppercase tracking-widest ${theme.textMain}`}>Lifecycle & Activity History</h4>
                        </div>
                        
                        {isLoadingHistory ? (
                          <div className="flex justify-center p-4"><Loader2 className="animate-spin text-purple-600"/></div>
                        ) : assetHistory.length === 0 ? (
                          <p className={`text-xs font-medium italic ${theme.textSub}`}>No history logs found for this asset.</p>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {assetHistory.map((log, idx) => {
                              let photosArray: string[] = [];
                              try {
                                if (Array.isArray(log.photos)) photosArray = log.photos;
                                else if (typeof log.photos === 'string') {
                                  const parsed = JSON.parse(log.photos);
                                  if (Array.isArray(parsed)) photosArray = parsed;
                                }
                              } catch(e){}

                              return (
                                <div key={idx} className={`p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-[#150f24] border-purple-900/40' : 'bg-white border-purple-200'}`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${getInspectionStatusColor(log.status)}`}>{log.status}</span>
                                      <p className={`text-xs font-bold mt-2 ${theme.textMain}`}>{log.staff_name} <span className="text-slate-500 font-mono">({log.emp_code})</span></p>
                                    </div>
                                    <span className={`text-[10px] font-bold ${theme.textSub}`}>{safeDate(log.created_at)}</span>
                                  </div>
                                  {log.notes && (
                                    <div className={`mt-2 text-xs font-mono p-3 rounded-lg border whitespace-pre-wrap ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50 text-purple-200/80' : 'bg-purple-50 border-purple-200 text-slate-800'}`}>
                                      {log.notes}
                                    </div>
                                  )}
                                  {photosArray.length > 0 && (
                                    <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-2">
                                      {photosArray.map((url, i) => (
                                        <img key={`hist-photo-${i}`} src={url} alt="Log" className="h-16 w-16 rounded-lg object-cover border border-purple-200/60 shadow-sm" />
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
          </div>
        );
      })()}

      {/* 🚀 ADD NEW ASSET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border ${theme.modalBody}`}>
            <div className={`p-6 border-b flex justify-between items-center ${theme.modalHeader}`}>
              <h3 className={`text-lg font-bold uppercase tracking-widest ${theme.textMain}`}>Register New Asset</h3>
              <button onClick={() => setIsAddModalOpen(false)} className={`p-2 rounded-full cursor-pointer transition-colors border ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white' : 'text-slate-400 hover:text-slate-900 bg-slate-100'}`}><X size={16}/></button>
            </div>
            
            <form onSubmit={handleSaveNewAsset} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-purple-50/50 border-purple-200/70'}`}>
                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Asset Category *</label>
                  <select value={newAssetCategory} onChange={e => {
                    const newCat = e.target.value;
                    setNewAssetCategory(newCat);
                    setNewAssetTag(generateCategoryPrefix(newCat, newAssetTag));
                  }} className={`w-full p-3.5 rounded-xl text-xs font-bold outline-none transition-colors border ${theme.inputBg}`}>
                    {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase flex justify-between mb-1.5 text-purple-700 dark:text-purple-400`}>
                    <span>Asset Tag ID</span>
                    <button type="button" onClick={() => setNewAssetTag(generateCategoryPrefix(newAssetCategory))} className="text-[9px] lowercase hover:underline cursor-pointer">(generate new)</button>
                  </label>
                  <input type="text" value={newAssetTag} onChange={e => setNewAssetTag(e.target.value)} className={`w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none uppercase transition-colors border ${isDarkMode ? 'bg-[#0f0a1c] border-purple-500/50 text-purple-400 focus:border-purple-400' : 'bg-white border-purple-300 text-purple-700 focus:border-purple-500'}`} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Factory Serial Number (S/N) *</label>
                  <input type="text" required value={newAssetSerial} onChange={e => setNewAssetSerial(e.target.value)} placeholder="Scan factory S/N barcode..." className={`w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none uppercase transition-all border ${theme.inputBg}`} />
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Vendor Source</label>
                  <input type="text" value={newAssetVendor} onChange={e => setNewAssetVendor(e.target.value)} placeholder="e.g. Local Supplier, Nabha" className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Brand</label><input type="text" value={newAssetBrand} onChange={e => setNewAssetBrand(e.target.value)} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Assets Name *</label><input type="text" required value={newAssetName} onChange={e => setNewAssetName(e.target.value)} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Price (₹)</label><input type="number" step="0.01" value={newAssetPrice} onChange={e => setNewAssetPrice(e.target.value)} className={`w-full p-3.5 rounded-xl text-xs font-mono font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Purchase Date</label><input type="date" value={newAssetPurchaseDate} onChange={e => setNewAssetPurchaseDate(e.target.value)} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Warranty Expiry</label><input type="date" value={newAssetWarranty} onChange={e => setNewAssetWarranty(e.target.value)} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
              </div>

              <div>
                <label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>System Hardware Specifications / Configuration</label>
                <input type="text" value={newAssetSpecs} onChange={e => setNewAssetSpecs(e.target.value)} placeholder="e.g. Intel Core i7 | 16GB RAM | 512GB SSD | Win 11 Pro" className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} />
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t ${isDarkMode ? 'border-purple-900/50' : 'border-purple-100'}`}>
                <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Condition</label><select value={newAssetCondition} onChange={e => setNewAssetCondition(e.target.value)} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`}><option value="New">✨ New</option><option value="Refurbished">🔄 Refurbished</option><option value="Repaired">🛠️ Repaired</option></select></div>
                <div><label className={`text-[10px] font-bold uppercase block mb-1.5 ${theme.textSub}`}>Stock Status</label><select value={newAssetStatus} onChange={e => setNewAssetStatus(e.target.value)} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`}><option value="In Stock (Unassigned)">📦 In Stock</option><option value="Demo Use">🧪 Demo</option></select></div>
              </div>

              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-purple-50/50 border-purple-200'}`}>
                <label className={`text-[10px] font-bold uppercase block mb-2 ${theme.textSub}`}>Assign to Employee (Optional)</label>
                <SearchableStaffDropdown value={newAssetAssignee} onChange={(val: string) => setNewAssetAssignee(val)} staffList={staffList} isDarkMode={isDarkMode} />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className={`px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors border ${isDarkMode ? 'bg-[#150f24] border-purple-900/50 text-zinc-300 hover:bg-purple-900/30' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'}`}>Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer transition-all">
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Register New Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`rounded-3xl max-w-md w-full p-8 shadow-2xl border space-y-6 text-center animate-in fade-in duration-200 ${theme.modalBody}`}>
            <div className={`flex justify-between items-center pb-4 border-b ${isDarkMode ? 'border-purple-900/50' : 'border-purple-100'}`}>
              <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${theme.textMain}`}><Upload size={18} className="text-purple-600"/> Bulk Asset Import</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className={`p-2 rounded-full cursor-pointer transition-colors border ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:text-white' : 'text-slate-400 hover:text-slate-900 bg-slate-100'}`}><X size={16}/></button>
            </div>
            
            <div className="space-y-4 text-left">
              <button className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${isDarkMode ? 'bg-purple-900/30 border-purple-800/60 text-purple-300 hover:bg-purple-900/50' : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300'}`}>
                <Download size={16} className="text-purple-600"/> <span>Download CSV Template</span>
              </button>
            </div>

            <div className={`p-8 border-2 border-dashed rounded-2xl transition-colors flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'border-purple-900/60 bg-[#0f0a1c] hover:bg-purple-950/30' : 'border-purple-300 bg-purple-50/30 hover:bg-purple-50/60'}`}>
              <FileSpreadsheet size={48} className="text-purple-600 animate-pulse" />
              <input type="file" accept=".csv" className={`w-full text-xs font-semibold cursor-pointer transition-all file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:cursor-pointer ${isDarkMode ? 'text-zinc-400 file:bg-purple-600 file:text-white hover:file:opacity-90' : 'text-slate-700 file:bg-purple-600 file:text-white'}`} />
            </div>

            <button className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all bg-slate-300 dark:bg-zinc-800 text-white cursor-not-allowed`}>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-purple-50/30 dark:bg-[#0b0712]"><Loader2 className="w-10 h-10 animate-spin text-purple-600" /></div>}>
      <AssetRegistryContent />
    </Suspense>
  );
}