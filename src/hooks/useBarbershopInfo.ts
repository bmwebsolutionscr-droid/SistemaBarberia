// Hook para obtener información de barbería incluyendo logo
// Extiende funcionalidad sin romper código existente

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Barbershop } from '@/types/supabase';

interface BarbershopWithLogo extends Barbershop {
  logo_url?: string | null;
}

export const useBarbershopInfo = () => {
  const [barbershop, setBarbershop] = useState<BarbershopWithLogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBarbershopInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener información completa de la barbería incluyendo logo
      const { data: barbershopData, error: fetchError } = await supabase
        .from('barbershops')
        .select(`
          id,
          nombre,
          email,
          telefono,
          direccion,
          created_at,
          updated_at,
          logo_url
        `)
        .eq('email', user.email)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!barbershopData) {
        throw new Error('Barbería no encontrada');
      }

      setBarbershop(barbershopData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener información de barbería';
      setError(errorMessage);
      console.error('Error fetching barbershop info:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar solo el logo
  const updateLogo = (logoUrl: string | null) => {
    setBarbershop(prev => prev ? { ...prev, logo_url: logoUrl } : null);
  };

  // Función para refrescar información
  const refresh = () => {
    fetchBarbershopInfo();
  };

  useEffect(() => {
    fetchBarbershopInfo();
  }, []);

  return {
    barbershop,
    loading,
    error,
    updateLogo,
    refresh
  };
};