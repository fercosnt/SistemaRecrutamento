import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Briefcase, Clock, CheckCircle2, AlertCircle, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Glass, GlassPanel, GlassCard, GlassButton } from '../ui/glass';
import { useAuthStore, useCandidato } from '@/store/authStore';
import { useCandidaturas, useCandidaturasCount } from '@/features/vagas/hooks';
import type { CandidaturasFilters, Candidatura } from '@/features/vagas/types/vagasTypes';
import { funilNavMap } from '@/lib/navegacao/funilNavMap';
import type { EtapaFunilM2 } from '@/features/triagem/services/triagemService';

export function DashboardCandidatoPage() {
  const navigate = useNavigate();
  const candidato = useCandidato();
  const { logout } = useAuthStore();

  // Estado para filtro de candidaturas
  const [statusFilter, setStatusFilter] = useState<CandidaturasFilters['status'] | 'todas'>('todas');

  // Preparar filtros para a query
  const filters: CandidaturasFilters | undefined = statusFilter !== 'todas'
    ? { status: statusFilter }
    : undefined;

  // Hooks para buscar candidaturas
  const { data: candidaturasData, isLoading: isLoadingCandidaturas, error: candidaturasError } = useCandidaturas(
    filters,
    'mais_recentes',
    { page: 1, limit: 50 }
  );
  const counts = useCandidaturasCount();

  /**
   * Handler para logout do candidato
   * - Chama authStore.logout() para limpar sessão
   * - Mostra toast de sucesso
   * - Redireciona para página de login
   */
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Você saiu da sua conta com sucesso', {
        description: 'Até breve!',
      });
      navigate('/auth/login', { replace: true });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao sair', {
        description: 'Tente novamente.',
      });
    }
  };

  /**
   * Handler para navegar para detalhes da vaga
   */
  const handleVerVaga = (vagaId: string) => {
    navigate(`/vagas/${vagaId}`);
  };

  /**
   * Helper para obter ícone e cor do status
   */
  const getStatusInfo = (status: string | null | undefined) => {
    switch (status) {
      case 'aguardando_resposta':
        return { icon: FileText, color: 'text-blue-300', bg: 'bg-blue-500/20', label: 'Aguardando Resposta' };
      case 'em_analise':
        return { icon: Clock, color: 'text-yellow-300', bg: 'bg-yellow-500/20', label: 'Em Análise' };
      case 'aprovado_proxima':
        return { icon: CheckCircle2, color: 'text-green-300', bg: 'bg-green-500/20', label: 'Aprovado - Próxima Etapa' };
      case 'rejeitado':
        return { icon: AlertCircle, color: 'text-red-300', bg: 'bg-red-500/20', label: 'Rejeitado' };
      case 'finalizado':
        return { icon: CheckCircle2, color: 'text-gray-300', bg: 'bg-gray-500/20', label: 'Finalizado' };
      default:
        return { icon: FileText, color: 'text-gray-300', bg: 'bg-gray-500/20', label: status };
    }
  };

  /**
   * Formatar data para exibição
   */
  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  /**
   * Phase 17 / D-09 — funnel step-CTA derived from the single-source `funilNavMap`.
   *
   * DRIFT GUARD: `candidatura.etapa_atual` is TYPED as the M1 legacy `EtapaProcesso`
   * (vagasTypes.ts) but the runtime DB value is the M2 enum (`avaliacao_assincrona`,
   * …) that `funilNavMap` keys on. We cast/narrow to `EtapaFunilM2`, then guard the
   * lookup: if the map entry is undefined (stale/unknown value) OR there is no
   * candidate-facing route for this stage, fall back to the neutral
   * "Acompanhar candidatura" CTA — never crash, never invent (UI-SPEC).
   *
   * Returns `{ label, destino }`: `destino === null` → neutral CTA.
   */
  const getStepCTA = (
    candidatura: Candidatura,
  ): { label: string; destino: string | null } => {
    const entry = funilNavMap[candidatura.etapa_atual as EtapaFunilM2];
    if (!entry) {
      // Unknown/stale (non-M2) etapa — neutral, no route.
      return { label: 'Acompanhar candidatura', destino: null };
    }
    const destino = entry.rotaCandidato(candidatura.id);
    if (!destino) {
      // Stage has no candidate-facing screen (e.g. triagem) — neutral CTA.
      return { label: 'Acompanhar candidatura', destino: null };
    }
    // UI-SPEC: "Continuar para {label}" — label sourced via ETAPA_M2_LABELS (D-17).
    return { label: `Continuar para ${entry.label}`, destino };
  };

  /**
   * Phase 17 / D-11 — the in-app LGPD card shows only when a FINAL DECISION exists:
   * etapa_atual ∈ {decisao_final, aprovado, rejeitado} AND a decision is present
   * (`data_decisao_final` timestamp, or — for the knockout/rejected path — a
   * persisted `feedback_rejeicao`). The card CTA routes to the LGPD Art. 20
   * explanation screen (`/candidato/explicacao/:candidaturaId`), the only in-app
   * path that exists today (no notification/e-mail infra).
   */
  const hasDecisaoFinal = (candidatura: Candidatura): boolean => {
    const etapasDecisao: ReadonlyArray<EtapaFunilM2> = [
      'decisao_final',
      'aprovado',
      'rejeitado',
    ];
    const etapa = candidatura.etapa_atual as EtapaFunilM2;
    if (!etapasDecisao.includes(etapa)) return false;
    return Boolean(candidatura.data_decisao_final || candidatura.feedback_rejeicao);
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        {/* Barra de navegação superior */}
        <div className="w-full border-b border-white/10 backdrop-blur-md bg-white/5 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Nome do usuário */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium drop-shadow-md">
                    {candidato?.nome_completo || 'Candidato'}
                  </p>
                  <p className="text-white/70 text-sm drop-shadow-sm">
                    {candidato?.email || ''}
                  </p>
                </div>
              </div>

              {/* Botão de Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 backdrop-blur-md transition-all duration-300 hover:shadow-lg active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span className="drop-shadow-sm">Sair</span>
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 space-y-8 mt-8">
          <div className="text-center mb-12">
            <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-4" />
            <h1 className="text-white text-5xl mb-2 drop-shadow-lg">Dashboard de Candidato</h1>
            <p className="text-white/90 text-xl drop-shadow-md">Acompanhe seu progresso no processo seletivo</p>
          </div>

          {/* Estatísticas principais */}
          <GlassPanel variant="white" blur="xl" className="text-white">
            <h2 className="text-3xl mb-6 drop-shadow-md">Suas Candidaturas</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Glass variant="white" blur="lg" className="p-6 text-center">
                <p className="text-4xl mb-2 drop-shadow-md font-bold">{counts.total}</p>
                <p className="text-white/90 drop-shadow-sm text-sm">Total</p>
              </Glass>
              <Glass variant="white" blur="lg" className="p-6 text-center">
                <p className="text-4xl mb-2 drop-shadow-md font-bold text-blue-300">{counts.aguardando}</p>
                <p className="text-white/90 drop-shadow-sm text-sm">Aguardando</p>
              </Glass>
              <Glass variant="white" blur="lg" className="p-6 text-center">
                <p className="text-4xl mb-2 drop-shadow-md font-bold text-yellow-300">{counts.em_analise}</p>
                <p className="text-white/90 drop-shadow-sm text-sm">Em Análise</p>
              </Glass>
              <Glass variant="white" blur="lg" className="p-6 text-center">
                <p className="text-4xl mb-2 drop-shadow-md font-bold text-green-300">{counts.aprovadas}</p>
                <p className="text-white/90 drop-shadow-sm text-sm">Aprovadas</p>
              </Glass>
              <Glass variant="white" blur="lg" className="p-6 text-center">
                <p className="text-4xl mb-2 drop-shadow-md font-bold text-red-300">{counts.rejeitadas}</p>
                <p className="text-white/90 drop-shadow-sm text-sm">Rejeitadas</p>
              </Glass>
              <Glass variant="white" blur="lg" className="p-6 text-center">
                <p className="text-4xl mb-2 drop-shadow-md font-bold text-gray-300">{counts.finalizadas}</p>
                <p className="text-white/90 drop-shadow-sm text-sm">Finalizadas</p>
              </Glass>
            </div>
          </GlassPanel>

          {/* Histórico de Candidaturas */}
          <GlassPanel variant="white" blur="xl" className="text-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl drop-shadow-md">Histórico de Candidaturas</h2>
              <GlassButton
                variant="white"
                onClick={() => navigate('/vagas')}
                className="text-white"
              >
                Ver Vagas Disponíveis
              </GlassButton>
            </div>

            {/* Filtros de Status */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { value: 'todas', label: 'Todas', count: counts.total },
                { value: 'aguardando_resposta', label: 'Aguardando', count: counts.aguardando },
                { value: 'em_analise', label: 'Em Análise', count: counts.em_analise },
                { value: 'aprovado_proxima', label: 'Aprovadas', count: counts.aprovadas },
                { value: 'rejeitado', label: 'Rejeitadas', count: counts.rejeitadas },
                { value: 'finalizado', label: 'Finalizadas', count: counts.finalizadas },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as any)}
                  className={`
                    px-4 py-2 rounded-lg backdrop-blur-md transition-all duration-200
                    ${statusFilter === filter.value
                      ? 'bg-white/30 text-white border-2 border-white/40'
                      : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }
                  `}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Lista de Candidaturas */}
            {isLoadingCandidaturas ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Glass key={i} variant="white" blur="md" className="p-6 animate-pulse">
                    <div className="h-6 bg-white/20 rounded w-2/3 mb-4"></div>
                    <div className="h-4 bg-white/10 rounded w-1/3"></div>
                  </Glass>
                ))}
              </div>
            ) : candidaturasError ? (
              <Glass variant="white" blur="md" className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                <p className="text-white/90 text-lg">Erro ao carregar candidaturas</p>
                <p className="text-white/70 text-sm mt-2">Tente novamente mais tarde</p>
              </Glass>
            ) : !candidaturasData?.data || candidaturasData.data.length === 0 ? (
              <Glass variant="white" blur="md" className="p-12 text-center">
                <Briefcase className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/90 text-xl mb-2">Nenhuma candidatura encontrada</p>
                <p className="text-white/70 mb-6">
                  {statusFilter === 'todas'
                    ? 'Você ainda não se candidatou a nenhuma vaga'
                    : `Você não tem candidaturas com status "${getStatusInfo(statusFilter).label}"`}
                </p>
                <GlassButton
                  variant="white"
                  hover
                  onClick={() => navigate('/vagas')}
                  className="text-white"
                >
                  Explorar Vagas Disponíveis
                </GlassButton>
              </Glass>
            ) : (
              <div className="space-y-4">
                {candidaturasData.data.map((candidatura) => {
                  const statusInfo = getStatusInfo(candidatura.status);
                  const StatusIcon = statusInfo.icon;
                  // Phase 17 / D-09 — funnel step-CTA (drift-guarded) + D-11 LGPD card.
                  const stepCTA = getStepCTA(candidatura);
                  const mostrarLGPD = hasDecisaoFinal(candidatura);

                  return (
                    <GlassCard
                      key={candidatura.id}
                      variant="white"
                      blur="md"
                      hover
                      className="text-white cursor-pointer"
                      onClick={() => handleVerVaga(candidatura.vaga_id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-semibold mb-2 drop-shadow-md">
                            {candidatura.vaga?.titulo || 'Vaga não encontrada'}
                          </h3>

                          <div className="flex flex-wrap gap-4 text-white/80 text-sm mb-3">
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4" />
                              <span>{candidatura.vaga?.departamento?.replace('_', ' ') || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>Aplicado em {formatarData(candidatura.created_at)}</span>
                            </div>
                          </div>

                          {candidatura.etapa_atual && (
                            <p className="text-white/70 text-sm">
                              Etapa atual: <span className="capitalize">{candidatura.etapa_atual.replace('_', ' ')}</span>
                            </p>
                          )}

                          {/* Phase 8 / D-16 — persisted neutral rejection message
                              below the status for rejeitado candidaturas. The
                              criterion is NEVER shown (feedback_rejeicao carries
                              only the single D-15 neutral copy). Muted tone. */}
                          {candidatura.status === 'rejeitado' &&
                            candidatura.feedback_rejeicao && (
                              <div className="mt-3 rounded-lg bg-white/5 border border-white/10 p-3 space-y-1">
                                <p className="text-base text-white/80">
                                  {candidatura.feedback_rejeicao}
                                </p>
                                <p className="text-sm text-white/60">
                                  Agradecemos seu interesse na Beauty Smile.
                                </p>
                              </div>
                            )}
                        </div>

                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusInfo.bg} border border-white/20`}>
                          <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                          <span className={`font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Phase 17 / D-09 — step-guided CTA. The single dominant
                          "Próximo passo" affordance routes (by click) to the
                          pending candidate screen via funilNavMap, or — for stages
                          with no candidate-facing screen / a stale etapa — the
                          neutral "Acompanhar candidatura" fallback. Accent turquoise
                          (#35BFAD) when there is a route, neutral glass otherwise.
                          stopPropagation so the funnel CTA wins over the card's
                          vaga-navigation onClick. */}
                      <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs uppercase tracking-wide text-white/60">
                          Próximo passo
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (stepCTA.destino) navigate(stepCTA.destino);
                          }}
                          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-95 ${
                            stepCTA.destino
                              ? 'bg-[#35BFAD] hover:bg-[#35BFAD]/90 shadow-lg'
                              : 'bg-white/10 hover:bg-white/20 border border-white/20'
                          }`}
                        >
                          {stepCTA.label}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Phase 17 / D-11 — in-app LGPD card. Shown only when a
                          final decision exists. CTA opens the LGPD Art. 20
                          explanation screen (the only in-app path today). */}
                      {mostrarLGPD && (
                        <div
                          className="mt-4 rounded-lg border border-white/15 bg-[#00109E]/40 p-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#35BFAD]" />
                            <div className="flex-1 space-y-1">
                              <p className="text-base font-semibold text-white drop-shadow-sm">
                                Entenda a decisão sobre sua candidatura
                              </p>
                              <p className="text-sm text-white/80">
                                Você tem direito a uma explicação sobre como sua
                                avaliação foi conduzida (LGPD Art. 20).
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/candidato/explicacao/${candidatura.id}`);
                              }}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#35BFAD] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#35BFAD]/90 active:scale-95"
                            >
                              Ver explicação
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </GlassPanel>
        </div>
      </BackgroundImage>
    </div>
  );
}
