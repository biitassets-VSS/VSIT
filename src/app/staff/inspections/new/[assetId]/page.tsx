'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase/client'
import { UploadCloud } from 'lucide-react'

export default function NewInspection({ params }: { params: { assetId: string } }) {
  const router = useRouter()
  const { register, handleSubmit } = useForm()
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<FileList | null>(null)

  const onSubmit = async (data: any) => {
    setLoading(true)
    try {
      // 1. Get Logged In Staff ID
      const { data: { user } } = await supabase.auth.getUser()
      const { data: staffData } = await supabase.from('staff').select('id').eq('profile_id', user?.id).single()

      if (!staffData) throw new Error("Staff profile not found")

      let uploadedPhotoUrls: string[] = []

      // 2. Upload Photos to Supabase Storage if files exist
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const fileName = `${params.assetId}/${Date.now()}-${file.name}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('inspection-photos')
            .upload(fileName, file)
          
          if (uploadError) throw uploadError
          
          const { data: { publicUrl } } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(fileName)
            
          uploadedPhotoUrls.push(publicUrl)
        }
      }

      // 3. Insert Inspection Record
      const { error } = await supabase.from('inspections').insert([{
        asset_id: params.assetId,
        staff_id: staffData.id,
        condition: data.condition,
        working_status: data.working_status === 'yes',
        location: data.location,
        notes: data.notes,
        photo_urls: uploadedPhotoUrls
      }])

      if (error) throw error

      alert('Inspection Submitted Successfully!')
      router.push('/staff/dashboard')

    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Error submitting inspection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Weekly Asset Inspection</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Condition</label>
          <select {...register('condition')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
            <option>Excellent</option>
            <option>Good</option>
            <option>Fair</option>
            <option>Damaged</option>
            <option>Needs Repair</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Is it working properly?</label>
          <div className="mt-2 space-x-4">
            <label className="inline-flex items-center">
              <input type="radio" value="yes" {...register('working_status')} className="text-blue-600" defaultChecked />
              <span className="ml-2">Yes</span>
            </label>
            <label className="inline-flex items-center">
              <input type="radio" value="no" {...register('working_status')} className="text-blue-600" />
              <span className="ml-2">No</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Current Location (City/Office/Home)</label>
          <input type="text" {...register('location')} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Upload Current Photos (Max 5)</label>
          <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-500 cursor-pointer relative">
            <div className="space-y-1 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>Upload files</span>
                  <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} className="sr-only" />
                </label>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              {files && <p className="text-sm font-semibold text-green-600 mt-2">{files.length} file(s) selected</p>}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
          <textarea {...register('notes')} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"></textarea>
        </div>

        <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Submitting...' : 'Submit Inspection'}
        </button>
      </form>
    </div>
  )
}
