/**
 * Phase 13 / Plan 13-03 (AVAL-05 / AVAL-06 / per D-13) — the candidate culture-fit
 * essay editor.
 *
 * "SjtCasoAbertoScreen again, essay flavor": copies the Phase-11 candidate glass
 * shell (D-27 — `BackgroundImage` gradient + narrow `max-w-2xl` column +
 * `GlassPanel variant="white" blur="xl"`; NOT a new shell), reuses
 * `useAutosaveAvaliacao({ teste: 'redacao' })` (30s local + 30s DB + 42501
 * back-lock) and the `AutosaveAffordance` (#35BFAD Check), and renders the seeded
 * `perguntas_redacao` prompt verbatim, a `Textarea`, the 3-band `RedacaoCounter`
 * (drives submit-disabled at the 200-500 hard bounds), and the informative
 * `RedacaoCronometro`.
 *
 * Multi-question: "Pergunta {n} de {total}" + a "Próxima pergunta" CTA; "Redações
 * concluídas." once every prompt is submitted. Submit goes through the irreversible
 * `AlertDialog` to `redacaoService.enviarRedacao`, which posts ONLY
 * `{ candidatura_id, pergunta_id, texto }` and returns a NEUTRAL ack — the
 * candidate NEVER sees a score/color/threshold during or after writing (RNF-07a).
 * The post-submit copy is "Resposta registrada." (RF-R-06), never a result. The
 * RLS back-lock surfaces neutrally ("Sua etapa avançou."), never an error toast.
 *
 * @see src/features/avaliacao/components/SjtCasoAbertoScreen.tsx (the near-exact template)
 * @see src/features/avaliacao/hooks/useAutosaveAvaliacao.ts (reused with teste='redacao')
 * @see src/features/avaliacao/services/redacaoService.ts (getRedacaoContext / enviarRedacao / getMinhasRedacoes)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md §Copywriting Contract
 * @module features/avaliacao/components/RedacaoEditorScreen
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Check, AlertCircle, Lock, CheckCircle2 } from 'lucide-react'
import { BackgroundImage } from '@/components/BackgroundImage'
import { GlassPanel, GlassButton, Glass } from '@/components/ui/glass'
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
  getRedacaoContext,
  getMinhasRedacoes,
  enviarRedacao,
  redacaoKeys,
  RedacaoServiceError,
  type PerguntaRedacao,
} from '@/features/avaliacao/services/redacaoService'
import { upsertResposta } from '@/features/avaliacao/services/avaliacaoService'
import {
  useAutosaveAvaliacao,
  type AutosaveStatus,
} from '@/features/avaliacao/hooks/useAutosaveAvaliacao'
import { RedacaoCounter, countWords, MIN_WORDS, MAX_WORDS } from './RedacaoCounter'
import { RedacaoCronometro } from './RedacaoCronometro'

const TESTE = 'redacao'

/** The neutral autosave affordance (the single accent touchpoint, #35BFAD). */
function AutosaveAffordance({ status }: { status: AutosaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-white/70">
        <Loader2 className="w-4 h-4 animate-spin" /> Salvando…
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-[#35BFAD]">
        <Check className="w-4 h-4" /> Salvo automaticamente
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-white/70">
        <AlertCircle className="w-4 h-4" /> Não foi possível salvar agora — tentando
        novamente…
      </span>
    )
  }
  return <span />
}

export function RedacaoEditorScreen() {
  const navigate = useNavigate()
  const { candidaturaId } = useParams<{ candidaturaId: string }>()

  const { data: perguntas, isLoading, error, refetch } = useQuery({
    queryKey: redacaoKeys.context(candidaturaId ?? ''),
    queryFn: () => getRedacaoContext(candidaturaId as string),
    enabled: Boolean(candidaturaId),
  })

  // The candidate's own submitted redações (allowlist read — never a verdict).
  const { data: minhas } = useQuery({
    queryKey: redacaoKeys.minhas(candidaturaId ?? ''),
    queryFn: () => getMinhasRedacoes(candidaturaId as string),
    enabled: Boolean(candidaturaId),
  })

  const submittedIds = useMemo(
    () => new Set((minhas ?? []).map((m) => m.pergunta_id)),
    [minhas],
  )

  const [idx, setIdx] = useState(0)
  const [texto, setTexto] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const pergunta = (perguntas ?? [])[idx] as PerguntaRedacao | undefined
  const total = (perguntas ?? []).length

  // Stable upsert closure (deps [candidaturaId]) so the autosave flush + unmount
  // flush don't re-arm on every render. The buffer namespaces the draft by
  // pergunta_id so each prompt's text autosaves independently under teste='redacao'.
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

  const backToPanel = () => navigate(`/candidato/avaliacao/${candidaturaId}`)

  const words = countWords(texto)
  const submitEnabled = words >= MIN_WORDS && words <= MAX_WORDS

  const goNext = () => {
    setIdx((i) => Math.min(i + 1, total - 1))
    setTexto('')
    setIsValid(false)
  }

  const handleSubmit = async () => {
    if (!pergunta) return
    setSubmitting(true)
    try {
      await flushNow()
      await enviarRedacao({
        candidatura_id: candidaturaId as string,
        pergunta_id: pergunta.id,
        texto,
      })
      // NEUTRAL acknowledgement — no score, no feedback on quality (RF-R-06).
      toast.success('Resposta registrada. Você pode revisar até concluir a etapa.')
      submittedIds.add(pergunta.id)
      if (idx < total - 1) {
        goNext()
      } else {
        setTexto('')
      }
    } catch (err) {
      if (err instanceof RedacaoServiceError && err.code === 'LOCKED') {
        toast.info('Sua etapa avançou. Esta redação foi encerrada.')
        backToPanel()
        return
      }
      toast.error('Não foi possível enviar sua redação. Tente novamente.')
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
            Esta redação foi encerrada e suas respostas já estão salvas.
          </p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white">
            Voltar ao painel
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  if (isLoading) {
    return (
      <ScreenShell>
        <Glass variant="white" blur="md" className="p-6 animate-pulse h-48">
          <span />
        </Glass>
      </ScreenShell>
    )
  }

  if (error) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
          <AlertCircle className="w-14 h-14 text-[#EF4444] mx-auto mb-4" />
          <p className="text-white/90 text-xl mb-2">
            Não foi possível carregar a redação.
          </p>
          <p className="text-white/70 mb-6">Verifique sua conexão e tente novamente.</p>
          <GlassButton variant="white" hover onClick={() => refetch()} className="text-white">
            Tentar novamente
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  if (total === 0) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
          <p className="text-white/90 text-xl mb-2">Nenhuma redação pendente</p>
          <p className="text-white/70 mb-6">
            Você não tem redação para concluir nesta etapa no momento.
          </p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white">
            Voltar ao painel
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // All prompts submitted → neutral all-done state.
  const allSubmitted =
    total > 0 && (perguntas ?? []).every((p) => submittedIds.has(p.id))
  if (allSubmitted) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
          <CheckCircle2 className="w-14 h-14 text-[#35BFAD] mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2 drop-shadow-md">Redações concluídas.</h1>
          <p className="text-white/80 mb-6">
            Avisaremos sobre os próximos passos por e-mail.
          </p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white">
            Voltar ao painel
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  if (!pergunta) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
          <p className="text-white/90 text-xl mb-4">Nenhuma redação pendente</p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white">
            Voltar ao painel
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <GlassPanel variant="white" blur="xl" className="text-white space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold drop-shadow-md">Redação cultural</h1>
          <AutosaveAffordance status={status} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-white/80">
            Pergunta {idx + 1} de {total}
          </p>
          <p className="text-base leading-normal text-white whitespace-pre-line">
            {pergunta.texto}
          </p>
          <p className="text-sm text-white/70 pt-1">Tempo estimado: 15-25 min</p>
          <RedacaoCronometro />
        </div>

        <div className="space-y-2">
          <Textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              update({ pergunta_id: pergunta.id, texto: e.target.value })
            }}
            onBlur={() => void flushNow()}
            placeholder="Escreva sua resposta aqui. Conte uma situação real, o que você fez e o que aprendeu."
            rows={14}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-base leading-normal"
          />
          <RedacaoCounter text={texto} onValidChange={setIsValid} />
        </div>

        <div className="flex justify-end pt-2">
          <AlertDialog>
            {/* The submit-disabled tooltip lives on a wrapping span (GlassButton
                has no `title` prop) — the 200-500-word hint per UI-SPEC. */}
            <span
              title={
                submitEnabled
                  ? undefined
                  : 'A redação precisa ter entre 200 e 500 palavras.'
              }
            >
              <AlertDialogTrigger asChild>
                <GlassButton
                  variant="white"
                  hover
                  disabled={!submitEnabled || !isValid || submitting}
                  className="text-white min-h-[44px]"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
                    </span>
                  ) : (
                    'Enviar redação'
                  )}
                </GlassButton>
              </AlertDialogTrigger>
            </span>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Enviar redação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Você ainda pode revisá-la até concluir esta etapa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continuar escrevendo</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Enviar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {idx < total - 1 && submittedIds.has(pergunta.id) && (
          <div className="flex justify-end">
            <GlassButton
              variant="white"
              hover
              onClick={goNext}
              className="text-white min-h-[44px]"
            >
              Próxima pergunta
            </GlassButton>
          </div>
        )}
      </GlassPanel>
    </ScreenShell>
  )
}

/** Shared glass shell (mobile-first, narrow column) — D-27, reused not re-authored. */
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
