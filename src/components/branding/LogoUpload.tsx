'use client';

// Componente independiente para gestión de logos
// No modifica ninguna funcionalidad existente

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { useLogo } from '@/hooks/useLogo';

interface LogoUploadProps {
  barbershopId: string;
  currentLogo?: string | null;
  onLogoChange?: (logoUrl: string | null) => void;
  className?: string;
}

const LogoUpload: React.FC<LogoUploadProps> = ({
  barbershopId,
  currentLogo,
  onLogoChange,
  className = ''
}) => {
  const [preview, setPreview] = useState<string | null>(currentLogo || null);
  const [dragActive, setDragActive] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploading, uploadLogo, deleteLogo, error, clearError } = useLogo();

  // Limpiar mensajes después de unos segundos
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 8000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleFileSelect = useCallback(async (file: File) => {
    clearError();
    setSuccess(null);

    // Crear preview inmediato
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    try {
      const logoUrl = await uploadLogo(file, barbershopId);
      
      if (logoUrl) {
        // Limpiar el preview temporal
        URL.revokeObjectURL(previewUrl);
        setPreview(logoUrl);
        setSuccess('¡Logo actualizado exitosamente!');
        onLogoChange?.(logoUrl);
      } else {
        // Restaurar preview anterior si falló
        setPreview(currentLogo || null);
      }
    } catch (err) {
      // Restaurar preview anterior si falló
      URL.revokeObjectURL(previewUrl);
      setPreview(currentLogo || null);
    }
  }, [barbershopId, currentLogo, uploadLogo, onLogoChange, clearError]);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Limpiar input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleFileSelect(file);
      }
    }
  }, [handleFileSelect]);

  const handleRemoveLogo = useCallback(async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar el logo?')) {
      clearError();
      setSuccess(null);

      const success = await deleteLogo(barbershopId, preview || undefined);
      
      if (success) {
        setPreview(null);
        setSuccess('Logo eliminado exitosamente');
        onLogoChange?.(null);
      }
    }
  }, [barbershopId, preview, deleteLogo, onLogoChange, clearError]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Logo de la Barbería
        </h3>
        {preview && (
          <button
            onClick={handleRemoveLogo}
            disabled={uploading}
            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
          >
            Eliminar Logo
          </button>
        )}
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Éxito</p>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Preview del logo */}
        <div className="flex justify-center">
          {preview ? (
            <div className="relative group">
              <img 
                src={preview} 
                alt="Logo de la barbería" 
                className="h-24 w-24 object-contain border-2 border-gray-200 rounded-lg bg-gray-50"
              />
              {preview && !uploading && (
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              <Image className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Zona de upload */}
        <div
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleFileInput}
            disabled={uploading}
          />
          
          <div className="space-y-2">
            <Upload className={`w-8 h-8 mx-auto ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            
            {uploading ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600">Subiendo logo...</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {dragActive ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, GIF hasta 2MB • Recomendado: 200x200px
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botón alternativo */}
        <div className="flex justify-center">
          <button
            onClick={openFileDialog}
            disabled={uploading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Subiendo...' : preview ? 'Cambiar Logo' : 'Seleccionar Logo'}
          </button>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-1">💡 Consejos para el logo:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Usa un fondo transparente (PNG) para mejor integración</li>
          <li>• Mantén un diseño simple que se vea bien en tamaño pequeño</li>
          <li>• Evita texto muy pequeño que pueda ser ilegible</li>
          <li>• El logo aparecerá en el header de tu sistema</li>
        </ul>
      </div>
    </div>
  );
};

export default LogoUpload;