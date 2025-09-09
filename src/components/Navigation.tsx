'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Barbershop } from '@/types/supabase'
import { 
  Home,
  User,
  Calendar, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  Scissors,
  CalendarDays
} from 'lucide-react'
import toast from 'react-hot-toast'

interface NavigationProps {
  children: React.ReactNode
}

export default function Navigation({ children }: NavigationProps) {
  const [currentBarbershop, setCurrentBarbershop] = useState<Barbershop | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !user.email) {
        router.push('/')
        return
      }

      // Obtener información de la barbería
      const { data: barbershop, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('email', user.email)
        .single()

      if (error || !barbershop) {
        await supabase.auth.signOut()
        router.push('/')
        return
      }

      setCurrentBarbershop(barbershop)
    } catch (error) {
      console.error('Error checking auth:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    toast.success('Sesión cerrada exitosamente')
  }

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path || (path !== '/dashboard' && pathname?.startsWith(path))
    return `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 z-50 p-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="bg-white p-2 rounded-md shadow-md"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        
        {/* Mobile close button */}
        <div className="lg:hidden absolute top-4 right-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Logo and barbershop info */}
        <div className="p-6 border-b">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-bold text-gray-900">
                {currentBarbershop?.nombre || 'Mi Barbería'}
              </h1>
              <p className="text-sm text-gray-500">Panel de Control</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 space-y-1 px-4">
          <Link href="/dashboard" className={getLinkClasses('/dashboard')}>
            <Home className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/dashboard/barbers" className={getLinkClasses('/dashboard/barbers')}>
            <User className="w-5 h-5" />
            Barberos
          </Link>
          <Link href="/dashboard/appointments" className={getLinkClasses('/dashboard/appointments')}>
            <Calendar className="w-5 h-5" />
            Citas
          </Link>
          <Link href="/dashboard/calendar" className={getLinkClasses('/dashboard/calendar')}>
            <CalendarDays className="w-5 h-5" />
            Calendario
          </Link>
          <Link href="/dashboard/reports" className={getLinkClasses('/dashboard/reports')}>
            <FileText className="w-5 h-5" />
            Reportes
          </Link>
          <Link href="/dashboard/settings" className={getLinkClasses('/dashboard/settings')}>
            <Scissors className="w-5 h-5" />
            Configuración
          </Link>
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-medium text-sm">
                  {currentBarbershop?.nombre?.[0]?.toUpperCase() || 'B'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentBarbershop?.nombre || 'Barbería'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentBarbershop?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-gray-600 bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
