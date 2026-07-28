/**
 * LoadingDelay Component
 *
 * Wrapper que so renderiza `children` apos um delay configuravel.
 * Evita flash de spinner em verificacoes de sessao que resolvem
 * em < 200ms (cache local Supabase tipico).
 *
 * Rationale (per D-04 / 01-CONTEXT.md):
 * - Verificacao de sessao em cache: ~50-100ms -> usuario nunca ve spinner
 * - Primeira carga: ~500ms+ -> delay esgota, spinner aparece com feedback claro
 * - Tela branca sem delay = usuario pensa que travou
 *
 * @module components/LoadingDelay
 */

import { type ReactNode, useState, useEffect } from 'react'

interface LoadingDelayProps {
  /**
   * Delay em milissegundos antes de renderizar `children`.
   * Default: 200ms (alinhado ao threshold de latencia de cache Supabase).
   */
  delay?: number
  /**
   * Conteudo a renderizar apos o delay esgotar (tipicamente um spinner).
   */
  children: ReactNode
}

/**
 * Renderiza `null` enquanto o delay nao esgota; apos, renderiza `children`.
 *
 * O timer e reiniciado sempre que `delay` muda, e e limpo no unmount
 * (cleanup do useEffect) para evitar leaks e state updates pos-unmount.
 *
 * @example
 * ```tsx
 * {isLoading && (
 *   <LoadingDelay delay={200}>
 *     <Loader2 className="h-8 w-8 animate-spin" />
 *   </LoadingDelay>
 * )}
 * ```
 */
export function LoadingDelay({ delay = 200, children }: LoadingDelayProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return show ? <>{children}</> : null
}
