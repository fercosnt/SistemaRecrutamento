/**
 * EntrevistaScorecardInline — the inline-editable interview scorecard (ENTREV-02).
 *
 * Uma fileira de notas 1–5 por competência (52-07: `radiogroup` de 5 botões, começando VAZIA) +
 * notas do gestor obrigatórias (espelho de `salvar_avaliacao_entrevista`, D-22) + "Salvar
 * avaliação" via the LIVE RPC. Built on the neutral `ScorecardAvaliacao` presentation idiom — NO
 * red/green tint on the scores (mirrors the Phase-11/13 neutrality). A análise da IA dá só os
 * NOMES das competências; a nota é sempre do gestor (RNF-07a). RH-facing only.
 *
 * 52-07 (JORN-61 — D-25 com a emenda D-52-U12): antes, cada competência era um `Slider` que
 * nascia com a nota da IA (`clampScore(c.ia)`, e 3 quando a IA não dava nota) — dava para
 * salvar notas que o entrevistador não escolheu, e a nota da IA ancorava a dele. O `Slider` do
 * Radix não tem estado vazio (sem valor não há polegar), então o controle virou 5 botões
 * `role="radio"` num `radiogroup` por competência, NENHUM marcado ao abrir. «Salvar avaliação»
 * só habilita com TODAS as competências notadas (`entrevista-nota-faltante` diz o que falta) e
 * o payload leva só as notas escolhidas. Desde o 52-26 (F13) o servidor exige a mesma regra:
 * nota 1–5 para TODA competência da análise — o conjunto desta tela, inclusive o fallback
 * `DEFAULT_COMPETENCIAS` — e nenhuma chave fora dele (23514). A lista é espelhada na migration
 * `20261011000005` e vigiada por `__tests__/competencias-padrao-servidor.test.ts`.
 *
 * 49-31 (gap CR-03, D-39): a nota humana é gravada numa análise NOMEADA por id, e a tela
 * diz qual — «Esta avaliação será registrada sobre a análise da {entrevista}». Com mais de
 * uma vigente (online e presencial), o RH escolhe num radiogroup; a vigente mais recente é
 * só o padrão. Sem vigente não há onde gravar, e o Salvar fica desabilitado com a frase do
 * que falta. Quem acrescenta o id ao payload é o workspace; aqui o `onSalvar` continua
 * entregando `{ scoresHumanos, notas }`.
 *
 * 51-04 (JORN-47, D-22): as notas do gestor são obrigatórias nos dois lados. O servidor recusa
 * `p_notas` nulo ou vazio depois de `btrim` (`notas_humanas obrigatorias`, 23514), e a tela
 * deixava clicar com o campo vazio — o RH via só o toast genérico de erro. Agora o cliente
 * espelha a regra: com `notas.trim()` vazio o Salvar fica desabilitado e a tela diz por quê
 * (`entrevista-notas-obrigatorias`). O `trim()` remove todo espaço em branco e o `btrim` do
 * servidor só espaços — o cliente é igual ou mais estrito; nada que o servidor recusa passa.
 *
 * @module features/entrevista/components/EntrevistaScorecardInline
 * @see .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md (§Copywriting Scorecard)
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md (D-52-U12, E9)
 */
import { useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import { rotuloTipoAnalise } from './TranscricaoReviewPanel'
import type {
  AnaliseCompetencia,
  EntrevistaAnaliseRow,
  SalvarAvaliacaoPayload,
} from '../services/entrevistaService'

/** Cópia pt-BR da escolha da análise avaliada (49-31). */
export const SCORECARD_COPY = {
  /** 52-07 (D-52-U13): instrução simples no lugar do jargão de componente e de coluna. */
  subtitulo: 'Escolha uma nota de 1 a 5 para cada competência. A decisão é sempre humana.',
  registradaSobre: 'Esta avaliação será registrada sobre a análise da',
  escolherLegenda: 'Qual análise você está avaliando?',
  semVigente: 'Nenhuma análise vigente: analise a transcrição antes de registrar a avaliação.',
  /** 51-04 (D-22): notas vazias depois de `trim()` — o servidor recusaria com 23514. */
  notasObrigatorias: 'Escreva as notas do gestor para salvar a avaliação.',
  /** 52-07 (D-25): alguma competência ainda sem nota — nenhuma nasce marcada. */
  notaFaltante: 'Escolha uma nota para todas as competências para salvar a avaliação.',
} as const

/** As notas possíveis, na ordem em que aparecem. */
const NOTAS = [1, 2, 3, 4, 5] as const

/**
 * Default Beauty Smile interview competencies (used when the AI gives none). Espelhada no
 * servidor (migration `20261011000005`, F13): mudar aqui exige mudar lá — a guarda
 * `competencias-padrao-servidor.test.ts` reprova a divergência.
 */
export const DEFAULT_COMPETENCIAS = [
  'Experiência UAU',
  'Inovação',
  'Atitude de Dono',
  'Sede de Crescimento',
] as const

/**
 * As competências que a tela renderiza (e pede notadas): os NOMES da análise da IA — já
 * normalizados por `normalizeCompetencia` no service — e, sem nenhum, `DEFAULT_COMPETENCIAS`.
 * 52-07 (D-25): a nota da IA não entra na lista — nada perto do controle pode ancorar o gestor.
 *
 * 52-26 (F13; WR-01 do 52-REVIEW-GAP-1): o servidor exige notado EXATAMENTE este conjunto (o CASE
 * da migration `20261011000005`). Vigiada por `__tests__/competencias-normalizacao-servidor.test.ts`
 * (o mesmo fixture e o mesmo conjunto da cláusula (n) do smoke52g).
 */
export function competenciasDoScorecard(
  competenciasIA: AnaliseCompetencia[] | null | undefined,
): { key: string; label: string }[] {
  const fromIA = (competenciasIA ?? [])
    .filter((c) => c && typeof c.competencia === 'string')
    .map((c) => ({ key: c.competencia, label: c.competencia }))
  if (fromIA.length > 0) return fromIA
  return DEFAULT_COMPETENCIAS.map((label) => ({ key: label, label }))
}

export interface EntrevistaScorecardInlineProps {
  /** The AI-suggested competency scores (from the transcript analysis), if any. */
  competenciasIA?: AnaliseCompetencia[] | null
  /** As análises VIGENTES da candidatura — com duas ou mais, o RH escolhe qual avaliar. */
  vigentes?: EntrevistaAnaliseRow[]
  /** O id da análise sobre a qual a nota será gravada; nulo ⇒ não há onde gravar. */
  analiseId?: string | null
  /** O RH escolheu outra vigente. */
  onEscolherAnalise?: (analiseId: string) => void
  saving?: boolean
  onSalvar?: (payload: SalvarAvaliacaoPayload) => void
  className?: string
}

/**
 * The inline-editable scorecard — notas 1–5 por competência (vazias e obrigatórias) + notas
 * do gestor obrigatórias + Salvar via the RPC. A IA dá só os nomes das competências (badge no
 * cabeçalho); nenhuma nota nasce dela — o gestor sempre decide.
 */
export function EntrevistaScorecardInline({
  competenciasIA,
  vigentes = [],
  analiseId = null,
  onEscolherAnalise,
  saving = false,
  onSalvar,
  className,
}: EntrevistaScorecardInlineProps) {
  const emRevisao = analiseId ? (vigentes.find((a) => a.id === analiseId) ?? null) : null
  const semAnalise = !analiseId

  // Build the competency list from the AI suggestion (só os NOMES), falling back to defaults.
  // 52-07 (D-25): a nota da IA não entra na lista — nada perto do controle pode ancorar o gestor.
  const competencias = useMemo(() => competenciasDoScorecard(competenciasIA), [competenciasIA])

  // 52-07 (D-25): nasce VAZIO — nenhuma leitura da nota da IA para o estado.
  const [scores, setScores] = useState<Record<string, number | undefined>>({})
  const [notas, setNotas] = useState('')
  // D-22: mesma regra do servidor (ou mais estrita) — vazio depois de trim() não salva.
  const semNotas = notas.trim().length === 0
  // D-25: todas as competências precisam de nota escolhida pelo gestor.
  const semNotaFaltante = competencias.some((c) => scores[c.key] == null)

  const idBase = useId()
  const idSemVigente = `${idBase}-sem-vigente`
  const idNotaFaltante = `${idBase}-nota-faltante`
  const idNotasObrigatorias = `${idBase}-notas-obrigatorias`
  const avisosVisiveis = [
    semAnalise ? idSemVigente : null,
    semNotaFaltante ? idNotaFaltante : null,
    semNotas ? idNotasObrigatorias : null,
  ].filter((id): id is string => id !== null)

  function setDim(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }))
  }

  function handleSalvar() {
    if (saving || semAnalise || semNotas || semNotaFaltante) return
    // Só as notas escolhidas — nenhuma chave com `undefined` chega à RPC.
    const scoresHumanos: Record<string, number> = {}
    for (const c of competencias) {
      const nota = scores[c.key]
      if (typeof nota === 'number') scoresHumanos[c.key] = nota
    }
    onSalvar?.({ scoresHumanos, notas })
  }

  // Só o selo «Sugestão IA» do cabeçalho: diz que há análise da IA, sem mostrar nota nenhuma.
  const hasIA = (competenciasIA ?? []).some((c) => c && typeof c.score === 'number')

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-white">Avaliação por competência</h3>
          {hasIA ? <SugestaoIABadge variant="compact" /> : null}
        </div>
        <p className="text-sm font-semibold text-white/60">{SCORECARD_COPY.subtitulo}</p>
      </div>

      {/* Qual análise recebe a nota (49-31, D-39) — e a escolha, quando há mais de uma. */}
      {emRevisao ? (
        <p
          data-testid="scorecard-analise-em-revisao"
          className="text-base leading-relaxed text-white/90"
        >
          {SCORECARD_COPY.registradaSobre}{' '}
          <span className="font-semibold">{rotuloTipoAnalise(emRevisao.tipo)}</span>.
        </p>
      ) : null}
      {vigentes.length > 1 ? (
        <fieldset className="space-y-2 border-0 p-0" disabled={saving}>
          <legend className="text-sm font-semibold text-white/90">
            {SCORECARD_COPY.escolherLegenda}
          </legend>
          <div
            role="radiogroup"
            aria-label={SCORECARD_COPY.escolherLegenda}
            className="flex flex-wrap gap-2"
          >
            {vigentes.map((a) => {
              const ativo = a.id === analiseId
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => {
                    if (!ativo) onEscolherAnalise?.(a.id)
                  }}
                  disabled={saving}
                  className={cn(
                    'min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50',
                    ativo
                      ? 'border-white/40 bg-white/25 hover:bg-white/30'
                      : 'border-white/20 bg-white/5 hover:bg-white/15',
                  )}
                >
                  {rotuloTipoAnalise(a.tipo)}
                </button>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      {/* Notas 1–5 por competência (52-07, D-52-U12) — neutras, nenhuma marcada ao abrir. */}
      <fieldset className="space-y-4 border-0 p-0" disabled={saving}>
        {competencias.map((c) => (
          <div key={c.key} className="space-y-2">
            <p className="break-words text-sm font-semibold text-white/90">{c.label}</p>
            <div role="radiogroup" aria-label={c.label} className="flex flex-wrap gap-2">
              {NOTAS.map((n) => {
                const marcada = scores[c.key] === n
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={marcada}
                    aria-label={`${n} de 5`}
                    data-testid={`entrevista-nota-${c.key}-${n}`}
                    onClick={() => setDim(c.key, n)}
                    disabled={saving}
                    className={cn(
                      'min-h-[44px] min-w-[44px] rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
                      marcada
                        ? 'border-white/40 bg-white/25 text-white'
                        : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/15',
                    )}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </fieldset>

      {/* Notas do gestor obrigatórias (espelho de `salvar_avaliacao_entrevista`, D-22). */}
      <div className="space-y-2">
        <Label htmlFor="entrevista-notas" className="text-sm font-semibold text-white/90">
          Notas do gestor{' '}
          <span className="font-normal text-white/70">(obrigatório)</span>
        </Label>
        <Textarea
          id="entrevista-notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Observações sobre a entrevista."
          required
          aria-required="true"
          className="min-h-24 bg-white/5 text-base text-white placeholder:text-white/40"
          disabled={saving}
        />
      </div>

      {semAnalise ? (
        <p id={idSemVigente} className="text-sm text-white/75">
          {SCORECARD_COPY.semVigente}
        </p>
      ) : null}
      {semNotaFaltante ? (
        <p
          id={idNotaFaltante}
          data-testid="entrevista-nota-faltante"
          className="text-sm text-white/75"
        >
          {SCORECARD_COPY.notaFaltante}
        </p>
      ) : null}
      {semNotas ? (
        <p
          id={idNotasObrigatorias}
          data-testid="entrevista-notas-obrigatorias"
          className="text-sm text-white/75"
        >
          {SCORECARD_COPY.notasObrigatorias}
        </p>
      ) : null}
      <Button
        type="button"
        disabled={saving || semAnalise || semNotas || semNotaFaltante}
        aria-describedby={avisosVisiveis.length > 0 ? avisosVisiveis.join(' ') : undefined}
        onClick={handleSalvar}
        className="min-h-[44px] w-full bg-white/20 text-white hover:bg-white/30"
      >
        Salvar avaliação
      </Button>
    </div>
  )
}

/** Toast helpers wired by the workspace on the save mutation outcome. */
export const SCORECARD_TOAST = {
  success: () => toast.success('Avaliação salva.'),
  error: () => toast.error('Não foi possível salvar a avaliação. Tente novamente.'),
}
