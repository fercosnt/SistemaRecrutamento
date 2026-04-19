/**
 * VagasPublicasPage - Página de listagem de vagas públicas
 *
 * Features:
 * - Listagem de vagas com filtros (tipo, localização, departamento)
 * - Ordenação (mais recentes, alfabética, localização, departamento)
 * - Paginação (12 vagas por página)
 * - Contador de vagas disponíveis
 * - Indicador de vagas já aplicadas
 * - Integração com TanStack Query + Zustand store
 * - Navegação para página de detalhes
 *
 * @module components/pages/VagasPublicasPage
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BackgroundImage } from '../BackgroundImage'
import { BeautySmileLogo } from '../BeautySmileLogo'
import { Glass, GlassButton, GlassCard } from '../ui/glass'
import {
  MapPin,
  Briefcase,
  Clock,
  Search,
  Filter,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { useVagas } from '@/features/vagas/hooks'
import { useVagasStore } from '@/features/vagas/store/vagasStore'
import type {
  TipoVaga,
  ModeloTrabalho,
  Departamento,
  VagasOrderBy
} from '@/features/vagas/types/vagasTypes'

// Opções de filtros
// NOTA: Valores devem corresponder exatamente aos valores no banco de dados
const TIPOS_VAGA: { value: TipoVaga | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'CLT', label: 'CLT' },
  { value: 'PJ', label: 'PJ' },
]

const MODELOS_TRABALHO: { value: ModeloTrabalho | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os modelos' },
  { value: 'Presencial', label: 'Presencial' },
  { value: 'Remoto', label: 'Remoto' },
  { value: 'Híbrido', label: 'Híbrido' },
]

const DEPARTAMENTOS: { value: Departamento | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os departamentos' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'clinico', label: 'Clínico' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'recursos_humanos', label: 'Recursos Humanos' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'tecnologia', label: 'Tecnologia' },
]

const ORDENACOES: { value: VagasOrderBy; label: string }[] = [
  { value: 'mais_recentes', label: 'Mais Recentes' },
  { value: 'alfabetica', label: 'Alfabética' },
  { value: 'localizacao', label: 'Localização' },
  { value: 'departamento', label: 'Departamento' },
]

export function VagasPublicasPage() {
  const navigate = useNavigate()

  // Zustand store (UI state)
  const {
    filters,
    orderBy,
    pagination,
    setFilters,
    resetFilters,
    setOrderBy,
    goToPage,
    isFilterSidebarOpen,
    toggleFilterSidebar,
  } = useVagasStore()

  // TanStack Query (server state)
  const { data, isLoading, error } = useVagas(filters, orderBy, pagination)

  // Handlers
  const handleSearchChange = (value: string) => {
    setFilters({ search: value || null })
    // Note: setFilters already resets to page 1 internally
  }

  const handleTipoVagaChange = (value: string) => {
    setFilters({
      tipo_vaga: value === 'all' ? null : (value as TipoVaga)
    })
    // Note: setFilters already resets to page 1 internally
  }

  const handleModeloTrabalhoChange = (value: string) => {
    setFilters({
      modelo_trabalho: value === 'all' ? null : (value as ModeloTrabalho)
    })
    // Note: setFilters already resets to page 1 internally
  }

  const handleDepartamentoChange = (value: string) => {
    setFilters({
      departamento: value === 'all' ? null : (value as Departamento)
    })
    // Note: setFilters already resets to page 1 internally
  }

  const handleOrdenacaoChange = (value: VagasOrderBy) => {
    setOrderBy(value)
  }

  const handleLimparFiltros = () => {
    resetFilters()
  }

  const handleVerDetalhes = (vagaId: string) => {
    navigate(`/vagas/${vagaId}`)
  }

  const handleCandidatar = (vagaId: string) => {
    navigate(`/vagas/${vagaId}`) // Navigate to detail page for application
  }

  const handlePageChange = (newPage: number) => {
    goToPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Check if any filter is active
  const hasActiveFilters =
    filters.search ||
    filters.tipo_vaga ||
    filters.modelo_trabalho ||
    filters.departamento

  // Vagas from query
  const vagas = data?.data || []
  const totalVagas = data?.pagination?.total || 0
  const totalPages = data?.pagination?.totalPages || 1
  const hasMore = data?.pagination?.hasMore || false

  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 space-y-8">
          {/* Header */}
          <div className="text-center mb-12">
            <BeautySmileLogo
              type="horizontal"
              size="xl"
              variant="white"
              className="mx-auto mb-6"
            />
            <h1 className="text-white text-5xl mb-3 drop-shadow-lg font-bold">
              Vagas Disponíveis
            </h1>
            <p className="text-white/90 text-xl drop-shadow-md">
              Faça parte do time Beauty Smile
            </p>
            {!isLoading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-white/80 drop-shadow-sm">
                <TrendingUp className="w-5 h-5" />
                <span className="text-lg">
                  {totalVagas} {totalVagas === 1 ? 'vaga disponível' : 'vagas disponíveis'}
                </span>
              </div>
            )}
          </div>

          {/* Filtros e Ordenação */}
          <Glass variant="white" blur="xl" className="p-6 rounded-xl">
            <div className="space-y-4">
              {/* Busca por vaga */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <Input
                  type="text"
                  placeholder="Buscar por título da vaga..."
                  value={filters.search || ''}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 transition-all duration-200"
                />
              </div>

              {/* Filtros dropdown */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Tipo de Vaga */}
                <Select
                  value={filters.tipo_vaga || 'all'}
                  onValueChange={handleTipoVagaChange}
                >
                  <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Tipo de vaga" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#35BFAD]/95 backdrop-blur-xl border-white/20 text-white">
                    {TIPOS_VAGA.map((tipo) => (
                      <SelectItem
                        key={tipo.value}
                        value={tipo.value}
                        className="text-white hover:bg-white/10 focus:bg-white/20 focus:text-white cursor-pointer"
                      >
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Modelo de Trabalho */}
                <Select
                  value={filters.modelo_trabalho || 'all'}
                  onValueChange={handleModeloTrabalhoChange}
                >
                  <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Modelo de trabalho" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#35BFAD]/95 backdrop-blur-xl border-white/20 text-white">
                    {MODELOS_TRABALHO.map((modelo) => (
                      <SelectItem
                        key={modelo.value}
                        value={modelo.value}
                        className="text-white hover:bg-white/10 focus:bg-white/20 focus:text-white cursor-pointer"
                      >
                        {modelo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Departamento */}
                <Select
                  value={filters.departamento || 'all'}
                  onValueChange={handleDepartamentoChange}
                >
                  <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#35BFAD]/95 backdrop-blur-xl border-white/20 text-white">
                    {DEPARTAMENTOS.map((dept) => (
                      <SelectItem
                        key={dept.value}
                        value={dept.value}
                        className="text-white hover:bg-white/10 focus:bg-white/20 focus:text-white cursor-pointer"
                      >
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Ordenação */}
                <Select
                  value={orderBy}
                  onValueChange={handleOrdenacaoChange}
                >
                  <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#35BFAD]/95 backdrop-blur-xl border-white/20 text-white">
                    {ORDENACOES.map((ord) => (
                      <SelectItem
                        key={ord.value}
                        value={ord.value}
                        className="text-white hover:bg-white/10 focus:bg-white/20 focus:text-white cursor-pointer"
                      >
                        {ord.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resultados e botão limpar */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-white drop-shadow-sm">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-white/80">Carregando...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-white/80">Resultados:</span>
                      <span className="ml-3 font-semibold">
                        {vagas.length} {vagas.length === 1 ? 'vaga' : 'vagas'}
                      </span>
                      {totalPages > 1 && (
                        <span className="ml-2 text-white/60">
                          (Página {pagination.page} de {totalPages})
                        </span>
                      )}
                    </>
                  )}
                </div>
                {hasActiveFilters && (
                  <GlassButton
                    variant="white"
                    className="text-white drop-shadow-sm"
                    onClick={handleLimparFiltros}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Limpar filtros
                  </GlassButton>
                )}
              </div>
            </div>
          </Glass>

          {/* Error State */}
          {error && (
            <Glass variant="white" blur="xl" className="p-8 rounded-xl">
              <div className="flex items-center gap-4 text-white">
                <AlertCircle className="w-8 h-8 text-red-300" />
                <div>
                  <h3 className="text-xl font-semibold mb-1">Erro ao carregar vagas</h3>
                  <p className="text-white/80">
                    {error instanceof Error ? error.message : 'Erro desconhecido. Tente novamente.'}
                  </p>
                </div>
              </div>
            </Glass>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map((i) => (
                <GlassCard key={i} variant="white" blur="xl">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-white/20 rounded w-2/3"></div>
                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                    <div className="h-20 bg-white/10 rounded"></div>
                    <div className="h-12 bg-white/20 rounded"></div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Lista de vagas */}
          {!isLoading && !error && vagas.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-6">
                {vagas.map((vaga) => (
                  <GlassCard
                    key={vaga.id}
                    variant="white"
                    blur="xl"
                    hover
                    className="text-white transition-all duration-300 cursor-pointer"
                    onClick={() => handleVerDetalhes(vaga.id)}
                  >
                    <div className="space-y-6">
                      {/* Header da vaga */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h2 className="text-3xl mb-3 drop-shadow-md font-bold">
                            {vaga.titulo}
                          </h2>
                          <div className="flex flex-wrap gap-4 text-white/80 drop-shadow-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-5 h-5" />
                              <span>{vaga.cidade}{vaga.estado ? `, ${vaga.estado}` : ''}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-5 h-5" />
                              <span className="capitalize">{vaga.departamento?.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5" />
                              <span className="capitalize">{vaga.modelo_trabalho}</span>
                            </div>
                          </div>
                        </div>

                        {/* Indicador de já aplicado */}
                        {vaga.hasUserApplied && (
                          <div className="flex items-center gap-2 bg-green-500/20 text-green-100 px-4 py-2 rounded-lg backdrop-blur-sm border border-green-400/30">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">Candidatura enviada</span>
                          </div>
                        )}
                      </div>

                      {/* Descrição resumida */}
                      <Glass variant="white" blur="md" className="p-4 rounded-lg">
                        <p className="text-white/90 drop-shadow-sm line-clamp-3">
                          {vaga.descricao_curta}
                        </p>
                      </Glass>

                      {/* Metadados adicionais */}
                      <div className="flex items-center justify-between text-sm text-white/60">
                        <span>
                          Publicada há {vaga.diasDesdePublicacao} {vaga.diasDesdePublicacao === 1 ? 'dia' : 'dias'}
                        </span>
                        {vaga.totalCandidatos > 0 && (
                          <span>
                            {vaga.totalCandidatos} {vaga.totalCandidatos === 1 ? 'candidato' : 'candidatos'}
                          </span>
                        )}
                      </div>

                      {/* Botão de ação */}
                      <div className="pt-2">
                        {vaga.hasUserApplied ? (
                          <GlassButton
                            variant="white"
                            className="w-full py-4 text-white drop-shadow-sm opacity-60 cursor-not-allowed"
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                            disabled
                          >
                            Você já se candidatou a esta vaga
                          </GlassButton>
                        ) : (
                          <GlassButton
                            variant="white"
                            hover
                            className="w-full py-4 text-white drop-shadow-sm transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCandidatar(vaga.id)
                            }}
                          >
                            Candidatar-se a esta vaga →
                          </GlassButton>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <Glass variant="white" blur="xl" className="p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <GlassButton
                      variant="white"
                      disabled={pagination.page === 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                      className={`text-white ${pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      ← Anterior
                    </GlassButton>

                    <div className="text-white drop-shadow-sm">
                      Página <span className="font-semibold">{pagination.page}</span> de{' '}
                      <span className="font-semibold">{totalPages}</span>
                    </div>

                    <GlassButton
                      variant="white"
                      disabled={!hasMore}
                      onClick={() => handlePageChange(pagination.page + 1)}
                      className={`text-white ${!hasMore ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Próxima →
                    </GlassButton>
                  </div>
                </Glass>
              )}
            </>
          )}

          {/* Empty State */}
          {!isLoading && !error && vagas.length === 0 && (
            <Glass variant="white" blur="xl" className="p-12 rounded-xl text-center">
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
                  <span className="text-4xl">🔍</span>
                </div>
                <h3 className="text-white text-2xl drop-shadow-md font-semibold">
                  Nenhuma vaga encontrada
                </h3>
                <p className="text-white/80 drop-shadow-sm">
                  {hasActiveFilters
                    ? 'Tente ajustar os filtros para encontrar mais oportunidades'
                    : 'No momento não há vagas disponíveis. Volte em breve!'
                  }
                </p>
                {hasActiveFilters && (
                  <GlassButton
                    variant="white"
                    hover
                    className="text-white drop-shadow-sm mt-4"
                    onClick={handleLimparFiltros}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Limpar filtros
                  </GlassButton>
                )}
              </div>
            </Glass>
          )}
        </div>
      </BackgroundImage>
    </div>
  )
}
