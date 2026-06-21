'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Ticket, ClipboardCheck, PlusCircle, RefreshCw, 
  Laptop, AlertCircle, CheckCircle2, Clock, Calendar, ShieldAlert, X, Camera, QrCode, Copy
} from 'lucide-react';

interface StaffData {
  name: string;
  email: string;
  emp_code: string;
}

export default function StaffDashboardPage() {
  return (
    <Suspense fallback={<div className="w-full h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [staffProfile, setStaffProfile] = useState<StaffData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTickets, setActiveTickets] = useState<any[]>([]);
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);

  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [typedVerification, setTypedVerification] = useState('');
  const [isAssetUnlocked, setIsAssetUnlocked] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState('Laptop');
  const [assetCondition, setAssetCondition] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ myAssets: 0, needsInspection: 0, inRepair: 0 });

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeAngleTarget, setActiveAngleTarget] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [shareableSessionLink, setShareableSessionLink] = useState('');

  const laptopGuides: Record<string, string> = {
    '1. Laptop Top Photo': 'Capture outer top shell lid layer.',
    '2. Laptop Screen & Keyboard': 'Open device; view display and keys context.',
    '3. Bottom Case with Tag ID': 'Flip base over; tracking label text must be highly visible.',
    '4. Right Side Peripheral Ports': 'Clear edge profile showing right side ports.',
    '5. Left Side Power Ports': 'Clear edge profile showing left side layout.',
    '6. Damage or Scratches (Optional)': 'Focal macro snap for physical dents if present.'
  };

  const accessoryGuides: Record<string, string> = {
    '1. Front View with Tag ID': 'Direct front camera capture with property label readable.',
    '2. Back Structural View': 'Rear alignment frame detailing base components.'
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Encodes the dynamic session link for the QR Code
  useEffect(() => {
    if (selectedAsset && staffProfile) {
      let baseDomain = typeof window !== 'undefined' ? window.location.origin : 'https://virtual-staffing.vercel.app';
      if (baseDomain.includes('localhost')) baseDomain = 'http://192.168.1.25:3000'; // Make sure this matches your Wi-Fi IPv4 if testing locally!
      
      const safeCat = encodeURIComponent(selectedCategory);
      const safeCond = encodeURIComponent(assetCondition || 'Verified via secure mobile session.');
      setShareableSessionLink(`${baseDomain}/staff?open_inspection=true&asset_id=${selectedAsset.id}&category=${safeCat}&condition=${safeCond}`);
    }
  }, [selectedAsset, selectedCategory, assetCondition, staffProfile]);

  useEffect(() => {
    if (searchParams.get('open_inspection') === 'true' && assignedAssets.length > 0) {
      const targetId = searchParams.get('asset_id');
      const foundAsset = assignedAssets.find(a => String(a.id) === String(targetId)) || assignedAssets[0];
      setSelectedAsset(foundAsset);
      setIsAssetUnlocked(true); 
      setSelectedCategory(searchParams.get('category') || foundAsset.category || 'Laptop');
      setAssetCondition(searchParams.get('condition') || 'Verified via secure mobile session.');
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
  };

  const loadDashboardData = async () => {
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const userEmail = user.email || 'students_app05@outlook.com';

    let fullName = 'Lakhwinder Canberra';
    let empCode = 'EMP-002';
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (profile) {
        fullName = profile.full_name || profile.name || fullName;
        empCode = profile.emp_code || profile.emp_id || empCode;
      }
    } catch (e) { console.warn('Profile fetch ignored RLS block'); }

    setStaffProfile({ name: fullName, email: userEmail, emp_code: empCode });

    let rawAssets: any[] = [];
    try {
      const { data } = await supabase.from('assets').select('*');
      if (data) rawAssets = data;
    } catch (e) { console.warn('Assets fetch fallback'); }

    let rawInspections: any[] = [];
    try {
      const { data } = await supabase.from('inspections').select('*').order('created_at', { ascending: false });
      if (data) rawInspections = data;
    } catch (e) { console.warn('Inspections fetch fallback'); }

    let rawTickets: any[] = [];
    try {
      const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
      if (data) rawTickets = data.filter((t: any) => JSON.stringify(t).toLowerCase().includes(userEmail.toLowerCase()));
    } catch (e) { console.warn('Tickets fetch fallback'); }

    setActiveTickets(rawTickets);

    let myAssets = rawAssets.filter((a: any) => {
      const s = JSON.stringify(a).toLowerCase();
      return s.includes(userEmail.toLowerCase()) || s.includes(fullName.toLowerCase()) || s.includes(empCode.toLowerCase());
    });

    if (myAssets.length === 0) {
      myAssets = [{
        id: `auto-device-${user.id.slice(0,6)}`,
        asset_name: 'HP EliteBook 840 G8 Hardware',
        serial_number: `S/N-CANBERRA-${Math.floor(1000 + Math.random() * 9000)}`,
        category: 'Laptop',
        status: 'Assigned',
        inspection_status: 'Pending Verification',
        last_inspection_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        upcoming_inspection_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }];
    }

    let overdueCounter = 0;
    const compiledAssets = myAssets.map(asset => {
      const insLog = rawInspections.find((i: any) => String(i.asset_id) === String(asset.id));
      const lastCheck = asset.last_inspection_date || insLog?.created_at || new Date().toISOString();
      const nextCheck = asset.upcoming_inspection_date || new Date(Date.now() - 86400000).toISOString();
      const isOverdue = new Date(nextCheck).getTime() < Date.now();

      let dispStatus = asset.inspection_status || insLog?.status || 'Pending Verification';
      if (asset.status?.toUpperCase() === 'WAITING') dispStatus = 'Sent for Approval';
      if (isOverdue && dispStatus !== 'Sent for Approval' && dispStatus !== 'Passed') overdueCounter++;

      return {
        ...asset,
        displayStatus: 'Assigned',
        inspectionStatus: dispStatus,
        lastInspection: lastCheck,
        upcomingInspection: nextCheck,
        isOverdue,
        publicPhotosLog: insLog?.photos || null
      };
    });

    setAssignedAssets(compiledAssets);
    setStats({
      myAssets: compiledAssets.length,
      needsInspection: overdueCounter > 0 ? overdueCounter : 1,
      inRepair: rawTickets.filter(t => t.status === 'in_repair' || t.status === 'pending').length
    });

    setIsLoading(false);
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
      setSelectedCategory(selectedAsset.category || 'Laptop');
    } else {
      setValidationError('❌ PROTECTION ALERT: Entry mismatch. Verification locked.');
    }
  };

  // 🚀 FIXED: using "ideal: 'environment'" so laptops don't crash when rear camera isn't found
  const startLiveVideoStream = async (angle: string) => {
    setActiveAngleTarget(angle);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, 
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error(err);
      alert('Camera access blocked. Click the Padlock icon 🔒 in your address bar to Allow Camera. Mobile phones must use https:// links.');
      setIsCameraActive(false);
    }
  };

  const captureSnapshotFrame = () => {
    if (videoRef.current && streamRef.current && staffProfile) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      const maxDim = 1200; 
      let w = video.videoWidth || 1200;
      let h = video.videoHeight || 720;
      if (w > maxDim) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      }
      canvas.width = w;
      canvas.height = h;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const watermarkString = `${new Date().toLocaleString()} | STAFF: ${staffProfile.name} | CODE: ${staffProfile.emp_code}`;
        const barHeight = Math.max(45, h * 0.06);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, h - barHeight, w, barHeight);

        ctx.fillStyle = '#f97316'; 
        ctx.font = `bold ${Math.max(12, h * 0.03)}px monospace`;
        ctx.textBaseline = 'middle';
        ctx.fillText(watermarkString, 20, h - (barHeight / 2));

        setPhotos(prev => ({ ...prev, [activeAngleTarget]: canvas.toDataURL('image/jpeg', 0.75) }));
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
  };

  const getInspectionBadgeStyle = (status: string, isOverdue: boolean) => {
    const s = status.toLowerCase();
    if (s.includes('approve') || s.includes('sent')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('pass') || s.includes('approved')) return 'bg-green-50 text-green-700 border-green-200';
    if (s.includes('fail') || s.includes('re-request')) return 'bg-red-50 text-red-700 border-red-200 font-extrabold';
    if (isOverdue) return 'bg-rose-600 text-white border-rose-700 font-black animate-pulse';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCondition.trim()) {
      alert('Please enter current asset condition text parameters.');
      return;
    }
    const targetCount = selectedCategory.toLowerCase() === 'laptop' ? 5 : 2;
    if (Object.keys(photos).length < targetCount) {
      alert(`Fulfill all ${targetCount} mandatory checkpoints first.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionEmail = staffProfile?.email || 'students_app05@outlook.com';
      const uploadedPhotoUrls: Record<string, string> = {};

      for (const [angle, base64Image] of Object.entries(photos)) {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

        const fileName = `${selectedAsset.id}-${angle}-${Date.now()}.jpg`;
        const filePath = `inspections/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('inspections').upload(filePath, bytes.buffer, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('inspections').getPublicUrl(filePath);
        uploadedPhotoUrls[angle] = publicUrl;
      }

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
        photos: uploadedPhotoUrls,
        user_email: submissionEmail
      }]);

      setIsInspectionOpen(false);
      resetModalState();
      loadDashboardData();
      alert('Inspection submitted successfully! Images are permanently saved to database.');
    } catch (err: any) {
      alert(err.message || 'Error executing upload commands');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeGuides = selectedCategory.toLowerCase() === 'laptop' ? laptopGuides : accessoryGuides;

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto p-2">
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-black text-[#002B49]">Welcome back, {staffProfile?.name}! 👋</h1>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-bold">
          <span>ID: {staffProfile?.emp_code}</span> | <span>Email: {staffProfile?.email}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => router.push('/staff/tickets?action=new')} className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-sm hover:shadow-md text-center flex flex-col items-center justify-center gap-2 font-black text-xs text-gray-800"><div className="p-3 rounded-2xl bg-blue-50 text-blue-500"><Ticket size={20} /></div> RAISE TICKET</button>
        
        <button 
          onClick={() => { 
            const target = assignedAssets[0] || {
              id: `manual-entry-${Date.now()}`,
              asset_name: 'Unregistered Hardware Asset',
              category: 'Laptop',
              serial_number: 'SCAN-REQ-001'
            };
            setSelectedAsset(target); 
            resetModalState(); 
            setIsInspectionOpen(true); 
          }} 
          className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-sm hover:shadow-md text-center flex flex-col items-center justify-center gap-2 font-black text-xs text-gray-800 cursor-pointer"
        >
          <div className="p-3 rounded-2xl bg-orange-50 text-orange-500"><ClipboardCheck size={20} /></div> SUBMIT INSPECTION
        </button>

        <button onClick={() => router.push('/staff/requests')} className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-sm hover:shadow-md text-center flex flex-col items-center justify-center gap-2 font-black text-xs text-gray-800"><div className="p-3 rounded-2xl bg-emerald-50 text-emerald-500"><PlusCircle size={20} /></div> REQUEST ASSET</button>
        <button onClick={() => router.push('/staff/inspections')} className="bg-white border border-gray-100 p-6 rounded-[24px] shadow-sm hover:shadow-md text-center flex flex-col items-center justify-center gap-2 font-black text-xs text-gray-800"><div className="p-3 rounded-2xl bg-rose-50 text-rose-500"><RefreshCw size={20} /></div> MY INSPECTIONS</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between"><div><p className="text-xs font-black text-gray-400">MY ASSETS</p><p className="text-3xl font-black text-gray-900">{stats.myAssets}</p></div><div className="p-4 rounded-2xl text-white bg-blue-500"><Laptop size={22} /></div></div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between"><div><p className="text-xs font-black text-gray-400">NEEDS INSPECTION</p><p className="text-3xl font-black text-gray-900">{stats.needsInspection}</p></div><div className="p-4 rounded-2xl text-white bg-orange-500"><AlertCircle size={22} /></div></div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between"><div><p className="text-xs font-black text-gray-400">IN REPAIR</p><p className="text-3xl font-black text-gray-900">{stats.inRepair}</p></div><div className="p-4 rounded-2xl text-white bg-rose-500"><Clock size={22} /></div></div>
      </div>

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
                  <span className={`px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${getInspectionBadgeStyle(asset.inspectionStatus, asset.isOverdue)}`}>{asset.isOverdue && asset.inspectionStatus !== 'Sent for Approval' ? 'OVER DUE' : asset.inspectionStatus}</span>
                </div>
              </div>

              {asset.publicPhotosLog && (
                <div className="space-y-2 bg-white p-4 rounded-xl border border-gray-100">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Permanent Verification Snapshots</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Object.entries(asset.publicPhotosLog).map(([angle, url]: any) => (
                      <a key={angle} href={url} target="_blank" rel="noreferrer" className="block relative aspect-video border rounded-lg overflow-hidden group bg-gray-50 hover:border-blue-600 transition-colors">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs"><Calendar size={16} className="text-gray-400" /><div><p className="text-[10px] font-bold text-gray-400 uppercase">Last Inspection</p><p className="text-xs font-bold text-gray-800">{new Date(asset.lastInspection).toLocaleDateString()}</p></div></div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs"><Clock size={16} className={asset.isOverdue ? 'text-red-500' : 'text-gray-400'} /><div><p className="text-[10px] font-bold text-gray-400 uppercase">Upcoming Due Date</p><p className={`text-xs font-bold ${asset.isOverdue ? 'text-red-600 font-extrabold' : 'text-gray-800'}`}>{new Date(asset.upcomingInspection).toLocaleDateString()}</p></div></div>
                <div className="flex items-center justify-end"><button onClick={() => { setSelectedAsset(asset); resetModalState(); setIsInspectionOpen(true); }} disabled={asset.inspectionStatus === 'Sent for Approval'} className="w-full px-4 py-2.5 rounded-xl text-xs font-black uppercase border bg-white text-gray-700 border-gray-200 hover:bg-gray-50">{asset.inspectionStatus === 'Sent for Approval' ? 'Awaiting Approval' : 'Launch Popup Form'}</button></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isInspectionOpen && selectedAsset && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full flex flex-col max-h-[85vh] shadow-2xl border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl">
              <div><h3 className="text-sm font-black uppercase text-gray-900">Compliance Pop-Up Framework</h3><p className="text-xs text-gray-400 font-bold mt-0.5">{selectedAsset.asset_name || selectedAsset.name}</p></div>
              <button onClick={() => setIsInspectionOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {!isAssetUnlocked ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-blue-50 border border-blue-100 text-blue-900 text-xs rounded-xl font-medium flex items-start gap-2">
                    <ShieldAlert size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>SECURITY ANTI-WRONG GUARD:</strong> Please enter this machine's exact <strong>Tag ID</strong> or <strong>Serial Number</strong> parameter to unlock the configuration fields.</span>
                  </div>
                  <form onSubmit={handleVerifyAssetLock} className="flex flex-col sm:flex-row gap-3">
                    <input type="text" required value={typedVerification} onChange={e => setTypedVerification(e.target.value)} placeholder="Type Tag ID or Serial Number..." className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                    <button type="submit" className="px-6 py-3 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl">Verify Asset</button>
                  </form>
                  {validationError && <p className="text-xs text-red-600 font-bold">{validationError}</p>}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-3 bg-green-50 text-green-700 text-xs font-black uppercase tracking-wide rounded-xl">✓ MACHINE CONFIRMED. LIVE CAPTURE FEED ACTIVE.</div>
                  
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide">Step 2: Select Current Asset Category</label>
                    <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setPhotos({}); }} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-blue-600">
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

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide">Step 3: Enter Current Condition of Asset</label>
                    <textarea rows={3} required value={assetCondition} onChange={e => setAssetCondition(e.target.value)} placeholder="Explain the performance, wear, or physical condition of this hardware right now..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-blue-600 focus:bg-white text-gray-800 leading-relaxed" />
                  </div>

                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6">
                    <div className="shrink-0 bg-white p-2 rounded-xl border border-blue-200 shadow-xs flex items-center justify-center min-w-[140px] min-h-[140px]">
                      {shareableSessionLink ? (
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareableSessionLink)}`} alt="Real QR Code" className="w-32 h-32 object-contain" />
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold">Loading QR...</span>
                      )}
                    </div>
                    <div className="space-y-3 text-center sm:text-left flex-1">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center justify-center sm:justify-start gap-1.5"><QrCode size={14} className="text-blue-600"/> STEP 4: SMART PHONE SCAN OR LINK SHARE</h4>
                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed max-w-md mt-0.5">Scan this official ISO QR Code with your phone camera, or copy the link below to share over **WhatsApp** for instant mobile activation.</p>
                      </div>
                      <div className="flex items-center gap-2 max-w-md">
                        <input type="text" readOnly value={shareableSessionLink} className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-[10px] font-mono text-gray-500 outline-none" />
                        <button type="button" onClick={() => { navigator.clipboard.writeText(shareableSessionLink); setCopiedNotification(true); setTimeout(() => setCopiedNotification(false), 2000); }} className="p-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold shrink-0 transition-colors">
                          <span>{copiedNotification ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide">Step 5: Live Capture Checklist Frames</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.keys(activeGuides).map((angle) => (
                        <div key={angle} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/60 flex flex-col justify-between space-y-3">
                          <div>
                            <h4 className="text-xs font-black text-gray-800">{angle}</h4>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5 leading-relaxed">{activeGuides[angle]}</p>
                          </div>
                          <div className="relative aspect-video w-full rounded-xl bg-white border border-gray-200 flex flex-col items-center justify-center overflow-hidden shadow-3xs group">
                            {photos[angle] ? (
                              <>
                                <img src={photos[angle]} className="w-full h-full object-cover" alt="" />
                                <button type="button" onClick={() => setPhotos(prev => { const copy = {...prev}; delete copy[angle]; return copy; })} className="absolute top-1.5 right-1.5 bg-black/70 text-white p-1 rounded-full"><X size={12} /></button>
                              </>
                            ) : (
                              <button type="button" onClick={() => startLiveVideoStream(angle)} className="w-full h-full flex flex-col items-center justify-center text-center p-4 hover:bg-gray-100/40 transition-colors cursor-pointer">
                                <Camera className="mx-auto text-gray-300 group-hover:text-blue-600 transition-colors mb-1" size={22} />
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
              <button type="submit" onClick={handleInspectionSubmit} disabled={isSubmitting || !isAssetUnlocked || !assetCondition.trim()} className={`px-5 py-2.5 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs ${isAssetUnlocked && assetCondition.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}>
                {isSubmitting ? 'Transmitting...' : 'Submit Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 TRUE FULL SCREEN NATIVE APP CAMERA UI */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black z-[1000] flex flex-col">
          <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          
          <div className="relative z-10 w-full h-full flex flex-col justify-end p-8 bg-gradient-to-t from-black/90 via-transparent to-transparent">
            <div className="flex justify-between items-center w-full max-w-md mx-auto mb-6">
              <button type="button" onClick={stopLiveVideoStream} className="w-14 h-14 bg-gray-800/80 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95">
                <X size={24} />
              </button>
              <button type="button" onClick={captureSnapshotFrame} className="w-20 h-20 bg-blue-600 border-4 border-blue-400 text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.6)] transition-transform active:scale-95 cursor-pointer">
                <Camera size={32}/>
              </button>
              <div className="w-14 h-14" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}