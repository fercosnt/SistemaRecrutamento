/**
 * FilaTrabalhoTab — the cross-vaga work queue (KPI-01/03).
 *
 * The 4th tab of `CandidatosRHPage`, COEXISTING with the per-vaga Kanban (KPI-01 explicit).
 * Reads `v_fila_trabalho` via `useFilaTrabalho` (allowlist, oldest-waiting first — "o que
 * precisa da minha ação agora"), renders the glass Table shell (matches `TriagemTable`),
 * and flags aging / SLA-breach per row via `SlaBadge`. Every row links to
 * `/rh/candidatos/:candidaturaId` (the `:id` route param IS the candidatura id — Pitfall 1).
 *
 * Loading / empty / error resolve through the shared `AsyncState` contract with the
 * verbatim UI-SPEC copy (§Copywriting §Fila). The queue read inherits the vaga-scoped RLS
 * of the security_invoker view — this component adds NO re-scope and never `select('*')`.
 *
 * @module features/funil/components/FilaTrabalhoTab
 * @see src/features/triagem/components/TriagemTable.tsx (glass Table shell + header styling matched)
 * @see .planning/phases/34-.../34-UI-SPEC.md (§Surface 3 — columns, SLA badge, states, row link)
 */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AsyncState } from '@/components/ui/AsyncState'
import { ETAPA_M2_LABELS } from '@/features/triagem/services/triagemService'
import { useFilaTrabalho } from '../hooks/useFilaTrabalho'
import { diasNaEtapa } from '../constants/slaThresholds'
import { SlaBadge } from './SlaBadge'

/** Verbatim UI-SPEC copy (§Copywriting §Fila) — single source, no drift. */
const FILA_COPY = {
  empty: {
    heading: 'Nenhum candidato aguardando ação',
    body: 'Quando houver candidatos parados em uma etapa, eles aparecerão aqui priorizados por tempo de espera.',
  },
  error: {
    heading: 'Não foi possível carregar a fila.',
    generic: 'Verifique sua conexão e tente novamente.',
  },
} as const

export function FilaTrabalhoTab() {
  const { data, isLoading, isError, refetch, isRefetching } = useFilaTrabalho()
  const rows = data ?? []

  return (
    <AsyncState
      isLoading={isLoading}
      isError={isError}
      isEmpty={rows.length === 0}
      onRetry={() => void refetch()}
      retrying={isRefetching}
      copy={{
        empty: { heading: FILA_COPY.empty.heading, body: FILA_COPY.empty.body },
        error: { heading: FILA_COPY.error.heading, generic: FILA_COPY.error.generic },
      }}
    >
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 bg-white/10 hover:bg-white/10">
              <TableHead className="text-white/80">Candidato</TableHead>
              <TableHead className="text-white/80">Vaga</TableHead>
              <TableHead className="text-white/80">Etapa</TableHead>
              <TableHead className="text-white/80">Tempo na etapa</TableHead>
              <TableHead className="text-white/80">SLA</TableHead>
              <TableHead className="text-right text-white/80">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.candidatura_id} className="border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">
                  {row.candidato_nome ?? '—'}
                </TableCell>
                <TableCell className="text-white/80">{row.vaga_titulo ?? '—'}</TableCell>
                <TableCell className="text-white/80">
                  {ETAPA_M2_LABELS[row.etapa_atual] ?? row.etapa_atual}
                </TableCell>
                <TableCell className="text-white/80">
                  {diasNaEtapa(row.entrou_etapa_em)} dias
                </TableCell>
                <TableCell>
                  <SlaBadge etapa={row.etapa_atual} entrouEtapaEm={row.entrou_etapa_em} />
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    to={`/rh/candidatos/${row.candidatura_id}`}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-3 text-sm font-medium text-accent transition-colors hover:bg-white/10"
                  >
                    Abrir
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AsyncState>
  )
}
