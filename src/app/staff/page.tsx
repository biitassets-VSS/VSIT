'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, CheckCircle2, Camera, ArrowLeft, Trash2, 
  MessageSquare, ShieldAlert, Send, Ticket, PlusCircle, 
  Timer, PauseCircle, MonitorUp, ImagePlus
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

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

interface StaffTicket {
  id: string;
  title: string;
  status: 'Open' | 'In Progress' | 'Hold' | 'Resolved';
  estimatedTime?: string;
}

interface StaffUser {
  name: string;
  empCode: string;
  email: string;
  id?: string;
}

const laptopPhotoRequirements = [
  "Top side", "Display and Keyboard", "Right Side port", "Left Side port", "Back side with Tag id Sticker"
];
const standardPhotoRequirements = [
  "Front View / Main Photo", "Back side with Tag id Sticker"
];

export default function StaffDashboardPage() {
  const [staffUser, setStaffUser] = useState<StaffUser>({ name: 'Loading...', empCode: '...', email: '' });
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [activeTickets, setActiveTickets] = useState<StaffTicket[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [viewState, setViewState] = useState<'dashboard' | 'inspecting' | 'raising_ticket' | 'requesting_asset'>('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ticketForm, setTicketForm] = useState({ title: '', category: 'Hardware', priority: 'Medium', description: '' });
  const [ticketPhoto, setTicketPhoto] = useState<string | null>(null);

  const [assetRequestForm, setAssetRequestForm] = useState({ category: 'Mouse', reason: '' });

  useEffect(() => {
    const loadUserAndData = async () => {
      const userEmail = localStorage.getItem('userEmail');
      const userRole = localStorage.getItem('userRole');

      if (!userEmail) {
        setIsLoaded(true);
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles') 
          .select('*') 
          .eq('email', userEmail)
          .maybeSingle(); 

        if (profileError) console.error("Supabase Error:", profileError);

        const currentUser = { 
          name: profileData?.full_name || profileData?.name || profileData?.first_name || 'Staff Member', 
          empCode: profileData?.emp_code || profileData?.employee_code || profileData?.emp_id || 'N/A', 
          email: profileData?.email || userEmail,
          id: profileData?.id
        };

        localStorage.setItem('userName', currentUser.name);
        window.dispatchEvent(new Event('storage'));
        setStaffUser(currentUser);

        if (currentUser.empCode !== 'N/A' && userRole !== 'guest') {
          const [assetRes, ticketRes] = await Promise.all([
            supabase.from('assets').select('*').eq('emp_code', currentUser.empCode),
            supabase.from('tickets').select('*').eq('emp_code', currentUser.empCode).order('created_at', { ascending: false })
          ]);

          if (assetRes.data) {
            setAssets(assetRes.data.map((a: any) => ({
              id: a.id,
              tagId: a.tag_id || a.tagId,
              name: a.name,
              category: a.category,
              status: a.status,
              inspectionStatus: a.inspection_status || 'Due',
              adminFeedback: a.inspection_notes || ''
            })));
          }

          if (ticketRes.data) {
            setActiveTickets(ticketRes.data.map((t: any) => ({
              id: t.id,
              title: t.title,
              status: t.status || 'Open',
              estimatedTime: t.estimated_time
            })));
          }
        }
      } catch (err) {
        console.error("Data fetch error", err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadUserAndData();
  }, []);

  // --- Handlers ---
  const openInspection = (asset: AssignedAsset) => {
    setSelectedAsset(asset);
    setPhotos({});
    setNotes('');
    setViewState('inspecting');
  };

  const handleTicketPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setTicketPhoto(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitTicket = async () => {
    if (!ticketForm.title || !ticketForm.description) return alert("Please fill in all fields.");
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.from('tickets').insert([{
        title: ticketForm.title,
        description: ticketForm.description,
        category: ticketForm.category,
        priority: ticketForm.priority,
        status: 'Open',
        submitted_by: staffUser.name,
        emp_code: staffUser.empCode,
        screenshot: ticketPhoto 
      }]).select();

      if (error) throw error;
      setViewState('dashboard');
      setTicketForm({ title: '', category: 'Hardware', priority: 'Medium', description: '' });
      setTicketPhoto(null);
      alert('Ticket raised successfully!');
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAssetRequest = async () => {
    if (!assetRequestForm.reason) return alert("Please provide a reason.");
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('tickets').insert([{
        title: `Asset Request: ${assetRequestForm.category}`,
        description: `Reason: ${assetRequestForm.reason}`,
        category: 'Hardware Request',
        priority: 'Medium',
        status: 'Open',
        submitted_by: staffUser.name,
        emp_code: staffUser.empCode
      }]);

      if (error) throw error;
      setViewState('dashboard');
      setAssetRequestForm({ category: 'Mouse', reason: '' });
      alert('Asset request submitted!');
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitInspection = async () => {
    if (!selectedAsset) return;
    const requiredLabels = selectedAsset.category.toLowerCase().includes('laptop') ? laptopPhotoRequirements : standardPhotoRequirements;
    const missingPhotos = requiredLabels.filter(label => !photos[label]);
    
    if (missingPhotos.length > 0) {
      alert(`Please upload missing photos:\n- ${missingPhotos.join('\n- ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: inspectError } = await supabase.from('inspections').insert([{
        asset_id: selectedAsset.id,
        submitted_by: staffUser.name,
        emp_code: staffUser.empCode,
        status: 'Pending',
        notes: notes,
        photos: photos
      }]);

      if (inspectError) throw inspectError;

      await supabase.from('assets').update({ inspection_status: 'Pending Approval' }).eq('id', selectedAsset.id);
      
      alert('Inspection submitted!');
      setViewState('dashboard');
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let width = img.width, height = img.height;
        const MAX_DIMENSION = 1200;
        if (width > height && width > MAX_DIMENSION) { height = Math.round((height * MAX_DIMENSION) / width); width = MAX_DIMENSION; }
        else if (height > MAX_DIMENSION) { width = Math.round((width * MAX_DIMENSION) / height); height = MAX_DIMENSION; }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        setPhotos(prev => ({ ...prev, [label]: canvas.toDataURL('image/jpeg', 0.85) }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (label: string) => setPhotos(prev => { const p = { ...prev }; delete p[label]; return p; });

  const isLaptop = selectedAsset?.category?.toLowerCase().includes('laptop');
  const requiredLabels = isLaptop ? laptopPhotoRequirements : standardPhotoRequirements;

  if (!isLoaded) return <div className="p-10 text-center font-bold text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 sm:px-0">
      {viewState === 'dashboard' && (
        <>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Welcome, {staffUser.name} 👋</h1>
              <p className="text-sm font-bold text-gray-500 mt-1">{staffUser.email}</p>
            </div>
            <div className="bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">Emp Code</span>
              <span className="text-lg font-black text-teal-900">{staffUser.empCode}</span>
            </div>
          </div>
          {/* ... [Rest of your UI remains identical] ... */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setViewState('raising_ticket')} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors text-left group">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                <Ticket size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-[15px]">Raise IT Ticket</h3>
                <p className="text-xs font-bold text-gray-500 mt-0.5">Report a broken device or software issue</p>
              </div>
            </button>
            <button onClick={() => setViewState('requesting_asset')} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-left group">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                <PlusCircle size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-[15px]">Request New Asset</h3>
                <p className="text-xs font-bold text-gray-500 mt-0.5">Need a mouse, keyboard, or monitor?</p>
              </div>
            </button>
          </div>
          {/* ... [Rest of components] ... */}
        </>
      )}
      {/* ... [Rest of viewStates] ... */}
    </div>
  );
}