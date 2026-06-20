'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Package, CheckCircle2, Camera, ArrowLeft, Trash2, 
  MessageSquare, ShieldAlert, Send, Ticket, PlusCircle, 
  Timer, PauseCircle, MonitorUp, ImagePlus, RefreshCw, ClipboardCheck,
  AlertCircle, Loader2, History, Bell
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const formatStatus = (s?: string) => {
  if (!s) return 'Open';
  const lower = s.toLowerCase().trim();
  if (lower.includes('resolve') || lower.includes('close')) return 'Resolved';
  if (lower.includes('progress') || lower.includes('process')) return 'In Progress';
  if (lower.includes('hold') || lower.includes('pause')) return 'Hold';
  if (lower.includes('open')) return 'Open';
  return s.charAt(0).toUpperCase() + s.slice(1); 
};

interface AssignedAsset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: string;
  inspectionStatus: 'Due' | 'Pending Approval' | 'Passed' | 'Failed' | 'Pending Repair' | 'Re-inspection';
  adminFeedback?: string;
}

interface TicketReply {
  id: string;
  sender: 'Admin' | 'Staff';
  name: string;
  text: string;
  date: string;
}

interface StaffTicket {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Hold' | 'Resolved' | string;
  estimatedTime?: string;
  date: string;
  replies: TicketReply[];
}

interface StaffUser {
  name: string;
  empCode: string;
  email: string;
}

// --- MAIN CONTENT COMPONENT ---
function StaffDashboardContent() {
  const searchParams = useSearchParams();
  const isGuest = searchParams.get('mode') === 'demo';

  const [staffUser, setStaffUser] = useState<StaffUser>({ name: 'Loading Profile...', empCode: '...', email: '' });
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [recentTickets, setRecentTickets] = useState<StaffTicket[]>([]);
  const [assetHistory, setAssetHistory] = useState<StaffTicket[]>([]); 
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewState, setViewState] = useState<'dashboard' | 'inspecting' | 'raising_ticket' | 'requesting_asset' | 'replacing_asset'>('dashboard');
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ticketForm, setTicketForm] = useState({ title: '', category: 'Hardware', priority: 'Medium', description: '' });
  const [assetRequestForm, setAssetRequestForm] = useState({ category: 'Mouse', reason: '' });
  const [assetReplaceForm, setAssetReplaceForm] = useState({ assetId: '', reason: '' });

  const [inspectNotes, setInspectNotes] = useState('');
  const [inspectPhotos, setInspectPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // ==========================================
      // 🚨 GUEST DEMO OVERRIDE 🚨
      // ==========================================
      if (isGuest) {
        if (isMounted) {
          setStaffUser({ name: 'Demo Guest', empCode: 'DEMO-999', email: 'guest@vsit.com' });
          setAssets([
            { id: 'demo1', tagId: 'LAP-1024', name: 'Demo MacBook Pro 14"', category: 'Laptop', status: 'Assigned', inspectionStatus: 'Due' },
            { id: 'demo2', tagId: 'MOU-8055', name: 'Demo Wireless Mouse', category: 'Mouse', status: 'Assigned', inspectionStatus: 'Passed' }
          ]);
          setRecentTickets([
            { id: 'ticket1', title: 'Need VPN Access', description: 'Testing out demo tickets', status: 'Resolved', date: 'Today, 10:00 AM', replies: [{ id: 'r1', sender: 'Admin', name: 'Admin', text: 'VPN granted for demo.', date: 'Today, 10:05 AM' }] }
          ]);
          setAssetHistory([
            { id: 'ticket2', title: 'Request Asset: Monitor', description: 'Need second screen', status: 'In Progress', date: 'Yesterday', replies: [] }
          ]);
          setIsLoaded(true);
        }
        return; 
      }

      // ==========================================
      // NORMAL REAL DATABASE LOAD (BULLETPROOF)
      // ==========================================
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const rawEmail = user?.email || localStorage.getItem('userEmail') || '';
        const userEmail = rawEmail.trim();

        if (!userEmail) {
          if (isMounted) {
            setStaffUser({ name: 'Guest User', empCode: 'GUEST-000', email: 'Please log in' });
            setIsLoaded(true);
          }
          return;
        }

        // 1. Fetch Profile Data
        const [profileRes, staffRes] = await Promise.all([
          supabase.from('profiles').select('*').ilike('email', userEmail).maybeSingle(),
          supabase.from('staff').select('*').ilike('email', userEmail).maybeSingle()
        ]);

        const profileData = profileRes.data;
        const staffData = staffRes.data;

        const rawEmpCode = profileData?.emp_code || staffData?.emp_code || profileData?.emp_id || staffData?.emp_id || 'N/A';
        const resolvedEmpCode = rawEmpCode.trim();
        const resolvedName = profileData?.full_name || profileData?.name || staffData?.name || 'Staff Member';

        const currentUser = { 
          name: resolvedName, 
          empCode: resolvedEmpCode, 
          email: userEmail 
        };
        
        if (isMounted) setStaffUser(currentUser);

        // 2. Fetch Tickets (Aggressive Smart Filter)
        const { data: allTickets } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
        
        if (isMounted && allTickets) {
          const myTickets = allTickets.filter(t => {
            const dbValue = String(t.emp_code || '').toLowerCase().trim();
            const myCode = resolvedEmpCode.toLowerCase();
            const myName = resolvedName.toLowerCase();
            // Match if DB holds their ID OR their Name
            return (dbValue === myCode && myCode !== 'n/a') || (dbValue === myName && myName !== 'staff member');
          });

          const mappedTickets = myTickets.map((t: any) => ({
            id: t.id,
            title: t.subject || t.title || 'No Subject',
            description: t.description || '',
            status: formatStatus(t.status), 
            estimatedTime: t.waiting_time || t.estimated_time || '',
            date: t.created_at ? new Date(t.created_at).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date',
            replies: t.replies || []
          }));

          setRecentTickets(mappedTickets.slice(0, 3));
          setAssetHistory(mappedTickets.filter((t: StaffTicket) => 
            t.title.toLowerCase().includes('request') || t.title.toLowerCase().includes('replace')
          ));
        }

        // 3. Fetch Assets (Aggressive Smart Filter)
        const { data: allAssets, error: assetErr } = await supabase.from('assets').select('*');
        if (assetErr) console.error("Assets fetch error:", assetErr);

        let fetchedAssets: any[] = [];
        if (allAssets) {
          fetchedAssets = allAssets.filter(a => {
            // Check both emp_code and assigned_to columns just in case!
            const dbValue = String(a.emp_code || a.assigned_to || '').toLowerCase().trim();
            const myCode = resolvedEmpCode.toLowerCase();
            const myName = resolvedName.toLowerCase();
            
            // Match if DB holds their ID OR their Name
            return (dbValue === myCode && myCode !== 'n/a') || (dbValue === myName && myName !== 'staff member');
          });
        }

        if (isMounted) {
          setAssets(fetchedAssets.map((a: any) => ({
            id: a.id,
            tagId: a.tag_id || a.asset_tag || 'N/A',
            name: a.name || a.asset_name || 'Unnamed Asset',
            category: a.category || 'Hardware',
            status: a.status || 'Assigned',
            inspectionStatus: a.inspection_status || 'Due',
            adminFeedback: a.inspection_notes || ''
          })));
        }

      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    };

    loadData();

    if (!isGuest) {
      const ticketsChannel = supabase.channel('realtime-tickets-dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => { loadData(); })
        .subscribe();
      const assetsChannel = supabase.channel('realtime-assets-dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => { loadData(); })
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(ticketsChannel);
        supabase.removeChannel(assetsChannel);
      };
    }
  }, [isGuest]);

  const openInspection = (asset: AssignedAsset) => {
    setSelectedAsset(asset);
    setInspectPhotos([]);
    setInspectNotes('');
    setViewState('inspecting');
  };

  const scrollToAssets = () => document.getElementById('my-assets-section')?.scrollIntoView({ behavior: 'smooth' });

  const handleNav = (view: any) => {
    setViewState(view);
    setActiveTab('form'); 
  };

  const handleSubmitTicket = async () => {
    if (!ticketForm.title || !ticketForm.description) return alert("Please fill in all fields.");
    
    if (isGuest) {
      alert("✅ [DEMO MODE] Ticket raised successfully! (No data saved to database)");
      setTicketForm({ title: '', category: 'Hardware', priority: 'Medium', description: '' });
      setViewState('dashboard');
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase.from('tickets').insert([{
        subject: `[${ticketForm.category}] ${ticketForm.title} (${ticketForm.priority} Priority)`,
        description: ticketForm.description,
        status: 'Open',
        emp_code: staffUser.empCode
      }]);
      alert('Ticket raised successfully!');
      setTicketForm({ title: '', category: 'Hardware', priority: 'Medium', description: '' });
      setViewState('dashboard');
    } catch (error: any) { alert("Error: " + error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleSubmitAssetRequest = async () => {
    if (!assetRequestForm.reason) return alert("Please provide a reason.");
    
    if (isGuest) {
      alert("✅ [DEMO MODE] Asset Request sent successfully! (No data saved)");
      setAssetRequestForm({ category: 'Mouse', reason: '' });
      setActiveTab('history');
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase.from('tickets').insert([{
        subject: `Asset Request: ${assetRequestForm.category}`,
        description: `Reason: ${assetRequestForm.reason}`,
        status: 'Open',
        emp_code: staffUser.empCode
      }]);
      alert('Asset request submitted to Admin!');
      setAssetRequestForm({ category: 'Mouse', reason: '' });
      setActiveTab('history'); 
    } catch (error: any) { alert("Error: " + error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleSubmitAssetReplace = async () => {
    if (!assetReplaceForm.assetId || !assetReplaceForm.reason) return alert("Please select an asset and provide a reason.");
    
    if (isGuest) {
      alert("✅ [DEMO MODE] Replacement Request sent successfully! (No data saved)");
      setAssetReplaceForm({ assetId: '', reason: '' });
      setActiveTab('history');
      return;
    }

    setIsSubmitting(true);
    const assetToReplace = assets.find(a => a.id === assetReplaceForm.assetId);
    
    try {
      await supabase.from('tickets').insert([{
        subject: `Replace Asset: ${assetToReplace?.name} (${assetToReplace?.tagId})`,
        description: `Reason for replacement: ${assetReplaceForm.reason}`,
        status: 'Open',
        emp_code: staffUser.empCode
      }]);
      alert('Asset replacement request submitted to Admin!');
      setAssetReplaceForm({ assetId: '', reason: '' });
      setActiveTab('history'); 
    } catch (error: any) { alert("Error: " + error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handlePhotoCaptureWithWatermark = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedAsset) return;

    const maxPhotos = selectedAsset.category === 'Laptop' ? 5 : 2;
    if (inspectPhotos.length + files.length > maxPhotos) {
      alert(`Error: ${selectedAsset.category}s require exactly ${maxPhotos} photos.`);
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(0, img.height - 60, img.width, 60);
          ctx.font = "bold 24px Arial";
          ctx.fillStyle = "white";
          const timestamp = new Date().toLocaleString();
          ctx.fillText(`Scanned: ${timestamp}`, 20, img.height - 20);
          setInspectPhotos(prev => [...prev, canvas.toDataURL('image/jpeg', 0.8)]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpdateInspection = async () => {
    if (!selectedAsset) return;
    const reqPhotos = selectedAsset.category === 'Laptop' ? 5 : 2;
    if (inspectPhotos.length !== reqPhotos) {
      alert(`Please upload exactly ${reqPhotos} photos for this ${selectedAsset.category}.`);
      return;
    }

    if (isGuest) {
      alert("✅ [DEMO MODE] Inspection marked as Submitted! (No data saved)");
      setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, inspectionStatus: 'Pending Approval' } : a));
      setViewState('dashboard');
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase.from('assets').update({
        inspection_status: 'Pending Admin Review',
        inspection_notes: inspectNotes,
        photos: inspectPhotos,
        updated_at: new Date().toISOString()
      }).eq('id', selectedAsset.id);
      
      alert("Inspection Submitted Successfully! Admin will review it shortly.");
      setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, inspectionStatus: 'Pending Approval' } : a));
      setViewState('dashboard');
    } catch(err:any) { 
      alert("Error: " + err.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const needsInspectionCount = assets.filter(a => a.inspectionStatus === 'Due' || a.inspectionStatus === 'Re-inspection').length;
  const inRepairCount = assets.filter(a => a.inspectionStatus === 'Pending Repair').length;

  const AssetHistoryLog = () => (
    <div className="mt-6">
      {assetHistory.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <History className="mx-auto text-gray-300 mb-3" size={32} />
          <p className="text-sm font-bold text-gray-500">You have no prior asset requests or replacements.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assetHistory.map(ticket => {
            const latestAdminReply = [...ticket.replies].reverse().find(r => r.sender === 'Admin');
            const isReplace = ticket.title.toLowerCase().includes('replace');
            
            return (
              <div key={ticket.id} className="border border-gray-200 p-4 sm:p-5 rounded-2xl bg-white hover:border-teal-300 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2 sm:gap-4">
                  <div className="min-w-0 w-full flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isReplace ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-600'}`}>
                      {isReplace ? <RefreshCw size={18} /> : <PlusCircle size={18} />}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#002B49] truncate">{ticket.title}</h3>
                      <p className="text-[11px] sm:text-xs font-medium text-gray-500 mt-0.5">{ticket.date}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider shrink-0 w-fit shadow-sm ${
                    ticket.status === 'Resolved' ? 'bg-[#e6f7eb] text-[#008a4b]' :
                    ticket.status === 'Open' ? 'bg-red-50 text-red-700' :
                    ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-700' :
                    'bg-orange-50 text-orange-700'
                  }`}>
                    {ticket.status}
                  </div>
                </div>

                {latestAdminReply && (
                  <div className="bg-[#f0fcf6] border border-[#d1f0e0] p-3 sm:p-4 rounded-xl mt-3">
                    <p className="text-[9px] sm:text-[10px] font-black text-[#006456] uppercase flex items-center gap-1.5 mb-1.5 tracking-wide">
                      <MessageSquare size={12}/> ADMIN UPDATE
                    </p>
                    <p className="text-xs sm:text-[14px] font-medium text-[#004d40] leading-relaxed">
                      {latestAdminReply.text}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!isLoaded) return <div className="p-10 text-center font-bold text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 sm:px-0">
      
      {isGuest && (
        <div className="bg-purple-100 border border-purple-200 p-3 rounded-xl flex items-center justify-center gap-2">
          <AlertCircle className="text-purple-600" size={18} />
          <p className="text-sm font-black text-purple-900">You are in Demo Mode! Database updates are disabled.</p>
        </div>
      )}

      {viewState === 'dashboard' && (
        <>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center w-full gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#002B49]">Welcome back, {staffUser.name}! 👋</h1>
              <p className="text-sm font-bold text-gray-500">
                ID: <span className="text-gray-900">{staffUser.empCode}</span> | Email: {staffUser.email}
              </p>
            </div>
            <button className="relative p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
              <Bell size={24} className="text-[#002B49]" />
              {needsInspectionCount > 0 && <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <button onClick={() => handleNav('raising_ticket')} className="bg-white py-6 px-3 sm:px-4 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 sm:gap-4 hover:border-blue-200 hover:shadow-md transition-all group">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform shrink-0"><Ticket className="w-5 h-5 sm:w-6 sm:h-6" /></div>
              <span className="font-black text-gray-900 text-[11px] sm:text-[13px] uppercase tracking-wide text-center leading-tight">Raise Ticket</span>
            </button>

            <button onClick={scrollToAssets} className="bg-orange-50/30 py-6 px-3 sm:px-4 rounded-2xl sm:rounded-3xl shadow-sm border border-orange-100 flex flex-col items-center justify-center gap-3 sm:gap-4 hover:border-orange-200 hover:shadow-md transition-all group">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-orange-100 text-orange-600 group-hover:scale-110 transition-transform shrink-0"><ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" /></div>
              <span className="font-black text-orange-900 text-[11px] sm:text-[13px] uppercase tracking-wide text-center leading-tight">Submit Inspection</span>
            </button>

            <button onClick={() => handleNav('requesting_asset')} className="bg-white py-6 px-3 sm:px-4 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 sm:gap-4 hover:border-teal-200 hover:shadow-md transition-all group">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-teal-50 text-teal-600 group-hover:scale-110 transition-transform shrink-0"><PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" /></div>
              <span className="font-black text-gray-900 text-[11px] sm:text-[13px] uppercase tracking-wide text-center leading-tight">Request Asset</span>
            </button>

            <button onClick={() => handleNav('replacing_asset')} className="bg-white py-6 px-3 sm:px-4 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 sm:gap-4 hover:border-red-200 hover:shadow-md transition-all group">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-red-50 text-red-600 group-hover:scale-110 transition-transform shrink-0"><RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" /></div>
              <span className="font-black text-gray-900 text-[11px] sm:text-[13px] uppercase tracking-wide text-center leading-tight">Replace Asset</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#002B49] flex items-center gap-2"><Ticket size={20} className="text-[#006456]" /> My IT Tickets </h2>
            </div>
            {recentTickets.length === 0 ? (
               <div className="p-8 text-center text-gray-400 font-bold text-sm">No recent tickets.</div>
            ) : (
              <div className="p-4 sm:p-6 space-y-4">
                {recentTickets.map(ticket => {
                  const latestAdminReply = [...ticket.replies].reverse().find(r => r.sender === 'Admin');
                  return (
                    <div key={ticket.id} className="border border-gray-100 p-4 sm:p-5 rounded-2xl bg-white hover:border-teal-300 hover:shadow-sm transition-all">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-4">
                        <div className="min-w-0 w-full">
                          <h3 className="text-base sm:text-lg font-black text-[#002B49] truncate pr-2">{ticket.title}</h3>
                          <p className="text-[11px] sm:text-xs font-medium text-gray-500 mt-0.5">{ticket.date}</p>
                        </div>
                        <div className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider shrink-0 w-fit ${ticket.status === 'Resolved' ? 'bg-[#e6f7eb] text-[#008a4b]' : ticket.status === 'Open' ? 'bg-red-50 text-red-700' : ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{ticket.status}</div>
                      </div>
                      {latestAdminReply && (
                        <div className="bg-[#f0fcf6] border border-[#d1f0e0] p-3 sm:p-4 rounded-xl mt-2"><p className="text-[9px] font-black text-[#006456] uppercase mb-1.5 flex items-center gap-1.5"><MessageSquare size={12}/> LATEST UPDATE FROM ADMIN</p><p className="text-xs font-medium text-[#004d40]">{latestAdminReply.text}</p></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div id="my-assets-section" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4"><div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 text-gray-500 rounded-xl flex items-center justify-center shrink-0"><MonitorUp size={20}/></div><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">My Assets</p><p className="text-xl font-black text-[#002B49]">{assets.length}</p></div></div>
            <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4"><div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0"><ShieldAlert size={20}/></div><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Needs Inspection</p><p className="text-xl font-black text-[#002B49]">{needsInspectionCount}</p></div></div>
            <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4"><div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0"><RefreshCw size={20}/></div><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">In Repair</p><p className="text-xl font-black text-[#002B49]">{inRepairCount}</p></div></div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-2">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between"><h2 className="text-lg font-black text-[#002B49] flex items-center gap-2"><Package size={20} className="text-[#006456]" /> Assigned Asset Details</h2></div>
            {assets.length === 0 ? <div className="p-10 text-center text-gray-400 font-bold text-sm">No assets assigned yet.</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {assets.map((asset) => (
                  <div key={asset.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-200 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-black bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-gray-600 uppercase tracking-wider">{asset.category}</span>
                        {asset.inspectionStatus === 'Passed' && <CheckCircle2 size={20} className="text-[#008a4b]" />}{asset.inspectionStatus === 'Re-inspection' && <ShieldAlert size={20} className="text-orange-500 animate-pulse" />}
                      </div>
                      <h3 className="text-lg font-black text-[#002B49] mb-1">{asset.name}</h3><p className="text-sm font-bold text-gray-500 uppercase">{asset.tagId}</p>
                    </div>
                    <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between">
                      <span className={`text-xs font-black uppercase tracking-wider ${asset.inspectionStatus === 'Due' ? 'text-blue-600' : asset.inspectionStatus === 'Re-inspection' ? 'text-orange-600' : asset.inspectionStatus === 'Pending Approval' ? 'text-yellow-600' : asset.inspectionStatus === 'Failed' ? 'text-red-600' : 'text-[#008a4b]'}`}>{asset.inspectionStatus}</span>
                      {(asset.inspectionStatus === 'Due' || asset.inspectionStatus === 'Re-inspection') ? (
                        <button onClick={() => openInspection(asset)} className="bg-[#006456] hover:bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-colors flex items-center gap-2"><Camera size={14} /> Start Inspection</button>
                      ) : asset.inspectionStatus === 'Pending Approval' ? <span className="text-xs font-bold text-gray-400">Waiting for Admin...</span> : <span className="text-xs font-bold text-gray-400">Up to date</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* REQUESTING / REPLACING VIEWS */}
      {(viewState === 'requesting_asset' || viewState === 'replacing_asset') && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"><ArrowLeft size={16} /> Back to Dashboard</button>
          
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="mb-6 pb-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  {viewState === 'requesting_asset' ? <><PlusCircle className="text-[#006456]"/> Request Asset</> : <><RefreshCw className="text-red-600"/> Replace Asset</>}
                </h2>
              </div>
              
              <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                <button onClick={() => setActiveTab('form')} className={`flex-1 sm:px-6 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'form' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>New Request</button>
                <button onClick={() => setActiveTab('history')} className={`flex-1 sm:px-6 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><History size={14}/> History</button>
              </div>
            </div>

            {activeTab === 'form' ? (
              <div className="space-y-5">
                {viewState === 'replacing_asset' ? (
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase mb-2">Select Asset</label>
                        <select value={assetReplaceForm.assetId} onChange={(e) => setAssetReplaceForm({...assetReplaceForm, assetId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none">
                          <option value="">-- Select an Asset --</option>
                          {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name} ({asset.tagId})</option>)}
                        </select>
                    </div>
                ) : (
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase mb-2">What do you need?</label>
                      <select value={assetRequestForm.category} onChange={(e) => setAssetRequestForm({...assetRequestForm, category: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none">
                        <option value="Mouse">Mouse</option><option value="Keyboard">Keyboard</option><option value="Monitor">Monitor</option><option value="Headphones">Headphones</option>
                      </select>
                    </div>
                )}
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Reason</label>
                  <textarea rows={4} value={viewState === 'requesting_asset' ? assetRequestForm.reason : assetReplaceForm.reason} onChange={(e) => viewState === 'requesting_asset' ? setAssetRequestForm({...assetRequestForm, reason: e.target.value}) : setAssetReplaceForm({...assetReplaceForm, reason: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-medium focus:border-teal-500 focus:outline-none"/>
                </div>
                <button onClick={viewState === 'requesting_asset' ? handleSubmitAssetRequest : handleSubmitAssetReplace} disabled={isSubmitting} className={`w-full py-4 font-black rounded-xl ${viewState === 'requesting_asset' ? 'bg-[#006456] text-white' : 'bg-red-600 text-white'}`}>Submit Request</button>
              </div>
            ) : (
              <AssetHistoryLog />
            )}
          </div>
        </div>
      )}

      {/* RAISING TICKET VIEW */}
      {viewState === 'raising_ticket' && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 mb-6 border-b border-gray-100 pb-4">Raise IT Ticket</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Issue Title</label>
                <input type="text" placeholder="e.g. Laptop screen flickering" value={ticketForm.title} onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none"/>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Category</label>
                  <select value={ticketForm.category} onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold">
                    <option value="Hardware">Hardware Issue</option>
                    <option value="Internet">Internet / Network</option>
                    <option value="Software">Software</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Priority</label>
                  <select value={ticketForm.priority} onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Urgent)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Description</label>
                <textarea rows={4} placeholder="Provide more details..." value={ticketForm.description} onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-medium"/>
              </div>
              <button onClick={handleSubmitTicket} disabled={isSubmitting} className="w-full py-4 bg-[#006456] hover:bg-teal-800 text-white font-black rounded-xl">
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTION VIEW */}
      {viewState === 'inspecting' && selectedAsset && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-black text-[#002B49] flex items-center gap-2">
                <ClipboardCheck className="text-orange-500"/> Inspection: {selectedAsset.name}
              </h2>
              <p className="text-sm font-bold text-gray-500 mt-1">Tag ID: {selectedAsset.tagId}</p>
            </div>

            <div className="space-y-6">
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-xs font-bold text-orange-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>Rules: {selectedAsset.category === 'Laptop' ? 'Laptops require exactly 5 photos.' : 'Other assets require exactly 2 photos.'}</p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Add Inspection Notes</label>
                <textarea 
                  rows={3} 
                  placeholder="Describe the current physical condition..." 
                  value={inspectNotes} 
                  onChange={e => setInspectNotes(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium resize-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">
                  Upload Photos ({inspectPhotos.length} / {selectedAsset.category === 'Laptop' ? 5 : 2})
                </label>
                <div className="flex gap-4 items-center">
                  <button onClick={() => fileInputRef.current?.click()} className="px-5 py-3 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors">
                    <Camera size={18}/> Choose Images
                  </button>
                  <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handlePhotoCaptureWithWatermark} className="hidden" />
                </div>
                
                {inspectPhotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                    {inspectPhotos.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={handleUpdateInspection} 
                disabled={isSubmitting} 
                className="w-full py-4 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition-all shadow-sm flex items-center justify-center gap-2 text-sm mt-4"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Submit Inspection to Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Ensure proper Vercel deployment with Suspense wrapping useSearchParams
export default function StaffDashboardPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold text-gray-500">Loading Workspace...</div>}>
      <StaffDashboardContent />
    </Suspense>
  );
}