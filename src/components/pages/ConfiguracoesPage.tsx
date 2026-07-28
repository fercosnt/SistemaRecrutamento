import { RHLayout } from '../RHLayout';
import { GestaoUsuariosPage } from '@/features/admin/components/GestaoUsuariosPage';

interface ConfiguracoesPageProps {
  onVoltar?: () => void;
}

/**
 * ConfiguracoesPage (/rh/configuracoes, A14) — route host for the RH user-management console.
 *
 * Phase 29 (M5) replaces the M4 "feature unavailable" empty-state with the real console.
 * This file stays the SINGLE `RHLayout` owner + keeps the export name
 * `ConfiguracoesPage` (the route imports it lazily). The route and `RoleGuard role="administrador"`
 * live in `src/router/routes.tsx` (unchanged — defense-in-depth over the Phase-28 EF server authz).
 *
 * The console body — header "Gestão de usuários" + "Novo usuário" CTA + the AsyncState-gated
 * roster — lives in `GestaoUsuariosPage` (the page frame moved there); `ConfiguracoesPage` only
 * mounts the RH shell around it (no double-nest, no legacy `p-8` wrapper). The sidebar nav label
 * stays "Configurações" (out of scope to rename).
 */
export function ConfiguracoesPage(_props: ConfiguracoesPageProps) {
  return (
    <RHLayout>
      <GestaoUsuariosPage />
    </RHLayout>
  );
}
