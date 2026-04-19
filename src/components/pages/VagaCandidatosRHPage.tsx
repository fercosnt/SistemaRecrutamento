/**
 * Página de Gestão de Candidatos por Vaga (HR)
 *
 * Features:
 * - Lista candidaturas de uma vaga específica
 * - Filtros por status e etapa
 * - Ações de mudança de status individual
 * - Visualização de perfil do candidato
 *
 * @module components/pages/VagaCandidatosRHPage
 */

import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { RHLayout } from '../RHLayout'
import { Glass, GlassButton } from '../ui/glass'
import {
  ArrowLeft,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { useVagaCandidaturas } from '@/features/vagas/hooks/useCandidaturas'
import { useVaga } from '@/features/vagas/hooks/useVagas'
import type { StatusCandidatura, EtapaProcesso } from '@/features/vagas/types/vagasTypes'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { UpdateStatusModal } from '../modals/UpdateStatusModal'

/**
 * Mapeamento de cores por status
 */
const STATUS_COLORS: Record<StatusCandidatura, string> = {
  aguardando_resposta: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  em_analise: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  aprovado_proxima: 'bg-green-500/20 text-green-700 border-green-500/30',
  rejeitado: 'bg-red-500/20 text-red-700 border-red-500/30',
  finalizado: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
  desistente: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
}

/**
 * Labels de status em português
 */
const STATUS_LABELS: Record<StatusCandidatura, string> = {
  aguardando_resposta: 'Aguardando Resposta',
  em_analise: 'Em Análise',
  aprovado_proxima: 'Aprovado',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
  desistente: 'Desistente',
}

/**
 * Página de gestão de candidatos de uma vaga específica
 */
export function VagaCandidatosRHPage() {
  const { id: vagaId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Estados locais
  const [statusFiltro, setStatusFiltro] = useState<StatusCandidatura | 'todos'>('todos')
  const [busca, setBusca] = useState('')
  const [selectedCandidatura, setSelectedCandidatura] = useState<{
    id: string
    candidatoNome: string
    statusAtual: StatusCandidatura
  } | null>(null)

  // Queries
  const { data: vaga, isLoading: isLoadingVaga } = useVaga(vagaId)
  const {
    data: candidaturasData,
    isLoading: isLoadingCandidaturas,
    error: errorCandidaturas,
  } = useVagaCandidaturas(
    vagaId,
    statusFiltro !== 'todos' ? { status: statusFiltro } : undefined
  )

  const candidaturas = candidaturasData?.data || []

  // Filtrar por busca (nome ou email)
  const candidaturasFiltradas = candidaturas.filter((candidatura) => {
    if (!busca) return true

    const candidato = candidatura.candidato as any
    const termoBusca = busca.toLowerCase()

    return (
      candidato?.nome_completo?.toLowerCase().includes(termoBusca) ||
      candidato?.email?.toLowerCase().includes(termoBusca)
    )
  })

  // Contadores por status
  const contadores = {
    todos: candidaturas.length,
    aguardando_resposta: candidaturas.filter((c) => c.status === 'aguardando_resposta').length,
    em_analise: candidaturas.filter((c) => c.status === 'em_analise').length,
    aprovado_proxima: candidaturas.filter((c) => c.status === 'aprovado_proxima').length,
    rejeitado: candidaturas.filter((c) => c.status === 'rejeitado').length,
  }

  // Estados de loading
  if (isLoadingVaga || isLoadingCandidaturas) {
    return (
      <RHLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white drop-shadow-lg">Carregando candidaturas...</p>
          </div>
        </div>
      </RHLayout>
    )
  }

  // Estado de erro
  if (errorCandidaturas || !vaga?.data) {
    return (
      <RHLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Glass variant="white" blur="lg" className="p-8 rounded-xl max-w-md text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4 drop-shadow-lg" />
            <h2 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
              Erro ao carregar candidaturas
            </h2>
            <p className="text-white/80 drop-shadow-sm mb-6">
              {errorCandidaturas?.message || 'Vaga não encontrada'}
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
                  {contadores.todos}
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
                  placeholder="Buscar por nome ou email..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 transition-all duration-200"
                />
              </div>
            </div>

            {/* Filtro de Status */}
            <Select
              value={statusFiltro}
              onValueChange={(value) => setStatusFiltro(value as any)}
            >
              <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                <SelectItem value="todos" className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer">
                  Todos ({contadores.todos})
                </SelectItem>
                <SelectItem value="aguardando_resposta" className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer">
                  Aguardando ({contadores.aguardando_resposta})
                </SelectItem>
                <SelectItem value="em_analise" className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer">
                  Em Análise ({contadores.em_analise})
                </SelectItem>
                <SelectItem value="aprovado_proxima" className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer">
                  Aprovados ({contadores.aprovado_proxima})
                </SelectItem>
                <SelectItem value="rejeitado" className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer">
                  Rejeitados ({contadores.rejeitado})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Glass>

        {/* Lista de Candidaturas */}
        {candidaturasFiltradas.length === 0 ? (
          <Glass variant="white" blur="lg" className="p-12 rounded-xl text-center">
            <Clock className="h-16 w-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
              Nenhuma candidatura encontrada
            </h3>
            <p className="text-white/70 drop-shadow-sm">
              {busca
                ? 'Tente ajustar os filtros de busca'
                : 'Esta vaga ainda não recebeu candidaturas.'}
            </p>
          </Glass>
        ) : (
          <div className="space-y-4">
            {candidaturasFiltradas.map((candidatura) => {
              const candidato = candidatura.candidato as any

              return (
                <Glass key={candidatura.id} variant="white" blur="lg" className="p-6 rounded-xl">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Info do Candidato */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#35BFAD] to-[#00109E] flex items-center justify-center text-white font-bold text-xl shrink-0 drop-shadow-md border-2 border-white/20">
                          {candidato?.nome_completo?.charAt(0).toUpperCase() || '?'}
                        </div>

                        {/* Dados */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <h3 className="text-xl font-semibold text-white drop-shadow-md truncate">
                              {candidato?.nome_completo || 'Nome não disponível'}
                            </h3>
                            <Badge
                              className={`${STATUS_COLORS[candidatura.status as StatusCandidatura]} text-white border`}
                            >
                              {STATUS_LABELS[candidatura.status as StatusCandidatura]}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-white/80 mb-3 drop-shadow-sm">
                            {candidato?.email && (
                              <span className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {candidato.email}
                              </span>
                            )}
                            {candidato?.celular && (
                              <span className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {candidato.celular}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-white/60 drop-shadow-sm">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Etapa: <span className="font-medium text-white/80">{candidatura.etapa_atual}</span>
                            </span>
                            <span>
                              Aplicou em:{' '}
                              <span className="font-medium text-white/80">
                                {format(new Date(candidatura.data_candidatura), "d 'de' MMM, yyyy", {
                                  locale: ptBR,
                                })}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <GlassButton
                        variant="white"
                        onClick={() => navigate(`/rh/candidatos/${candidato?.id}`)}
                        className="text-white flex items-center justify-center gap-2 font-medium min-h-[40px]"
                      >
                        <Eye className="w-4 h-4 flex-shrink-0" />
                        <span>Ver Perfil</span>
                      </GlassButton>

                      {candidatura.status !== 'aprovado_proxima' && (
                        <GlassButton
                          variant="secondary"
                          onClick={() => setSelectedCandidatura({
                            id: candidatura.id,
                            candidatoNome: candidato?.nome_completo || 'Candidato',
                            statusAtual: candidatura.status as StatusCandidatura
                          })}
                          className="text-white flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 border-green-500/30"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Aprovar</span>
                        </GlassButton>
                      )}

                      {candidatura.status !== 'rejeitado' && (
                        <GlassButton
                          variant="secondary"
                          onClick={() => setSelectedCandidatura({
                            id: candidatura.id,
                            candidatoNome: candidato?.nome_completo || 'Candidato',
                            statusAtual: candidatura.status as StatusCandidatura
                          })}
                          className="text-white flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border-red-500/30"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Rejeitar</span>
                        </GlassButton>
                      )}
                    </div>
                  </div>
                </Glass>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Atualização de Status */}
      <UpdateStatusModal
        open={!!selectedCandidatura}
        onOpenChange={(open) => !open && setSelectedCandidatura(null)}
        candidaturaId={selectedCandidatura?.id || ''}
        candidatoNome={selectedCandidatura?.candidatoNome || ''}
        statusAtual={selectedCandidatura?.statusAtual || 'aguardando_resposta'}
        onSuccess={() => {
          // Query will auto-refetch due to cache invalidation in hook
          setSelectedCandidatura(null)
        }}
      />
    </RHLayout>
  )
}
