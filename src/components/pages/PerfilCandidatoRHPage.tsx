import React, { useState } from 'react';
import { RHLayout } from '../RHLayout';
import { Glass, GlassButton } from '../ui/glass';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Mail,
  Phone,
  Calendar,
  FileText,
  MessageSquare,
  StickyNote,
  Send,
  Download,
  ChevronDown,
  Trash2,
  Edit,
  User,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

type StatusType = 'aprovado' | 'investigar' | 'rejeitado' | 'pendente';
type TesteType = 'formulario' | 'bigfive' | 'disc' | 'raven' | 'manifesto' | 'entrevista-online' | 'entrevista-presencial';

interface TimelineItem {
  id: string;
  titulo: string;
  data: string;
  hora: string;
  status: 'completo' | 'pendente' | 'falhou';
  detalhes?: {
    nota?: string;
    score?: string;
    tempo?: string;
    perfil?: string;
    percentil?: string;
  };
}

interface Nota {
  id: string;
  autor: string;
  data: string;
  hora: string;
  texto: string;
}

interface HistoricoItem {
  id: string;
  tipo: 'candidatura' | 'teste' | 'email' | 'nota' | 'status' | 'entrevista';
  titulo: string;
  descricao: string;
  autor?: string;
  data: string;
  hora: string;
}

export function PerfilCandidatoRHPage() {
  const [currentPage, setCurrentPage] = useState('perfil-candidato-rh');
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [testesEnviar, setTestesEnviar] = useState<TesteType[]>([]);
  const [transcricaoOnline, setTranscricaoOnline] = useState('');
  const [transcricaoPresencial, setTranscricaoPresencial] = useState('');
  const [novaNota, setNovaNota] = useState('');
  const [notas, setNotas] = useState<Nota[]>([
    {
      id: '1',
      autor: 'João Silva',
      data: '25/10/2025',
      hora: '14:30',
      texto: 'Candidata muito alinhada com a vaga. Recomendo agendar entrevista urgente.',
    },
    {
      id: '2',
      autor: 'Maria Santos',
      data: '24/10/2025',
      hora: '10:15',
      texto: 'Completou todos os testes dentro do prazo. Resultados muito positivos.',
    },
  ]);

  // Mock data do candidato
  const candidato = {
    id: 1,
    nome: 'Maria Silva',
    vaga: 'Assistente Odontológico',
    avatar: 'MS',
    email: 'maria.silva@email.com',
    telefone: '(11) 98765-4321',
    localizacao: 'São Paulo, SP',
    dataCandidatura: '20/10/2025',
    status: 'aprovado' as StatusType,
    disponibilidade: 'Integral (40h/semana)',
    scoreGeral: 81,
    scores: {
      bigFive: 78,
      disc: 'ID',
      inteligencia: 85,
      cultura: 82,
    },
  };

  // Dados do formulário
  const formularioRespostas = [
    {
      pergunta: 'Possui experiência em atendimento ao cliente?',
      resposta: 'Sim, trabalhei 3 anos como atendente em clínica médica, onde desenvolvi habilidades de comunicação e empatia com pacientes de diversas idades.',
    },
    {
      pergunta: 'Por que deseja trabalhar na Beauty Smile?',
      resposta: 'Admiro muito o trabalho da Beauty Smile no segmento odontológico. A empresa tem uma reputação excelente e valoriza o atendimento humanizado, o que está alinhado com meus valores profissionais.',
    },
    {
      pergunta: 'Quais são suas principais qualidades?',
      resposta: 'Organização, empatia, atenção aos detalhes e facilidade de trabalhar em equipe. Sou comunicativa e consigo criar um ambiente acolhedor para os pacientes.',
    },
    {
      pergunta: 'Descreva uma situação desafiadora que enfrentou profissionalmente',
      resposta: 'Tive que lidar com um paciente muito ansioso antes de um procedimento. Consegui acalmá-lo conversando, explicando o processo e mostrando empatia. O procedimento foi bem-sucedido e o paciente me agradeceu.',
    },
  ];

  // Dados Big Five
  const bigFiveData = [
    { dimension: 'Abertura', score: 72, fullName: 'Abertura a Experiências' },
    { dimension: 'Conscienc.', score: 85, fullName: 'Conscienciosidade' },
    { dimension: 'Extroversão', score: 68, fullName: 'Extroversão' },
    { dimension: 'Amabilidade', score: 82, fullName: 'Amabilidade' },
    { dimension: 'Neurotic.', score: 58, fullName: 'Neuroticismo' },
  ];

  const bigFiveRadarData = [
    { subject: 'Abertura', A: 72, fullMark: 100 },
    { subject: 'Conscienc.', A: 85, fullMark: 100 },
    { subject: 'Extroversão', A: 68, fullMark: 100 },
    { subject: 'Amabilidade', A: 82, fullMark: 100 },
    { subject: 'Neurotic.', A: 58, fullMark: 100 },
  ];

  // Subdivisões do Big Five
  const bigFiveSubdivisoes = {
    'Abertura a Experiências': [
      { nome: 'Imaginação', score: 75 },
      { nome: 'Interesses Artísticos', score: 68 },
      { nome: 'Emotividade', score: 72 },
      { nome: 'Aventura', score: 70 },
      { nome: 'Intelecto', score: 78 },
      { nome: 'Liberalismo', score: 69 },
    ],
    'Conscienciosidade': [
      { nome: 'Auto-eficácia', score: 88 },
      { nome: 'Ordem', score: 90 },
      { nome: 'Senso de dever', score: 85 },
      { nome: 'Esforço por realizações', score: 82 },
      { nome: 'Autodisciplina', score: 84 },
      { nome: 'Ponderação', score: 81 },
    ],
    'Extroversão': [
      { nome: 'Acolhimento', score: 72 },
      { nome: 'Gregariedade', score: 65 },
      { nome: 'Assertividade', score: 68 },
      { nome: 'Atividade', score: 70 },
      { nome: 'Busca de sensações', score: 64 },
      { nome: 'Emoções positivas', score: 69 },
    ],
    'Amabilidade': [
      { nome: 'Confiança', score: 80 },
      { nome: 'Franqueza', score: 78 },
      { nome: 'Altruísmo', score: 88 },
      { nome: 'Complacência', score: 82 },
      { nome: 'Modéstia', score: 79 },
      { nome: 'Sensibilidade', score: 85 },
    ],
    'Neuroticismo': [
      { nome: 'Ansiedade', score: 62 },
      { nome: 'Raiva/Hostilidade', score: 45 },
      { nome: 'Depressão', score: 52 },
      { nome: 'Autoconsciência', score: 68 },
      { nome: 'Imoderação', score: 58 },
      { nome: 'Vulnerabilidade', score: 63 },
    ],
  };

  // Dados DISC
  const discData = [
    { dimension: 'Dominância', score: 65, color: '#EF4444', letter: 'D' },
    { dimension: 'Influência', score: 78, color: '#F59E0B', letter: 'I' },
    { dimension: 'Estabilidade', score: 72, color: '#10B981', letter: 'S' },
    { dimension: 'Conformidade', score: 58, color: '#3B82F6', letter: 'C' },
  ];

  // Dados Inteligência (Raven) - Por blocos
  const ravenAcertos = 51; // Total de acertos (de 60 questões)
  const ravenPercentil = 85;
  
  const ravenBlocos = [
    { bloco: 'A', acertos: 11, total: 12, percentual: 92 },
    { bloco: 'B', acertos: 10, total: 12, percentual: 83 },
    { bloco: 'C', acertos: 10, total: 12, percentual: 83 },
    { bloco: 'D', acertos: 11, total: 12, percentual: 92 },
    { bloco: 'E', acertos: 9, total: 12, percentual: 75 },
  ];

  // Tabela de classificação Raven
  const ravenClassificacao = [
    { faixa: '20-24', nivel: 'Inferior', descricao: 'Abaixo da média; dificuldades prováveis em resolver problemas complexos.', cor: '#E5E5E5', textColor: '#000' },
    { faixa: '25-35', nivel: 'Médio-inferior', descricao: 'Dentro na faixa baixa da média.', cor: '#991B1B', textColor: '#FFF' },
    { faixa: '36-43', nivel: 'Médio-superior', descricao: 'Faixa alta da média; raciocínio adequado para demandas comuns.', cor: '#FB923C', textColor: '#000' },
    { faixa: '44-51', nivel: 'Superior', descricao: 'Bom nível de inteligência fluida; facilidade em lidar com problemas novos.', cor: '#FCD34D', textColor: '#000' },
    { faixa: '52-55', nivel: 'Muito superior', descricao: 'Alto raciocínio analítico, rápido aprendizado em contextos abstratos.', cor: '#86EFAC', textColor: '#000' },
    { faixa: '56-60', nivel: 'Excepcional', descricao: 'Nível raro; capacidade cognitiva muito acima da média populacional.', cor: '#93C5FD', textColor: '#000' },
  ];

  const getRavenClassificacaoAtual = (acertos: number) => {
    if (acertos >= 56) return ravenClassificacao[5];
    if (acertos >= 52) return ravenClassificacao[4];
    if (acertos >= 44) return ravenClassificacao[3];
    if (acertos >= 36) return ravenClassificacao[2];
    if (acertos >= 25) return ravenClassificacao[1];
    return ravenClassificacao[0];
  };

  const classificacaoAtual = getRavenClassificacaoAtual(ravenAcertos);

  // Dados Cultura
  const culturaRespostas = [
    {
      pergunta: 'O que significa excelência no atendimento para você?',
      resposta: 'Excelência no atendimento significa ir além das expectativas do paciente, oferecendo não apenas um serviço técnico de qualidade, mas também acolhimento, empatia e respeito. É fazer com que cada pessoa se sinta valorizada e cuidada durante toda a experiência.',
      keywords: ['empatia', 'qualidade', 'acolhimento', 'valorização'],
      alinhamento: 95,
    },
    {
      pergunta: 'Como você lida com feedback e críticas?',
      resposta: 'Vejo feedback como oportunidade de crescimento. Sempre procuro entender o ponto de vista da outra pessoa e refletir sobre como posso melhorar. Críticas construtivas são essenciais para o desenvolvimento profissional.',
      keywords: ['crescimento', 'melhoria', 'desenvolvimento'],
      alinhamento: 88,
    },
    {
      pergunta: 'Descreva um ambiente de trabalho ideal para você',
      resposta: 'Um ambiente colaborativo, onde exista respeito mútuo e comunicação aberta. Valorizo equipes que trabalham juntas para alcançar objetivos comuns e que celebram as conquistas coletivas.',
      keywords: ['colaborativo', 'respeito', 'comunicação', 'equipe'],
      alinhamento: 92,
    },
  ];

  // Histórico
  const historico: HistoricoItem[] = [
    {
      id: '1',
      tipo: 'candidatura',
      titulo: 'Candidatura Recebida',
      descricao: 'Candidatura enviada para a vaga de Assistente Odontológico',
      data: '20/10/2025',
      hora: '14:30',
    },
    {
      id: '2',
      tipo: 'email',
      titulo: 'Email de Boas-vindas Enviado',
      descricao: 'Email automático de confirmação de candidatura',
      data: '20/10/2025',
      hora: '14:31',
    },
    {
      id: '3',
      tipo: 'teste',
      titulo: 'Formulário Inicial Completado',
      descricao: 'Score: 8.5/10 - Tempo: 15min',
      data: '20/10/2025',
      hora: '15:15',
    },
    {
      id: '4',
      tipo: 'email',
      titulo: 'Convite para Testes Enviado',
      descricao: 'Email com links para Big Five, DISC e Inteligência',
      autor: 'Sistema',
      data: '20/10/2025',
      hora: '15:20',
    },
    {
      id: '5',
      tipo: 'teste',
      titulo: 'Big Five Completado',
      descricao: 'Score: 78/100 - Tempo: 12min 34s',
      data: '22/10/2025',
      hora: '09:15',
    },
    {
      id: '6',
      tipo: 'teste',
      titulo: 'DISC Completado',
      descricao: 'Perfil: ID (Influente-Dominante) - Tempo: 8min 15s',
      data: '22/10/2025',
      hora: '09:30',
    },
    {
      id: '7',
      tipo: 'teste',
      titulo: 'Teste de Inteligência Completado',
      descricao: 'Score: 85/100 - Percentil 85 - Tempo: 25min 45s',
      data: '23/10/2025',
      hora: '16:45',
    },
    {
      id: '8',
      tipo: 'teste',
      titulo: 'Questionário de Cultura Completado',
      descricao: 'Score: 82/100 - Tempo: 18min 20s',
      data: '25/10/2025',
      hora: '11:00',
    },
    {
      id: '9',
      tipo: 'nota',
      titulo: 'Nota Adicionada por João Silva',
      descricao: 'Candidata muito alinhada com a vaga. Recomendo agendar entrevista urgente.',
      autor: 'João Silva (RH)',
      data: '25/10/2025',
      hora: '14:30',
    },
    {
      id: '10',
      tipo: 'status',
      titulo: 'Status Alterado para Aprovado',
      descricao: 'Status anterior: Em Análise → Novo status: Aprovado',
      autor: 'João Silva (RH)',
      data: '25/10/2025',
      hora: '14:31',
    },
  ];

  const timeline: TimelineItem[] = [
    {
      id: '1',
      titulo: 'Triagem Inicial',
      data: '20/10/2025',
      hora: '14:30',
      status: 'completo',
      detalhes: { nota: '8.5/10' },
    },
    {
      id: '2',
      titulo: 'Big Five',
      data: '22/10/2025',
      hora: '09:15',
      status: 'completo',
      detalhes: { score: '78/100', tempo: '12min 34s' },
    },
    {
      id: '3',
      titulo: 'DISC',
      data: '22/10/2025',
      hora: '09:30',
      status: 'completo',
      detalhes: { perfil: 'ID (Influente-Dominante)' },
    },
    {
      id: '4',
      titulo: 'Inteligência',
      data: '23/10/2025',
      hora: '16:45',
      status: 'completo',
      detalhes: { score: '85/100', percentil: 'Percentil 85' },
    },
    {
      id: '5',
      titulo: 'Cultura',
      data: '25/10/2025',
      hora: '11:00',
      status: 'completo',
      detalhes: { score: '82/100' },
    },
    {
      id: '6',
      titulo: 'Aguardando Entrevista',
      data: '',
      hora: '',
      status: 'pendente',
    },
  ];

  const testesDisponiveis = [
    { id: 'formulario', nome: 'Formulário Inicial' },
    { id: 'bigfive', nome: 'Big Five' },
    { id: 'disc', nome: 'DISC' },
    { id: 'raven', nome: 'Raven' },
    { id: 'manifesto', nome: 'Manifesto' },
    { id: 'entrevista-online', nome: 'Entrevista Online' },
    { id: 'entrevista-presencial', nome: 'Entrevista Presencial' },
  ];

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
  };

  const handleLogout = () => {
    // Logout do painel RH — wiring real deferido (placeholder de navegação local).
  };

  const handleVoltar = () => {
    // Voltar para lista de candidatos — wiring real deferido.
  };

  const handleToggleTeste = (testeId: TesteType) => {
    setTestesEnviar((prev) =>
      prev.includes(testeId)
        ? prev.filter((id) => id !== testeId)
        : [...prev, testeId]
    );
  };

  const handleEnviarWhatsApp = () => {
    if (testesEnviar.length === 0) return;
    
    const testesNomes = testesEnviar
      .map((id) => testesDisponiveis.find((t) => t.id === id)?.nome)
      .join(', ');
    
    const mensagem = `Olá ${candidato.nome}! Por favor, complete os seguintes testes: ${testesNomes}. Link: https://beautysmile.com/testes`;
    const telefone = candidato.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    
    window.open(url, '_blank');
  };

  const handleEnviarEmail = () => {
    if (testesEnviar.length === 0) return;
    
    const testesNomes = testesEnviar
      .map((id) => testesDisponiveis.find((t) => t.id === id)?.nome)
      .join(', ');
    
    const assunto = 'Beauty Smile - Testes Pendentes';
    const corpo = `Olá ${candidato.nome}!\n\nPor favor, complete os seguintes testes:\n${testesNomes}\n\nLink: https://beautysmile.com/testes\n\nAtenciosamente,\nEquipe Beauty Smile`;
    
    window.location.href = `mailto:${candidato.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  };

  const handleContatoWhatsApp = () => {
    const telefone = candidato.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${telefone}`;
    window.open(url, '_blank');
  };

  const handleContatoEmail = () => {
    window.location.href = `mailto:${candidato.email}`;
  };

  const handleSalvarTranscricaoOnline = () => {
    // Aqui você salvaria no backend (transcricaoOnline)
  };

  const handleSalvarTranscricaoPresencial = () => {
    // Aqui você salvaria no backend (transcricaoPresencial)
  };

  const handleAdicionarNota = () => {
    if (!novaNota.trim()) return;

    const nota: Nota = {
      id: Date.now().toString(),
      autor: 'João Silva', // Seria do usuário logado
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      texto: novaNota,
    };

    setNotas([nota, ...notas]);
    setNovaNota('');
  };

  const handleExcluirNota = (id: string) => {
    setNotas(notas.filter((n) => n.id !== id));
  };

  const getStatusBadge = (status: StatusType) => {
    const statusConfig = {
      aprovado: {
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Aprovado',
        className: 'bg-green-500/20 text-green-300 border-green-500/30',
      },
      investigar: {
        icon: <AlertTriangle className="w-4 h-4" />,
        label: 'Investigar',
        className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      },
      rejeitado: {
        icon: <XCircle className="w-4 h-4" />,
        label: 'Rejeitado',
        className: 'bg-red-500/20 text-red-300 border-red-500/30',
      },
      pendente: {
        icon: <Clock className="w-4 h-4" />,
        label: 'Pendente',
        className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      },
    };

    const config = statusConfig[status];
    return (
      <Badge
        variant="outline"
        className={`${config.className} flex items-center gap-2 drop-shadow-md text-base px-4 py-2`}
      >
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getTimelineIcon = (status: 'completo' | 'pendente' | 'falhou') => {
    switch (status) {
      case 'completo':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'pendente':
        return <Clock className="w-6 h-6 text-yellow-400" />;
      case 'falhou':
        return <XCircle className="w-6 h-6 text-red-400" />;
    }
  };

  const getHistoricoIcon = (tipo: HistoricoItem['tipo']) => {
    switch (tipo) {
      case 'candidatura':
        return <User className="w-5 h-5 text-[#35BFAD]" />;
      case 'teste':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'email':
        return <Mail className="w-5 h-5 text-purple-400" />;
      case 'nota':
        return <StickyNote className="w-5 h-5 text-yellow-400" />;
      case 'status':
        return <AlertTriangle className="w-5 h-5 text-green-400" />;
      case 'entrevista':
        return <MessageSquare className="w-5 h-5 text-orange-400" />;
    }
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { texto: 'Excelente', cor: 'text-green-400', emoji: '🟢' };
    if (score >= 60) return { texto: 'Bom', cor: 'text-blue-400', emoji: '🔵' };
    if (score >= 40) return { texto: 'Regular', cor: 'text-yellow-400', emoji: '🟡' };
    return { texto: 'Insuficiente', cor: 'text-red-400', emoji: '🔴' };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // green
    if (score >= 60) return '#3B82F6'; // blue
    if (score >= 40) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  const scoreLabel = getScoreLabel(candidato.scoreGeral);

  // Data para o gráfico donut
  const chartData = [
    { name: 'Score', value: candidato.scoreGeral },
    { name: 'Restante', value: 100 - candidato.scoreGeral },
  ];

  const COLORS = ['#35BFAD', 'rgba(255, 255, 255, 0.1)'];

  return (
    <RHLayout
      currentPage={currentPage}
      onNavigate={handleNavigation}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {/* Header do Perfil */}
        <Glass variant="white" blur="lg" className="p-8 rounded-xl">
          {/* Botão Voltar */}
          <button
            onClick={handleVoltar}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors duration-200 mb-6 drop-shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar para Candidatos</span>
          </button>

          <div className="h-px bg-white/20 mb-6" />

          {/* Info Principal */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 text-white drop-shadow-lg border-4 border-white/20 text-2xl">
              {candidato.avatar}
            </div>

            {/* Dados */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h1 className="text-white drop-shadow-md text-3xl mb-1">
                    {candidato.nome}
                  </h1>
                  <p className="text-white/80 drop-shadow-sm text-lg">
                    {candidato.vaga}
                  </p>
                </div>
                {getStatusBadge(candidato.status)}
              </div>

              {/* Detalhes de Contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white/80 drop-shadow-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#35BFAD]" />
                  <span>{candidato.localizacao}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#35BFAD]" />
                  <span>{candidato.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#35BFAD]" />
                  <span>{candidato.telefone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#35BFAD]" />
                  <span>Candidatura: {candidato.dataCandidatura}</span>
                </div>
              </div>

              {/* Botões de Ação Principal */}
              <div className="flex flex-wrap gap-3 pt-4">
                <GlassButton
                  variant="primary"
                  className="bg-[#00109E] hover:bg-[#000C7A] text-white px-6 py-3 drop-shadow-md"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Próxima Etapa
                </GlassButton>
                <GlassButton
                  variant="white"
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-6 py-3 drop-shadow-md"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Rejeitar
                </GlassButton>
                <GlassButton
                  variant="white"
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 drop-shadow-md"
                >
                  <StickyNote className="w-5 h-5 mr-2" />
                  + Nota
                </GlassButton>
              </div>
            </div>
          </div>

          {/* Enviar Novamente */}
          <Glass variant="white" blur="sm" className="p-6 rounded-xl mt-6">
            <h3 className="text-white drop-shadow-sm mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-[#35BFAD]" />
              Enviar Novamente
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {testesDisponiveis.map((teste) => (
                <label
                  key={teste.id}
                  className="flex items-center gap-2 text-white/80 drop-shadow-sm cursor-pointer hover:text-white transition-colors duration-200"
                >
                  <Checkbox
                    checked={testesEnviar.includes(teste.id as TesteType)}
                    onCheckedChange={() => handleToggleTeste(teste.id as TesteType)}
                    className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                  />
                  <span className="text-sm">{teste.nome}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <GlassButton
                variant="white"
                onClick={handleEnviarEmail}
                disabled={testesEnviar.length === 0}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 drop-shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </GlassButton>
              <GlassButton
                variant="white"
                onClick={handleEnviarWhatsApp}
                disabled={testesEnviar.length === 0}
                className="bg-green-500/20 hover:bg-green-500/30 text-green-300 px-4 py-2 drop-shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </GlassButton>
            </div>
          </Glass>

          {/* Entrar em Contato */}
          <Glass variant="white" blur="sm" className="p-6 rounded-xl mt-4">
            <h3 className="text-white drop-shadow-sm mb-4">Entrar em Contato</h3>
            <div className="flex gap-3">
              <GlassButton
                variant="white"
                onClick={handleContatoEmail}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 drop-shadow-md"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </GlassButton>
              <GlassButton
                variant="white"
                onClick={handleContatoWhatsApp}
                className="bg-green-500/20 hover:bg-green-500/30 text-green-300 px-4 py-2 drop-shadow-md"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </GlassButton>
            </div>
          </Glass>
        </Glass>

        {/* Tabs de Conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Glass variant="white" blur="lg" className="rounded-xl overflow-hidden mb-6">
            <div className="overflow-x-auto kanban-scroll">
              <TabsList className="bg-transparent border-b border-white/20 rounded-none w-full justify-start p-0 h-auto flex-nowrap">
                <TabsTrigger
                  value="visao-geral"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger
                  value="formulario"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  Formulário
                </TabsTrigger>
                <TabsTrigger
                  value="bigfive"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  Big Five
                </TabsTrigger>
                <TabsTrigger
                  value="disc"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  DISC
                </TabsTrigger>
                <TabsTrigger
                  value="inteligencia"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  Inteligência
                </TabsTrigger>
                <TabsTrigger
                  value="cultura"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  Cultura
                </TabsTrigger>
                <TabsTrigger
                  value="entrevista-online"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  Entrev. Online
                </TabsTrigger>
                <TabsTrigger
                  value="entrevista-presencial"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  Entrev. Presencial
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  Histórico
                </TabsTrigger>
                <TabsTrigger
                  value="notas"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BFAD] px-6 py-3 whitespace-nowrap"
                >
                  Notas
                </TabsTrigger>
              </TabsList>
            </div>
          </Glass>

          {/* Conteúdo da Aba - Visão Geral */}
          <TabsContent value="visao-geral" className="space-y-6 mt-6">
            {/* Score Geral */}
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                🎯 Score Geral de Compatibilidade
              </h2>
              
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative w-64 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={0}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-6xl text-white drop-shadow-lg">
                      {candidato.scoreGeral}
                    </div>
                    <div className="text-white/60 drop-shadow-sm text-xl">/100</div>
                  </div>
                </div>
                
                {/* Label abaixo do círculo */}
                <div className={`${scoreLabel.cor} drop-shadow-md text-xl mt-6`}>
                  {scoreLabel.emoji} {scoreLabel.texto}
                </div>
              </div>
            </Glass>

            {/* Resumo do Processo */}
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                📊 Resumo do Processo
              </h2>

              <div className="space-y-6">
                {timeline.map((item, index) => (
                  <div key={item.id} className="flex gap-4">
                    {/* Linha vertical e ícone */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border-2 border-white/20">
                        {getTimelineIcon(item.status)}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 h-full min-h-[60px] bg-white/20 my-1" />
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 pb-6">
                      <h3 className="text-white drop-shadow-sm text-lg mb-1">
                        {item.titulo}
                      </h3>
                      {item.data && (
                        <p className="text-white/60 drop-shadow-sm text-sm mb-2">
                          {item.data} - {item.hora}
                        </p>
                      )}
                      {item.detalhes && (
                        <Glass variant="white" blur="sm" className="p-3 rounded-lg inline-block">
                          <div className="space-y-1 text-sm text-white/80 drop-shadow-sm">
                            {item.detalhes.nota && <div>Nota: {item.detalhes.nota}</div>}
                            {item.detalhes.score && <div>Score: {item.detalhes.score}</div>}
                            {item.detalhes.tempo && <div>Tempo: {item.detalhes.tempo}</div>}
                            {item.detalhes.perfil && <div>Perfil: {item.detalhes.perfil}</div>}
                            {item.detalhes.percentil && <div>{item.detalhes.percentil}</div>}
                          </div>
                        </Glass>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Glass>

            {/* Dados Pessoais */}
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                👤 Dados Pessoais
              </h2>

              <div className="space-y-4 text-white/80 drop-shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-white/60">Email:</span>
                    <p className="text-white">{candidato.email}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Telefone:</span>
                    <p className="text-white">{candidato.telefone}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Cidade/Estado:</span>
                    <p className="text-white">{candidato.localizacao}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Disponibilidade:</span>
                    <p className="text-white">{candidato.disponibilidade}</p>
                  </div>
                </div>

                <div className="pt-4">
                  <GlassButton
                    variant="white"
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 drop-shadow-md"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Baixar Currículo (PDF)
                  </GlassButton>
                </div>
              </div>
            </Glass>

            {/* Recomendação da IA */}
            <Glass variant="white" blur="lg" className="p-8 rounded-xl border-2 border-[#35BFAD]/30">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                🤖 Recomendação Geral da IA
              </h2>

              <div className="space-y-6">
                <div className="flex items-center gap-3 text-white drop-shadow-sm">
                  <span className="text-lg">Compatibilidade Geral:</span>
                  <span className="text-2xl">{candidato.scoreGeral}/100</span>
                  <span className="text-2xl">{scoreLabel.emoji}</span>
                </div>

                <Glass variant="white" blur="sm" className="p-6 rounded-xl">
                  <div className="space-y-4 text-white/90 drop-shadow-sm leading-relaxed">
                    <p>
                      "Candidata demonstra excelente alinhamento com os requisitos da vaga.
                      Perfil comportamental adequado, boa capacidade cognitiva e forte
                      alinhamento cultural.
                    </p>

                    <div>
                      <h4 className="text-white mb-2">Pontos Fortes:</h4>
                      <ul className="list-disc list-inside space-y-1 text-white/80">
                        <li>Alta conscienciosidade (Big Five)</li>
                        <li>Perfil comunicativo e empático</li>
                        <li>Excelente raciocínio lógico</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-white mb-2">Pontos de Atenção:</h4>
                      <ul className="list-disc list-inside space-y-1 text-white/80">
                        <li>Neuroticismo ligeiramente elevado</li>
                        <li>Necessita ambiente estável</li>
                      </ul>
                    </div>
                  </div>
                </Glass>

                <div className="flex items-center gap-2 text-green-400 drop-shadow-md text-lg pt-2">
                  <CheckCircle className="w-6 h-6" />
                  <span>RECOMENDAÇÃO: APROVAR PARA ENTREVISTA</span>
                </div>
              </div>
            </Glass>
          </TabsContent>

          {/* ABA: FORMULÁRIO */}
          <TabsContent value="formulario" className="space-y-6 mt-6">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                📝 Respostas do Formulário
              </h2>

              {/* Análise da IA */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6 border-2 border-[#35BFAD]/30">
                <h3 className="text-white drop-shadow-sm mb-4 flex items-center gap-2 text-lg">
                  🤖 Análise da IA
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white drop-shadow-sm">
                    <span>Score de Triagem:</span>
                    <span className="text-xl text-[#35BFAD]">8.5/10</span>
                    <span>🟢</span>
                  </div>
                  <p className="text-white/90 drop-shadow-sm leading-relaxed">
                    "Candidata apresenta experiência relevante e respostas bem estruturadas nas 
                    perguntas de triagem. Demonstra clareza na comunicação e alinhamento com os 
                    valores da empresa. Perfil promissor para a vaga de Assistente Odontológico."
                  </p>
                  <div className="flex items-center gap-2 text-white/70 drop-shadow-sm text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Tempo de preenchimento: 15min 23s</span>
                  </div>
                </div>
              </Glass>

              {/* Perguntas e Respostas */}
              <div className="space-y-4">
                {formularioRespostas.map((item, index) => (
                  <Glass key={index} variant="white" blur="sm" className="p-6 rounded-xl">
                    <h4 className="text-white drop-shadow-sm mb-3">
                      Q{index + 1}. {item.pergunta}
                    </h4>
                    <p className="text-white/80 drop-shadow-sm leading-relaxed">
                      <span className="text-white/60">R:</span> {item.resposta}
                    </p>
                  </Glass>
                ))}
              </div>
            </Glass>
          </TabsContent>

          {/* ABA: BIG FIVE */}
          <TabsContent value="bigfive" className="space-y-6 mt-6">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                🎨 Análise Big Five
              </h2>

              {/* Análise da IA */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6 border-2 border-[#35BFAD]/30">
                <h3 className="text-white drop-shadow-sm mb-4 flex items-center gap-2 text-lg">
                  🤖 Interpretação da IA
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white drop-shadow-sm">
                    <span>Score Geral:</span>
                    <span className="text-xl text-[#35BFAD]">78/100</span>
                    <span>🟢</span>
                  </div>
                  <p className="text-white/90 drop-shadow-sm leading-relaxed">
                    "Perfil equilibrado com destaque para conscienciosidade e amabilidade. 
                    A candidata demonstra alta organização, disciplina e empatia - características 
                    essenciais para atendimento odontológico. Neuroticismo controlado indica 
                    boa gestão emocional em situações de pressão."
                  </p>
                  <div className="flex items-center gap-2 text-white/70 drop-shadow-sm text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Tempo de conclusão: 12min 34s</span>
                  </div>
                </div>
              </Glass>

              {/* Resultados por Dimensão */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6">
                <h3 className="text-white drop-shadow-sm mb-6 text-lg">
                  Resultados por Dimensão
                </h3>

                <div className="space-y-4 mb-8">
                  {bigFiveData.map((item) => (
                    <div key={item.dimension}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white drop-shadow-sm">{item.fullName}</span>
                        <span className="text-white/80 drop-shadow-sm">{item.score}/100</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.score}%`,
                            background: `linear-gradient(90deg, #00109E 0%, #35BFAD 100%)`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gráfico Radar */}
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={bigFiveRadarData}>
                      <PolarGrid stroke="rgba(255, 255, 255, 0.2)" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: 'rgba(255, 255, 255, 0.8)', fontSize: 12 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]}
                        tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}
                      />
                      <Radar
                        name="Score"
                        dataKey="A"
                        stroke="#35BFAD"
                        fill="#35BFAD"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Glass>

              {/* Subdivisões Detalhadas */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6">
                <h3 className="text-white drop-shadow-sm mb-6 text-lg">
                  Subdivisões por Dimensão
                </h3>

                <div className="space-y-8">
                  {bigFiveData.map((dimension) => (
                    <div key={dimension.fullName}>
                      <h4 className="text-white drop-shadow-sm mb-4">
                        {dimension.fullName}
                      </h4>
                      <div className="space-y-3">
                        {bigFiveSubdivisoes[dimension.fullName as keyof typeof bigFiveSubdivisoes]?.map((sub) => (
                          <div key={sub.nome}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white/80 drop-shadow-sm text-sm">{sub.nome}</span>
                              <span className="text-white/70 drop-shadow-sm text-sm">{sub.score}/100</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${sub.score}%`,
                                  backgroundColor: getScoreColor(sub.score),
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Glass>

              {/* Detalhamento */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl">
                <h3 className="text-white drop-shadow-sm mb-6 text-lg">
                  Detalhamento
                </h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-green-400 drop-shadow-sm mb-3 flex items-center gap-2">
                      🟢 Pontos Fortes
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-white/80 drop-shadow-sm">
                      <li>Alta organização e disciplina</li>
                      <li>Cooperativa e empática</li>
                      <li>Confiável e responsável</li>
                      <li>Boa abertura para novas experiências</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-yellow-400 drop-shadow-sm mb-3 flex items-center gap-2">
                      🟡 Pontos de Atenção
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-white/80 drop-shadow-sm">
                      <li>Pode ser sensível a críticas</li>
                      <li>Necessita ambiente de trabalho estável</li>
                      <li>Preferência por rotinas estabelecidas</li>
                    </ul>
                  </div>
                </div>
              </Glass>
            </Glass>
          </TabsContent>

          {/* ABA: DISC */}
          <TabsContent value="disc" className="space-y-6 mt-6">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                💼 Análise DISC
              </h2>

              {/* Análise da IA */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6 border-2 border-[#35BFAD]/30">
                <h3 className="text-white drop-shadow-sm mb-4 flex items-center gap-2 text-lg">
                  🤖 Interpretação da IA
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white drop-shadow-sm">
                    <span>Perfil Combinado:</span>
                    <span className="text-xl text-[#35BFAD]">IS - Influente Estável</span>
                  </div>
                  <p className="text-white/90 drop-shadow-sm leading-relaxed">
                    "Perfil IS (Influente-Estável) caracteriza-se por ser comunicativo, empático 
                    e orientado para relacionamentos. Ideal para funções de atendimento, demonstra 
                    habilidade em criar vínculos com pacientes e trabalhar harmoniosamente em equipe."
                  </p>
                  <div className="flex items-center gap-2 text-white/70 drop-shadow-sm text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Tempo de conclusão: 8min 15s</span>
                  </div>
                </div>
              </Glass>

              {/* Resultados por Dimensão */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6">
                <h3 className="text-white drop-shadow-sm mb-6 text-lg">
                  Resultados por Dimensão
                </h3>

                {/* Gráfico de Barras Verticais */}
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={discData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis 
                      dataKey="letter" 
                      tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: 'rgba(255, 255, 255, 0.6)' }}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 16, 158, 0.9)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                      {discData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  {discData.map((item) => (
                    <div key={item.letter} className="text-center">
                      <div 
                        className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white"
                        style={{ backgroundColor: item.color }}
                      >
                        {item.letter}
                      </div>
                      <div className="text-white/80 drop-shadow-sm text-sm mb-1">
                        {item.dimension}
                      </div>
                      <div className="text-white drop-shadow-sm">
                        {item.score}/100
                      </div>
                    </div>
                  ))}
                </div>
              </Glass>

              {/* Detalhamento */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl">
                <h3 className="text-white drop-shadow-sm mb-6 text-lg">
                  Características do Perfil IS
                </h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-green-400 drop-shadow-sm mb-3 flex items-center gap-2">
                      🟢 Pontos Fortes
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-white/80 drop-shadow-sm">
                      <li>Excelente em comunicação e relacionamento interpessoal</li>
                      <li>Cria ambiente acolhedor e positivo</li>
                      <li>Trabalha bem em equipe</li>
                      <li>Paciente e atencioso com clientes</li>
                      <li>Flexível e adaptável</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-yellow-400 drop-shadow-sm mb-3 flex items-center gap-2">
                      🟡 Pontos de Atenção
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-white/80 drop-shadow-sm">
                      <li>Pode evitar confrontos necessários</li>
                      <li>Necessita validação e reconhecimento</li>
                      <li>Pode ter dificuldade em tomar decisões rápidas</li>
                    </ul>
                  </div>
                </div>
              </Glass>
            </Glass>
          </TabsContent>

          {/* ABA: INTELIGÊNCIA */}
          <TabsContent value="inteligencia" className="space-y-6 mt-6">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                🎯 Teste de Inteligência (Raven)
              </h2>

              {/* Análise da IA */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6 border-2 border-[#35BFAD]/30">
                <h3 className="text-white drop-shadow-sm mb-4 flex items-center gap-2 text-lg">
                  🤖 Interpretação da IA
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 text-white drop-shadow-sm">
                    <div className="flex items-center gap-2">
                      <span>Acertos:</span>
                      <span className="text-xl text-[#35BFAD]">{ravenAcertos}/60</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Percentil:</span>
                      <span className="text-xl text-[#35BFAD]">P{ravenPercentil}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Classificação:</span>
                      <span className="text-xl text-[#35BFAD]">{classificacaoAtual.nivel}</span>
                    </div>
                  </div>
                  <p className="text-white/90 drop-shadow-sm leading-relaxed">
                    {classificacaoAtual.descricao}
                  </p>
                  <div className="flex items-center gap-2 text-white/70 drop-shadow-sm text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Tempo de conclusão: 25min 45s</span>
                  </div>
                  <p className="text-white/70 drop-shadow-sm text-sm">
                    * Melhor que {ravenPercentil}% dos candidatos que realizaram este teste
                  </p>
                </div>
              </Glass>

              {/* Breakdown por Bloco de Questões */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6">
                <h3 className="text-white drop-shadow-sm mb-6 text-lg">
                  Desempenho por Bloco de Questões
                </h3>

                <div className="space-y-4">
                  {ravenBlocos.map((bloco) => (
                    <div key={bloco.bloco}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white drop-shadow-sm">Bloco {bloco.bloco}</span>
                        <span className="text-white/80 drop-shadow-sm">
                          {bloco.acertos}/{bloco.total} ({bloco.percentual}%)
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${bloco.percentual}%`,
                            backgroundColor: getScoreColor(bloco.percentual),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gráfico de Barras */}
                <div className="mt-8">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={ravenBlocos}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis 
                        dataKey="bloco"
                        tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
                      />
                      <YAxis 
                        domain={[0, 12]}
                        tick={{ fill: 'rgba(255, 255, 255, 0.6)' }}
                        label={{ value: 'Acertos', angle: -90, position: 'insideLeft', fill: 'rgba(255, 255, 255, 0.8)' }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 16, 158, 0.9)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="acertos" radius={[8, 8, 0, 0]}>
                        {ravenBlocos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getScoreColor(entry.percentual)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Glass>

              {/* Tabela de Classificação */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6">
                <h3 className="text-white drop-shadow-sm mb-6 text-lg">
                  Tabela de Classificação (Raven)
                </h3>
                
                <div className="space-y-2">
                  {ravenClassificacao.map((faixa, index) => {
                    const isAtual = faixa.nivel === classificacaoAtual.nivel;
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg transition-all duration-200 ${
                          isAtual ? 'ring-2 ring-[#35BFAD] ring-offset-2 ring-offset-transparent' : ''
                        }`}
                        style={{ 
                          backgroundColor: faixa.cor,
                          color: faixa.textColor,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">
                              {faixa.faixa} acertos
                            </span>
                            {isAtual && (
                              <span className="px-2 py-1 bg-[#35BFAD] text-white rounded text-xs">
                                Você está aqui
                              </span>
                            )}
                          </div>
                          <span className="font-semibold">{faixa.nivel}</span>
                        </div>
                        <p className="text-sm opacity-90 text-[rgb(0,0,0)]">
                          {faixa.descricao}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Glass>

              {/* Explicação do Percentil */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl">
                <h3 className="text-white drop-shadow-sm mb-4 text-lg">
                  O que significa Percentil {ravenPercentil}?
                </h3>
                <p className="text-white/80 drop-shadow-sm leading-relaxed">
                  O percentil indica a posição da candidata em relação a outros candidatos. 
                  Um percentil de {ravenPercentil} significa que ela teve desempenho melhor que {ravenPercentil}% das pessoas 
                  que fizeram o mesmo teste. Isso demonstra capacidade cognitiva acima da média, 
                  adequada para as demandas da vaga.
                </p>
              </Glass>
            </Glass>
          </TabsContent>

          {/* ABA: CULTURA */}
          <TabsContent value="cultura" className="space-y-6 mt-6">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                🏢 Questionário de Cultura
              </h2>

              {/* Análise da IA */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6 border-2 border-[#35BFAD]/30">
                <h3 className="text-white drop-shadow-sm mb-4 flex items-center gap-2 text-lg">
                  🤖 Análise da IA
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white drop-shadow-sm">
                    <span>Score Geral:</span>
                    <span className="text-xl text-[#35BFAD]">82/100</span>
                    <span>🟢</span>
                  </div>
                  <p className="text-white/90 drop-shadow-sm leading-relaxed">
                    "Forte alinhamento cultural com a Beauty Smile. As respostas demonstram 
                    valorização de excelência no atendimento, trabalho em equipe e desenvolvimento 
                    contínuo - pilares fundamentais da cultura organizacional."
                  </p>
                  <div className="flex items-center gap-2 text-white/70 drop-shadow-sm text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Tempo de conclusão: 18min 20s</span>
                  </div>
                </div>
              </Glass>

              {/* Respostas */}
              <div className="space-y-6">
                {culturaRespostas.map((item, index) => (
                  <Glass key={index} variant="white" blur="sm" className="p-6 rounded-xl">
                    <h4 className="text-white drop-shadow-sm mb-3">
                      {item.pergunta}
                    </h4>
                    <p className="text-white/80 drop-shadow-sm leading-relaxed mb-4">
                      {item.resposta}
                    </p>

                    {/* Análise da IA para esta resposta */}
                    <div className="border-t border-white/20 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white/70 drop-shadow-sm text-sm">
                          Análise da IA
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-white/70 drop-shadow-sm text-sm">
                            Alinhamento:
                          </span>
                          <span className="text-[#35BFAD] drop-shadow-sm">
                            {item.alinhamento}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Keywords identificadas */}
                      <div className="flex flex-wrap gap-2">
                        {item.keywords.map((keyword, kidx) => (
                          <span
                            key={kidx}
                            className="px-3 py-1 bg-[#35BFAD]/20 text-[#35BFAD] rounded-full text-sm border border-[#35BFAD]/30"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Glass>
                ))}
              </div>

              {/* Comparação com Manifesto */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mt-6">
                <h3 className="text-white drop-shadow-sm mb-4 text-lg">
                  Comparação com Manifesto Institucional
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-white/80 drop-shadow-sm">
                      Alinhamento com valor "Excelência no Atendimento": 95%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-white/80 drop-shadow-sm">
                      Alinhamento com valor "Trabalho em Equipe": 92%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-white/80 drop-shadow-sm">
                      Alinhamento com valor "Desenvolvimento Contínuo": 88%
                    </span>
                  </div>
                </div>
              </Glass>
            </Glass>
          </TabsContent>

          {/* ABA: ENTREVISTA ONLINE */}
          <TabsContent value="entrevista-online" className="space-y-6 mt-6">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                🎥 Entrevista Online
              </h2>

              {/* Status */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6">
                <div className="flex items-center gap-3 text-white drop-shadow-sm mb-6">
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <span className="text-lg">Status: Não realizada</span>
                </div>

                {/* Links para Enviar */}
                <h3 className="text-white drop-shadow-sm mb-4">
                  Enviar Link da Entrevista
                </h3>
                <div className="flex gap-3">
                  <GlassButton
                    variant="white"
                    onClick={handleContatoEmail}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 drop-shadow-md"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Enviar por Email
                  </GlassButton>
                  <GlassButton
                    variant="white"
                    onClick={handleContatoWhatsApp}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-300 px-6 py-3 drop-shadow-md"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Enviar por WhatsApp
                  </GlassButton>
                </div>
              </Glass>

              {/* OU */}
              <div className="text-center text-white/60 drop-shadow-sm my-6">
                OU
              </div>

              {/* Transcrição */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl">
                <h3 className="text-white drop-shadow-sm mb-4">
                  Transcrição da Entrevista
                </h3>
                <Textarea
                  value={transcricaoOnline}
                  onChange={(e) => setTranscricaoOnline(e.target.value)}
                  placeholder="Cole ou digite a transcrição da entrevista online aqui..."
                  className="min-h-[300px] bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
                />
                <GlassButton
                  variant="primary"
                  onClick={handleSalvarTranscricaoOnline}
                  disabled={!transcricaoOnline.trim()}
                  className="mt-4 bg-[#00109E] hover:bg-[#000C7A] text-white px-6 py-3 drop-shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Salvar Transcrição
                </GlassButton>
              </Glass>

              {/* Análise (aparece após salvar) */}
              {transcricaoOnline && (
                <Glass variant="white" blur="sm" className="p-6 rounded-xl mt-6 border-2 border-[#35BFAD]/30">
                  <h3 className="text-white drop-shadow-sm mb-4 flex items-center gap-2 text-lg">
                    🤖 Análise da IA da Entrevista
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-white drop-shadow-sm mb-2">Pontos-Chave Identificados:</h4>
                      <ul className="list-disc list-inside space-y-1 text-white/80 drop-shadow-sm">
                        <li>Comunicação clara e objetiva</li>
                        <li>Demonstrou conhecimento técnico adequado</li>
                        <li>Postura profissional e empática</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white drop-shadow-sm mb-2">Sentimento Geral:</h4>
                      <p className="text-white/80 drop-shadow-sm">Positivo e confiante</p>
                    </div>
                    <div>
                      <h4 className="text-white drop-shadow-sm mb-2">Red Flags:</h4>
                      <p className="text-white/80 drop-shadow-sm">Nenhum identificado</p>
                    </div>
                  </div>
                </Glass>
              )}
            </Glass>
          </TabsContent>

          {/* ABA: ENTREVISTA PRESENCIAL */}
          <TabsContent value="entrevista-presencial" className="space-y-6 mt-6">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                🤝 Entrevista Presencial
              </h2>

              {/* Status */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6">
                <div className="flex items-center gap-3 text-white drop-shadow-sm mb-6">
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <span className="text-lg">Status: Não realizada</span>
                </div>

                {/* Links para Agendar */}
                <h3 className="text-white drop-shadow-sm mb-4">
                  Agendar Entrevista Presencial
                </h3>
                <div className="flex gap-3">
                  <GlassButton
                    variant="white"
                    onClick={handleContatoEmail}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 drop-shadow-md"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Enviar Convite por Email
                  </GlassButton>
                  <GlassButton
                    variant="white"
                    onClick={handleContatoWhatsApp}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-300 px-6 py-3 drop-shadow-md"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Enviar Convite por WhatsApp
                  </GlassButton>
                </div>
              </Glass>

              {/* OU */}
              <div className="text-center text-white/60 drop-shadow-sm my-6">
                OU
              </div>

              {/* Transcrição */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl">
                <h3 className="text-white drop-shadow-sm mb-4">
                  Transcrição da Entrevista
                </h3>
                <Textarea
                  value={transcricaoPresencial}
                  onChange={(e) => setTranscricaoPresencial(e.target.value)}
                  placeholder="Cole ou digite a transcrição da entrevista presencial aqui..."
                  className="min-h-[300px] bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
                />
                <GlassButton
                  variant="primary"
                  onClick={handleSalvarTranscricaoPresencial}
                  disabled={!transcricaoPresencial.trim()}
                  className="mt-4 bg-[#00109E] hover:bg-[#000C7A] text-white px-6 py-3 drop-shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Salvar Transcrição
                </GlassButton>
              </Glass>

              {/* Análise (aparece após salvar) */}
              {transcricaoPresencial && (
                <Glass variant="white" blur="sm" className="p-6 rounded-xl mt-6 border-2 border-[#35BFAD]/30">
                  <h3 className="text-white drop-shadow-sm mb-4 flex items-center gap-2 text-lg">
                    🤖 Análise da IA da Entrevista
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-white drop-shadow-sm mb-2">Pontos-Chave Identificados:</h4>
                      <ul className="list-disc list-inside space-y-1 text-white/80 drop-shadow-sm">
                        <li>Apresentação pessoal profissional</li>
                        <li>Boa linguagem corporal e contato visual</li>
                        <li>Respostas coerentes e bem fundamentadas</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white drop-shadow-sm mb-2">Sentimento Geral:</h4>
                      <p className="text-white/80 drop-shadow-sm">Positivo e entusiasmado</p>
                    </div>
                    <div>
                      <h4 className="text-white drop-shadow-sm mb-2">Red Flags:</h4>
                      <p className="text-white/80 drop-shadow-sm">Nenhum identificado</p>
                    </div>
                  </div>
                </Glass>
              )}
            </Glass>
          </TabsContent>

          {/* ABA: HISTÓRICO */}
          <TabsContent value="historico" className="space-y-6 mt-6">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                📜 Histórico Completo
              </h2>

              <div className="space-y-4">
                {historico.map((item) => (
                  <Glass key={item.id} variant="white" blur="sm" className="p-6 rounded-xl">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {getHistoricoIcon(item.tipo)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white drop-shadow-sm mb-1">
                          {item.titulo}
                        </h3>
                        <p className="text-white/80 drop-shadow-sm text-sm mb-2">
                          {item.descricao}
                        </p>
                        <div className="flex items-center gap-4 text-white/60 drop-shadow-sm text-xs">
                          <span>{item.data} - {item.hora}</span>
                          {item.autor && <span>Por: {item.autor}</span>}
                        </div>
                      </div>
                    </div>
                  </Glass>
                ))}
              </div>
            </Glass>
          </TabsContent>

          {/* ABA: NOTAS */}
          <TabsContent value="notas" className="space-y-6 mt-6">
            <Glass variant="white" blur="lg" className="p-8 rounded-xl">
              <h2 className="text-white drop-shadow-md mb-6 flex items-center gap-2 text-2xl">
                📝 Notas Internas do RH
              </h2>

              {/* Adicionar Nova Nota */}
              <Glass variant="white" blur="sm" className="p-6 rounded-xl mb-6">
                <Textarea
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                  placeholder="Adicionar nota sobre este candidato..."
                  className="min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none mb-4"
                />
                <GlassButton
                  variant="primary"
                  onClick={handleAdicionarNota}
                  disabled={!novaNota.trim()}
                  className="bg-[#00109E] hover:bg-[#000C7A] text-white px-6 py-3 drop-shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <StickyNote className="w-5 h-5 mr-2" />
                  Adicionar Nota
                </GlassButton>
              </Glass>

              {/* Separador */}
              <div className="h-px bg-white/20 my-6" />

              {/* Lista de Notas */}
              <div className="space-y-4">
                {notas.map((nota) => (
                  <Glass 
                    key={nota.id} 
                    variant="white" 
                    blur="sm" 
                    className="p-6 rounded-xl border-l-4 border-[#35BFAD] group hover:bg-white/20 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-white/80 drop-shadow-sm text-sm">
                        <span className="text-white">{nota.autor}</span> - {nota.data} {nota.hora}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                        <button className="text-white/60 hover:text-white transition-colors duration-200">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleExcluirNota(nota.id)}
                          className="text-red-400/60 hover:text-red-400 transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-white drop-shadow-sm leading-relaxed">
                      {nota.texto}
                    </p>
                  </Glass>
                ))}
              </div>
            </Glass>
          </TabsContent>
        </Tabs>
      </div>
    </RHLayout>
  );
}
