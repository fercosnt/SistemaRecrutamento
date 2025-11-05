import React, { ReactNode, useState } from 'react';
import { BackgroundImage } from './BackgroundImage';
import { RHSidebar } from './RHSidebar';
import { RHTopBar } from './RHTopBar';

interface RHLayoutProps {
  children: ReactNode;
  activePage: string;
  onNavigate: (pageId: string) => void;
  userName?: string;
  userRole?: string;
  notificationCount?: number;
  onSearch?: (query: string) => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
}

/**
 * Layout padrão para páginas da área administrativa de RH
 * Inclui fundo azul, sidebar e top bar
 */
export function RHLayout({
  children,
  activePage,
  onNavigate,
  userName,
  userRole,
  notificationCount,
  onSearch,
  onProfileClick,
  onSettingsClick,
  onLogout,
}: RHLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <BackgroundImage background="darkBlue">
        {/* Sidebar */}
        <RHSidebar
          activePage={activePage}
          onNavigate={onNavigate}
          userName={userName}
          userRole={userRole}
          onLogout={onLogout}
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
            userName={userName}
            userRole={userRole}
            notificationCount={notificationCount}
            onSearch={onSearch}
            onProfileClick={onProfileClick}
            onSettingsClick={onSettingsClick}
            onLogout={onLogout}
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
