/**
 * PrivacidadeCandidatoPage — `/candidato/privacidade`, **Seus dados e autorizações**
 * (CONSENT-04 + RETEN-03).
 *
 * É a primeira superfície em que um consentimento coletado por este sistema pode ser
 * desfeito pela própria pessoa, e a primeira em que `autorizacao_retencao_curriculo` é
 * lido por alguém. Ela é também a CASA que a Phase 44 (pedir cópia dos dados) e a
 * Phase 45 (pedir exclusão) vão ocupar — criá-la aqui evita que cada fase invente a sua.
 *
 * O `ScreenShell` é clonado VERBATIM de `ExplicacaoCandidatoPage` (a shell mobile-first
 * travada desde o M1): `BackgroundImage background="gradient"` + overlay 15% +
 * `container mx-auto px-4 max-w-2xl` + `GlassPanel variant="white" blur="xl"`. Nenhum
 * token novo, nenhum primitivo novo, nenhuma dependência nova.
 *
 * **A página NÃO tem CTA primário, por desenho** (43-UI-SPEC §Contrato mínimo do
 * template): a revogação é o próprio `switch`, sem botão "Salvar". Um botão de confirmar
 * seria fricção sobre o exercício de um direito (Invariante 4).
 *
 * @module features/privacidade/components/PrivacidadeCandidatoPage
 * @see src/features/explicacao/components/ExplicacaoCandidatoPage.tsx (a shell clonada + o skeleton de 3 blocos)
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md (§`/candidato/privacidade`)
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackgroundImage } from '@/components/BackgroundImage'
import { Glass, GlassButton, GlassPanel } from '@/components/ui/glass'
import { useCandidato } from '@/store/authStore'
import { usePrivacidade, useGuardaCurriculo } from '../hooks/usePrivacidade'
import { useRevogarMarketing } from '../hooks/useRevogarMarketing'
import { AutorizacoesLista } from './AutorizacoesLista'
import { GuardaCurriculoBloco } from './GuardaCurriculoBloco'

/** Copy verbatim da 43-UI-SPEC §`/candidato/privacidade` (linhas 462-468 e 343). */
export const COPY_PRIVACIDADE = {
  h1: 'Seus dados e autorizações',
  subtitulo:
    'Aqui você vê o que autorizou, muda o que é opcional e sabe por quanto tempo guardamos seus dados.',
  secao1: 'Suas autorizações',
  secao2: 'O que guardamos e por quê',
  voltar: 'Voltar ao painel',
  erroTitulo: 'Não foi possível carregar suas autorizações.',
  erroCorpo: 'Verifique sua conexão e tente novamente.',
  /**
   * ⚠ AUTORADA (a 43-UI-SPEC é silenciosa sobre a falha ISOLADA da leitura de currículo).
   * Escopo de seção, não de página: quando só a leitura do currículo falha, a lista de
   * autorizações — a âncora da tela, e a razão pela qual a pessoa veio — continua
   * legível e o switch continua operante. Derrubar a página inteira por causa da seção
   * subordinada tiraria o direito de revogar por causa de uma informação de leitura.
   */
  erroGuardaTitulo: 'Não foi possível carregar esta informação.',
  tentarNovamente: 'Tentar novamente',
} as const

/**
 * Teto da espera pela hidratação do candidato, em ms. É o MESMO default de
 * `waitForCandidatoHydrated` (Phase 4.1, Pattern 2) — a espera por este fato já tem
 * duração canônica neste projeto e inventar uma segunda seria criar divergência.
 */
export const ESPERA_HIDRATACAO_MS = 3000

export function PrivacidadeCandidatoPage() {
  const navigate = useNavigate()
  const candidato = useCandidato()
  const candidatoId = candidato?.id

  /**
   * ⚠ "AINDA NÃO HIDRATOU" E "CARREGANDO DADO" SÃO FATOS DIFERENTES, e tratá-los como um
   * só produzia um skeleton SEM SAÍDA (code review WR-10): `usePrivacidade` é
   * `enabled: Boolean(candidatoId)`, então sem `candidatoId` a query nunca roda, `isError`
   * nunca fica true, e a tela pulsava para sempre — sem copy de erro, sem nova tentativa,
   * sem teto. O `RoleGuard role="candidato"` gateia pelo PAPEL do JWT, que é fato distinto
   * da linha `candidato` hidratada no store; a corrida entre os dois já é reconhecida no
   * projeto por `waitForCandidatoHydrated`. Numa tela cuja razão de existir é o exercício
   * de um direito, um carregamento irresolúvel é a degradação errada.
   */
  const [esperaEsgotada, setEsperaEsgotada] = useState(false)
  useEffect(() => {
    if (candidatoId) {
      setEsperaEsgotada(false)
      return
    }
    const relogio = setTimeout(() => setEsperaEsgotada(true), ESPERA_HIDRATACAO_MS)
    return () => clearTimeout(relogio)
  }, [candidatoId])

  const {
    data: autorizacoes,
    isLoading,
    isError,
    refetch,
  } = usePrivacidade(candidatoId)

  const guarda = useGuardaCurriculo(candidatoId)
  const revogar = useRevogarMarketing(candidatoId)

  const voltarAoPainel = () => navigate('/candidato/dashboard')

  // ── Hidratação que não veio ─────────────────────────────────────────────────
  // O DESFECHO LIMITADO da espera acima. Reusa a copy de erro da spec de propósito: da
  // perspectiva de quem olha, "não carregou" é o mesmo fato, e inventar uma segunda
  // mensagem para uma causa interna seria explicar ao titular um detalhe de arquitetura.
  // A nova tentativa é recarregar a página, porque o que falta é a hidratação do store —
  // um `refetch` da query não a produz.
  if (!candidatoId && esperaEsgotada) {
    return (
      <ScreenShell>
        <GlassPanel
          variant="white"
          blur="xl"
          className="space-y-4 p-12 text-center text-white"
        >
          <p className="text-xl font-semibold text-white drop-shadow-md">
            {COPY_PRIVACIDADE.erroTitulo}
          </p>
          <p className="text-white/80">{COPY_PRIVACIDADE.erroCorpo}</p>
          <GlassButton
            variant="white"
            hover
            onClick={() => window.location.reload()}
            className="min-h-[44px] text-white"
          >
            {COPY_PRIVACIDADE.tentarNovamente}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Carregando ──────────────────────────────────────────────────────────────
  // Skeleton de 3 blocos glass pulsantes (idioma verbatim do `ExplicacaoCandidatoPage`),
  // preservando a altura para não haver salto de layout. Agora com TETO: passados
  // `ESPERA_HIDRATACAO_MS` sem `candidatoId`, o ramo acima assume.
  if (!candidatoId || isLoading) {
    return (
      <ScreenShell>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Glass key={i} variant="white" blur="md" className="h-16 animate-pulse p-6">
              <span />
            </Glass>
          ))}
        </div>
      </ScreenShell>
    )
  }

  // ── Erro de leitura (com nova tentativa) ────────────────────────────────────
  // Copy própria da spec — nunca o texto cru do erro de transporte.
  if (isError) {
    return (
      <ScreenShell>
        <GlassPanel
          variant="white"
          blur="xl"
          className="space-y-4 p-12 text-center text-white"
        >
          <p className="text-xl font-semibold text-white drop-shadow-md">
            {COPY_PRIVACIDADE.erroTitulo}
          </p>
          <p className="text-white/80">{COPY_PRIVACIDADE.erroCorpo}</p>
          <GlassButton
            variant="white"
            hover
            onClick={() => refetch()}
            className="min-h-[44px] text-white"
          >
            {COPY_PRIVACIDADE.tentarNovamente}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <GlassPanel variant="white" blur="xl" className="space-y-6 text-white">
        <h1 className="text-3xl font-semibold drop-shadow-md md:text-4xl">
          {COPY_PRIVACIDADE.h1}
        </h1>
        <p className="text-base leading-relaxed text-white/90">
          {COPY_PRIVACIDADE.subtitulo}
        </p>

        {/* ── Seção 1 — a âncora visual da tela ──────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            {COPY_PRIVACIDADE.secao1}
          </h2>
          <AutorizacoesLista
            autorizacoes={autorizacoes ?? null}
            pendente={revogar.isPending}
            erroEscrita={revogar.isError}
            onAlternarMarketing={(idAutorizacao, novoValor) =>
              revogar.mutate({ idAutorizacao, novoValor })
            }
          />
        </section>

        {/* ── Seção 2 — leitura, depois da lista, porque não é ação ──────────── */}
        <section className="space-y-4 border-t border-white/15 pt-6">
          <h2 className="text-xl font-semibold text-white">
            {COPY_PRIVACIDADE.secao2}
          </h2>

          {guarda.isLoading ? (
            <Glass variant="white" blur="md" className="h-16 animate-pulse p-6">
              <span />
            </Glass>
          ) : guarda.isError ? (
            <div className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                {COPY_PRIVACIDADE.erroGuardaTitulo}
              </p>
              <p className="text-base leading-relaxed text-white/90">
                {COPY_PRIVACIDADE.erroCorpo}
              </p>
              <GlassButton
                variant="white"
                hover
                onClick={() => guarda.refetch()}
                className="min-h-[44px] text-white"
              >
                {COPY_PRIVACIDADE.tentarNovamente}
              </GlassButton>
            </div>
          ) : (
            <GuardaCurriculoBloco
              autorizado={autorizacoes?.autorizacao_retencao_curriculo === true}
              temCurriculo={guarda.data?.temCurriculo === true}
              autorizadoEm={autorizacoes?.created_at ?? null}
            />
          )}
        </section>

        <div className="pt-2">
          <GlassButton
            variant="white"
            onClick={voltarAoPainel}
            className="min-h-[44px] text-white"
          >
            {COPY_PRIVACIDADE.voltar}
          </GlassButton>
        </div>
      </GlassPanel>
    </ScreenShell>
  )
}

/** Shell glass mobile-first — clonada verbatim de `ExplicacaoCandidatoPage`. */
function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto mt-8 max-w-2xl px-4">{children}</div>
      </BackgroundImage>
    </div>
  )
}
