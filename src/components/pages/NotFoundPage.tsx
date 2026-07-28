import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { GlassCard, GlassButton } from '../ui/glass';
import { useRole } from '@/store/authStore';

/**
 * Phase 17 / D-14 — Beauty Smile glass 404 page (catch-all `path: '*'`).
 *
 * Standalone glass surface on the candidate gradient background. It must render for ANY
 * role (incl. unauthenticated / unknown), so it carries NO persona navbar and NO RoleGuard
 * — it is a terminal presentational page (UI-SPEC §Persona shells; threat T-17-02-EOP accept).
 *
 * The single accent affordance is a role-aware SPA back-link (turquoise), computed from the
 * auth-store `role`. It exposes NO protected route names (V7 error handling): the three
 * targets are fixed internal home routes selected purely by the store role.
 *
 * Copy is the verbatim UI-SPEC §404 contract. The display "404" uses 600 (semibold) at
 * 48px — the size + Montserrat carry the weight; bold (700) is NOT used (UI-SPEC Typography).
 *
 * Color tokens: the Tailwind `primary` utility resolves correctly (tailwind.config.js maps
 * `primary.DEFAULT` to `hsl(var(--primary))` and globals.css sets `--primary: 234 100% 31%`,
 * i.e. #00109E — the same token LoginCandidatoPage/FormularioCandidaturaPage rely on). This
 * page uses the candidate gradient background + the `bg-[#35BFAD]` turquoise accent token.
 */
export function NotFoundPage() {
  const navigate = useNavigate();
  const role = useRole();

  // Role-aware back-link target + copy (UI-SPEC §404 table).
  //   candidato            → "Voltar ao meu painel" → /candidato/dashboard
  //   rh | administrador   → "Voltar ao painel RH"  → /rh/dashboard
  //   null (no session)    → "Voltar ao início"     → /
  let backLabel: string;
  let backTarget: string;
  switch (role) {
    case 'candidato':
      backLabel = 'Voltar ao meu painel';
      backTarget = '/candidato/dashboard';
      break;
    case 'rh':
    case 'administrador':
      backLabel = 'Voltar ao painel RH';
      backTarget = '/rh/dashboard';
      break;
    default:
      backLabel = 'Voltar ao início';
      backTarget = '/';
      break;
  }

  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen flex items-center justify-center py-16 px-4"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <GlassCard
          variant="dark"
          blur="lg"
          className="w-full max-w-lg mx-auto text-center px-8 py-12 space-y-6"
        >
          <div className="flex justify-center">
            <BeautySmileLogo size="md" />
          </div>

          {/* Display numeral — 48px / 600 (Montserrat); size carries the weight, no bold */}
          <p className="text-[48px] leading-none font-semibold text-white drop-shadow-md">
            404
          </p>

          {/* Heading — 24px / 600 (Montserrat) */}
          <h1 className="text-2xl font-semibold text-white drop-shadow-md">
            Página não encontrada
          </h1>

          {/* Body — 16px / 400 (Inter) */}
          <p className="text-base text-white/85 leading-relaxed">
            O endereço que você tentou acessar não existe ou foi movido.
          </p>

          {/* The single accent affordance — role-aware SPA back-link (turquoise),
              ≥44px tap target (min-h-11), visible text label (a11y, no icon-only). */}
          <div className="flex justify-center pt-2">
            <GlassButton
              variant="accent"
              onClick={() => navigate(backTarget)}
              className="min-h-11 bg-[#35BFAD]/30 text-white font-semibold"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              {backLabel}
            </GlassButton>
          </div>
        </GlassCard>
      </BackgroundImage>
    </div>
  );
}
