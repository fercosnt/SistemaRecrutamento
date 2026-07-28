/**
 * Página de Triagem de Candidatos por Vaga (RH) — TRIAGEM-02
 *
 * Painel denso (tabela) de candidaturas pré-ranqueadas por score IA. Substitui a
 * lista de glass-cards anterior pela `TriagemTable`, mantendo o shell RHLayout/glass,
 * o header e a barra de filtros. Leitura via `useTriagemPanel` (projeção allowlist —
 * sem PII). Reprocessar análise via RPC `reprocessar_analise`. Comparativo (2-10)
 * coleta ids; a tela + PDF chegam no Plan 10-06.
 *
 * @module components/pages/VagaCandidatosRHPage
 */

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { RHLayout } from '../RHLayout'
import { Glass, GlassButton } from '../ui/glass'
import {
  ArrowLeft,
  Search,
  MapPin,
  Calendar,
  XCircle,
  Clock,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination'
import { useTriagemPanel } from '@/features/triagem/hooks/useTriagemPanel'
import {
  reprocessarAnalise,
  ETAPA_M2_OPTIONS,
  type EtapaFunilM2,
} from '@/features/triagem/services/triagemService'
import {
  TriagemTable,
  type TriagemTableRow,
} from '@/features/triagem/components/TriagemTable'
import { useVaga } from '@/features/vagas/hooks/useVagas'
import type { StatusCandidatura } from '@/features/vagas/types/vagasTypes'

const STATUS_OPTIONS: { value: StatusCandidatura; label: string }[] = [
  { value: 'aguardando_resposta', label: 'Aguardando Resposta' },
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'aprovado_proxima', label: 'Aprovado' },
  { value: 'rejeitado', label: 'Rejeitado' },
  { value: 'finalizado', label: 'Finalizado' },
]

const PAGE_LIMIT = 20

/**
 * Painel de triagem de candidatos de uma vaga específica.
 */
export function VagaCandidatosRHPage() {
  const { id: vagaId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Filtros + paginação + seleção
  const [statusFiltro, setStatusFiltro] = useState<StatusCandidatura | 'todos'>('todos')
  const [etapaFiltro, setEtapaFiltro] = useState<EtapaFunilM2 | 'todas'>('todas')
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { data: vaga, isLoading: isLoadingVaga } = useVaga(vagaId)

  const filters = {
    status: statusFiltro !== 'todos' ? statusFiltro : null,
    etapa: etapaFiltro !== 'todas' ? etapaFiltro : null,
    nome: busca || null,
  }

  const {
    data: panel,
    isLoading: isLoadingPanel,
    error: errorPanel,
  } = useTriagemPanel(vagaId, filters, 'score_desc', { page, limit: PAGE_LIMIT })

  const rows = (panel?.data ?? []) as unknown as TriagemTableRow[]
  const total = panel?.pagination.total ?? 0
  const totalPages = panel?.pagination.totalPages ?? 1

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleReprocess = async (candidaturaId: string) => {
    try {
      await reprocessarAnalise(candidaturaId)
      toast.success('Análise reprocessada. O resultado será atualizado em instantes.')
    } catch {
      toast.error('Não foi possível reprocessar a análise. Tente novamente.')
    }
  }

  const handleCompare = (ids: string[]) => {
    // Navega para a tela de comparativo (10-06) carregando ids + nomes na ordem de
    // score DESC (a EF anonimiza C1/C2… nessa ordem). O painel sabe o nome; a EF não.
    const ordered = rows.filter((r) => ids.includes(r.id))
    const candidatos = ordered.map((r) => ({
      id: r.id,
      nome: r.candidato?.nome_completo ?? 'Candidato',
    }))
    navigate(`/rh/vagas/${vagaId}/comparativo`, {
      state: { ids: candidatos.map((c) => c.id), candidatos },
    })
  }

  // Loading
  if (isLoadingVaga || isLoadingPanel) {
    return (
      <RHLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white drop-shadow-lg">Carregando candidaturas…</p>
          </div>
        </div>
      </RHLayout>
    )
  }

  // Erro
  if (errorPanel || !vaga?.data) {
    return (
      <RHLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Glass variant="white" blur="lg" className="p-8 rounded-xl max-w-md text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4 drop-shadow-lg" />
            <h2 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
              Erro ao carregar candidaturas
            </h2>
            <p className="text-white/80 drop-shadow-sm mb-6">
              {errorPanel?.message || 'Vaga não encontrada'}
            </p>
            <GlassButton
              variant="secondary"
              onClick={() => navigate('/rh/vagas')}
              className="text-white flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para Vagas</span>
            </GlassButton>
          </Glass>
        </div>
      </RHLayout>
    )
  }

  const vagaData = vaga.data
  const filtersActive = statusFiltro !== 'todos' || etapaFiltro !== 'todas' || !!busca

  return (
    <RHLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <Glass variant="white" blur="lg" className="p-6 rounded-xl">
          <GlassButton
            variant="white"
            onClick={() => navigate('/rh/vagas')}
            className="mb-6 text-white flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Vagas</span>
          </GlassButton>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white drop-shadow-lg mb-4">
                {vagaData.titulo}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/80 drop-shadow-sm">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {vagaData.localizacao}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {vagaData.departamento}
                </span>
                <Badge
                  className={
                    vagaData.status === 'ativa'
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  }
                >
                  {vagaData.status === 'ativa' ? '🟢 Ativa' : '⚪ Inativa'}
                </Badge>
              </div>
            </div>

            <Glass variant="white" blur="sm" className="p-6 rounded-xl min-w-[140px]">
              <div className="text-center">
                <div className="text-4xl font-bold text-white drop-shadow-lg mb-1">
                  {total}
                </div>
                <div className="text-sm text-white/70 drop-shadow-sm">Candidaturas</div>
              </div>
            </Glass>
          </div>
        </Glass>

        {/* Filtros e Busca */}
        <Glass variant="white" blur="lg" className="p-6 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Busca */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                <Input
                  type="search"
                  placeholder="Buscar por nome…"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value)
                    setPage(1)
                  }}
                  className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 transition-all duration-200"
                />
              </div>
            </div>

            {/* Filtro de Etapa */}
            <Select
              value={etapaFiltro}
              onValueChange={(value) => {
                setEtapaFiltro(value as EtapaFunilM2 | 'todas')
                setPage(1)
              }}
            >
              <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filtrar por etapa" />
              </SelectTrigger>
              <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                <SelectItem value="todas" className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer">
                  Todas as etapas
                </SelectItem>
                {ETAPA_M2_OPTIONS.map(({ value, label }) => (
                  <SelectItem
                    key={value}
                    value={value}
                    className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer"
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de Status */}
            <Select
              value={statusFiltro}
              onValueChange={(value) => {
                setStatusFiltro(value as StatusCandidatura | 'todos')
                setPage(1)
              }}
            >
              <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                <SelectItem value="todos" className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer">
                  Todos os status
                </SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Glass>

        {/* Painel de Triagem (tabela densa) */}
        {rows.length === 0 ? (
          <Glass variant="white" blur="lg" className="p-12 rounded-xl text-center">
            <Clock className="h-16 w-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
              Nenhuma candidatura encontrada
            </h3>
            <p className="text-white/70 drop-shadow-sm">
              {filtersActive
                ? 'Nenhuma candidatura corresponde aos filtros. Ajuste a busca, etapa ou status.'
                : 'Esta vaga ainda não recebeu candidaturas.'}
            </p>
          </Glass>
        ) : (
          <Glass variant="white" blur="lg" className="p-6 rounded-xl space-y-4">
            <TriagemTable
              rows={rows}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onCompare={handleCompare}
              onReprocess={handleReprocess}
            />

            {/* Paginação server-side 20/página */}
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => Math.max(1, p - 1))
                      }}
                      className={page <= 1 ? 'pointer-events-none opacity-40 text-white' : 'text-white'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault()
                          setPage(p)
                        }}
                        className="text-white"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => Math.min(totalPages, p + 1))
                      }}
                      className={page >= totalPages ? 'pointer-events-none opacity-40 text-white' : 'text-white'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </Glass>
        )}
      </div>
    </RHLayout>
  )
}
