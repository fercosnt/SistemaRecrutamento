import React, { ReactNode, useState } from 'react';
import { BackgroundImage } from './BackgroundImage';
import { RHSidebar } from './RHSidebar';
import { RHTopBar } from './RHTopBar';

interface RHLayoutProps {
  children: ReactNode;
}

/**
 * Layout padrão para páginas da área administrativa de RH
 * Inclui fundo azul, sidebar e top bar
 *
 * Navegação e dados de usuário são gerenciados internamente
 * pelos componentes RHSidebar e RHTopBar via authStore e React Router
 */
export function RHLayout({ children }: RHLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <BackgroundImage background="darkBlue">
        {/* Sidebar */}
        <RHSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div
          className={`min-h-screen flex flex-col transition-all duration-300 ${
            isSidebarCollapsed ? 'lg:pl-[104px]' : 'lg:pl-[296px]'
          }`}
        >
          {/* Top Bar */}
          <RHTopBar
            onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </BackgroundImage>
    </div>
  );
}
