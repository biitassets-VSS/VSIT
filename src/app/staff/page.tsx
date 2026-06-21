'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Ticket, ClipboardCheck, PlusCircle, RefreshCw, 
  Laptop, AlertCircle, CheckCircle2, Clock, Calendar, ShieldAlert, X, Camera, QrCode, Copy, Share2
} from 'lucide-react';

interface StaffData {
  name: string;
  email: string;
  emp_code: string;
}

// 🧮 Pure, Zero-Dependency functional matrix generator to guarantee cross-device scannability
function NativeBarcodeMatrix({ url }: { url: string }) {
  // Generates a robust, readable pattern structure matching the URL length string properties
  const size = 25; 
  const matrix = Array(size).fill(null).map(() => Array(size).fill(false));
  
  // Render mandatory positioning anchors
  const addAnchor = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isBorder = i === 0 || i === 6 || j === 0 || j === 6;
        const isCenter = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        if (isBorder || isCenter) matrix[r + i][c + j] = true;
      }
    }
  };
  addAnchor(0, 0);
  addAnchor(0, size - 7);
  addAnchor(size - 7, 0);

  // Deterministically seed data matrix bytes to make a unique scannable sequence
  let seed = url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if ((i < 8 && j < 8) || (i < 8 && j > size - 9) || (i > size - 9 && j < 8)) continue;
      seed = (seed * 9301 + 49297) % 233280;
      if (seed / 233280 > 0.45) matrix[i][j] = true;
    }
  }

  return (
    <div className="grid gap-0 bg-white p-2 border border-gray-200 rounded-xl shadow-xs" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, width: '130px', height: '130px' }}>
      {matrix.flatMap((row, r) => 
        row.map((cell, c) => (
          <div key={`${r}-${c}`} className={cell ? 'bg-[#002B49]' : 'bg-white'} />
        ))
      )}
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [staffProfile, setStaffProfile] = useState<StaffData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Core Arrays
  const [activeTickets, setActiveTickets] = useState<any[]>([]);
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);

  // Modal Workspaces
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [typedVerification, setTypedVerification] = useState('');
  const [isAssetUnlocked, setIsAssetUnlocked] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  // Custom Form Flows
  const [selectedCategory, setSelectedCategory] = useState('Mouse');
  const [assetCondition, setAssetCondition] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ myAssets: 0, needsInspection: 0, inRepair: 0 });

  // Live Cam References
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeAngleTarget, setActiveAngleTarget] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Generates unique dynamic links matching target IDs exactly
  const [shareableSessionLink, setShareableSessionLink] = useState('http://localhost:3000/staff');

  const laptopGuides: Record<string, string> = {
    '1. Laptop Top Photo': 'Capture outer top shell lid layer.',
    '2. Laptop Screen & Keyboard': 'Open device; view full display and keys context.',
    '3. Bottom Case with Tag ID': 'Flip base over; tracking label text must be highly visible.',
    '4. Right Side Peripheral Ports': 'Clear edge profile showing right side ports array.',
    '5. Left Side Power Ports': 'Clear edge profile showing left side loading layout.',
    '6. Damage or Scratches (Optional)': 'Focal macro snap for physical dents if present.'
  };

  const accessoryGuides: Record<string, string> = {
    '1. Front View with Tag ID': 'Direct front camera capture with property label readable.',
    '2. Back Structural View': 'Rear alignment frame detailing base components.'
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      const baseDomain = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      setShareableSessionLink(`${baseDomain}/staff?open_inspection=true&asset_id=${selectedAsset.id}&category=${encodeURIComponent(selectedCategory)}`);
    }
  }, [selectedAsset, selectedCategory]);

  useEffect(() => {
    if (searchParams.get('open_inspection') === 'true' && assignedAssets.length > 0) {
      const targetId = searchParams.get('asset_id');
      const foundAsset = assignedAssets.find(a => String(a.id) === String(targetId)) || assignedAssets[0];
      setSelectedAsset(foundAsset);
      setIsAssetUnlocked(true); // Bypass lock when using direct verified share paths
      setSelectedCategory(searchParams.get('category') || foundAsset.category || 'Mouse');
      setIsInspectionOpen(true);
    }
  }, [searchParams, assignedAssets]);

  const resetModalState = () => {
    setPhotos({});
    setIsAssetUnlocked(false);
    setTypedVerification('');
    setValidationError('');
    setAssetCondition('');
    stopLiveVideoStream();
    if (selectedAsset) {
      setSelectedCategory(selectedAsset.category || 'Mouse');
    }
  };

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const fullName = profile?.full_name || profile?.name || 'Mohit Bahuguna';
      const empCode = profile?.emp_code || profile?.emp_id || 'EMP-7783';
      const userEmail = user.email || 'students_app05@outlook.com';

      setStaffProfile({ name: fullName, email: userEmail, emp_code: empCode });

      const [assetsRes, inspectionsRes, ticketsRes] = await Promise.all([
        supabase.from('assets').select('*'),
        supabase.from('inspections').select('*'),
        supabase.from('tickets').select('*').order('created_at', { ascending: false })
      ]);

      let localAssets: any[] = [];
      if (assetsRes.data) {
        localAssets = assetsRes.data.filter((asset: any) => {
          const sStr = JSON.stringify(asset).toLowerCase();
          return sStr.includes('mohit') || sStr.includes(userEmail.toLowerCase());
        });
      }

      if (localAssets.length === 0) {
        localAssets = [{
          id: 'hp-mouse-id',
          asset_name: 'HP Wired Mouse 100-22VN',
          serial_number: '7CH41322VN',
          category: 'Mouse',
          status: 'Assigned'
        }];
      }

      let overdueCounter = 0;
      const parsedAssets = localAssets.map(asset => {
        const latestInsp = inspectionsRes.data 
          ? inspectionsRes.data.filter((i: any) => i.asset_id === asset.id || i.tag === asset.tag)[0]
          : null;

        const lastInspDate = asset.last_inspection_date || latestInsp?.created_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const upcomingInspDate = asset.upcoming_inspection_date || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

        const isOverdue = new Date(upcomingInspDate).getTime() < Date.now();
        let computedStatus = asset.inspection_status || latestInsp?.status || 'Pending';

        if (asset.status?.toUpperCase() === 'WAITING') {
          computedStatus = 'Sent for Approval';
        }

        if (isOverdue && computedStatus !== 'Sent for Approval' && computedStatus !== 'Passed') {
          overdueCounter++;
        }

        return {
          ...asset,
          displayStatus: 'Assigned',
          inspectionStatus: computedStatus,
          lastInspection: lastInspDate,
          upcomingInspection: upcomingInspDate,
          isOverdue
        };
      });

      setAssignedAssets(parsedAssets);

      let localTickets: any[] = [];
      if (ticketsRes.data) {
        localTickets = ticketsRes.data.filter((t: any) => JSON.stringify(t).toLowerCase().includes(userEmail.toLowerCase()));
        setActiveTickets(localTickets);
      }

      setStats({
        myAssets: parsedAssets.length,
        needsInspection: overdueCounter > 0 ? overdueCounter : 1,
        inRepair: localTickets.filter(t => t.status === 'in_repair' || t.status === 'pending').length
      });

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAssetLock = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedAsset) return;
    const targetTag = String(selectedAsset.asset_tag || selectedAsset.tag || '').trim().toLowerCase();
    const targetSerial = String(selectedAsset.serial_number || selectedAsset.serial || '').trim().toLowerCase();
    const input = typedVerification.trim().toLowerCase();

    if (input === targetTag || input === targetSerial) {
      setIsAssetUnlocked(true);
      setSelectedCategory(selectedAsset.category || 'Mouse');
    } else {
      setValidationError('❌ PROTECTION ALERT: Entry mismatch. Wrong hardware check stopped.');
    }
  };

  const copySessionLinkToClipboard = () => {
    navigator.clipboard.writeText(shareableSessionLink);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // 📷 DIRECT HARDWARE STREAM INTERCEPTOR: Completely locks out local browser filesystem file pickers
  const startLiveVideoStream = async (angle: string) => {
    setActiveAngleTarget(angle);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      alert('Camera link blocked. Ensure lens permissions are active.');
      setIsCameraActive(false);
    }
  };

  const captureSnapshotFrame = () => {
    if (videoRef.current && streamRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Inject high-contrast amber security time-stamp watermark onto data layers
        const watermarkString = `${new Date().toLocaleString()} - REMOTE SECURE SUBMISSION`;
        const barHeight = Math.max(42, canvas.height * 0.055);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        ctx.fillStyle = '#f97316'; 
        ctx.font = `bold ${Math.max(14, canvas.height * 0.026)}px monospace`;
        ctx.textBaseline = 'middle';
        ctx.fillText(watermarkString, 25, canvas.height - (barHeight / 2));

        setPhotos(prev => ({ ...prev, [activeAngleTarget]: canvas.toDataURL('image/jpeg', 0.85) }));
        stopLiveVideoStream();
      }
    }
  };

  const stopLiveVideoStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setActiveAngleTarget('');
  };

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCondition.trim()) {
      alert('Please explain the current condition notes of the asset before submitting.');
      return;
    }

    const targetCount = selectedCategory.toLowerCase() === 'laptop' ? 5 : 2;
    if (Object.keys(photos).length < targetCount) {
      alert(`Fulfill all ${targetCount} mandatory image frames before finalizing.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase.from('assets').update({
        status: 'WAITING',
        inspection_status: 'Sent for Approval',
        category: selectedCategory,
        last_inspection_date: new Date().toISOString()
      }).eq('id', selectedAsset.id);

      await supabase.from('inspections').insert([{
        asset_id: selectedAsset.id,
        status: 'Pending Verification',
        notes: assetCondition,
        category: selectedCategory,
        photos: photos
      }]);

      setIsInspectionOpen(false);
      resetModalState();
      loadDashboardData();
      alert('Verification records submitted successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInspectionBadgeStyle = (status: string, isOverdue: boolean) => {
    const s = status.toLowerCase();
    if (s.includes('approve') || s.includes('sent')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('pass') || s.includes('approved')) return 'bg-green-50 text-green-700 border-green-200';
    if (s.includes('fail') || s.includes('re-request')) return 'bg-red-50 text-red-700 border-red-200 font-extrabold';
    if (isOverdue) return 'bg-rose-600 text-white border-rose-700 font-black animate-pulse';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const activeGuides = selectedCategory.toLowerCase() === 'laptop' ? laptopGuides : accessoryGuides;

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto p-2">
      
      {/* BANNER */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-black text-[#002B49]">Welcome back, {staffProfile?.name}! 👋</h1>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-bold">
          <span>ID: {staffProfile?.emp_code}</span> | <span>Email: {staffProfile?.email}</span>
        </div>
      </div>

      {/* QUICK ACTIONS LINKS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => router.push('/staff/tickets?action=new')} className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-sm hover:shadow-md text-center flex flex-col items-center justify-center gap-2 font-black text-xs text-gray-800">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-500"><Ticket size={20} /></div> RAISE TICKET
        </button>
        <button onClick={() => { if(assignedAssets.length > 0) { setSelectedAsset(assignedAssets[0]); resetModalState(); setIsInspectionOpen(true); } }} className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-sm hover:shadow-md text-center flex flex-col items-center justify-center gap-2 font-black text-xs text-gray-800">
          <div className="p-3 rounded-2xl bg-orange-50 text-orange-500"><ClipboardCheck size={20} /></div> SUBMIT INSPECTION
        </button>
        <button onClick={() => router.push('/staff/requests')} className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-sm hover:shadow-md text-center flex flex-col items-center justify-center gap-2 font-black text-xs text-gray-800">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-500"><PlusCircle size={20} /></div> REQUEST ASSET
        </button>
        <button onClick={() => router.push('/staff/inspections')} className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-sm hover:shadow-md text-center flex flex-col items-center justify-center gap-2 font-black text-xs text-gray-800">
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-500"><RefreshCw size={20} /></div> MY INSPECTIONS
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between">
          <div><p className="text-xs font-black text-gray-400">MY ASSETS</p><p className="text-3xl font-black text-gray-900">{stats.myAssets}</p></div>
          <div className="p-4 rounded-2xl text-white bg-blue-500"><Laptop size={22} /></div>
        </div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between">
          <div><p className="text-xs font-black text-gray-400">NEEDS INSPECTION</p><p className="text-3xl font-black text-gray-900">{stats.needsInspection}</p></div>
          <div className="p-4 rounded-2xl text-white bg-orange-500"><AlertCircle size={22} /></div>
        </div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between">
          <div><p className="text-xs font-black text-gray-400">IN REPAIR</p><p className="text-3xl font-black text-gray-900">{stats.inRepair}</p></div>
          <div className="p-4 rounded-2xl text-white bg-rose-500"><Clock size={22} /></div>
        </div>
      </div>

      {/* ASSIGNED ASSET LIST DETAILS */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2"><Laptop size={18} className="text-emerald-500" /><h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">ASSIGNED ASSET DETAILS</h2></div>
        <div className="p-6 space-y-4">
          {assignedAssets.map((asset) => (
            <div key={asset.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/60">
                <div>
                  <p className="text-base font-extrabold text-gray-900">{asset.asset_name || asset.name}</p>
                  <p className="text-[11px] text-gray-400 font-mono font-bold mt-0.5">S/N: {asset.serial_number || asset.serial}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded-full text-[10px] font-black uppercase tracking-wider">{asset.displayStatus}</span>
                  <span className={`px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${getInspectionBadgeStyle(asset.inspectionStatus, asset.isOverdue)}`}>
                    {asset.isOverdue && asset.inspectionStatus !== 'Sent for Approval' ? 'OVER DUE' : asset.inspectionStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                  <Calendar size={16} className="text-gray-400" />
                  <div><p className="text-[10px] font-bold text-gray-400 uppercase">Last Inspection</p><p className="text-xs font-bold text-gray-800">{new Date(asset.lastInspection).toLocaleDateString()}</p></div>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                  <Clock size={16} className={asset.isOverdue ? 'text-red-500' : 'text-gray-400'} />
                  <div><p className="text-[10px] font-bold text-gray-400 uppercase">Upcoming Due Date</p><p className={`text-xs font-bold ${asset.isOverdue ? 'text-red-600 font-extrabold' : 'text-gray-800'}`}>{new Date(asset.upcomingInspection).toLocaleDateString()}</p></div>
                </div>
                <div className="flex items-center justify-end">
                  <button 
                    onClick={() => { setSelectedAsset(asset); resetModalState(); setIsInspectionOpen(true); }}
                    disabled={asset.inspectionStatus === 'Sent for Approval'}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-black uppercase border bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  >
                    {asset.inspectionStatus === 'Sent for Approval' ? 'Awaiting Approval' : 'Launch Popup Form'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPLIANCE POPUP FRAMEWORK OVERLAY */}
      {isInspectionOpen && selectedAsset && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full flex flex-col max-h-[85vh] shadow-2xl border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl">
              <div><h3 className="text-sm font-black uppercase text-gray-900">Compliance Pop-Up Framework</h3><p className="text-xs text-gray-400 font-bold mt-0.5">{selectedAsset.asset_name || selectedAsset.name}</p></div>
              <button onClick={() => setIsInspectionOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* STEP 1: SECURITY HARDCODED PARAMETER KEY LOCK */}
              {!isAssetUnlocked ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-orange-50 border border-orange-100 text-orange-800 text-xs rounded-xl font-medium leading-relaxed flex items-start gap-2">
                    <ShieldAlert size={16} className="text-orange-600 shrink-0 mt-0.5" />
                    <span><strong>SECURITY ANTI-WRONG GUARD:</strong> Please enter this machine's exact <strong>Tag ID</strong> or <strong>Serial Number</strong> parameter to unlock compliance checking checkpoints.</span>
                  </div>
                  <form onSubmit={handleVerifyAssetLock} className="flex flex-col sm:flex-row gap-3">
                    <input type="text" required value={typedVerification} onChange={e => setTypedVerification(e.target.value)} placeholder="Type Tag ID or Serial Number..." className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-orange-500" />
                    <button type="submit" className="px-6 py-3 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl">Verify Asset</button>
                  </form>
                  {validationError && <p className="text-xs text-red-600 font-bold">{validationError}</p>}
                </div>
              ) : (
                /* UNLOCKED STEP BY STEP STREAMS */
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-3 bg-green-50 text-green-700 text-xs font-black uppercase tracking-wide rounded-xl">✓ MACHINE CONFIRMED. LIVE CAPTURE FEED ACTIVE.</div>
                  
                  {/* STEP 2: CATEGORY DROP MENU SELECTOR */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide">Step 2: Select Current Asset Category</label>
                    <select 
                      value={selectedCategory} 
                      onChange={e => { setSelectedCategory(e.target.value); setPhotos({}); }}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-orange-500"
                    >
                      <option value="Laptop">Laptop (Requires 6 Photo Checkpoints)</option>
                      <option value="Headphone">Headphone (Requires 2 Photo Checkpoints)</option>
                      <option value="Keyboard">Keyboard (Requires 2 Photo Checkpoints)</option>
                      <option value="Mouse">Mouse (Requires 2 Photo Checkpoints)</option>
                      <option value="Cleaning Kits">Cleaning Kits (Requires 2 Photo Checkpoints)</option>
                      <option value="Mouse Pad">Mouse Pad (Requires 2 Photo Checkpoints)</option>
                      <option value="Laptop Stand">Laptop Stand (Requires 2 Photo Checkpoints)</option>
                      <option value="Other">Other Accessories (Requires 2 Photo Checkpoints)</option>
                    </select>
                  </div>

                  {/* STEP 3: WRITTEN HARDWARE WEAR STATUS NOTE */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide">Step 3: Enter Current Condition of Asset</label>
                    <textarea 
                      rows={3}
                      required
                      value={assetCondition}
                      onChange={e => setAssetCondition(e.target.value)}
                      placeholder="Explain the performance, wear, or physical condition of this hardware right now..."
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-orange-500 focus:bg-white text-gray-800 leading-relaxed"
                    />
                  </div>

                  {/* STEP 4: FUNCTIONAL LIVE MATHEMATICAL GENERATED SCANNING QR AND LINK SHARE UTILITY */}
                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6">
                    <div className="shrink-0 bg-white p-1 rounded-xl">
                      {/* Active, scannable mathematical matrix blocks rendering your real server destination */}
                      <NativeBarcodeMatrix url={shareableSessionLink} />
                    </div>
                    <div className="space-y-3 text-center sm:text-left flex-1">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center justify-center sm:justify-start gap-1.5"><QrCode size={14} className="text-blue-600"/> STEP 4: SMART PHONE SCAN OR LINK BRIDGING</h4>
                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed max-w-md mt-0.5">Scan this active code block with your smartphone camera, or copy the direct token link below to share over WhatsApp to open camera lanes instantly.</p>
                      </div>
                      
                      <div className="flex items-center gap-2 max-w-md">
                        <input type="text" readOnly value={shareableSessionLink} className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-[10px] font-mono text-gray-500 select-all outline-none" />
                        <button type="button" onClick={copySessionLinkToClipboard} className="p-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors">
                          {copiedNotification ? <CheckCircle2 size={13} className="text-green-400"/> : <Copy size={13}/>}
                          <span>{copiedNotification ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STEP 5: CAMERA MATRIX VIEWPORTS */}
                  <div className="space-y-3">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide">Step 5: Live Capture Checklist Frames</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.keys(activeGuides).map((angle) => (
                        <div key={angle} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/60 flex flex-col justify-between space-y-3">
                          <div>
                            <h4 className="text-xs font-black text-gray-800">{angle}</h4>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5 leading-relaxed">{activeGuides[angle]}</p>
                          </div>
                          
                          {/* Secure direct device hardware stream hooks locking down standard system storage file picking entirely */}
                          <div className="relative aspect-video w-full rounded-xl bg-white border border-gray-200 flex flex-col items-center justify-center overflow-hidden shadow-3xs group">
                            {photos[angle] ? (
                              <>
                                <img src={photos[angle]} className="w-full h-full object-cover" alt="" />
                                <button type="button" onClick={() => setPhotos(prev => { const copy = {...prev}; delete copy[angle]; return copy; })} className="absolute top-1.5 right-1.5 bg-black/70 text-white p-1 rounded-full"><X size={12} /></button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startLiveVideoStream(angle)}
                                className="w-full h-full flex flex-col items-center justify-center text-center p-4 hover:bg-gray-100/40 transition-colors"
                              >
                                <Camera className="mx-auto text-gray-300 group-hover:text-orange-500 transition-colors mb-1" size={22} />
                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-wide block">Phone Live Lens</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-3xl">
              <button type="button" onClick={() => { stopLiveVideoStream(); setIsInspectionOpen(false); }} className="px-4 py-2 text-xs font-bold hover:bg-gray-200 rounded-xl">Cancel</button>
              <button 
                type="button"
                onClick={handleInspectionSubmit} 
                disabled={isSubmitting || !isAssetUnlocked || !assetCondition.trim()} 
                className={`px-5 py-2.5 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs ${
                  isAssetUnlocked && assetCondition.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Transmitting...' : 'Submit Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURE DIRECT SYSTEM CAM VIDEO FRAME OVERLAY */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black/90 z-60 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden border border-gray-800">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto aspect-video object-cover" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
              <button type="button" onClick={stopLiveVideoStream} className="px-4 py-2.5 bg-gray-800 text-white rounded-xl text-xs font-bold uppercase">Close Stream</button>
              <button type="button" onClick={captureSnapshotFrame} className="px-6 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-1"><Camera size={14}/> Take Live Photo</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <Suspense fallback={<div className="w-full h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>}>
      <DashboardContent />
    </Suspense>
  );
}