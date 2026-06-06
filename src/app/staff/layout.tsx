'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LayoutDashboard, ClipboardCheck, LogOut, MonitorCheck } from 'lucide-react'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MonitorCheck className="w-6 h-6 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Staff Portal</h1>
        </div>
        
        <nav className="flex space-x-6">
          <Link href="/staff/dashboard" className={`flex items-center font-medium ${pathname === '/staff/dashboard' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
            <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
          </Link>
          <button onClick={handleLogout} className="flex items-center text-red-600 font-medium hover:text-red-700">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
