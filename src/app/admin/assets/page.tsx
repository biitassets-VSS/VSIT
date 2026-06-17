'use client';

import React, { useState, useEffect } from 'react';
import {
  PackageSearch, Plus, UploadCloud, Search,
  Filter, User, ArrowLeft,
  FileSpreadsheet, CheckCircle2,
  AlertCircle, Save, Printer, QrCode
} from 'lucide-react';

interface Asset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Retired';
  assignedTo?: string;
  empCode?: string;
}

const CATEGORY_PREFIX_MAP: Record<string, string> = {
  Laptop: 'LAP',
  Headphone: 'HDP',
  Keyboard: 'KBD',
  'Wired Keyboard Combo': 'WKC',
  'Wireless Keyboard Combo': 'WMC',
  Stand: 'STN',
  'Cleaning Kit': 'CLN',
  'Mobile Phone': 'MOB',
  Other: 'OTH'
};

export default function AdminAssetsPage() {
  const [viewState, setViewState] = useState<'list' | 'add_single' | 'bulk_upload' | 'print_tags'>('list');

  const [searchQuery, setSearchQuery] = useState('');

  const [singleAssetForm, setSingleAssetForm] = useState({
    tagId: '',
    name: '',
    category: '',
    status: 'In Stock (Available)'
  });

  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', tagId: 'VS-LAP-104291', name: 'Dell XPS 15', category: 'Laptop', status: 'Assigned', assignedTo: 'Rahul Sharma', empCode: 'EMP-1042' },
    { id: '2', tagId: 'VS-WMC-209932', name: 'Logitech Combo', category: 'Wireless Keyboard Combo', status: 'Assigned', assignedTo: 'Rahul Sharma', empCode: 'EMP-1042' },
    { id: '3', tagId: 'VS-LAP-300188', name: 'MacBook Pro', category: 'Laptop', status: 'Available' }
  ]);

  useEffect(() => {
    if (singleAssetForm.category) {
      const prefix = CATEGORY_PREFIX_MAP[singleAssetForm.category] || 'OTH';
      const uniqueNum = Math.floor(100000 + Math.random() * 900000);
      setSingleAssetForm(prev => ({
        ...prev,
        tagId: `VS-${prefix}-${uniqueNum}`
      }));
    }
  }, [singleAssetForm.category]);

  const handleAdd = () => {
    if (!singleAssetForm.name || !singleAssetForm.category) {
      alert('Fill required fields');
      return;
    }

    setAssets(prev => [
      {
        id: Date.now().toString(),
        tagId: singleAssetForm.tagId,
        name: singleAssetForm.name,
        category: singleAssetForm.category,
        status: 'Available'
      },
      ...prev
    ]);

    setViewState('list');
  };

  return (
    <div className="p-6 space-y-6">

      {/* ✅ FIXED STYLE BLOCK */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              #printable-area, #printable-area * { visibility: visible; }
              #printable-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .no-print { display: none !important; }
            }
          `,
        }}
      />

      {viewState === 'list' && (
        <>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageSearch /> Asset Inventory
          </h1>

          <button
            onClick={() => setViewState('add_single')}
            className="bg-teal-600 text-white px-4 py-2 rounded"
          >
            <Plus /> Add Asset
          </button>

          <input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border p-2 w-full"
          />

          <table className="w-full border">
            <thead>
              <tr>
                <th>Name</th>
                <th>Tag</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assets
                .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(a => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.tagId}</td>
                    <td>{a.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      {viewState === 'add_single' && (
        <>
          <button onClick={() => setViewState('list')}>
            <ArrowLeft /> Back
          </button>

          <h2 className="text-xl font-bold">Add Asset</h2>

          <select
            value={singleAssetForm.category}
            onChange={(e) => setSingleAssetForm({ ...singleAssetForm, category: e.target.value })}
          >
            <option value="">Select Category</option>
            {Object.keys(CATEGORY_PREFIX_MAP).map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <input
            readOnly
            value={singleAssetForm.tagId}
            placeholder="Auto Tag"
          />

          <input
            placeholder="Asset Name"
            value={singleAssetForm.name}
            onChange={(e) => setSingleAssetForm({ ...singleAssetForm, name: e.target.value })}
          />

          <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2">
            <Save /> Save
          </button>
        </>
      )}

    </div>
  );
}