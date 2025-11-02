import React, { useState } from 'react';
import { RHLayout } from '../RHLayout';
import { Glass, GlassButton } from '../ui/glass';
import {
  Search,
  Settings,
  ChevronDown,
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
  GripVertical,
} from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

type StatusType = 'aprovado' | 'investigar' | 'rejeitado' | 'pendente';
type KanbanStage = 'triagem' | 'testes' | 'cultura' | 'entrevista';

interface Candidato {
  id: number;
  nome: string;
  vaga: string;
  avatar: string;
  email: string;
  telefone: string;
  localizacao: string;
  tempo: string;
  status: StatusType;
  kanbanStage?: KanbanStage;
  scores: {
    bigFive: number;
    disc: string;
    inteligencia: number;
    cultura: number;
  };
}

export function CandidatosRHPage() {
  const [currentPage, setCurrentPage] = useState('candidatos-rh');
  const [activeTab, setActiveTab] = useState('todos');
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTodos, setFilterTodos] = useState('todos');
  const [filterVaga, setFilterVaga] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [sortBy, setSortBy] = useState('recentes');
  const [perPage, setPerPage] = useState('20');
  const [selectedVaga, setSelectedVaga] = useState('assistente');
  
  // Estado para Kanban
  const [kanbanCandidatos, setKanbanCandidatos] = useState<Candidato[]>([]);

  // Mock data
  const candidatos: Candidato[] = [
    {
      id: 1,
      nome: 'Maria Silva',
      vaga: 'Assistente Odontológico',
      avatar: 'MS',
      email: 'maria.silva@email.com',
      telefone: '(11) 98765-4321',
      localizacao: 'São Paulo, SP',
      tempo: 'Há 2 horas',
      status: 'aprovado',
      kanbanStage: 'entrevista',
      scores: { bigFive: 78, disc: 'ID', inteligencia: 85, cultura: 82 },
    },
    {
      id: 2,
      nome: 'João Santos',
      vaga: 'Dentista Clínico Geral',
      avatar: 'JS',
      email: 'joao.santos@email.com',
      telefone: '(11) 91234-5678',
      localizacao: 'São Paulo, SP',
      tempo: 'Há 5 horas',
      status: 'investigar',
      kanbanStage: 'testes',
      scores: { bigFive: 65, disc: 'SC', inteligencia: 72, cultura: 68 },
    },
    {
      id: 3,
      nome: 'Ana Costa',
      vaga: 'Recepcionista',
      avatar: 'AC',
      email: 'ana.costa@email.com',
      telefone: '(21) 99876-5432',
      localizacao: 'Rio de Janeiro, RJ',
      tempo: 'Há 1 dia',
      status: 'pendente',
      kanbanStage: 'cultura',
      scores: { bigFive: 92, disc: 'DI', inteligencia: 88, cultura: 95 },
    },
    {
      id: 4,
      nome: 'Pedro Oliveira',
      vaga: 'Assistente Odontológico',
      avatar: 'PO',
      email: 'pedro.oliveira@email.com',
      telefone: '(31) 98765-1234',
      localizacao: 'Belo Horizonte, MG',
      tempo: 'Há 2 dias',
      status: 'aprovado',
      kanbanStage: 'triagem',
      scores: { bigFive: 85, disc: 'CS', inteligencia: 90, cultura: 87 },
    },
    {
      id: 5,
      nome: 'Carla Mendes',
      vaga: 'Recepcionista',
      avatar: 'CM',
      email: 'carla.mendes@email.com',
      telefone: '(11) 97654-3210',
      localizacao: 'São Paulo, SP',
      tempo: 'Há 3 dias',
      status: 'rejeitado',
      kanbanStage: 'testes',
      scores: { bigFive: 55, disc: 'IS', inteligencia: 62, cultura: 58 },
    },
    {
      id: 6,
      nome: 'Lucas Ferreira',
      vaga: 'Dentista Clínico Geral',
      avatar: 'LF',
      email: 'lucas.ferreira@email.com',
      telefone: '(21) 96543-2109',
      localizacao: 'Rio de Janeiro, RJ',
      tempo: 'Há 4 dias',
      status: 'pendente',
      kanbanStage: 'triagem',
      scores: { bigFive: 75, disc: 'DC', inteligencia: 80, cultura: 78 },
    },
    {
      id: 7,
      nome: 'Juliana Alves',
      vaga: 'Assistente Odontológico',
      avatar: 'JA',
      email: 'juliana.alves@email.com',
      telefone: '(11) 99123-4567',
      localizacao: 'São Paulo, SP',
      tempo: 'Há 1 hora',
      status: 'pendente',
      kanbanStage: 'triagem',
      scores: { bigFive: 88, disc: 'IS', inteligencia: 91, cultura: 89 },
    },
    {
      id: 8,
      nome: 'Rafael Lima',
      vaga: 'Recepcionista',
      avatar: 'RL',
      email: 'rafael.lima@email.com',
      telefone: '(31) 98234-5678',
      localizacao: 'Belo Horizonte, MG',
      tempo: 'Há 3 horas',
      status: 'pendente',
      kanbanStage: 'triagem',
      scores: { bigFive: 82, disc: 'SI', inteligencia: 86, cultura: 84 },
    },
    {
      id: 9,
      nome: 'Fernanda Costa',
      vaga: 'Dentista Clínico Geral',
      avatar: 'FC',
      email: 'fernanda.costa@email.com',
      telefone: '(21) 97345-6789',
      localizacao: 'Rio de Janeiro, RJ',
      tempo: 'Há 6 horas',
      status: 'investigar',
      kanbanStage: 'testes',
      scores: { bigFive: 70, disc: 'CD', inteligencia: 75, cultura: 72 },
    },
    {
      id: 10,
      nome: 'Bruno Souza',
      vaga: 'Assistente Odontológico',
      avatar: 'BS',
      email: 'bruno.souza@email.com',
      telefone: '(11) 96456-7890',
      localizacao: 'São Paulo, SP',
      tempo: 'Há 8 horas',
      status: 'aprovado',
      kanbanStage: 'cultura',
      scores: { bigFive: 90, disc: 'DI', inteligencia: 93, cultura: 91 },
    },
    {
      id: 11,
      nome: 'Patrícia Santos',
      vaga: 'Recepcionista',
      avatar: 'PS',
      email: 'patricia.santos@email.com',
      telefone: '(31) 95567-8901',
      localizacao: 'Belo Horizonte, MG',
      tempo: 'Há 10 horas',
      status: 'pendente',
      kanbanStage: 'cultura',
      scores: { bigFive: 79, disc: 'SC', inteligencia: 83, cultura: 81 },
    },
    {
      id: 12,
      nome: 'Rodrigo Oliveira',
      vaga: 'Dentista Clínico Geral',
      avatar: 'RO',
      email: 'rodrigo.oliveira@email.com',
      telefone: '(21) 94678-9012',
      localizacao: 'Rio de Janeiro, RJ',
      tempo: 'Há 12 horas',
      status: 'aprovado',
      kanbanStage: 'entrevista',
      scores: { bigFive: 87, disc: 'ID', inteligencia: 89, cultura: 88 },
    },
  ];

  // Inicializar kanban com os candidatos
  React.useEffect(() => {
    if (kanbanCandidatos.length === 0) {
      setKanbanCandidatos(candidatos);
    }
  }, []);

  const vagas = [
    { id: 'assistente', nome: 'Assistente Odontológico', candidatos: 8 },
    { id: 'dentista', nome: 'Dentista Clínico Geral', candidatos: 12 },
    { id: 'recepcionista', nome: 'Recepcionista', candidatos: 15 },
  ];

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
    console.log('Navegando para:', pageId);
  };

  const handleLogout = () => {
    console.log('Logout');
  };

  const handleVerPerfil = (candidatoId: number) => {
    console.log('Ver perfil do candidato:', candidatoId);
    handleNavigation('perfil-candidato-rh');
  };

  // Função para mover candidato entre colunas
  const moveCandidato = (candidatoId: number, newStage: KanbanStage) => {
    setKanbanCandidatos((prev) =>
      prev.map((c) =>
        c.id === candidatoId ? { ...c, kanbanStage: newStage } : c
      )
    );
  };

  const getStatusBadge = (status: StatusType) => {
    const statusConfig = {
      aprovado: {
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Aprovado',
        className: 'bg-green-500/20 text-green-300 border-green-500/30',
      },
      investigar: {
        icon: <AlertTriangle className="w-3 h-3" />,
        label: 'Investigar',
        className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      },
      rejeitado: {
        icon: <XCircle className="w-3 h-3" />,
        label: 'Rejeitado',
        className: 'bg-red-500/20 text-red-300 border-red-500/30',
      },
      pendente: {
        icon: <Clock className="w-3 h-3" />,
        label: 'Pendente',
        className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      },
    };

    const config = statusConfig[status];
    return (
      <Badge
        variant="outline"
        className={`${config.className} flex items-center gap-1 drop-shadow-sm`}
      >
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // Componente de Card Kanban (mais compacto)
  const KanbanCard = ({ candidato }: { candidato: Candidato }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: 'CANDIDATO',
      item: { id: candidato.id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }));

    const scoreTotal = Math.round(
      (candidato.scores.bigFive +
        candidato.scores.inteligencia +
        candidato.scores.cultura) /
        3
    );

    return (
      <div
        ref={drag}
        className={`${
          isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'
        } transition-all duration-200`}
      >
        <Glass
          variant="white"
          blur="lg"
          hover
          className="p-4 rounded-xl transition-all duration-300"
        >
          <div className="space-y-3">
            {/* Header compacto */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 text-white drop-shadow-md text-sm">
                {candidato.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white drop-shadow-sm text-sm truncate">
                  {candidato.nome}
                </h4>
                <p className="text-xs text-white/60 drop-shadow-sm truncate">
                  {candidato.vaga}
                </p>
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60 drop-shadow-sm">Score:</span>
              <div className="flex items-center gap-2">
                <span className="text-white drop-shadow-sm">{scoreTotal}</span>
                <span className="text-xs text-white/60">/100</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#35BFAD] rounded-full transition-all duration-300"
                style={{ width: `${scoreTotal}%` }}
              />
            </div>

            {/* Status badge pequeno */}
            <div className="flex justify-end">{getStatusBadge(candidato.status)}</div>
          </div>
        </Glass>
      </div>
    );
  };

  // Componente de Coluna Kanban
  const KanbanColumn = ({
    stage,
    title,
    candidatos,
  }: {
    stage: KanbanStage;
    title: string;
    candidatos: Candidato[];
  }) => {
    const [{ isOver }, drop] = useDrop(() => ({
      accept: 'CANDIDATO',
      drop: (item: { id: number }) => {
        moveCandidato(item.id, stage);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }));

    return (
      <div ref={drop} className="flex-1 min-w-[280px]">
        <Glass
          variant="white"
          blur="lg"
          className={`rounded-xl transition-all duration-200 ${
            isOver ? 'bg-[#35BFAD]/10 ring-2 ring-[#35BFAD]/30' : ''
          }`}
        >
          {/* Header da coluna */}
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-white drop-shadow-sm">{title}</h3>
              <Badge className="bg-[#35BFAD]/20 text-[#35BFAD] border-[#35BFAD]/30">
                {candidatos.length}
              </Badge>
            </div>
          </div>

          {/* Lista de cards com scroll */}
          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto kanban-scroll">
            {candidatos.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm drop-shadow-sm">
                Nenhum candidato
              </div>
            ) : (
              candidatos.map((candidato) => (
                <KanbanCard key={candidato.id} candidato={candidato} />
              ))
            )}
          </div>
        </Glass>
      </div>
    );
  };

  const CandidatoCard = ({ candidato }: { candidato: Candidato }) => (
    <Glass variant="white" blur="lg" hover className="p-6 rounded-xl transition-all duration-300">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 text-white drop-shadow-md">
            {candidato.avatar}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-white drop-shadow-sm truncate">
                  {candidato.nome}
                </h3>
                <p className="text-sm text-white/70 drop-shadow-sm truncate">
                  {candidato.vaga}
                </p>
              </div>
              {getStatusBadge(candidato.status)}
            </div>
            <p className="text-xs text-white/60 mt-1 drop-shadow-sm">
              {candidato.tempo} • {candidato.localizacao}
            </p>
          </div>
        </div>

        {/* Scores */}
        <Glass variant="white" blur="sm" className="p-3 rounded-lg">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-white/80 drop-shadow-sm">
              <span className="text-white/60">Big Five:</span> {candidato.scores.bigFive}
            </div>
            <div className="text-white/80 drop-shadow-sm">
              <span className="text-white/60">DISC:</span> {candidato.scores.disc}
            </div>
            <div className="text-white/80 drop-shadow-sm">
              <span className="text-white/60">Intel:</span> P{candidato.scores.inteligencia}
            </div>
            <div className="text-white/80 drop-shadow-sm">
              <span className="text-white/60">Cultura:</span> {candidato.scores.cultura}
            </div>
          </div>
        </Glass>

        {/* Ações */}
        <div className="flex items-center gap-2">
          <GlassButton
            variant="white"
            onClick={() => handleVerPerfil(candidato.id)}
            className="flex-1 text-white text-sm drop-shadow-sm"
          >
            Ver Perfil →
          </GlassButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 drop-shadow-sm backdrop-blur-sm">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#00109E]/95 backdrop-blur-xl border-white/20">
              <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprovar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                <XCircle className="w-4 h-4 mr-2" />
                Rejeitar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/20" />
              <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                <FileText className="w-4 h-4 mr-2" />
                Adicionar Nota
              </DropdownMenuItem>
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
  );

  return (
    <RHLayout
      activePage={currentPage}
      onNavigate={handleNavigation}
      userName="João Silva"
      userRole="Administrador"
      notificationCount={3}
      onSearch={(query) => console.log('Buscar:', query)}
      onProfileClick={() => console.log('Perfil')}
      onSettingsClick={() => handleNavigation('configuracoes-rh')}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {/* Header */}
        <Glass variant="white" blur="xl" className="p-6 rounded-2xl">
          <div className="space-y-4">
            {/* Título */}
            <div>
              <h1 className="text-white drop-shadow-lg text-[40px] font-bold font-normal">
                👥 Candidatos ({candidatos.length})
              </h1>
            </div>

            {/* Busca */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou vaga..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-200"
                />
              </div>
              <button className="p-3 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all duration-200 drop-shadow-sm backdrop-blur-sm">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-white/80 text-sm drop-shadow-sm">Filtros:</span>
              
              <Select value={filterTodos} onValueChange={setFilterTodos}>
                <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20">
                  <SelectItem value="todos" className="text-white hover:bg-white/20">
                    Todos
                  </SelectItem>
                  <SelectItem value="ativos" className="text-white hover:bg-white/20">
                    Ativos
                  </SelectItem>
                  <SelectItem value="arquivados" className="text-white hover:bg-white/20">
                    Arquivados
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterVaga} onValueChange={setFilterVaga}>
                <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Vaga" />
                </SelectTrigger>
                <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20">
                  <SelectItem value="todas" className="text-white hover:bg-white/20">
                    Todas
                  </SelectItem>
                  {vagas.map((vaga) => (
                    <SelectItem
                      key={vaga.id}
                      value={vaga.id}
                      className="text-white hover:bg-white/20"
                    >
                      {vaga.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20">
                  <SelectItem value="todos" className="text-white hover:bg-white/20">
                    Todos
                  </SelectItem>
                  <SelectItem value="aprovado" className="text-white hover:bg-white/20">
                    Aprovados
                  </SelectItem>
                  <SelectItem value="pendente" className="text-white hover:bg-white/20">
                    Pendentes
                  </SelectItem>
                  <SelectItem value="investigar" className="text-white hover:bg-white/20">
                    Investigar
                  </SelectItem>
                  <SelectItem value="rejeitado" className="text-white hover:bg-white/20">
                    Rejeitados
                  </SelectItem>
                </SelectContent>
              </Select>

              <button className="text-sm text-white/80 hover:text-white transition-colors duration-200 drop-shadow-sm underline">
                Limpar
              </button>
            </div>
          </div>
        </Glass>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Glass variant="white" blur="lg" className="rounded-xl overflow-hidden">
            <TabsList className="w-full bg-transparent border-b border-white/20 rounded-none h-auto p-0">
              <TabsTrigger
                value="todos"
                className="flex-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 rounded-none border-b-2 border-transparent data-[state=active]:border-white py-4 drop-shadow-sm"
              >
                📋 Todos ({candidatos.length})
              </TabsTrigger>
              <TabsTrigger
                value="por-vaga"
                className="flex-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 rounded-none border-b-2 border-transparent data-[state=active]:border-white py-4 drop-shadow-sm"
              >
                📊 Por Vaga ({vagas.length})
              </TabsTrigger>
              <TabsTrigger
                value="kanban"
                className="flex-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 rounded-none border-b-2 border-transparent data-[state=active]:border-white py-4 drop-shadow-sm"
              >
                📌 Kanban
              </TabsTrigger>
            </TabsList>
          </Glass>

          {/* Aba Todos */}
          <TabsContent value="todos" className="space-y-6 mt-6">
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
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20">
                        <SelectItem value="recentes" className="text-white hover:bg-white/20">
                          Mais Recentes
                        </SelectItem>
                        <SelectItem value="antigos" className="text-white hover:bg-white/20">
                          Mais Antigos
                        </SelectItem>
                        <SelectItem value="nome" className="text-white hover:bg-white/20">
                          Nome A-Z
                        </SelectItem>
                        <SelectItem value="score" className="text-white hover:bg-white/20">
                          Maior Score
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-white/80 text-sm drop-shadow-sm">Mostrar:</span>
                    <Select value={perPage} onValueChange={setPerPage}>
                      <SelectTrigger className="w-[130px] bg-white/10 border-white/20 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20">
                        <SelectItem value="10" className="text-white hover:bg-white/20">
                          10 por página
                        </SelectItem>
                        <SelectItem value="20" className="text-white hover:bg-white/20">
                          20 por página
                        </SelectItem>
                        <SelectItem value="50" className="text-white hover:bg-white/20">
                          50 por página
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Glass>

            {/* Grid de Cards */}
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {candidatos.map((candidato) => (
                  <CandidatoCard key={candidato.id} candidato={candidato} />
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
                        <TableHead className="text-white/90 drop-shadow-sm h-12 px-4">Score</TableHead>
                        <TableHead className="text-white/90 drop-shadow-sm h-12 px-4">Status</TableHead>
                        <TableHead className="text-white/90 drop-shadow-sm h-12 px-4 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidatos.map((candidato) => {
                        // Calcular score médio
                        const scoreTotal = Math.round(
                          (candidato.scores.bigFive +
                            candidato.scores.inteligencia +
                            candidato.scores.cultura) /
                            3
                        );

                        return (
                          <TableRow
                            key={candidato.id}
                            className="border-b border-white/20 hover:bg-white/10 transition-colors duration-200"
                          >
                            {/* Nome com Avatar */}
                            <TableCell className="text-white drop-shadow-sm py-4 px-4 whitespace-normal">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 text-white drop-shadow-md text-sm">
                                  {candidato.avatar}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate">{candidato.nome}</div>
                                  <div className="text-xs text-white/60 truncate drop-shadow-sm">
                                    {candidato.localizacao}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Vaga */}
                            <TableCell className="text-white/80 drop-shadow-sm py-4 px-4 whitespace-normal">
                              <div className="max-w-[200px] truncate">{candidato.vaga}</div>
                              <div className="text-xs text-white/60 drop-shadow-sm">
                                {candidato.tempo}
                              </div>
                            </TableCell>

                            {/* Score */}
                            <TableCell className="text-white drop-shadow-sm py-4 px-4 whitespace-normal">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{scoreTotal}</span>
                                <span className="text-white/60 text-sm">/100</span>
                              </div>
                              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-[#35BFAD] rounded-full transition-all duration-300"
                                  style={{ width: `${scoreTotal}%` }}
                                />
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-4 px-4 whitespace-normal">{getStatusBadge(candidato.status)}</TableCell>

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
                                  className="bg-[#00109E]/95 backdrop-blur-xl border-white/20"
                                >
                                  <DropdownMenuItem
                                    onClick={() => handleVerPerfil(candidato.id)}
                                    className="text-white hover:bg-white/20 cursor-pointer"
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Ver Perfil
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/20" />
                                  <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Aprovar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-white hover:bg-white/20 cursor-pointer">
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Rejeitar
                                  </DropdownMenuItem>
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
                        );
                      })}
                    </TableBody>
                  </Table>
              </Glass>
            )}

            {/* Paginação */}
            <Glass variant="white" blur="lg" className="p-4 rounded-xl">
              <div className="flex items-center justify-center gap-4">
                <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed drop-shadow-sm backdrop-blur-sm">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-white drop-shadow-sm">Página 1 de 1</span>
                <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed drop-shadow-sm backdrop-blur-sm">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </Glass>
          </TabsContent>

          {/* Aba Por Vaga */}
          <TabsContent value="por-vaga" className="space-y-6 mt-6">
            {/* Seletor de Vaga */}
            <Glass variant="white" blur="lg" className="p-6 rounded-xl">
              <div className="space-y-4">
                <h3 className="text-white drop-shadow-sm">Selecione uma vaga:</h3>
                <Select value={selectedVaga} onValueChange={setSelectedVaga}>
                  <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20">
                    {vagas.map((vaga) => (
                      <SelectItem
                        key={vaga.id}
                        value={vaga.id}
                        className="text-white hover:bg-white/20"
                      >
                        {vaga.nome} ({vaga.candidatos} candidatos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Funil */}
                <Glass variant="white" blur="sm" className="p-6 rounded-xl mt-6">
                  <h3 className="text-white drop-shadow-sm mb-4">📊 FUNIL DA VAGA</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-white/80 drop-shadow-sm">
                        <span>Triagem</span>
                        <span>8</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#35BFAD] rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-white/80 drop-shadow-sm">
                        <span>Testes</span>
                        <span>6</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#35BFAD] rounded-full" style={{ width: '75%' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-white/80 drop-shadow-sm">
                        <span>Cultura</span>
                        <span>4</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#35BFAD] rounded-full" style={{ width: '50%' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-white/80 drop-shadow-sm">
                        <span>Entrevista</span>
                        <span>2</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#35BFAD] rounded-full" style={{ width: '25%' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-white/80 drop-shadow-sm">
                        <span>Aprovados</span>
                        <span>1</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '12.5%' }} />
                      </div>
                    </div>
                  </div>
                </Glass>
              </div>
            </Glass>

            {/* Grid de Candidatos da Vaga */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {candidatos
                .filter((c) => c.vaga === 'Assistente Odontológico')
                .map((candidato) => (
                  <CandidatoCard key={candidato.id} candidato={candidato} />
                ))}
            </div>
          </TabsContent>

          {/* Aba Kanban */}
          <TabsContent value="kanban" className="space-y-6 mt-6">
            <DndProvider backend={HTML5Backend}>
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  <KanbanColumn
                    stage="triagem"
                    title="Triagem"
                    candidatos={kanbanCandidatos.filter((c) => c.kanbanStage === 'triagem')}
                  />
                  <KanbanColumn
                    stage="testes"
                    title="Testes"
                    candidatos={kanbanCandidatos.filter((c) => c.kanbanStage === 'testes')}
                  />
                  <KanbanColumn
                    stage="cultura"
                    title="Cultura"
                    candidatos={kanbanCandidatos.filter((c) => c.kanbanStage === 'cultura')}
                  />
                  <KanbanColumn
                    stage="entrevista"
                    title="Entrevista"
                    candidatos={kanbanCandidatos.filter((c) => c.kanbanStage === 'entrevista')}
                  />
                </div>
              </div>
            </DndProvider>
          </TabsContent>
        </Tabs>
      </div>
    </RHLayout>
  );
}
