import Link from 'next/link'
import { MonitorCheck, ShieldCheck, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-blue-100 rounded-full mb-6">
          <MonitorCheck className="w-12 h-12 text-blue-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          IT Assets Management
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Welcome to the centralized portal for managing and tracking company hardware and software resources.
        </p>
      </div>

      {/* Login Options Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        
        {/* Admin Portal Card */}
        <Link href="/login?role=admin" 
              className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-200 group">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h2>
          <p className="text-gray-500 text-center text-sm">
            Manage inventory, track assignments, and configure system settings.
          </p>
        </Link>

        {/* Staff Portal Card */}
        <Link href="/login?role=staff" 
              className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-green-200 transition-all duration-200 group">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors duration-200">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff Portal</h2>
          <p className="text-gray-500 text-center text-sm">
            View your assigned assets, report issues, and request new equipment.
          </p>
        </Link>

      </div>
    </div>
  )
}
