/**
 * Phase 4 / D-04 — FormularioCandidaturaPage (full rewrite).
 *
 * Single max-w-3xl glass card with 4 vertical sections (D-05):
 *   1. Resumo da vaga (read-only)
 *   2. Currículo upload (PDF, ≤5 MB — D-09 click-only)
 *   3. Perguntas de triagem (dynamic, grouped by `bloco` — D-11 / D-13 / D-14)
 *   4. Submit (atomic via Edge Function — D-12, B1 respostas_outros merge)
 *
 * Honors:
 *   - D-04: full rewrite of legacy 620 LoC raw-useState page
 *   - D-05: single page, no stepper, no confirmation modal
 *   - D-06: no draft persistence
 *   - D-09: click-only file picker (input type=file accept=application/pdf)
 *   - D-13: perguntas grouped by `bloco` with section header per group
 *   - D-14: vaga without perguntas renders only sections 1+2+4 (no warning)
 *   - D-15 / B1: dynamic Zod factory + permite_outros conditional + outros merge
 *   - Pitfall 2: `import { toast } from 'sonner'` (NEVER versioned)
 *   - Pitfall 7: ZERO console-method calls in this entire file (page-level rule)
 *
 * Error code routing (CV upload + EF submit):
 *   FILE_TOO_LARGE, INVALID_MIME, UPLOAD_FAILED, UNAUTHORIZED (CV)
 *   DUPLICATE_APPLICATION, INVALID_INPUT, NETWORK_ERROR, DATABASE_ERROR (EF)
 *
 * @module components/pages/FormularioCandidaturaPage
 */
import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Loader2,
  Upload,
  FileText,
  X,
  ArrowLeft,
  Send,
} from 'lucide-react'

import { BackgroundImage } from '../BackgroundImage'
import { CandidatoNavbar } from '../layouts/CandidatoNavbar'
import { GlassCard } from '../ui/glass'
import { useAuthStore } from '@/store/authStore'
import { useVagaBySlug, useHasApplied } from '@/features/vagas/hooks/useVagas'
import { useVagaPerguntas } from '@/features/vagas/hooks/useVagaPerguntas'
import {
  buildCandidaturaSchema,
  type CandidaturaFormData,
  type PerguntaFormulario,
} from '@/features/vagas/schemas/candidaturaFormSchema'
import {
  validateCV,
  uploadCV,
  removeCV,
  CVUploadServiceError,
  MAX_FILE_SIZE,
} from '@/features/vagas/services/cvUploadService'
import {
  submitCandidaturaWithRespostas,
  CandidaturasServiceError,
} from '@/features/vagas/services/candidaturasService'

// ---- helpers ---------------------------------------------------------------

const DEFAULT_BLOCO = 'Geral'

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * D-13 — group perguntas by `bloco`. Empty/whitespace bloco falls back to 'Geral'.
 * Insertion order is preserved by Map semantics, which matches the SQL
 * `ORDER BY ordem ASC` from useVagaPerguntas.
 */
function groupByBloco(
  perguntas: PerguntaFormulario[]
): Map<string, PerguntaFormulario[]> {
  const groups = new Map<string, PerguntaFormulario[]>()
  for (const p of perguntas) {
    const key = p.bloco && p.bloco.trim() ? p.bloco : DEFAULT_BLOCO
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  return groups
}

// ---- component -------------------------------------------------------------

export function FormularioCandidaturaPage() {
  const { vagaSlug } = useParams<{ vagaSlug: string }>()
  const navigate = useNavigate()
  const candidato = useAuthStore((state) => state.candidato)
  const user = useAuthStore((state) => state.user)
  // WR-02-09: logout now lives in the shared <CandidatoNavbar /> below.

  // Fetch vaga via slug (Plan 04-02 / 04-06)
  const {
    data: vagaData,
    isLoading: vagaLoading,
    error: vagaError,
  } = useVagaBySlug(vagaSlug ?? null)
  const vaga = vagaData?.success ? vagaData.data : null

  // Fetch screening perguntas (Plan 04-04)
  const { data: perguntas, isLoading: perguntasLoading } = useVagaPerguntas(
    vaga?.id ?? null
  )

  // Defense in depth — server-side UNIQUE is the actual gate; this just
  // saves the user from filling 60s of form before being rejected.
  // WR-03 (Phase 4 review fix): expose isSuccess so the redirect effect only
  // fires when the query has definitively settled — avoids a transient
  // undefined→false→true flap silently destroying in-flight form state.
  const { data: alreadyApplied, isSuccess: appliedQuerySettled } = useHasApplied(
    vaga?.id ?? null
  )

  // CV upload state (FSM-lite — RESEARCH §CV Upload State Machine)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvPath, setCvPath] = useState<string | null>(null)
  const [cvUploading, setCvUploading] = useState(false)

  // Build dynamic Zod schema; rebuilds only when perguntas reference changes.
  const schema = useMemo(
    () => buildCandidaturaSchema(perguntas ?? []),
    [perguntas]
  )

  const form = useForm<CandidaturaFormData>({
    resolver: zodResolver(schema) as Resolver<CandidaturaFormData>,
    mode: 'onBlur',
    defaultValues: {
      curriculo: undefined as unknown as CandidaturaFormData['curriculo'],
      respostas: {},
      respostas_outros: {},
    },
  })

  // Auth gate — owned by `<RoleGuard role="candidato">` in router/routes.tsx
  // (wraps this page). The login-redirect roundtrip with `?redirect=` slug
  // preservation is handled by VagaDetalhePage (anon-accessible, real entry
  // point). WR-07 (Phase 4 review iteration 2 fix): removed a redundant
  // auth-gate useEffect here — it overlapped with RoleGuard, never had its
  // ?redirect= target consumed (RoleGuard fires first), and could flap during
  // Zustand auth-store hydration (transient isAuthenticated=false bouncing
  // a logged-in candidate away from the formulário).

  // Already applied → bounce back to vaga detalhe (server-side UNIQUE is the gate)
  // WR-03 (Phase 4 review fix): only redirect after the query has definitively
  // settled with a `true` result. `useHasApplied` returns `boolean | undefined`
  // and may briefly flip undefined → false → true on a stale-while-revalidate
  // cache; gating on isSuccess prevents a redirect-by-surprise that destroys
  // any in-flight form input the candidate has already typed.
  useEffect(() => {
    if (appliedQuerySettled && alreadyApplied === true) {
      toast.info('Você já se candidatou a esta vaga', { duration: 4000 })
      navigate(`/vagas/${vagaSlug ?? ''}`, { replace: true })
    }
  }, [appliedQuerySettled, alreadyApplied, navigate, vagaSlug])

  // Sync RHF curriculo field whenever cvPath becomes available so isValid
  // reflects file presence and submit unblocks once the upload returns.
  useEffect(() => {
    if (cvFile && cvPath) {
      form.setValue(
        'curriculo',
        { path: cvPath, name: cvFile.name, size: cvFile.size },
        { shouldValidate: true }
      )
    }
  }, [cvFile, cvPath, form])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      validateCV(file)
      setCvFile(file)
      // cvPath is set on actual upload (just-in-time during onSubmit) — D-09
      // says no auto-upload-on-select. Picking only stages the File locally.
    } catch (err) {
      if (err instanceof CVUploadServiceError) {
        // Pitfall 7: do NOT log file.name; service-layer already logs
        // redacted shape ({ sizeKb, mime, hasFile }).
        if (err.code === 'FILE_TOO_LARGE') {
          toast.error('Currículo muito grande', {
            description: `Máximo permitido: ${MAX_FILE_SIZE / (1024 * 1024)} MB.`,
          })
        } else if (err.code === 'INVALID_MIME') {
          toast.error('Formato inválido', {
            description: 'Apenas arquivos PDF são aceitos.',
          })
        } else {
          toast.error('Não foi possível selecionar o arquivo')
        }
      }
      event.target.value = '' // reset picker so the same bad file can be re-selected after fix
    }
  }

  const handleRemoveCv = () => {
    setCvFile(null)
    setCvPath(null)
    form.setValue(
      'curriculo',
      undefined as unknown as CandidaturaFormData['curriculo'],
      { shouldValidate: true }
    )
  }

  const onSubmit = async (data: CandidaturaFormData) => {
    // Phase 4.1 (RESEARCH §Pattern 2 + §Pitfall 1): replace silent return
    // by explicit toast feedback. Distinguishes between session-not-yet-hydrated
    // (the actual bug) and missing CV (UX clarity).
    if (!candidato || !user) {
      toast.error('Sessão ainda carregando, tente novamente em instantes', {
        duration: 4000,
      })
      return
    }
    if (!cvFile) {
      toast.error('Anexe seu currículo antes de enviar', { duration: 4000 })
      return
    }
    if (!vaga) {
      toast.error('Vaga não encontrada. Atualize a página.', { duration: 4000 })
      return
    }

    let uploadedPath: string | null = cvPath
    try {
      // 1) Upload CV if not already uploaded (re-submit after transient error
      //    must not double-upload — uploadCV bills bandwidth + creates orphan
      //    objects in the curriculos bucket).
      let nameToUse = cvFile.name
      let sizeToUse = cvFile.size
      if (!uploadedPath) {
        setCvUploading(true)
        // W5 / D-10 amendment (see 04-01-SUMMARY.md + 04-03-SUMMARY.md):
        // the storage path key is `{auth.uid()}/{uuid}.pdf`, NOT the
        // candidato.id. The Edge Function (Plan 04-05 step 3b) re-validates
        // the same prefix server-side via `curriculo_url.startsWith(user.id)`,
        // so any client-side mismatch fails the submit gate.
        const result = await uploadCV(cvFile, user.id)
        uploadedPath = result.path
        nameToUse = result.name
        sizeToUse = result.size
        setCvPath(uploadedPath)
        setCvUploading(false)
      }

      // 2) Build respostas array from form data.
      //
      // B1 (RESEARCH Open Question 1 RESOLVED): when a pergunta has
      // `permite_outros: true` AND `data.respostas_outros[perguntaId]` is
      // non-empty, the merge pattern is:
      //   resposta_opcoes = [...selectedOptions, { outros: '<free text>' }]
      // The free text is concat'd into `resposta_opcoes` (jsonb) as the
      // FINAL element. NO schema split. NO separate column. The EF schema
      // (Plan 04-05) accepts the merged shape via `resposta_opcoes: z.unknown()`.
      const perguntasList = perguntas ?? []
      const respostas = Object.entries(data.respostas).map(
        ([perguntaId, value]) => {
          const p = perguntasList.find((x) => x.id === perguntaId)
          if (!p) {
            return {
              pergunta_id: perguntaId,
              resposta_texto: String(value ?? ''),
            }
          }

          if (p.tipo_resposta === 'numerico') {
            return {
              pergunta_id: perguntaId,
              resposta_numerica: Number(value),
            }
          }

          if (
            p.tipo_resposta === 'multiple_choice' ||
            p.tipo_resposta === 'single_choice'
          ) {
            // Normalize selected options to an array (single_choice arrives
            // as string from a radio group; multiple_choice as string[]).
            const selectedRaw = value as unknown
            const selected: unknown[] = Array.isArray(selectedRaw)
              ? selectedRaw
              : selectedRaw != null && selectedRaw !== ''
                ? [selectedRaw]
                : []

            // B1: merge respostas_outros free text into resposta_opcoes when
            // permite_outros is on. Final element shape: { outros: '<text>' }.
            const outrosRaw = data.respostas_outros?.[perguntaId]
            const outrosText =
              typeof outrosRaw === 'string' ? outrosRaw.trim() : ''
            const mergedOpcoes =
              p.permite_outros && outrosText.length > 0
                ? [...selected, { outros: outrosText }]
                : selected

            return {
              pergunta_id: perguntaId,
              resposta_opcoes: mergedOpcoes,
            }
          }

          // texto_curto / texto_longo
          return {
            pergunta_id: perguntaId,
            resposta_texto: String(value ?? ''),
          }
        }
      )

      // 3) Atomic submit via Edge Function (Plan 04-05).
      await submitCandidaturaWithRespostas({
        candidato_id: candidato.id,
        vaga_id: vaga.id,
        curriculo_url: uploadedPath,
        curriculo_nome: nameToUse,
        curriculo_size: sizeToUse,
        respostas,
      })

      toast.success('Candidatura enviada com sucesso!', { duration: 4000 })
      navigate('/candidato/perfil', { replace: true })
    } catch (err) {
      setCvUploading(false)

      // WR-01 (Phase 4 review fix) — orphan-cleanup must run for ANY post-upload
      // failure, not just CandidaturasServiceError. CVUploadServiceError implies
      // the upload itself failed (uploadedPath stays null and removeCV is a
      // no-op via its falsy guard). Any other error class — TypeError from a
      // malformed EF response, AbortError on a torn-down fetch, SDK invariant
      // violations — would otherwise fall through to the generic toast below
      // and leak the freshly-uploaded {auth.uid()}/{uuid}.pdf in the bucket.
      if (uploadedPath && !(err instanceof CVUploadServiceError)) {
        // Fire-and-forget; failure to clean up is non-blocking and the
        // service layer logs the redacted shape internally.
        void removeCV(uploadedPath).catch(() => undefined)
        setCvPath(null)
      }

      // CV upload errors (validateCV / uploadCV in step 1)
      if (err instanceof CVUploadServiceError) {
        switch (err.code) {
          case 'FILE_TOO_LARGE':
            toast.error('Currículo muito grande', {
              description: `Máximo: ${MAX_FILE_SIZE / (1024 * 1024)} MB.`,
            })
            break
          case 'INVALID_MIME':
            toast.error('Formato inválido', {
              description: 'Apenas PDF.',
            })
            break
          case 'UNAUTHORIZED':
            toast.error('Sessão expirada', {
              description: 'Faça login novamente.',
            })
            navigate(
              `/auth/login?redirect=${encodeURIComponent(
                `/candidato/candidatura/formulario/${vagaSlug ?? ''}`
              )}`,
              { replace: true }
            )
            break
          case 'STORAGE_QUOTA':
            toast.error('Limite de armazenamento atingido', {
              description: 'Tente novamente em alguns instantes.',
            })
            break
          case 'UPLOAD_FAILED':
          case 'NETWORK_ERROR':
          default:
            toast.error('Falha ao enviar currículo', {
              description: 'Tente novamente em instantes.',
              action: {
                label: 'Tentar novamente',
                onClick: () => void form.handleSubmit(onSubmit)(),
              },
            })
        }
        return
      }

      // EF submit errors (step 3) — orphan cleanup already ran above (WR-01).
      if (err instanceof CandidaturasServiceError) {
        switch (err.code) {
          case 'DUPLICATE_APPLICATION':
            toast.error('Você já se candidatou a esta vaga')
            navigate(`/vagas/${vagaSlug ?? ''}`, { replace: true })
            break
          case 'INVALID_INPUT':
            toast.error('Dados inválidos', { description: err.message })
            break
          case 'UNAUTHORIZED':
            toast.error('Sessão inválida', {
              description: 'Faça login novamente.',
            })
            navigate(
              `/auth/login?redirect=${encodeURIComponent(
                `/candidato/candidatura/formulario/${vagaSlug ?? ''}`
              )}`,
              { replace: true }
            )
            break
          case 'NETWORK_ERROR':
            toast.error('Erro de conexão', {
              description: 'Verifique sua internet e tente novamente.',
              action: {
                label: 'Tentar novamente',
                onClick: () => void form.handleSubmit(onSubmit)(),
              },
            })
            break
          case 'NOT_FOUND':
          case 'WEBHOOK_ERROR':
          case 'DATABASE_ERROR':
          default:
            toast.error('Algo deu errado', {
              description: 'Tente novamente em alguns instantes.',
              action: {
                label: 'Tentar novamente',
                onClick: () => void form.handleSubmit(onSubmit)(),
              },
            })
        }
        return
      }

      toast.error('Erro inesperado. Tente novamente.')
    }
  }

  // ---- render --------------------------------------------------------------

  if (vagaLoading || perguntasLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (vagaError || !vaga) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Vaga não encontrada</h1>
          <button
            type="button"
            onClick={() => navigate('/vagas')}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-white font-semibold hover:bg-primary/90"
          >
            Voltar para vagas
          </button>
        </div>
      </div>
    )
  }

  const perguntasList = perguntas ?? []
  const hasPerguntas = perguntasList.length > 0
  const grouped = hasPerguntas
    ? groupByBloco(perguntasList)
    : new Map<string, PerguntaFormulario[]>()


  return (
    <BackgroundImage
      background="gradient"
      className="min-h-screen py-20"
      overlayColor="bg-black"
      overlayOpacity={15}
    >
      {/* WR-02-09: shared persona navbar (self-guards on candidato role). */}
      <CandidatoNavbar />

      {/* Content (single-page form, max-w-3xl per D-04) */}
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        {/* Voltar para a vaga — over BackgroundImage, not inside a card */}
        <button
          type="button"
          onClick={() => navigate(`/vagas/${vagaSlug ?? ''}`)}
          className="inline-flex items-center text-white/80 hover:text-white drop-shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para a vaga
        </button>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
          aria-label="Formulário de candidatura"
          noValidate
        >
          {/* Section 1: Resumo da vaga (read-only) */}
          <GlassCard variant="white" className="rounded-xl">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {vaga.titulo}
            </h1>
            {vaga.descricao_curta && (
              <p className="text-gray-700">{vaga.descricao_curta}</p>
            )}
            {vaga.tipo_contrato && (
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {vaga.tipo_contrato}
              </span>
            )}
          </GlassCard>

          {/* Section 2: Currículo upload (D-09 click-only) */}
          <GlassCard variant="white" className="rounded-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Currículo
            </h2>
            {!cvFile ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Selecionar currículo PDF"
                />
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Selecionar arquivo PDF (máx. 5 MB)
                </span>
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 min-w-0">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {cvFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(cvFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCv}
                  className="text-gray-500 hover:text-red-600 p-1 flex-shrink-0"
                  aria-label="Remover currículo"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </GlassCard>

          {/* Section 3: Perguntas (D-14: hidden when no perguntas) */}
          {hasPerguntas && (
            <GlassCard variant="white" className="rounded-xl space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Perguntas de triagem
              </h2>
              {Array.from(grouped.entries()).map(([bloco, blocoPerguntas]) => (
                <div key={bloco} className="space-y-4">
                  <h3 className="text-md font-semibold text-gray-800 border-b border-gray-200 pb-1">
                    {bloco}
                  </h3>
                  {blocoPerguntas.map((p) => (
                    <PerguntaInput key={p.id} pergunta={p} form={form} />
                  ))}
                </div>
              ))}
            </GlassCard>
          )}

          {/* Section 4: Submit */}
          <GlassCard variant="white" className="rounded-xl">
            <button
              type="submit"
              disabled={!candidato || !cvFile || cvUploading || form.formState.isSubmitting}
              className="w-full inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-white font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cvUploading || form.formState.isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Enviar candidatura
                </>
              )}
            </button>
          </GlassCard>
        </form>
      </div>
    </BackgroundImage>
  )
}

// ---- inline PerguntaInput component ---------------------------------------
//
// Inlined in the same file (vs. extracting to a sibling component per
// PATTERNS L257) so the rewrite is a single atomic commit per D-04. Future
// extraction is trivial — the component has no state of its own.

interface PerguntaInputProps {
  pergunta: PerguntaFormulario
  form: UseFormReturn<CandidaturaFormData>
}

function PerguntaInput({ pergunta: p, form }: PerguntaInputProps) {
  const fieldName = `respostas.${p.id}` as const
  const error = form.formState.errors.respostas?.[p.id]
  const errorMessage = (error as { message?: string } | undefined)?.message

  const labelEl = (
    <label
      htmlFor={p.id}
      className="block text-sm font-semibold text-gray-900 mb-1"
    >
      {p.texto_pergunta}
      {p.obrigatoria && <span className="text-red-600 ml-1">*</span>}
    </label>
  )
  const helpText = p.texto_ajuda ? (
    <p className="text-xs text-gray-500 mt-1">{p.texto_ajuda}</p>
  ) : null
  const errorEl = errorMessage ? (
    <p className="text-xs text-red-600 mt-1" role="alert">
      {errorMessage}
    </p>
  ) : null

  switch (p.tipo_resposta) {
    case 'texto_curto':
      return (
        <div>
          {labelEl}
          <input
            id={p.id}
            type="text"
            {...form.register(fieldName)}
            maxLength={p.limite_caracteres ?? undefined}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          {helpText}
          {errorEl}
        </div>
      )
    case 'texto_longo':
      return (
        <div>
          {labelEl}
          <textarea
            id={p.id}
            {...form.register(fieldName)}
            maxLength={p.limite_caracteres ?? undefined}
            rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          {helpText}
          {errorEl}
        </div>
      )
    case 'numerico':
      return (
        <div>
          {labelEl}
          <input
            id={p.id}
            type="number"
            {...form.register(fieldName)}
            min={p.valor_minimo ?? undefined}
            max={p.valor_maximo ?? undefined}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          {helpText}
          {errorEl}
        </div>
      )
    case 'single_choice': {
      const opts = (p.opcoes_resposta as string[] | null) ?? []
      return (
        <div>
          {labelEl}
          <div className="space-y-2">
            {opts.map((opt) => (
              <label
                key={opt}
                className="flex items-center space-x-2 text-sm cursor-pointer"
              >
                <input
                  type="radio"
                  value={opt}
                  {...form.register(fieldName)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {p.permite_outros && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Outro (especifique)"
                {...form.register(`respostas_outros.${p.id}` as const)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          )}
          {helpText}
          {errorEl}
        </div>
      )
    }
    case 'multiple_choice': {
      const opts = (p.opcoes_resposta as string[] | null) ?? []
      return (
        <div>
          {labelEl}
          <div className="space-y-2">
            {opts.map((opt) => (
              <label
                key={opt}
                className="flex items-center space-x-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={opt}
                  {...form.register(fieldName)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {p.permite_outros && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Outro (especifique)"
                {...form.register(`respostas_outros.${p.id}` as const)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          )}
          {helpText}
          {errorEl}
        </div>
      )
    }
    default:
      return null
  }
}

export default FormularioCandidaturaPage
