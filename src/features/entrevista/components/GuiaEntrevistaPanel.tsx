/**
 * GuiaEntrevistaPanel — the AI-generated STAR/PEI interview guide (ENTREV-01) + the
 * RH edit-mode surface (ENTREV-06/07/08).
 *
 * VIEW mode renders the `gerar-guia-entrevista` output (5-7 perguntas with BARS 1-5
 * anchors + dimensão), two generate CTAs (online / presencial), and a per-question
 * IA/Manual origem badge (the ENTREV-08 audit affordance). EDIT mode ("Editar guia")
 * swaps each row for an `EditablePerguntaRow` (inline `Input` for pergunta + `Select`
 * for dimensão, up/down reorder, delete-confirm), an add-manual inline form, and a
 * batch "Salvar edições" that commits the whole edited guide via
 * `useGuiaEntrevista.saveEdits` (20-03). Save in-flight/error reuse the AsyncState
 * error contract keyed by errorCode — NEVER the raw RPC error (T-20-16 / T-18-04-ID).
 *
 * The panel header carries the SugestaoIABadge (variant="full") — the AI is always a
 * suggestion, the human always decides (RNF-07a). The panel only edits the guide
 * jsonb; it never touches `candidaturas` (RNF-07a). IA-only fields (BARS/probes/flags)
 * stay read-only display in BOTH modes (deferred). RH-facing only; the candidate never
 * reaches this surface.
 *
 * @module features/entrevista/components/GuiaEntrevistaPanel
 * @see src/features/entrevista/components/CognitivoBandCard.tsx (AlertDialog import idiom)
 * @see src/components/ui/AsyncState.tsx (save in-flight/error contract by errorCode)
 * @see .planning/phases/20-refino-rh-editar-guia-de-entrevista-seed-001/20-UI-SPEC.md (binding contract)
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassButton } from '@/components/ui/glass'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import type {
  EntrevistaGuiaRow,
  GuiaPergunta,
  TipoEntrevista,
} from '../services/entrevistaService'

/**
 * Single-sourced PT-BR copy (UI-SPEC §Copywriting Contract) — every reused string
 * lives here so view/edit/error states never drift (the AsyncState no-drift idiom).
 */
const COPY = {
  editar: 'Editar guia',
  salvar: 'Salvar edições',
  salvando: 'Salvando…',
  cancelar: 'Cancelar',
  adicionar: 'Adicionar pergunta',
  adicionarConfirm: 'Adicionar',
  perguntaLabel: 'Pergunta',
  dimensaoLabel: 'Dimensão',
  dirty: 'Você tem edições não salvas.',
  moverCima: 'Mover para cima',
  moverBaixo: 'Mover para baixo',
  removerAria: 'Remover pergunta',
  badgeIa: 'IA',
  badgeManual: 'Manual',
  delTitle: 'Remover esta pergunta?',
  delBody:
    'A pergunta será removida do guia ao salvar. Esta ação não pode ser desfeita após salvar.',
  delConfirm: 'Remover pergunta',
  emptyBody: 'Nenhum guia gerado ainda. Gere o guia para preparar a entrevista.',
  // Save error — static, keyed by code; NEVER echoes the raw RPC error (T-20-16).
  errHeading: 'Não foi possível salvar agora.',
  errGeneric: 'Verifique a conexão e tente novamente.',
  errPermission: 'Você não tem permissão para editar este guia.',
  // Generation in-flight / failure — §7.25 do GUIA-VALIDACAO-FINAL. A geração leva
  // 60-130 s e a tela precisa DIZER isso: sem o aviso, quem usa clica de novo, duas
  // execuções correm juntas e a última a terminar grava por cima (pode ser a pior).
  gerando: 'Gerando…',
  gerandoHeading: 'Gerando o guia com a IA…',
  gerandoBody:
    'Isso costuma levar de 1 a 2 minutos. Não feche nem recarregue a página, e não clique de novo — duas gerações ao mesmo tempo se sobrescrevem.',
  gerarErrHeading: 'Não foi possível confirmar a geração.',
  gerarErrBody:
    'A geração pode ter continuado no servidor mesmo sem resposta aqui. Espere o contador antes de tentar de novo — recarregue a página primeiro para ver se o guia chegou.',
  gerarErrEspera: (s: number) => `Aguarde ${s}s para tentar de novo`,
} as const

/**
 * Cooldown after a FAILED generation, in seconds. A rejected fetch does NOT mean the
 * server stopped: §7.25 mediu POSTs voltando «Failed to fetch» em ~1 s enquanto a
 * execução anterior ainda rodava por ~2 min. Reabilitar o botão na hora convida
 * exatamente a segunda execução concorrente que sobrescreve o guia.
 */
const GERAR_COOLDOWN_S = 60

/** Reads the perguntas array off the EF `guia` JSON (defensive). */
function perguntasOf(guia: EntrevistaGuiaRow | null): GuiaPergunta[] {
  const arr = guia?.guia?.perguntas
  return Array.isArray(arr) ? arr : []
}

/** Provenance of a question — legacy/missing → 'ia' (UI-SPEC L56; A2). */
function origemOf(p: GuiaPergunta): 'ia' | 'manual' {
  return p.origem === 'manual' ? 'manual' : 'ia'
}

/** True when the save error is a permission denial (FORBIDDEN / insufficient_privilege). */
function isPermissionError(code?: string): boolean {
  return code === 'FORBIDDEN' || code === 'insufficient_privilege'
}

/** The weak-dim hint for a question (online <3; the EF already gates which dims). */
function weakDimHint(p: GuiaPergunta): string | null {
  if (!p.dimensao) return null
  const n = typeof p.score_atual === 'number' ? p.score_atual : null
  if (n == null) return null
  return `Cobre ${p.dimensao} (score atual ${n} < 3)`
}

/** The per-question origem badge — IA (accent + Sparkles) / Manual (neutral). */
function OrigemBadge({ origem }: { origem: 'ia' | 'manual' }) {
  if (origem === 'manual') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/70">
        {COPY.badgeManual}
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-[#35BFAD]/40 bg-[#35BFAD]/10 px-2 py-0.5 text-xs font-semibold text-white/90">
      <Sparkles className="h-3 w-3 text-[#35BFAD]" aria-hidden="true" />
      {COPY.badgeIa}
    </span>
  )
}

/** One STAR/PEI question row with its dimension + BARS anchor label (read-only). */
function PerguntaRow({ p, idx }: { p: GuiaPergunta; idx: number }) {
  const hint = weakDimHint(p)
  return (
    <li className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-base leading-relaxed text-white/90">
          <span className="font-semibold text-white">{idx + 1}.</span> {p.pergunta}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {p.dimensao ? (
            <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/70">
              {p.dimensao}
            </span>
          ) : null}
          <OrigemBadge origem={origemOf(p)} />
        </div>
      </div>
      {hint ? <p className="text-sm font-semibold text-white/75">{hint}</p> : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
        Âncoras BARS 1–5
      </p>
    </li>
  )
}

/** The closed set of dimensão options for the edit Select = the guide's own dimensões
 * plus the row's current value (free-text dimensões survive even if AI-only). */
function dimensaoOptions(perguntas: GuiaPergunta[], current?: string | null): string[] {
  const set = new Set<string>()
  for (const p of perguntas) {
    if (typeof p.dimensao === 'string' && p.dimensao.trim()) set.add(p.dimensao)
  }
  if (typeof current === 'string' && current.trim()) set.add(current)
  return Array.from(set)
}

interface EditablePerguntaRowProps {
  p: GuiaPergunta
  idx: number
  total: number
  dimensoes: string[]
  onChangePergunta: (idx: number, value: string) => void
  onChangeDimensao: (idx: number, value: string) => void
  onMoveUp: (idx: number) => void
  onMoveDown: (idx: number) => void
  onRemove: (idx: number) => void
}

/** An editable question row: inline Input (pergunta) + Select (dimensão) + up/down +
 * delete-confirm. Carries the read-only row spacing for visual continuity. */
function EditablePerguntaRow({
  p,
  idx,
  total,
  dimensoes,
  onChangePergunta,
  onChangeDimensao,
  onMoveUp,
  onMoveDown,
  onRemove,
}: EditablePerguntaRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isFirst = idx === 0
  const isLast = idx === total - 1

  return (
    <li className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="flex items-start gap-2">
        <span className="pt-2 text-base font-semibold text-white">{idx + 1}.</span>
        <div className="flex-1 space-y-2">
          <Input
            aria-label={`${COPY.perguntaLabel} ${idx + 1}`}
            value={p.pergunta}
            onChange={(e) => onChangePergunta(idx, e.target.value)}
            className="min-h-[44px] border-white/20 bg-white/10 text-base text-white/90"
          />
          <Select
            value={typeof p.dimensao === 'string' ? p.dimensao : undefined}
            onValueChange={(v: string) => onChangeDimensao(idx, v)}
          >
            <SelectTrigger
              aria-label={`${COPY.dimensaoLabel} ${idx + 1}`}
              className="min-h-[44px] border-white/20 bg-white/10 text-white"
            >
              <SelectValue placeholder={COPY.dimensaoLabel} />
            </SelectTrigger>
            <SelectContent className="border-white/20 bg-[#00109E]/95 text-white backdrop-blur-xl">
              {dimensoes.map((d) => (
                <SelectItem key={d} value={d} className="text-white">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <OrigemBadge origem={origemOf(p)} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={COPY.moverCima}
              disabled={isFirst}
              onClick={() => onMoveUp(idx)}
              className="flex h-9 w-9 items-center justify-center rounded border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40"
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={COPY.moverBaixo}
              disabled={isLast}
              onClick={() => onMoveDown(idx)}
              className="flex h-9 w-9 items-center justify-center rounded border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <button
                type="button"
                aria-label={COPY.removerAria}
                onClick={() => setConfirmOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded border border-red-400/30 bg-red-500/15 text-red-300 transition-colors hover:bg-red-500/25 focus-visible:ring-2 focus-visible:ring-red-300/50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{COPY.delTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{COPY.delBody}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{COPY.cancelar}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onRemove(idx)
                      setConfirmOpen(false)
                    }}
                    className="bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  >
                    {COPY.delConfirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
        Âncoras BARS 1–5
      </p>
    </li>
  )
}

/** The inline add-manual-question form appended at the list end. */
function AddPerguntaForm({
  onAdd,
}: {
  onAdd: (pergunta: string, dimensao: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pergunta, setPergunta] = useState('')
  const [dimensao, setDimensao] = useState('')

  function reset() {
    setPergunta('')
    setDimensao('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {COPY.adicionar}
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-3">
      <div className="space-y-1">
        <Label htmlFor="add-pergunta" className="text-sm font-semibold text-white/80">
          {COPY.perguntaLabel}
        </Label>
        <Input
          id="add-pergunta"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          className="min-h-[44px] border-white/20 bg-white/10 text-base text-white/90"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="add-dimensao" className="text-sm font-semibold text-white/80">
          {COPY.dimensaoLabel}
        </Label>
        <Input
          id="add-dimensao"
          value={dimensao}
          onChange={(e) => setDimensao(e.target.value)}
          className="min-h-[44px] border-white/20 bg-white/10 text-base text-white/90"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!pergunta.trim()}
          onClick={() => {
            onAdd(pergunta.trim(), dimensao.trim())
            reset()
          }}
          className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {COPY.adicionarConfirm}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/15"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {COPY.cancelar}
        </button>
      </div>
    </div>
  )
}

export interface GuiaEntrevistaPanelProps {
  guia: EntrevistaGuiaRow | null
  loading?: boolean
  generating?: boolean
  /** Fires the online/presencial generate mutation. */
  onGerar?: (tipo: TipoEntrevista) => void
  /** Batch-saves the whole edited guide (ENTREV-06/07; wired to useGuiaEntrevista.saveEdits). */
  onSaveEdits?: (vars: { tipo: TipoEntrevista; perguntas: GuiaPergunta[] }) => void
  /** The save mutation is in-flight → "Salvando…" + disabled (no double-submit). */
  saving?: boolean
  /** The last save rejected → AsyncState error region (edit state preserved). */
  saveError?: boolean
  /** The save error code (FORBIDDEN/insufficient_privilege → permission copy). */
  saveErrorCode?: string
  /** The last generate attempt rejected → cooldown + "may still be running" copy. */
  generateError?: boolean
  className?: string
}

/**
 * The STAR/PEI guide panel — view (generate CTAs + rendered guide + origem badges) and
 * edit (inline edit / add / remove / reorder + batch save) modes. Header carries the
 * SugestaoIABadge (full) — every AI-derived block.
 */
export function GuiaEntrevistaPanel({
  guia,
  loading = false,
  generating = false,
  onGerar,
  onSaveEdits,
  saving = false,
  saveError = false,
  saveErrorCode,
  generateError = false,
  className,
}: GuiaEntrevistaPanelProps) {
  const perguntas = useMemo(() => perguntasOf(guia), [guia])
  const hasGuide = perguntas.length > 0

  const [editing, setEditing] = useState(false)
  // Working copy of the guide while editing (the single source of truth in edit mode).
  const [draft, setDraft] = useState<GuiaPergunta[]>(perguntas)
  // Dirty when the draft diverges from the last-saved guide.
  const [dirty, setDirty] = useState(false)

  // §7.25: seconds left on the post-failure cooldown. Ticks down once a second while
  // positive; armed by a generateError edge, disarmed when a new generation starts.
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (generating) {
      setCooldown(0)
      return
    }
    if (generateError) setCooldown(GERAR_COOLDOWN_S)
  }, [generating, generateError])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // The generate CTAs are blocked while a generation is in flight AND during the
  // cooldown that follows a failure.
  const gerarBloqueado = generating || cooldown > 0

  // Reset the draft whenever the saved guide changes (e.g. after a successful save
  // invalidates the query) — and exit edit mode so the saved guide shows in view.
  useEffect(() => {
    setDraft(perguntas)
    setDirty(false)
    setEditing(false)
  }, [perguntas])

  function enterEdit() {
    setDraft(perguntas)
    setDirty(false)
    setEditing(true)
  }

  function cancelEdit() {
    // Revert to the last-saved guide WITHOUT a dialog (UI-SPEC §Copywriting).
    setDraft(perguntas)
    setDirty(false)
    setEditing(false)
  }

  function updateDraft(next: GuiaPergunta[]) {
    setDraft(next)
    setDirty(true)
  }

  function changePergunta(idx: number, value: string) {
    updateDraft(draft.map((p, i) => (i === idx ? { ...p, pergunta: value } : p)))
  }

  function changeDimensao(idx: number, value: string) {
    updateDraft(draft.map((p, i) => (i === idx ? { ...p, dimensao: value } : p)))
  }

  function moveUp(idx: number) {
    if (idx <= 0) return
    const next = [...draft]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    updateDraft(next)
  }

  function moveDown(idx: number) {
    if (idx >= draft.length - 1) return
    const next = [...draft]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    updateDraft(next)
  }

  function removePergunta(idx: number) {
    updateDraft(draft.filter((_, i) => i !== idx))
  }

  function addManual(pergunta: string, dimensao: string) {
    const row: GuiaPergunta = {
      pergunta,
      dimensao: dimensao || null,
      origem: 'manual',
    }
    updateDraft([...draft, row])
  }

  function handleSave() {
    if (!guia || saving) return
    onSaveEdits?.({ tipo: guia.tipo as TipoEntrevista, perguntas: draft })
  }

  const dimensoes = dimensaoOptions(draft)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-white">Guia STAR/PEI</h3>
          <SugestaoIABadge variant="full" />
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={enterEdit}
            disabled={!hasGuide || loading || generating}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {COPY.editar}
          </button>
        ) : null}
      </div>

      {/* online / presencial generate CTAs — view mode only */}
      {!editing ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onGerar?.('online')}
              disabled={gerarBloqueado}
              className="min-h-[44px] rounded-lg border border-white/20 bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30 disabled:opacity-50"
            >
              <Sparkles className="mr-1 inline h-4 w-4 text-[#35BFAD]" aria-hidden="true" />
              {generating
                ? COPY.gerando
                : cooldown > 0
                  ? COPY.gerarErrEspera(cooldown)
                  : 'Gerar guia (entrevista online)'}
            </button>
            <button
              type="button"
              onClick={() => onGerar?.('presencial')}
              disabled={gerarBloqueado}
              className="min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              <Sparkles className="mr-1 inline h-4 w-4 text-[#35BFAD]" aria-hidden="true" />
              {generating
                ? COPY.gerando
                : cooldown > 0
                  ? COPY.gerarErrEspera(cooldown)
                  : 'Gerar guia (entrevista presencial)'}
            </button>
          </div>
          {/* §7.25: o tempo esperado, dito na tela. Sem isto o RH assume que travou. */}
          {generating ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-white/20 bg-white/10 p-3"
            >
              <p className="text-sm font-semibold text-white">{COPY.gerandoHeading}</p>
              <p className="mt-1 text-sm text-white/75">{COPY.gerandoBody}</p>
            </div>
          ) : null}
          {!generating && generateError ? (
            <div role="alert" className="rounded-lg border border-white/20 bg-white/10 p-3">
              <p className="text-sm font-semibold text-white">{COPY.gerarErrHeading}</p>
              <p className="mt-1 text-sm text-white/75">{COPY.gerarErrBody}</p>
            </div>
          ) : null}
          {guia?.tipo === 'presencial' ? (
            <p className="text-sm font-semibold text-white/75">
              Foco nos gaps da entrevista online (dimensões com score &lt; 4).
            </p>
          ) : null}
        </>
      ) : null}

      {generating || loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full bg-white/5" />
          <Skeleton className="h-16 w-full bg-white/5" />
        </div>
      ) : !editing ? (
        perguntas.length === 0 ? (
          <p className="text-sm text-white/75">{COPY.emptyBody}</p>
        ) : (
          <ul className="space-y-3">
            {perguntas.map((p, i) => (
              <PerguntaRow key={i} p={p} idx={i} />
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {draft.map((p, i) => (
              <EditablePerguntaRow
                key={i}
                p={p}
                idx={i}
                total={draft.length}
                dimensoes={dimensoes}
                onChangePergunta={changePergunta}
                onChangeDimensao={changeDimensao}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                onRemove={removePergunta}
              />
            ))}
          </ul>

          <AddPerguntaForm onAdd={addManual} />

          {/* Save error — static PT-BR copy keyed by code; NEVER the raw RPC error. */}
          {saveError ? (
            <div
              role="alert"
              className="space-y-1 rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-3 text-white/80"
            >
              <p className="text-base font-semibold text-white">{COPY.errHeading}</p>
              <p className="text-sm text-white/75">
                {isPermissionError(saveErrorCode) ? COPY.errPermission : COPY.errGeneric}
              </p>
            </div>
          ) : null}

          {dirty ? <p className="text-sm text-white/75">{COPY.dirty}</p> : null}

          <div className="flex flex-wrap gap-2">
            <GlassButton
              variant="accent"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="min-h-[44px]"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? COPY.salvando : COPY.salvar}
            </GlassButton>
            <GlassButton
              variant="white"
              onClick={cancelEdit}
              disabled={saving}
              className="min-h-[44px]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              {COPY.cancelar}
            </GlassButton>
          </div>
        </div>
      )}
    </div>
  )
}
