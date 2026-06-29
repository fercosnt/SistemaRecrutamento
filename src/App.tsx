/**
 * App.tsx - Componente principal da aplicação Beauty Smile
 *
 * Configuração do React Router e menu de navegação de desenvolvimento.
 *
 * Após FOUND-02/06/11 (Phase 1 Plan 05) + Phase 4.1 (auth-hydration-fix):
 * - Apenas o `useAuthStore` unificado é inicializado (uma única chamada a
 *   `initialize()` no mount).
 * - Um único `onAuthStateChange` listener despacha para `hydrateFromSession`
 *   via `setTimeout(0)` (SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED /
 *   PASSWORD_RECOVERY) ou `clearAuth` (SIGNED_OUT, sync). O `setTimeout(0)`
 *   wrapper é mandatório per Supabase docs (Web Lock deadlock prevention) —
 *   sem stores duplicados, sem race conditions.
 * - Nenhuma flag manual de "Lembrar-me" é lida ou escrita aqui. A
 *   persistência de sessão é responsabilidade exclusiva do Supabase
 *   (`persistSession: true` em `src/lib/supabase/client.ts`).
 */

import React, { Suspense, useEffect, useRef } from 'react'
import { RouterProvider, createBrowserRouter, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet'
import { ScrollArea } from './components/ui/scroll-area'
import { PageSkeleton } from './components/ui/PageSkeleton'
import { routes, devNavigationPages } from './router/routes'
import { useAuthStore } from './store/authStore'
import { supabase } from './lib/supabase/client'
import { useSessionTimeout } from './hooks/useSessionTimeout'
import { ErrorBoundary } from './components/ErrorBoundary'

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
 * Hook: usuário está autenticado como RH ou administrador?
 *
 * Phase 4.1 — substitui `useIsAdminAuthenticated` do `adminAuthStore.ts`
 * (re-export shim deletado para fechar FOUND-12). Consumido apenas em
 * RootLayout para gatear `useSessionTimeout` (timeout só para sessões RH).
 */
const useIsAdminAuthenticated = () =>
  useAuthStore((s) => s.isAuthenticated && (s.role === 'rh' || s.role === 'administrador'))

/**
 * Layout raiz que envolve todas as páginas
 *
 * Responsabilidades:
 * - Inicializar o store de auth unificado UMA única vez.
 * - Registrar UM único listener supabase.auth.onAuthStateChange que despacha
 *   para hydrateFromSession (assíncrono, via setTimeout(0) per RESEARCH §Pattern 1)
 *   ou clearAuth (síncrono) no store unificado. Phase 4.1 fix de
 *   INT-BLOCKER-1+2: hydrateFromSession chama fetchProfile para popular
 *   candidato/profile após qualquer SIGNED_IN/TOKEN_REFRESHED/USER_UPDATED/
 *   PASSWORD_RECOVERY.
 * - Montar o DevNavigationMenu apenas em ambiente de desenvolvimento.
 * - Renderizar o Toaster de notificações.
 */
function RootLayout() {
  const isAdminAuthenticated = useIsAdminAuthenticated()
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  // Monitorar inatividade apenas para sessões RH/Admin (30 minutos)
  useSessionTimeout(isAdminAuthenticated)

  useEffect(() => {
    const { initialize, clearAuth } = useAuthStore.getState()

    let cancelled = false

    ;(async () => {
      // Inicializa o store unificado checando sessão existente.
      await initialize()
      if (cancelled) return

      // Phase 4.1 (RESEARCH §Pattern 1):
      //   Async work inside onAuthStateChange MUST be deferred via setTimeout(0)
      //   to prevent supabase-js Web Lock deadlock.
      //   Citation: https://supabase.com/docs/reference/javascript/initializing
      //             https://github.com/supabase/auth-js/issues/762
      //   Sync work (clearAuth) runs immediately to avoid flash-of-unauth-state.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          // Sync path — NEVER inside setTimeout (would create flash of unauth state).
          if (event === 'SIGNED_OUT') {
            clearAuth()
            return
          }

          // Async path — defer to next tick so Web Lock releases.
          setTimeout(() => {
            if (
              event === 'SIGNED_IN' ||
              event === 'TOKEN_REFRESHED' ||
              event === 'USER_UPDATED' ||
              event === 'PASSWORD_RECOVERY'
            ) {
              void useAuthStore.getState().hydrateFromSession(session)
            }
          }, 0)
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
      {/* PERF-03 (Plan 19-02): single Suspense boundary covering every lazy /rh/* +
          /admin/* route. The branded glass PageSkeleton shows while a route chunk
          resolves — never a blank flash. React caches the resolved chunk Promise,
          so a re-visited lazy route renders instantly with no fallback flash. */}
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
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
    // HARD-03 / D-09: ErrorBoundary hoisted to the App root so router-construction,
    // provider, and any render error in the whole tree shows the fallback UI instead
    // of a white screen. Per-route ErrorBoundary wrappers (router/routes.tsx) remain
    // as a finer-grained inner net; this is the outermost catch-all.
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
