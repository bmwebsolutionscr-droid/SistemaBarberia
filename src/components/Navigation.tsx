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
  CalendarDays,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import BrandLogo from '@/components/branding/BrandLogo'

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
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          
          <div className="flex items-center">
            <BrandLogo 
              logoUrl={(currentBarbershop as any)?.logo_url}
              barbershopName={currentBarbershop?.nombre}
              size="md"
            />
            <div className="ml-2">
              <h1 className="text-sm font-semibold text-gray-900 truncate max-w-32">
                {currentBarbershop?.nombre || 'Mi Barbería'}
              </h1>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:w-64 transition-transform duration-300 ease-in-out`}>
        
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center">
            <BrandLogo 
              logoUrl={(currentBarbershop as any)?.logo_url}
              barbershopName={currentBarbershop?.nombre}
              size="lg"
            />
            <div className="ml-3">
              <h1 className="text-lg font-bold text-gray-900">
                {currentBarbershop?.nombre || 'Mi Barbería'}
              </h1>
              <p className="text-sm text-gray-500">Panel de Control</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Logo and barbershop info - Desktop only */}
        <div className="hidden lg:block p-6 border-b">
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
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link 
            href="/dashboard" 
            className={getLinkClasses('/dashboard')}
            onClick={() => setSidebarOpen(false)}
          >
            <Home className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="truncate">Dashboard</span>
          </Link>
          <Link 
            href="/dashboard/barbers" 
            className={getLinkClasses('/dashboard/barbers')}
            onClick={() => setSidebarOpen(false)}
          >
            <User className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="truncate">Barberos</span>
          </Link>
          <Link 
            href="/dashboard/appointments" 
            className={getLinkClasses('/dashboard/appointments')}
            onClick={() => setSidebarOpen(false)}
          >
            <Calendar className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="truncate">Citas</span>
          </Link>
          <Link 
            href="/dashboard/calendar" 
            className={getLinkClasses('/dashboard/calendar')}
            onClick={() => setSidebarOpen(false)}
          >
            <CalendarDays className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="truncate">Calendario</span>
          </Link>
          <Link 
            href="/dashboard/reports" 
            className={getLinkClasses('/dashboard/reports')}
            onClick={() => setSidebarOpen(false)}
          >
            <FileText className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="truncate">Reportes</span>
          </Link>
          <Link 
            href="/dashboard/settings" 
            className={getLinkClasses('/dashboard/settings')}
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="truncate">Configuración</span>
          </Link>
        </nav>

        {/* User info and logout - Desktop only */}
        <div className="hidden lg:block p-6 border-t mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-medium text-sm">
                  {currentBarbershop?.nombre?.[0]?.toUpperCase() || 'B'}
                </span>
              </div>
              <div className="ml-3 min-w-0 flex-1">
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
              className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0 ml-2"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile logout button */}
        <div className="lg:hidden p-4 border-t">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-medium text-sm">
                {currentBarbershop?.nombre?.[0]?.toUpperCase() || 'B'}
              </span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentBarbershop?.nombre || 'Barbería'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {currentBarbershop?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleSignOut()
              setSidebarOpen(false)
            }}
            className="w-full mt-3 flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </button>
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
        {/* Mobile spacing for header */}
        <div className="lg:hidden h-16"></div>
        
        <main className="p-4 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
