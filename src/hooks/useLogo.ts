// Hook personalizado para gestión de logos de barbería
// No interfiere con funcionalidades existentes

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UseLogoReturn {
  uploading: boolean;
  uploadLogo: (file: File, barbershopId: string) => Promise<string | null>;
  deleteLogo: (barbershopId: string, logoUrl?: string) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

export const useLogo = (): UseLogoReturn => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateFile = (file: File): string | null => {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return 'Solo se permiten archivos de imagen (PNG, JPG, GIF)';
    }
    
    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return 'La imagen debe ser menor a 2MB';
    }

    // Validar dimensiones mínimas (opcional)
    return null;
  };

  const uploadLogo = useCallback(async (file: File, barbershopId: string): Promise<string | null> => {
    setUploading(true);
    setError(null);

    try {
      // Validar archivo
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `logo-${barbershopId}-${timestamp}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Eliminar logo anterior si existe
      try {
        const { data: currentBarbershop } = await supabase
          .from('barbershops')
          .select('logo_url')
          .eq('id', barbershopId)
          .single();

        if (currentBarbershop?.logo_url) {
          // Extraer nombre del archivo de la URL anterior
          const oldFileName = currentBarbershop.logo_url.split('/').pop();
          if (oldFileName && oldFileName.startsWith('logo-')) {
            await supabase.storage
              .from('barbershop-assets')
              .remove([`logos/${oldFileName}`]);
          }
        }
      } catch (deleteError) {
        // No es crítico si falla la eliminación del logo anterior
        console.warn('No se pudo eliminar logo anterior:', deleteError);
      }

      // Subir nuevo archivo
      const { error: uploadError } = await supabase.storage
        .from('barbershop-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      }

      // Obtener URL pública
      const { data } = supabase.storage
        .from('barbershop-assets')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error('No se pudo generar URL pública del logo');
      }

      const logoUrl = data.publicUrl;

      // Actualizar base de datos
      const { error: updateError } = await supabase
        .from('barbershops')
        .update({ 
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', barbershopId);

      if (updateError) {
        // Si falla la actualización, limpiar el archivo subido
        await supabase.storage
          .from('barbershop-assets')
          .remove([filePath]);
        
        throw new Error(`Error al actualizar logo en base de datos: ${updateError.message}`);
      }

      return logoUrl;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al subir logo';
      setError(errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteLogo = useCallback(async (barbershopId: string, logoUrl?: string): Promise<boolean> => {
    setUploading(true);
    setError(null);

    try {
      // Si se proporciona logoUrl, intentar eliminarlo del storage
      if (logoUrl) {
        try {
          const fileName = logoUrl.split('/').pop();
          if (fileName && fileName.startsWith('logo-')) {
            await supabase.storage
              .from('barbershop-assets')
              .remove([`logos/${fileName}`]);
          }
        } catch (deleteError) {
          // No es crítico si falla la eliminación del archivo
          console.warn('No se pudo eliminar archivo de storage:', deleteError);
        }
      }

      // Actualizar base de datos para remover la referencia
      const { error: updateError } = await supabase
        .from('barbershops')
        .update({ 
          logo_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', barbershopId);

      if (updateError) {
        throw new Error(`Error al eliminar logo: ${updateError.message}`);
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al eliminar logo';
      setError(errorMessage);
      return false;
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    uploading,
    uploadLogo,
    deleteLogo,
    error,
    clearError
  };
};