'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Laptop, PlusCircle, Search, QrCode, 
  User, X, Save, RefreshCw, Download, Printer, Edit2, 
  Upload, FileSpreadsheet, Package, Mouse, 
  Headphones, SlidersHorizontal, ChevronDown, CheckCircle2, Clock, AlertTriangle, FileSignature
} from 'lucide-react';

const ASSET_CATEGORIES = [
  'Laptop', 'Stand', 'Keyboard USB', 'Combo Keyboard with Mouse kit USB', 
  'Wireless Keyboard kit', 'Mouse', 'Headphone', 'Cleaning kit', 'Mouse PAD', 'Others'
];

// ==========================================
// SEARCHABLE STAFF DROPDOWN COMPONENT (Themed)
// ==========================================
const SearchableStaffDropdown = ({ value, onChange, staffList, isDarkMode, placeholder = "Search name or emp code..." }: any) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const t = {
    bg: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-white border-slate-200',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    menu: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200',
    hover: isDarkMode ? 'hover:bg-[#18181b]' : 'hover:bg-blue-50',
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
      <div className={`flex items-center w-full p-3.5 border rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all ${t.bg}`}>
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
                <span className={`font-semibold group-hover:text-blue-500 ${t.text}`}>{s.full_name || s.name}</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-md transition-colors ${isDarkMode ? 'bg-[#18181b] text-zinc-400 group-hover:bg-blue-500/20 group-hover:text-blue-400' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
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
// MAIN PAGE COMPONENT
// ==========================================
export default function AssetRegistryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [assets, setAssets] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [viewAssetModal, setViewAssetModal] = useState<any>(null);

  // Forms
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

  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // 🌟 GLOBAL THEME SYNC
  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    fetchRegistryData();
  }, []);

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
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
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
        supabase.from('inspections').select('asset_id, status, notes, created_at').order('created_at', { ascending: false })
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
          clean_tag: (asset.asset_tag && asset.asset_tag.length < 20) ? asset.asset_tag : generateCategoryPrefix(asset.category, asset.id),
          live_inspection_status: latestInspection?.status || asset.inspection_status || 'Approved',
          live_inspection_date: latestInspection?.created_at || asset.last_inspection_date || null,
          live_inspection_notes: latestInspection?.notes || null
        };
      });
      setAssets(compiledAssets);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // 🎨 Carbon/Slate Aware Badges
  const getStockStatusBadge = (status: string) => {
    const s = status || 'In Stock (Unassigned)';
    if (s.includes('Assigned')) return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('Repair')) return isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse' : 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse';
    if (s.includes('Demo')) return isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200';
    if (s.includes('Discard')) return isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 line-through' : 'bg-rose-50 text-rose-700 border-rose-200 line-through';
    if (s.includes('Pending')) return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
    return isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getInspectionStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'approved') return isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s === 're-inspection') return isDarkMode ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-700 bg-amber-50 border-amber-200';
    if (s === 'not approved') return isDarkMode ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-orange-700 bg-orange-50 border-orange-200';
    if (s === 'rejected') return isDarkMode ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-700 bg-rose-50 border-rose-200';
    return isDarkMode ? 'text-zinc-400 bg-[#18181b] border-[#27272a]' : 'text-slate-600 bg-slate-50 border-slate-200';
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
      inspection_status: asset.live_inspection_status || 'Approved', assignee: asset.assigned_to || ''
    });
  };

  const handleSaveNewAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName || !newAssetSerial) return alert("Assets Name and Serial Number are required.");
    setIsSaving(true);
    try {
      const resolvedStatus = newAssetAssignee ? 'Pending Handover' : newAssetStatus;
      const finalTag = newAssetTag || generateCategoryPrefix(newAssetCategory);
      const { error } = await supabase.from('assets').insert([{
        id: generateSafeUuid(), asset_tag: finalTag.toUpperCase(), name: newAssetName, 
        brand: newAssetBrand || 'Standard', serial_number: newAssetSerial.toUpperCase(), 
        category: newAssetCategory, price: newAssetPrice ? parseFloat(newAssetPrice) : null, 
        vendor: newAssetVendor || 'Direct', purchase_date: newAssetPurchaseDate || null, 
        warranty_expiry: newAssetWarranty || null, asset_condition: newAssetCondition,
        status: resolvedStatus, assigned_to: newAssetAssignee || null, inspection_status: 'Approved'
      }]);
      if (error) throw error;
      setIsAddModalOpen(false); fetchRegistryData();
    } catch (err: any) { alert(`Error: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleUpdateExistingAsset = async () => {
    setIsUpdating(true);
    try {
      let resolvedStatus = editForm.status;
      if (editForm.assignee && viewAssetModal.assigned_to !== editForm.assignee) {
        resolvedStatus = 'Pending Handover';
      } else if (!editForm.assignee && resolvedStatus === 'Assigned') {
        resolvedStatus = 'In Stock (Unassigned)';
      }

      const updatePayload = {
        category: editForm.category, serial_number: editForm.serial.toUpperCase(), asset_tag: editForm.asset_tag.toUpperCase(),
        name: editForm.name, brand: editForm.brand, price: editForm.price ? parseFloat(editForm.price) : null,
        vendor: editForm.vendor, purchase_date: editForm.purchase_date || null, warranty_expiry: editForm.warranty_expiry || null, 
        asset_condition: editForm.condition, status: resolvedStatus, inspection_status: editForm.inspection_status || 'Approved',
        assigned_to: editForm.assignee || null
      };

      const { error } = await supabase.from('assets').update(updatePayload).eq('id', viewAssetModal.id);
      if (error) throw error;
      setIsEditingAsset(false); fetchRegistryData();
    } catch (err: any) { alert(`Error updating: ${err.message}`); } finally { setIsUpdating(false); }
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

    const printableDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print_${cleanTag}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap');
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; font-family: 'Inter', sans-serif; background: #fff; color: #000; -webkit-font-smoothing: antialiased; }
            @media print { @page { margin: 0mm; size: auto; } body { padding: 0; background: #fff; } }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 300)">
          <div style="width: 50mm; height: 50mm; box-sizing: border-box; padding: 3mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
            <div style="font-size: 14pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 2px;">VSS</div>
            <img src="${qrUrl}" style="width: 28mm; height: 28mm; display: block; margin: 3px 0;" />
            <div style="font-size: 13pt; font-weight: 800; margin-top: 4px; letter-spacing: 0.5px;">${cleanTag}</div>
            <div style="font-size: 8pt; font-weight: 600; color: #444; margin-top: 3px;">S/N: ${asset.serial_number || 'N/A'}</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.open(); 
    printWindow.document.write(printableDocument); 
    printWindow.document.close();
  };

  // 📝 HANDOVER AGREEMENT PDF GENERATOR
  const handlePrintAgreement = (asset: any) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return alert("Pop-up blocked! Please allow pop-ups to download the PDF.");

    // Determines if we show the real signature or a "PENDING" stamp
    const isPending = asset.status === 'Pending Handover' || asset.live_inspection_status === 'Pending';
    const signatureText = isPending 
      ? '[ PENDING ELECTRONIC SIGNATURE FROM STAFF ]'
      : asset.live_inspection_notes?.includes('Digitally Signed') 
        ? asset.live_inspection_notes 
        : `Digitally Signed Handover Agreement by ${asset.staff_name} on ${new Date(asset.live_inspection_date || new Date()).toLocaleString()}`;

    const doc = `
      <html>
        <head>
          <title>Handover_Agreement_${asset.clean_tag}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; line-height: 1.6; color: #111; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
            .subtitle { font-size: 14px; color: #6b7280; font-weight: bold; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f9fafb; padding: 25px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .policy { margin-bottom: 40px; }
            .policy h3 { font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
            .policy ul { padding-left: 20px; }
            .policy li { margin-bottom: 10px; font-size: 14px; }
            .signature-box { border: 2px dashed ${isPending ? '#fcd34d' : '#cbd5e1'}; padding: 25px; border-radius: 8px; background: ${isPending ? '#fffbeb' : '#ecfdf5'}; margin-top: 40px; }
            .sign-header { font-size: 12px; font-weight: bold; text-transform: uppercase; color: ${isPending ? '#b45309' : '#065f46'}; margin: 0 0 10px 0; }
            .sign-text { font-family: monospace; font-size: 15px; color: ${isPending ? '#d97706' : '#047857'}; font-weight: bold; margin: 0; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
          <div class="header">
            <h1 class="title">IT Asset Handover Agreement</h1>
            <p class="subtitle">Virtual Staffing Solutions Security Policy</p>
          </div>
          
          <div class="grid">
            <div><strong>Asset Name:</strong> <br/>${asset.safe_display_name}</div>
            <div><strong>Asset Category:</strong> <br/>${asset.category}</div>
            <div><strong>Asset Tag ID:</strong> <br/>${asset.clean_tag}</div>
            <div><strong>Factory Serial (S/N):</strong> <br/>${asset.serial_number || 'N/A'}</div>
            <div><strong>Assigned Employee:</strong> <br/>${asset.staff_name}</div>
            <div><strong>Employee Code:</strong> <br/>${asset.emp_code}</div>
          </div>

          <div class="policy">
            <h3>Terms and Conditions</h3>
            <p>I, <strong>${asset.staff_name}</strong>, acknowledge the receipt of the IT asset detailed above, provided by Virtual Staffing Solutions for official use.</p>
            <ul>
              <li><strong>Care & Maintenance:</strong> I agree to handle the equipment with care, protecting it from damage, loss, or theft.</li>
              <li><strong>Official Use Only:</strong> I understand this equipment is strictly for professional duties and complies with company IT security policies.</li>
              <li><strong>Return Policy:</strong> I agree to return this asset in good working condition upon separation from the company, or immediately upon request by IT Management.</li>
              <li><strong>Liability:</strong> I acknowledge that gross negligence or unauthorized modifications resulting in hardware damage may result in disciplinary action or financial liability.</li>
            </ul>
          </div>

          <div class="signature-box">
            <p class="sign-header">Logistics E-Signature Log</p>
            <p class="sign-text">${isPending ? '⏳' : '✓'} ${signatureText}</p>
            <p style="font-size: 12px; color: ${isPending ? '#92400e' : '#064e3b'}; margin-top: 15px; opacity: 0.8;">
              ${isPending ? 'This document is a draft and is pending electronic signature from the assigned staff member.' : 'This document was securely logged in the VSS IT Asset Management System and serves as a legally binding electronic signature.'}
            </p>
          </div>

          <div class="footer">
            Document Generated on ${new Date().toLocaleString()} • Internal VSS Records
          </div>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(doc);
    printWindow.document.close();
  };

  const getCatCount = (filterName: string) => {
    if (filterName === 'All') return assets.length;
    if (filterName === 'Accessories') return assets.filter(a => ['Mouse', 'Keyboard USB', 'Combo Keyboard with Mouse kit USB', 'Wireless Keyboard kit', 'Mouse PAD', 'Stand'].includes(a.category)).length;
    if (filterName === 'Other') return assets.filter(a => ['Cleaning kit', 'Others'].includes(a.category)).length;
    return assets.filter(a => a.category?.toLowerCase() === filterName.toLowerCase()).length;
  };

  const filteredAssets = assets.filter(a => {
    const q = searchQuery.toLowerCase();
    const cleanTag = (a.clean_tag || '').toLowerCase();
    const matchesSearch = !q || (
      a.id.toLowerCase().includes(q) || cleanTag.includes(q) ||
      (a.safe_display_name || '').toLowerCase().includes(q) || (a.serial_number || '').toLowerCase().includes(q) ||
      (a.staff_name || '').toLowerCase().includes(q) || (a.emp_code || '').toLowerCase().includes(q)
    );
    let matchesCat = true;
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Accessories') matchesCat = ['Mouse', 'Keyboard USB', 'Combo Keyboard with Mouse kit USB', 'Wireless Keyboard kit', 'Mouse PAD', 'Stand'].includes(a.category);
      else if (selectedCategory === 'Other') matchesCat = ['Cleaning kit', 'Others'].includes(a.category);
      else matchesCat = a.category === selectedCategory;
    }
    return matchesSearch && matchesCat;
  });

  // 🌟 MASTER THEME DICTIONARY (Bulletproofed for TypeScript)
  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-slate-50',
    card: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200/60',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-800',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500', 
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500', 
    inputBg: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a] focus:border-blue-500 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900 placeholder-slate-400',
    cardHover: isDarkMode ? 'hover:border-[#3f3f46] hover:bg-[#18181b]' : 'hover:border-blue-300 hover:shadow-md',
    modalOverlay: 'bg-black/80 backdrop-blur-sm z-50',
    modalBody: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200',
    modalHeader: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-slate-50 border-slate-100',
    iconBgBlue: isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-10`}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* HEADER */}
        <div className={`${theme.card} rounded-3xl p-5 md:p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors`}>
          <div className="flex items-center gap-5">
            <button onClick={() => router.push('/admin')} className={`p-2.5 rounded-xl border transition-colors ${theme.card} ${theme.cardHover} ${theme.textSub}`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`text-2xl font-semibold tracking-tight ${theme.textMain}`}>Hardware Registry</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest ${isDarkMode ? 'bg-[#27272a] text-zinc-300' : 'bg-slate-100 text-slate-700'}`}>{assets.length} Units</span>
              </div>
              <p className={`text-sm ${theme.textSub}`}>Manage full hardware lifecycle, smart QR stickers, and S/N tags</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsBulkModalOpen(true)} className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-colors text-xs font-semibold uppercase tracking-wider ${theme.card} ${theme.cardHover} ${theme.textMain}`}>
              <FileSpreadsheet size={16} /> <span>Bulk Upload</span>
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-lg shadow-blue-600/20 transition-all">
              <PlusCircle size={16} /> <span>Register Asset</span>
            </button>
          </div>
        </div>

        {/* TABS & SEARCH */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {[
              { name: 'All', icon: <Package size={14}/> }, { name: 'Laptop', icon: <Laptop size={14}/> },
              { name: 'Accessories', icon: <Mouse size={14}/> }, { name: 'Headphone', icon: <Headphones size={14}/> },
              { name: 'Other', icon: <SlidersHorizontal size={14}/> }
            ].map(cat => (
              <button
                key={cat.name} onClick={() => setSelectedCategory(cat.name)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider shrink-0 transition-all ${
                  selectedCategory === cat.name 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : `${theme.card} ${theme.textSub} hover:text-blue-500`
                }`}
              >
                {cat.icon} <span>{cat.name}</span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${selectedCategory === cat.name ? 'bg-white/20 text-white' : isDarkMode ? 'bg-[#27272a] text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>{getCatCount(cat.name)}</span>
              </button>
            ))}
          </div>

          <div className={`p-2.5 rounded-2xl border shadow-sm flex items-center transition-colors ${theme.card}`}>
            <div className="relative w-full">
              <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
              <input 
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Tag ID, Assets Name, S/N, Holder Name, or EMP Code..." 
                className={`w-full pl-12 pr-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all border ${theme.inputBg}`}
              />
            </div>
          </div>
        </div>

        {/* ASSET GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-zinc-500' : 'border-blue-600'}`}></div>
            <span className={`text-[11px] font-semibold tracking-widest uppercase ${theme.textSub}`}>Loading Database</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredAssets.map(asset => (
              <div key={asset.id} className={`${theme.card} rounded-3xl border shadow-sm flex flex-col justify-between group transition-all ${theme.cardHover} overflow-hidden`}>
                
                <div className={`p-5 border-b ${isDarkMode ? 'border-[#27272a]' : 'border-slate-50'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${theme.iconBgBlue}`}>
                        <Laptop size={20}/>
                      </div>
                      <div className="overflow-hidden">
                        <h3 className={`text-sm font-semibold leading-tight truncate max-w-[170px] ${theme.textMain}`} title={asset.safe_display_name}>{asset.safe_display_name}</h3>
                        <p className={`text-[11px] mt-0.5 truncate ${theme.textSub}`}>{asset.brand || 'Standard Brand'}</p>
                      </div>
                    </div>
                    <button onClick={() => openAssetViewModal(asset)} className={`p-2.5 rounded-xl transition-colors cursor-pointer border ${isDarkMode ? 'bg-[#18181b] border-[#27272a] text-zinc-400 hover:bg-[#27272a] hover:text-white' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}>
                      <QrCode size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md font-bold text-[9px] uppercase tracking-widest border ${getStockStatusBadge(asset.status)}`}>{asset.status || 'In Stock'}</span>
                    <span className={`px-2.5 py-1 rounded-md font-bold text-[9px] uppercase tracking-widest border ${isDarkMode ? 'bg-[#18181b] text-zinc-300 border-[#27272a]' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{asset.asset_condition || 'New'}</span>
                  </div>
                </div>

                <div className={`p-5 space-y-3 flex-1 ${isDarkMode ? 'bg-[#0a0a0a]/50' : 'bg-slate-50/50'}`}>
                  <div className={`flex justify-between items-center p-3 rounded-xl border shadow-sm ${theme.card}`}>
                    <span className={`font-semibold uppercase text-[9px] tracking-widest ${theme.textSub}`}>Tag ID</span> 
                    <span className={`font-mono font-bold text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{asset.clean_tag}</span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-xl border shadow-sm ${theme.card}`}>
                    <span className={`font-semibold uppercase text-[9px] tracking-widest ${theme.textSub}`}>Serial S/N</span> 
                    <span className={`font-mono font-bold text-[11px] truncate max-w-[140px] ${theme.textMain}`} title={asset.serial_number}>{asset.serial_number || 'N/A'}</span>
                  </div>
                  
                  <div className={`flex justify-between items-center p-3 rounded-xl border shadow-sm transition-colors ${theme.card} group-hover:border-blue-500/30`}>
                    <div className="flex flex-col">
                      <span className={`font-semibold uppercase text-[9px] tracking-widest ${theme.textSub}`}>Holder</span> 
                      <span className={`font-bold text-[11px] truncate max-w-[120px] ${theme.textMain}`} title={asset.staff_name}>{asset.staff_name}</span>
                    </div>
                    <span className={`font-mono font-bold px-2 py-1 rounded-lg text-[9px] ${isDarkMode ? 'bg-[#18181b] text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>{asset.emp_code}</span>
                  </div>
                </div>

                <div className={`p-4 border-t flex items-center justify-between ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-slate-100/80 border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className={theme.textSub} />
                    <div className="flex flex-col">
                      <span className={`text-[8px] font-bold uppercase tracking-widest ${theme.textSub}`}>Last Audited</span>
                      <span className={`text-[10px] font-mono font-semibold ${theme.textMain}`}>{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-IN') : 'No Log'}</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${getInspectionStatusColor(asset.live_inspection_status)}`}>
                    {(() => {
                      const st = (asset.live_inspection_status || '').toLowerCase().trim();
                      if (st === 'approved') return <CheckCircle2 size={12} />;
                      if (st === 're-inspection') return <RefreshCw size={12} className="animate-spin" />;
                      return <AlertTriangle size={12} />;
                    })()}
                    <span className="text-[9px] font-bold uppercase tracking-widest">{asset.live_inspection_status || 'Approved'}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* 🚀 VIEW & EDIT MODAL (UPDATED QR LAYOUT) */}
      {viewAssetModal && (() => {
        const liveModalTag = editForm.asset_tag || viewAssetModal.clean_tag;
        
        return (
          <div className={`fixed inset-0 flex items-center justify-center p-4 ${theme.modalOverlay}`}>
            <div className={`rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row border ${theme.modalBody}`}>
              
              {/* Left Column: CLEAN QR Matrix Design */}
              <div className={`w-full md:w-[35%] p-8 flex flex-col items-center border-b md:border-b-0 md:border-r ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-slate-50 border-slate-200'} relative shrink-0`}>
                <button onClick={() => setViewAssetModal(null)} className={`absolute md:hidden top-4 right-4 p-2 rounded-full shadow-sm ${isDarkMode ? 'bg-[#18181b] text-zinc-400' : 'bg-white text-slate-400'}`}><X size={14}/></button>
                
                {/* 1. Header */}
                <h3 className={`text-2xl font-bold tracking-widest uppercase mb-8 mt-4 ${theme.textMain}`}>VSS</h3>
                
                {/* 2. Pure White QR Code Box (Crucial for scanner readability in dark mode) */}
                <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200 mb-8 relative group">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getAssetViewUrl(viewAssetModal))}`} alt="QR Code" className="w-48 h-48 object-contain" />
                </div>

                {/* 3. Asset ID */}
                <div className={`text-2xl font-bold tracking-widest mb-3 ${theme.textMain}`}>
                  {liveModalTag}
                </div>
                
                {/* 4. S/N */}
                <p className={`text-sm font-semibold tracking-wide ${theme.textSub} mb-8 text-center truncate px-2 w-full`} title={editForm.serial || viewAssetModal.serial_number}>
                  S/N: {editForm.serial || viewAssetModal.serial_number}
                </p>

                <div className="flex w-full gap-2 mt-auto">
                  <button onClick={() => handlePrintPhysicalSticker(viewAssetModal, liveModalTag)} className={`flex-1 py-4 rounded-xl text-[11px] font-semibold uppercase tracking-widest flex justify-center items-center gap-2 transition-colors cursor-pointer ${isDarkMode ? 'bg-[#18181b] hover:bg-[#27272a] text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}>
                    <Printer size={16} /> Print Sticker
                  </button>
                </div>
              </div>

              {/* Right Column: Editor Workspace */}
              <div className={`w-full md:w-[65%] flex flex-col overflow-y-auto custom-scrollbar relative ${theme.modalBody}`}>
                <button onClick={() => setViewAssetModal(null)} className={`hidden md:flex absolute top-6 right-6 p-2.5 rounded-full cursor-pointer z-10 transition-colors ${isDarkMode ? 'bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900'}`}><X size={18}/></button>

                <div className="p-8 md:p-10 space-y-8">
                  
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b gap-4 ${isDarkMode ? 'border-[#27272a]' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-semibold uppercase tracking-widest ${theme.textSub}`}>Logistics State:</span>
                      <span className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider border ${getStockStatusBadge(viewAssetModal.status)}`}>{viewAssetModal.status || 'In Stock'}</span>
                    </div>

                    {!isEditingAsset && (
                      <button onClick={() => setIsEditingAsset(true)} className={`px-5 py-2.5 rounded-xl text-xs font-semibold uppercase flex items-center gap-2 cursor-pointer transition-colors sm:ml-auto ${isDarkMode ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'}`}>
                        <Edit2 size={14} /> Edit Record
                      </button>
                    )}
                  </div>

                  {isEditingAsset ? (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      
                      <div className={`flex justify-between items-center pb-3 border-b ${isDarkMode ? 'border-[#27272a]' : 'border-blue-100'}`}>
                        <span className={`text-sm font-semibold uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-blue-900'}`}>Editing Hardware Record</span>
                      </div>

                      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-blue-50/30 border-blue-100'}`}>
                        <div>
                          <label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Asset Category *</label>
                          <select 
                            value={editForm.category} 
                            onChange={e => {
                              const newCat = e.target.value;
                              setEditForm({ ...editForm, category: newCat, asset_tag: generateCategoryPrefix(newCat) });
                            }}
                            className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-colors border ${theme.inputBg}`}
                          >
                            {ASSET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={`text-[10px] font-semibold uppercase flex justify-between mb-1.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                            <span>Asset Tag ID</span>
                            <button type="button" onClick={() => setEditForm({...editForm, asset_tag: generateCategoryPrefix(editForm.category)})} className="text-[9px] lowercase hover:underline cursor-pointer">(auto-generate)</button>
                          </label>
                          <input type="text" value={editForm.asset_tag} onChange={e => setEditForm({...editForm, asset_tag: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none uppercase transition-colors border ${isDarkMode ? 'bg-[#0a0a0a] border-blue-500/50 text-blue-400 focus:border-blue-400' : 'bg-white border-blue-300 text-blue-900 focus:border-blue-500'}`} />
                        </div>
                      </div>

                      <div>
                        <label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Factory Serial Number (S/N) *</label>
                        <input type="text" required value={editForm.serial} onChange={e => setEditForm({...editForm, serial: e.target.value})} placeholder="Scan factory S/N barcode..." className={`w-full p-3.5 rounded-xl text-xs font-mono font-bold outline-none uppercase transition-all border ${theme.inputBg}`} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div><label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Brand</label><input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                        <div><label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Assets Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div><label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Price (₹)</label><input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-mono font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                        <div><label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Purchase Date</label><input type="date" value={editForm.purchase_date} onChange={e => setEditForm({...editForm, purchase_date: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                        <div><label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Warranty Expiry</label><input type="date" value={editForm.warranty_expiry} onChange={e => setEditForm({...editForm, warranty_expiry: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`} /></div>
                      </div>

                      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t ${isDarkMode ? 'border-[#27272a]' : 'border-slate-100'}`}>
                        <div><label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Condition</label><select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`}><option value="New">✨ New</option><option value="Refurbished">🔄 Refurbished</option><option value="Repaired">🛠️ Repaired</option></select></div>
                        <div><label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Stock Status</label><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`}><option value="In Stock (Unassigned)">📦 In Stock</option><option value="Assigned">👤 Assigned</option><option value="Demo Use">🧪 Demo</option><option value="In Repair">⚠️ Repair</option><option value="Discard">🗑️ Discard</option></select></div>
                        <div>
                          <label className={`text-[10px] font-semibold uppercase block mb-1.5 ${theme.textSub}`}>Inspection State</label>
                          <select value={editForm.inspection_status} onChange={e => setEditForm({...editForm, inspection_status: e.target.value})} className={`w-full p-3.5 rounded-xl text-xs font-semibold outline-none transition-all border ${theme.inputBg}`}>
                            <option value="Approved">✅ Approved</option><option value="Re-Inspection">🔄 Re-Inspection</option><option value="Not Approved">⚠️ Not Approved</option><option value="Rejected">❌ Rejected</option>
                          </select>
                        </div>
                      </div>

                      <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-slate-50 border-slate-200'}`}>
                        <label className={`text-[10px] font-semibold uppercase block mb-2 ${theme.textSub}`}>Re-Assign Holder</label>
                        <SearchableStaffDropdown value={editForm.assignee} onChange={(val: string) => setEditForm({...editForm, assignee: val})} staffList={staffList} isDarkMode={isDarkMode} />
                      </div>

                      <div className="flex gap-4 pt-6">
                        <button type="button" onClick={() => setIsEditingAsset(false)} className={`px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors border ${isDarkMode ? 'bg-[#121212] border-[#27272a] text-zinc-300 hover:bg-[#18181b]' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>Cancel</button>
                        <button type="button" onClick={handleUpdateExistingAsset} disabled={isUpdating} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-all">
                          {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save Secure Record
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-2xl border ${theme.modalHeader}`}><p className={`text-[9px] font-semibold uppercase tracking-widest ${theme.textSub}`}>Category</p><p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{viewAssetModal.category || 'Laptop'}</p></div>
                        <div className={`p-4 rounded-2xl border sm:col-span-2 ${theme.modalHeader}`}><p className={`text-[9px] font-semibold uppercase tracking-widest ${theme.textSub}`}>Serial Number (S/N)</p><p className={`text-sm font-mono font-semibold mt-1 ${theme.textMain}`}>{viewAssetModal.serial_number || 'N/A'}</p></div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-2xl border ${theme.modalHeader}`}><p className={`text-[9px] font-semibold uppercase tracking-widest ${theme.textSub}`}>Brand</p><p className={`text-sm font-semibold mt-1 ${theme.textMain}`}>{viewAssetModal.brand || 'N/A'}</p></div>
                        <div className={`p-4 rounded-2xl border sm:col-span-2 ${theme.modalHeader}`}><p className={`text-[9px] font-semibold uppercase tracking-widest ${theme.textSub}`}>Assets Name</p><p className={`text-sm font-semibold mt-1 ${theme.textMain}`}>{viewAssetModal.safe_display_name}</p></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-purple-500/5 border-purple-500/10' : 'bg-purple-50/40 border-purple-100/60'}`}><p className={`text-[9px] font-semibold uppercase tracking-widest ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Purchase Date</p><p className={`text-xs font-semibold mt-1.5 ${theme.textMain}`}>{viewAssetModal.purchase_date ? new Date(viewAssetModal.purchase_date).toLocaleDateString('en-IN') : 'Not Recorded'}</p></div>
                        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-purple-500/5 border-purple-500/10' : 'bg-purple-50/40 border-purple-100/60'}`}><p className={`text-[9px] font-semibold uppercase tracking-widest ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Warranty Date</p><p className={`text-xs font-semibold mt-1.5 ${theme.textMain}`}>{viewAssetModal.warranty_expiry ? new Date(viewAssetModal.warranty_expiry).toLocaleDateString('en-IN') : 'No Warranty'}</p></div>
                        <div className={`p-4 rounded-2xl border flex flex-col justify-center ${isDarkMode ? 'bg-purple-500/5 border-purple-500/10' : 'bg-purple-50/40 border-purple-100/60'}`}>
                          <p className={`text-[9px] font-semibold uppercase tracking-widest ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Inspection Status</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${getInspectionStatusColor(viewAssetModal.live_inspection_status)}`}>
                              {viewAssetModal.live_inspection_status || 'Approved'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#18181b] border-blue-500/30' : 'bg-blue-50/50 border-blue-100'}`}>
                        <div>
                          <span className={`text-[10px] font-semibold uppercase tracking-widest block mb-1.5 ${theme.textSub}`}>Assigned Employee Holder:</span>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.iconBgBlue}`}><User size={16}/></div>
                            <span className={`text-base font-semibold ${theme.textMain}`}>{viewAssetModal.staff_name}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className={`text-[9px] font-semibold uppercase tracking-widest mb-1 ${theme.textSub}`}>EMP CODE</span>
                           <span className={`text-sm font-mono font-bold px-3 py-1 rounded-lg border shadow-sm ${isDarkMode ? 'bg-[#0a0a0a] border-blue-500/30 text-blue-400' : 'bg-white border-blue-100 text-blue-800'}`}>{viewAssetModal.emp_code}</span>
                        </div>
                      </div>

                      {/* 🌟 NEW: ALWAYS SHOW AGREEMENT IF ASSIGNED TO SOMEONE */}
                      {viewAssetModal.staff_name !== 'Unassigned' && (
                        <div className={`p-5 rounded-2xl border mt-5 flex items-center justify-between ${
                          viewAssetModal.status === 'Pending Handover' || viewAssetModal.live_inspection_status === 'Pending'
                            ? isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                            : isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                        }`}>
                          <div>
                            <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
                              viewAssetModal.status === 'Pending Handover' || viewAssetModal.live_inspection_status === 'Pending'
                                ? isDarkMode ? 'text-amber-400' : 'text-amber-700'
                                : isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                            }`}>
                              <FileSignature size={14} /> 
                              {viewAssetModal.status === 'Pending Handover' || viewAssetModal.live_inspection_status === 'Pending' ? 'Agreement Pending' : 'Signed Agreement'}
                            </h4>
                            <p className={`text-[11px] mt-1 ${isDarkMode ? 'opacity-70 text-amber-200' : 'opacity-80 text-emerald-800'}`}>
                              {viewAssetModal.status === 'Pending Handover' || viewAssetModal.live_inspection_status === 'Pending'
                                ? 'Awaiting staff electronic signature.'
                                : `Staff accepted terms on ${viewAssetModal.live_inspection_date ? new Date(viewAssetModal.live_inspection_date).toLocaleDateString() : 'Record Logged'}`
                              }
                            </p>
                          </div>
                          <button onClick={() => handlePrintAgreement(viewAssetModal)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 cursor-pointer ${
                            viewAssetModal.status === 'Pending Handover' || viewAssetModal.live_inspection_status === 'Pending'
                              ? isDarkMode ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100'
                              : isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}>
                            <Download size={14} /> {viewAssetModal.status === 'Pending Handover' || viewAssetModal.live_inspection_status === 'Pending' ? 'Draft PDF' : 'Signed PDF'}
                          </button>
                        </div>
                      )}

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