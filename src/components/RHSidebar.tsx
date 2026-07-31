import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Briefcase, Scale, Settings, ChevronLeft, ChevronRight, LogOut, Bug, BarChart3, ShieldCheck } from 'lucide-react';
import { BeautySmileLogo } from './BeautySmileLogo';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Glass } from './ui/glass';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { getAvatarSignedUrl } from '@/features/perfil-rh/services/perfilRhService';
import { useRevisoesPendentesCount } from '@/features/revisao/hooks/useRevisoesPendentesCount';
import { formatarBadgePendentes } from '@/features/revisao/services/revisaoService';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  /**
   * Conteúdo do contador ao lado do rótulo. Este slot existe na interface desde sempre e
   * NUNCA teve consumidor — o plano 42-10 é o primeiro.
   *
   * ⚠ POR QUE `string` E NÃO `number` (escolha registrada, uma das duas opções do plano):
   * o transbordo tem de mostrar `99+`, que não é número. Das duas saídas possíveis
   * (alargar o slot para `number | string`, ou derivar o rótulo do número no render),
   * escolheu-se ALARGAR — e alargar até o fim: o slot passa a ser `string`, porque quem
   * decide a apresentação é `formatarBadgePendentes`, e ter DUAS fontes de verdade sobre
   * "como um contador aparece" é exatamente como um `0` volta a vazar para a tela.
   * O contrato é: `undefined` some, string aparece.
   */
  badge?: string;
  onClick?: () => void;
}

interface RHSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function RHSidebar({
  isCollapsed: externalCollapsed,
  onToggleCollapse,
  isMobileOpen: externalMobileOpen,
  onMobileClose
}: RHSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, candidato, logout: authLogout } = useAuthStore();
  // D-13: the Admin sidebar item is gated on role === 'administrador'. Visibility is
  // COSMETIC — the /admin/* routes keep their RoleGuard + RLS as the real control.
  const role = useAuthStore((s) => s.role);
  // Shell identity for an RH user comes from `usuarios_rh` (adminUser); for an RH user the
  // legacy `candidato` is null, so the email prefix is the LAST-resort fallback only (Task 3).
  const adminUser = useAuthStore((s) => s.adminUser);

  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);

  const isCollapsed = externalCollapsed ?? internalCollapsed;
  const isMobileOpen = externalMobileOpen ?? internalMobileOpen;

  // Nome do usuário: nome do RH (adminUser) → candidato (legado) → prefixo do email (último recurso)
  const userName =
    adminUser?.nome_completo ||
    candidato?.nome_completo ||
    user?.email?.split('@')[0] ||
    'Usuário';
  // IN-01: derive the user-card label from the subscribed `role` so an authenticated
  // administrador is not mislabeled "RH" while seeing the role-gated Admin nav item.
  const userRole = role === 'administrador' ? 'Administrador' : 'RH';

  // Signed avatar (panel-wide). Sign the stored path only when present; NEVER log the URL (Pitfall-7).
  const avatarPath = adminUser?.avatar_url ?? null;
  const { data: avatarSignedUrl } = useQuery({
    queryKey: ['avatar-signed', avatarPath],
    queryFn: () => getAvatarSignedUrl(avatarPath as string),
    enabled: !!avatarPath,
    staleTime: 55 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Contador de revisões pendentes (REVISAO-02). O valor exibido NUNCA é a contagem
  // crua: `formatarBadgePendentes` devolve `undefined` para zero, carregando e falha de
  // leitura, e `'99+'` acima de 99. Passar o número direto colocaria um "0" solto no
  // menu em três estados distintos — e um contador errado no menu é pior que contador
  // nenhum, porque manda o operador procurar trabalho que não existe.
  const { data: revisoesPendentes } = useRevisoesPendentesCount();
  const badgeRevisoes = formatarBadgePendentes(revisoesPendentes);

  // Detectar página ativa baseado na rota atual
  const getActivePageFromPath = (pathname: string): string => {
    if (pathname.startsWith('/rh/dashboard')) return 'dashboard-rh';
    if (pathname.startsWith('/rh/candidatos')) return 'candidatos-rh';
    // Sítio 2 de 3 da entrada de Revisões — ANTES de /rh/vagas, mantendo a ordem de
    // especificidade das demais. Sem esta linha o item navega mas nunca se acende.
    if (pathname.startsWith('/rh/revisoes')) return 'revisoes-rh';
    if (pathname.startsWith('/rh/vagas')) return 'vagas-rh';
    if (pathname.startsWith('/rh/relatorios')) return 'relatorios-rh';
    if (pathname.startsWith('/rh/suporte')) return 'suporte-rh';
    if (pathname.startsWith('/rh/configuracoes')) return 'configuracoes-rh';
    if (pathname.startsWith('/admin')) return 'admin';
    return 'dashboard-rh';
  };

  const activePage = getActivePageFromPath(location.pathname);

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
    },
    // Sítio 1 de 3 — o item existe. Posição travada pela 42-UI-SPEC: entre Candidatos e
    // Vagas. A visibilidade aqui é COSMÉTICA (mesmo modelo mental do D-13 abaixo): quem
    // controla o acesso é o `RoleGuard` da rota e o escopo por vaga dentro do RPC.
    {
      id: 'revisoes-rh',
      label: 'Revisões',
      icon: <Scale size={24} />,
      badge: badgeRevisoes,
    },
    {
      id: 'vagas-rh',
      label: 'Vagas',
      icon: <Briefcase size={24} />,
    },
    {
      id: 'relatorios-rh',
      label: 'Relatórios',
      icon: <BarChart3 size={24} />,
    },
    {
      id: 'suporte-rh',
      label: 'Suporte',
      icon: <Bug size={24} />,
    },
    {
      id: 'configuracoes-rh',
      label: 'Configurações',
      icon: <Settings size={24} />,
    },
    // D-13: role-gated Admin entry — visible ONLY for administrador (hidden for rh/candidato).
    // Opens sub-nav to /admin/* (ai-logs default). Visibility is cosmetic; the route RoleGuard
    // + RLS remain the real access boundary.
    ...(role === 'administrador'
      ? [{ id: 'admin', label: 'Admin', icon: <ShieldCheck size={24} /> }]
      : []),
  ];

  const handleMenuClick = (itemId: string) => {
    // Mapear itemId para rota
    const routes: Record<string, string> = {
      'dashboard-rh': '/rh/dashboard',
      'candidatos-rh': '/rh/candidatos',
      // Sítio 3 de 3 — sem esta entrada o item existe, se acende, e não navega.
      'revisoes-rh': '/rh/revisoes',
      'vagas-rh': '/rh/vagas',
      'relatorios-rh': '/rh/relatorios',
      'suporte-rh': '/rh/suporte',
      'configuracoes-rh': '/rh/configuracoes',
      'admin': '/admin/ai-logs',
    };

    const route = routes[itemId];
    if (route) {
      navigate(route);
    }

    // Fechar menu mobile
    if (onMobileClose) {
      onMobileClose();
    } else {
      setInternalMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authLogout();
      navigate('/auth/login-rh');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Navegar mesmo se houver erro
      navigate('/auth/login-rh');
    }

    // Fechar menu mobile
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
                          {/* TERNÁRIO, não `&&`. A forma anterior era
                              `item.badge && item.badge > 0 && (…)`: com `badge` numérico
                              zerado, `0 && …` curto-circuita para `0` — e o React
                              renderiza `0` como TEXTO, colocando um algarismo solto no
                              menu. O bug era latente porque este slot nunca teve
                              consumidor; o plano 42-10 é o primeiro, e seria a primeira
                              vítima. Com o ternário, qualquer valor falsy some de fato. */}
                          {item.badge ? (
                            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm drop-shadow-md">
                              {item.badge}
                            </Badge>
                          ) : null}
                        </>
                      )}
                      {isCollapsed && item.badge ? (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#35BFAD] rounded-full shadow-lg shadow-[#35BFAD]/50 border-2 border-white/20" />
                      ) : null}
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
                    <div className="w-10 h-10 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg shadow-[#35BFAD]/30">
                      {avatarSignedUrl ? (
                        <img
                          src={avatarSignedUrl}
                          alt={`Foto de perfil de ${userName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm text-white font-medium">{userName.charAt(0)}</span>
                      )}
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
                  aria-label="Sair"
                >
                  <LogOut size={20} />
                </button>
              )}
            </div>

            {/* Collapse Toggle (Desktop only) — icon-only, needs an accessible name (AB-7). */}
            <button
              onClick={handleToggleCollapse}
              aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              className="hidden lg:flex items-center justify-center h-12 border-t border-white/10 hover:bg-white/10 transition-all duration-200 rounded-b-2xl"
            >
              {isCollapsed ? (
                <ChevronRight size={20} className="text-white/60 drop-shadow-sm" aria-hidden="true" />
              ) : (
                <ChevronLeft size={20} className="text-white/60 drop-shadow-sm" aria-hidden="true" />
              )}
            </button>
          </Glass>
        </div>
      </aside>

      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setInternalMobileOpen(!isMobileOpen)}
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
