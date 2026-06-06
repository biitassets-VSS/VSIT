'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase/client'
import { generateAssetQR } from '@/lib/utils'

export default function AddAssetPage() {
  const { register, handleSubmit } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // 1. Generate QR Code
      const qrDataUrl = await generateAssetQR(data.asset_tag);

      // 2. Insert Asset
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert([{
          ...data,
          qr_code_url: qrDataUrl,
          status: 'In Stock'
        }])
        .select()
        .single();

      if (assetError) throw assetError;

      // 3. Create Audit Trail Record (Never Deleted)
      await supabase.from('asset_history').insert([{
        asset_id: asset.id,
        action_type: 'ASSET_CREATED',
        notes: `Asset ${data.asset_tag} added to system.`
      }]);

      alert('Asset Added Successfully!');
    } catch (error) {
      console.error(error);
      alert('Error adding asset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Register New Asset</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Asset Tag</label>
            <input {...register('asset_tag')} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select {...register('category')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
              <option>Laptop</option>
              <option>Mobile Phone</option>
              <option>Monitor</option>
              {/* Add rest of categories */}
            </select>
          </div>
          {/* Add Brand, Model, Serial Number, Purchase Price, Dates fields here following similar pattern */}
        </div>

        <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Save Asset & Generate QR'}
        </button>
      </form>
    </div>
  )
}
