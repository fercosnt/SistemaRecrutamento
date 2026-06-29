/**
 * Phase 11 / Plan 11-05 (AVAL-03 / AVAL-09 / RF-14·18) — the SJT open-case screen.
 *
 * Renders the open-case `pergunta` (formato='caso_aberto'): "Caso prático" +
 * "Cenário" + scenario body + a `textarea`. A live word count drives the three
 * helper variants (in-range / below-min 200 / above-max 500); submit is gated
 * until ≥200 words. `useAutosaveAvaliacao` (30s debounce + on-blur flush) backs
 * the answer with a neutral autosave affordance ("Salvando…"/"Salvo
 * automaticamente"/transient retry). When the autosave hook reports the RLS
 * back-lock (`locked`, etapa advanced) the screen swaps to the neutral
 * "Sua etapa avançou…" lock state — never an error. Submit goes through the
 * irreversible `alert-dialog` confirm to `avaliacaoService.avaliarRedacao`, which
 * posts ONLY the answer text — the BARS score is derived server-side (RNF-07a).
 *
 * @see src/features/avaliacao/hooks/useAutosaveAvaliacao.ts (30s + back-lock)
 * @see src/features/avaliacao/services/avaliacaoService.ts (avaliarRedacao, upsertResposta)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-UI-SPEC.md (open case screen)
 * @module features/avaliacao/components/SjtCasoAbertoScreen
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Check, AlertCircle, Lock } from 'lucide-react'
import { BackgroundImage } from '@/components/BackgroundImage'
import { GlassPanel, GlassButton } from '@/components/ui/glass'
import { AsyncState } from '@/components/ui/AsyncState'
import { Textarea } from '@/components/ui/textarea'
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
import {
  getAvaliacaoContext,
  avaliarRedacao,
  upsertResposta,
  AvaliacaoServiceError,
  type PerguntaSjt,
} from '@/features/avaliacao/services/avaliacaoService'
import {
  useAutosaveAvaliacao,
  type AutosaveStatus,
} from '@/features/avaliacao/hooks/useAutosaveAvaliacao'

const TESTE = 'sjt_caso_aberto'
const MIN_WORDS = 200
const MAX_WORDS = 500

/** Pull the EF `error_code` (e.g. AI_UNAVAILABLE) off an AvaliacaoServiceError — code-only, no PII. */
function errorCodeOf(error: unknown): string | undefined {
  if (error instanceof AvaliacaoServiceError) {
    const details = error.details as { error_code?: unknown } | undefined
    return typeof details?.error_code === 'string' ? details.error_code : undefined
  }
  return undefined
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/** The neutral autosave affordance (the single accent touchpoint, #35BFAD). */
function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-white/70">
        <Loader2 className="w-4 h-4 animate-spin" /> Salvando…
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-white/80">
        <Check className="w-4 h-4 text-[#35BFAD]" /> Salvo automaticamente
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-amber-300/90">
        <AlertCircle className="w-4 h-4" /> Não foi possível salvar agora — tentando
        novamente…
      </span>
    )
  }
  return <span />
}

export function SjtCasoAbertoScreen() {
  const navigate = useNavigate()
  const { candidaturaId } = useParams<{ candidaturaId: string }>()

  const { data: ctx, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['avaliacao', 'context', candidaturaId],
    queryFn: () => getAvaliacaoContext(candidaturaId as string),
    enabled: Boolean(candidaturaId),
  })

  const pergunta = useMemo<PerguntaSjt | undefined>(
    () => (ctx?.perguntas ?? []).find((p) => p.formato === 'caso_aberto'),
    [ctx],
  )

  const [texto, setTexto] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Stable upsert closure (deps [candidaturaId]) so useAutosaveAvaliacao's flush +
  // unmount-flush effect don't re-arm on every render (W2 — redundant writes).
  const upsert = useCallback(
    (payload: Parameters<typeof upsertResposta>[2]) =>
      upsertResposta(candidaturaId as string, TESTE, payload),
    [candidaturaId],
  )

  const { update, flushNow, status, locked } = useAutosaveAvaliacao({
    candidaturaId: candidaturaId ?? '',
    teste: TESTE,
    upsert,
  })

  const words = countWords(texto)
  const belowMin = words < MIN_WORDS
  const aboveMax = words > MAX_WORDS

  const backToPanel = () => navigate(`/candidato/avaliacao/${candidaturaId}`)

  const handleSubmit = async () => {
    if (!pergunta) return
    setSubmitting(true)
    try {
      await flushNow()
      await avaliarRedacao({
        candidatura_id: candidaturaId as string,
        pergunta_id: pergunta.id,
        texto,
      })
      toast.success('Avaliação enviada com sucesso')
      backToPanel()
    } catch (err) {
      if (err instanceof AvaliacaoServiceError && err.code === 'LOCKED') {
        toast.info('Sua etapa avançou. Esta avaliação foi encerrada.')
        backToPanel()
        return
      }
      toast.error('Não foi possível enviar sua resposta. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Neutral back-lock state (etapa advanced mid-session) ──
  if (locked) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
          <Lock className="w-14 h-14 text-white/60 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2 drop-shadow-md">Sua etapa avançou.</h1>
          <p className="text-white/80 mb-6">
            Esta avaliação foi encerrada e suas respostas já estão salvas.
          </p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white">
            Voltar ao painel
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // Read region (the open-case prompt) via the shared <AsyncState>: loading → slow →
  // error + retry — was loading-only; now never a blank screen (RESIL-03). errorCode
  // threaded so AI_UNAVAILABLE → sobrecarga copy (generic for DB reads).
  // WR-04: o read do open-case é uma leitura de DB simples (sem IA); override neutro da
  // slow-note p/ não exibir "processando com IA / ~30s" num read lento (a slow-copy de
  // IA fica só nas telas de IA reais — Consolidação/Comparativo).
  if (isLoading || isError) {
    return (
      <ScreenShell>
        <AsyncState
          isLoading={isLoading}
          isError={isError}
          errorCode={errorCodeOf(error)}
          onRetry={() => refetch()}
          copy={{ slow: { heading: 'Carregando…', body: 'Isso pode levar alguns segundos.' } }}
        />
      </ScreenShell>
    )
  }

  if (!pergunta) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
          <p className="text-white/90 text-xl mb-4">Nenhuma avaliação pendente</p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white">
            Voltar ao painel
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  const wordHelper = belowMin
    ? `${words} palavras — mínimo ${MIN_WORDS}`
    : aboveMax
      ? `${words} palavras — máximo ${MAX_WORDS}`
      : `${words} palavras`

  return (
    <ScreenShell>
      <GlassPanel variant="white" blur="xl" className="text-white space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold drop-shadow-md">Caso prático</h1>
          <AutosaveIndicator status={status} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-white/80">Cenário</p>
          <p className="text-base leading-relaxed text-white whitespace-pre-line">
            {pergunta.cenario}
          </p>
          <p className="text-sm text-white/70 pt-2">
            Descreva como você lidaria com a situação acima. Escreva entre {MIN_WORDS} e{' '}
            {MAX_WORDS} palavras.
          </p>
        </div>

        <div className="space-y-2">
          <Textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              update({ texto: e.target.value })
            }}
            onBlur={() => void flushNow()}
            placeholder="Comece a escrever sua resposta aqui…"
            rows={12}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-base leading-relaxed"
          />
          <p
            className={`text-sm ${belowMin || aboveMax ? 'text-amber-300/90' : 'text-white/70'}`}
          >
            {wordHelper}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <GlassButton
                variant="white"
                hover
                disabled={belowMin || aboveMax || submitting}
                className="text-white min-h-[44px]"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
                  </span>
                ) : (
                  'Enviar resposta'
                )}
              </GlassButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Enviar avaliação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Após enviar, você não poderá editar suas respostas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Revisar</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Enviar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </GlassPanel>
    </ScreenShell>
  )
}

/** Shared glass shell for the SJT screens (mobile-first, narrow column). */
function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 max-w-2xl mt-8">{children}</div>
      </BackgroundImage>
    </div>
  )
}
