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
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const bgImage = backgrounds[background];
  
  const positionClass = fixed ? 'fixed inset-0' : 'absolute inset-0';
  
  // Preload da imagem para evitar travamentos
  React.useEffect(() => {
    if (!bgImage) return;
    
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => {
      console.error('Erro ao carregar background:', bgImage);
      setImageLoaded(true); // Ainda renderiza mesmo com erro
    };
    img.src = bgImage;
  }, [bgImage]);
  
  return (
    <div className={`relative ${className}`}>
      {/*
        Solid dark base layer — bottom-most, unconditional.
        Renders immediately and always, even if the background image is slow,
        cached-cold, or 404s. Guarantees white-on-glass text has a real dark
        ancestor (>=4.5:1 contrast) and gives axe-core a solid background color
        to compute contrast against (it cannot evaluate CSS background-image,
        and otherwise falls back to the light body color → false WCAG failures).
        Hex literal #00109E (brand primary, ~12:1 vs white) is correct here:
        the layer must render independent of token resolution (ErrorBoundary
        precedent, PATTERNS §App.tsx). Do not swap to bg-primary token.
      */}
      <div className={`${positionClass} bg-[#00109E]`} aria-hidden="true" />

      {/* Background Image */}
      <div
        className={`${positionClass} bg-center bg-no-repeat transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed'
        }}
      />
      
      {/* Loading placeholder */}
      {!imageLoaded && (
        <div className={`${positionClass} bg-gradient-to-br from-[#00109E] to-[#35BFAD] animate-pulse`} />
      )}
      
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
