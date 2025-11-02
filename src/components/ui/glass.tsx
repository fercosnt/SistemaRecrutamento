import React from 'react';
import { cn } from './utils';

interface GlassProps {
  children: React.ReactNode;
  className?: string;
  /** Intensidade do blur (px) */
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  /** Opacidade do background (0-100) */
  opacity?: number;
  /** Variante de cor baseada no design system */
  variant?: 'primary' | 'secondary' | 'accent' | 'white' | 'dark';
  /** Se deve ter borda */
  border?: boolean;
  /** Se deve ter hover effect */
  hover?: boolean;
  /** Elemento HTML a ser renderizado */
  as?: keyof JSX.IntrinsicElements;
}

const blurVariants = {
  sm: 'backdrop-blur-sm',   // 4px
  md: 'backdrop-blur-md',   // 12px
  lg: 'backdrop-blur-lg',   // 16px
  xl: 'backdrop-blur-xl',   // 24px
};

const variantStyles = {
  primary: 'bg-brand-primary/10 border-brand-primary/20',
  secondary: 'bg-brand-secondary/10 border-brand-secondary/20',
  accent: 'bg-brand-accent/10 border-brand-accent/20',
  white: 'bg-white/15 border-white/25',
  dark: 'bg-black/30 border-black/40',
};

/**
 * Glass Component - Efeito Glassmorphism (Liquid Glass)
 * Inspirado no design do iOS moderno
 * 
 * @example
 * <Glass variant="accent" blur="lg">
 *   <h2>Conteúdo</h2>
 * </Glass>
 */
export function Glass({
  children,
  className = '',
  blur = 'md',
  opacity,
  variant = 'white',
  border = true,
  hover = false,
  as: Component = 'div',
}: GlassProps) {
  const customOpacity = opacity ? { backgroundColor: `rgba(255, 255, 255, ${opacity / 100})` } : {};
  
  return (
    <Component
      className={cn(
        // Base glass effect
        blurVariants[blur],
        'backdrop-saturate-150',
        
        // Variant colors
        !opacity && variantStyles[variant],
        
        // Border
        border && 'border',
        
        // Rounded corners
        'rounded-xl',
        
        // Shadow
        'shadow-lg',
        
        // Hover effect - escurece ao invés de clarear para manter legibilidade
        hover && 'transition-all duration-300 hover:bg-white/25 hover:shadow-xl',
        
        className
      )}
      style={opacity ? customOpacity : undefined}
    >
      {children}
    </Component>
  );
}

/**
 * GlassCard - Card com efeito glass pré-configurado
 * 
 * @example
 * <GlassCard variant="accent" blur="lg" className="p-6">
 *   <h3>Título</h3>
 *   <p>Conteúdo</p>
 * </GlassCard>
 */
export function GlassCard({
  children,
  className = '',
  ...props
}: GlassProps) {
  return (
    <Glass
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </Glass>
  );
}

/**
 * GlassPanel - Painel glass para dashboards
 * 
 * @example
 * <GlassPanel variant="primary">
 *   <div className="space-y-4">
 *     <h3>Dashboard Stats</h3>
 *     <p>Métricas</p>
 *   </div>
 * </GlassPanel>
 */
export function GlassPanel({
  children,
  className = '',
  ...props
}: GlassProps) {
  return (
    <Glass
      className={cn('p-8 space-y-4', className)}
      blur="lg"
      {...props}
    >
      {children}
    </Glass>
  );
}

/**
 * GlassButton - Botão com efeito glass
 * 
 * @example
 * <GlassButton variant="accent" onClick={() => {}}>
 *   Clique aqui
 * </GlassButton>
 */
export const GlassButton = React.forwardRef<
  HTMLButtonElement,
  GlassProps & { 
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }
>(({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Glass effects
        props.blur ? blurVariants[props.blur] : blurVariants.md,
        'backdrop-saturate-150',
        !props.opacity && (props.variant ? variantStyles[props.variant] : variantStyles.white),
        props.border !== false && 'border',
        'rounded-xl shadow-lg',
        
        // Button styles
        'px-6 py-3 cursor-pointer',
        'hover:bg-white/20 active:scale-95',
        'transition-all duration-200',
        
        // Disabled
        disabled && 'opacity-50 cursor-not-allowed',
        
        className
      )}
    >
      {children}
    </button>
  );
});

GlassButton.displayName = 'GlassButton';

/**
 * GlassNavbar - Navbar com efeito glass (fixed)
 * 
 * @example
 * <GlassNavbar>
 *   <nav>Menu items</nav>
 * </GlassNavbar>
 */
export function GlassNavbar({
  children,
  className = '',
  ...props
}: GlassProps) {
  return (
    <Glass
      as="nav"
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'px-6 py-4',
        className
      )}
      blur="xl"
      {...props}
    >
      {children}
    </Glass>
  );
}

/**
 * GlassModal - Modal com backdrop glass
 * 
 * @example
 * <GlassModal variant="dark" blur="xl">
 *   <div className="p-8">
 *     <h2>Modal Content</h2>
 *   </div>
 * </GlassModal>
 */
export function GlassModal({
  children,
  className = '',
  onClose,
  ...props
}: GlassProps & { onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm bg-black/30"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <Glass
        className={cn(
          'relative max-w-2xl w-full max-h-[90vh] overflow-y-auto',
          className
        )}
        blur="xl"
        {...props}
      >
        {children}
      </Glass>
    </div>
  );
}
