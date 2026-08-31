'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, LogOut, CheckCircle2, XCircle, Clock, 
  Laptop, User, Search, RefreshCw, X, ShieldAlert,
  AlertTriangle, FilterX, ExternalLink, Send, Image as ImageIcon, Loader2, Archive, ChevronLeft, ChevronRight, ZoomIn
} from 'lucide-react';

const formatEmailAsName = (email: string) => {
  if (!email) return null;
  return email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

function AdminReturnsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    action: 'Approved' | 'Declined' | null;
    assetId: string;
    staffId: string;
    item: any;
  }>({ isOpen: false, action: null, assetId: '', staffId: '', item: null });
  
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // 🌟 GLASS GALLERY STATE
  const [gallery, setGallery] = useState({ isOpen: false, images: [] as string[], index: 0, scale: 1 });

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    const fetchAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentAdmin(profile || { name: user.email });
      }
    };
    
    fetchAdmin();
    fetchReturns();
    return () => observer.disconnect();
  }, []);

  // Keyboard navigation for Gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gallery.isOpen) return;
      if (e.key === 'Escape') setGallery(g => ({ ...g, isOpen: false, scale: 1 }));
      if (e.key === 'ArrowRight' && gallery.index < gallery.images.length - 1) setGallery(g => ({ ...g, index: g.index + 1, scale: 1 }));
      if (e.key === 'ArrowLeft' && gallery.index > 0) setGallery(g => ({ ...g, index: g.index - 1, scale: 1 }));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gallery]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      // 1. Fetch inspections with return keywords in status or notes
      const { data: inspLogs, error: inspErr } = await supabase
        .from('inspections')
        .select('*, assets(*)')
        .or('status.ilike.%return%,notes.ilike.%return%,notes.ilike.%returned%')
        .order('created_at', { ascending: false });

      if (inspErr) console.warn("Inspection query warning:", inspErr);

      // 2. Fetch assets that have return keywords in status or notes
      const { data: assetLogs, error: assetErr } = await supabase
        .from('assets')
        .select('*')
        .or('status.ilike.%return%,notes.ilike.%return%,notes.ilike.%returned%');

      if (assetErr) console.warn("Asset query warning:", assetErr);

      const returnAssets = assetLogs || [];
      const assetIdsFromAssets = returnAssets.map(a => a.id).filter(Boolean);

      // 3. Fetch ALL inspections for any identified return assets
      let assetInspections: any[] = [];
      if (assetIdsFromAssets.length > 0) {
        const { data: extraInsp } = await supabase
          .from('inspections')
          .select('*, assets(*)')
          .in('asset_id', assetIdsFromAssets)
          .order('created_at', { ascending: false });
        assetInspections = extraInsp || [];
      }

      // Combine and deduplicate
      const combinedInspections = [...(inspLogs || []), ...assetInspections];
      const inspectionMap = new Map();
      combinedInspections.forEach(item => {
        if (item && item.id) {
          inspectionMap.set(item.id, item);
        }
      });

      const validReturns = Array.from(inspectionMap.values());

      // 4. Create synthetic records ONLY for truly orphaned assets
      const orphanAssets = returnAssets.filter(asset => !validReturns.some(r => r.asset_id === asset.id));

      const syntheticReturns = orphanAssets.map(asset => ({
        id: `synthetic-${asset.id}`,
        asset_id: asset.id,
        user_id: asset.assigned_to,
        status: (asset.status || '').toLowerCase().includes('return') ? asset.status : 'Return Approved',
        notes: asset.notes || 'Return record derived from asset history.',
        created_at: asset.updated_at || asset.created_at || new Date().toISOString(),
        assets: asset,
        isSynthetic: true
      }));

      const allReturns = [...validReturns, ...syntheticReturns];

      if (allReturns.length === 0) {
        setReturnRequests([]);
        return;
      }

      // Fetch profile data for all users involved
      const assetIds = [...new Set(allReturns.map(r => r.asset_id).filter(Boolean))];
      const { data: allAssetInspections } = await supabase
        .from('inspections')
        .select('*')
        .in('asset_id', assetIds)
        .order('created_at', { ascending: false });

      const rawIdentifiers = [
        ...allReturns.map(r => r.user_id),
        ...allReturns.map(r => r.inspected_by),
        ...allReturns.map(r => r.assets?.assigned_to)
      ].filter(Boolean);
      
      const userEmails = [
        ...allReturns.map(r => r.user_email),
        ...rawIdentifiers.filter(id => String(id).includes('@'))
      ].filter(Boolean);

      const validUUIDs = rawIdentifiers.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id)));
      const empCodes = rawIdentifiers.filter(id => String(id).toUpperCase().startsWith('EMP'));

      const safeQuery = async (queryPromise: any) => {
        try {
          const { data, error } = await queryPromise;
          return { data: error ? [] : (data || []) };
        } catch (e) { return { data: [] }; }
      };

      const profilePromises = [];
      if (validUUIDs.length > 0) profilePromises.push(safeQuery(supabase.from('profiles').select('*').in('id', validUUIDs)));
      if (userEmails.length > 0) profilePromises.push(safeQuery(supabase.from('profiles').select('*').in('email', userEmails)));
      if (empCodes.length > 0) {
        profilePromises.push(safeQuery(supabase.from('profiles').select('*').in('emp_code', empCodes)));
        profilePromises.push(safeQuery(supabase.from('profiles').select('*').in('emp_id', empCodes)));
      }
      
      const profilesResults = await Promise.all(profilePromises);
      const allProfiles = profilesResults.flatMap((res: any) => res?.data || []);
      
      const profilesMap: Record<string, any> = {};
      const cleanId = (id: any) => id ? String(id).trim().toLowerCase() : '';
      
      allProfiles.forEach((p: any) => {
        if (p.id) profilesMap[cleanId(p.id)] = p;
        if (p.email) profilesMap[cleanId(p.email)] = p;
        if (p.emp_code) profilesMap[cleanId(p.emp_code)] = p;
        if (p.employee_code) profilesMap[cleanId(p.employee_code)] = p;
        if (p.emp_id) profilesMap[cleanId(p.emp_id)] = p;
      });

      // Identity resolution
      const mergedData = allReturns.map((item: any) => {
        const profile = profilesMap[cleanId(item.user_id)] || 
                        profilesMap[cleanId(item.user_email)] || 
                        profilesMap[cleanId(item.inspected_by)] || 
                        profilesMap[cleanId(item.assets?.assigned_to)] || null;
        
        let resolvedName = item.user_name || profile?.name || profile?.full_name || formatEmailAsName(item.user_email);
        let resolvedEmpCode = item.emp_code || profile?.emp_code || profile?.employee_code || profile?.emp_id;

        if (!resolvedEmpCode && item.inspected_by && String(item.inspected_by).toUpperCase().startsWith('EMP')) {
           resolvedEmpCode = String(item.inspected_by).toUpperCase();
        }

        const extractIdentityFromText = (text: string) => {
            if (!text) return null;
            let name = null;
            let emp = null;
            const patterns = [
                /Historical User:\s*([^|]+?)\s*\|\s*ID:\s*([^\]]+)/i,
                /Staff:\s*([^(]+?)\s*\((EMP-[^)]+)\)/i,
                /by\s+([A-Za-z\s\.]+?)(?:\s*\(\s*(EMP-\d+)\s*\)|\s+on\b|\s+at\b)/i,
                /(?:assigned|handed over)\s+to\s+([A-Za-z\s\.]+?)(?:\s*\(\s*(EMP-\d+)\s*\)|\s+on\b)/i,
                /(?:previous holder|holder):?\s+([A-Za-z\s\.]+?)(?:\s*\(\s*(EMP-\d+)\s*\)|\s*\||$)/i
            ];

            for (const p of patterns) {
                const match = text.match(p);
                if (match) {
                    const potentialName = match[1].trim();
                    if (!potentialName.toLowerCase().includes('admin') && !potentialName.toLowerCase().includes('system')) {
                        name = potentialName;
                        if (match[2]) emp = match[2].trim();
                        break;
                    }
                }
            }
            if (!emp) {
                const empMatch = text.match(/(EMP-\d+)/i);
                if (empMatch) emp = empMatch[1].toUpperCase();
            }
            if (name) name = name.replace(/\s+(upon|processed|awaiting|signed).*$/i, '').trim();
            return (name || emp) ? { name, emp } : null;
        };

        if (!resolvedName || resolvedName === 'Staff Member' || !resolvedEmpCode || resolvedEmpCode === 'UNKNOWN') {
            const currentItemText = `${item.notes || ''} ${item.admin_remarks || ''} ${item.assets?.notes || ''}`;
            const extracted = extractIdentityFromText(currentItemText);
            if (extracted) {
                if (!resolvedName || resolvedName === 'Staff Member') resolvedName = extracted.name;
                if ((!resolvedEmpCode || resolvedEmpCode === 'UNKNOWN') && extracted.emp) resolvedEmpCode = extracted.emp;
            }
        }

        if (!resolvedName || resolvedName === 'Staff Member' || !resolvedEmpCode || resolvedEmpCode === 'UNKNOWN') {
            const assetHistory = allAssetInspections?.filter((insp: any) => insp.asset_id === item.asset_id) || [];
            
            for (const hist of assetHistory) {
                if ((!resolvedName || resolvedName === 'Staff Member') && hist.user_name && !hist.user_name.toLowerCase().includes('admin')) {
                    resolvedName = hist.user_name;
                }
                if ((!resolvedEmpCode || resolvedEmpCode === 'UNKNOWN') && hist.emp_code && hist.emp_code !== 'SYS-ADMIN') {
                    resolvedEmpCode = hist.emp_code;
                }

                const histText = `${hist.notes || ''} ${hist.admin_remarks || ''}`;
                const extracted = extractIdentityFromText(histText);
                if (extracted) {
                    if (!resolvedName || resolvedName === 'Staff Member') resolvedName = extracted.name;
                    if ((!resolvedEmpCode || resolvedEmpCode === 'UNKNOWN') && extracted.emp) resolvedEmpCode = extracted.emp;
                }

                if (resolvedName && resolvedName !== 'Staff Member' && resolvedEmpCode && resolvedEmpCode !== 'UNKNOWN') break;
            }
        }

        if (!resolvedName || resolvedName === 'Staff Member') {
            if (String(item.user_id).includes('@')) resolvedName = formatEmailAsName(String(item.user_id));
            if (String(item.assets?.assigned_to).includes('@')) resolvedName = formatEmailAsName(String(item.assets?.assigned_to));
        }

        if (!resolvedEmpCode || resolvedEmpCode === 'UNKNOWN') {
            resolvedEmpCode = item.user_id ? String(item.user_id).substring(0,6).toUpperCase() : 
                              (item.inspected_by ? String(item.inspected_by).substring(0,6).toUpperCase() : 'UNKNOWN');
        }

        return { 
          ...item, 
          profiles: profile,
          resolvedName: resolvedName || 'Staff Member',
          resolvedEmpCode: resolvedEmpCode
        };
      });

      // Sort: Pending items first, then newer items to older items
      mergedData.sort((a, b) => {
        const aPending = (a.status || '').toLowerCase().includes('pending');
        const bPending = (b.status || '').toLowerCase().includes('pending');
        if (aPending !== bPending) return aPending ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Flag latest entry per asset while keeping all history intact
      const assetSeen = new Set<string>();
      mergedData.forEach(item => {
        const aId = item.asset_id || item.assets?.id;
        if (aId && !assetSeen.has(aId)) {
          item.isLatest = true;
          assetSeen.add(aId);
        } else {
          item.isLatest = false;
        }
      });

      setReturnRequests(mergedData);
    } catch (err: any) {
      console.error("Fetch returns error:", err);
      alert("Failed to fetch return requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeReturnAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const { assetId, action, staffId, item } = actionModal;
    if (!action || !assetId) return;

    setIsProcessingAction(true);
    setUpdatingId(assetId); 

    try {
      const adminName = currentAdmin?.name || currentAdmin?.full_name || currentAdmin?.email || 'IT Admin';
      const cleanStaffNotes = (item.notes || '').replace('[RETURN REQUEST]', '').trim();
      const statusStr = action === 'Approved' ? 'Return Approved' : 'Return Rejected';
      const finalRemarks = adminRemarks || (action === 'Approved' ? 'Verified and Approved.' : 'Declined.');

      const historicalBakedNotes = `${item.notes || ''}\n[Historical User: ${item.resolvedName} | ID: ${item.resolvedEmpCode}]`;

      let payloadToUse: any = {
         status: statusStr,
         admin_remarks: `${finalRemarks} (Processed by: ${adminName})`,
         admin_name: adminName,
         user_name: item.resolvedName !== 'Staff Member' ? item.resolvedName : null,
         emp_code: item.resolvedEmpCode !== 'UNKNOWN' ? item.resolvedEmpCode : null
      };

      if (item.isSynthetic) {
         payloadToUse = { ...payloadToUse, asset_id: assetId, user_id: staffId, condition: 'Unknown (Legacy)', notes: historicalBakedNotes };
      }

      let dbSuccess = false;
      for (let i = 0; i < 5; i++) {
         let dbErr;
         if (item.isSynthetic) {
             const res = await supabase.from('inspections').insert(payloadToUse);
             dbErr = res.error;
         } else {
             const res = await supabase.from('inspections')
                .update(payloadToUse)
                .eq('asset_id', assetId)
                .eq('created_at', item.created_at);
             dbErr = res.error;
         }
         
         if (dbErr) {
            const match = dbErr.message.match(/Could not find the '([^']+)' column/i);
            if (match && match[1]) {
                delete payloadToUse[match[1]];
                continue; 
            }
            throw new Error(`Log Update Failed: ${dbErr.message}`);
         }
         dbSuccess = true;
         break;
      }
      
      if (!dbSuccess) throw new Error("Failed to process inspection log due to database schema conflict.");

      let assetPayload: any = {};
      if (action === 'Approved') {
        const combinedNotes = `[RETURNED] Staff: ${item.resolvedName} (${item.resolvedEmpCode}) | Reason: ${cleanStaffNotes} | Admin Validation: ${finalRemarks} (${adminName})`;
        assetPayload = { 
          status: 'In Stock (Unassigned)', 
          assigned_to: null, 
          inspection_status: 'Approved',
          notes: combinedNotes 
        };
      } else {
        assetPayload = { 
          status: 'Assigned', 
          inspection_status: 'Return Rejected',
          notes: `[RETURN DECLINED] Reason: ${finalRemarks} (${adminName})`
        };
      }

      const { error: assetErr } = await supabase.from('assets').update(assetPayload).eq('id', assetId);
      if (assetErr) throw new Error(`Asset Update Failed: ${assetErr.message}`);

      if (staffId && String(staffId).toUpperCase().includes('ADMIN') === false) {
        await supabase.from('notifications').insert([{
          target_user: staffId,
          title: action === 'Approved' ? '✔ Return Approved' : `⚠ Return Request Declined`,
          message: action === 'Approved' 
            ? `Your hardware return was verified and approved by ${adminName}. The device has been securely detached from your profile.` 
            : `Your return request was declined by ${adminName} due to: "${finalRemarks}". Please re-submit the request with proper photos/notes.`,
          is_read: false,
          type: action === 'Approved' ? 'success' : 'error'
        }]);
      }

      setActionModal({ isOpen: false, action: null, assetId: '', staffId: '', item: null });
      fetchReturns(); 
      
    } catch (err: any) {
      console.error(err);
      alert(`Critical Error: ${err.message}. Please check your database schema.`);
    } finally {
      setUpdatingId(null);
      setIsProcessingAction(false);
    }
  };

  const openGallery = (images: string[], startIndex: number) => {
    setGallery({ isOpen: true, images, index: startIndex, scale: 1 });
  };

  const filteredList = returnRequests.filter(item => {
    const query = searchQuery.toLowerCase();
    const assetName = (item.assets?.name || item.assets?.asset_name || '').toLowerCase();
    const assetTag = (item.assets?.asset_tag || '').toLowerCase();
    const userName = (item.resolvedName || '').toLowerCase();
    const empCode = (item.resolvedEmpCode || '').toLowerCase();

    return assetName.includes(query) || assetTag.includes(query) || userName.includes(query) || empCode.includes(query);
  });

  const pendingCount = returnRequests.filter(r => r.isLatest && (r.status || '').toLowerCase().includes('pending')).length;

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
  };

  return (
    <div className={`min-h-screen ${theme.bg} relative overflow-x-hidden font-sans antialiased pb-12 transition-colors duration-1000`}>
      <div className="fixed top-[-10%] left-[0%] w-[50vw] h-[50vh] bg-orange-500/20 dark:bg-orange-600/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-10%] right-[0%] w-[50vw] h-[50vh] bg-purple-600/20 dark:bg-purple-700/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      {/* 🌟 FULL SCREEN GLASS GALLERY MODAL */}
      {gallery.isOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-slate-900/90 backdrop-blur-3xl animate-in fade-in">
          <div className="absolute inset-0" onClick={() => setGallery({ ...gallery, isOpen: false, scale: 1 })}></div>
          
          <button onClick={() => setGallery({ ...gallery, isOpen: false, scale: 1 })} className="absolute top-6 right-6 text-white/60 hover:text-white z-50 bg-white/10 p-3 rounded-full backdrop-blur-md transition-all hover:scale-110">
             <X size={24} />
          </button>
          
          <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-between px-4 z-40 pointer-events-none">
              
              <button 
                onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, index: gallery.index - 1, scale: 1 }); }} 
                disabled={gallery.index === 0}
                className={`pointer-events-auto p-4 rounded-full backdrop-blur-xl border border-white/20 transition-all ${gallery.index === 0 ? 'opacity-30 cursor-not-allowed bg-black/20' : 'bg-white/10 hover:bg-white/20 text-white cursor-pointer hover:scale-110'}`}
              >
                 <ChevronLeft size={32} />
              </button>

              <div className="flex-1 h-full flex items-center justify-center pointer-events-auto relative px-8 overflow-hidden">
                <img 
                   src={gallery.images[gallery.index]} 
                   style={{ transform: `scale(${gallery.scale})` }}
                   onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, scale: gallery.scale === 1 ? 2 : 1 }); }}
                   className={`max-w-full max-h-full object-contain transition-transform duration-300 rounded-lg shadow-2xl ${gallery.scale === 1 ? 'cursor-zoom-in' : 'cursor-zoom-out'}`} 
                   alt="Gallery View"
                />
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, index: gallery.index + 1, scale: 1 }); }} 
                disabled={gallery.index === gallery.images.length - 1}
                className={`pointer-events-auto p-4 rounded-full backdrop-blur-xl border border-white/20 transition-all ${gallery.index === gallery.images.length - 1 ? 'opacity-30 cursor-not-allowed bg-black/20' : 'bg-white/10 hover:bg-white/20 text-white cursor-pointer hover:scale-110'}`}
              >
                 <ChevronRight size={32} />
              </button>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 border border-white/20 backdrop-blur-xl px-6 py-2.5 rounded-full text-white font-black tracking-widest text-xs flex items-center gap-3">
             <ImageIcon size={14}/> {gallery.index + 1} / {gallery.images.length}
             <span className="w-px h-3 bg-white/30 mx-2"></span>
             <ZoomIn size={14} className="opacity-70"/> Click to Zoom
          </div>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 mx-auto space-y-5 sm:space-y-6 pt-4 relative z-10">
        
        {/* BRAND HEADER */}
        <div className={`${theme.glassCard} rounded-4xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <button onClick={() => router.push('/admin')} className={`p-2.5 sm:p-3 ${theme.glassItem} rounded-2xl ${theme.textSub} transition-all cursor-pointer hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <LogOut className="text-orange-500 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>Hardware Returns</span>
                </h1>
                {pendingCount > 0 && (
                  <span className="px-3 py-1 bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-full shadow-[0_4px_15px_rgba(249,115,22,0.4)] animate-pulse">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm font-semibold ${theme.textSub}`}>Process employee offboarding and hardware recovery requests</p>
            </div>
          </div>

          <button 
            onClick={fetchReturns} 
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 ${theme.glassItem} text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-orange-500' : 'text-purple-500 dark:text-purple-400'} />
            <span>Sync Returns</span>
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className={`p-2.5 rounded-2xl transition-all shadow-sm flex items-center focus-within:ring-4 focus-within:ring-orange-500/20 ${theme.inputBg}`}>
          <div className="relative w-full">
            <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search returns by employee name, asset tag, or S/N..." 
              className={`w-full pl-12 pr-4 py-1.5 text-sm font-semibold outline-none bg-transparent ${isDarkMode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-slate-900 placeholder:text-slate-400'}`}
            />
          </div>
        </div>

        {/* RETURNS FEED */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Loading Return Logs...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm ${theme.glassCard}`}>
            <LogOut size={48} className={`mx-auto opacity-60 ${isDarkMode ? 'text-orange-400' : 'text-orange-500'}`} />
            <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Return Requests</h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>The hardware tracking timeline is clear.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredList.map((item, index) => {
              const uniqueKey = item.id ? `return-${item.id}-${index}` : `return-fallback-${index}`;
              const isHistorical = !item.isLatest; 
              const isPending = !isHistorical && ((item.status || '').toLowerCase().includes('pending') || (item.status || '').toLowerCase().includes('request'));
              const asset = item.assets || {};
              
              // Robust array parsing for photos with multi-field fallback
              let photosList: string[] = [];
              try {
                if (Array.isArray(item.photos)) photosList = item.photos;
                else if (typeof item.photos === 'string' && item.photos.startsWith('[')) photosList = JSON.parse(item.photos);
                else if (item.photos && typeof item.photos === 'object') photosList = Object.values(item.photos);
                else if (item.photo_url) photosList = [item.photo_url];

                if (photosList.length === 0 && item.assets?.photos) {
                  if (Array.isArray(item.assets.photos)) photosList = item.assets.photos;
                  else if (typeof item.assets.photos === 'string' && item.assets.photos.startsWith('[')) photosList = JSON.parse(item.assets.photos);
                }
              } catch(e) {}

              return (
                <div key={uniqueKey} className={`p-6 md:p-8 rounded-3xl flex flex-col xl:flex-row gap-8 ${theme.glassItem} transition-all hover:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 dark:hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] ${isPending ? isDarkMode ? 'border-orange-500! ring-4 ring-orange-500/20 bg-orange-500/10!' : 'border-orange-400! ring-4 ring-orange-400/20 bg-orange-50/50!' : ''}`}>
                  
                  <div className={`w-full xl:w-1/3 flex flex-col gap-6 shrink-0 border-b xl:border-b-0 xl:border-r pb-6 xl:pb-0 xl:pr-8 ${isDarkMode ? 'border-white/10' : 'border-white/50'}`}>
                    
                    {/* 🌟 HISTORICAL BADGE */}
                    {isHistorical && (
                      <span className={`inline-flex w-max items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' : 'bg-slate-200 text-slate-600 border border-slate-300'}`}>
                        <Archive size={12} /> Archived Return Log
                      </span>
                    )}

                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-sm ${theme.glassInner} ${isHistorical ? 'text-slate-400' : isDarkMode ? 'text-orange-400' : 'text-orange-500'}`}><User size={20} /></div>
                      <div className="overflow-hidden">
                        
                        <h3 className={`text-lg font-bold leading-tight truncate ${isHistorical ? theme.textSub : theme.textMain}`}>{item.resolvedName}</h3>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] border mt-1 inline-block ${isDarkMode ? 'bg-black/50 text-zinc-300 border-white/20' : 'bg-white/60 text-slate-700 border-white/80'}`}>
                          ID: {item.resolvedEmpCode}
                        </span>

                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl space-y-3 ${theme.glassInner}`}>
                      {item.isSynthetic && (
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-500 mb-2 border-b border-amber-500/20 pb-2">
                          <AlertTriangle size={12} /> System Generated
                        </div>
                      )}
                      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isHistorical ? theme.textSub : theme.textMain}`}>
                        <Laptop size={14} className={`${isHistorical ? 'text-slate-400' : 'text-orange-500'} shrink-0`} />
                        <span className="truncate text-left font-bold">{asset.name || asset.asset_name || 'Hardware Asset'}</span>
                      </div>
                      <div className={`flex justify-between items-center text-[11px] border-t pt-2.5 mt-2.5 ${isDarkMode ? 'border-white/10' : 'border-white/50'}`}>
                        <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>S/N:</span>
                        <span className={`font-mono font-bold ${isHistorical ? theme.textSub : theme.textMain}`}>{asset.serial_number || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>TAG:</span>
                        <span className={`font-mono font-bold ${isHistorical ? 'text-slate-400' : 'text-purple-600 dark:text-purple-400'}`}>{asset.asset_tag || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[12px]">
                      <div className={`flex items-center gap-2 ${theme.textSub}`}>
                        <Clock size={14} className={isHistorical ? "text-slate-400" : isDarkMode ? "text-purple-400" : "text-purple-600"} /> 
                        <span className="text-[10px] font-bold uppercase tracking-widest">Submitted Date</span>
                      </div>
                      <span className={`font-bold ${isHistorical ? theme.textSub : theme.textMain}`}>{new Date(item.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="w-full xl:w-2/3 flex flex-col justify-between gap-6">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Return Request Details</h4>
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 shadow-sm cursor-default ${
                        isPending 
                          ? isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 animate-pulse' : 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse' 
                          : (item.status || '').toLowerCase().includes('approved') 
                            ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'
                      } ${isHistorical ? 'opacity-50' : ''}`}>
                        {item.status || 'Pending Return'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Employee Reason for Return</span>
                      <div className={`p-4 rounded-2xl text-xs font-semibold italic leading-relaxed ${theme.glassInner} ${isHistorical ? 'opacity-60' : ''}`}>
                        "{item.notes ? item.notes.replace('[RETURN REQUEST]', '').trim() : 'No reason provided.'}"
                      </div>
                    </div>

                    {/* 📸 PHOTOS SECTION - UPDATED TO USE GLASS GALLERY */}
                    {photosList.length > 0 && (
                      <div className={`space-y-2 ${isHistorical ? 'opacity-60' : ''}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${theme.textSub}`}>
                          <ImageIcon size={12} /> Uploaded Photos
                        </span>
                        <div className={`p-4 rounded-2xl flex flex-wrap gap-3 ${theme.glassInner}`}>
                          {photosList.map((url: string, idx: number) => (
                            <div 
                              key={`photo-${item.id || index}-${idx}`} 
                              onClick={() => openGallery(photosList, idx)}
                              className="relative group cursor-pointer"
                            >
                              <img src={url} alt="Return Attachment" className="w-20 h-20 object-cover rounded-xl border-2 border-transparent transition-all group-hover:border-orange-500 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                <ZoomIn size={16} className="text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 👤 ADMIN APPROVAL TRACKING SECTION */}
                    {!isPending && (
                      <div className={`p-4 rounded-2xl text-xs font-semibold ${theme.glassInner} ${isHistorical ? 'opacity-70' : ''}`}>
                        <div className="flex justify-between items-center mb-1.5 border-b border-white/10 pb-2">
                          <span className={`font-bold uppercase text-[9px] tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Admin Remarks</span>
                          
                          <span className={`font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded-md ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                            Processed By: {item.admin_name || 'IT Admin'}
                          </span>
                        </div>
                        <p className={`mt-2 ${theme.textMain}`}>"{item.admin_remarks || 'Processed without specific remarks.'}"</p>
                      </div>
                    )}

                    {isPending && (
                      <div className={`pt-4 border-t mt-auto grid grid-cols-1 sm:grid-cols-2 gap-3 ${isDarkMode ? 'border-white/10' : 'border-white/50'}`}>
                        <button disabled={updatingId === asset.id} onClick={() => { setActionModal({ isOpen: true, action: 'Approved', assetId: asset.id, staffId: item.user_id || asset.assigned_to, item }); setAdminRemarks(''); }} className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(16,185,129,0.3)] cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                          <CheckCircle2 size={16} /> Approve & Move to Stock
                        </button>
                        <button disabled={updatingId === asset.id} onClick={() => { setActionModal({ isOpen: true, action: 'Declined', assetId: asset.id, staffId: item.user_id || asset.assigned_to, item }); setAdminRemarks(''); }} className="flex items-center justify-center gap-2 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(244,63,94,0.3)] cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                          <XCircle size={16} /> Decline / Re-Request
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 ACTION MODAL FOR APPROVE/DECLINE */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl flex flex-col gap-4 border ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-white/60 text-slate-900'}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${actionModal.action === 'Approved' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                  {actionModal.action === 'Approved' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                </div>
                <h3 className="font-black tracking-widest uppercase text-sm">
                  {actionModal.action === 'Approved' ? 'Approve Return' : 'Decline Return'}
                </h3>
              </div>
              <button onClick={() => setActionModal({ ...actionModal, isOpen: false })} className="p-2 hover:bg-slate-500/10 rounded-full cursor-pointer"><X size={18}/></button>
            </div>
            
            <form onSubmit={executeReturnAction} className="flex flex-col gap-4 mt-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                  {actionModal.action === 'Declined' ? 'Reason for Declining (Required)' : 'Admin Remarks (Optional)'}
                </label>
                <textarea 
                  required={actionModal.action === 'Declined'}
                  value={adminRemarks}
                  onChange={e => setAdminRemarks(e.target.value)}
                  placeholder={actionModal.action === 'Declined' ? "Explain why this is being declined..." : "Any final notes before approving..."}
                  className={`w-full p-4 rounded-2xl resize-none h-28 outline-none border transition-all text-sm font-semibold ${isDarkMode ? 'bg-black/50 border-white/10 focus:border-purple-500/50 text-white' : 'bg-slate-50 border-slate-200 focus:border-purple-500/50 text-slate-800'}`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                 <button type="button" onClick={() => setActionModal({ ...actionModal, isOpen: false })} className="flex-1 py-3.5 font-black uppercase tracking-widest text-[11px] rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 cursor-pointer">Cancel</button>
                 <button type="submit" disabled={isProcessingAction} className={`flex-1 py-3.5 font-black uppercase tracking-widest text-[11px] rounded-2xl text-white flex justify-center items-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${actionModal.action === 'Approved' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                   {isProcessingAction ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminReturnsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-transparent dark:bg-[#0a0a0a]" />}><AdminReturnsContent /></Suspense>;
}