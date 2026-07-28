import { RHLayout } from '../RHLayout';
import { AsyncState } from '../ui/AsyncState';
import { usePerfilRh } from '@/features/perfil-rh/hooks/usePerfilRh';
import { PerfilSection } from '@/features/perfil-rh/components/PerfilSection';
import { SenhaSection } from '@/features/perfil-rh/components/SenhaSection';

interface MeuPerfilPageProps {
  onVoltar?: () => void;
}

/**
 * MeuPerfilPage (RH, /rh/perfil, A37) — the real self-service profile (M5 / Phase 30).
 *
 * Replaces the M4 "Edição de perfil em breve" empty-state stub with the live profile:
 * a Perfil section (name + avatar + read-only SEG-03 context) and a Senha section
 * (password change with re-auth). The RH shell (single RHLayout owner), the page header,
 * the route (`routes.tsx`), and the RoleGuard (rh/administrador) are UNCHANGED.
 *
 * The own-profile row loads via `usePerfilRh` (own-row allowlist read) and the whole body
 * is gated by `<AsyncState>` (loading skeleton / error+retry / success) — never blank.
 */
export function MeuPerfilPage(_props: MeuPerfilPageProps) {
  const { data, isLoading, isError, refetch } = usePerfilRh();

  return (
    <RHLayout>
      <div className="max-w-3xl space-y-6">
        {/* Header — kept so the recruiter still knows where they are (UI-SPEC §Layout). */}
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Meu Perfil</h1>
          <p className="text-sm text-white/80">Atualize seus dados, senha e foto.</p>
        </header>

        <AsyncState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          glass={false}
          copy={{
            error: {
              heading: 'Não foi possível carregar seu perfil.',
              generic: 'Verifique a conexão e tente novamente.',
            },
            retry: { label: 'Tentar novamente' },
          }}
        >
          {data && (
            <div className="space-y-6">
              <PerfilSection perfil={data} />
              <SenhaSection email={data.email} />
            </div>
          )}
        </AsyncState>
      </div>
    </RHLayout>
  );
}
