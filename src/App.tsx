/**
 * App.tsx - Componente principal da aplicação Beauty Smile
 *
 * Configuração do React Router e menu de navegação de desenvolvimento
 */

import React, { useEffect, useRef } from 'react'
import { RouterProvider, createBrowserRouter, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet'
import { ScrollArea } from './components/ui/scroll-area'
import { routes, devNavigationPages } from './router/routes'
import { useAuthStore } from './store/authStore'
import { useAdminAuthStore } from './store/adminAuthStore'
import { supabase } from './lib/supabase/client'
import { useSessionTimeout } from './hooks/useSessionTimeout'

/**
 * Instância do QueryClient para TanStack Query
 * Configuração global de cache, retry e staleTime
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (anteriormente cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Componente de Menu de Desenvolvimento
 *
 * Menu flutuante para facilitar navegação durante desenvolvimento.
 * Em produção, este componente pode ser removido ou escondido.
 */
function DevNavigationMenu() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handlePageChange = (path: string) => {
    navigate(path)
    setIsMenuOpen(false)
  }

  // Agrupar páginas por categoria
  const pagesByCategory = devNavigationPages.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = []
    }
    acc[page.category].push(page)
    return acc
  }, {} as Record<string, typeof devNavigationPages>)

  return (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#00109E] hover:bg-[#00109E]/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center backdrop-blur-md border-2 border-white/20"
          aria-label="Menu de navegação"
        >
          <Menu size={24} />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-80 bg-[#00109E]/95 backdrop-blur-xl border-l border-white/20 text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-white text-2xl">Navegação Dev</SheetTitle>
          <SheetDescription className="text-white/70">
            Menu provisório para navegação entre páginas
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] mt-8 pr-4">
          <div className="space-y-6">
            {Object.entries(pagesByCategory).map(([category, pages]) => (
              <div key={category}>
                <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2 px-2">
                  {category}
                </h3>
                <div className="space-y-1">
                  {pages.map((page) => (
                    <button
                      key={page.path}
                      onClick={() => handlePageChange(page.path)}
                      className={`
                        w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200
                        flex items-center gap-3 text-sm
                        ${location.pathname === page.path
                          ? 'bg-white/20 text-white shadow-md'
                          : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                        }
                      `}
                    >
                      <span className="text-lg">{page.icon}</span>
                      <span>{page.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="p-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
            <p className="text-white/70 text-xs">
              Menu de desenvolvimento • Remover em produção
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Layout raiz que envolve todas as páginas
 * Inclui menu de navegação, toast notifications e verificação de sessão
 */
function RootLayout() {
  const { initialize, setUser, setSession, clearUser } = useAuthStore();
  const { initialize: initializeAdmin, setUser: setAdminUser, setSession: setAdminSession, clearAdminUser, isAuthenticated: isAdminAuthenticated } = useAdminAuthStore();
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Monitorar inatividade de sessão admin (30 minutos)
  useSessionTimeout(isAdminAuthenticated);

  useEffect(() => {
    // Verificar lógica de "Lembrar-me" para candidatos
    const checkRememberMe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isTemporarySession = sessionStorage.getItem('auth-session-temporary');

      if (session && isTemporarySession === 'true') {
        // Sessão existe mas era temporária e sessionStorage ainda tem a flag
        // Isso significa que é a mesma sessão do navegador, ok
        console.log('Sessão temporária mantida (mesma sessão do navegador)');
      } else if (session && !isTemporarySession) {
        // Sessão existe mas não há flag de temporária no sessionStorage
        // Precisamos verificar se há flag no localStorage indicando que era temporária
        const wasTemporary = localStorage.getItem('auth-was-temporary');
        if (wasTemporary === 'true') {
          // Era uma sessão temporária mas o navegador foi fechado/reaberto
          console.log('Sessão temporária expirada - fazendo logout');
          await supabase.auth.signOut();
          clearUser();
          localStorage.removeItem('auth-was-temporary');
        }
      }
    };

    // Verificar lógica de "Lembrar-me" para admin
    const checkAdminRememberMe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isAdminTemporarySession = sessionStorage.getItem('admin-auth-session-temporary');

      if (session && isAdminTemporarySession === 'true') {
        console.log('Sessão admin temporária mantida (mesma sessão do navegador)');
      } else if (session && !isAdminTemporarySession) {
        const wasAdminTemporary = localStorage.getItem('admin-auth-was-temporary');
        if (wasAdminTemporary === 'true') {
          console.log('Sessão admin temporária expirada - fazendo logout');
          await supabase.auth.signOut();
          clearAdminUser();
          localStorage.removeItem('admin-auth-was-temporary');
        }
      }
    };

    checkRememberMe();
    checkAdminRememberMe();

    // Inicializar auth stores verificando sessão existente
    // Aguardar inicialização antes de configurar listener para evitar race condition
    (async () => {
      // Aguardar ambas as inicializações completarem antes de configurar listener
      await Promise.all([initialize(), initializeAdmin()]);

      // Configurar listener para mudanças no estado de autenticação
      // Isso captura:
      // - Login/Logout de outras tabs
      // - Expiração de sessão
      // - Refresh de token
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);

          if (event === 'SIGNED_IN' && session) {
            // Usuário fez login - atualizar ambos os stores
            setUser(session.user);
            setSession(session);
            setAdminUser(session.user);
            setAdminSession(session);
          } else if (event === 'SIGNED_OUT') {
            // Usuário fez logout - limpar ambos os stores
            clearUser();
            clearAdminUser();
            // Limpar flags de sessão temporária
            sessionStorage.removeItem('auth-session-temporary');
            localStorage.removeItem('auth-was-temporary');
            sessionStorage.removeItem('admin-auth-session-temporary');
            localStorage.removeItem('admin-auth-was-temporary');
          } else if (event === 'TOKEN_REFRESHED' && session) {
            // Token foi renovado - atualizar ambos os stores
            setSession(session);
            setAdminSession(session);
          } else if (event === 'USER_UPDATED' && session) {
            // Dados do usuário foram atualizados - atualizar ambos os stores
            setUser(session.user);
            setAdminUser(session.user);
          }
        }
      );

      subscriptionRef.current = subscription;
    })();

    // Cleanup: remover listener quando componente desmontar
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [initialize, initializeAdmin, setUser, setSession, clearUser, setAdminUser, setAdminSession, clearAdminUser]);

  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <DevNavigationMenu />}
      <Toaster position="top-right" />
    </>
  );
}

/**
 * Configuração de rotas com layout
 */
const routesWithLayout = [
  {
    path: '/',
    element: <RootLayout />,
    children: routes,
  },
]

/**
 * Router configurado
 */
const router = createBrowserRouter(routesWithLayout, {
  future: {
    v7_startTransition: true,
  },
})

/**
 * Componente App principal
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
