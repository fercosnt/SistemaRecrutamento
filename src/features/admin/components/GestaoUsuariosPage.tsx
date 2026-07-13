/**
 * Phase 29 / Plan 29-04 — GestaoUsuariosPage (USR-01 landing + USR-02 entry point).
 *
 * The console BODY only — it does NOT mount its own `RHLayout`; `ConfiguracoesPage`
 * owns the RH shell (single-owner rule, no double-nest). It composes the pieces built
 * in 29-01/02/03:
 *   - `useUsuariosRh()` (29-01) reads the roster;
 *   - `<AsyncState>` (M3 5-state wrapper) gates the roster so loading → skeleton,
 *     error → retry (→ refetch), empty → defensive block, success → table are ALL
 *     handled — never a blank surface (T-29-12);
 *   - `<UsuariosRhTable>` (29-03) renders the roster on success;
 *   - the header "Novo usuário" CTA (USR-02 entry) owns the `<NovoUsuarioDialog>` (29-02)
 *     open state.
 *
 * The route + `RoleGuard role="administrador"` stay in `routes.tsx` (untouched) as
 * defense-in-depth — the Phase-28 EF re-authorizes every write server-side (T-29-11).
 *
 * The page frame is `space-y-6`; the legacy `p-8` wrapper is dropped (RHLayout already
 * pads `p-4 lg:p-6` — UI-SPEC §Spacing).
 *
 * @module features/admin/components/GestaoUsuariosPage
 * @see src/features/admin/bias-audit/components/BiasAuditPage.tsx (header + CTA structural twin)
 * @see src/components/ui/AsyncState.tsx (the 5-state wrapper + copy overrides)
 * @see src/features/admin/hooks/useUsuariosRh.ts (29-01 roster query)
 */
import { useState } from 'react'
import { UserPlus } from 'lucide-react'

import { AsyncState } from '@/components/ui/AsyncState'
import { Button } from '@/components/ui/button'

import { useUsuariosRh } from '../hooks/useUsuariosRh'
import { UsuariosRhTable } from './UsuariosRhTable'
import { NovoUsuarioDialog } from './NovoUsuarioDialog'

export function GestaoUsuariosPage() {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError, refetch } = useUsuariosRh()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
            Gestão de usuários
          </h1>
          <p className="text-sm text-white/80">
            Gerencie as contas da equipe de RH — papéis, acesso e redefinição de senha.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="min-h-[44px]">
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Novo usuário
        </Button>
      </header>

      <AsyncState
        isLoading={isLoading}
        isError={isError}
        isEmpty={(data?.length ?? 0) === 0}
        onRetry={() => refetch()}
        copy={{
          error: {
            heading: 'Não foi possível carregar os usuários.',
            generic: 'Verifique a conexão e tente novamente.',
          },
          empty: {
            heading: 'Nenhum usuário encontrado.',
            body: "Crie o primeiro usuário com o botão 'Novo usuário'.",
          },
          retry: { label: 'Tentar novamente' },
        }}
      >
        <UsuariosRhTable rows={data ?? []} />
      </AsyncState>

      <NovoUsuarioDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
