import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RHLayout } from '../RHLayout';
import { Glass, GlassButton } from '../ui/glass';
import {
  Plus,
  Search,
  MapPin,
  Briefcase,
  Calendar,
  Users,
  ClipboardList,
  CheckCircle,
  Edit,
  MoreVertical,
  Eye,
  Copy,
  Pause,
  Play,
  Archive,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useVagas } from '@/features/vagas/hooks/useVagas';
import { supabase } from '@/lib/supabase/client';
import { formatarLocalizacaoVaga } from '@/features/vagas/types/vagasTypes';

type StatusVaga = 'ativa' | 'inativa' | 'rascunho';
type FiltroVaga = 'todas' | 'ativas' | 'inativas' | 'rascunhos';

interface Vaga {
  id: number;
  titulo: string;
  localizacao: string;
  tipoContrato: string;
  modalidade: string;
  publicadaEm: string;
  status: StatusVaga;
  candidatos: {
    total: number;
    emAnalise: number;
    aprovados: number;
  };
}

export function VagasRHPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroVaga>('todas');
  const [busca, setBusca] = useState('');

  // Buscar vagas do banco de dados (incluindo todas - ativas, inativas, rascunhos)
  const { data: vagasData, isLoading, error } = useVagas(
    { apenasAtivas: false }, // Buscar TODAS as vagas, filtrar no client
    'mais_recentes',
    { page: 1, limit: 100 } // Aumentar limit para mostrar todas
  );

  // Mutations
  const pausarAtivarMutation = useMutation({
    mutationFn: async ({ vagaId, statusAtual }: { vagaId: string; statusAtual: string }) => {
      // Toggle entre 'ativa' e 'inativa'
      const novoStatus = statusAtual === 'ativa' ? 'inativa' : 'ativa';

      const { data, error } = await supabase
        .from('vagas')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', vagaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vagas'] });
      toast.success('Status da vaga atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar status da vaga:', error);
      toast.error('Erro ao atualizar status da vaga');
    },
  });

  const duplicarMutation = useMutation({
    mutationFn: async (vagaId: string) => {
      // Buscar vaga original
      const { data: vagaOriginal, error: fetchError } = await supabase
        .from('vagas')
        .select('*')
        .eq('id', vagaId)
        .single();

      if (fetchError || !vagaOriginal) throw fetchError || new Error('Vaga não encontrada');

      // Criar cópia (removendo campos que não devem ser copiados)
      const { id, created_at, updated_at, deleted_at, ...vagaData } = vagaOriginal as any;

      // Gerar slug único para evitar conflito de constraint
      const timestamp = Date.now();
      const slugUnico = `${vagaData.slug}-copia-${timestamp}`;

      const vagaDuplicada = {
        ...vagaData,
        titulo: `${vagaOriginal.titulo} (Cópia)`,
        slug: slugUnico, // Slug único com timestamp
        status: 'inativa', // Duplicatas começam inativas
      };

      const { data, error: insertError } = await supabase
        .from('vagas')
        .insert(vagaDuplicada as any)
        .select('id')
        .single();

      if (insertError || !data) throw insertError || new Error('Erro ao criar duplicata');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vagas'] });
      toast.success('Vaga duplicada com sucesso!');
      // Navegar para edição da vaga duplicada
      navigate(`/rh/vagas/${data.id}/editar`);
    },
    onError: (error: any) => {
      console.error('Erro ao duplicar vaga:', error);
      toast.error('Erro ao duplicar vaga');
    },
  });

  const arquivarMutation = useMutation({
    mutationFn: async (vagaId: string) => {
      const { data, error } = await supabase
        .from('vagas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', vagaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vagas'] });
      toast.success('Vaga arquivada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao arquivar vaga:', error);
      toast.error('Erro ao arquivar vaga');
    },
  });

  // Mapear dados do banco para interface do componente
  const vagas: Vaga[] = (vagasData?.data || []).map((vagaDB) => {
    // Calcular dias desde publicação
    const diasPublicacao = vagaDB.created_at
      ? Math.floor((Date.now() - new Date(vagaDB.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const publicadaEm = diasPublicacao === 0
      ? 'Hoje'
      : diasPublicacao === 1
      ? '1 dia'
      : diasPublicacao < 7
      ? `${diasPublicacao} dias`
      : diasPublicacao < 14
      ? '1 semana'
      : diasPublicacao < 30
      ? `${Math.floor(diasPublicacao / 7)} semanas`
      : diasPublicacao < 60
      ? '1 mês'
      : `${Math.floor(diasPublicacao / 30)} meses`;

    // Status vem diretamente do banco (campo status: 'ativa' | 'inativa' | 'rascunho')
    const status: StatusVaga = (vagaDB.status as StatusVaga) || 'inativa';

    return {
      id: vagaDB.id as any, // Converter UUID para number para compatibilidade
      titulo: vagaDB.titulo || 'Sem título',
      localizacao: vagaDB.localizacao || 'Não especificado',
      tipoContrato: vagaDB.tipo_vaga || 'CLT',
      modalidade: vagaDB.modelo_trabalho || 'Presencial',
      publicadaEm,
      status,
      candidatos: {
        total: vagaDB.totalCandidatos || 0,
        emAnalise: vagaDB.candidatosEmAnalise || 0,
        aprovados: vagaDB.candidatosAprovados || 0,
      },
    };
  });

  // Filtrar vagas
  const vagasFiltradas = vagas.filter((vaga) => {
    // Filtro por status
    const passaFiltroStatus =
      filtroAtivo === 'todas' ||
      (filtroAtivo === 'ativas' && vaga.status === 'ativa') ||
      (filtroAtivo === 'inativas' && vaga.status === 'inativa') ||
      (filtroAtivo === 'rascunhos' && vaga.status === 'rascunho');

    // Filtro por busca
    const localizacao = formatarLocalizacaoVaga(vaga)
    const passaBusca =
      busca === '' ||
      vaga.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      localizacao.toLowerCase().includes(busca.toLowerCase());

    return passaFiltroStatus && passaBusca;
  });

  const getStatusBadge = (status: StatusVaga) => {
    switch (status) {
      case 'ativa':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
            🟢 Ativa
          </Badge>
        );
      case 'inativa':
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30">
            ⚪ Inativa
          </Badge>
        );
      case 'rascunho':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
            🟡 Rascunho
          </Badge>
        );
    }
  };

  const handlePausarAtivar = (vaga: Vaga) => {
    const vagaDB = vagasData?.data.find(v => v.id === vaga.id);
    if (!vagaDB) {
      toast.error('Vaga não encontrada');
      return;
    }
    pausarAtivarMutation.mutate({ vagaId: vaga.id.toString(), statusAtual: vagaDB.status });
  };

  const handleEditar = (vaga: Vaga) => {
    // Navegar para página de edição com rota parametrizada
    navigate(`/rh/vagas/${vaga.id}/editar`);
  };

  const handleGerenciar = (vaga: Vaga) => {
    // Navegar para página de candidatos da vaga
    navigate(`/rh/vagas/${vaga.id}/candidatos`);
  };

  const handleDuplicar = (vaga: Vaga) => {
    duplicarMutation.mutate(vaga.id.toString());
  };

  const handleArquivar = (vaga: Vaga) => {
    if (confirm(`Tem certeza que deseja arquivar a vaga "${vaga.titulo}"? Esta ação não pode ser desfeita facilmente.`)) {
      arquivarMutation.mutate(vaga.id.toString());
    }
  };

  // Estados de loading e erro
  if (isLoading) {
    return (
      <RHLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white drop-shadow-lg">Carregando vagas...</p>
          </div>
        </div>
      </RHLayout>
    );
  }

  if (error) {
    return (
      <RHLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Glass variant="white" blur="lg" className="p-8 rounded-xl max-w-md text-center">
            <p className="text-red-200 drop-shadow-lg mb-4">Erro ao carregar vagas:</p>
            <p className="text-white drop-shadow-lg">{error.message}</p>
          </Glass>
        </div>
      </RHLayout>
    );
  }

  return (
    <RHLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <Glass variant="white" blur="lg" className="p-8 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-white drop-shadow-lg text-3xl flex items-center gap-3">
              📋 Vagas
              <span className="text-white/60 text-2xl">({vagas.length})</span>
            </h1>
            <GlassButton
              variant="primary"
              className="flex items-center gap-2"
              onClick={() => navigate('/rh/vagas/nova')}
            >
              <Plus className="w-5 h-5" />
              Nova Vaga
            </GlassButton>
          </div>

          {/* BUSCA */}
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <Input
                  type="text"
                  placeholder="Buscar vaga..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="flex gap-3">
            <GlassButton
              variant={filtroAtivo === 'todas' ? 'primary' : 'ghost'}
              onClick={() => setFiltroAtivo('todas')}
              className="transition-all duration-200"
            >
              Todas
            </GlassButton>
            <GlassButton
              variant={filtroAtivo === 'ativas' ? 'primary' : 'ghost'}
              onClick={() => setFiltroAtivo('ativas')}
              className="transition-all duration-200"
            >
              Ativas
            </GlassButton>
            <GlassButton
              variant={filtroAtivo === 'inativas' ? 'primary' : 'ghost'}
              onClick={() => setFiltroAtivo('inativas')}
              className="transition-all duration-200"
            >
              Inativas
            </GlassButton>
            <GlassButton
              variant={filtroAtivo === 'rascunhos' ? 'primary' : 'ghost'}
              onClick={() => setFiltroAtivo('rascunhos')}
              className="transition-all duration-200"
            >
              Rascunhos
            </GlassButton>
          </div>
        </Glass>

        {/* GRID DE CARDS */}
        {vagasFiltradas.length === 0 ? (
          <Glass variant="white" blur="lg" className="p-12 rounded-xl text-center">
            <p className="text-white/60 drop-shadow-sm">
              Nenhuma vaga encontrada com os filtros selecionados.
            </p>
          </Glass>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {vagasFiltradas.map((vaga) => (
              <Glass
                key={vaga.id}
                variant="white"
                blur="lg"
                className="p-6 rounded-xl"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-white drop-shadow-md text-xl flex items-center gap-2">
                    📌 {vaga.titulo}
                  </h3>
                  {getStatusBadge(vaga.status)}
                </div>

                {/* Informações */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-white/80 drop-shadow-sm text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{formatarLocalizacaoVaga(vaga)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80 drop-shadow-sm text-sm">
                    <Briefcase className="w-4 h-4" />
                    <span>
                      {vaga.tipoContrato} • {vaga.modalidade}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80 drop-shadow-sm text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>Publicada há {vaga.publicadaEm}</span>
                  </div>
                </div>

                {/* Métricas */}
                {vaga.status !== 'rascunho' && (
                  <Glass variant="white" blur="sm" className="p-4 rounded-lg mb-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/80 drop-shadow-sm text-sm">
                          <Users className="w-5 h-5" />
                          <span>Candidatos</span>
                        </div>
                        <span className="text-white drop-shadow-sm">{vaga.candidatos.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/80 drop-shadow-sm text-sm">
                          <ClipboardList className="w-5 h-5" />
                          <span>Em análise</span>
                        </div>
                        <span className="text-white drop-shadow-sm">{vaga.candidatos.emAnalise}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/80 drop-shadow-sm text-sm">
                          <CheckCircle className="w-5 h-5" />
                          <span>Aprovados</span>
                        </div>
                        <span className="text-white drop-shadow-sm">{vaga.candidatos.aprovados}</span>
                      </div>
                    </div>
                  </Glass>
                )}

                {/* Botões de Ação */}
                <div className="flex items-center gap-3">
                  <GlassButton
                    variant="secondary"
                    className="flex-1 text-white flex items-center justify-center gap-2 font-medium"
                    onClick={() => handleGerenciar(vaga)}
                  >
                    <Eye className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Gerenciar</span>
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    className="flex-1 text-white flex items-center justify-center gap-2 font-medium"
                    onClick={() => handleEditar(vaga)}
                  >
                    <Edit className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Editar</span>
                  </GlassButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 p-0 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl backdrop-blur-md"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white z-50"
                    >
                      <DropdownMenuItem
                        onClick={() => handleGerenciar(vaga)}
                        className="cursor-pointer hover:bg-white/10"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEditar(vaga)}
                        className="cursor-pointer hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicar(vaga)}
                        className="cursor-pointer hover:bg-white/10"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/20" />
                      <DropdownMenuItem
                        onClick={() => handlePausarAtivar(vaga)}
                        className="cursor-pointer hover:bg-white/10"
                      >
                        {vaga.status === 'ativa' ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleArquivar(vaga)}
                        className="cursor-pointer hover:bg-white/10 text-red-400"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Arquivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Glass>
            ))}
          </div>
        )}
      </div>
    </RHLayout>
  );
}
