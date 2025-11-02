import React, { useState } from 'react';
import { Search, ChevronDown, User, Settings, LogOut, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Glass } from './ui/glass';

interface RHTopBarProps {
  userName?: string;
  userRole?: string;
  notificationCount?: number;
  onSearch?: (query: string) => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
  onMobileMenuToggle?: () => void;
}

export function RHTopBar({
  userName = 'João Silva',
  userRole = 'Administrador',
  notificationCount = 0,
  onSearch,
  onProfileClick,
  onSettingsClick,
  onLogout,
  onMobileMenuToggle,
}: RHTopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-40 px-4 lg:px-6 pt-4">
      <Glass 
        variant="white" 
        blur="xl" 
        className="h-[72px] rounded-2xl border border-white/30 backdrop-blur-xl"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
          {/* Left Section - Mobile Menu + Logo */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
            >
              <Menu size={22} className="text-white drop-shadow-sm" />
            </button>
            
            <div className="hidden lg:block">
              <h6 className="text-white drop-shadow-md">Beauty Smile</h6>
            </div>
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-md">
            <form onSubmit={handleSearch} className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 drop-shadow-sm"
              />
              <input
                type="text"
                placeholder="Buscar candidatos, vagas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#35BFAD] focus:border-transparent focus:bg-white/15 transition-all duration-200 backdrop-blur-sm drop-shadow-sm"
              />
            </form>
          </div>

          {/* Right Section - User */}
          <div className="flex items-center gap-3">
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 h-10 px-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 drop-shadow-md">
                    <span className="text-sm text-white font-medium">
                      {userName.charAt(0)}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm text-white drop-shadow-sm">{userName}</p>
                    <p className="text-xs text-white/70 drop-shadow-sm">{userRole}</p>
                  </div>
                  <ChevronDown size={16} className="text-white/70 hidden md:block drop-shadow-sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border border-white/30 shadow-2xl rounded-xl overflow-hidden"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(20px)'
                }}
              >
                <DropdownMenuLabel className="text-white drop-shadow-sm py-3">
                  Minha Conta
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/20" />
                <DropdownMenuItem
                  onClick={onProfileClick}
                  className="cursor-pointer text-white/90 hover:bg-white/20 hover:text-white focus:bg-white/20 focus:text-white transition-colors duration-200 py-2.5"
                >
                  <User size={16} className="mr-2" />
                  <span className="drop-shadow-sm">Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onSettingsClick}
                  className="cursor-pointer text-white/90 hover:bg-white/20 hover:text-white focus:bg-white/20 focus:text-white transition-colors duration-200 py-2.5"
                >
                  <Settings size={16} className="mr-2" />
                  <span className="drop-shadow-sm">Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/20" />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer text-red-300 hover:bg-red-500/30 hover:text-red-200 focus:bg-red-500/30 focus:text-red-200 transition-colors duration-200 py-2.5"
                >
                  <LogOut size={16} className="mr-2" />
                  <span className="drop-shadow-sm">Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Glass>
    </header>
  );
}
