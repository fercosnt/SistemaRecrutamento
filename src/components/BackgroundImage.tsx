import React from 'react';
import { backgrounds, BackgroundKey } from '../assets/images/backgrounds';

interface BackgroundImageProps {
  /** Tipo de background a ser usado */
  background: BackgroundKey;
  /** Classes adicionais do Tailwind */
  className?: string;
  /** Conteúdo a ser renderizado sobre o background */
  children?: React.ReactNode;
  /** Se deve usar position fixed (fullscreen) */
  fixed?: boolean;
  /** Opacity do overlay (0-100) */
  overlayOpacity?: number;
  /** Cor do overlay em formato Tailwind (ex: 'bg-brand-primary') */
  overlayColor?: string;
}

/**
 * Componente para aplicar backgrounds padronizados do Beauty Smile
 * 
 * @example
 * // Background simples
 * <BackgroundImage background="darkBlue">
 *   <div>Conteúdo</div>
 * </BackgroundImage>
 * 
 * @example
 * // Background com overlay
 * <BackgroundImage 
 *   background="darkBlue" 
 *   overlayColor="bg-brand-primary"
 *   overlayOpacity={20}
 * >
 *   <div>Conteúdo</div>
 * </BackgroundImage>
 */
export function BackgroundImage({
  background,
  className = '',
  children,
  fixed = false,
  overlayOpacity,
  overlayColor,
}: BackgroundImageProps) {
  const bgImage = backgrounds[background];
  
  const positionClass = fixed ? 'fixed inset-0' : 'absolute inset-0';
  
  return (
    <div className={`relative ${className}`}>
      {/* Background Image */}
      <div 
        className={`${positionClass} bg-center bg-no-repeat`}
        style={{ 
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed'
        }}
      />
      
      {/* Optional Overlay */}
      {overlayColor && overlayOpacity && (
        <div 
          className={`${positionClass} ${overlayColor}`}
          style={{ opacity: overlayOpacity / 100 }}
        />
      )}
      
      {/* Content */}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Hook para usar backgrounds como inline styles
 * 
 * @example
 * const bgStyle = useBackground('darkBlue');
 * <div style={bgStyle}>Conteúdo</div>
 */
export function useBackground(background: BackgroundKey) {
  return {
    backgroundImage: `url(${backgrounds[background]})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
}
