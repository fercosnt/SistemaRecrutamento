/**
 * Página de Gestão de TODOS os Candidatos (RH)
 *
 * Features:
 * - Lista todas as candidaturas (todas as vagas)
 * - Filtros por status, vaga e busca
 * - Views: Cards ou Tabela
 * - Ações: Ver Perfil, Aprovar, Rejeitar
 *
 * @module components/pages/CandidatosRHPage
 */

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { RHLayout } from '../RHLayout'
import { Glass, GlassButton } from '../ui/glass'
import {
  Search,
  Grid3x3,
  List,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  FileText,
  MessageSquare,
  Eye,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ScoreCard } from '../ScoreCard'
import { KanbanBoard } from '../KanbanBoard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { useAllCandidaturas, useVagaCandidaturas } from '@/features/vagas/hooks/useCandidaturas'
import { useVagas } from '@/features/vagas/hooks/useVagas'
import type {
  StatusCandidatura,
  Candidatura,
  CandidaturaComScores,
} from '@/features/vagas/types/vagasTypes'
import {
  calculateBigFiveAverage,
  formatDiscProfile,
  getCultureScore,
} from '@/features/vagas/types/vagasTypes'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { UpdateStatusModal } from '../modals/UpdateStatusModal'

/**
 * Mapeamento de cores por status
 */
const STATUS_COLORS: Record<StatusCandidatura, string> = {
  aguardando_resposta: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  em_analise: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  aprovado_proxima: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejeitado: 'bg-red-500/20 text-red-300 border-red-500/30',
  finalizado: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
}

/**
 * Labels de status em português
 */
const STATUS_LABELS: Record<StatusCandidatura, string> = {
  aguardando_resposta: 'Aguardando',
  em_analise: 'Em Análise',
  aprovado_proxima: 'Aprovado',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
}

/**
 * Badge de status
 */
function getStatusBadge(status: StatusCandidatura) {
  const icons = {
    aprovado_proxima: <CheckCircle className="w-3 h-3" />,
    aguardando_resposta: <Clock className="w-3 h-3" />,
    em_analise: <AlertTriangle className="w-3 h-3" />,
    rejeitado: <XCircle className="w-3 h-3" />,
    finalizado: <Clock className="w-3 h-3" />,
  }

  return (
    <Badge
      variant="outline"
      className={`${STATUS_COLORS[status]} flex items-center gap-1 drop-shadow-sm`}
    >
      {icons[status]}
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function CandidatosRHPage() {
  const navigate = useNavigate()

  // Estados locais
  const [activeTab, setActiveTab] = useState<'todos' | 'por-vaga' | 'kanban'>('todos')
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>('cards')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusCandidatura | 'todos'>('todos')
  const [filterVaga, setFilterVaga] = useState('todas')
  const [selectedVagaPorVaga, setSelectedVagaPorVaga] = useState<string | null>(null) // Para aba "Por Vaga"
  const [sortBy, setSortBy] = useState<'recentes' | 'antigos' | 'nome' | 'score'>('recentes')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedCandidatura, setSelectedCandidatura] = useState<{
    id: string
    candidatoNome: string
    statusAtual: StatusCandidatura
  } | null>(null)

  // Buscar todas as candidaturas
  const {
    data: candidaturasData,
    isLoading: isLoadingCandidaturas,
    error: errorCandidaturas,
  } = useAllCandidaturas(
    filterStatus !== 'todos' ? { status: filterStatus } : undefined,
    'mais_recentes',
    { page: currentPage, limit: perPage }
  )

  // Buscar vagas para filtro (incluindo todas - ativas e inativas)
  const { data: vagasData } = useVagas(
    { apenasAtivas: false }, // Incluir vagas ativas e inativas
    'alfabetica',
    { page: 1, limit: 100 }
  )

  // Buscar candidaturas da vaga selecionada (aba "Por Vaga")
  const { data: vagaCandidaturasData } = useVagaCandidaturas(
    selectedVagaPorVaga,
    undefined,
    'mais_recentes',
    { page: 1, limit: 100 }
  )

  const candidaturas = candidaturasData?.data || []
  const vagas = vagasData?.data || []
  const pagination = candidaturasData?.pagination
  const vagaCandidaturas = vagaCandidaturasData?.data || []

  // Aplicar busca e filtros locais
  const candidaturasFiltradas = useMemo(() => {
    let filtered = [...candidaturas]

    // Filtro de busca (nome ou email)
    if (searchQuery) {
      const termoBusca = searchQuery.toLowerCase()
      filtered = filtered.filter((candidatura) => {
        const candidato = candidatura.candidato as any
        return (
          candidato?.nome_completo?.toLowerCase().includes(termoBusca) ||
          candidato?.email?.toLowerCase().includes(termoBusca)
        )
      })
    }

    // Filtro por vaga
    if (filterVaga !== 'todas') {
      filtered = filtered.filter((c) => c.vaga_id === filterVaga)
    }

    // Ordenação local
    switch (sortBy) {
      case 'antigos':
        filtered.sort(
          (a, b) =>
            new Date(a.data_candidatura).getTime() - new Date(b.data_candidatura).getTime()
        )
        break
      case 'nome':
        filtered.sort((a, b) => {
          const nomeA = (a.candidato as any)?.nome_completo || ''
          const nomeB = (b.candidato as any)?.nome_completo || ''
          return nomeA.localeCompare(nomeB)
        })
        break
      case 'score':
        // TODO: Quando tiver scores calculados, ordenar por eles
        break
      case 'recentes':
      default:
        // Já vem ordenado do backend
        break
    }

    return filtered
  }, [candidaturas, searchQuery, filterVaga, sortBy])

  // Contadores por status
  const contadores = useMemo(() => {
    return {
      todos: candidaturas.length,
      aguardando: candidaturas.filter((c) => c.status === 'aguardando_resposta').length,
      em_analise: candidaturas.filter((c) => c.status === 'em_analise').length,
      aprovados: candidaturas.filter((c) => c.status === 'aprovado_proxima').length,
      rejeitados: candidaturas.filter((c) => c.status === 'rejeitado').length,
    }
  }, [candidaturas])

  // Funil de etapas (aba "Por Vaga")
  const funilEtapas = useMemo(() => {
    const etapas: Record<string, number> = {
      triagem: 0,
      bigfive: 0,              // Corrigido: SEM underscore
      disc: 0,
      entrevista_online: 0,    // Corrigido: mudou de telefonica para online
      raven: 0,                // Adicionado: teste de QI
      cultura: 0,              // Adicionado: análise cultural
      entrevista_presencial: 0,
    }

    vagaCandidaturas.forEach((c) => {
      if (c.etapa_atual && etapas.hasOwnProperty(c.etapa_atual)) {
        etapas[c.etapa_atual]++
      }
    })

    return etapas
  }, [vagaCandidaturas])

  // Handler Ver Perfil — UX-03: o :id da rota `/rh/candidatos/:id` É um candidaturaId
  // (HubCandidatoRH lê `useParams().id` como candidaturaId). Encaminhar candidato.id
  // fazia o hub carregar o contexto errado (ou nenhum) e degradar em silêncio.
  const handleVerPerfil = (candidaturaId: string) => {
    navigate(`/rh/candidatos/${candidaturaId}`)
  }

  // Handler Aprovar
  const handleAprovar = (candidatura: Candidatura) => {
    const candidato = candidatura.candidato as any
    setSelectedCandidatura({
      id: candidatura.id,
      candidatoNome: candidato?.nome_completo || 'Candidato',
      statusAtual: candidatura.status as StatusCandidatura,
    })
  }

  // Handler Rejeitar
  const handleRejeitar = (candidatura: Candidatura) => {
    const candidato = candidatura.candidato as any
    setSelectedCandidatura({
      id: candidatura.id,
      candidatoNome: candidato?.nome_completo || 'Candidato',
      statusAtual: candidatura.status as StatusCandidatura,
    })
  }

  // Loading state
  if (isLoadingCandidaturas) {
    return (
      <RHLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white drop-shadow-lg">Carregando candidatos...</p>
          </div>
        </div>
      </RHLayout>
    )
  }

  // Error state
  if (errorCandidaturas) {
    return (
      <RHLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Glass variant="white" blur="lg" className="p-8 rounded-xl max-w-md text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4 drop-shadow-lg" />
            <h2 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
              Erro ao carregar candidatos
            </h2>
            <p className="text-white/80 drop-shadow-sm mb-6">
              {errorCandidaturas.message}
            </p>
            <GlassButton
              variant="secondary"
              onClick={() => window.location.reload()}
              className="text-white"
            >
              Tentar Novamente
            </GlassButton>
          </Glass>
        </div>
      </RHLayout>
    )
  }

  // Componente Card de Candidato
  const CandidatoCard = ({ candidatura }: { candidatura: CandidaturaComScores }) => {
    const candidato = candidatura.candidato as any
    const vaga = candidatura.vaga as any
    const initials =
      candidato?.nome_completo
        ?.split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || '??'

    // Calcular scores
    const bigFiveScore = calculateBigFiveAverage(candidatura.scores_bigfive)
    const discProfile = formatDiscProfile(candidatura.scores_disc)
    const inteligencia = candidatura.scores_raven?.percentil
    const cultura = getCultureScore(candidatura.analise_ia_cultura)
    const scoreGeral = candidatura.score_geral

    return (
      <Glass
        variant="white"
        blur="lg"
        hover
        className="p-6 rounded-xl transition-all duration-300"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 text-white drop-shadow-md">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white drop-shadow-sm truncate">
                    {candidato?.nome_completo || 'Nome não disponível'}
                  </h3>
                  <p className="text-sm text-white/70 drop-shadow-sm truncate">
                    {vaga?.titulo || 'Vaga não disponível'}
                  </p>
                </div>
                {getStatusBadge(candidatura.status as StatusCandidatura)}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-white/60 drop-shadow-sm">
                <Clock className="h-3 w-3" />
                Etapa: <span className="font-medium text-white/80">{candidatura.etapa_atual}</span>
              </div>
            </div>
          </div>

          {/* Detalhes */}
          <div className="flex flex-wrap gap-3 text-sm text-white/70 drop-shadow-sm">
            {candidato?.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {candidato.email}
              </span>
            )}
            {candidato?.celular && (
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {candidato.celular}
              </span>
            )}
          </div>

          {/* Data */}
          <p className="text-xs text-white/60 drop-shadow-sm">
            Aplicou em:{' '}
            <span className="font-medium text-white/80">
              {format(new Date(candidatura.data_candidatura), "d 'de' MMM, yyyy", {
                locale: ptBR,
              })}
            </span>
          </p>

          {/* Scores dos Testes */}
          <ScoreCard
            bigFive={bigFiveScore}
            disc={discProfile}
            inteligencia={inteligencia}
            cultura={cultura}
            scoreGeral={scoreGeral}
          />

          {/* Ações */}
          <div className="flex items-center gap-2">
            <GlassButton
              variant="white"
              onClick={() => handleVerPerfil(candidatura.id)}
              className="flex-1 text-white text-sm drop-shadow-sm flex items-center justify-center gap-2 font-medium min-h-[40px]"
            >
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span>Ver Perfil</span>
            </GlassButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 drop-shadow-sm backdrop-blur-sm">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                {candidatura.status !== 'aprovado_proxima' && (
                  <DropdownMenuItem
                    onClick={() => handleAprovar(candidatura)}
                    className="text-white hover:bg-white/20 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar
                  </DropdownMenuItem>
                )}
                {candidatura.status !== 'rejeitado' && (
                  <DropdownMenuItem
                    onClick={() => handleRejeitar(candidatura)}
                    className="text-white hover:bg-white/20 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeitar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/20" />
                <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar Email
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Enviar WhatsApp
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/20" />
                <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Glass>
    )
  }

  return (
    <RHLayout>
      <div className="space-y-6">
        {/* Header */}
        <Glass variant="white" blur="xl" className="p-6 rounded-2xl">
          <div className="space-y-4">
            {/* Título */}
            <div>
              <h1 className="text-white drop-shadow-lg text-[40px] font-bold font-normal">
                👥 Candidatos ({contadores.todos})
              </h1>
            </div>

            {/* Busca */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-200"
                />
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-white/80 text-sm drop-shadow-sm">Filtros:</span>

              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white hover:text-white transition-all duration-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 shadow-xl">
                  <SelectItem value="todos" className="text-white hover:text-white focus:text-white cursor-pointer">
                    Todos ({contadores.todos})
                  </SelectItem>
                  <SelectItem
                    value="aguardando_resposta"
                    className="text-white hover:text-white focus:text-white cursor-pointer"
                  >
                    Aguardando ({contadores.aguardando})
                  </SelectItem>
                  <SelectItem value="em_analise" className="text-white hover:text-white focus:text-white cursor-pointer">
                    Em Análise ({contadores.em_analise})
                  </SelectItem>
                  <SelectItem
                    value="aprovado_proxima"
                    className="text-white hover:text-white focus:text-white cursor-pointer"
                  >
                    Aprovados ({contadores.aprovados})
                  </SelectItem>
                  <SelectItem value="rejeitado" className="text-white hover:text-white focus:text-white cursor-pointer">
                    Rejeitados ({contadores.rejeitados})
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterVaga} onValueChange={setFilterVaga}>
                <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white hover:text-white transition-all duration-300">
                  <SelectValue placeholder="Vaga" />
                </SelectTrigger>
                <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 shadow-xl">
                  <SelectItem value="todas" className="text-white hover:text-white focus:text-white cursor-pointer">
                    Todas as Vagas
                  </SelectItem>
                  {vagas.map((vaga) => (
                    <SelectItem
                      key={vaga.id}
                      value={vaga.id}
                      className="text-white hover:text-white focus:text-white cursor-pointer"
                    >
                      {vaga.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchQuery || filterStatus !== 'todos' || filterVaga !== 'todas') && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setFilterStatus('todos')
                    setFilterVaga('todas')
                  }}
                  className="text-sm text-white/80 hover:text-white transition-colors duration-200 drop-shadow-sm underline"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>
        </Glass>

        {/* Tabs de Visualização */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-6">
          <Glass variant="white" blur="lg" className="p-4 rounded-xl">
            <TabsList className="grid w-full grid-cols-3 bg-white/10 p-1.5 rounded-lg gap-2 h-auto">
              <TabsTrigger
                value="todos"
                className="data-[state=active]:bg-white/30 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:backdrop-blur-md text-white/70 hover:text-white hover:bg-white/15 transition-all duration-300 px-4 py-2.5 rounded-md font-medium text-sm border-0 h-auto"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-base">📋</span>
                  <span>Todos</span>
                </span>
              </TabsTrigger>
              
              <TabsTrigger
                value="por-vaga"
                className="data-[state=active]:bg-white/30 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:backdrop-blur-md text-white/70 hover:text-white hover:bg-white/15 transition-all duration-300 px-4 py-2.5 rounded-md font-medium text-sm border-0 h-auto"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-base">📊</span>
                  <span>Por Vaga</span>
                </span>
              </TabsTrigger>
              
              <TabsTrigger
                value="kanban"
                className="data-[state=active]:bg-white/30 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:backdrop-blur-md text-white/70 hover:text-white hover:bg-white/15 transition-all duration-300 px-4 py-2.5 rounded-md font-medium text-sm border-0 h-auto"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-base">🎯</span>
                  <span>Kanban</span>
                </span>
              </TabsTrigger>
            </TabsList>
          </Glass>

          {/* Tab: Todos os Candidatos */}
          <TabsContent value="todos" className="space-y-6">
            {/* Controles */}
            <Glass variant="white" blur="lg" className="p-4 rounded-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Visualização */}
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-sm drop-shadow-sm">Visualização:</span>
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded transition-all duration-200 ${
                    viewMode === 'cards'
                      ? 'bg-white/30 text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('tabela')}
                  className={`p-2 rounded transition-all duration-200 ${
                    viewMode === 'tabela'
                      ? 'bg-white/30 text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ordenar e Mostrar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm drop-shadow-sm">Ordenar:</span>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-white text-sm h-9 hover:text-white transition-all duration-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 shadow-xl">
                    <SelectItem value="recentes" className="text-white hover:text-white focus:text-white cursor-pointer">
                      Mais Recentes
                    </SelectItem>
                    <SelectItem value="antigos" className="text-white hover:text-white focus:text-white cursor-pointer">
                      Mais Antigos
                    </SelectItem>
                    <SelectItem value="nome" className="text-white hover:text-white focus:text-white cursor-pointer">
                      Nome A-Z
                    </SelectItem>
                    <SelectItem value="score" className="text-white hover:text-white focus:text-white cursor-pointer">
                      Maior Score
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm drop-shadow-sm">Mostrar:</span>
                <Select value={perPage.toString()} onValueChange={(value) => setPerPage(Number(value))}>
                  <SelectTrigger className="w-[130px] bg-white/10 border-white/20 text-white text-sm h-9 hover:text-white transition-all duration-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 shadow-xl">
                    <SelectItem value="10" className="text-white hover:text-white focus:text-white cursor-pointer">
                      10 por página
                    </SelectItem>
                    <SelectItem value="20" className="text-white hover:text-white focus:text-white cursor-pointer">
                      20 por página
                    </SelectItem>
                    <SelectItem value="50" className="text-white hover:text-white focus:text-white cursor-pointer">
                      50 por página
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Glass>

        {/* Lista de Candidatos */}
        {candidaturasFiltradas.length === 0 ? (
          <Glass variant="white" blur="lg" className="p-12 rounded-xl text-center">
            <Clock className="h-16 w-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
              Nenhum candidato encontrado
            </h3>
            <p className="text-white/70 drop-shadow-sm">
              {searchQuery || filterStatus !== 'todos' || filterVaga !== 'todas'
                ? 'Tente ajustar os filtros de busca'
                : 'Ainda não há candidaturas no sistema.'}
            </p>
          </Glass>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {candidaturasFiltradas.map((candidatura) => (
              <CandidatoCard key={candidatura.id} candidatura={candidatura} />
            ))}
          </div>
        ) : (
          /* Tabela */
          <Glass variant="white" blur="lg" className="rounded-xl overflow-hidden">
            <Table className="border-separate border-spacing-0">
              <TableHeader>
                <TableRow className="border-b border-white/20 hover:bg-white/10">
                  <TableHead className="text-white/90 drop-shadow-sm h-12 px-4">Nome</TableHead>
                  <TableHead className="text-white/90 drop-shadow-sm h-12 px-4">Vaga</TableHead>
                  <TableHead className="text-white/90 drop-shadow-sm h-12 px-4">Status</TableHead>
                  <TableHead className="text-white/90 drop-shadow-sm h-12 px-4">Etapa</TableHead>
                  <TableHead className="text-white/90 drop-shadow-sm h-12 px-4 text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidaturasFiltradas.map((candidatura) => {
                  const candidato = candidatura.candidato as any
                  const vaga = candidatura.vaga as any
                  const initials =
                    candidato?.nome_completo
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase() || '??'

                  return (
                    <TableRow
                      key={candidatura.id}
                      className="border-b border-white/20 hover:bg-white/10 transition-colors duration-200"
                    >
                      {/* Nome com Avatar */}
                      <TableCell className="text-white drop-shadow-sm py-4 px-4 whitespace-normal">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 text-white drop-shadow-md text-sm">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate">{candidato?.nome_completo || 'N/A'}</div>
                            <div className="text-xs text-white/60 truncate drop-shadow-sm">
                              {candidato?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Vaga */}
                      <TableCell className="text-white/80 drop-shadow-sm py-4 px-4 whitespace-normal">
                        <div className="max-w-[200px] truncate">{vaga?.titulo || 'N/A'}</div>
                        <div className="text-xs text-white/60 drop-shadow-sm">
                          {format(new Date(candidatura.data_candidatura), "d 'de' MMM", {
                            locale: ptBR,
                          })}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4 px-4 whitespace-normal">
                        {getStatusBadge(candidatura.status as StatusCandidatura)}
                      </TableCell>

                      {/* Etapa */}
                      <TableCell className="text-white/80 drop-shadow-sm py-4 px-4 whitespace-normal">
                        {candidatura.etapa_atual}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right py-4 px-4 whitespace-normal">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 drop-shadow-sm backdrop-blur-sm">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white"
                          >
                            <DropdownMenuItem
                              onClick={() => handleVerPerfil(candidatura.id)}
                              className="text-white hover:bg-white/20 cursor-pointer"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Perfil
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/20" />
                            {candidatura.status !== 'aprovado_proxima' && (
                              <DropdownMenuItem
                                onClick={() => handleAprovar(candidatura)}
                                className="text-white hover:bg-white/20 cursor-pointer"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aprovar
                              </DropdownMenuItem>
                            )}
                            {candidatura.status !== 'rejeitado' && (
                              <DropdownMenuItem
                                onClick={() => handleRejeitar(candidatura)}
                                className="text-white hover:bg-white/20 cursor-pointer"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Rejeitar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-white/20" />
                            <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                              <Mail className="w-4 h-4 mr-2" />
                              Enviar Email
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Enviar WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/20" />
                            <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                              <FileText className="w-4 h-4 mr-2" />
                              Exportar PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Glass>
        )}

            {/* Paginação */}
            {pagination && pagination.totalPages > 1 && (
              <Glass variant="white" blur="lg" className="p-4 rounded-xl">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed drop-shadow-sm backdrop-blur-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white drop-shadow-sm">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={!pagination.hasMore}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed drop-shadow-sm backdrop-blur-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </Glass>
            )}
          </TabsContent>

          {/* Tab: Por Vaga */}
          <TabsContent value="por-vaga" className="space-y-6">
            {/* Seletor de Vaga */}
            <Glass variant="white" blur="lg" className="p-6 rounded-xl">
              <div className="flex items-center gap-4">
                <span className="text-white drop-shadow-sm font-medium">Selecione uma vaga:</span>
                <Select
                  value={selectedVagaPorVaga || ''}
                  onValueChange={(value) => setSelectedVagaPorVaga(value || null)}
                >
                  <SelectTrigger className="w-[300px] bg-white/10 border-white/20 text-white hover:text-white transition-all duration-300">
                    <SelectValue placeholder="Escolha uma vaga..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 shadow-xl">
                    {vagas.map((vaga) => (
                      <SelectItem
                        key={vaga.id}
                        value={vaga.id}
                        className="text-white hover:text-white focus:text-white cursor-pointer"
                      >
                        {vaga.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Glass>

            {selectedVagaPorVaga ? (
              <>
                {/* Funil de Etapas */}
                <Glass variant="white" blur="lg" className="p-6 rounded-xl">
                  <h3 className="text-white drop-shadow-lg text-lg font-semibold mb-6">
                    📊 Funil de Etapas
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {[
                      { key: 'triagem', label: '🔍 Triagem', color: 'from-blue-500 to-blue-600' },
                      { key: 'bigfive', label: '🧠 Big Five', color: 'from-purple-500 to-purple-600' },
                      { key: 'disc', label: '👥 DISC', color: 'from-green-500 to-green-600' },
                      { key: 'entrevista_online', label: '🎥 Online', color: 'from-cyan-500 to-cyan-600' },
                      { key: 'raven', label: '🧩 Raven', color: 'from-indigo-500 to-indigo-600' },
                      { key: 'cultura', label: '❤️ Cultura', color: 'from-pink-500 to-pink-600' },
                      { key: 'entrevista_presencial', label: '🤝 Presencial', color: 'from-orange-500 to-orange-600' },
                    ].map((etapa) => (
                      <div
                        key={etapa.key}
                        className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className={`w-full h-2 rounded-full bg-gradient-to-r ${etapa.color} mb-2`} />
                        <div className="text-2xl font-bold text-white drop-shadow-md">
                          {funilEtapas[etapa.key] || 0}
                        </div>
                        <div className="text-xs text-white/70 text-center mt-1 drop-shadow-sm">
                          {etapa.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center text-white/60 text-sm drop-shadow-sm">
                    Total: {vagaCandidaturas.length} candidatos
                  </div>
                </Glass>

                {/* Lista de Candidatos da Vaga */}
                {vagaCandidaturas.length === 0 ? (
                  <Glass variant="white" blur="lg" className="p-12 rounded-xl text-center">
                    <Clock className="h-16 w-16 text-white/40 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
                      Nenhum candidato nesta vaga
                    </h3>
                    <p className="text-white/70 drop-shadow-sm">
                      Ainda não há candidaturas para esta vaga.
                    </p>
                  </Glass>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {vagaCandidaturas.map((candidatura) => (
                      <CandidatoCard key={candidatura.id} candidatura={candidatura as CandidaturaComScores} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Glass variant="white" blur="lg" className="p-12 rounded-xl text-center">
                <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
                  📊 Selecione uma vaga
                </h3>
                <p className="text-white/70 drop-shadow-sm">
                  Escolha uma vaga acima para visualizar o funil de candidatos e suas etapas.
                </p>
              </Glass>
            )}
          </TabsContent>

          {/* Tab: Kanban */}
          <TabsContent value="kanban" className="mt-0">
            {candidaturasFiltradas.length === 0 ? (
              <Glass variant="white" blur="lg" className="p-12 rounded-xl text-center">
                <Clock className="h-16 w-16 text-white/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
                  Nenhum candidato encontrado
                </h3>
                <p className="text-white/70 drop-shadow-sm">
                  {searchQuery || filterStatus !== 'todos' || filterVaga !== 'todas'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Ainda não há candidaturas no sistema.'}
                </p>
              </Glass>
            ) : (
              <div className="w-full">
                <KanbanBoard
                  candidaturas={candidaturasFiltradas as any}
                  onViewPerfil={handleVerPerfil}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
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
