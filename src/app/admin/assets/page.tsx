'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PackageSearch, Plus, Search, Filter, Edit, 
  Trash2, X, Loader2, CheckCircle2, AlertCircle, Laptop, 
  Settings, Upload, Download, Eye, Camera, ShieldCheck, ClipboardCheck,
  ArrowLeft, Wrench, UserMinus, XOctagon, UserPlus, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface Asset {
  id: string;
  tag_id: string;
  name: string;
  brand: string;
  category: string;
  serial_number: string;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Retired';
  emp_code: string | null;
  staff_name?: string;
  created_at: string;
  price?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  asset_condition?: string;
  inspection_status?: string;
  inspection_notes?: string;
  photos?: string[];
  updated_at?: string;
}

interface StaffMember {
  emp_code: string;
  name: string;
}

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // View States
  const [viewState, setViewState] = useState<'list' | 'form' | 'detail'>('list');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // --- ADDED MISSING STATE HOOKS ---
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    tag_id: '', name: '', brand: '', category: '', serial_number: '', 
    status: 'Available', emp_code: '',
    price: '', purchase_date: '', warranty_expiry: '', asset_condition: 'Brand New', condition_notes: ''
  });
  
  // Inspection Form States
  const [inspectNotes, setInspectNotes] = useState('');
  const [inspectStatus, setInspectStatus] = useState('Good');
  const [inspectPhotos, setInspectPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = [
    'Laptop', 'Mouse', 'Keyboards', 'Wire Combo Kits', 
    'Wireless Combo Kits', 'Headphone', 'Stand', 
    'Mobile Phone', 'Cleaning Kits', 'EXT Ports'
  ];
  
  const CONDITIONS = ['Brand New', 'Good', 'Fair', 'Poor', 'Damaged'];
  const STATUSES = ['Available', 'Assigned', 'Maintenance', 'Retired'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: staffData } = await supabase.from('staff').select('emp_code, name');
      let staffMap: Record<string, string> = {};
      if (staffData) {
        setStaffList(staffData);
        staffData.forEach((s: any) => staffMap[s.emp_code] = s.name);
      }

      const { data: assetData, error } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (assetData) {
        setAssets(assetData.map((a: any) => ({
          ...a,
          staff_name: a.emp_code ? (staffMap[a.emp_code] || 'Unknown Staff') : 'Unassigned',
          photos: a.photos || []
        })));
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    const prefixes: Record<string, string> = {
      'Laptop': 'LAP', 'Mouse': 'MOU', 'Keyboards': 'KEY',
      'Wire Combo Kits': 'WCK', 'Wireless Combo Kits': 'WLC',
      'Headphone': 'HDP', 'Stand': 'STN', 'Mobile Phone': 'MOB',
      'Cleaning Kits': 'CLK', 'EXT Ports': 'EXT'
    };
    const prefix = prefixes[cat] || 'AST';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setFormData({ ...formData, category: cat, tag_id: `${prefix}-${randomNum}` });
  };

  const handleOpenAddForm = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        tag_id: asset.tag_id, name: asset.name, brand: asset.brand || '', category: asset.category, 
        serial_number: asset.serial_number || '', status: asset.status, emp_code: asset.emp_code || '',
        price: asset.price || '', purchase_date: asset.purchase_date || '', 
        warranty_expiry: asset.warranty_expiry || '', asset_condition: asset.asset_condition || 'Good',
        condition_notes: asset.inspection_notes || ''
      });
    } else {
      setEditingAsset(null);
      setFormData({
        tag_id: '', name: '', brand: '', category: '', serial_number: '', status: 'Available', emp_code: '',
        price: '', purchase_date: '', warranty_expiry: '', asset_condition: 'Brand New', condition_notes: ''
      });
    }
    setViewState('form');
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.category) return alert("Please select a category.");
    
    setIsSubmitting(true);
    const payload = {
      tag_id: formData.tag_id, name: formData.name, brand: formData.brand, category: formData.category,
      serial_number: formData.serial_number, status: formData.status, 
      emp_code: formData.status === 'Assigned' ? formData.emp_code : null,
      price: formData.price, purchase_date: formData.purchase_date,
      warranty_expiry: formData.warranty_expiry, asset_condition: formData.asset_condition,
      inspection_notes: formData.condition_notes
    };

    try {
      if (editingAsset) {
        await supabase.from('assets').update(payload).eq('id', editingAsset.id);
        alert("Asset updated successfully!");
      } else {
        await supabase.from('assets').insert([payload]);
        alert("New asset added successfully!");
      }
      setViewState('list');
      fetchData();
    } catch (error: any) {
      alert("Error saving asset: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (newStatus: string) => {
    if (!selectedAsset) return;
    if (!confirm(`Are you sure you want to mark this asset as ${newStatus}?`)) return;
    
    setIsSubmitting(true);
    try {
      const isUnassigning = newStatus === 'Available' || newStatus === 'Maintenance' || newStatus === 'Retired';
      const newEmpCode = isUnassigning ? null : selectedAsset.emp_code;

      await supabase.from('assets').update({ 
        status: newStatus, 
        emp_code: newEmpCode 
      }).eq('id', selectedAsset.id);
      
      alert(`Asset successfully updated to ${newStatus}!`);
      
      setSelectedAsset(prev => prev ? {
        ...prev, 
        status: newStatus as any, 
        emp_code: newEmpCode,
        staff_name: isUnassigning ? 'Unassigned' : prev.staff_name
      } : null);
      
      setIsAssigning(false);
      fetchData();
    } catch (error: any) {
      alert("Error updating status: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignAsset = async (empCode: string) => {
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      await supabase.from('assets').update({
        status: 'Assigned',
        emp_code: empCode
      }).eq('id', selectedAsset.id);

      const staffName = staffList.find(s => s.emp_code === empCode)?.name || 'Unknown';
      
      setSelectedAsset(prev => prev ? {
        ...prev,
        status: 'Assigned',
        emp_code: empCode,
        staff_name: staffName
      } : null);

      setIsAssigning(false);
      setAssignSearch('');
      fetchData();
      alert("Asset successfully assigned!");
    } catch (error: any) {
      alert("Error assigning asset: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to completely delete ${name}?`)) {
      try {
        await supabase.from('assets').delete().eq('id', id);
        setAssets(assets.filter(a => a.id !== id));
      } catch (error: any) { alert("Error deleting asset: " + error.message); }
    }
  };

  const openAssetDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setInspectPhotos([]);
    setInspectNotes('');
    setInspectStatus('Good');
    setIsAssigning(false);
    setAssignSearch('');
    setViewState('detail');
  };

  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,brand,category,tag_id,serial_number,status,price,purchase_date,warranty_expiry,asset_condition\nDell XPS 15,Dell,Laptop,LAP-1001,SN123456,Available,85000,2023-01-15,2026-01-15,Brand New\nLogitech MX Master,Logitech,Mouse,MOU-2001,,Available,1500,,,Good";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Asset_Bulk_Upload_Sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSubmitting(true);
    try {
      const text = await file.text();
      const rows = text.split('\n').slice(1);
      const payload = rows.filter(r => r.trim() !== '').map(row => {
        const [name, brand, category, tag_id, serial_number, status, price, purchase_date, warranty_expiry, asset_condition] = row.split(',');
        return { 
          name, brand, category, tag_id, serial_number, status: status || 'Available',
          price, purchase_date, warranty_expiry, asset_condition: asset_condition || 'Brand New'
        };
      });
      if (payload.length > 0) {
        await supabase.from('assets').insert(payload);
        alert(`${payload.length} assets uploaded successfully!`);
        setIsBulkModalOpen(false);
        fetchData();
      }
    } catch (err: any) { alert("Error uploading file: Please ensure CSV format is correct."); }
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
        inspection_status: inspectStatus,
        inspection_notes: inspectNotes,
        photos: inspectPhotos,
        updated_at: new Date().toISOString()
      }).eq('id', selectedAsset.id);
      
      alert("Inspection Updated Successfully!");
      setViewState('list');
      fetchData();
    } catch(err:any) { alert("Error: " + err.message); }
    finally { setIsSubmitting(false); }
  };

  // ... [Keep your JSX for "list", "form", and "detail" views as developed] ...

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      {/* ... [Rest of your UI code goes here] ... */}
    </div>
  );
}