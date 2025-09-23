'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import type { Barbershop } from '@/types/supabase'
import { 
  Settings,
  Clock,
  Calendar,
  DollarSign,
  Phone,
  MapPin,
  Save,
  RefreshCw,
  Store,
  Instagram,
  Facebook,
  MessageCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ConfigurationData {
  // Información básica
  nombre: string
  email: string
  telefono: string
  direccion: string
  descripcion: string
  
  // Horarios
  hora_apertura: string
  hora_cierre: string
  hora_almuerzo_inicio: string
  hora_almuerzo_fin: string
  almuerzo_activo: boolean
  dias_laborales: string[]
  
  // Servicios y duraciones (en minutos)
  duracion_cita: number
  
  // Precios
  precio_corte_adulto: number
  precio_corte_nino: number
  precio_barba: number
  precio_combo: number
  
  // WhatsApp
  whatsapp_activo: boolean
  whatsapp_numero: string
  tiempo_cancelacion: number // horas
  
  // Redes sociales
  instagram: string
  facebook: string
}

const DIAS_SEMANA = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
]

export default function Configuration() {
  const [config, setConfig] = useState<ConfigurationData>({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    descripcion: '',
    hora_apertura: '08:00',
    hora_cierre: '18:00',
    hora_almuerzo_inicio: '12:00',
    hora_almuerzo_fin: '13:00',
    almuerzo_activo: true,
    dias_laborales: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
    duracion_cita: 30,
    precio_corte_adulto: 15000,
    precio_corte_nino: 10000,
    precio_barba: 8000,
    precio_combo: 20000,
    whatsapp_activo: true,
    whatsapp_numero: '',
    tiempo_cancelacion: 2,
    instagram: '',
    facebook: ''
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [barbershopId, setBarbershopId] = useState<string>('')

  // Cargar configuración actual
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user?.email) return

        const { data: barbershop, error } = await supabase
          .from('barbershops')
          .select('*')
          .eq('email', user.email)
          .single()

        if (error) {
          console.error('Error al cargar configuración:', error)
          return
        }

        if (barbershop) {
          setBarbershopId(barbershop.id)
          setConfig({
            nombre: barbershop.nombre || '',
            email: barbershop.email || '',
            telefono: barbershop.telefono || '',
            direccion: barbershop.direccion || '',
            descripcion: (barbershop as any).descripcion || '',
            hora_apertura: (barbershop as any).hora_apertura || '08:00',
            hora_cierre: (barbershop as any).hora_cierre || '18:00',
            hora_almuerzo_inicio: (barbershop as any).hora_almuerzo_inicio || '12:00',
            hora_almuerzo_fin: (barbershop as any).hora_almuerzo_fin || '13:00',
            almuerzo_activo: (barbershop as any).almuerzo_activo ?? true,
            dias_laborales: (barbershop as any).dias_laborales || ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
            duracion_cita: (barbershop as any).duracion_cita || 30,
            precio_corte_adulto: (barbershop as any).precio_corte_adulto || 15000,
            precio_corte_nino: (barbershop as any).precio_corte_nino || 10000,
            precio_barba: (barbershop as any).precio_barba || 8000,
            precio_combo: (barbershop as any).precio_combo || 20000,
            whatsapp_activo: (barbershop as any).whatsapp_activo ?? true,
            whatsapp_numero: (barbershop as any).whatsapp_numero || '',
            tiempo_cancelacion: (barbershop as any).tiempo_cancelacion || 2,
            instagram: (barbershop as any).instagram || '',
            facebook: (barbershop as any).facebook || ''
          })
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error)
        toast.error('Error al cargar la configuración')
      } finally {
        setLoading(false)
      }
    }

    loadConfiguration()
  }, [])

  // Manejar cambios en formulario
  const handleInputChange = (field: keyof ConfigurationData, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Manejar días laborales
  const handleDayToggle = (day: string) => {
    setConfig(prev => ({
      ...prev,
      dias_laborales: prev.dias_laborales.includes(day)
        ? prev.dias_laborales.filter(d => d !== day)
        : [...prev.dias_laborales, day]
    }))
  }

  // Validar horario de almuerzo
  const validateLunchHours = (): boolean => {
    if (!config.almuerzo_activo) return true
    
    const apertura = new Date(`2000-01-01T${config.hora_apertura}:00`)
    const cierre = new Date(`2000-01-01T${config.hora_cierre}:00`)
    const almuerzoInicio = new Date(`2000-01-01T${config.hora_almuerzo_inicio}:00`)
    const almuerzoFin = new Date(`2000-01-01T${config.hora_almuerzo_fin}:00`)
    
    if (almuerzoInicio >= almuerzoFin) {
      toast.error('La hora de inicio del almuerzo debe ser anterior a la hora de fin')
      return false
    }
    
    if (almuerzoInicio <= apertura) {
      toast.error('La hora de inicio del almuerzo debe ser posterior a la hora de apertura')
      return false
    }
    
    if (almuerzoFin >= cierre) {
      toast.error('La hora de fin del almuerzo debe ser anterior a la hora de cierre')
      return false
    }
    
    return true
  }

  // Guardar configuración
  const saveConfiguration = async () => {
    if (!barbershopId) {
      toast.error('Error: No se pudo identificar la barbería')
      return
    }

    // Validar horario de almuerzo
    if (!validateLunchHours()) {
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          nombre: config.nombre,
          telefono: config.telefono,
          direccion: config.direccion,
          descripcion: config.descripcion,
          hora_apertura: config.hora_apertura,
          hora_cierre: config.hora_cierre,
          hora_almuerzo_inicio: config.hora_almuerzo_inicio,
          hora_almuerzo_fin: config.hora_almuerzo_fin,
          almuerzo_activo: config.almuerzo_activo,
          dias_laborales: config.dias_laborales,
          duracion_cita: config.duracion_cita,
          precio_corte_adulto: config.precio_corte_adulto,
          precio_corte_nino: config.precio_corte_nino,
          precio_barba: config.precio_barba,
          precio_combo: config.precio_combo,
          whatsapp_activo: config.whatsapp_activo,
          whatsapp_numero: config.whatsapp_numero,
          tiempo_cancelacion: config.tiempo_cancelacion,
          instagram: config.instagram,
          facebook: config.facebook,
          updated_at: new Date().toISOString()
        })
        .eq('id', barbershopId)

      if (error) {
        console.error('Error al guardar:', error)
        toast.error('Error al guardar la configuración')
      } else {
        toast.success('Configuración guardada exitosamente')
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error)
      toast.error('Error inesperado al guardar')
    } finally {
      setSaving(false)
    }
  }

  // Formatear precio para mostrar
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando configuración...</p>
            </div>
          </div>
        </Navigation>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation>
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
                  <p className="text-gray-600">Personaliza los ajustes de tu barbería</p>
                </div>
              </div>
              
              <button
                onClick={saveConfiguration}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información Básica */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Store className="h-5 w-5 text-blue-600" />
                Información Básica
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Barbería
                  </label>
                  <input
                    type="text"
                    value={config.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Mi Barbería"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={config.email}
                    disabled
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">El email no se puede modificar</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={config.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+506 2222-3333"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={config.direccion}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="San José, Costa Rica"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={config.descripcion}
                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe tu barbería..."
                  />
                </div>
              </div>
            </div>

            {/* Horarios y Días */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Horarios y Días
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora de Apertura
                    </label>
                    <input
                      type="time"
                      value={config.hora_apertura}
                      onChange={(e) => handleInputChange('hora_apertura', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora de Cierre
                    </label>
                    <input
                      type="time"
                      value={config.hora_cierre}
                      onChange={(e) => handleInputChange('hora_cierre', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Configuración de horario de almuerzo */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        🍽️ Horario de Almuerzo
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Bloquea este horario para evitar citas durante el almuerzo
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.almuerzo_activo}
                        onChange={(e) => handleInputChange('almuerzo_activo', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {config.almuerzo_activo && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Inicio del Almuerzo
                          </label>
                          <input
                            type="time"
                            value={config.hora_almuerzo_inicio}
                            onChange={(e) => handleInputChange('hora_almuerzo_inicio', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fin del Almuerzo
                          </label>
                          <input
                            type="time"
                            value={config.hora_almuerzo_fin}
                            onChange={(e) => handleInputChange('hora_almuerzo_fin', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      {/* Preview de horarios disponibles */}
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">
                          👀 Vista Previa de Horarios Disponibles
                        </h4>
                        <div className="text-xs text-blue-700">
                          <div className="flex flex-wrap gap-1">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                              {config.hora_apertura} - {config.hora_almuerzo_inicio}
                            </span>
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                              {config.hora_almuerzo_inicio} - {config.hora_almuerzo_fin} (🍽️ Almuerzo)
                            </span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                              {config.hora_almuerzo_fin} - {config.hora_cierre}
                            </span>
                          </div>
                          <p className="mt-2 text-xs">
                            ✅ Verde: Horarios disponibles para citas | ❌ Rojo: Horario bloqueado
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Días Laborales
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DIAS_SEMANA.map(dia => (
                      <label key={dia.key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.dias_laborales.includes(dia.key)}
                          onChange={() => handleDayToggle(dia.key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{dia.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duración Corte Normal (min)
                    </label>
                    <input
                      type="number"
                      value={config.duracion_cita}
                      onChange={(e) => handleInputChange('duracion_cita', parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="15"
                      max="120"
                      step="15"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Precios */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Precios de Servicios
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Corte Adulto
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₡</span>
                      <input
                        type="number"
                        value={config.precio_corte_adulto}
                        onChange={(e) => handleInputChange('precio_corte_adulto', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatPrice(config.precio_corte_adulto)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Corte Niño
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₡</span>
                      <input
                        type="number"
                        value={config.precio_corte_nino}
                        onChange={(e) => handleInputChange('precio_corte_nino', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatPrice(config.precio_corte_nino)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barba
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₡</span>
                      <input
                        type="number"
                        value={config.precio_barba}
                        onChange={(e) => handleInputChange('precio_barba', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatPrice(config.precio_barba)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Combo (Corte + Barba)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₡</span>
                      <input
                        type="number"
                        value={config.precio_combo}
                        onChange={(e) => handleInputChange('precio_combo', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatPrice(config.precio_combo)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp y Comunicaciones */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                WhatsApp y Comunicaciones
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.whatsapp_activo}
                    onChange={(e) => handleInputChange('whatsapp_activo', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Activar notificaciones por WhatsApp
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={config.whatsapp_numero}
                    onChange={(e) => handleInputChange('whatsapp_numero', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+506 8888-9999"
                    disabled={!config.whatsapp_activo}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo mínimo para cancelar (horas)
                  </label>
                  <select
                    value={config.tiempo_cancelacion}
                    onChange={(e) => handleInputChange('tiempo_cancelacion', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={60}>1 hora</option>
                    <option value={120}>2 horas</option>
                    <option value={240}>4 horas</option>
                    <option value={480}>8 horas</option>
                    <option value={720}>12 horas</option>
                    <option value={1440}>24 horas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Instagram className="h-4 w-4 inline mr-1" />
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={config.instagram}
                    onChange={(e) => handleInputChange('instagram', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="@mi_barberia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Facebook className="h-4 w-4 inline mr-1" />
                    Facebook
                  </label>
                  <input
                    type="text"
                    value={config.facebook}
                    onChange={(e) => handleInputChange('facebook', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Mi Barbería"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botón guardar fijo al final */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="flex justify-end">
              <button
                onClick={saveConfiguration}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {saving ? 'Guardando Configuración...' : 'Guardar Todos los Cambios'}
              </button>
            </div>
          </div>
        </div>
      </Navigation>
    </div>
  )
}
