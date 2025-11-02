import React, { useState } from 'react';
import { RHLayout } from '../RHLayout';
import { Glass, GlassButton } from '../ui/glass';
import {
  Plus,
  Search,
  Settings,
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

interface VagasRHPageProps {
  onNovaVaga?: () => void;
}

export function VagasRHPage({ onNovaVaga }: VagasRHPageProps = {}) {
  const [currentPage, setCurrentPage] = useState('vagas-rh');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroVaga>('todas');
  const [busca, setBusca] = useState('');

  // Mock data
  const vagas: Vaga[] = [
    {
      id: 1,
      titulo: 'Assistente Odontológico',
      localizacao: 'São Paulo, SP',
      tipoContrato: 'CLT',
      modalidade: 'Presencial',
      publicadaEm: '2 dias',
      status: 'ativa',
      candidatos: {
        total: 8,
        emAnalise: 5,
        aprovados: 3,
      },
    },
    {
      id: 2,
      titulo: 'Recepcionista',
      localizacao: 'Rio de Janeiro, RJ',
      tipoContrato: 'CLT',
      modalidade: 'Presencial',
      publicadaEm: '5 dias',
      status: 'ativa',
      candidatos: {
        total: 15,
        emAnalise: 8,
        aprovados: 4,
      },
    },
    {
      id: 3,
      titulo: 'Auxiliar Administrativo',
      localizacao: 'Belo Horizonte, MG',
      tipoContrato: 'CLT',
      modalidade: 'Híbrido',
      publicadaEm: '1 semana',
      status: 'ativa',
      candidatos: {
        total: 12,
        emAnalise: 7,
        aprovados: 2,
      },
    },
    {
      id: 4,
      titulo: 'Dentista Clínico Geral',
      localizacao: 'São Paulo, SP',
      tipoContrato: 'PJ',
      modalidade: 'Presencial',
      publicadaEm: '3 dias',
      status: 'ativa',
      candidatos: {
        total: 6,
        emAnalise: 4,
        aprovados: 1,
      },
    },
    {
      id: 5,
      titulo: 'Gerente de Clínica',
      localizacao: 'Curitiba, PR',
      tipoContrato: 'CLT',
      modalidade: 'Presencial',
      publicadaEm: '2 semanas',
      status: 'inativa',
      candidatos: {
        total: 20,
        emAnalise: 3,
        aprovados: 8,
      },
    },
    {
      id: 6,
      titulo: 'Ortodontista',
      localizacao: 'Brasília, DF',
      tipoContrato: 'PJ',
      modalidade: 'Presencial',
      publicadaEm: '1 mês',
      status: 'inativa',
      candidatos: {
        total: 9,
        emAnalise: 2,
        aprovados: 3,
      },
    },
    {
      id: 7,
      titulo: 'Auxiliar de Limpeza',
      localizacao: 'São Paulo, SP',
      tipoContrato: 'CLT',
      modalidade: 'Presencial',
      publicadaEm: 'Rascunho',
      status: 'rascunho',
      candidatos: {
        total: 0,
        emAnalise: 0,
        aprovados: 0,
      },
    },
    {
      id: 8,
      titulo: 'Coordenador de Marketing',
      localizacao: 'São Paulo, SP',
      tipoContrato: 'CLT',
      modalidade: 'Remoto',
      publicadaEm: 'Rascunho',
      status: 'rascunho',
      candidatos: {
        total: 0,
        emAnalise: 0,
        aprovados: 0,
      },
    },
    {
      id: 9,
      titulo: 'Analista Financeiro',
      localizacao: 'São Paulo, SP',
      tipoContrato: 'CLT',
      modalidade: 'Híbrido',
      publicadaEm: '4 dias',
      status: 'ativa',
      candidatos: {
        total: 18,
        emAnalise: 12,
        aprovados: 5,
      },
    },
    {
      id: 10,
      titulo: 'Especialista em Implantes',
      localizacao: 'Porto Alegre, RS',
      tipoContrato: 'PJ',
      modalidade: 'Presencial',
      publicadaEm: '1 semana',
      status: 'ativa',
      candidatos: {
        total: 4,
        emAnalise: 3,
        aprovados: 0,
      },
    },
    {
      id: 11,
      titulo: 'Assistente de RH',
      localizacao: 'São Paulo, SP',
      tipoContrato: 'CLT',
      modalidade: 'Presencial',
      publicadaEm: '3 semanas',
      status: 'inativa',
      candidatos: {
        total: 25,
        emAnalise: 5,
        aprovados: 10,
      },
    },
    {
      id: 12,
      titulo: 'Técnico de TI',
      localizacao: 'São Paulo, SP',
      tipoContrato: 'CLT',
      modalidade: 'Híbrido',
      publicadaEm: '6 dias',
      status: 'ativa',
      candidatos: {
        total: 14,
        emAnalise: 9,
        aprovados: 2,
      },
    },
  ];

  // Filtrar vagas
  const vagasFiltradas = vagas.filter((vaga) => {
    // Filtro por status
    const passaFiltroStatus =
      filtroAtivo === 'todas' ||
      (filtroAtivo === 'ativas' && vaga.status === 'ativa') ||
      (filtroAtivo === 'inativas' && vaga.status === 'inativa') ||
      (filtroAtivo === 'rascunhos' && vaga.status === 'rascunho');

    // Filtro por busca
    const passaBusca =
      busca === '' ||
      vaga.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      vaga.localizacao.toLowerCase().includes(busca.toLowerCase());

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
    console.log('Pausar/Ativar vaga:', vaga.id);
  };

  const handleEditar = (vaga: Vaga) => {
    console.log('Editar vaga:', vaga.id);
  };

  const handleGerenciar = (vaga: Vaga) => {
    console.log('Gerenciar candidatos da vaga:', vaga.id);
  };

  const handleDuplicar = (vaga: Vaga) => {
    console.log('Duplicar vaga:', vaga.id);
  };

  const handleArquivar = (vaga: Vaga) => {
    console.log('Arquivar vaga:', vaga.id);
  };

  return (
    <RHLayout currentPage={currentPage} onNavigate={setCurrentPage}>
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
              onClick={onNovaVaga}
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
              <GlassButton variant="ghost" className="h-12 w-12 p-0 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </GlassButton>
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
                className="p-6 rounded-xl hover:bg-white/25 transition-all duration-300"
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
                    <span>{vaga.localizacao}</span>
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
                    variant="ghost"
                    className="flex-1"
                    onClick={() => handleGerenciar(vaga)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Gerenciar
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    className="flex-1"
                    onClick={() => handleEditar(vaga)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </GlassButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <GlassButton variant="ghost" className="w-10 h-10 p-0 flex items-center justify-center">
                        <MoreVertical className="w-5 h-5" />
                      </GlassButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white"
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
