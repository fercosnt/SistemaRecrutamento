/**
 * App.tsx - Componente principal da aplicação Beauty Smile
 *
 * Configuração do React Router e menu de navegação de desenvolvimento.
 *
 * Após FOUND-02/06/11 (Phase 1 Plan 05):
 * - Apenas o `useAuthStore` unificado é inicializado (uma única chamada a
 *   `initialize()` no mount).
 * - Um único `onAuthStateChange` listener despacha para `setSession`
 *   (SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED) ou `clearAuth` (SIGNED_OUT)
 *   — sem stores duplicados, sem race conditions.
 * - Nenhuma flag manual de "Lembrar-me" é lida ou escrita aqui. A
 *   persistência de sessão é responsabilidade exclusiva do Supabase
 *   (`persistSession: true` em `src/lib/supabase/client.ts`).
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
import { useIsAdminAuthenticated } from './store/adminAuthStore'
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
 * Renderizado somente quando `import.meta.env.DEV === true`.
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
 *
 * Responsabilidades:
 * - Inicializar o store de auth unificado UMA única vez.
 * - Registrar UM único listener `supabase.auth.onAuthStateChange` que
 *   despacha para `setSession` ou `clearAuth` no store unificado.
 * - Montar o DevNavigationMenu apenas em ambiente de desenvolvimento.
 * - Renderizar o Toaster de notificações.
 */
function RootLayout() {
  const isAdminAuthenticated = useIsAdminAuthenticated()
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  // Monitorar inatividade apenas para sessões RH/Admin (30 minutos)
  useSessionTimeout(isAdminAuthenticated)

  useEffect(() => {
    const { initialize, setSession, clearAuth } = useAuthStore.getState()

    let cancelled = false

    ;(async () => {
      // Inicializa o store unificado checando sessão existente.
      await initialize()
      if (cancelled) return

      // Um único listener para todas as transições de auth.
      // Captura login/logout cross-tab (via localStorage storage events),
      // expiração de sessão e refresh de token.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            setSession(session)
          } else if (event === 'SIGNED_OUT') {
            clearAuth()
          }
        }
      )

      subscriptionRef.current = subscription
    })()

    // Cleanup: remover listener quando componente desmontar
    return () => {
      cancelled = true
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [])

  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <DevNavigationMenu />}
      <Toaster position="top-right" />
    </>
  )
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
