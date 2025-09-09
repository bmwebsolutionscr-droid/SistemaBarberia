'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import type { Barber, Barbershop } from '@/types/supabase'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  User,
  Phone,
  Award,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import toast from 'react-hot-toast'

interface BarberFormData {
  id?: string
  nombre: string
  telefono: string
  especialidad: string
  activo: boolean
}

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [currentBarbershop, setCurrentBarbershop] = useState<Barbershop | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBarber, setEditingBarber] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState<BarberFormData>({
    nombre: '',
    telefono: '',
    especialidad: '',
    activo: true
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) return

      // Obtener información de la barbería
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('email', user.email)
        .single()

      if (!barbershop) return
      setCurrentBarbershop(barbershop)

      // Cargar barberos
      await loadBarbers(barbershop.id)
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const loadBarbers = async (barbershopId: string) => {
    const { data, error } = await supabase
      .from('barbers')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('nombre')

    if (error) {
      console.error('Error loading barbers:', error)
      return
    }

    setBarbers(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBarbershop) return
    
    setLoading(true)

    try {
      if (editingBarber) {
        const { error } = await supabase
          .from('barbers')
          .update({
            nombre: formData.nombre,
            telefono: formData.telefono,
            especialidad: formData.especialidad,
            activo: formData.activo
          })
          .eq('id', editingBarber)

        if (error) throw error
        toast.success('Barbero actualizado exitosamente')
      } else {
        const { error } = await supabase
          .from('barbers')
          .insert({
            barbershop_id: currentBarbershop.id,
            nombre: formData.nombre,
            telefono: formData.telefono,
            especialidad: formData.especialidad,
            activo: formData.activo
          })

        if (error) throw error
        toast.success('Barbero agregado exitosamente')
      }

      // Recargar datos
      await loadBarbers(currentBarbershop.id)
      resetForm()
      setShowModal(false)

    } catch (error) {
      console.error('Error saving barber:', error)
      toast.error('Error al guardar el barbero')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (barber: Barber) => {
    setEditingBarber(barber.id)
    setFormData({
      nombre: barber.nombre,
      telefono: barber.telefono || '',
      especialidad: barber.especialidad || '',
      activo: barber.activo
    })
    setShowModal(true)
  }

  const handleDelete = async (barberId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este barbero?')) return

    try {
      const { error } = await supabase
        .from('barbers')
        .delete()
        .eq('id', barberId)

      if (error) throw error

      toast.success('Barbero eliminado exitosamente')
      if (currentBarbershop) {
        await loadBarbers(currentBarbershop.id)
      }
    } catch (error) {
      console.error('Error deleting barber:', error)
      toast.error('Error al eliminar el barbero')
    }
  }

  const toggleBarberStatus = async (barberId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('barbers')
        .update({ activo: !currentStatus })
        .eq('id', barberId)

      if (error) throw error

      toast.success(`Barbero ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`)
      if (currentBarbershop) {
        await loadBarbers(currentBarbershop.id)
      }
    } catch (error) {
      console.error('Error updating barber status:', error)
      toast.error('Error al actualizar el estado del barbero')
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      telefono: '',
      especialidad: '',
      activo: true
    })
    setEditingBarber(null)
  }

  const filteredBarbers = barbers.filter(barber =>
    barber.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (barber.especialidad && barber.especialidad.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Navigation>
    )
  }

  return (
    <Navigation>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Barberos</h1>
            <p className="text-gray-600">Administra el equipo de {currentBarbershop?.nombre}</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Barbero
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre o especialidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 input-field"
          />
        </div>

        {/* Barbers Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left">Barbero</th>
                  <th className="px-6 py-3 text-left">Especialidad</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBarbers.map((barber) => (
                  <tr key={barber.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {barber.nombre}
                          </div>
                          {barber.telefono && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {barber.telefono}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Award className="w-4 h-4 mr-2 text-gray-400" />
                        {barber.especialidad || 'Sin especialidad'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleBarberStatus(barber.id, barber.activo)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          barber.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {barber.activo ? (
                          <ToggleRight className="w-4 h-4 mr-1" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 mr-1" />
                        )}
                        {barber.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(barber)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(barber.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredBarbers.length === 0 && (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? 'No se encontraron barberos' : 'No hay barberos registrados'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingBarber ? 'Editar Barbero' : 'Agregar Barbero'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                      className="input-field"
                      placeholder="+506 8888-1234"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Especialidad
                    </label>
                    <input
                      type="text"
                      value={formData.especialidad}
                      onChange={(e) => setFormData({...formData, especialidad: e.target.value})}
                      className="input-field"
                      placeholder="Ej: Cortes clásicos, Barba, Colorimetría"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="activo"
                      checked={formData.activo}
                      onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="activo" className="ml-2 block text-sm text-gray-700">
                      Barbero activo
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : (editingBarber ? 'Actualizar' : 'Agregar')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Navigation>
  )
}
