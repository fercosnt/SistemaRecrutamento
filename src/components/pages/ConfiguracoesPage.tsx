import React, { useState } from 'react';
import { RHLayout } from '../RHLayout';
import { Glass, GlassButton } from '../ui/glass';
import { Building2, Mail, Plug, Users, FileText, Save, Eye, Plus, MoreVertical, Search, UserPlus, Shield, Key, UserX, Trash2, Link as LinkIcon } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { RichTextEditor } from '../RichTextEditor';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

interface TemplateEmail {
  id: string;
  nome: string;
  ativo: boolean;
  assunto: string;
  corpo: string;
}

interface WebhookConfig {
  id: string;
  nome: string;
  url: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  nivel: 'admin' | 'gerente' | 'recrutador' | 'visualizador';
  ativo: boolean;
  ultimoAcesso: string;
  avatar?: string;
  vagasVinculadas?: string[];
}

interface Permissoes {
  vagas: {
    verTodas: boolean;
    criar: boolean;
    editar: boolean;
    excluir: boolean;
  };
  candidatos: {
    verTodos: boolean;
    aprovar: boolean;
    rejeitar: boolean;
    notas: boolean;
    emails: boolean;
    exportar: boolean;
  };
  relatorios: {
    dashboard: boolean;
    exportar: boolean;
    financeiro: boolean;
  };
  configuracoes: {
    usuarios: boolean;
    sistema: boolean;
    templates: boolean;
    auditoria: boolean;
    integracoes: boolean;
  };
}

interface Vaga {
  id: string;
  titulo: string;
  localizacao: string;
  candidatos: number;
}

interface LogAuditoria {
  id: string;
  timestamp: string;
  usuario: string;
  usuarioId: string;
  acao: string;
  categoria: 'vaga' | 'candidato' | 'usuario' | 'sistema' | 'email';
  detalhes: string;
  vagaId?: string;
  vagaTitulo?: string;
  ip?: string;
}

interface ConfiguracoesPageProps {
  onVoltar?: () => void;
}

export function ConfiguracoesPage({ onVoltar }: ConfiguracoesPageProps) {
  // Estado - Empresa
  const [dadosEmpresa, setDadosEmpresa] = useState({
    nome: 'Beauty Smile',
    email: 'contato@beautysmile.com.br',
    telefone: '(11) 3000-0000',
    site: 'https://beautysmile.com.br',
    manifesto: '<p>Na Beauty Smile, acreditamos que cada sorriso conta uma história única...</p>',
  });

  // Estado - Templates de Email
  const [templates, setTemplates] = useState<TemplateEmail[]>([
    {
      id: '1',
      nome: 'Confirmação de Candidatura',
      ativo: true,
      assunto: 'Confirmação de candidatura - {vaga_titulo}',
      corpo: '<p>Olá {candidato_nome},</p><p>Obrigado por se candidatar à vaga de {vaga_titulo} na {empresa_nome}.</p>',
    },
    {
      id: '2',
      nome: 'Convite para Testes',
      ativo: true,
      assunto: 'Convite para testes - {vaga_titulo}',
      corpo: '<p>Olá {candidato_nome},</p><p>Você foi selecionado(a) para realizar os testes da vaga {vaga_titulo}.</p>',
    },
    {
      id: '3',
      nome: 'Avançou para Próxima Fase',
      ativo: true,
      assunto: 'Parabéns! Você avançou para a próxima fase',
      corpo: '<p>Olá {candidato_nome},</p><p>Parabéns! Você avançou para a próxima etapa do processo seletivo.</p>',
    },
    {
      id: '4',
      nome: 'Aprovação',
      ativo: true,
      assunto: 'Parabéns! Você foi aprovado(a)',
      corpo: '<p>Olá {candidato_nome},</p><p>Temos o prazer de informar que você foi aprovado(a) para a vaga de {vaga_titulo}!</p>',
    },
    {
      id: '5',
      nome: 'Rejeição',
      ativo: false,
      assunto: 'Processo Seletivo - {vaga_titulo}',
      corpo: '<p>Olá {candidato_nome},</p><p>Agradecemos seu interesse na vaga de {vaga_titulo}. Infelizmente, neste momento, optamos por seguir com outros candidatos.</p>',
    },
  ]);

  // Estado - Modal de edição de template
  const [templateEditando, setTemplateEditando] = useState<TemplateEmail | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Estado - Webhooks
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    { id: '1', nome: 'Formulário Inicial', url: '' },
    { id: '2', nome: 'Big Five', url: '' },
    { id: '3', nome: 'DISC', url: '' },
    { id: '4', nome: 'Raven', url: '' },
    { id: '5', nome: 'Cultura', url: '' },
    { id: '6', nome: 'Entrevista Presencial', url: '' },
    { id: '7', nome: 'Entrevista Online', url: '' },
    { id: '8', nome: 'Análise Final', url: '' },
    { id: '9', nome: 'Email Confirmação de Candidatura', url: '' },
    { id: '10', nome: 'Email Recuperar Senha', url: '' },
    { id: '11', nome: 'Email Convite para Testes', url: '' },
    { id: '12', nome: 'Email Avançou para Próxima Etapa', url: '' },
    { id: '13', nome: 'Email de Aprovação', url: '' },
    { id: '14', nome: 'Email de Rejeição', url: '' },
  ]);

  // Estado - Usuários
  const [usuarios, setUsuarios] = useState<Usuario[]>([
    {
      id: '1',
      nome: 'João Silva',
      email: 'joao@beautysmile.com.br',
      cargo: 'Administrador',
      nivel: 'admin',
      ativo: true,
      ultimoAcesso: 'Há 2 horas',
    },
    {
      id: '2',
      nome: 'Maria Santos',
      email: 'maria@beautysmile.com.br',
      cargo: 'Gerente RH',
      nivel: 'gerente',
      ativo: true,
      ultimoAcesso: 'Há 1 dia',
    },
    {
      id: '3',
      nome: 'Carlos Oliveira',
      email: 'carlos@beautysmile.com.br',
      cargo: 'Recrutador',
      nivel: 'recrutador',
      ativo: true,
      ultimoAcesso: 'Há 3 dias',
      vagasVinculadas: ['1', '2'],
    },
    {
      id: '4',
      nome: 'Ana Costa',
      email: 'ana@beautysmile.com.br',
      cargo: 'Visualizador',
      nivel: 'visualizador',
      ativo: false,
      ultimoAcesso: 'Há 1 semana',
    },
  ]);

  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [modalNovoUsuario, setModalNovoUsuario] = useState(false);
  const [modalPermissoes, setModalPermissoes] = useState(false);
  const [modalVincularVagas, setModalVincularVagas] = useState(false);
  const [modalRedefinirSenha, setModalRedefinirSenha] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);

  const [novoUsuario, setNovoUsuario] = useState({
    nome: '',
    email: '',
    nivel: '' as '' | 'admin' | 'gerente' | 'recrutador' | 'visualizador',
  });

  const [permissoesEditando, setPermissoesEditando] = useState<Permissoes>({
    vagas: { verTodas: true, criar: true, editar: true, excluir: true },
    candidatos: { verTodos: true, aprovar: true, rejeitar: true, notas: true, emails: true, exportar: true },
    relatorios: { dashboard: true, exportar: true, financeiro: false },
    configuracoes: { usuarios: false, sistema: false, templates: true, auditoria: true, integracoes: false },
  });

  // Mock de vagas para vincular
  const [vagasDisponiveis] = useState<Vaga[]>([
    { id: '1', titulo: 'Assistente Odontológico', localizacao: 'São Paulo, SP', candidatos: 8 },
    { id: '2', titulo: 'Recepcionista', localizacao: 'Rio de Janeiro, RJ', candidatos: 15 },
    { id: '3', titulo: 'Dentista Especialista', localizacao: 'São Paulo, SP', candidatos: 3 },
    { id: '4', titulo: 'Coordenador de Clínica', localizacao: 'Belo Horizonte, MG', candidatos: 5 },
    { id: '5', titulo: 'Auxiliar Administrativo', localizacao: 'Curitiba, PR', candidatos: 2 },
  ]);

  const [vagasSelecionadas, setVagasSelecionadas] = useState<string[]>([]);

  // Estado - Auditoria
  const [logsAuditoria] = useState<LogAuditoria[]>([
    {
      id: '1',
      timestamp: '2025-11-02 14:32:15',
      usuario: 'João Silva',
      usuarioId: '1',
      acao: 'Criou vaga',
      categoria: 'vaga',
      detalhes: 'Nova vaga criada: Assistente Odontológico',
      vagaId: '1',
      vagaTitulo: 'Assistente Odontológico',
      ip: '192.168.1.100',
    },
    {
      id: '2',
      timestamp: '2025-11-02 14:15:42',
      usuario: 'Maria Santos',
      usuarioId: '2',
      acao: 'Aprovou candidato',
      categoria: 'candidato',
      detalhes: 'Candidato Carlos Silva aprovado para a vaga de Recepcionista',
      vagaId: '2',
      vagaTitulo: 'Recepcionista',
      ip: '192.168.1.101',
    },
    {
      id: '3',
      timestamp: '2025-11-02 13:58:22',
      usuario: 'Carlos Oliveira',
      usuarioId: '3',
      acao: 'Editou vaga',
      categoria: 'vaga',
      detalhes: 'Alterou descrição da vaga: Dentista Especialista',
      vagaId: '3',
      vagaTitulo: 'Dentista Especialista',
      ip: '192.168.1.102',
    },
    {
      id: '4',
      timestamp: '2025-11-02 13:45:10',
      usuario: 'João Silva',
      usuarioId: '1',
      acao: 'Adicionou usuário',
      categoria: 'usuario',
      detalhes: 'Novo usuário criado: Ana Costa (Visualizador)',
      ip: '192.168.1.100',
    },
    {
      id: '5',
      timestamp: '2025-11-02 12:30:05',
      usuario: 'Maria Santos',
      usuarioId: '2',
      acao: 'Rejeitou candidato',
      categoria: 'candidato',
      detalhes: 'Candidato Pedro Alves rejeitado para a vaga de Coordenador de Clínica',
      vagaId: '4',
      vagaTitulo: 'Coordenador de Clínica',
      ip: '192.168.1.101',
    },
    {
      id: '6',
      timestamp: '2025-11-02 11:22:33',
      usuario: 'Carlos Oliveira',
      usuarioId: '3',
      acao: 'Enviou email',
      categoria: 'email',
      detalhes: 'Email de convite enviado para 5 candidatos',
      vagaId: '1',
      vagaTitulo: 'Assistente Odontológico',
      ip: '192.168.1.102',
    },
    {
      id: '7',
      timestamp: '2025-11-02 10:15:18',
      usuario: 'João Silva',
      usuarioId: '1',
      acao: 'Alterou permissões',
      categoria: 'usuario',
      detalhes: 'Permissões de Carlos Oliveira atualizadas',
      ip: '192.168.1.100',
    },
    {
      id: '8',
      timestamp: '2025-11-02 09:42:51',
      usuario: 'Maria Santos',
      usuarioId: '2',
      acao: 'Publicou vaga',
      categoria: 'vaga',
      detalhes: 'Vaga publicada: Auxiliar Administrativo',
      vagaId: '5',
      vagaTitulo: 'Auxiliar Administrativo',
      ip: '192.168.1.101',
    },
    {
      id: '9',
      timestamp: '2025-11-02 09:10:25',
      usuario: 'João Silva',
      usuarioId: '1',
      acao: 'Configurou webhook',
      categoria: 'sistema',
      detalhes: 'Webhook configurado para Formulário Inicial',
      ip: '192.168.1.100',
    },
    {
      id: '10',
      timestamp: '2025-11-01 18:55:40',
      usuario: 'Carlos Oliveira',
      usuarioId: '3',
      acao: 'Aprovou candidato',
      categoria: 'candidato',
      detalhes: 'Candidato Juliana Lima aprovada para a vaga de Assistente Odontológico',
      vagaId: '1',
      vagaTitulo: 'Assistente Odontológico',
      ip: '192.168.1.102',
    },
    {
      id: '11',
      timestamp: '2025-11-01 17:30:12',
      usuario: 'Maria Santos',
      usuarioId: '2',
      acao: 'Editou template',
      categoria: 'email',
      detalhes: 'Template de email atualizado: Confirmação de Candidatura',
      ip: '192.168.1.101',
    },
    {
      id: '12',
      timestamp: '2025-11-01 16:20:05',
      usuario: 'João Silva',
      usuarioId: '1',
      acao: 'Excluiu vaga',
      categoria: 'vaga',
      detalhes: 'Vaga excluída: Auxiliar de Limpeza',
      ip: '192.168.1.100',
    },
    {
      id: '13',
      timestamp: '2025-11-01 15:45:33',
      usuario: 'Carlos Oliveira',
      usuarioId: '3',
      acao: 'Adicionou nota',
      categoria: 'candidato',
      detalhes: 'Nota adicionada ao perfil de Ana Paula Souza',
      vagaId: '2',
      vagaTitulo: 'Recepcionista',
      ip: '192.168.1.102',
    },
    {
      id: '14',
      timestamp: '2025-11-01 14:12:22',
      usuario: 'Maria Santos',
      usuarioId: '2',
      acao: 'Exportou relatório',
      categoria: 'sistema',
      detalhes: 'Relatório de candidatos exportado em PDF',
      ip: '192.168.1.101',
    },
    {
      id: '15',
      timestamp: '2025-11-01 13:05:18',
      usuario: 'João Silva',
      usuarioId: '1',
      acao: 'Desativou usuário',
      categoria: 'usuario',
      detalhes: 'Usuário Ana Costa desativado',
      ip: '192.168.1.100',
    },
  ]);

  const [filtroUsuarioAudit, setFiltroUsuarioAudit] = useState('todos');
  const [filtroAcao, setFiltroAcao] = useState('todas');
  const [filtroVaga, setFiltroVaga] = useState('todas');
  const [buscaAudit, setBuscaAudit] = useState('');

  const handleSalvarEmpresa = () => {
    console.log('Salvando dados da empresa:', dadosEmpresa);
  };

  const handleEditarTemplate = (template: TemplateEmail) => {
    setTemplateEditando({ ...template });
    setModalAberto(true);
  };

  const handleSalvarTemplate = () => {
    if (templateEditando) {
      setTemplates(
        templates.map((t) => (t.id === templateEditando.id ? templateEditando : t))
      );
      setModalAberto(false);
      setTemplateEditando(null);
    }
  };

  const handleSalvarWebhook = (id: string) => {
    console.log('Salvando webhook:', webhooks.find((w) => w.id === id));
  };

  const handleUpdateWebhook = (id: string, url: string) => {
    setWebhooks(webhooks.map((w) => (w.id === id ? { ...w, url } : w)));
  };

  const handleAdicionarUsuario = () => {
    if (novoUsuario.nome && novoUsuario.email && novoUsuario.nivel) {
      const usuario: Usuario = {
        id: String(usuarios.length + 1),
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        cargo: getNomeCargo(novoUsuario.nivel),
        nivel: novoUsuario.nivel,
        ativo: true,
        ultimoAcesso: 'Nunca',
      };
      setUsuarios([...usuarios, usuario]);
      setModalNovoUsuario(false);
      setNovoUsuario({ nome: '', email: '', nivel: '' });
    }
  };

  const handleToggleAtivo = (id: string) => {
    setUsuarios(usuarios.map((u) => (u.id === id ? { ...u, ativo: !u.ativo } : u)));
  };

  const handleExcluirUsuario = () => {
    if (usuarioSelecionado) {
      setUsuarios(usuarios.filter((u) => u.id !== usuarioSelecionado.id));
      setModalExcluir(false);
      setUsuarioSelecionado(null);
    }
  };

  const handleSalvarPermissoes = () => {
    console.log('Salvando permissões:', permissoesEditando);
    setModalPermissoes(false);
  };

  const handleSalvarVinculos = () => {
    if (usuarioSelecionado) {
      setUsuarios(
        usuarios.map((u) =>
          u.id === usuarioSelecionado.id ? { ...u, vagasVinculadas: vagasSelecionadas } : u
        )
      );
      setModalVincularVagas(false);
      setVagasSelecionadas([]);
    }
  };

  const handleRedefinirSenha = () => {
    console.log('Enviando email de redefinição para:', usuarioSelecionado?.email);
    setModalRedefinirSenha(false);
    setUsuarioSelecionado(null);
  };

  const getNomeCargo = (nivel: string): string => {
    const map: Record<string, string> = {
      admin: 'Administrador',
      gerente: 'Gerente RH',
      recrutador: 'Recrutador',
      visualizador: 'Visualizador',
    };
    return map[nivel] || '';
  };

  const getNivelBadgeColor = (nivel: string): string => {
    const colors: Record<string, string> = {
      admin: 'bg-[#00109E] text-white',
      gerente: 'bg-[#BB965B] text-white',
      recrutador: 'bg-[#35BFAD] text-white',
      visualizador: 'bg-gray-400 text-white',
    };
    return colors[nivel] || 'bg-gray-400 text-white';
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const matchBusca =
      usuario.nome.toLowerCase().includes(buscaUsuario.toLowerCase()) ||
      usuario.email.toLowerCase().includes(buscaUsuario.toLowerCase());
    const matchFiltro =
      filtroUsuario === 'todos' ||
      (filtroUsuario === 'ativos' && usuario.ativo) ||
      (filtroUsuario === 'inativos' && !usuario.ativo);
    return matchBusca && matchFiltro;
  });

  const niveis = [
    {
      id: 'admin',
      emoji: '🔴',
      nome: 'Administrador',
      descricao: 'Acesso total ao sistema',
      permissoes: [
        'Gerenciar todos os usuários',
        'Criar e editar vagas',
        'Aprovar/rejeitar candidatos',
        'Configurar sistema',
      ],
    },
    {
      id: 'gerente',
      emoji: '🟡',
      nome: 'Gerente RH',
      descricao: 'Gerenciamento completo de recrutamento',
      permissoes: [
        'Criar e editar vagas',
        'Aprovar/rejeitar candidatos',
        'Adicionar notas',
        'Visualizar relatórios',
      ],
    },
    {
      id: 'recrutador',
      emoji: '🟢',
      nome: 'Recrutador',
      descricao: 'Gerenciamento de vagas atribuídas',
      permissoes: [
        'Editar vagas vinculadas',
        'Aprovar/rejeitar candidatos das vagas',
        'Adicionar notas',
        'Sem acesso a configurações',
      ],
    },
    {
      id: 'visualizador',
      emoji: '⚪',
      nome: 'Visualizador',
      descricao: 'Apenas visualização, sem editar',
      permissoes: [
        'Ver vagas e candidatos',
        'Ver perfis completos',
        'Ver relatórios',
        'Não pode aprovar/rejeitar',
      ],
    },
  ];

  return (
    <RHLayout>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-white drop-shadow-lg mb-2">Configurações</h1>
            <p className="text-white/80 drop-shadow-md">
              Gerencie as configurações do sistema de recrutamento
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="empresa" className="w-full">
            <TabsList className="bg-white/10 backdrop-blur-md border border-white/20 p-1 mb-8">
              <TabsTrigger
                value="empresa"
                className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white transition-all duration-200"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Empresa
              </TabsTrigger>
              <TabsTrigger
                value="emails"
                className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white transition-all duration-200"
              >
                <Mail className="w-4 h-4 mr-2" />
                Emails
              </TabsTrigger>
              <TabsTrigger
                value="integracoes"
                className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white transition-all duration-200"
              >
                <Plug className="w-4 h-4 mr-2" />
                Integrações
              </TabsTrigger>
              <TabsTrigger
                value="usuarios"
                className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white transition-all duration-200"
              >
                <Users className="w-4 h-4 mr-2" />
                Usuários
              </TabsTrigger>
              <TabsTrigger
                value="auditoria"
                className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white transition-all duration-200"
              >
                <FileText className="w-4 h-4 mr-2" />
                Auditoria
              </TabsTrigger>
            </TabsList>

            {/* ABA: EMPRESA */}
            <TabsContent value="empresa" className="mt-0">
              <Glass variant="white" blur="md" className="p-8 rounded-xl space-y-8">
                <div>
                  <h2 className="text-white drop-shadow-lg mb-1">
                    ⚙️ Configurações da Empresa
                  </h2>
                  <div className="h-px bg-white/20 mt-4" />
                </div>

                {/* Informações Básicas */}
                <div className="space-y-6">
                  <h3 className="text-white drop-shadow-md">Informações Básicas</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm">Nome da Empresa</Label>
                      <Input
                        value={dadosEmpresa.nome}
                        onChange={(e) =>
                          setDadosEmpresa({ ...dadosEmpresa, nome: e.target.value })
                        }
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm">Email de Contato</Label>
                      <Input
                        type="email"
                        value={dadosEmpresa.email}
                        onChange={(e) =>
                          setDadosEmpresa({ ...dadosEmpresa, email: e.target.value })
                        }
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm">Telefone</Label>
                      <Input
                        value={dadosEmpresa.telefone}
                        onChange={(e) =>
                          setDadosEmpresa({ ...dadosEmpresa, telefone: e.target.value })
                        }
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm">Site</Label>
                      <Input
                        type="url"
                        value={dadosEmpresa.site}
                        onChange={(e) =>
                          setDadosEmpresa({ ...dadosEmpresa, site: e.target.value })
                        }
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Manifesto Institucional */}
                <div className="space-y-4">
                  <h3 className="text-white drop-shadow-md">Manifesto Institucional</h3>
                  <div className="min-h-[300px]">
                    <RichTextEditor
                      content={dadosEmpresa.manifesto}
                      onChange={(content) =>
                        setDadosEmpresa({ ...dadosEmpresa, manifesto: content })
                      }
                    />
                  </div>
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end pt-4">
                  <GlassButton
                    variant="accent"
                    onClick={() => handleSalvarEmpresa()}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </GlassButton>
                </div>
              </Glass>
            </TabsContent>

            {/* ABA: EMAILS */}
            <TabsContent value="emails" className="mt-0">
              <Glass variant="white" blur="md" className="p-8 rounded-xl space-y-8">
                <div>
                  <h2 className="text-white drop-shadow-lg mb-1">📧 Templates de Email</h2>
                  <div className="h-px bg-white/20 mt-4" />
                </div>

                {/* Lista de Templates */}
                <div className="space-y-4">
                  <h3 className="text-white drop-shadow-md">Lista de Templates</h3>

                  <div className="space-y-3">
                    {templates.map((template) => (
                      <Glass
                        key={template.id}
                        variant="white"
                        blur="sm"
                        className="p-4 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{template.ativo ? '✅' : '❌'}</span>
                          <span className="text-white drop-shadow-sm">{template.nome}</span>
                        </div>
                        <GlassButton
                          variant="white"
                          onClick={() => handleEditarTemplate(template)}
                          className="text-sm py-2 px-4"
                        >
                          Editar
                        </GlassButton>
                      </Glass>
                    ))}
                  </div>
                </div>
              </Glass>
            </TabsContent>

            {/* ABA: INTEGRAÇÕES */}
            <TabsContent value="integracoes" className="mt-0">
              <Glass variant="white" blur="md" className="p-8 rounded-xl space-y-8">
                <div>
                  <h2 className="text-white drop-shadow-lg mb-1">🔌 Integrações via Webhook</h2>
                  <div className="h-px bg-white/20 mt-4" />
                </div>

                {/* Lista de Webhooks */}
                <div className="space-y-4">
                  <h3 className="text-white drop-shadow-md">URLs de Webhook</h3>
                  <p className="text-white/70 drop-shadow-sm text-sm">
                    Configure os endpoints que receberão notificações de eventos do sistema
                  </p>

                  <div className="space-y-4">
                    {webhooks.map((webhook) => (
                      <Glass
                        key={webhook.id}
                        variant="white"
                        blur="sm"
                        className="p-4 rounded-lg space-y-3"
                      >
                        <Label className="text-white/90 drop-shadow-sm">{webhook.nome}</Label>
                        <div className="flex gap-3">
                          <Input
                            value={webhook.url}
                            onChange={(e) => handleUpdateWebhook(webhook.id, e.target.value)}
                            placeholder="https://seu-servidor.com/webhook"
                            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          />
                          <GlassButton
                            variant="accent"
                            onClick={() => handleSalvarWebhook(webhook.id)}
                            className="flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Salvar
                          </GlassButton>
                        </div>
                      </Glass>
                    ))}
                  </div>
                </div>
              </Glass>
            </TabsContent>

            {/* ABA: USUÁRIOS */}
            <TabsContent value="usuarios" className="mt-0">
              <Glass variant="white" blur="md" className="p-8 rounded-xl space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white drop-shadow-lg mb-1">
                      👥 Gestão de Usuários ({usuarios.length})
                    </h2>
                    <div className="h-px bg-white/20 mt-4" />
                  </div>
                  <GlassButton
                    variant="accent"
                    onClick={() => setModalNovoUsuario(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Usuário
                  </GlassButton>
                </div>

                <p className="text-white/70 drop-shadow-sm text-sm">
                  Gerencie os usuários e suas permissões no sistema
                </p>

                {/* Busca e Filtros */}
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                    <Input
                      value={buscaUsuario}
                      onChange={(e) => setBuscaUsuario(e.target.value)}
                      placeholder="Buscar usuário..."
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="flex gap-2">
                    <GlassButton
                      variant={filtroUsuario === 'todos' ? 'accent' : 'white'}
                      onClick={() => setFiltroUsuario('todos')}
                      className="text-sm py-2 px-4"
                    >
                      Todos
                    </GlassButton>
                    <GlassButton
                      variant={filtroUsuario === 'ativos' ? 'accent' : 'white'}
                      onClick={() => setFiltroUsuario('ativos')}
                      className="text-sm py-2 px-4"
                    >
                      Ativos
                    </GlassButton>
                    <GlassButton
                      variant={filtroUsuario === 'inativos' ? 'accent' : 'white'}
                      onClick={() => setFiltroUsuario('inativos')}
                      className="text-sm py-2 px-4"
                    >
                      Inativos
                    </GlassButton>
                  </div>
                </div>

                <div className="h-px bg-white/20" />

                {/* Tabela de Usuários */}
                <div className="space-y-3">
                  {usuariosFiltrados.map((usuario) => (
                    <Glass
                      key={usuario.id}
                      variant="white"
                      blur="sm"
                      className="p-5 rounded-lg transition-all duration-200 hover:bg-white/25"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={usuario.avatar} />
                            <AvatarFallback className="bg-[#35BFAD] text-white">
                              {usuario.nome
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-white drop-shadow-sm">{usuario.nome}</span>
                              <Badge className={`${getNivelBadgeColor(usuario.nivel)} border-0`}>
                                {getNomeCargo(usuario.nivel)}
                              </Badge>
                            </div>
                            <p className="text-white/70 drop-shadow-sm text-sm">{usuario.email}</p>
                            <p className="text-white/60 drop-shadow-sm text-xs">
                              Último acesso: {usuario.ultimoAcesso}
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              {usuario.ativo ? (
                                <span className="text-green-400 drop-shadow-sm">🟢 Ativo</span>
                              ) : (
                                <span className="text-gray-400 drop-shadow-sm">⚪ Inativo</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 bg-white/15 backdrop-blur-md border border-white/25 rounded-xl shadow-lg hover:bg-white/20 transition-all duration-200">
                              <MoreVertical className="w-4 h-4 text-white" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end"
                            className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white"
                          >
                            <DropdownMenuItem
                              onSelect={() => {
                                setUsuarioSelecionado(usuario);
                                setModalPermissoes(true);
                              }}
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Permissões
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                setUsuarioSelecionado(usuario);
                                setVagasSelecionadas(usuario.vagasVinculadas || []);
                                setModalVincularVagas(true);
                              }}
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                              <LinkIcon className="w-4 h-4 mr-2" />
                              Associar Vagas
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                setUsuarioSelecionado(usuario);
                                setModalRedefinirSenha(true);
                              }}
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                              <Key className="w-4 h-4 mr-2" />
                              Redefinir Senha
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleToggleAtivo(usuario.id)}
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              {usuario.ativo ? 'Desativar' : 'Ativar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/20" />
                            <DropdownMenuItem
                              onSelect={() => {
                                setUsuarioSelecionado(usuario);
                                setModalExcluir(true);
                              }}
                              className="focus:bg-red-500/20 focus:text-red-300 cursor-pointer text-red-300"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Glass>
                  ))}

                  {usuariosFiltrados.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto text-white/30 mb-4" />
                      <p className="text-white/70 drop-shadow-sm">
                        Nenhum usuário encontrado
                      </p>
                    </div>
                  )}
                </div>
              </Glass>
            </TabsContent>

            {/* ABA: AUDITORIA */}
            <TabsContent value="auditoria" className="mt-0">
              <Glass variant="white" blur="md" className="p-8 rounded-xl space-y-8">
                {/* Header */}
                <div>
                  <h2 className="text-white drop-shadow-lg mb-1">
                    📋 Log de Auditoria ({logsAuditoria.length} registros)
                  </h2>
                  <p className="text-white/70 drop-shadow-sm text-sm">
                    Histórico de todas as ações realizadas no sistema
                  </p>
                  <div className="h-px bg-white/20 mt-4" />
                </div>

                {/* Busca e Filtros */}
                <div className="space-y-4">
                  {/* Busca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                    <Input
                      value={buscaAudit}
                      onChange={(e) => setBuscaAudit(e.target.value)}
                      placeholder="Buscar nos logs..."
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  {/* Grid de Filtros */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Filtro por Usuário */}
                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm text-sm">Filtrar por Usuário</Label>
                      <Select value={filtroUsuarioAudit} onValueChange={setFiltroUsuarioAudit}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                          <SelectItem value="todos">Todos os usuários</SelectItem>
                          <SelectItem value="1">João Silva</SelectItem>
                          <SelectItem value="2">Maria Santos</SelectItem>
                          <SelectItem value="3">Carlos Oliveira</SelectItem>
                          <SelectItem value="4">Ana Costa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro por Ação */}
                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm text-sm">Filtrar por Ação</Label>
                      <Select value={filtroAcao} onValueChange={setFiltroAcao}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                          <SelectItem value="todas">Todas as ações</SelectItem>
                          <SelectItem value="vaga">Vagas</SelectItem>
                          <SelectItem value="candidato">Candidatos</SelectItem>
                          <SelectItem value="usuario">Usuários</SelectItem>
                          <SelectItem value="email">Emails</SelectItem>
                          <SelectItem value="sistema">Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro por Vaga */}
                    <div className="space-y-2">
                      <Label className="text-white/90 drop-shadow-sm text-sm">Filtrar por Vaga</Label>
                      <Select value={filtroVaga} onValueChange={setFiltroVaga}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                          <SelectItem value="todas">Todas as vagas</SelectItem>
                          {vagasDisponiveis.map((vaga) => (
                            <SelectItem key={vaga.id} value={vaga.id}>
                              {vaga.titulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Botão Limpar Filtros */}
                  {(filtroUsuarioAudit !== 'todos' || filtroAcao !== 'todas' || filtroVaga !== 'todas' || buscaAudit) && (
                    <div className="flex justify-end">
                      <GlassButton
                        variant="white"
                        onClick={() => {
                          setFiltroUsuarioAudit('todos');
                          setFiltroAcao('todas');
                          setFiltroVaga('todas');
                          setBuscaAudit('');
                        }}
                        className="text-sm py-2 px-4"
                      >
                        Limpar Filtros
                      </GlassButton>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/20" />

                {/* Lista de Logs */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {logsAuditoria
                    .filter((log) => {
                      const matchUsuario = filtroUsuarioAudit === 'todos' || log.usuarioId === filtroUsuarioAudit;
                      const matchAcao = filtroAcao === 'todas' || log.categoria === filtroAcao;
                      const matchVaga = filtroVaga === 'todas' || log.vagaId === filtroVaga;
                      const matchBusca =
                        !buscaAudit ||
                        log.usuario.toLowerCase().includes(buscaAudit.toLowerCase()) ||
                        log.acao.toLowerCase().includes(buscaAudit.toLowerCase()) ||
                        log.detalhes.toLowerCase().includes(buscaAudit.toLowerCase()) ||
                        log.vagaTitulo?.toLowerCase().includes(buscaAudit.toLowerCase());
                      return matchUsuario && matchAcao && matchVaga && matchBusca;
                    })
                    .map((log) => {
                      const categoriaConfig = {
                        vaga: { emoji: '📋', color: 'bg-blue-500' },
                        candidato: { emoji: '👤', color: 'bg-[#35BFAD]' },
                        usuario: { emoji: '👥', color: 'bg-purple-500' },
                        email: { emoji: '📧', color: 'bg-orange-500' },
                        sistema: { emoji: '⚙️', color: 'bg-gray-500' },
                      };

                      const config = categoriaConfig[log.categoria];

                      return (
                        <Glass
                          key={log.id}
                          variant="white"
                          blur="sm"
                          className="p-5 rounded-lg transition-all duration-200 hover:bg-white/25"
                        >
                          <div className="flex items-start gap-4">
                            {/* Ícone da Categoria */}
                            <div className={`${config.color} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
                              <span className="text-xl">{config.emoji}</span>
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white drop-shadow-sm">{log.acao}</span>
                                    <Badge className="bg-white/20 text-white border-0 text-xs">
                                      {log.categoria}
                                    </Badge>
                                  </div>
                                  <p className="text-white/80 drop-shadow-sm text-sm">{log.detalhes}</p>
                                  {log.vagaTitulo && (
                                    <p className="text-white/60 drop-shadow-sm text-xs">
                                      🔗 Vaga: {log.vagaTitulo}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-white/90 drop-shadow-sm text-sm">{log.timestamp}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-white/60 drop-shadow-sm">
                                <span>👤 {log.usuario}</span>
                                {log.ip && <span>🌐 {log.ip}</span>}
                              </div>
                            </div>
                          </div>
                        </Glass>
                      );
                    })}

                  {logsAuditoria.filter((log) => {
                    const matchUsuario = filtroUsuarioAudit === 'todos' || log.usuarioId === filtroUsuarioAudit;
                    const matchAcao = filtroAcao === 'todas' || log.categoria === filtroAcao;
                    const matchVaga = filtroVaga === 'todas' || log.vagaId === filtroVaga;
                    const matchBusca =
                      !buscaAudit ||
                      log.usuario.toLowerCase().includes(buscaAudit.toLowerCase()) ||
                      log.acao.toLowerCase().includes(buscaAudit.toLowerCase()) ||
                      log.detalhes.toLowerCase().includes(buscaAudit.toLowerCase()) ||
                      log.vagaTitulo?.toLowerCase().includes(buscaAudit.toLowerCase());
                    return matchUsuario && matchAcao && matchVaga && matchBusca;
                  }).length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 mx-auto text-white/30 mb-4" />
                      <p className="text-white/70 drop-shadow-sm">
                        Nenhum registro encontrado com os filtros aplicados
                      </p>
                    </div>
                  )}
                </div>
              </Glass>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal de Edição de Template */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white drop-shadow-lg flex items-center gap-2">
              📝 Editar Template: {templateEditando?.nome}
            </DialogTitle>
            <DialogDescription className="text-white/70 drop-shadow-sm">
              Configure o assunto e o corpo do email que será enviado aos candidatos
            </DialogDescription>
          </DialogHeader>

          {templateEditando && (
            <div className="space-y-6 pt-4">
              {/* Assunto */}
              <div className="space-y-2">
                <Label className="text-white/90 drop-shadow-sm">Assunto</Label>
                <Input
                  value={templateEditando.assunto}
                  onChange={(e) =>
                    setTemplateEditando({ ...templateEditando, assunto: e.target.value })
                  }
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              {/* Corpo do Email */}
              <div className="space-y-2">
                <Label className="text-white/90 drop-shadow-sm">Corpo do Email</Label>
                <div className="min-h-[300px]">
                  <RichTextEditor
                    content={templateEditando.corpo}
                    onChange={(content) =>
                      setTemplateEditando({ ...templateEditando, corpo: content })
                    }
                  />
                </div>
              </div>

              {/* Variáveis Disponíveis */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                <Label className="text-white/90 drop-shadow-sm text-sm mb-2 block">
                  Variáveis Disponíveis
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    '{candidato_nome}',
                    '{vaga_titulo}',
                    '{empresa_nome}',
                    '{data}',
                    '{hora}',
                  ].map((variavel) => (
                    <code
                      key={variavel}
                      className="bg-white/10 px-2 py-1 rounded text-white/80 text-sm"
                    >
                      {variavel}
                    </code>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 pt-4">
                <GlassButton
                  variant="white"
                  onClick={() => console.log('Preview do template:', templateEditando)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </GlassButton>
                <GlassButton
                  variant="white"
                  onClick={() => {
                    setModalAberto(false);
                    setTemplateEditando(null);
                  }}
                >
                  Cancelar
                </GlassButton>
                <GlassButton
                  variant="accent"
                  onClick={() => handleSalvarTemplate()}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Template
                </GlassButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Novo Usuário */}
      <Dialog open={modalNovoUsuario} onOpenChange={setModalNovoUsuario}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white drop-shadow-lg flex items-center gap-2">
              👤 Adicionar Novo Usuário
            </DialogTitle>
            <DialogDescription className="text-white/70 drop-shadow-sm">
              Preencha os dados do novo usuário e selecione o nível de acesso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-white/90 drop-shadow-sm">
                Nome Completo <span className="text-red-400">*</span>
              </Label>
              <Input
                value={novoUsuario.nome}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                placeholder="Digite o nome completo"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/90 drop-shadow-sm">
                Email <span className="text-red-400">*</span>
              </Label>
              <Input
                type="email"
                value={novoUsuario.email}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                placeholder="usuario@beautysmile.com.br"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <p className="text-white/60 drop-shadow-sm text-xs">
                Um email de convite será enviado
              </p>
            </div>

            <div className="h-px bg-white/20" />

            <div>
              <Label className="text-white/90 drop-shadow-sm mb-4 block">
                NÍVEIS DISPONÍVEIS:
              </Label>

              <div className="space-y-3">
                {niveis.map((nivel) => (
                  <Glass
                    key={nivel.id}
                    variant="white"
                    blur="sm"
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                      novoUsuario.nivel === nivel.id
                        ? 'border-[#35BFAD] bg-[#35BFAD]/5'
                        : 'border-transparent hover:border-[#35BFAD]/50'
                    }`}
                    onClick={() =>
                      setNovoUsuario({
                        ...novoUsuario,
                        nivel: nivel.id as 'admin' | 'gerente' | 'recrutador' | 'visualizador',
                      })
                    }
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{nivel.emoji}</span>
                        <span className="text-white drop-shadow-sm">{nivel.nome}</span>
                      </div>
                      <p className="text-white/70 drop-shadow-sm text-sm">{nivel.descricao}</p>
                      <ul className="space-y-1 ml-6">
                        {nivel.permissoes.map((perm, idx) => (
                          <li key={idx} className="text-white/60 drop-shadow-sm text-xs list-disc">
                            {perm}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Glass>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <GlassButton
                variant="white"
                onClick={() => {
                  setModalNovoUsuario(false);
                  setNovoUsuario({ nome: '', email: '', nivel: '' });
                }}
              >
                Cancelar
              </GlassButton>
              <GlassButton
                variant="accent"
                onClick={() => handleAdicionarUsuario()}
                disabled={!novoUsuario.nome || !novoUsuario.email || !novoUsuario.nivel}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Adicionar Usuário
              </GlassButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Permissões Detalhadas */}
      <Dialog open={modalPermissoes} onOpenChange={setModalPermissoes}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white drop-shadow-lg flex items-center gap-2">
              ⚙️ Permissões de {usuarioSelecionado?.nome}
            </DialogTitle>
            <DialogDescription className="text-white/70 drop-shadow-sm">
              {getNomeCargo(usuarioSelecionado?.nivel || '')} • {usuarioSelecionado?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-white/90 drop-shadow-sm">Nível de Acesso Base</Label>
              <Select defaultValue={usuarioSelecionado?.nivel}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gerente">Gerente RH</SelectItem>
                  <SelectItem value="recrutador">Recrutador</SelectItem>
                  <SelectItem value="visualizador">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-px bg-white/20" />

            <div>
              <Label className="text-white/90 drop-shadow-sm mb-4 block">
                PERMISSÕES CUSTOMIZADAS:
              </Label>
              <p className="text-white/60 drop-shadow-sm text-sm mb-4">
                Marque para conceder permissões específicas
              </p>

              {/* Vagas */}
              <Glass variant="white" blur="sm" className="p-4 rounded-lg mb-4 space-y-3">
                <h4 className="text-white drop-shadow-sm">📋 VAGAS</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="vagas-ver"
                      checked={permissoesEditando.vagas.verTodas}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          vagas: { ...permissoesEditando.vagas, verTodas: checked as boolean },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="vagas-ver" className="text-white/80 drop-shadow-sm text-sm">
                      Ver todas as vagas
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="vagas-criar"
                      checked={permissoesEditando.vagas.criar}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          vagas: { ...permissoesEditando.vagas, criar: checked as boolean },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="vagas-criar" className="text-white/80 drop-shadow-sm text-sm">
                      Criar vagas
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="vagas-editar"
                      checked={permissoesEditando.vagas.editar}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          vagas: { ...permissoesEditando.vagas, editar: checked as boolean },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="vagas-editar" className="text-white/80 drop-shadow-sm text-sm">
                      Editar vagas
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="vagas-excluir"
                      checked={permissoesEditando.vagas.excluir}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          vagas: { ...permissoesEditando.vagas, excluir: checked as boolean },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="vagas-excluir" className="text-white/80 drop-shadow-sm text-sm">
                      Excluir vagas
                    </Label>
                  </div>
                </div>
              </Glass>

              {/* Candidatos */}
              <Glass variant="white" blur="sm" className="p-4 rounded-lg mb-4 space-y-3">
                <h4 className="text-white drop-shadow-sm">👥 CANDIDATOS</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cand-ver"
                      checked={permissoesEditando.candidatos.verTodos}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          candidatos: {
                            ...permissoesEditando.candidatos,
                            verTodos: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="cand-ver" className="text-white/80 drop-shadow-sm text-sm">
                      Ver todos candidatos
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cand-aprovar"
                      checked={permissoesEditando.candidatos.aprovar}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          candidatos: {
                            ...permissoesEditando.candidatos,
                            aprovar: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="cand-aprovar" className="text-white/80 drop-shadow-sm text-sm">
                      Aprovar candidatos
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cand-rejeitar"
                      checked={permissoesEditando.candidatos.rejeitar}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          candidatos: {
                            ...permissoesEditando.candidatos,
                            rejeitar: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="cand-rejeitar" className="text-white/80 drop-shadow-sm text-sm">
                      Rejeitar candidatos
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cand-notas"
                      checked={permissoesEditando.candidatos.notas}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          candidatos: {
                            ...permissoesEditando.candidatos,
                            notas: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="cand-notas" className="text-white/80 drop-shadow-sm text-sm">
                      Adicionar notas
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cand-emails"
                      checked={permissoesEditando.candidatos.emails}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          candidatos: {
                            ...permissoesEditando.candidatos,
                            emails: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="cand-emails" className="text-white/80 drop-shadow-sm text-sm">
                      Enviar emails
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cand-exportar"
                      checked={permissoesEditando.candidatos.exportar}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          candidatos: {
                            ...permissoesEditando.candidatos,
                            exportar: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="cand-exportar" className="text-white/80 drop-shadow-sm text-sm">
                      Exportar perfil PDF
                    </Label>
                  </div>
                </div>
              </Glass>

              {/* Relatórios */}
              <Glass variant="white" blur="sm" className="p-4 rounded-lg mb-4 space-y-3">
                <h4 className="text-white drop-shadow-sm">📊 RELATÓRIOS</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rel-dashboard"
                      checked={permissoesEditando.relatorios.dashboard}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          relatorios: {
                            ...permissoesEditando.relatorios,
                            dashboard: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="rel-dashboard" className="text-white/80 drop-shadow-sm text-sm">
                      Ver dashboard analytics
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rel-exportar"
                      checked={permissoesEditando.relatorios.exportar}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          relatorios: {
                            ...permissoesEditando.relatorios,
                            exportar: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="rel-exportar" className="text-white/80 drop-shadow-sm text-sm">
                      Exportar relatórios
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rel-financeiro"
                      checked={permissoesEditando.relatorios.financeiro}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          relatorios: {
                            ...permissoesEditando.relatorios,
                            financeiro: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="rel-financeiro" className="text-white/80 drop-shadow-sm text-sm">
                      Ver dados financeiros
                    </Label>
                  </div>
                </div>
              </Glass>

              {/* Configurações */}
              <Glass variant="white" blur="sm" className="p-4 rounded-lg space-y-3">
                <h4 className="text-white drop-shadow-sm">⚙️ CONFIGURAÇÕES</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="conf-usuarios"
                      checked={permissoesEditando.configuracoes.usuarios}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          configuracoes: {
                            ...permissoesEditando.configuracoes,
                            usuarios: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="conf-usuarios" className="text-white/80 drop-shadow-sm text-sm">
                      Gerenciar usuários
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="conf-sistema"
                      checked={permissoesEditando.configuracoes.sistema}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          configuracoes: {
                            ...permissoesEditando.configuracoes,
                            sistema: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="conf-sistema" className="text-white/80 drop-shadow-sm text-sm">
                      Editar configurações do sistema
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="conf-templates"
                      checked={permissoesEditando.configuracoes.templates}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          configuracoes: {
                            ...permissoesEditando.configuracoes,
                            templates: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="conf-templates" className="text-white/80 drop-shadow-sm text-sm">
                      Editar templates de email
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="conf-auditoria"
                      checked={permissoesEditando.configuracoes.auditoria}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          configuracoes: {
                            ...permissoesEditando.configuracoes,
                            auditoria: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="conf-auditoria" className="text-white/80 drop-shadow-sm text-sm">
                      Ver auditoria/logs
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="conf-integracoes"
                      checked={permissoesEditando.configuracoes.integracoes}
                      onCheckedChange={(checked) =>
                        setPermissoesEditando({
                          ...permissoesEditando,
                          configuracoes: {
                            ...permissoesEditando.configuracoes,
                            integracoes: checked as boolean,
                          },
                        })
                      }
                      className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                    />
                    <Label htmlFor="conf-integracoes" className="text-white/80 drop-shadow-sm text-sm">
                      Gerenciar integrações
                    </Label>
                  </div>
                </div>
              </Glass>
            </div>

            <div className="bg-[#35BFAD]/20 border border-[#35BFAD]/30 rounded-lg p-4">
              <p className="text-white/80 drop-shadow-sm text-sm">
                💡 Dica: Permissões customizadas sobrescrevem o nível base. Use para ajustes
                finos.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <GlassButton
                variant="white"
                onClick={() => setModalPermissoes(false)}
              >
                Cancelar
              </GlassButton>
              <GlassButton
                variant="accent"
                onClick={() => handleSalvarPermissoes()}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Permissões
              </GlassButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Vincular Vagas */}
      <Dialog open={modalVincularVagas} onOpenChange={setModalVincularVagas}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white drop-shadow-lg flex items-center gap-2">
              🔗 Vagas Vinculadas - {usuarioSelecionado?.nome}
            </DialogTitle>
            <DialogDescription className="text-white/70 drop-shadow-sm">
              Recrutador • {usuarioSelecionado?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <p className="text-white/80 drop-shadow-sm">
              Selecione as vagas que este recrutador pode gerenciar:
            </p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
              <Input
                placeholder="Buscar vagas..."
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            <div className="h-px bg-white/20" />

            <div>
              <Label className="text-white/90 drop-shadow-sm mb-4 block">
                VAGAS ATIVAS ({vagasDisponiveis.length}):
              </Label>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {vagasDisponiveis.map((vaga) => (
                  <Glass
                    key={vaga.id}
                    variant="white"
                    blur="sm"
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                      vagasSelecionadas.includes(vaga.id) ? 'bg-[#35BFAD]/10' : 'hover:bg-white/10'
                    }`}
                    onClick={() => {
                      if (vagasSelecionadas.includes(vaga.id)) {
                        setVagasSelecionadas(vagasSelecionadas.filter((id) => id !== vaga.id));
                      } else {
                        setVagasSelecionadas([...vagasSelecionadas, vaga.id]);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={vagasSelecionadas.includes(vaga.id)}
                        onCheckedChange={() => {}}
                        className="mt-1 border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
                      />
                      <div className="flex-1">
                        <p className="text-white drop-shadow-sm">{vaga.titulo}</p>
                        <p className="text-white/70 drop-shadow-sm text-sm">
                          {vaga.localizacao} • {vaga.candidatos} candidatos
                        </p>
                      </div>
                    </div>
                  </Glass>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/20" />

            <p className="text-white/80 drop-shadow-sm text-sm">
              {vagasSelecionadas.length} vagas selecionadas
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <GlassButton
                variant="white"
                onClick={() => {
                  setModalVincularVagas(false);
                  setVagasSelecionadas([]);
                }}
              >
                Cancelar
              </GlassButton>
              <GlassButton
                variant="accent"
                onClick={() => handleSalvarVinculos()}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Vinculações
              </GlassButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Redefinir Senha */}
      <AlertDialog open={modalRedefinirSenha} onOpenChange={setModalRedefinirSenha}>
        <AlertDialogContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white drop-shadow-lg">
              🔑 Redefinir Senha
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/80 drop-shadow-sm">
              Enviar email de redefinição de senha para:
              <br />
              <br />
              <strong className="text-white">{usuarioSelecionado?.email}</strong>
              <br />
              <br />O usuário receberá um link para criar uma nova senha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRedefinirSenha}
              className="bg-[#35BFAD] text-white hover:bg-[#35BFAD]/80"
            >
              Enviar Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Excluir Usuário */}
      <AlertDialog open={modalExcluir} onOpenChange={setModalExcluir}>
        <AlertDialogContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white drop-shadow-lg">
              ⚠️ Excluir Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/80 drop-shadow-sm">
              Tem certeza que deseja excluir <strong className="text-white">{usuarioSelecionado?.nome}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirUsuario}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RHLayout>
  );
}
