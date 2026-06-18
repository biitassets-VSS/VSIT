'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PackageSearch, Plus, UploadCloud, Search, 
  Filter, User, ArrowLeft, Download, 
  FileSpreadsheet, CheckCircle2, AlertCircle, Save,
  Printer, QrCode, FileText, Image as ImageIcon,
  DollarSign, Wrench, Hash, Trash2, UserMinus, X, Pencil
} from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';

interface Asset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: 'In Stock (Available)' | 'Assigned' | 'Maintenance' | 'Retired';
  assignedTo?: string;
  empCode?: string;
  serialNumber?: string;
  price?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  condition?: string;
  notes?: string;
  photos?: string[];
}

const CATEGORY_PREFIX_MAP: Record<string, string> = {
  'Laptop': 'LAP',
  'Monitor': 'MON',
  'Mouse': 'MOU',
  'Headphone': 'HDP',
  'Keyboard': 'KBD',
  'Wired Keyboard Combo': 'WKC',
  'Wireless Keyboard Combo': 'WMC',
  'Stand': 'STN',
  'Cleaning Kit': 'CLN',
  'Mobile Phone': 'MOB',
  'Other': 'OTH'
};

const MOCK_STAFF = [
  { empCode: 'EMP-1001', name: 'Aarav Patel' },
  { empCode: 'EMP-1042', name: 'Rahul Sharma' },
];

export default function AdminAssetsPage() {
  const [viewState, setViewState] = useState<'list' | 'add_single' | 'edit_asset' | 'bulk_upload' | 'print_tags' | 'view_details'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [printCategoryFilter, setPrintCategoryFilter] = useState('All');
  const [listStatusFilter, setListStatusFilter] = useState('All Active'); 
  
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [inspectionPhoto, setInspectionPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);

  const emptyFormState = {
    tagId: '', serialNumber: '', name: '', category: '', price: '',
    purchaseDate: '', warrantyExpiry: '', condition: '', status: 'In Stock (Available)', notes: ''
  };
  const [singleAssetForm, setSingleAssetForm] = useState(emptyFormState);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          const mappedAssets: Asset[] = data.map((dbAsset: any) => ({
            id: dbAsset.id,
            tagId: dbAsset.tag_id,
            name: dbAsset.name,
            category: dbAsset.category,
            status: dbAsset.status,
            assignedTo: dbAsset.assigned_to,
            empCode: dbAsset.emp_code,
            serialNumber: dbAsset.serial_number,
            price: dbAsset.price,
            purchaseDate: dbAsset.purchase_date,
            warrantyExpiry: dbAsset.warranty_expiry,
            condition: dbAsset.condition,
            notes: dbAsset.notes,
            photos: dbAsset.photos || []
          }));
          setAssets(mappedAssets);
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchAssets();
  }, []);

  const generateTagId = (category: string) => {
    const prefix = CATEGORY_PREFIX_MAP[category] || 'OTH';
    return `VS-${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
  };

  useEffect(() => {
    if (singleAssetForm.category && viewState === 'add_single') {
      setSingleAssetForm(prev => ({ ...prev, tagId: generateTagId(singleAssetForm.category) }));
    }
  }, [singleAssetForm.category, viewState]);

  const handleEditClick = () => {
    if (selectedAsset) {
      setSingleAssetForm({
        tagId: selectedAsset.tagId,
        serialNumber: selectedAsset.serialNumber || '',
        name: selectedAsset.name,
        category: selectedAsset.category,
        price: selectedAsset.price || '',
        purchaseDate: selectedAsset.purchaseDate || '',
        warrantyExpiry: selectedAsset.warrantyExpiry || '',
        condition: selectedAsset.condition || '',
        status: selectedAsset.status,
        notes: selectedAsset.notes || ''
      });
      setIsEditingId(selectedAsset.id);
      setViewState('edit_asset');
    }
  };

  const handleCancelForm = () => {
    setSingleAssetForm(emptyFormState);
    setViewState(viewState === 'edit_asset' ? 'view_details' : 'list');
    setIsEditingId(null);
  };

  const handleAssetFormSubmit = async () => {
    if (!singleAssetForm.tagId || !singleAssetForm.name || !singleAssetForm.category) return alert("Required fields missing.");
    setIsUploading(true);

    const dbPayload = {
      tag_id: singleAssetForm.tagId,
      name: singleAssetForm.name,
      category: singleAssetForm.category,
      serial_number: singleAssetForm.serialNumber,
      price: singleAssetForm.price,
      purchase_date: singleAssetForm.purchaseDate,
      warranty_expiry: singleAssetForm.warrantyExpiry,
      condition: singleAssetForm.condition,
      status: singleAssetForm.status,
      notes: singleAssetForm.notes
    };

    try {
      if (isEditingId && selectedAsset) {
        const { error } = await supabase.from('assets').update(dbPayload).eq('id', isEditingId);
        if (error) throw error;
        const updatedAsset: Asset = { ...selectedAsset, ...singleAssetForm, status: singleAssetForm.status as Asset['status'] };
        setAssets(assets.map(a => a.id === isEditingId ? updatedAsset : a));
        setSelectedAsset(updatedAsset);
        setViewState('view_details');
      } else {
        const { data, error } = await supabase.from('assets').insert([{ ...dbPayload, photos: [] }]).select();
        if (error) throw error;
        if (data) setAssets(prev => [{ id: data[0].id, ...singleAssetForm, status: singleAssetForm.status as Asset['status'], photos: [] }, ...prev]);
        setViewState('list');
      }
      setSingleAssetForm(emptyFormState);
      setIsEditingId(null);
    } catch (e) {
      alert("Database error.");
    } finally { setIsUploading(false); }
  };

  const updateAssetStatus = async (newStatus: Asset['status'], staff?: {empCode: string, name: string}) => {
    if (!selectedAsset) return;
    const dbData = staff ? { status: newStatus, assigned_to: staff.name, emp_code: staff.empCode } : { status: newStatus, assigned_to: null, emp_code: null };
    const { error } = await supabase.from('assets').update(dbData).eq('id', selectedAsset.id);
    if (!error) {
      const updated = { ...selectedAsset, status: newStatus, assignedTo: staff?.name, empCode: staff?.empCode };
      setAssets(assets.map(a => a.id === selectedAsset.id ? updated : a));
      setSelectedAsset(updated);
      setShowAssignModal(false);
    }
  };

  const openAssetDetails = (asset: Asset) => { setSelectedAsset(asset); setViewState('view_details'); };

  if (!isLoaded) return <div className="p-10 text-center font-bold">Loading...</div>;

  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto">
        {/* Render your UI components here, ensured viewState and logic are preserved */}
        {viewState === 'list' && <div>{/* Your List Table */}</div>}
        {viewState === 'view_details' && <div>{/* Your Details UI */}</div>}
        {/* ... Rest of your UI ... */}
    </div>
  );
}