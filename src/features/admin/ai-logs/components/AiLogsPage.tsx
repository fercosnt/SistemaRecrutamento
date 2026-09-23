/**
 * /admin/ai-logs — tabela read-only filtrável de ai_call_logs + modal de detalhe.
 *
 * Gated por RoleGuard role="administrador" (rota). Lê via aiLogsService com
 * allowlist explícito (sem select('*')). Empty state é o estado default no ship
 * (consumidores de IA chegam na Fase 10+). Copy verbatim do UI-SPEC §Copywriting.
 *
 * ─── Phase 49 / plano 49-15 — o terceiro estado (D-27c / JORN-28) ────────────────────
 *
 * A coluna Status tinha DOIS estados, `success ? 'Sucesso' : 'Falha'`. Medido em PROD em
 * 2026-09-23 (só leitura): de 55 linhas de `ai_call_logs`, **17 têm `success = true` com
 * `error_code = 'anthropic_retries_exhausted'`** — o modelo configurado não respondeu e o
 * resultado veio do de contingência. As 17 apareciam verdes, indistinguíveis das 38
 * legítimas, e a coluna Modelo mostrava o modelo CONFIGURADO, que não foi quem respondeu.
 * Agora há «Fallback» (âmbar) com a causa legível, e a coluna Modelo mostra o modelo real.
 *
 * O predicado do estado está em `estadoDaChamada` — leia o docblock dele antes de mexer:
 * ele NÃO é o prefixo `fallback_`, de propósito.
 *
 * @module features/admin/ai-logs/components/AiLogsPage
 * @see supabase/functions/_shared/ai-error-codes.ts (o prefixo e as causas — fonte única)
 * @see src/features/triagem/components/ProvenienciaIABadge.tsx (o mesmo âmbar, no lado do RH)
 */

import { useMemo, useState } from 'react'
import { RHLayout } from '../../../../components/RHLayout'
import { GlassCard } from '../../../../components/ui/glass'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Skeleton } from '../../../../components/ui/skeleton'
import { ScrollArea } from '../../../../components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '../../../../components/ui/pagination'
import { useAiLogs, useAiLogDetail } from '../hooks/useAiLogs'
import type { AiLogListRow, AiLogsFilters } from '../services/aiLogsService'
// ⚠ Caminho RELATIVO para `_shared`, de propósito: a tabela de causas legíveis e o
// predicado de fallback têm UMA fonte, e é a mesma que a Edge Function escreve. O módulo tem
// contrato de ZERO IMPORTS justamente para poder ser importado daqui. Precedentes vivos:
// `ProvenienciaIABadge.tsx:52`, `exportacaoService.ts:61`, `AutorizacoesStep.tsx:50`.
import {
  CAUSA_FALLBACK_ROTULO,
  causaDoFallback,
  ehFallback,
} from '../../../../../supabase/functions/_shared/ai-error-codes'

const PAGE_SIZE = 50

const CALL_TYPE_LABELS: Record<string, string> = {
  cv_summary: 'Resumo de currículo',
  cv_job_match: 'Aderência à vaga',
  comparative_ranking: 'Ranking comparativo',
  interview_guide: 'Roteiro de entrevista',
  transcript_analysis: 'Análise de transcrição',
  culture_fit_essay: 'Fit cultural',
  work_sample_sjt: 'Amostra de trabalho',
}

const CALL_TYPE_OPTIONS = Object.keys(CALL_TYPE_LABELS)

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

function formatBRL(usd: number | null): string {
  if (usd == null) return '—'
  return `US$ ${usd.toFixed(4)}`
}

/** Os três estados honestos de uma chamada de IA (D-27c). */
type EstadoChamada = 'sucesso' | 'falha' | 'fallback'

/**
 * Qual dos três estados esta linha é.
 *
 * ⚠ **`success = true` COM `error_code` é um FALLBACK**, e o predicado é esse — não o prefixo
 * `fallback_`. O prefixo é a codificação que o plano 49-02 instalou; as 17 linhas vivas de
 * `ai_call_logs` que estão nesse estado são ANTERIORES a ele e carregam o código CRU
 * (`anthropic_retries_exhausted`). Um discriminante escrito só sobre `ehFallback()` deixaria
 * exatamente essas 17 linhas verdes — as MESMAS que motivaram este conserto. É a lição do
 * CLAUDE.md §«Portões: varra pela FORMA, não pelo sintoma» aplicada ao discriminante: a forma
 * («há código de erro numa chamada que deu certo») vigia a linha nova e a antiga; a lista de
 * prefixos conhecidos vigiaria só metade.
 *
 * `ehFallback` continua sendo consultado porque é ele que decide se o código tem prefixo a
 * remover antes de virar causa legível.
 */
export function estadoDaChamada(row: {
  success: boolean
  error_code: string | null
}): EstadoChamada {
  if (!row.success) return 'falha'
  return row.error_code ? 'fallback' : 'sucesso'
}

/**
 * Causa legível do `error_code`, em pt-BR — «não coube», «demorou», «fora do schema», …
 *
 * Degrada para o próprio código quando a causa não está na tabela: um código desconhecido na
 * tela é pior que feio, mas é MUITO melhor que uma célula vazia, que se lê como «sem causa».
 */
function causaLegivel(errorCode: string | null): string | null {
  if (!errorCode) return null
  const causa = ehFallback(errorCode) ? causaDoFallback(errorCode) : errorCode
  if (!causa) return null
  return (CAUSA_FALLBACK_ROTULO as Record<string, string>)[causa] ?? causa
}

/** O selo de estado + a causa legível ao lado, quando houver. */
function StatusCell({ row }: { row: AiLogListRow }) {
  const estado = estadoDaChamada(row)
  const causa = causaLegivel(row.error_code)

  return (
    <span className="flex flex-wrap items-center gap-2">
      {estado === 'fallback' ? (
        <Badge
          data-testid="ai-log-fallback"
          // Âmbar, não vermelho: o resultado é utilizável. O que o selo diz é que ele NÃO
          // veio do modelo configurado — mesma cor do selo de proveniência do RH.
          className="border-amber-400/50 bg-amber-400/15 text-amber-100"
        >
          Fallback
        </Badge>
      ) : (
        <Badge variant={estado === 'sucesso' ? 'default' : 'destructive'}>
          {estado === 'sucesso' ? 'Sucesso' : 'Falha'}
        </Badge>
      )}
      {causa ? <span className="text-sm text-white/60">{causa}</span> : null}
    </span>
  )
}

export function AiLogsPage() {
  const [filters, setFilters] = useState<AiLogsFilters>({})
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useAiLogs(filters, {
    page,
    limit: PAGE_SIZE,
  })
  const { data: detail, isLoading: detailLoading } = useAiLogDetail(selectedId)

  const rows = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v != null && v !== ''),
    [filters]
  )

  function patchFilter<K extends keyof AiLogsFilters>(key: K, value: AiLogsFilters[K] | undefined) {
    setPage(1)
    setFilters((prev) => {
      const next = { ...prev }
      if (value == null || value === '') delete next[key]
      else next[key] = value
      return next
    })
  }

  function clearFilters() {
    setPage(1)
    setFilters({})
  }

  return (
    <RHLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-[28px] font-semibold leading-tight text-white">Logs de IA</h1>
        </header>

        {/* Filtros */}
        <GlassCard className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-base text-white/80">Candidato</label>
              <input
                value={filters.candidato_id ?? ''}
                onChange={(e) => patchFilter('candidato_id', e.target.value || undefined)}
                placeholder="ID do candidato"
                className="h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 text-base text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base text-white/80">Vaga</label>
              <input
                value={filters.vaga_id ?? ''}
                onChange={(e) => patchFilter('vaga_id', e.target.value || undefined)}
                placeholder="ID da vaga"
                className="h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 text-base text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base text-white/80">Tipo de chamada</label>
              <Select
                value={filters.call_type ?? 'all'}
                onValueChange={(v: string) =>
                  patchFilter('call_type', v === 'all' ? undefined : (v as AiLogsFilters['call_type']))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {CALL_TYPE_OPTIONS.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {CALL_TYPE_LABELS[ct]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-base text-white/80">Status</label>
              <Select
                value={filters.status ?? 'all'}
                onValueChange={(v: string) =>
                  patchFilter('status', v === 'all' ? undefined : (v as AiLogsFilters['status']))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sucesso">Sucesso</SelectItem>
                  <SelectItem value="falha">Falha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              className="bg-white/10 text-white hover:bg-white/20"
            >
              Limpar filtros
            </Button>
          )}
        </GlassCard>

        {/* Tabela */}
        <GlassCard>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-base text-white/80">
                Não foi possível carregar os dados. Verifique sua conexão e tente novamente.
              </p>
              <Button onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <h2 className="text-xl font-semibold text-white">
                Nenhuma chamada de IA registrada ainda
              </h2>
              <p className="max-w-2xl text-base text-white/70">
                As Edge Functions de IA do funil começam a registrar chamadas a partir da Fase 10.
                Quando houver dados, eles aparecerão aqui com filtro por candidato, vaga e tipo de
                chamada.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Latência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="whitespace-nowrap">{formatDate(row.created_at)}</TableCell>
                      <TableCell className="font-mono text-sm">{row.candidato_id ?? '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{row.vaga_id ?? '—'}</TableCell>
                      <TableCell>{CALL_TYPE_LABELS[row.call_type] ?? row.call_type}</TableCell>
                      <TableCell>{row.provider}</TableCell>
                      {/* O modelo que DE FATO respondeu; `model_id` (o configurado) é só a
                          reserva. Num fallback os dois divergem, e mostrar o configurado é
                          uma afirmação falsa sobre quem produziu aquele resultado. */}
                      <TableCell className="font-mono text-sm">
                        {row.model_snapshot ?? row.model_id}
                      </TableCell>
                      <TableCell>
                        <StatusCell row={row} />
                      </TableCell>
                      <TableCell>{row.parsed_score ?? '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{formatBRL(row.cost_usd)}</TableCell>
                      <TableCell>{row.latency_ms} ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="bg-white/10 text-white hover:bg-white/20"
                      >
                        Anterior
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <span className="px-3 text-base text-white/80">
                        Página {page} de {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="bg-white/10 text-white hover:bg-white/20"
                      >
                        Próxima
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </GlassCard>
      </div>

      {/* Modal de detalhe */}
      <Dialog open={!!selectedId} onOpenChange={(open: boolean) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhe da chamada de IA</DialogTitle>
            <DialogDescription>
              Reasoning e resposta bruta retornados pelo provedor.
            </DialogDescription>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <section className="space-y-1">
                <h3 className="text-base font-semibold">Reasoning</h3>
                <ScrollArea className="h-32 rounded-md border p-3">
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {detail.parsed_reasoning ?? '— sem reasoning —'}
                  </pre>
                </ScrollArea>
              </section>
              <section className="space-y-1">
                <h3 className="text-base font-semibold">Resposta bruta</h3>
                <ScrollArea className="h-56 rounded-md border p-3">
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {JSON.stringify(detail.raw_response, null, 2)}
                  </pre>
                </ScrollArea>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </RHLayout>
  )
}
