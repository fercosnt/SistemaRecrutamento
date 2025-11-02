import React, { useState } from 'react';
import { Home, Users, Briefcase, Settings, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { BeautySmileLogo } from './BeautySmileLogo';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Glass } from './ui/glass';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  onClick?: () => void;
}

interface RHSidebarProps {
  activePage: string;
  onNavigate: (pageId: string) => void;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function RHSidebar({
  activePage,
  onNavigate,
  userName = 'João Silva',
  userRole = 'Administrador',
  onLogout,
  isCollapsed: externalCollapsed,
  onToggleCollapse,
  isMobileOpen: externalMobileOpen,
  onMobileClose
}: RHSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  
  const isCollapsed = externalCollapsed ?? internalCollapsed;
  const isMobileOpen = externalMobileOpen ?? internalMobileOpen;

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard-rh',
      label: 'Dashboard',
      icon: <Home size={24} />,
    },
    {
      id: 'candidatos-rh',
      label: 'Candidatos',
      icon: <Users size={24} />,
      badge: 12,
    },
    {
      id: 'vagas-rh',
      label: 'Vagas',
      icon: <Briefcase size={24} />,
      badge: 5,
    },
    {
      id: 'configuracoes-rh',
      label: 'Configurações',
      icon: <Settings size={24} />,
    },
  ];

  const handleMenuClick = (itemId: string) => {
    onNavigate(itemId);
    if (onMobileClose) {
      onMobileClose();
    } else {
      setInternalMobileOpen(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    if (onMobileClose) {
      onMobileClose();
    } else {
      setInternalMobileOpen(false);
    }
  };

  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    if (onToggleCollapse) {
      onToggleCollapse(newState);
    } else {
      setInternalCollapsed(newState);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => {
            if (onMobileClose) {
              onMobileClose();
            } else {
              setInternalMobileOpen(false);
            }
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen z-50
          transition-all duration-300
          ${isCollapsed ? 'w-[104px]' : 'w-[280px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full p-4">
          <Glass
            variant="white"
            blur="xl"
            className="h-full rounded-2xl border border-white/20 backdrop-blur-xl flex flex-col"
          >
            {/* Logo Section */}
            <div className="h-[120px] flex items-center justify-center px-4 border-b border-white/10">
              <div className="flex flex-col items-center gap-2">
                <BeautySmileLogo type="icon" size={isCollapsed ? "sm" : "md"} variant="white" />
                {!isCollapsed && (
                  <span className="text-sm text-white drop-shadow-md">Beauty Smile</span>
                )}
              </div>
            </div>

            {/* Menu Items */}
            <ScrollArea className="flex-1 py-4">
              <nav className="space-y-2 px-3">
                {menuItems.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuClick(item.id)}
                      className={`
                        relative w-full flex items-center gap-3 px-4 py-3 rounded-xl
                        transition-all duration-200
                        ${isActive 
                          ? 'bg-[#35BFAD] text-white shadow-lg shadow-[#35BFAD]/30' 
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }
                        ${isCollapsed ? 'justify-center px-2' : ''}
                      `}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className="flex-shrink-0 drop-shadow-sm">
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left drop-shadow-sm">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm drop-shadow-md">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {isCollapsed && item.badge && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#35BFAD] rounded-full shadow-lg shadow-[#35BFAD]/50 border-2 border-white/20" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </ScrollArea>

            {/* User Section */}
            <div className="border-t border-white/10 p-4">
              {!isCollapsed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#35BFAD]/30">
                      <span className="text-sm text-white font-medium">{userName.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate drop-shadow-sm">{userName}</p>
                      <p className="text-xs text-white/60 truncate drop-shadow-sm">{userRole}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 backdrop-blur-sm drop-shadow-sm"
                  >
                    <LogOut size={16} />
                    <span>Sair</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center p-2 rounded-lg text-white/80 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 backdrop-blur-sm"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              )}
            </div>

            {/* Collapse Toggle (Desktop only) */}
            <button
              onClick={handleToggleCollapse}
              className="hidden lg:flex items-center justify-center h-12 border-t border-white/10 hover:bg-white/10 transition-all duration-200 rounded-b-2xl"
            >
              {isCollapsed ? (
                <ChevronRight size={20} className="text-white/60 drop-shadow-sm" />
              ) : (
                <ChevronLeft size={20} className="text-white/60 drop-shadow-sm" />
              )}
            </button>
          </Glass>
        </div>
      </aside>

      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-6 left-6 z-30 w-12 h-12 rounded-xl flex items-center justify-center shadow-xl backdrop-blur-xl border border-white/20"
        style={{ background: 'rgba(255, 255, 255, 0.15)' }}
      >
        <span className="sr-only">Abrir menu</span>
        <svg
          className="w-6 h-6 text-white drop-shadow-md"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </>
  );
}
