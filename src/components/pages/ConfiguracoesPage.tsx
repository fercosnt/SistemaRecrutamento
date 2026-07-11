import { RHLayout } from '../RHLayout';
import { GlassCard } from '../ui/glass';
import { Users } from 'lucide-react';

interface ConfiguracoesPageProps {
  onVoltar?: () => void;
}

/**
 * ConfiguracoesPage (/rh/configuracoes, A14) — gated behind a "not available" empty-state.
 *
 * UX-06: the previous content was an entirely mock admin console — a fake user list with
 * PII-shaped names/emails, fake audit logs naming candidates, dead M1 webhook names
 * (Big Five / DISC / Raven / Cultura), and stub save/toggle/excluir/reset handlers that
 * persisted nothing. None of it was wired to a real backend and the mock user/audit lists
 * rendered fabricated identifiers — an offboarding-LGPD minimum. Per the locked CONTEXT
 * decision (remove, not disable), the whole mock content region is replaced with a single
 * centered empty-state. The RH shell, the page header/title, the route, and the RoleGuard
 * (administrador) are kept intact; the real user-management feature is deferred to M5.
 */
export function ConfiguracoesPage(_props: ConfiguracoesPageProps) {
  return (
    <RHLayout>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header — kept so the recruiter still knows where they are (UI-SPEC §2). */}
          <div className="mb-8">
            <h1 className="text-white drop-shadow-lg mb-2">Configurações</h1>
            <p className="text-white/80 drop-shadow-md">
              Gerencie as configurações do sistema de recrutamento
            </p>
          </div>

          {/* Empty-state — feature unavailable, no CTA (UX-06; real impl → M5). */}
          <GlassCard variant="white" blur="md" className="rounded-xl">
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Users className="h-12 w-12 text-white/40" aria-hidden="true" />
              <p className="text-xl font-semibold text-white">
                Gestão de usuários ainda não disponível
              </p>
              <p className="max-w-md text-sm text-white/70">
                Esta área está em desenvolvimento e chegará em uma próxima atualização.
                Nenhuma ação de usuário está disponível aqui por enquanto.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </RHLayout>
  );
}
