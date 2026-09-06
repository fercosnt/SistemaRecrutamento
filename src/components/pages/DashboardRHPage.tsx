import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RHLayout } from '../RHLayout';
import { MetricCard } from '../MetricCard';
import { Glass, GlassButton } from '../ui/glass';
import {
  Briefcase,
  Users,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useVagas } from '@/features/vagas/hooks/useVagas';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { formatarLocalizacaoVaga } from '@/features/vagas/types/vagasTypes';

/**
 * Hook personalizado para buscar estatísticas do RH
 * - Total de vagas ativas
 * - Total de candidaturas
 * - Candidaturas aprovadas
 * - Candidaturas em análise
 */
function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Contar vagas ativas.
      //
      // ⚠ ATÉ 2026-08-26 ESTA QUERY FILTRAVA POR `.eq('ativa', true)` — e a coluna
      // `ativa` NÃO EXISTE em `public.vagas`. O status mora em `status`
      // (status_vaga: rascunho | ativa | inativa | arquivada).
      //
      // O PostgREST devolve erro para coluna inexistente, o `error` era DESCARTADO
      // (`const { count }` sem `error`), `count` vinha null, e o `|| 0` do render
      // pintava um ZERO PLAUSÍVEL. O card dizia "0 Vagas Ativas" com três vagas
      // ativas listadas logo abaixo na mesma tela.
      //
      // É o mesmo modo de falha que já mordeu esta base em
      // `analise-candidato-individual` (colunas `descricao`/`requisitos`
      // inexistentes, `error` descartado, IA analisando sem contexto da vaga por
      // sete análises). Ali e aqui: **descartar o `error` transforma consulta
      // quebrada em resposta vazia plausível**, que é pior que um erro na tela.
      // Por isso este bloco lê o `error` e o registra.
      const { count: vagasAtivas, error: erroVagas } = await supabase
        .from('vagas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativa')
        .is('deleted_at', null);

      if (erroVagas) {
        console.error('[dashboard-rh] contagem de vagas ativas falhou', erroVagas);
      }

      // As tres contagens abaixo estao CORRETAS hoje (conferidas contra o banco em
      // 2026-08-26: 21 / 0 / 2). Ainda assim leem o `error`: o defeito de cima nao
      // foi errar o nome da coluna, foi o erro ter ficado MUDO. Uma consulta que
      // falha e vira zero plausivel e indistinguivel de um zero verdadeiro.
      const { count: totalCandidaturas, error: erroTotal } = await supabase
        .from('candidaturas')
        .select('*', { count: 'exact', head: true });

      // 2026-09-06: contava `status = 'aprovado_proxima'`, valor do enum que o funil
      // do M2 em diante NUNCA grava (os status vivos sao aguardando_resposta,
      // em_analise, finalizado). A tile dizia "0 Aprovados" com 5 candidaturas em
      // etapa `aprovado` — mesma familia do "0 vagas ativas" de 26/08: filtro sobre
      // um valor que nao existe vira zero plausivel. Aprovado e a ETAPA terminal.
      const { count: aprovados, error: erroAprovados } = await supabase
        .from('candidaturas')
        .select('*', { count: 'exact', head: true })
        .eq('etapa_atual', 'aprovado')
        .is('deleted_at', null);

      const { count: emAnalise, error: erroAnalise } = await supabase
        .from('candidaturas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'em_analise');

      for (const [rotulo, err] of [
        ['total de candidaturas', erroTotal],
        ['aprovados', erroAprovados],
        ['em analise', erroAnalise],
      ] as const) {
        if (err) console.error(`[dashboard-rh] contagem de ${rotulo} falhou`, err);
      }

      return {
        vagasAtivas: vagasAtivas || 0,
        totalCandidaturas: totalCandidaturas || 0,
        aprovados: aprovados || 0,
        emAnalise: emAnalise || 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar candidaturas aguardando análise (em_analise)
 * Com dados do candidato incluídos
 */
function useCandidaturasAguardando() {
  return useQuery({
    queryKey: ['candidaturas-aguardando'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidaturas')
        .select(`
          id,
          status,
          data_candidatura,
          candidato:candidato_id (
            id,
            nome_completo,
            email
          ),
          vaga:vaga_id (
            id,
            titulo
          )
        `)
        .eq('status', 'em_analise')
        .order('data_candidatura', { ascending: false })
        .limit(4);

      if (error) throw error;

      return data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 3 * 60 * 1000,
  });
}

export function DashboardRHPage() {
  const navigate = useNavigate();
  const { user, candidato } = useAuthStore();

  // Nome do usuário (usa nome do candidato se disponível, senão email)
  const userName = candidato?.nome_completo || user?.email?.split('@')[0] || 'Usuário';

  // Buscar dados
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
  const { data: vagasData, isLoading: isLoadingVagas } = useVagas(
    { apenasAtivas: true }, // Dashboard mostra apenas vagas ativas
    'mais_recentes',
    { page: 1, limit: 3 }
  );
  const { data: candidaturasAguardando, isLoading: isLoadingCandidaturas } = useCandidaturasAguardando();

  const vagas = vagasData?.data || [];
  const candidatos = candidaturasAguardando || [];

  // Calcular dias desde publicação
  const getDiasPublicacao = (createdAt: string) => {
    const dias = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (dias === 0) return 'Hoje';
    if (dias === 1) return '1 dia';
    return `${dias} dias`;
  };

  // Calcular dias aguardando
  const getDiasAguardando = (dataCandidatura: string) => {
    return Math.floor((Date.now() - new Date(dataCandidatura).getTime()) / (1000 * 60 * 60 * 24));
  };

  // Loading state
  const isLoading = isLoadingStats || isLoadingVagas || isLoadingCandidaturas;

  if (isLoading) {
    return (
      <RHLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white drop-shadow-lg">Carregando dashboard...</p>
          </div>
        </div>
      </RHLayout>
    );
  }

  return (
    <RHLayout>
      <div className="space-y-8">
        {/* Header com saudação */}
        <div className="space-y-2">
          <h1 className="text-white drop-shadow-lg">
            Olá, {userName} 👋
          </h1>
          <p className="text-white/80 text-xl drop-shadow-md">
            Aqui está um resumo do seu recrutamento
          </p>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={<Briefcase size={48} />}
            value={stats?.vagasAtivas.toString() || '0'}
            label="Vagas Ativas"
            variant="primary"
          />
          <MetricCard
            icon={<Users size={48} />}
            value={stats?.totalCandidaturas.toString() || '0'}
            label="Candidatos"
            variant="success"
          />
          <MetricCard
            icon={<CheckCircle size={48} />}
            value={stats?.aprovados.toString() || '0'}
            label="Aprovados"
            variant="success"
          />
          <MetricCard
            icon={<Clock size={48} />}
            value={stats?.emAnalise.toString() || '0'}
            label="Em Análise"
            variant="warning"
          />
        </div>

        {/* Vagas Recentes */}
        <Glass variant="white" blur="xl" className="p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white drop-shadow-md">
              📋 Vagas Recentes
            </h2>
            <button
              onClick={() => navigate('/rh/vagas')}
              className="text-sm text-white/90 hover:text-white transition-colors duration-200 flex items-center gap-2 drop-shadow-sm"
            >
              Ver Todas
              <ArrowRight size={16} />
            </button>
          </div>

          {vagas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60 drop-shadow-sm">Nenhuma vaga ativa no momento</p>
              <GlassButton
                variant="primary"
                onClick={() => navigate('/rh/vagas/nova')}
                className="mt-4"
              >
                Criar Nova Vaga
              </GlassButton>
            </div>
          ) : (
            <div className="space-y-4">
              {vagas.map((vaga) => (
                <Glass
                  key={vaga.id}
                  variant="white"
                  blur="lg"
                  hover
                  className="p-6 rounded-xl transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/rh/vagas/${vaga.id}/candidatos`)}
                >
                  <div className="space-y-4">
                    {/* Header da vaga */}
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">📌</span>
                      <div className="flex-1">
                        <h3 className="text-white text-xl drop-shadow-sm">
                          {vaga.titulo}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-white/70 text-sm drop-shadow-sm">
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {formatarLocalizacaoVaga(vaga)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            💼 {vaga.tipo_vaga || 'CLT'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            Há {getDiasPublicacao(vaga.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats dos candidatos */}
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                      <div className="text-center p-2 md:p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                        <div className="text-2xl text-white drop-shadow-sm">
                          {vaga.totalCandidatos || 0}
                        </div>
                        <div className="text-xs md:text-sm text-white/70 mt-1 drop-shadow-sm break-words">
                          Candidatos
                        </div>
                      </div>
                      <div className="text-center p-2 md:p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                        <div className="text-2xl text-white drop-shadow-sm">
                          -
                        </div>
                        <div className="text-xs md:text-sm text-white/70 mt-1 drop-shadow-sm break-words">
                          Análise
                        </div>
                      </div>
                      <div className="text-center p-2 md:p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                        <div className="text-2xl text-white drop-shadow-sm">
                          -
                        </div>
                        <div className="text-xs md:text-sm text-white/70 mt-1 drop-shadow-sm break-words">
                          Aprovados
                        </div>
                      </div>
                    </div>

                    {/* Botão de ação */}
                    <GlassButton
                      variant="white"
                      className="w-full text-white drop-shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/rh/vagas/${vaga.id}/candidatos`);
                      }}
                    >
                      Gerenciar Vaga →
                    </GlassButton>
                  </div>
                </Glass>
              ))}
            </div>
          )}
        </Glass>

        {/* Candidatos Aguardando Análise */}
        <Glass variant="white" blur="xl" className="p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white drop-shadow-md">
              🎯 Candidatos Aguardando Análise
            </h2>
            <button
              onClick={() => navigate('/rh/candidatos')}
              className="text-sm text-white/90 hover:text-white transition-colors duration-200 flex items-center gap-2 drop-shadow-sm"
            >
              Ver Todos
              <ArrowRight size={16} />
            </button>
          </div>

          {candidatos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60 drop-shadow-sm">Nenhum candidato aguardando análise</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidatos.map((candidatura: any) => {
                const candidato = candidatura.candidato;
                const vaga = candidatura.vaga;
                const initials = candidato?.nome_completo
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || '??';

                return (
                  <Glass
                    key={candidatura.id}
                    variant="white"
                    blur="lg"
                    hover
                    className="p-5 rounded-xl transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(`/rh/candidatos/${candidato?.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 text-white drop-shadow-md">
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white truncate drop-shadow-sm">
                          {candidato?.nome_completo || 'Nome não disponível'}
                        </h4>
                        <p className="text-sm text-white/70 truncate drop-shadow-sm">
                          {vaga?.titulo || 'Vaga não disponível'}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-white/60 drop-shadow-sm">
                            {getDiasAguardando(candidatura.data_candidatura)}d aguardando
                          </span>
                        </div>
                      </div>

                      {/* Botão de ação */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/rh/candidatos/${candidato?.id}`);
                        }}
                        className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-all duration-200 flex-shrink-0 drop-shadow-sm backdrop-blur-sm"
                      >
                        Analisar
                      </button>
                    </div>
                  </Glass>
                );
              })}
            </div>
          )}
        </Glass>
      </div>
    </RHLayout>
  );
}
