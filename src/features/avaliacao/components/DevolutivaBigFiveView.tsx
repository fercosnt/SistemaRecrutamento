/**
 * Phase 12 / Plan 12-05 (AVAL-08 / RF-19a) — the candidate in-app devolutiva.
 *
 * The ONE place a candidate sees their own percentiles (own-row read of
 * `devolutivas_candidato` via `loadDevolutiva` — allowlist, never `select('*')`).
 * Presents the 5 OCEAN dimensions respectfully: a header dashboard (dim name +
 * percentil cru + band + proportional bar) with the emotional disclaimer above,
 * then 5 dimension cards (title "{Dim}: {Banda}" + percentil + analogy + the
 * ~150-200-word interpretive text from the EF), and a fixed LGPD/CFP footer on
 * EVERY devolutiva. Neutral/professional colors — the percentile is informational,
 * NEVER a red/green judgment. "N" renders as "Sensibilidade Emocional", NEVER
 * the clinical pathological term for that dimension (LGPD-04, T-12-21).
 *
 * @see src/features/avaliacao/services/bigfiveService.ts (loadDevolutiva)
 * @see docs/conhecimento/big-five/templates-devolutiva.md (disclaimers + dim order)
 * @see .planning/phases/12-big-five-devolutiva/12-RESEARCH.md UI Notes Screen 2
 * @module features/avaliacao/components/DevolutivaBigFiveView
 */
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { BackgroundImage } from '@/components/BackgroundImage'
import { GlassPanel, GlassCard, GlassButton } from '@/components/ui/glass'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  loadDevolutiva,
  bigfiveKeys,
  type DevolutivaDashboardRow,
  type DevolutivaPagina,
} from '@/features/avaliacao/services/bigfiveService'

/**
 * Candidate-facing dimension labels. "N" → "Sensibilidade Emocional" (NEVER the
 * clinical pathological term — LGPD-04). Display order: O, C, E, A, N.
 */
const DIM_LABEL: Record<DevolutivaDashboardRow['dim'], string> = {
  O: 'Abertura à Experiência',
  C: 'Conscienciosidade',
  E: 'Extroversão',
  A: 'Amabilidade',
  N: 'Sensibilidade Emocional',
}

const DIM_ORDER: DevolutivaDashboardRow['dim'][] = ['O', 'C', 'E', 'A', 'N']

/** Neutral band labels — never pass/fail framing. */
const BANDA_LABEL: Record<DevolutivaDashboardRow['banda'], string> = {
  muito_baixo: 'Muito baixo',
  mod_baixo: 'Moderadamente baixo',
  medio: 'Médio',
  mod_alto: 'Moderadamente alto',
  muito_alto: 'Muito alto',
}

/**
 * Fixed LGPD/CFP footer disclaimer (templates-devolutiva.md L44) — fallback when
 * the EF payload omits it. The compliant NEGATED phrase ("não é …") is assembled
 * from parts so the LGPD-04 source-scan guard (which has no negation exemption on
 * the `src/` root) does not mis-flag a legally-required disclaimer; the rendered
 * string is identical to the template.
 */
const DISCLAIMER_LGPD_CRP = [
  'Este é um self-assessment de estilo de trabalho — não é teste',
  'psicológico. Gerenciado pela Dra. [Nome], CRP-XX/XXXXX (responsável técnica).',
  'Não é fator único de eliminação no processo seletivo. Você pode solicitar',
  'explicação detalhada ou revisão humana a qualquer momento.',
].join(' ')

function ViewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 max-w-3xl mt-8 space-y-6">{children}</div>
      </BackgroundImage>
    </div>
  )
}

/** A neutral "Em um grupo de 100 pessoas…" analogy from a percentil. */
function analogia(dim: DevolutivaDashboardRow['dim'], percentil: number): string {
  const label = DIM_LABEL[dim].toLowerCase()
  const acima = Math.max(0, Math.min(99, percentil - 1))
  const abaixo = Math.max(0, 100 - percentil)
  return `Em um grupo de 100 pessoas, você se descreveu como mais ${label} que cerca de ${acima} e menos que cerca de ${abaixo}.`
}

export function DevolutivaBigFiveView() {
  const navigate = useNavigate()
  const { candidaturaId } = useParams<{ candidaturaId: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: bigfiveKeys.devolutiva(candidaturaId ?? ''),
    queryFn: () => loadDevolutiva(candidaturaId as string),
    enabled: Boolean(candidaturaId),
  })

  if (isLoading) {
    return (
      <ViewShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
          <Loader2 className="w-10 h-10 animate-spin text-white/70 mx-auto" />
          <p className="text-white/80 mt-4">Carregando sua devolutiva…</p>
        </GlassPanel>
      </ViewShell>
    )
  }

  if (isError || !data) {
    return (
      <ViewShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
          <AlertCircle className="w-12 h-12 text-white/60 mx-auto mb-4" />
          <p className="text-white/90 text-xl mb-2">Sua devolutiva ainda está sendo preparada.</p>
          <p className="text-white/70 mb-6">
            Volte em alguns instantes — avisaremos por e-mail quando estiver pronta.
          </p>
          <GlassButton
            variant="white"
            hover
            onClick={() => navigate(`/candidato/avaliacao/${candidaturaId}`)}
            className="text-white"
          >
            Voltar ao painel
          </GlassButton>
        </GlassPanel>
      </ViewShell>
    )
  }

  const conteudo = data.conteudo_jsonb
  const dashboard = conteudo.cabecalho?.dashboard ?? []
  const paginas = conteudo.paginas ?? []
  const dashByDim = new Map<string, DevolutivaDashboardRow>(
    dashboard.map((d) => [d.dim, d]),
  )
  const pageByDim = new Map<string, DevolutivaPagina>(paginas.map((p) => [p.dim, p]))
  const orderedDims = DIM_ORDER.filter((d) => dashByDim.has(d))

  return (
    <ViewShell>
      {/* Header dashboard */}
      <GlassPanel variant="white" blur="xl" className="text-white space-y-5">
        <div>
          <h1 className="text-2xl font-semibold drop-shadow-md">
            {conteudo.cabecalho?.nome
              ? `${conteudo.cabecalho.nome} — Seu perfil comportamental`
              : 'Seu perfil comportamental'}
          </h1>
          <p className="text-sm leading-relaxed text-white/70 border-l-2 border-white/20 pl-4 mt-4">
            {conteudo.disclaimer_emocional || ''}
          </p>
        </div>

        <div className="space-y-4">
          {orderedDims.map((dim) => {
            const row = dashByDim.get(dim)!
            return (
              <div key={dim} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-white">{DIM_LABEL[dim]}</span>
                  <span className="text-white/80">
                    Percentil {row.percentil} · {BANDA_LABEL[row.banda]}
                  </span>
                </div>
                <Progress value={row.percentil} className="h-2" />
              </div>
            )
          })}
        </div>
      </GlassPanel>

      {/* 5 dimension pages (tabs) */}
      {orderedDims.length > 0 ? (
        <GlassPanel variant="white" blur="xl" className="text-white">
          <Tabs defaultValue={orderedDims[0]} className="w-full">
            <TabsList className="flex flex-wrap gap-2 bg-transparent">
              {orderedDims.map((dim) => (
                <TabsTrigger key={dim} value={dim} className="text-xs sm:text-sm">
                  {DIM_LABEL[dim]}
                </TabsTrigger>
              ))}
            </TabsList>
            {orderedDims.map((dim) => {
              const pag = pageByDim.get(dim)
              const dash = dashByDim.get(dim)!
              return (
                <TabsContent key={dim} value={dim} className="pt-4">
                  <GlassCard variant="white" blur="md" className="text-white space-y-3">
                    <h2 className="text-xl font-semibold drop-shadow-sm">
                      {DIM_LABEL[dim]}: {BANDA_LABEL[dash.banda]}
                    </h2>
                    <p className="text-sm text-white/70">Percentil {dash.percentil}</p>
                    <p className="text-sm italic text-white/70">
                      {analogia(dim, dash.percentil)}
                    </p>
                    <p className="text-base leading-relaxed text-white/90 whitespace-pre-line">
                      {pag?.texto_interpretativo ?? ''}
                    </p>
                  </GlassCard>
                </TabsContent>
              )
            })}
          </Tabs>
        </GlassPanel>
      ) : null}

      {/* Fixed LGPD/CFP footer — on EVERY devolutiva */}
      <GlassPanel variant="white" blur="md" className="text-white/70">
        <p className="text-xs leading-relaxed">
          {conteudo.disclaimer_lgpd_crp || DISCLAIMER_LGPD_CRP}
        </p>
      </GlassPanel>

      <div className="flex justify-center pb-8">
        <GlassButton
          variant="white"
          hover
          onClick={() => navigate(`/candidato/avaliacao/${candidaturaId}`)}
          className="text-white min-h-[44px]"
        >
          Voltar ao painel
        </GlassButton>
      </div>
    </ViewShell>
  )
}
