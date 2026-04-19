import React, { useState, useMemo } from 'react';
import { RHLayout } from '../RHLayout';
import { MetricCard } from '../MetricCard';
import { Glass } from '../ui/glass';
import {
  Users,
  TrendingUp,
  Clock,
  Target,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

// Cores para gráficos (definido antes do CustomTooltip para evitar erro de referência)
const CHART_COLORS = {
  primary: '#35BFAD',
  secondary: '#00109E',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

/**
 * Componente de Tooltip customizado para gráficos
 * Design moderno com glassmorphism e animações suaves
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="relative z-50 pointer-events-none">
      {/* Tooltip principal com efeito de elevação */}
      <div className="relative bg-gradient-to-br from-[#00109E]/90 via-[#00109E]/85 to-[#000860]/90 backdrop-blur-xl border border-[#35BFAD]/60 rounded-2xl shadow-2xl shadow-[#35BFAD]/40 p-4 min-w-[180px] transform transition-all duration-200">
        {/* Brilho decorativo no topo */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#35BFAD]/60 to-transparent" />
        
        {/* Label */}
        {label && (
          <div className="text-white text-sm font-medium mb-3 pb-2.5 border-b border-white/20 flex items-center gap-2">
            <div className="w-1 h-4 bg-[#35BFAD] rounded-full" />
            <span>{label}</span>
          </div>
        )}
        
        {/* Items */}
        <div className="space-y-2.5">
          {payload.map((item: any, index: number) => {
            const color = item.color || item.fill || item.payload?.fill || CHART_COLORS.primary;
            const value = item.value !== undefined ? item.value : item.payload?.value;
            
            return (
              <div
                key={index}
                className="flex items-center justify-between gap-4 group/item"
              >
                <div className="flex items-center gap-2.5">
                  {/* Indicador de cor com brilho animado */}
                  <div className="relative">
                    <div
                      className="w-3 h-3 rounded-full transition-all duration-300 group-hover/item:scale-125"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}70, 0 0 20px ${color}40, inset 0 1px 2px rgba(255,255,255,0.3)`,
                      }}
                    />
                    <div
                      className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-20"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <span className="text-white/90 text-xs font-normal">
                    {item.name || item.dataKey || 'Valor'}
                  </span>
                </div>
                <span className="text-white text-sm font-bold tabular-nums bg-white/5 px-2 py-0.5 rounded-md">
                  {typeof value === 'number' 
                    ? value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
                    : value}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Brilho decorativo na parte inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#35BFAD]/40 to-transparent" />
      </div>
    </div>
  );
};

const DISC_COLORS = {
  D: '#EF4444', // Dominante - Vermelho
  I: '#F59E0B', // Influente - Laranja
  S: '#10B981', // Estável - Verde
  C: '#3B82F6', // Consciencioso - Azul
};

const BIG_FIVE_COLORS = {
  abertura: '#3B82F6',
  conscienciosidade: '#10B981',
  extroversao: '#F59E0B',
  amabilidade: '#EF4444',
  neuroticismo: '#8B5CF6',
};

/**
 * Hook para buscar estatísticas gerais de relatórios
 */
function useRelatoriosStats(filters: { vagaId?: string; area?: string }) {
  return useQuery({
    queryKey: ['relatorios-stats', filters],
    queryFn: async () => {
      // Construir query base
      let candidaturasQuery = supabase
        .from('candidaturas')
        .select(`
          id,
          score_geral,
          data_candidatura,
          data_decisao_final,
          vaga:vaga_id (
            id,
            titulo,
            departamento
          )
        `);

      // Aplicar filtros
      if (filters.vagaId) {
        candidaturasQuery = candidaturasQuery.eq('vaga_id', filters.vagaId);
      }

      const { data: candidaturas, error } = await candidaturasQuery;

      if (error) throw error;

      // Filtrar por área se necessário
      let filteredCandidaturas = candidaturas || [];
      if (filters.area && filters.area !== 'todas') {
        filteredCandidaturas = filteredCandidaturas.filter(
          (c: any) => c.vaga?.departamento === filters.area
        );
      }

      // Calcular métricas
      const totalCandidatos = filteredCandidaturas.length;
      const scores = filteredCandidaturas
        .map((c: any) => c.score_geral)
        .filter((s: any) => s !== null && s !== undefined) as number[];
      const scoreMedio = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

      // Calcular dias médios para contratar
      const temposContratacao = filteredCandidaturas
        .map((c: any) => {
          if (c.data_candidatura && c.data_decisao_final) {
            const diff = new Date(c.data_decisao_final).getTime() - new Date(c.data_candidatura).getTime();
            return Math.floor(diff / (1000 * 60 * 60 * 24));
          }
          return null;
        })
        .filter((t: any) => t !== null) as number[];

      const diasMediosContratacao = temposContratacao.length > 0
        ? temposContratacao.reduce((a, b) => a + b, 0) / temposContratacao.length
        : 0;

      // Candidatos qualificados (score >= 70)
      const qualificados = scores.filter((s) => s >= 70).length;

      return {
        totalCandidatos,
        scoreMedio: Math.round(scoreMedio * 100) / 100,
        diasMediosContratacao: Math.round(diasMediosContratacao),
        qualificados,
        taxaQualificacao: totalCandidatos > 0 ? (qualificados / totalCandidatos) * 100 : 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para buscar dados de evolução de inscrições e contratações
 */
function useEvolucaoInscricoes(filters: { vagaId?: string; area?: string }) {
  return useQuery({
    queryKey: ['evolucao-inscricoes', filters],
    queryFn: async () => {
      // Buscar candidaturas dos últimos 6 meses
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

      let query = supabase
        .from('candidaturas')
        .select(`
          id,
          data_candidatura,
          data_decisao_final,
          status,
          vaga:vaga_id (
            id,
            departamento
          )
        `)
        .gte('data_candidatura', seisMesesAtras.toISOString());

      if (filters.vagaId) {
        query = query.eq('vaga_id', filters.vagaId);
      }

      const { data: candidaturas, error } = await query;

      if (error) throw error;

      // Filtrar por área se necessário
      let filtered = candidaturas || [];
      if (filters.area && filters.area !== 'todas') {
        filtered = filtered.filter((c: any) => c.vaga?.departamento === filters.area);
      }

      // Agrupar por mês
      const meses: Record<string, { inscricoes: number; contratacoes: number }> = {};

      filtered.forEach((c: any) => {
        const data = new Date(c.data_candidatura);
        const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        const mesNome = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

        if (!meses[mesAno]) {
          meses[mesAno] = { inscricoes: 0, contratacoes: 0, nome: mesNome };
        }

        meses[mesAno].inscricoes++;

        if (c.status === 'aprovado_proxima' && c.data_decisao_final) {
          meses[mesAno].contratacoes++;
        }
      });

      // Converter para array e ordenar
      return Object.entries(meses)
        .map(([mes, dados]) => ({
          mes: dados.nome || mes,
          inscricoes: dados.inscricoes,
          contratacoes: dados.contratacoes,
        }))
        .sort((a, b) => a.mes.localeCompare(b.mes));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar distribuição de perfil DISC
 */
function useDistribuicaoDISC(filters: { vagaId?: string; area?: string }) {
  return useQuery({
    queryKey: ['distribuicao-disc', filters],
    queryFn: async () => {
      let query = supabase
        .from('candidaturas')
        .select(`
          id,
          candidato:candidato_id (
            resultados_disc (
              estilo_primario
            )
          ),
          vaga:vaga_id (
            id,
            departamento
          )
        `);

      if (filters.vagaId) {
        query = query.eq('vaga_id', filters.vagaId);
      }

      const { data: candidaturas, error } = await query;

      if (error) throw error;

      let filtered = candidaturas || [];
      if (filters.area && filters.area !== 'todas') {
        filtered = filtered.filter((c: any) => c.vaga?.departamento === filters.area);
      }

      const distribuicao: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };

      filtered.forEach((c: any) => {
        const estilo = c.candidato?.resultados_disc?.[0]?.estilo_primario;
        if (estilo && ['D', 'I', 'S', 'C'].includes(estilo)) {
          distribuicao[estilo]++;
        }
      });

      return Object.entries(distribuicao).map(([nome, valor]) => ({
        nome,
        valor,
        porcentagem: filtered.length > 0 ? (valor / filtered.length) * 100 : 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar distribuição de perfil Big Five
 */
function useDistribuicaoBigFive(filters: { vagaId?: string; area?: string }) {
  return useQuery({
    queryKey: ['distribuicao-bigfive', filters],
    queryFn: async () => {
      let query = supabase
        .from('candidaturas')
        .select(`
          id,
          candidato:candidato_id (
            resultados_big_five (
              abertura,
              conscienciosidade,
              extroversao,
              amabilidade,
              neuroticismo
            )
          ),
          vaga:vaga_id (
            id,
            departamento
          )
        `);

      if (filters.vagaId) {
        query = query.eq('vaga_id', filters.vagaId);
      }

      const { data: candidaturas, error } = await query;

      if (error) throw error;

      let filtered = candidaturas || [];
      if (filters.area && filters.area !== 'todas') {
        filtered = filtered.filter((c: any) => c.vaga?.departamento === filters.area);
      }

      const medias: Record<string, number> = {
        abertura: 0,
        conscienciosidade: 0,
        extroversao: 0,
        amabilidade: 0,
        neuroticismo: 0,
      };

      let contadores: Record<string, number> = {
        abertura: 0,
        conscienciosidade: 0,
        extroversao: 0,
        amabilidade: 0,
        neuroticismo: 0,
      };

      filtered.forEach((c: any) => {
        const resultado = c.candidato?.resultados_big_five?.[0];
        if (resultado) {
          Object.keys(medias).forEach((key) => {
            const valor = resultado[key];
            if (valor !== null && valor !== undefined) {
              medias[key] += valor;
              contadores[key]++;
            }
          });
        }
      });

      return Object.entries(medias).map(([nome, soma]) => ({
        nome: nome.charAt(0).toUpperCase() + nome.slice(1),
        valor: contadores[nome] > 0 ? soma / contadores[nome] : 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar distribuição de score total
 */
function useDistribuicaoScore(filters: { vagaId?: string; area?: string }) {
  return useQuery({
    queryKey: ['distribuicao-score', filters],
    queryFn: async () => {
      let query = supabase
        .from('candidaturas')
        .select(`
          id,
          score_geral,
          vaga:vaga_id (
            id,
            departamento
          )
        `)
        .not('score_geral', 'is', null);

      if (filters.vagaId) {
        query = query.eq('vaga_id', filters.vagaId);
      }

      const { data: candidaturas, error } = await query;

      if (error) throw error;

      let filtered = candidaturas || [];
      if (filters.area && filters.area !== 'todas') {
        filtered = filtered.filter((c: any) => c.vaga?.departamento === filters.area);
      }

      const faixas = [
        { nome: '0-20', min: 0, max: 20, count: 0 },
        { nome: '21-40', min: 21, max: 40, count: 0 },
        { nome: '41-60', min: 41, max: 60, count: 0 },
        { nome: '61-80', min: 61, max: 80, count: 0 },
        { nome: '81-100', min: 81, max: 100, count: 0 },
      ];

      filtered.forEach((c: any) => {
        const score = c.score_geral;
        const faixa = faixas.find((f) => score >= f.min && score <= f.max);
        if (faixa) {
          faixa.count++;
        }
      });

      return faixas.map((f) => ({
        ...f,
        porcentagem: filtered.length > 0 ? (f.count / filtered.length) * 100 : 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar análise de distribuição dos testes de inteligência (Raven)
 */
function useDistribuicaoRaven(filters: { vagaId?: string; area?: string }) {
  return useQuery({
    queryKey: ['distribuicao-raven', filters],
    queryFn: async () => {
      let query = supabase
        .from('candidaturas')
        .select(`
          id,
          candidato:candidato_id (
            resultados_raven (
              percentil
            )
          ),
          vaga:vaga_id (
            id,
            departamento
          )
        `);

      if (filters.vagaId) {
        query = query.eq('vaga_id', filters.vagaId);
      }

      const { data: candidaturas, error } = await query;

      if (error) throw error;

      let filtered = candidaturas || [];
      if (filters.area && filters.area !== 'todas') {
        filtered = filtered.filter((c: any) => c.vaga?.departamento === filters.area);
      }

      const faixas = [
        { nome: '0-25', min: 0, max: 25, count: 0 },
        { nome: '26-50', min: 26, max: 50, count: 0 },
        { nome: '51-75', min: 51, max: 75, count: 0 },
        { nome: '76-100', min: 76, max: 100, count: 0 },
      ];

      filtered.forEach((c: any) => {
        const percentil = c.candidato?.resultados_raven?.[0]?.percentil;
        if (percentil !== null && percentil !== undefined) {
          const faixa = faixas.find((f) => percentil >= f.min && percentil <= f.max);
          if (faixa) {
            faixa.count++;
          }
        }
      });

      return faixas.map((f) => ({
        ...f,
        porcentagem: filtered.length > 0 ? (f.count / filtered.length) * 100 : 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar candidatos por vaga/qualificados
 */
function useCandidatosPorVaga(filters: { vagaId?: string; area?: string }) {
  return useQuery({
    queryKey: ['candidatos-por-vaga', filters],
    queryFn: async () => {
      let query = supabase
        .from('candidaturas')
        .select(`
          id,
          score_geral,
          vaga:vaga_id (
            id,
            titulo,
            departamento
          )
        `);

      if (filters.vagaId) {
        query = query.eq('vaga_id', filters.vagaId);
      }

      const { data: candidaturas, error } = await query;

      if (error) throw error;

      let filtered = candidaturas || [];
      if (filters.area && filters.area !== 'todas') {
        filtered = filtered.filter((c: any) => c.vaga?.departamento === filters.area);
      }

      // Agrupar por vaga
      const porVaga: Record<string, { titulo: string; total: number; qualificados: number }> = {};

      filtered.forEach((c: any) => {
        const vagaId = c.vaga?.id;
        const titulo = c.vaga?.titulo || 'Sem título';
        const score = c.score_geral || 0;

        if (!porVaga[vagaId]) {
          porVaga[vagaId] = { titulo, total: 0, qualificados: 0 };
        }

        porVaga[vagaId].total++;
        if (score >= 70) {
          porVaga[vagaId].qualificados++;
        }
      });

      return Object.entries(porVaga)
        .map(([id, dados]) => ({
          id,
          ...dados,
          taxaQualificacao: dados.total > 0 ? (dados.qualificados / dados.total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10); // Top 10
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar funil de conversão
 */
function useFunilConversao(filters: { vagaId?: string; area?: string }) {
  return useQuery({
    queryKey: ['funil-conversao', filters],
    queryFn: async () => {
      let query = supabase
        .from('candidaturas')
        .select(`
          id,
          etapa_atual,
          status,
          vaga:vaga_id (
            id,
            departamento
          )
        `);

      if (filters.vagaId) {
        query = query.eq('vaga_id', filters.vagaId);
      }

      const { data: candidaturas, error } = await query;

      if (error) throw error;

      let filtered = candidaturas || [];
      if (filters.area && filters.area !== 'todas') {
        filtered = filtered.filter((c: any) => c.vaga?.departamento === filters.area);
      }

      const etapas = [
        { nome: 'Inscrições', valor: filtered.length },
        { nome: 'Formulário', valor: 0 },
        { nome: 'Testes', valor: 0 },
        { nome: 'Entrevista', valor: 0 },
        { nome: 'Aprovados', valor: 0 },
      ];

      filtered.forEach((c: any) => {
        // Formulário enviado
        if (['bigfive', 'disc', 'raven', 'cultura', 'entrevista_online', 'entrevista_presencial', 'aprovado'].includes(c.etapa_atual)) {
          etapas[1].valor++;
        }
        // Testes completos
        if (['entrevista_online', 'entrevista_presencial', 'aprovado'].includes(c.etapa_atual)) {
          etapas[2].valor++;
        }
        // Entrevista
        if (['entrevista_presencial', 'aprovado'].includes(c.etapa_atual)) {
          etapas[3].valor++;
        }
        // Aprovados
        if (c.status === 'aprovado_proxima' || c.etapa_atual === 'aprovado') {
          etapas[4].valor++;
        }
      });

      return etapas;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar lista de vagas para filtro
 */
function useVagasList() {
  return useQuery({
    queryKey: ['vagas-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vagas')
        .select('id, titulo')
        .eq('status', 'ativa')
        .is('deleted_at', null)
        .order('titulo');

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para buscar áreas únicas para filtro
 */
function useAreasList() {
  return useQuery({
    queryKey: ['areas-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vagas')
        .select('departamento')
        .not('departamento', 'is', null)
        .eq('status', 'ativa')
        .is('deleted_at', null);

      if (error) throw error;

      const areasUnicas = Array.from(
        new Set((data || []).map((v: any) => v.departamento).filter(Boolean))
      ) as string[];

      return areasUnicas.sort();
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function RelatoriosRHPage() {
  const [filters, setFilters] = useState<{ vagaId?: string; area?: string }>({
    vagaId: undefined,
    area: 'todas',
  });

  const { data: stats, isLoading: isLoadingStats } = useRelatoriosStats(filters);
  const { data: evolucao, isLoading: isLoadingEvolucao } = useEvolucaoInscricoes(filters);
  const { data: distribuicaoDISC, isLoading: isLoadingDISC } = useDistribuicaoDISC(filters);
  const { data: distribuicaoBigFive, isLoading: isLoadingBigFive } = useDistribuicaoBigFive(filters);
  const { data: distribuicaoScore, isLoading: isLoadingScore } = useDistribuicaoScore(filters);
  const { data: distribuicaoRaven, isLoading: isLoadingRaven } = useDistribuicaoRaven(filters);
  const { data: candidatosPorVaga, isLoading: isLoadingPorVaga } = useCandidatosPorVaga(filters);
  const { data: funil, isLoading: isLoadingFunil } = useFunilConversao(filters);
  const { data: vagasList } = useVagasList();
  const { data: areasList } = useAreasList();

  const isLoading =
    isLoadingStats ||
    isLoadingEvolucao ||
    isLoadingDISC ||
    isLoadingBigFive ||
    isLoadingScore ||
    isLoadingRaven ||
    isLoadingPorVaga ||
    isLoadingFunil;

  return (
    <RHLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-white drop-shadow-lg text-3xl font-medium">
              📊 Relatórios e Analytics
            </h1>
            <p className="text-white/80 text-lg font-normal drop-shadow-md">
              Análise completa do processo de recrutamento
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Glass variant="white" blur="xl" className="p-6 rounded-2xl">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter size={20} className="text-white drop-shadow-sm" />
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filters.vagaId || 'todas'}
                onValueChange={(value) =>
                  setFilters({ ...filters, vagaId: value === 'todas' ? undefined : value })
                }
              >
                <SelectTrigger className="bg-white/90 backdrop-blur-sm border-white/30 text-gray-900 hover:bg-white hover:border-[#35BFAD]/50 hover:shadow-lg hover:shadow-[#35BFAD]/20 transition-all duration-200 cursor-pointer font-normal">
                  <SelectValue placeholder="Todas as vagas" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-md border-white/30">
                  <SelectItem value="todas" className="text-gray-900 hover:bg-[#35BFAD]/10 hover:text-[#00109E] cursor-pointer transition-colors duration-200 font-normal">
                    Todas as vagas
                  </SelectItem>
                  {vagasList?.map((vaga: any) => (
                    <SelectItem key={vaga.id} value={vaga.id} className="text-gray-900 hover:bg-[#35BFAD]/10 hover:text-[#00109E] cursor-pointer transition-colors duration-200 font-normal">
                      {vaga.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filters.area || 'todas'}
                onValueChange={(value) =>
                  setFilters({ ...filters, area: value === 'todas' ? undefined : value })
                }
              >
                <SelectTrigger className="bg-white/90 backdrop-blur-sm border-white/30 text-gray-900 hover:bg-white hover:border-[#35BFAD]/50 hover:shadow-lg hover:shadow-[#35BFAD]/20 transition-all duration-200 cursor-pointer font-normal">
                  <SelectValue placeholder="Todas as áreas" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-md border-white/30">
                  <SelectItem value="todas" className="text-gray-900 hover:bg-[#35BFAD]/10 hover:text-[#00109E] cursor-pointer transition-colors duration-200 font-normal">
                    Todas as áreas
                  </SelectItem>
                  {areasList?.map((area: string) => (
                    <SelectItem key={area} value={area} className="text-gray-900 hover:bg-[#35BFAD]/10 hover:text-[#00109E] cursor-pointer transition-colors duration-200 font-normal">
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Glass>

        {/* Big Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={<Users size={48} />}
            value={stats?.totalCandidatos.toString() || '0'}
            label="Total de Candidatos"
            variant="primary"
          />
          <MetricCard
            icon={<Target size={48} />}
            value={stats?.scoreMedio.toFixed(1) || '0'}
            label="Score Médio"
            variant="success"
          />
          <MetricCard
            icon={<Clock size={48} />}
            value={stats?.diasMediosContratacao.toString() || '0'}
            label="Dias para Contratar"
            variant="warning"
          />
          <MetricCard
            icon={<TrendingUp size={48} />}
            value={`${stats?.taxaQualificacao.toFixed(1)}%` || '0%'}
            label="Taxa de Qualificação"
            variant="info"
          />
        </div>

        {/* Gráfico: Evolução de Inscrições e Contratações */}
        <Glass variant="white" blur="xl" className="p-6 rounded-2xl group">
          <h2 className="text-white drop-shadow-md text-xl font-medium mb-6 flex items-center gap-2">
            <LineChart size={24} />
            Evolução de Inscrições e Contratações
          </h2>
          {isLoadingEvolucao ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : evolucao && evolucao.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                />
                <YAxis tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ 
                    stroke: '#35BFAD', 
                    strokeWidth: 2, 
                    strokeDasharray: '8 4',
                    opacity: 0.5,
                    strokeLinecap: 'round',
                  }}
                  animationDuration={150}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="inscricoes"
                  stackId="1"
                  stroke={CHART_COLORS.primary}
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.6}
                  name="Inscrições"
                />
                <Area
                  type="monotone"
                  dataKey="contratacoes"
                  stackId="1"
                  stroke={CHART_COLORS.success}
                  fill={CHART_COLORS.success}
                  fillOpacity={0.6}
                  name="Contratações"
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-white/60">
              Nenhum dado disponível
            </div>
          )}
        </Glass>

        {/* Gráficos lado a lado: DISC e Big Five */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição DISC */}
          <Glass variant="white" blur="xl" className="p-6 rounded-2xl group">
            <h2 className="text-white drop-shadow-md text-xl font-medium mb-6 flex items-center gap-2">
              <PieChart size={24} />
              Distribuição de Perfil DISC
            </h2>
            {isLoadingDISC ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : distribuicaoDISC && distribuicaoDISC.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                  <Pie
                    data={distribuicaoDISC}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ nome, porcentagem }) => `${nome}: ${porcentagem.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="valor"
                  >
                    {distribuicaoDISC.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DISC_COLORS[entry.nome as keyof typeof DISC_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 16, 158, 0.95)',
                      border: '1px solid rgba(53, 191, 173, 0.3)',
                      borderRadius: '12px',
                      color: '#fff',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                      backdropFilter: 'blur(10px)',
                      padding: '12px 16px',
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 500, marginBottom: '4px' }}
                    itemStyle={{ color: '#fff', fontWeight: 400 }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-white/60">
                Nenhum dado disponível
              </div>
            )}
          </Glass>

          {/* Distribuição Big Five */}
          <Glass variant="white" blur="xl" className="p-6 rounded-2xl group">
            <h2 className="text-white drop-shadow-md text-xl font-medium mb-6 flex items-center gap-2">
              <BarChart3 size={24} />
              Distribuição de Perfil Big Five
            </h2>
            {isLoadingBigFive ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : distribuicaoBigFive && distribuicaoBigFive.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribuicaoBigFive}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="nome"
                    tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                  />
                  <YAxis tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ 
                      stroke: '#35BFAD', 
                      strokeWidth: 2, 
                      strokeDasharray: '8 4',
                      opacity: 0.5,
                      strokeLinecap: 'round',
                    }}
                    animationDuration={150}
                    allowEscapeViewBox={{ x: false, y: false }}
                  />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                    {distribuicaoBigFive.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BIG_FIVE_COLORS[entry.nome.toLowerCase() as keyof typeof BIG_FIVE_COLORS] || CHART_COLORS.primary}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-white/60">
                Nenhum dado disponível
              </div>
            )}
          </Glass>
        </div>

        {/* Gráficos lado a lado: Score Total e Raven */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição de Score Total */}
          <Glass variant="white" blur="xl" className="p-6 rounded-2xl group">
            <h2 className="text-white drop-shadow-md text-xl font-medium mb-6 flex items-center gap-2">
              <Activity size={24} />
              Distribuição de Score Total
            </h2>
            {isLoadingScore ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : distribuicaoScore && distribuicaoScore.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribuicaoScore}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="nome"
                    tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                  />
                  <YAxis tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ 
                      stroke: '#35BFAD', 
                      strokeWidth: 2, 
                      strokeDasharray: '8 4',
                      opacity: 0.5,
                      strokeLinecap: 'round',
                    }}
                    animationDuration={150}
                    allowEscapeViewBox={{ x: false, y: false }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill={CHART_COLORS.primary}>
                    {distribuicaoScore.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.count > 0
                            ? entry.nome.includes('81-100')
                              ? CHART_COLORS.success
                              : entry.nome.includes('61-80')
                              ? CHART_COLORS.info
                              : CHART_COLORS.warning
                            : CHART_COLORS.primary
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-white/60">
                Nenhum dado disponível
              </div>
            )}
          </Glass>

          {/* Distribuição Raven */}
          <Glass variant="white" blur="xl" className="p-6 rounded-2xl group">
            <h2 className="text-white drop-shadow-md text-xl font-medium mb-6 flex items-center gap-2">
              <BarChart3 size={24} />
              Análise de Distribuição dos Testes de Inteligência (Raven)
            </h2>
            {isLoadingRaven ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : distribuicaoRaven && distribuicaoRaven.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribuicaoRaven}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="nome"
                    tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                  />
                  <YAxis tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ 
                      stroke: '#35BFAD', 
                      strokeWidth: 2, 
                      strokeDasharray: '8 4',
                      opacity: 0.5,
                      strokeLinecap: 'round',
                    }}
                    animationDuration={150}
                    allowEscapeViewBox={{ x: false, y: false }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill={CHART_COLORS.info}>
                    {distribuicaoRaven.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.nome.includes('76-100')
                            ? CHART_COLORS.success
                            : entry.nome.includes('51-75')
                            ? CHART_COLORS.info
                            : CHART_COLORS.warning
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-white/60">
                Nenhum dado disponível
              </div>
            )}
          </Glass>
        </div>

        {/* Candidatos por Vaga/Qualificados */}
        <Glass variant="white" blur="xl" className="p-6 rounded-2xl group">
          <h2 className="text-white drop-shadow-md text-xl font-medium mb-6 flex items-center gap-2">
            <Users size={24} />
            Candidatos por Vaga / Qualificados
          </h2>
          {isLoadingPorVaga ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : candidatosPorVaga && candidatosPorVaga.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={candidatosPorVaga} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis type="number" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} />
                <YAxis
                  type="category"
                  dataKey="titulo"
                  width={200}
                  tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ 
                    stroke: '#35BFAD', 
                    strokeWidth: 2, 
                    strokeDasharray: '8 4',
                    opacity: 0.5,
                    strokeLinecap: 'round',
                  }}
                  animationDuration={150}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
                <Legend />
                <Bar dataKey="total" fill={CHART_COLORS.primary} name="Total de Candidatos" radius={[0, 8, 8, 0]} />
                <Bar dataKey="qualificados" fill={CHART_COLORS.success} name="Qualificados (≥70)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-white/60">
              Nenhum dado disponível
            </div>
          )}
        </Glass>

        {/* Funil de Conversão */}
        <Glass variant="white" blur="xl" className="p-6 rounded-2xl group">
          <h2 className="text-white drop-shadow-md text-xl font-medium mb-6 flex items-center gap-2">
            <BarChart3 size={24} />
            Funil de Conversão
          </h2>
          {isLoadingFunil ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : funil && funil.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={funil} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis type="number" tick={{ fill: 'rgba(255, 255, 255, 0.8)' }} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={150}
                  tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ 
                    stroke: '#35BFAD', 
                    strokeWidth: 2, 
                    strokeDasharray: '8 4',
                    opacity: 0.5,
                    strokeLinecap: 'round',
                  }}
                  animationDuration={150}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
                <Bar dataKey="valor" fill={CHART_COLORS.primary} radius={[0, 8, 8, 0]}>
                  {funil.map((entry, index) => {
                    const porcentagem =
                      funil[0].valor > 0 ? (entry.valor / funil[0].valor) * 100 : 0;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          porcentagem >= 80
                            ? CHART_COLORS.success
                            : porcentagem >= 50
                            ? CHART_COLORS.info
                            : porcentagem >= 25
                            ? CHART_COLORS.warning
                            : CHART_COLORS.danger
                        }
                      />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
            </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-white/60">
            Nenhum dado disponível
          </div>
        )}
      </Glass>
    </div>
  </RHLayout>
  );
}

