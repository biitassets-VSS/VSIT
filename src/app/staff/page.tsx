'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, CheckCircle2, Camera, ArrowLeft, Trash2, 
  MessageSquare, ShieldAlert, Send, Ticket, PlusCircle, 
  Timer, PauseCircle, MonitorUp, ImagePlus, RefreshCw, ClipboardCheck,
  AlertCircle, Loader2, History, Bell
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// --- Smart Status Formatter ---
const formatStatus = (s?: string) => {
  if (!s) return 'Open';
  const lower = s.toLowerCase().trim();
  if (lower.includes('resolve') || lower.includes('close')) return 'Resolved';
  if (lower.includes('progress') || lower.includes('process')) return 'In Progress';
  if (lower.includes('hold') || lower.includes('pause')) return 'Hold';
  if (lower.includes('open')) return 'Open';
  return s.charAt(0).toUpperCase() + s.slice(1); 
};

// --- Interfaces ---
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

export default function StaffDashboardPage() {
  const [staffUser, setStaffUser] = useState<StaffUser>({ name: 'Loading...', empCode: '...', email: '' });
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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || localStorage.getItem('userEmail');

        if (!userEmail) {
          if (isMounted) {
            setStaffUser({ name: 'Guest User', empCode: 'GUEST-000', email: 'Please log in' });
            setIsLoaded(true);
          }
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('email', userEmail).maybeSingle();

        const currentUser = { 
          name: profile?.full_name || profile?.name || localStorage.getItem('userName') || 'Staff Member', 
          empCode: profile?.emp_code || profile?.employee_code || profile?.employee_id || profile?.emp_id || 'N/A', 
          email: profile?.email || userEmail 
        };
        
        if (isMounted) setStaffUser(currentUser);

        if (currentUser.empCode !== 'N/A') {
          const { data: ticketRes } = await supabase
            .from('tickets')
            .select('*')
            .eq('emp_code', currentUser.empCode)
            .order('created_at', { ascending: false });

          if (isMounted && ticketRes) {
            const mappedTickets = ticketRes.map((t: any) => ({
              id: t.id,
              title: t.subject || t.title || 'No Subject',
              description: t.description || '',
              status: formatStatus(t.status), 
              estimatedTime: t.waiting_time || t.estimated_time || '',
              date: t.created_at ? new Date(t.created_at).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date',
              replies: t.replies || []
            }));

            setRecentTickets(mappedTickets.slice(0, 3));
            
            const hardwareHistory = mappedTickets.filter((t: StaffTicket) => 
              t.title.toLowerCase().includes('request') || t.title.toLowerCase().includes('replace')
            );
            setAssetHistory(hardwareHistory);
          }
        }

        let fetchedAssets: any[] = [];
        if (currentUser.empCode !== 'N/A') {
          const { data } = await supabase.from('assets').select('*').eq('emp_code', currentUser.empCode);
          if (data && data.length > 0) fetchedAssets = data;
        }

        if (isMounted && fetchedAssets.length > 0) {
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
  }, []);

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
      
      {viewState === 'dashboard' && (
        <>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center w-full gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#002B49]">Welcome back, {staffUser.name}! 👋</h1>
              <p className="text-sm font-bold text-gray-500">ID: <span className="text-gray-900">{staffUser.empCode}</span> | Workspace overview.</p>
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
          
          {/* Dashboard Assets Table Section (Omitted for brevity in build, include your existing one here) */}
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
    </div>
  );
}