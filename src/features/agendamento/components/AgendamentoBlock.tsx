/**
 * AgendamentoBlock — the RH interview-scheduling surface on the candidate hub
 * (AGEND-02/03).
 *
 * Gated to the two interview etapas: when `etapaAtual` is NOT
 * `entrevista_online`/`entrevista_presencial` the block renders a locked
 * `HubSection estado="futuro"` ("Etapa ainda não iniciada"). Inside those etapas it
 * reads the latest agendamento via `useAgendamento`:
 *  - none scheduled → an empty state + the `Agendar entrevista` CTA that reveals the
 *    form (shadcn Calendar+time in a Popover, Select modalidade, conditional
 *    link/local Input, Observações internas Textarea).
 *  - one exists → a SUMMARY card (status chip, data/hora pt-BR, modalidade,
 *    link/local, a `compareceu` segmented control, `Reagendar` + `Cancelar` actions).
 *
 * Writes flow through the Task-1 mutations (direct `.insert`/`.update` on
 * `agendamentos_entrevista`; the payloads exclude the trigger-stamped scope/audit
 * columns). Cancel confirms via `AlertDialog` and keeps the row (`status='cancelada'`)
 * so the candidate still sees the cancellation on their panel (P35). `observacoes_rh`
 * is RH-internal and is only ever rendered on this RH surface — never a candidate one.
 *
 * @module features/agendamento/components/AgendamentoBlock
 * @see src/features/agendamento/hooks/useAgendamento.ts (the read + 4 mutations)
 * @see .planning/phases/34-.../34-UI-SPEC.md (§Surface 2 — Agendamento form + §Copywriting §Agendamento)
 */
import { useState, type ReactNode } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Loader2, RotateCcw, Ban } from 'lucide-react'

import { Glass } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { HubSection } from '@/features/hub-candidato/components/HubSection'
import { useAgendamento } from '../hooks/useAgendamento'
import { agendamentoSchema, type AgendamentoFormValues } from '../schemas/agendamentoSchema'
import type {
  AgendamentoRow,
  AgendarInput,
  StatusAgendamento,
  TipoAgendamento,
} from '../services/agendamentoService'

/** The two etapas that unlock the scheduling block. */
const ETAPAS_ENTREVISTA = new Set(['entrevista_online', 'entrevista_presencial'])

/** Status chip metadata — label + colorblind-safe class (text + color together). */
const STATUS_META: Record<StatusAgendamento, { label: string; className: string }> = {
  agendada: { label: 'Agendada', className: 'bg-[#35BFAD]/20 text-[#35BFAD] border-[#35BFAD]/30' },
  reagendada: { label: 'Reagendada', className: 'bg-[#35BFAD]/20 text-[#35BFAD] border-[#35BFAD]/30' },
  em_andamento: { label: 'Em andamento', className: 'bg-white/10 text-white/80 border-white/20' },
  concluida: { label: 'Concluída', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
  cancelada: { label: 'Cancelada', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
  nao_compareceu: { label: 'Não compareceu', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
}

const MODALIDADE_LABEL: Record<TipoAgendamento, string> = {
  online: 'Online',
  presencial: 'Presencial',
}

export interface AgendamentoBlockProps {
  /** The candidatura whose interview to schedule (the `:id` route param — Pitfall 8). */
  candidaturaId: string
  /** The candidate's current etapa — gates the block on/off. */
  etapaAtual: string | null
}

/** The dark-glass block shell (title + children), shared by every state. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <Glass variant="dark" blur="lg" className="rounded-xl p-6">
      <h2 className="mb-4 text-xl font-semibold text-white md:text-2xl">
        Agendamento de entrevista
      </h2>
      {children}
    </Glass>
  )
}

/** Formats a timestamptz ISO string in pt-BR (`d 'de' MMM yyyy 'às' HH:mm`). */
function formatDataHora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return format(d, "d 'de' MMM yyyy 'às' HH:mm", { locale: ptBR })
}

/**
 * Composed date + time control: a shadcn Calendar inside a Popover (date) alongside a
 * native `<input type="time">` (time), producing a single ISO `data_hora` string.
 */
function DataHoraPicker({
  value,
  onChange,
  hasError,
}: {
  value: string
  onChange: (iso: string) => void
  hasError?: boolean
}) {
  const [open, setOpen] = useState(false)
  const parsed = value ? new Date(value) : undefined
  const valid = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined
  const horaStr = valid ? format(valid, 'HH:mm') : ''

  const setDate = (day: Date | undefined) => {
    if (!day) return
    const base = valid ?? new Date()
    const merged = new Date(day)
    merged.setHours(base.getHours(), base.getMinutes(), 0, 0)
    onChange(merged.toISOString())
    setOpen(false)
  }
  const setHora = (h: string) => {
    const [hh, mm] = h.split(':')
    const base = valid ?? new Date()
    const merged = new Date(base)
    merged.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0)
    onChange(merged.toISOString())
  }

  const triggerCls = [
    'inline-flex min-h-[44px] items-center gap-2 rounded-xl border bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10',
    hasError ? 'border-red-500/50' : 'border-white/20',
  ].join(' ')

  return (
    <div className="flex flex-wrap gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={triggerCls} aria-label="Selecionar data">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {valid ? format(valid, "d 'de' MMM yyyy", { locale: ptBR }) : 'Selecionar data'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={valid}
            onSelect={setDate}
            locale={ptBR}
            disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <input
        type="time"
        value={horaStr}
        onChange={(e) => setHora(e.target.value)}
        aria-label="Horário"
        className="min-h-[44px] rounded-xl border border-white/20 bg-white/5 px-3 text-sm font-semibold text-white [color-scheme:dark]"
      />
    </div>
  )
}

/**
 * The scheduling form (create or reschedule). Built with React Hook Form +
 * `agendamentoSchema`. On submit it hands a clean `AgendarInput` to the caller (the
 * caller owns which mutation runs + the toast copy).
 */
function AgendamentoForm({
  etapaAtual,
  initial,
  onSubmitInput,
  onCancel,
  isPending,
  submitLabel,
}: {
  etapaAtual: string
  initial?: AgendamentoRow | null
  onSubmitInput: (input: AgendarInput) => void
  onCancel?: () => void
  isPending: boolean
  submitLabel: string
}) {
  const defaultTipo: TipoAgendamento =
    (initial?.tipo as TipoAgendamento | undefined) ??
    (etapaAtual === 'entrevista_presencial' ? 'presencial' : 'online')

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AgendamentoFormValues>({
    resolver: zodResolver(agendamentoSchema) as Resolver<AgendamentoFormValues>,
    mode: 'onBlur',
    defaultValues: {
      tipo: defaultTipo,
      data_hora: initial?.data_hora ?? '',
      local_ou_link: initial?.local_ou_link ?? '',
      observacoes_rh: initial?.observacoes_rh ?? '',
      entrevistador: initial?.entrevistador ?? '',
    },
  })

  const tipo = watch('tipo')

  const submit = handleSubmit((values) => {
    onSubmitInput({
      tipo: values.tipo,
      data_hora: values.data_hora,
      local_ou_link: values.local_ou_link?.trim() ? values.local_ou_link.trim() : null,
      observacoes_rh: values.observacoes_rh?.trim() ? values.observacoes_rh.trim() : null,
      entrevistador: values.entrevistador?.trim() ? values.entrevistador.trim() : null,
    })
  })

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {/* Data + Horário */}
      <div className="space-y-2">
        <span className="text-sm font-semibold text-white">Data e horário</span>
        <Controller
          name="data_hora"
          control={control}
          render={({ field }) => (
            <DataHoraPicker
              value={field.value ?? ''}
              onChange={field.onChange}
              hasError={!!errors.data_hora}
            />
          )}
        />
        {errors.data_hora && (
          <p role="alert" aria-live="assertive" className="text-sm text-red-300">
            {errors.data_hora.message}
          </p>
        )}
      </div>

      {/* Modalidade */}
      <div className="space-y-2">
        <label htmlFor="agendamento-tipo" className="text-sm font-semibold text-white">
          Modalidade
        </label>
        <Controller
          name="tipo"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id="agendamento-tipo"
                aria-label="Modalidade"
                className="w-full border-white/20 bg-white/5 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Link (online) OU Local (presencial) — conditional */}
      <div className="space-y-2">
        <label htmlFor="agendamento-local" className="text-sm font-semibold text-white">
          {tipo === 'presencial' ? 'Local' : 'Link da videochamada'}
        </label>
        <Input
          id="agendamento-local"
          {...register('local_ou_link')}
          placeholder={
            tipo === 'presencial'
              ? 'ex.: Clínica Beauty Smile — Sala 2'
              : 'ex.: https://meet.google.com/...'
          }
          className="border-white/20 bg-white/5 text-white placeholder:text-white/50"
        />
      </div>

      {/* Observações internas (RH-only) */}
      <div className="space-y-2">
        <label htmlFor="agendamento-obs" className="text-sm font-semibold text-white">
          Observações internas{' '}
          <span className="font-normal text-white/50">(somente RH)</span>
        </label>
        <Textarea
          id="agendamento-obs"
          {...register('observacoes_rh')}
          rows={3}
          placeholder="Anotações internas — o candidato não vê este campo."
          className="border-white/20 bg-white/5 text-white placeholder:text-white/50"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          aria-live="polite"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#35BFAD] px-6 text-sm font-semibold text-white shadow-lg shadow-[#35BFAD]/30 transition-colors hover:bg-[#35BFAD]/90 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Salvando…
            </>
          ) : (
            submitLabel
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            Voltar
          </button>
        )}
      </div>
    </form>
  )
}

/** The active (etapa-unlocked) block — read + summary/form/state machine. */
function AgendamentoBlockInner({
  candidaturaId,
  etapaAtual,
}: {
  candidaturaId: string
  etapaAtual: string
}) {
  const { data: agendamento, isLoading, isError, refetch, agendar, reagendar, cancelar, setCompareceu } =
    useAgendamento(candidaturaId)
  const [formOpen, setFormOpen] = useState(false)

  if (isLoading) {
    return (
      <Shell>
        <Skeleton className="h-24 w-full bg-white/5" />
      </Shell>
    )
  }

  if (isError) {
    return (
      <Shell>
        <div className="space-y-3" aria-live="polite">
          <p className="text-sm text-red-300">
            Não foi possível carregar o agendamento. Verifique sua conexão e tente novamente.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Tentar novamente
          </button>
        </div>
      </Shell>
    )
  }

  // ── FORM (create or reschedule) ──────────────────────────────────────────────
  if (formOpen || !agendamento) {
    const isReschedule = !!agendamento
    const handleInput = (input: AgendarInput) => {
      if (isReschedule && agendamento) {
        reagendar.mutate(
          { id: agendamento.id, input },
          {
            onSuccess: () => {
              toast.success('Entrevista reagendada.')
              setFormOpen(false)
            },
            onError: () =>
              toast.error('Não foi possível reagendar a entrevista. Tente novamente.'),
          },
        )
      } else {
        agendar.mutate(input, {
          onSuccess: () => {
            toast.success('Entrevista agendada.')
            setFormOpen(false)
          },
          onError: () => toast.error('Não foi possível agendar a entrevista. Tente novamente.'),
        })
      }
    }

    // No agendamento AND the form has not been opened yet → the empty state + CTA.
    if (!agendamento && !formOpen) {
      return (
        <Shell>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">Nenhuma entrevista agendada</p>
              <p className="text-sm text-white/70 leading-relaxed">
                Agende a entrevista deste candidato — ele verá a data e o link no painel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#35BFAD] px-6 text-sm font-semibold text-white shadow-lg shadow-[#35BFAD]/30 transition-colors hover:bg-[#35BFAD]/90"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Agendar entrevista
            </button>
          </div>
        </Shell>
      )
    }

    return (
      <Shell>
        <AgendamentoForm
          etapaAtual={etapaAtual}
          initial={agendamento}
          onSubmitInput={handleInput}
          onCancel={agendamento ? () => setFormOpen(false) : undefined}
          isPending={agendar.isPending || reagendar.isPending}
          submitLabel={isReschedule ? 'Salvar agendamento' : 'Salvar agendamento'}
        />
      </Shell>
    )
  }

  // ── SUMMARY card (an agendamento exists) ─────────────────────────────────────
  const meta = STATUS_META[agendamento.status] ?? STATUS_META.agendada
  const compareceuValue =
    agendamento.compareceu === true ? 'sim' : agendamento.compareceu === false ? 'nao' : 'pendente'

  const handleCompareceu = (v: string) => {
    if (!v) return
    const value = v === 'sim' ? true : v === 'nao' ? false : null
    setCompareceu.mutate(
      { id: agendamento.id, value },
      {
        onSuccess: () => toast.success('Comparecimento atualizado.'),
        onError: () => toast.error('Não foi possível atualizar o comparecimento. Tente novamente.'),
      },
    )
  }

  const handleCancelar = () => {
    cancelar.mutate(agendamento.id, {
      onSuccess: () => toast.success('Entrevista cancelada.'),
      onError: () => toast.error('Não foi possível cancelar a entrevista. Tente novamente.'),
    })
  }

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={meta.className}>
            {meta.label}
          </Badge>
          <span className="text-base font-semibold text-white">
            {formatDataHora(agendamento.data_hora)}
          </span>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-white/50">Modalidade</dt>
            <dd className="text-sm text-white/85">{MODALIDADE_LABEL[agendamento.tipo]}</dd>
          </div>
          {agendamento.local_ou_link && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-white/50">
                {agendamento.tipo === 'presencial' ? 'Local' : 'Link da videochamada'}
              </dt>
              <dd className="break-words text-sm text-white/85">{agendamento.local_ou_link}</dd>
            </div>
          )}
          {agendamento.entrevistador && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-white/50">Entrevistador</dt>
              <dd className="text-sm text-white/85">{agendamento.entrevistador}</dd>
            </div>
          )}
        </dl>

        {agendamento.observacoes_rh && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-wide text-white/50">Observações internas</p>
            <p className="mt-1 text-sm text-white/80 leading-relaxed">
              {agendamento.observacoes_rh}
            </p>
          </div>
        )}

        {/* Comparecimento — segmented control (Compareceu / Não compareceu / Pendente) */}
        <div className="space-y-2">
          <span className="text-sm font-semibold text-white">Comparecimento</span>
          <ToggleGroup
            type="single"
            value={compareceuValue}
            onValueChange={handleCompareceu}
            className="w-full border border-white/15"
            aria-label="Registrar comparecimento"
          >
            <ToggleGroupItem value="sim" className="min-h-[44px] text-white data-[state=on]:bg-green-500/25">
              Compareceu
            </ToggleGroupItem>
            <ToggleGroupItem value="nao" className="min-h-[44px] text-white data-[state=on]:bg-red-500/25">
              Não compareceu
            </ToggleGroupItem>
            <ToggleGroupItem value="pendente" className="min-h-[44px] text-white data-[state=on]:bg-white/20">
              Pendente
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Actions — Reagendar + Cancelar (destructive, AlertDialog confirm) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#35BFAD]/40 bg-[#35BFAD]/10 px-4 text-sm font-semibold text-[#35BFAD] transition-colors hover:bg-[#35BFAD]/20"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reagendar entrevista
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
              >
                <Ban className="h-4 w-4" aria-hidden="true" />
                Cancelar entrevista
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar entrevista</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja cancelar esta entrevista? O candidato verá o
                  cancelamento no painel.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={cancelar.isPending}>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    handleCancelar()
                  }}
                  disabled={cancelar.isPending}
                  className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {cancelar.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Cancelando…
                    </span>
                  ) : (
                    'Cancelar entrevista'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Shell>
  )
}

/**
 * Etapa-gated interview-scheduling block. Renders a locked `HubSection` outside the
 * two entrevista etapas; delegates to the active inner block otherwise (so the read
 * hook only runs when the block is unlocked — no conditional-hook hazard).
 */
export function AgendamentoBlock({ candidaturaId, etapaAtual }: AgendamentoBlockProps) {
  if (!etapaAtual || !ETAPAS_ENTREVISTA.has(etapaAtual)) {
    return <HubSection titulo="Agendamento de entrevista" estado="futuro" />
  }
  return <AgendamentoBlockInner candidaturaId={candidaturaId} etapaAtual={etapaAtual} />
}
