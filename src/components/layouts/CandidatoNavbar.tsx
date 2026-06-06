/**
 * CandidatoNavbar — shared sticky persona navbar for the logged-in candidate.
 *
 * Phase 5 / Plan 05-03 Task 2 (WR-02-09): extracts the ~55-line persona-shell JSX
 * that was copy-pasted across MeuPerfilCandidatoPage, VagasPublicasPage,
 * VagaDetalhePage and FormularioCandidaturaPage (plus the duplicated
 * `candidatoIniciais` + `handleLogout` helpers). Any future navbar change now lives
 * in one place.
 *
 * Renders null unless the user is an authenticated candidato (preserves VAGA-01
 * anon-browse: anonymous visitors see /vagas exactly as before, no header, no PII).
 *
 * @prop showAreaLink — when true (default), renders the "Área do candidato" link to
 *   /candidato/perfil. MeuPerfilCandidatoPage passes `false` because it IS the area.
 *
 * Logout (WR-01-09): handleLogout now does a real try/catch. authStore.logout was
 * root-fixed to re-throw signOut failures (after clearAuth), so the catch here can
 * surface an honest error toast instead of always showing success.
 * Pitfall 7: console.error logs only the message, never PII/token.
 */

import { useNavigate } from 'react-router-dom'
import { LogOut, UserCircle } from 'lucide-react'
import { toast } from 'sonner'
import { BeautySmileLogo } from '../BeautySmileLogo'
import { Glass, GlassButton } from '../ui/glass'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { useAuthStore } from '@/store/authStore'

interface CandidatoNavbarProps {
  /**
   * Renderiza o link "Área do candidato" → /candidato/perfil.
   * @default true
   */
  showAreaLink?: boolean
}

export function CandidatoNavbar({ showAreaLink = true }: CandidatoNavbarProps) {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)
  const candidato = useAuthStore((state) => state.candidato)
  const logout = useAuthStore((state) => state.logout)

  // VAGA-01 anon-browse guard: only render for an authenticated candidato.
  if (!isAuthenticated || role !== 'candidato') {
    return null
  }

  const candidatoIniciais = (candidato?.nome_completo || 'C')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Você saiu da sua conta com sucesso', {
        description: 'Até breve!',
      })
      navigate('/auth/login', { replace: true })
    } catch (error) {
      // WR-01-09: now reachable — authStore.logout re-throws on signOut failure.
      // Pitfall 7: log only the message, never PII/token.
      console.error('Erro ao fazer logout:', error)
      toast.error('Erro ao sair', {
        description: 'Tente novamente.',
      })
    }
  }

  return (
    <div className="w-full sticky top-0 z-50 mb-8">
      <Glass variant="white" blur="xl" className="border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Logo + divider + Avatar + name */}
            <div className="flex items-center gap-4">
              <BeautySmileLogo type="icon" size="sm" variant="white" />
              <div className="hidden sm:block h-8 w-px bg-white/20" />
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-white/30">
                  <AvatarImage src={candidato?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-accent/80 text-white text-sm">
                    {candidatoIniciais}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-white font-medium drop-shadow-md leading-tight">
                    {candidato?.nome_completo || 'Candidato'}
                  </p>
                  <p className="text-white/70 text-sm drop-shadow-sm leading-tight">
                    {candidato?.email || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: (optional) Área do candidato + Sair */}
            <div className="flex items-center gap-2">
              {showAreaLink && (
                <GlassButton
                  variant="white"
                  hover
                  onClick={() => navigate('/candidato/perfil')}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-white drop-shadow-sm"
                  aria-label="Área do candidato"
                >
                  <UserCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Área do candidato</span>
                </GlassButton>
              )}
              <GlassButton
                variant="white"
                hover
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-white drop-shadow-sm"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </GlassButton>
            </div>
          </div>
        </div>
      </Glass>
    </div>
  )
}
