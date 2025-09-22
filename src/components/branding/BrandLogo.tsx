// Componente para mostrar logo o ícono por defecto
// Se integra perfectamente con el diseño existente

import React from 'react';
import { Scissors } from 'lucide-react';

interface BrandLogoProps {
  logoUrl?: string | null;
  barbershopName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  logoUrl,
  barbershopName = 'Mi Barbería',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-6 h-6'
  };

  // Si hay logo personalizado, mostrarlo
  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={`Logo de ${barbershopName}`}
        className={`${sizeClasses[size]} object-contain ${className}`}
        onError={(e) => {
          // Si falla la carga, ocultar la imagen y mostrar fallback
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) {
            fallback.style.display = 'flex';
          }
        }}
      />
    );
  }

  // Fallback al ícono por defecto (diseño actual)
  return (
    <div className={`${sizeClasses[size]} bg-primary-600 rounded-lg flex items-center justify-center ${className}`}>
      <Scissors className={`${iconSizeClasses[size]} text-white`} />
    </div>
  );
};

export default BrandLogo;