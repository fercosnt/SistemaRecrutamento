/**
 * TranscricaoReviewPanel — the transcript-analysis review panel (ENTREV-03 / RF-24).
 *
 * Transcript paste `textarea` + o seletor de QUAL entrevista é aquele texto → "Analisar
 * transcrição" chama a `avaliar-transcricao-entrevista` EF → renderiza a análise
 * VIGENTE de cada entrevista (BARS {competência} — {score}/5 + citações + bandeiras), as
 * ANTERIORES (superadas, com a revisão humana que tiveram) e as que FALHARAM. A
 * transcrição e as citações leem em `text-base leading-relaxed` (16px/1.6+, nunca
 * comprimido — leitura load-bearing, UI-SPEC §Typography).
 *
 * ─── O QUE ESTAVA ERRADO (Phase 49 / plano 49-16 · D-39/D4/D-41/D-42) ────────────────
 *
 * 1. **Não havia seletor de entrevista (D-41).** A aba do guia sempre teve os dois CTAs
 *    (online/presencial); a da transcrição não tinha nenhum, e o body ia sem `tipo`. As 6
 *    análises vivas em PROD nasceram assim (medido 2026-09-23: `tipo` NULL em todas as
 *    seis) — nenhuma delas sabe de qual entrevista é.
 * 2. **A tela mostrava a linha mais NOVA de qualquer estado como se fosse a que vale
 *    (D-39).** Uma análise que falhou virava «a análise» — e escondia a que funcionou,
 *    junto com a revisão humana que alguém já tinha feito nela (D-42/D4).
 * 3. **«Já analisei este texto» era indistinguível de «analisei de novo» (D-40).** A EF
 *    reaproveita por `texto_hash` sem chamar o modelo; a tela dizia «pronto» igual.
 *
 * ─── A REGRA DA REVISÃO ──────────────────────────────────────────────────────────────
 *
 * A revisão humana é oferecida SÓ sobre `vigenteMaisRecente` — exatamente a linha que
 * `salvar_avaliacao_entrevista` grava e que `confirmar_revisao_entrevista` aceita
 * (49-10). Oferecer o botão numa superada ou numa falha seria oferecer uma ação que o
 * servidor recusa (`check_violation`), e a tela ficaria parecendo quebrada por causa de
 * um acerto do banco.
 *
 * O anti-viés regional (RF-24): quando a bandeira de linguagem/sotaque dispara (o
 * `bloqueio_avanco` da EF), um bloco em tom destrutivo + um RevisaoHumanaMarker
 * renderizam e o CTA "Avançar etapa" fica DESABILITADO. O único caminho habilitado é
 * "Confirmar revisão humana" → grava `revisao_confirmada_em` → libera o guard
 * `avancar_etapa` do servidor. O bloqueio real é do servidor (14-03); a tela é
 * defesa-em-profundidade (RNF-07a). RH-facing only.
 *
 * WR-02: o avanço do funil NÃO é ligado nesta superfície — avançar a etapa é a decisão
 * final da Phase 15. O CTA "Avançar etapa" é renderizado DESABILITADO com tooltip
 * nomeando a decisão final (nunca um botão morto).
 *
 * @module features/entrevista/components/TranscricaoReviewPanel
 * @see src/features/entrevista/components/GuiaEntrevistaPanel.tsx (:544-575 — o molde dos dois CTAs online/presencial)
 * @see src/features/triagem/components/RedacaoReviewPanel.tsx (per-dim badge + 16px reading idiom)
 * @see .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md (§Color flag block)
 */
import { useState } from 'react'
import { AlertTriangle, CircleDashed, Sparkles } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import { ProvenienciaIABadge } from '@/features/triagem/components/ProvenienciaIABadge'
import { formatDataHoraSP } from '@/lib/datetime/formatDataHoraSP'
import type {
  AnalisesPorVigencia,
  AnaliseTranscricaoResultado,
  EntrevistaAnaliseRow,
  AnaliseCompetencia,
  TipoEntrevista,
} from '../services/entrevistaService'

/**
 * Cópia pt-BR num lugar só (UI-SPEC §Copywriting Contract) — o idioma do `COPY` do
 * `GuiaEntrevistaPanel`. Texto que o RH lê para saber em que análise está confiando.
 */
export const TRANSCRICAO_COPY = {
  tipoLegenda: 'De qual entrevista é esta transcrição?',
  online: 'Entrevista online',
  presencial: 'Entrevista presencial',
  /**
   * O grupo das análises sem `tipo` (RESEARCH Correção 10). As 6 linhas vivas em PROD
   * são deste grupo. Dizer «não identificada» é a única afirmação verdadeira disponível
   * — chamá-la de online ou presencial seria inventar um fato sobre ela.
   */
  semTipo: 'Entrevista não identificada',
  tipoPendente:
    'Escolha de qual entrevista é o texto antes de analisar — uma análise com o tipo errado supera a análise da entrevista errada.',
  analisar: 'Analisar transcrição',
  analisando: 'Analisando…',
  vigenteTitulo: 'Análise vigente',
  anterioresTitulo: 'Análises anteriores (superadas)',
  falhasTitulo: 'Análises que não foram concluídas',
  aguardandoRevisao: 'Aguardando revisão humana',
  revisaoConfirmada: 'Revisão humana confirmada',
  /** D-40, `reaproveitada && vigente`. */
  reaproveitadaVigente:
    'Este texto já tinha sido analisado. A análise existente continua sendo a vigente desta entrevista — nenhuma análise nova foi criada e nenhuma chamada de IA foi feita.',
  /** D-40, `reaproveitada && !vigente`. */
  reaproveitadaSuperada:
    'Este texto já tinha sido analisado, e aquela análise foi superada depois. A vigente desta entrevista é outra — nenhuma análise nova foi criada e nenhuma chamada de IA foi feita.',
  /** D-40, `falhou`. */
  falhou:
    'A análise não pôde ser concluída. A análise vigente anterior continua valendo — nada foi substituído.',
  superadaSemData: 'Superada — data não registrada',
  /**
   * D-42: quem revisou. Esta tela NÃO resolve nome de RH por id (e não passa a resolver
   * por causa disto — nenhuma leitura nova de `usuarios_rh` entra aqui), então a frase é
   * a genérica. Se um dia a tela já tiver o nome resolvido, é aqui que ele entra.
   */
  revisadaPorEquipe: 'Revisada por um membro da equipe',
  semRevisao: 'Não foi revisada',
} as const

/** O par de opções do seletor — a MESMA dupla dos CTAs do guia. */
const TIPOS: readonly { v: TipoEntrevista; label: string }[] = [
  { v: 'online', label: TRANSCRICAO_COPY.online },
  { v: 'presencial', label: TRANSCRICAO_COPY.presencial },
]

/** Rótulo pt-BR do `tipo` de uma análise — NULL é o grupo próprio, nunca um palpite. */
export function rotuloTipoAnalise(tipo: string | null | undefined): string {
  if (tipo === 'online') return TRANSCRICAO_COPY.online
  if (tipo === 'presencial') return TRANSCRICAO_COPY.presencial
  return TRANSCRICAO_COPY.semTipo
}

/**
 * O tipo PADRÃO do seletor a partir da etapa atual da candidatura (D-41).
 *
 * ⚠ Fora de etapa de entrevista devolve `null` DE PROPÓSITO — não há padrão defensável,
 * e é a mesma postura do servidor: a EF responde 400 pedindo o tipo em vez de gravar um
 * palpite. Aqui isso vira «o RH escolhe antes de analisar», não um chute silencioso.
 */
export function tipoPadraoDaEtapa(etapa: string | null | undefined): TipoEntrevista | null {
  if (etapa === 'entrevista_online') return 'online'
  if (etapa === 'entrevista_presencial') return 'presencial'
  return null
}

/** O pill neutro de revisão humana (espelha o ScorecardAvaliacao). */
function RevisaoHumanaMarker({ confirmada }: { confirmada: boolean }) {
  return (
    <Badge className="gap-1 border-white/20 bg-white/5 text-white/80 text-xs font-semibold">
      <CircleDashed className="h-3 w-3" aria-hidden="true" />
      {confirmada ? TRANSCRICAO_COPY.revisaoConfirmada : 'Revisão humana obrigatória'}
    </Badge>
  )
}

/** Selo de revisão de UMA análise — «aguardando» ou «confirmada» (D-42). */
function EstadoRevisaoBadge({ analise }: { analise: EntrevistaAnaliseRow }) {
  const confirmada = !!analise.revisao_confirmada_em
  return (
    <Badge
      data-testid="analise-estado-revisao"
      className="gap-1 border-white/20 bg-white/5 text-white/80 text-xs font-semibold"
    >
      <CircleDashed className="h-3 w-3" aria-hidden="true" />
      {confirmada ? TRANSCRICAO_COPY.revisaoConfirmada : TRANSCRICAO_COPY.aguardandoRevisao}
    </Badge>
  )
}

/**
 * A revisão humana que uma análise SUPERADA teve (D-42) — quem e quando, em prosa.
 *
 * Superar é MARCAR, não apagar: `scores_humanos`/`notas_humanas`/`revisada_por`/
 * `revisao_confirmada_em` continuam na linha (49-10). Esconder isso apagaria da tela a
 * trilha de uma decisão automatizada que um humano revisou (Art. 20).
 */
function RevisaoDaSuperada({ analise }: { analise: EntrevistaAnaliseRow }) {
  const quando = formatDataHoraSP(analise.revisao_confirmada_em)
  const houveRevisao = !!analise.revisada_por || !!analise.revisao_confirmada_em
  if (!houveRevisao) {
    return <p className="text-sm text-white/60">{TRANSCRICAO_COPY.semRevisao}</p>
  }
  return (
    <p className="text-sm text-white/75">
      {TRANSCRICAO_COPY.revisadaPorEquipe}
      {quando ? ` em ${quando}` : ''}.
    </p>
  )
}

/** One BARS dimension readout — neutral, each with SugestaoIABadge variant="compact". */
function DimensaoRow({ c }: { c: AnaliseCompetencia }) {
  const score = typeof c.score === 'number' ? c.score : null
  return (
    <li className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white/90">{c.competencia}</span>
        <span className="flex items-center gap-2">
          <SugestaoIABadge variant="compact" />
          <span className="text-sm font-semibold text-white">
            {score != null ? `${score} / 5` : '—'}
          </span>
        </span>
      </div>
      {c.reasoning ? (
        <p className="text-base leading-relaxed text-white/60">{c.reasoning}</p>
      ) : null}
    </li>
  )
}

/** One Citation as the EF emits it ("Cite Before You Speak"): {text, location?}. */
interface CitacaoEvidencia {
  texto: string
  local: string | null
}

/** A normalized citação: an optional competency label + its legible evidence list. */
interface CitacaoNormalizada {
  competencia: string | null
  evidencias: CitacaoEvidencia[]
}

/**
 * Normalizes one stored citação element into a legible shape (ENTREV-CITACOES-01).
 * The EF persists per-competency groups `{ competency, cited_evidence: [{ text, location }] }`;
 * a defensive plain string or a flat `{ text, location }` are also accepted. Returns null
 * when nothing renderable is present — NEVER the raw object (which `JSON.stringify` leaked
 * verbatim into the DOM).
 */
export function normalizeCitacao(c: unknown): CitacaoNormalizada | null {
  if (typeof c === 'string') {
    const t = c.trim()
    return t ? { competencia: null, evidencias: [{ texto: t, local: null }] } : null
  }
  if (!c || typeof c !== 'object') return null
  const obj = c as Record<string, unknown>
  const competencia =
    typeof obj.competency === 'string'
      ? obj.competency
      : typeof obj.competencia === 'string'
        ? obj.competencia
        : null
  const toEvidencia = (e: unknown): CitacaoEvidencia | null => {
    if (typeof e === 'string') {
      const t = e.trim()
      return t ? { texto: t, local: null } : null
    }
    if (!e || typeof e !== 'object') return null
    const eo = e as Record<string, unknown>
    const texto =
      typeof eo.text === 'string' ? eo.text : typeof eo.texto === 'string' ? eo.texto : ''
    if (!texto) return null
    const local =
      typeof eo.location === 'string' ? eo.location : typeof eo.local === 'string' ? eo.local : null
    return { texto, local }
  }
  const evidenciaSource = obj.cited_evidence ?? obj.evidencias
  if (Array.isArray(evidenciaSource)) {
    const evidencias = evidenciaSource
      .map(toEvidencia)
      .filter((e): e is CitacaoEvidencia => e != null)
    return evidencias.length ? { competencia, evidencias } : null
  }
  // flat Citation {text, location}
  const flat = toEvidencia(obj)
  return flat ? { competencia, evidencias: [flat] } : null
}

/**
 * One citação group (ENTREV-CITACOES-02) — a card with the competency as a prominent
 * TAG (Badge) and each evidence as a readable quote with its location as a visible badge
 * below. Grouped + scannable (antes: competência em texto apagado + localização inline
 * sumindo no meio da frase).
 */
function CitacaoItem({ citacao }: { citacao: unknown }) {
  const n = normalizeCitacao(citacao)
  if (!n) return null
  return (
    <li className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      {n.competencia ? (
        <Badge className="border-white/25 bg-white/10 text-white text-xs font-semibold">
          {n.competencia}
        </Badge>
      ) : null}
      <ul className="space-y-3">
        {n.evidencias.map((e, i) => (
          <li key={i} className="space-y-1.5">
            <p className="text-base leading-relaxed text-white/90">«{e.texto}»</p>
            {e.local ? (
              <Badge className="border-white/15 bg-white/5 text-white/70 text-xs font-semibold">
                {e.local}
              </Badge>
            ) : null}
          </li>
        ))}
      </ul>
    </li>
  )
}

/** As citações de UMA análise — seção própria com título e divisor. */
function CitacoesSecao({ citacoes }: { citacoes: unknown[] }) {
  if (citacoes.length === 0) return null
  return (
    <div className="space-y-4 border-t border-white/15 pt-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-white">Citações</h3>
        <p className="text-sm text-white/60">
          Trechos da transcrição que embasam cada competência avaliada.
        </p>
      </div>
      <ul className="space-y-3">
        {citacoes.map((c, i) => (
          <CitacaoItem key={i} citacao={c} />
        ))}
      </ul>
    </div>
  )
}

/**
 * A análise VIGENTE de UMA entrevista: de qual entrevista é, o selo de proveniência
 * (D-27b), o estado da revisão (D-42), as dimensões e as citações.
 */
function AnaliseVigenteBloco({ analise }: { analise: EntrevistaAnaliseRow }) {
  const competencias = Array.isArray(analise.competencias) ? analise.competencias : []
  const citacoes = Array.isArray(analise.citacoes) ? analise.citacoes : []
  const criadaEm = formatDataHoraSP(analise.created_at)
  return (
    <div className="space-y-6" data-testid="analise-vigente">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-semibold text-white">
            {TRANSCRICAO_COPY.vigenteTitulo} — {rotuloTipoAnalise(analise.tipo)}
          </h3>
          <SugestaoIABadge variant="full" />
          <ProvenienciaIABadge
            provedorIa={analise.provedor_ia}
            modeloIa={analise.modelo_ia}
            variant="compact"
          />
          <EstadoRevisaoBadge analise={analise} />
        </div>
        {criadaEm ? <p className="text-sm text-white/60">Analisada em {criadaEm}.</p> : null}
      </div>
      <ul className="space-y-3">
        {competencias.map((c, i) => (
          <DimensaoRow key={`${c.competencia}-${i}`} c={c} />
        ))}
      </ul>
      <CitacoesSecao citacoes={citacoes} />
    </div>
  )
}

/**
 * Uma análise ANTERIOR (superada) — acessível, nunca escondida (D4), com a data da
 * superação, a revisão que teve (D-42) e o selo de proveniência.
 *
 * `<details>` em vez de remoção: o histórico continua ao alcance de um clique sem
 * competir visualmente com a análise que vale.
 */
function AnaliseSuperadaItem({ analise }: { analise: EntrevistaAnaliseRow }) {
  const competencias = Array.isArray(analise.competencias) ? analise.competencias : []
  const superadaEm = formatDataHoraSP(analise.superada_em)
  const criadaEm = formatDataHoraSP(analise.created_at)
  return (
    <li className="rounded-lg border border-white/10 bg-white/[0.03]">
      <details data-testid="analise-superada">
        <summary className="min-h-[44px] cursor-pointer list-none px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white/90">
              {rotuloTipoAnalise(analise.tipo)}
            </span>
            <Badge className="border-white/15 bg-white/5 text-white/70 text-xs font-semibold">
              {superadaEm
                ? `Superada em ${superadaEm}`
                : /* 49-12 marca as legadas retroativamente; até lá, dizer que a data não
                     está registrada é mais honesto que exibir a data de criação como se
                     fosse a da superação. */
                  TRANSCRICAO_COPY.superadaSemData}
            </Badge>
            <ProvenienciaIABadge
              provedorIa={analise.provedor_ia}
              modeloIa={analise.modelo_ia}
              variant="compact"
            />
          </div>
        </summary>
        <div className="space-y-3 border-t border-white/10 px-4 py-3">
          {criadaEm ? <p className="text-sm text-white/60">Analisada em {criadaEm}.</p> : null}
          <RevisaoDaSuperada analise={analise} />
          {competencias.length > 0 ? (
            <ul className="space-y-3">
              {competencias.map((c, i) => (
                <DimensaoRow key={`${c.competencia}-${i}`} c={c} />
              ))}
            </ul>
          ) : null}
        </div>
      </details>
    </li>
  )
}

/** Uma análise que NÃO foi concluída — nunca apresentada como vigente (D-39). */
function AnaliseFalhaItem({ analise }: { analise: EntrevistaAnaliseRow }) {
  const quando = formatDataHoraSP(analise.created_at)
  return (
    <li
      data-testid="analise-falha"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
    >
      <span className="text-sm font-semibold text-white/90">
        {rotuloTipoAnalise(analise.tipo)}
      </span>
      <Badge className="border-red-400/30 bg-red-500/15 text-red-200 text-xs font-semibold">
        Não concluída
      </Badge>
      {quando ? <span className="text-sm text-white/60">Tentada em {quando}.</span> : null}
    </li>
  )
}

/** O aviso do resultado da última análise pedida (D-40) — nunca uma análise simulada. */
function ResultadoAviso({ resultado }: { resultado: AnaliseTranscricaoResultado }) {
  let texto: string | null = null
  if (resultado.falhou) texto = TRANSCRICAO_COPY.falhou
  else if (resultado.reaproveitada)
    texto = resultado.vigente
      ? TRANSCRICAO_COPY.reaproveitadaVigente
      : TRANSCRICAO_COPY.reaproveitadaSuperada
  if (!texto) return null
  return (
    <div
      role="status"
      data-testid="transcricao-resultado-aviso"
      className="rounded-lg border border-white/20 bg-white/10 p-3"
    >
      <p className="text-base leading-relaxed text-white/90">{texto}</p>
    </div>
  )
}

export interface TranscricaoReviewPanelProps {
  /** As análises separadas por vigência (49-16) — vigentes, superadas e falhas. */
  analises: AnalisesPorVigencia | null
  /**
   * A etapa atual da candidatura — o PADRÃO do seletor de tipo (D-41). Fora de etapa de
   * entrevista não há padrão, e o RH escolhe antes de analisar.
   */
  etapaAtual?: string | null
  /** O resultado da última análise pedida (`reaproveitada`/`falhou` — D-40). */
  resultado?: AnaliseTranscricaoResultado | null
  loading?: boolean
  analyzing?: boolean
  confirming?: boolean
  /** Fires the analyze mutation with the pasted transcript AND the chosen tipo. */
  onAnalisar?: (transcricao: string, tipo: TipoEntrevista) => void
  /** Fires confirmarRevisaoHumana(analiseId) — releases the flag block. */
  onConfirmarRevisao?: (analiseId: string) => void
  /** Fires the funil advance (enabled only when no firing flag is unresolved). */
  onAvancarEtapa?: () => void
  className?: string
}

/**
 * The transcript paste + analysis + flag-block panel. O seletor diz de qual entrevista é
 * o texto; a tela mostra a vigente de cada entrevista, as anteriores e as falhas; a
 * bandeira de linguagem/sotaque gateia o CTA Avançar e "Confirmar revisão humana" é o
 * único caminho habilitado — sempre e só sobre a vigente mais recente.
 */
export function TranscricaoReviewPanel({
  analises,
  etapaAtual,
  resultado,
  loading = false,
  analyzing = false,
  confirming = false,
  onAnalisar,
  onConfirmarRevisao,
  onAvancarEtapa,
  className,
}: TranscricaoReviewPanelProps) {
  const [transcricao, setTranscricao] = useState('')
  // ⚠ O padrão é DERIVADO da etapa, não copiado para o estado num efeito: a etapa chega
  // depois (o contexto carrega em paralelo), e um `useState(padrão)` congelaria o `null`
  // do primeiro render. Uma escolha explícita do RH sempre vence o padrão.
  const [tipoEscolhido, setTipoEscolhido] = useState<TipoEntrevista | null>(null)
  const tipo = tipoEscolhido ?? tipoPadraoDaEtapa(etapaAtual)

  const vigentes = analises?.vigentes ?? []
  const superadas = analises?.superadas ?? []
  const falhas = analises?.falhas ?? []
  // A revisão só é oferecida sobre esta linha — a que a RPC grava (49-10).
  const vigenteMaisRecente = analises?.vigenteMaisRecente ?? null

  // The flag fires when the EF set bloqueio_avanco AND no human confirmed review yet.
  const flagFired = !!vigenteMaisRecente?.bloqueio_avanco
  const revisaoConfirmada = !!vigenteMaisRecente?.revisao_confirmada_em
  const bloqueado = flagFired && !revisaoConfirmada

  return (
    <div className={cn('space-y-6', className)}>
      {/* Transcript paste box + o seletor de entrevista (D-41). */}
      <div className="space-y-2">
        <Label htmlFor="transcricao" className="text-sm font-semibold text-white/90">
          Cole a transcrição da entrevista
        </Label>
        <Textarea
          id="transcricao"
          value={transcricao}
          onChange={(e) => setTranscricao(e.target.value)}
          placeholder="Cole aqui a transcrição completa da entrevista para análise."
          className="min-h-40 bg-white/5 text-base leading-relaxed text-white placeholder:text-white/40"
          disabled={analyzing}
        />

        {/* Seletor de tipo — o molde dos dois CTAs do GuiaEntrevistaPanel (:544-575). */}
        <fieldset
          data-testid="transcricao-tipo-seletor"
          className="space-y-2 border-0 p-0"
          disabled={analyzing}
        >
          <legend className="text-sm font-semibold text-white/90">
            {TRANSCRICAO_COPY.tipoLegenda}
          </legend>
          <div role="radiogroup" aria-label={TRANSCRICAO_COPY.tipoLegenda} className="flex flex-wrap gap-2">
            {TIPOS.map((t) => {
              const ativo = tipo === t.v
              return (
                <button
                  key={t.v}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setTipoEscolhido(t.v)}
                  disabled={analyzing}
                  className={cn(
                    'min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50',
                    ativo
                      ? 'border-white/40 bg-white/25 hover:bg-white/30'
                      : 'border-white/20 bg-white/5 hover:bg-white/15',
                  )}
                >
                  <Sparkles
                    className="mr-1 inline h-4 w-4 text-[#35BFAD]"
                    aria-hidden="true"
                  />
                  {t.label}
                </button>
              )
            })}
          </div>
          {tipo == null ? (
            <p className="text-sm text-white/75">{TRANSCRICAO_COPY.tipoPendente}</p>
          ) : null}
        </fieldset>

        <button
          type="button"
          onClick={() => tipo && onAnalisar?.(transcricao, tipo)}
          disabled={analyzing || transcricao.trim().length === 0 || tipo == null}
          className="min-h-[44px] rounded-lg border border-white/20 bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30 disabled:opacity-50"
        >
          {TRANSCRICAO_COPY.analisar}
        </button>
        {analyzing ? (
          <p className="text-sm text-white/70">{TRANSCRICAO_COPY.analisando}</p>
        ) : null}
      </div>

      {/* D-40: o que a EF fez de fato com o texto enviado. */}
      {!analyzing && resultado ? <ResultadoAviso resultado={resultado} /> : null}

      {/* A análise VIGENTE de cada entrevista. */}
      {loading ? (
        <p className="text-sm text-white/60">Carregando análise…</p>
      ) : vigentes.length > 0 ? (
        <div className="space-y-8">
          {vigentes.map((a) => (
            <AnaliseVigenteBloco key={a.id} analise={a} />
          ))}
        </div>
      ) : null}

      {/* As ANTERIORES (D4/D-42) — acessíveis, com a revisão que tiveram. */}
      {!loading && superadas.length > 0 ? (
        <div className="space-y-3 border-t border-white/15 pt-6">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-white">
              {TRANSCRICAO_COPY.anterioresTitulo}
            </h3>
            <p className="text-sm text-white/60">
              Foram substituídas por uma análise mais recente da mesma entrevista. Ficam
              aqui porque a revisão humana que tiveram continua fazendo parte da trilha.
            </p>
          </div>
          <ul className="space-y-2">
            {superadas.map((a) => (
              <AnaliseSuperadaItem key={a.id} analise={a} />
            ))}
          </ul>
        </div>
      ) : null}

      {/* As que NÃO foram concluídas (D-39) — nunca no lugar da vigente. */}
      {!loading && falhas.length > 0 ? (
        <div className="space-y-3 border-t border-white/15 pt-6">
          <h3 className="text-xl font-semibold text-white">{TRANSCRICAO_COPY.falhasTitulo}</h3>
          <ul className="space-y-2">
            {falhas.map((a) => (
              <AnaliseFalhaItem key={a.id} analise={a} />
            ))}
          </ul>
        </div>
      ) : null}

      {/* Language/accent flag block — gates the Avançar CTA (RF-24). */}
      {flagFired ? (
        <div
          className={cn(
            'space-y-3 rounded-lg border px-4 py-3',
            bloqueado
              ? 'border-red-400/30 bg-red-500/15 text-red-300'
              : 'border-white/20 bg-white/5 text-white/80',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Bandeiras
            </span>
            <RevisaoHumanaMarker confirmada={revisaoConfirmada} />
          </div>

          {bloqueado ? (
            <p className="text-base leading-relaxed">
              <span className="font-semibold">
                Bandeira de linguagem/sotaque (score &lt; 3).
              </span>{' '}
              O avanço está bloqueado até a revisão humana ser confirmada. Esta bandeira
              evita viés regional — não é um julgamento de mérito.
            </p>
          ) : (
            <p className="text-base leading-relaxed">
              <span className="font-semibold">Revisão humana confirmada.</span> O avanço
              está liberado.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {/* Confirmar revisão humana — the only enabled path while blocked, e SEMPRE
                sobre `vigenteMaisRecente`: é a única análise que
                `confirmar_revisao_entrevista` aceita (49-10). Numa superada ou numa falha
                a RPC responde `check_violation`. */}
            {bloqueado ? (
              <button
                type="button"
                onClick={() =>
                  vigenteMaisRecente?.id && onConfirmarRevisao?.(vigenteMaisRecente.id)
                }
                disabled={confirming || !vigenteMaisRecente?.id}
                className="min-h-[44px] rounded-lg border border-white/20 bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30 disabled:opacity-50"
              >
                Confirmar revisão humana
              </button>
            ) : null}

            {/* Avançar etapa (WR-02): there is NO funil-advance service on this
                surface — advancing the funil is the Phase-15 decisão final. The CTA
                is rendered DISABLED with a tooltip naming where the advance happens,
                rather than a dead button that silently no-ops. We never invent an
                advance RPC here. When a wired handler IS provided (future), the
                normal blocked/unblocked gate applies. */}
            <AvancarEtapaCTA
              disabled={bloqueado || !onAvancarEtapa}
              blockedByFlag={bloqueado}
              onClick={onAvancarEtapa}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * The Avançar etapa CTA — disabled while the flag block fires OR while no funil-advance
 * handler is wired (WR-02). The tooltip names the rule: when blocked by the flag it
 * tells the gestor to review first; when unwired it points to the decisão final (the
 * Phase-15 surface that owns the actual advance).
 */
function AvancarEtapaCTA({
  disabled,
  blockedByFlag,
  onClick,
}: {
  disabled: boolean
  /** True when the disable is the language/accent flag (vs. no wired advance handler). */
  blockedByFlag?: boolean
  onClick?: () => void
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Avançar etapa
    </button>
  )
  if (!disabled) return button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed">{button}</span>
        </TooltipTrigger>
        <TooltipContent>
          {blockedByFlag
            ? 'Revise a bandeira de linguagem/sotaque antes de avançar a etapa.'
            : 'O avanço de etapa acontece na decisão final.'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
