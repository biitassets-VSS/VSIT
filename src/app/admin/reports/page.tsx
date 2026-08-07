'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { 
  FileText, Download, Search, 
  Box, UserCheck, BarChart3,
  Laptop, Keyboard, MousePointer, Headphones, ShieldAlert, X, ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Asset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: 'In Use' | 'Available' | 'Pending Return' | 'Discarded';
  assignedToName?: string;
  brand?: string;
}

type ReportGroup = 'CATEGORY_SUMMARY' | 'LAPTOPS' | 'WIRELESS_KEYBOARDS' | 'COMBO_KITS' | 'WIRED_KEYBOARDS' | 'WIRED_MICE' | 'HEADPHONES' | 'RETIRED_DISCARD';

const normalizeCategory = (cat: string, name: string) => {
  const c = (cat || '').toLowerCase(); const n = (name || '').toLowerCase();
  if (c.includes('laptop') || n.includes('laptop')) return 'Laptop';
  if (c.includes('headphone') || n.includes('headphone') || c.includes('headset') || n.includes('earphone')) return 'Headphone';
  if (c.includes('combo') || n.includes('ckm') || (n.includes('keyboard') && n.includes('mouse'))) return 'Combo Kit (Keyboard + Mouse)';
  if (c.includes('wireless') && (c.includes('keyboard') || n.includes('keyboard'))) return 'Wireless Keyboard';
  if (c.includes('keyboard') || n.includes('keyboard')) return 'USB Wired Keyboard';
  if (c.includes('mouse') || n.includes('mouse')) return 'USB Wired Mouse';
  if (c.includes('monitor') || n.includes('monitor') || n.includes('display')) return 'Monitor';
  if (!cat) return 'Other / Uncategorized';
  return cat.trim().charAt(0).toUpperCase() + cat.trim().slice(1).toLowerCase();
};

const normalizeStatus = (status: string): Asset['status'] => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'discarded' || s.includes('discard') || s.includes('scrap') || s.includes('retire')) return 'Discarded';
  if (s.includes('pending return') || s.includes('return requested')) return 'Pending Return';
  if (s.includes('in stock') || s.includes('unassigned') || s === 'available') return 'Available';
  if (s === 'in use' || s.includes('assign') || s.includes('deployed') || s.includes('pending handover')) return 'In Use';
  return 'Available'; 
};

const extractBrand = (dbBrand: string | undefined, name: string) => {
  const textToSearch = `${dbBrand || ''} ${name || ''}`.toUpperCase();
  if (/(ASUS|TUF|ROG|ZENBOOK|VIVOBOOK|EXPERTBOOK)/.test(textToSearch)) return 'ASUS';
  if (/(DELL|LATITUDE|INSPIRON|OPTIPLEX|VOSTRO|XPS|ALIENWARE|PRECISION)/.test(textToSearch)) return 'DELL';
  if (/(LENOVO|THINKPAD|IDEAPAD|YOGA|THINKBOOK|LEGION|THINKCENTRE)/.test(textToSearch)) return 'LENOVO';
  if (/(HP|HEWLETT|PROBOOK|ELITEBOOK|PAVILION|ZBOOK|SPECTRE|ENVY|OMEN)/.test(textToSearch)) return 'HP';
  if (/(APPLE|MACBOOK|IMAC|MAC MINI|MAC STUDIO|IPAD)/.test(textToSearch)) return 'APPLE';
  if (/(ACER|PREDATOR|NITRO|SWIFT|ASPIRE|SPIN)/.test(textToSearch)) return 'ACER';
  if (/(MICROSOFT|SURFACE)/.test(textToSearch)) return 'MICROSOFT';
  if (/(LOGITECH|LOGI)/.test(textToSearch)) return 'LOGITECH';
  if (/(ZEBRONICS|ZEB-)/.test(textToSearch)) return 'ZEBRONICS';
  if (/(SAMSUNG)/.test(textToSearch)) return 'SAMSUNG';
  if (/(LG)/.test(textToSearch)) return 'LG';
  if (dbBrand && dbBrand.trim().length > 1) return dbBrand.trim().toUpperCase();
  return 'Other';
};

function AdminReportsContent() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeReport, setActiveReport] = useState<ReportGroup>('CATEGORY_SUMMARY');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 🌟 REAL-TIME GLOBAL THEME LISTENER
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

    return () => {
      window.removeEventListener('storage', checkTheme);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchAssets = async () => {
      const [{ data: profilesData }, { data: assetsData, error }] = await Promise.all([
        supabase.from('profiles').select('id, name, full_name, emp_code, email'),
        supabase.from('assets').select('*')
      ]);

      if (!error && assetsData) {
        const mapped: Asset[] = assetsData.map((a) => {
          let assignedName = a.assigned_to || 'Not Assigned';
          if (profilesData && a.assigned_to) {
            const profile = profilesData.find(p => p.id === a.assigned_to);
            if (profile) assignedName = `${profile.full_name || profile.name} (${profile.emp_code || profile.email})`;
          }
          return {
            id: a.id, tagId: a.asset_tag || a.tag_id || 'NO-TAG',
            name: a.name || 'Unnamed Asset', category: normalizeCategory(a.category, a.name),
            status: normalizeStatus(a.status), assignedToName: assignedName, brand: extractBrand(a.brand, a.name)
          };
        });
        setAssets(mapped);
      }
      setIsLoaded(true);
    };
    fetchAssets();
  }, []);

  const matchesReportGroup = (asset: Asset, group: ReportGroup): boolean => {
    const cat = asset.category; const status = asset.status;
    switch (group) {
      case 'LAPTOPS': return cat === 'Laptop';
      case 'WIRELESS_KEYBOARDS': return cat === 'Wireless Keyboard';
      case 'COMBO_KITS': return cat === 'Combo Kit (Keyboard + Mouse)';
      case 'WIRED_KEYBOARDS': return cat === 'USB Wired Keyboard';
      case 'WIRED_MICE': return cat === 'USB Wired Mouse';
      case 'HEADPHONES': return cat === 'Headphone';
      case 'RETIRED_DISCARD': return status === 'Discarded';
      default: return true;
    }
  };

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (activeReport !== 'CATEGORY_SUMMARY') result = result.filter(a => matchesReportGroup(a, activeReport));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q) || a.tagId.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || (a.brand && a.brand.toLowerCase().includes(q)));
    }
    return result;
  }, [activeReport, searchQuery, assets]);

  const brandSummary = useMemo(() => {
    const targetAssets = activeReport === 'CATEGORY_SUMMARY' ? assets : assets.filter(a => matchesReportGroup(a, activeReport));
    const brands = Array.from(new Set(targetAssets.map(a => a.brand || 'Other')));
    return brands.map(brand => {
      const bAssets = targetAssets.filter(a => a.brand === brand);
      return {
        brand: brand, total: bAssets.length, inUse: bAssets.filter(a => a.status === 'In Use').length,
        available: bAssets.filter(a => a.status === 'Available').length, pendingReturn: bAssets.filter(a => a.status === 'Pending Return').length,
        discarded: bAssets.filter(a => a.status === 'Discarded').length,
      };
    }).sort((a, b) => b.total - a.total); 
  }, [activeReport, assets]);

  const categorySummary = useMemo(() => {
    const categories = Array.from(new Set(assets.map(a => a.category)));
    return categories.map(cat => {
      const catAssets = assets.filter(a => a.category === cat);
      return {
        category: cat, total: catAssets.length, inUse: catAssets.filter(a => a.status === 'In Use').length,
        available: catAssets.filter(a => a.status === 'Available').length, pendingReturn: catAssets.filter(a => a.status === 'Pending Return').length,
        discarded: catAssets.filter(a => a.status === 'Discarded').length,
      };
    }).sort((a, b) => b.total - a.total);
  }, [assets]);

  const getGroupTitle = (group: ReportGroup) => {
    return group.replace('CATEGORY_SUMMARY', 'Category Global Summary').replace('LAPTOPS', 'Laptops Inventory (Brand-Wise)').replace('WIRELESS_KEYBOARDS', 'Wireless Keyboards Inventory').replace('COMBO_KITS', 'Combo Kits (Keyboard + Mouse)').replace('WIRED_KEYBOARDS', 'USB Wired Keyboards Inventory').replace('WIRED_MICE', 'USB Wired Mice Inventory').replace('HEADPHONES', 'Headphones & Audio Gear').replace('RETIRED_DISCARD', 'Discarded Asset Ledger');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    const formattedTitle = getGroupTitle(activeReport);
    doc.text(`VSIT Asset Management Report`, 14, 18);
    doc.setFontSize(12);
    doc.text(`Report Target: ${formattedTitle}`, 14, 25);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 31);
    
    let columns: string[] = []; let rows: string[][] = [];

    if (activeReport === 'CATEGORY_SUMMARY') {
      columns = ["Category Profile Name", "Total Inventory", "In Use", "Available", "Pending Return", "Discarded"];
      rows = categorySummary.map(c => [c.category, c.total.toString(), c.inUse.toString(), c.available.toString(), c.pendingReturn.toString(), c.discarded.toString()]);
    } else {
      doc.setFontSize(14);
      doc.text("Brand-Wise Matrix Configuration Summary", 14, 43);
      autoTable(doc, {
        head: [["Brand Profile", "Total Count", "In Use", "Available", "Pending Return", "Discarded"]],
        body: brandSummary.map(b => [b.brand, b.total.toString(), b.inUse.toString(), b.available.toString(), b.pendingReturn.toString(), b.discarded.toString()]),
        startY: 48, headStyles: { fillColor: [249, 115, 22] }, // Orange branding for PDF
      });
      const nextY = (doc as any).lastAutoTable.finalY + 12;
      doc.text("Individual Serialized Register Tracking Logs", 14, nextY);
      columns = ["Asset Name", "Tag ID", "Brand", "Status Mapping", "Assigned Holder Details"];
      rows = filteredAssets.map(a => [a.name, a.tagId, a.brand || 'Other', a.status, a.status === 'In Use' ? (a.assignedToName || 'N/A') : 'N/A']);
      autoTable(doc, { head: [columns], body: rows, startY: nextY + 5, headStyles: { fillColor: [147, 51, 234] } }); // Purple branding for PDF
      doc.save(`VSIT_${activeReport}_Report_${new Date().toISOString().slice(0,10)}.pdf`);
      return;
    }
    autoTable(doc, { head: [columns], body: rows, startY: 38, headStyles: { fillColor: [249, 115, 22] } });
    doc.save(`VSIT_Global_Summary_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // 🎨 PURE MAC OS 2026 FROSTED GLASS THEME
  const theme = {
    bg: 'bg-transparent',
    glassCard: isDarkMode 
      ? 'bg-[#18181b]/40 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/30 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(31,38,135,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',
    glassItem: isDarkMode
      ? 'bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300'
      : 'bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-300',
    glassInner: isDarkMode
      ? 'bg-black/40 backdrop-blur-md border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]'
      : 'bg-white/50 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]',
    inputBg: isDarkMode 
      ? 'bg-black/50 border border-white/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20' 
      : 'bg-white/50 border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    tableHead: isDarkMode ? 'bg-black/40 text-purple-300 border-white/10' : 'bg-white/40 text-slate-500 border-white/60',
    tableRowHover: isDarkMode ? 'hover:bg-purple-500/10' : 'hover:bg-purple-500/10',
    divider: isDarkMode ? 'border-white/10' : 'border-white/40',
  };

  if (!isLoaded) return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-200 dark:border-purple-900 border-t-orange-600 dark:border-t-orange-500"></div>
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-purple-300">Syncing Real-time Asset Logs...</span>
    </div>
  );

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-12 overflow-x-hidden relative`}>
      {/* 🌟 GLOBAL BACKGROUND ORBS */}
      <div className="fixed top-[-10%] left-[0%] w-[50vw] h-[50vh] bg-orange-500/20 dark:bg-orange-600/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-10%] right-[0%] w-[50vw] h-[50vh] bg-purple-600/20 dark:bg-purple-700/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      {/* 🌟 FULL-SCREEN ENTERPRISE FLUID CONTAINER */}
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 mx-auto space-y-4 sm:space-y-6 pt-4 relative z-10">
        
        {/* 🌟 ASSET DETAILS MODAL (100% ADAPTIVE & MOBILE RESPONSIVE) */}
        {selectedAsset && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xl z-9999 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={`rounded-4xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border-2 ${isDarkMode ? 'border-orange-500/30' : 'border-white/80'} ${theme.glassCard}`}>
              <div className={`p-5 sm:p-6 border-b flex items-center justify-between ${theme.divider}`}>
                <h3 className={`font-black text-base sm:text-lg flex items-center gap-2 ${theme.textMain}`}>
                  <Laptop className="text-orange-500 dark:text-orange-400 w-5 h-5 shrink-0"/> Asset Details
                </h3>
                <button onClick={() => setSelectedAsset(null)} className={`p-2 rounded-full transition-all hover:scale-110 cursor-pointer ${theme.glassInner} ${theme.textMain}`}>
                  <X size={16}/>
                </button>
              </div>
              
              <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${theme.textSub}`}>Hardware Specifications</span>
                  <p className={`font-black text-base sm:text-lg leading-tight mt-0.5 ${theme.textMain}`}>{selectedAsset.name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className={`p-3 rounded-2xl ${theme.glassInner}`}>
                    <span className={`text-[10px] uppercase tracking-widest font-bold block mb-1 ${theme.textSub}`}>Tag ID</span>
                    <p className="font-mono text-xs sm:text-sm font-bold text-orange-500 dark:text-orange-400">{selectedAsset.tagId}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${theme.glassInner}`}>
                    <span className={`text-[10px] uppercase tracking-widest font-bold block mb-1 ${theme.textSub}`}>Detected Brand</span>
                    <p className={`font-bold text-xs sm:text-sm ${theme.textMain}`}>{selectedAsset.brand}</p>
                  </div>
                </div>

                <div className={`pt-4 border-t space-y-3.5 ${theme.divider}`}>
                  <div>
                    <span className={`text-[10px] uppercase tracking-widest font-bold block mb-1 ${theme.textSub}`}>Current Real Status</span>
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black tracking-wide uppercase border shadow-sm ${
                      selectedAsset.status === 'Available' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60') :
                      selectedAsset.status === 'In Use' ? (isDarkMode ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200/60') :
                      selectedAsset.status === 'Pending Return' ? (isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200/60') :
                      (isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200/60')
                    }`}>
                      {selectedAsset.status}
                    </span>
                  </div>
                  
                  <div className={`p-4 rounded-2xl ${theme.glassInner} border ${isDarkMode ? 'border-orange-500/30' : 'border-orange-200'}`}>
                    <span className="text-[10px] uppercase tracking-widest font-black text-orange-500 dark:text-orange-400 mb-1 flex items-center gap-1.5"><UserCheck size={12}/> Assignment Information</span>
                    <p className={`font-bold text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-orange-200' : 'text-orange-900'}`}>
                      {selectedAsset.status === 'In Use' ? selectedAsset.assignedToName : 'Not currently assigned out.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 STANDARDIZED HEADER WITH MOBILE BUTTON GRID */}
        <div className={`${theme.glassCard} p-4 sm:p-6 rounded-4xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300`}>
          <div>
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5 ${theme.textMain}`}>
              <FileText className="text-orange-500 dark:text-orange-400 w-6 h-6 sm:w-7 sm:h-7 shrink-0" /> 
              <span>VSIT Advanced Metrics Engine</span>
            </h1>
            <p className={`text-xs sm:text-sm font-semibold mt-1.5 ${theme.textSub}`}>Extract high-fidelity brand profiles, deployment summaries, and configurations records matrix logs</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-end">
            <Link 
              href="/admin" 
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 shrink-0 uppercase tracking-wider cursor-pointer ${theme.glassItem} ${theme.textMain} hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`}
            >
              <ArrowLeft size={16} /> <span>Dashboard</span>
            </Link>
            <button 
              onClick={handleExportPDF} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-linear-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white px-5 py-2.5 sm:py-3 rounded-xl shadow-[0_4px_15px_rgba(168,85,247,0.3)] transition-all active:scale-95 font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer border border-purple-400"
            >
              <Download size={16} /> <span>Compile PDF</span>
            </button>
          </div>
        </div>

        {/* 🌟 LAYOUT GRID: HORIZONTAL TOUCH SCROLL FILTER ON MOBILE / SIDEBAR ON DESKTOP */}
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
          
          {/* Mobile Horizontal Filter Bar / Desktop Sidebar */}
          <div className={`w-full lg:w-72 shrink-0 p-3 sm:p-4 rounded-3xl transition-all ${theme.glassCard}`}>
            <h3 className={`hidden lg:block text-[10px] font-black uppercase tracking-widest mb-3 px-2 ${theme.textSub}`}>Global Summary Matrix</h3>
            
            {/* Scrollable Container on Mobile */}
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 lg:gap-1 pb-2 lg:pb-0 custom-scrollbar shrink-0">
              <button 
                onClick={() => setActiveReport('CATEGORY_SUMMARY')}
                className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
                  activeReport === 'CATEGORY_SUMMARY' 
                    ? 'bg-orange-500 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] scale-[1.02] border-orange-500' 
                    : `${theme.glassItem} ${theme.textSub} hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`
                }`}
              >
                <BarChart3 size={15}/> <span>Global Summary Overview</span>
              </button>

              <div className={`hidden lg:block h-px my-2 ${theme.divider}`} />
              <h3 className={`hidden lg:block text-[10px] font-black uppercase tracking-widest mb-2 px-2 ${theme.textSub}`}>Hardware Device Registers</h3>
              
              {[
                { id: 'LAPTOPS', label: 'Laptops Registers', icon: <Laptop size={15}/> },
                { id: 'WIRELESS_KEYBOARDS', label: 'Wireless Keyboards', icon: <Keyboard size={15}/> },
                { id: 'COMBO_KITS', label: 'Combo Desktop Kits', icon: <Box size={15}/> },
                { id: 'WIRED_KEYBOARDS', label: 'USB Wired Keyboards', icon: <Keyboard size={15}/> },
                { id: 'WIRED_MICE', label: 'USB Wired Mice', icon: <MousePointer size={15}/> },
                { id: 'HEADPHONES', label: 'Headphones & Audio', icon: <Headphones size={15}/> },
                { id: 'RETIRED_DISCARD', label: 'Discarded Asset Ledger', icon: <ShieldAlert size={15}/> },
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveReport(tab.id as ReportGroup)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
                    activeReport === tab.id 
                      ? 'bg-purple-600 text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] scale-[1.02] border-purple-600' 
                      : `${theme.glassItem} ${theme.textSub} hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] dark:hover:border-purple-400`
                  }`}
                >
                  {tab.icon} <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 🌟 CORE METRICS PROCESSING PANEL */}
          <div className="flex-1 w-full space-y-4 sm:space-y-5">
            
            {/* Search Input Box */}
            <div className={`p-2.5 rounded-2xl transition-all shadow-sm flex items-center focus-within:ring-4 focus-within:ring-orange-500/20 ${theme.inputBg}`}>
              <div className="relative w-full max-w-md">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} size={16} />
                <input 
                  type="text" 
                  placeholder={`Search inside ${activeReport.replace('_',' ')}...`} 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-11 pr-4 py-2 rounded-xl border-transparent bg-transparent outline-none text-xs font-semibold transition-all ${theme.textMain} placeholder:text-slate-400 dark:placeholder:text-zinc-500`} 
                />
              </div>
            </div>

            {/* Responsive Metrics Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${theme.glassCard} hover:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 cursor-default`}>
                <p className={`text-[10px] font-black tracking-wider uppercase ${theme.textSub}`}>Total Count</p>
                <h3 className={`text-lg sm:text-xl font-black mt-1 ${theme.textMain}`}>{filteredAssets.length}</h3>
              </div>
              <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${theme.glassCard} hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] dark:hover:border-purple-500 cursor-default`}>
                <p className={`text-[10px] font-black tracking-wider uppercase ${theme.textSub}`}>In Use</p>
                <h3 className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{filteredAssets.filter(a => a.status === 'In Use').length}</h3>
              </div>
              <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${theme.glassCard} hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] dark:hover:border-emerald-500 cursor-default`}>
                <p className={`text-[10px] font-black tracking-wider uppercase ${theme.textSub}`}>Available</p>
                <h3 className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{filteredAssets.filter(a => a.status === 'Available').length}</h3>
              </div>
              <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${theme.glassCard} hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] dark:hover:border-amber-500 cursor-default`}>
                <p className={`text-[10px] font-black tracking-wider uppercase ${theme.textSub}`}>Pending Return</p>
                <h3 className="text-lg sm:text-xl font-black text-amber-500 dark:text-amber-400 mt-1">{filteredAssets.filter(a => a.status === 'Pending Return').length}</h3>
              </div>
              <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all col-span-2 sm:col-span-1 ${theme.glassCard} hover:border-rose-400 hover:shadow-[0_0_20px_rgba(243,64,84,0.4)] dark:hover:border-rose-500 cursor-default`}>
                <p className={`text-[10px] font-black tracking-wider uppercase ${theme.textSub}`}>Discarded</p>
                <h3 className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{filteredAssets.filter(a => a.status === 'Discarded').length}</h3>
              </div>
            </div>

            {/* Main Report Data Table */}
            <div className={`rounded-3xl border overflow-hidden transition-all ${theme.glassCard}`}>
              <div className={`p-4 sm:p-5 border-b ${theme.divider}`}>
                <h3 className={`text-xs font-black uppercase tracking-widest ${theme.textMain}`}>{getGroupTitle(activeReport)}</h3>
              </div>
              
              {activeReport === 'CATEGORY_SUMMARY' ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-150">
                    <thead className={`uppercase text-[10px] font-black tracking-widest border-b ${theme.tableHead}`}>
                      <tr>
                        <th className="p-3.5 sm:p-4">Category System Profile</th>
                        <th className="p-3.5 sm:p-4">Total Inventory</th>
                        <th className="p-3.5 sm:p-4">In Use</th>
                        <th className="p-3.5 sm:p-4">Available</th>
                        <th className="p-3.5 sm:p-4">Pending Return</th>
                        <th className="p-3.5 sm:p-4">Discarded</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs font-bold ${theme.divider}`}>
                      {categorySummary.map((cat, i) => (
                        <tr key={i} className={`transition-colors ${theme.tableRowHover}`}>
                          <td className={`p-3.5 sm:p-4 ${theme.textMain}`}>{cat.category}</td>
                          <td className={`p-3.5 sm:p-4 ${theme.textSub}`}>{cat.total}</td>
                          <td className="p-3.5 sm:p-4 text-purple-600 dark:text-purple-400">{cat.inUse}</td>
                          <td className="p-3.5 sm:p-4 text-emerald-600 dark:text-emerald-400">{cat.available}</td>
                          <td className="p-3.5 sm:p-4 text-amber-500 dark:text-amber-400">{cat.pendingReturn}</td>
                          <td className="p-3.5 sm:p-4 text-rose-500 dark:text-rose-400">{cat.discarded}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  <div className={`p-3.5 sm:p-4 rounded-2xl border mx-3 sm:mx-5 mt-4 ${theme.glassInner}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-wider mb-2 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>Dynamic Brand Configuration Summary Matrix</h4>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-125">
                        <thead className={`text-[9px] uppercase font-black tracking-wider border-b ${theme.textSub} ${theme.divider}`}>
                          <tr>
                            <th className="pb-2">Brand Profile</th>
                            <th className="pb-2">Total Pack</th>
                            <th className="pb-2">In Use</th>
                            <th className="pb-2">Available</th>
                            <th className="pb-2">Pending Return</th>
                            <th className="pb-2">Discarded</th>
                          </tr>
                        </thead>
                        <tbody className={`text-xs font-bold divide-y ${theme.divider}`}>
                          {brandSummary.map((b, idx) => (
                            <tr key={idx} className={`transition-colors ${theme.tableRowHover}`}>
                              <td className={`py-2.5 font-black ${theme.textMain}`}>{b.brand}</td>
                              <td className={`py-2.5 ${theme.textSub}`}>{b.total}</td>
                              <td className="py-2.5 text-purple-600 dark:text-purple-400">{b.inUse}</td>
                              <td className="py-2.5 text-emerald-600 dark:text-emerald-400">{b.available}</td>
                              <td className="py-2.5 text-amber-500 dark:text-amber-400">{b.pendingReturn}</td>
                              <td className="py-2.5 text-rose-500 dark:text-rose-400">{b.discarded}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-150">
                      <thead className={`uppercase text-[10px] font-black tracking-widest border-y ${theme.tableHead}`}>
                        <tr>
                          <th className="p-3.5 sm:p-4">Asset Identification Name</th>
                          <th className="p-3.5 sm:p-4">Brand Profile</th>
                          <th className="p-3.5 sm:p-4">Current Verified Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y text-xs font-bold ${theme.divider}`}>
                        {filteredAssets.length === 0 ? (
                          <tr>
                            <td colSpan={3} className={`p-8 text-center font-medium ${theme.textSub}`}>No serialized assets matched the selected matrix criteria.</td>
                          </tr>
                        ) : (
                          filteredAssets.map((a) => (
                            <tr key={a.id} className={`transition-colors ${theme.tableRowHover}`}>
                              <td className="p-3.5 sm:p-4">
                                <button 
                                  onClick={() => setSelectedAsset(a)}
                                  className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 text-left group flex flex-col cursor-pointer transition-colors"
                                >
                                  <span className="font-extrabold text-xs sm:text-sm group-hover:underline">{a.name}</span>
                                  <span className={`text-[10px] font-mono tracking-wider mt-0.5 no-underline ${theme.textSub}`}>Tag: {a.tagId}</span>
                                </button>
                              </td>
                              <td className={`p-3.5 sm:p-4 font-black uppercase tracking-wide ${theme.textMain}`}>{a.brand}</td>
                              <td className="p-3.5 sm:p-4">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide uppercase border ${
                                  a.status === 'Available' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60') :
                                  a.status === 'In Use' ? (isDarkMode ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200/60') :
                                  a.status === 'Pending Return' ? (isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200/60') :
                                  (isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200/60')
                                }`}>
                                  {a.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-3 text-slate-400 transition-colors">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-200 dark:border-purple-900 border-t-orange-600 dark:border-t-orange-500"></div>
        <span className="text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-purple-300">Loading Metrics Engine...</span>
      </div>
    }>
      <AdminReportsContent />
    </Suspense>
  );
}