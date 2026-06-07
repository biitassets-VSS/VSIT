import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center max-w-md w-full">
        
        {/* Logo / Icon */}
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10" />
        </div>
        
        {/* Welcome Text */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          IT Asset Management
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Securely manage your organization's assets, track inspections, and manage staff members all in one place.
        </p>
        
        {/* Button to go to Login Page */}
        <Link 
          href="/login" 
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md"
        >
          Go to Login
        </Link>
        
      </div>
    </div>
  )
}
