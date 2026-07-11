import { RHLayout } from '../RHLayout';
import { GlassCard } from '../ui/glass';
import { UserRound } from 'lucide-react';

interface MeuPerfilPageProps {
  onVoltar?: () => void;
}

/**
 * MeuPerfilPage (RH, /rh/perfil, A37) — gated behind an "em breve" empty-state.
 *
 * UX-06: the previous content was stub save / senha / foto forms seeded with a hardcoded
 * fake user ("João Silva") whose submit handlers persisted nothing (all TODO(M5)). Per the
 * locked CONTEXT decision (remove, not disable), the stub forms are replaced with a single
 * centered empty-state.
 * The RH shell, the page header/title, the route, and the RoleGuard (rh/administrador)
 * are kept; real profile editing is deferred to M5.
 */
export function MeuPerfilPage(_props: MeuPerfilPageProps) {
  return (
    <RHLayout>
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header — kept so the recruiter still knows where they are (UI-SPEC §2). */}
          <div className="mb-8">
            <h1 className="text-white drop-shadow-lg mb-2">Meu Perfil</h1>
            <div className="h-px bg-white/20 mt-4" />
          </div>

          {/* Empty-state — feature unavailable, no CTA (UX-06; real impl → M5). */}
          <GlassCard variant="white" blur="md" className="rounded-xl">
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <UserRound className="h-12 w-12 text-white/40" aria-hidden="true" />
              <p className="text-xl font-semibold text-white">
                Edição de perfil em breve
              </p>
              <p className="max-w-md text-sm text-white/70">
                A edição dos seus dados, senha e foto estará disponível em uma próxima atualização.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </RHLayout>
  );
}
