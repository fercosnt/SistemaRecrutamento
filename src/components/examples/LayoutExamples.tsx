import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Glass, GlassPanel, GlassButton } from '../ui/glass';

/**
 * Exemplos de Layouts reutilizáveis do Design System
 * Use como referência para criar novas páginas
 */

// ============================================
// 1. HERO SECTION CENTRALIZADO
// ============================================
export function HeroLayout({ 
  title, 
  subtitle, 
  description,
  actions 
}: {
  title: string;
  subtitle: string;
  description: string;
  actions?: Array<{ label: string; onClick: () => void; primary?: boolean }>;
}) {
  return (
    <BackgroundImage 
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
      className="min-h-screen"
    >
      <div className="flex items-center justify-center min-h-screen py-20 px-4">
        <GlassPanel variant="white" blur="xl" className="text-white text-center max-w-4xl">
          <div className="space-y-6">
            <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-6" />
            <h1 className="text-6xl mb-4 drop-shadow-lg">{title}</h1>
            <p className="text-2xl text-white/90 mb-8 drop-shadow-md">{subtitle}</p>
            <p className="text-white/90 text-lg mb-8 drop-shadow-sm">{description}</p>
            {actions && actions.length > 0 && (
              <div className="flex gap-4 justify-center flex-wrap">
                {actions.map((action, index) => (
                  <GlassButton 
                    key={index}
                    variant="white" 
                    hover 
                    className="px-8 py-4 text-white text-lg drop-shadow-sm"
                    onClick={action.onClick}
                  >
                    {action.label}
                  </GlassButton>
                ))}
              </div>
            )}
          </div>
        </GlassPanel>
      </div>
    </BackgroundImage>
  );
}

// ============================================
// 2. PÁGINA COM HEADER E CARDS
// ============================================
export function PageWithHeader({ 
  background = 'gradient',
  title,
  subtitle,
  children 
}: {
  background?: 'gradient' | 'darkBlue';
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <BackgroundImage 
      background={background}
      overlayColor={background === 'gradient' ? 'bg-black' : undefined}
      overlayOpacity={background === 'gradient' ? 15 : undefined}
      className="min-h-screen py-20"
    >
      <div className="container mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-4" />
          <h1 className="text-white text-5xl mb-2 drop-shadow-lg">{title}</h1>
          <p className="text-white/90 text-xl drop-shadow-md">{subtitle}</p>
        </div>

        {/* Content */}
        {children}
      </div>
    </BackgroundImage>
  );
}

// ============================================
// 3. GRID DE 3 COLUNAS
// ============================================
export function ThreeColumnGrid({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {children}
    </div>
  );
}

// ============================================
// 4. GRID DE 2 COLUNAS
// ============================================
export function TwoColumnGrid({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
  );
}

// ============================================
// 5. GRID DE 4 COLUNAS (Stats)
// ============================================
export function FourColumnGrid({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {children}
    </div>
  );
}

// ============================================
// 6. PÁGINA DE LOGIN CENTRALIZADA
// ============================================
export function LoginLayout({ 
  title,
  subtitle,
  children 
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <BackgroundImage background="darkBlue" className="min-h-screen">
      <div className="flex items-center justify-center min-h-screen py-20 px-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <BeautySmileLogo type="horizontal" size="lg" variant="white" className="mx-auto mb-6" />
            <h1 className="text-white text-3xl mb-2">{title}</h1>
            <p className="text-white/80">{subtitle}</p>
          </div>

          {/* Content */}
          {children}
        </div>
      </div>
    </BackgroundImage>
  );
}

// ============================================
// 7. DASHBOARD COM NAVBAR
// ============================================
export function DashboardLayout({ 
  logoType = 'horizontal',
  navItems,
  userInitials = 'RH',
  children 
}: {
  logoType?: 'horizontal' | 'icon';
  navItems?: Array<{ label: string; href: string; active?: boolean }>;
  userInitials?: string;
  children: React.ReactNode;
}) {
  return (
    <BackgroundImage background="darkBlue" className="min-h-screen py-8">
      {/* Navbar */}
      <Glass variant="white" blur="xl" className="mx-4 mb-8 px-6 py-4">
        <div className="flex items-center justify-between">
          <BeautySmileLogo type={logoType} size="md" variant="white" />
          <div className="flex items-center gap-6">
            {navItems && (
              <nav className="flex gap-6 text-white/80">
                {navItems.map((item, index) => (
                  <a 
                    key={index}
                    href={item.href} 
                    className={`hover:text-white transition-colors ${item.active ? 'text-white' : ''}`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            )}
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <span className="text-white text-sm">{userInitials}</span>
            </div>
          </div>
        </div>
      </Glass>

      {/* Content */}
      <div className="container mx-auto px-4">
        {children}
      </div>
    </BackgroundImage>
  );
}

// ============================================
// 8. SEÇÃO COM TÍTULO E AÇÃO
// ============================================
export function SectionWithAction({ 
  title,
  action,
  children 
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <GlassPanel variant="white" blur="xl" className="text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl drop-shadow-md">{title}</h2>
        {action && (
          <GlassButton 
            variant="white" 
            className="text-white drop-shadow-sm"
            onClick={action.onClick}
          >
            {action.label}
          </GlassButton>
        )}
      </div>
      {children}
    </GlassPanel>
  );
}

// ============================================
// 9. LISTA COM ESPAÇAMENTO
// ============================================
export function StackedList({ 
  gap = 4,
  children 
}: { 
  gap?: 2 | 3 | 4 | 6 | 8;
  children: React.ReactNode 
}) {
  return (
    <div className={`space-y-${gap}`}>
      {children}
    </div>
  );
}

// ============================================
// 10. CONTAINER CENTRALIZADO
// ============================================
export function CenteredContainer({ 
  maxWidth = 'max-w-4xl',
  children 
}: {
  maxWidth?: 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl' | 'max-w-6xl';
  children: React.ReactNode;
}) {
  return (
    <div className={`${maxWidth} mx-auto px-4`}>
      {children}
    </div>
  );
}
