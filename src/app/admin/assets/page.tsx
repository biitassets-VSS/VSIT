'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { AssignAssetModal } from '@/components/admin/AssignAssetModal'
import { Plus, Search, QrCode } from 'lucide-react'

export default function AssetListPage() {
  const [assets, setAssets] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [assignModalOpen, setAssignModalOpen] = useState<string | null>(null)

  const fetchAssets = async () => {
    // Join with staff table to show who currently holds the asset
    const { data } = await supabase
      .from('assets')
      .select('*, staff:current_holder(name)')
      .order('created_at', { ascending: false })
    
    if (data) setAssets(data)
  }

  useEffect(() => {
    fetchAssets()
  }, [])

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.asset_tag.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'In Stock': return 'bg-green-100 text-green-700'
      case 'Assigned': return 'bg-blue-100 text-blue-700'
      case 'Repair': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Asset Inventory</h1>
        <Link href="/admin/assets/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700">
          <Plus className="w-5 h-5 mr-2" /> Add Asset
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" placeholder="Search assets..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                <th className="p-4 font-medium">Asset Tag</th>
                <th className="p-4 font-medium">Name / Brand</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Current Holder</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 font-medium text-blue-600">{asset.asset_tag}</td>
                  <td className="p-4">
                    <p className="font-medium text-gray-900">{asset.name}</p>
                    <p className="text-xs text-gray-500">{asset.brand}</p>
                  </td>
                  <td className="p-4 text-gray-600">{asset.category}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">
                    {asset.staff ? asset.staff.name : '-'}
                  </td>
                  <td className="p-4 flex justify-end space-x-2">
                    {/* Render Assign Button only if In Stock */}
                    {asset.status === 'In Stock' && (
                      <button onClick={() => setAssignModalOpen(asset.id)} className="text-sm px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 font-medium">
                        Assign
                      </button>
                    )}
                    <a href={asset.qr_code_url} download={`QR-${asset.asset_tag}.png`} className="p-1.5 text-gray-400 hover:text-gray-800 bg-gray-100 rounded-md">
                      <QrCode className="w-5 h-5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {assignModalOpen && (
        <AssignAssetModal 
          assetId={assignModalOpen} 
          onClose={() => setAssignModalOpen(null)} 
          onSuccess={fetchAssets}
        />
      )}
    </div>
  )
}
