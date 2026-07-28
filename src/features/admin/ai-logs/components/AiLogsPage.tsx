/**
 * /admin/ai-logs — tabela read-only filtrável de ai_call_logs + modal de detalhe.
 *
 * Gated por RoleGuard role="administrador" (rota). Lê via aiLogsService com
 * allowlist explícito (sem select('*')). Empty state é o estado default no ship
 * (consumidores de IA chegam na Fase 10+). Copy verbatim do UI-SPEC §Copywriting.
 *
 * @module features/admin/ai-logs/components/AiLogsPage
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
import type { AiLogsFilters } from '../services/aiLogsService'

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
                      <TableCell className="font-mono text-sm">{row.model_id}</TableCell>
                      <TableCell>
                        <Badge variant={row.success ? 'default' : 'destructive'}>
                          {row.success ? 'Sucesso' : 'Falha'}
                        </Badge>
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
