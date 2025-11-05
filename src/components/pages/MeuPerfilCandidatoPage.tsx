import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Glass, GlassButton, GlassCard } from '../ui/glass';
import { User, Mail, Phone, Lock, Eye, EyeOff, Save, Camera, Briefcase, FileText, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

interface Vaga {
  id: number;
  titulo: string;
  status: 'em_analise' | 'aprovado' | 'reprovado' | 'em_teste';
  dataInscricao: string;
}

interface Teste {
  id: number;
  nome: string;
  tipo: string;
  dataConclusao: string;
  resultado?: string;
}

export function MeuPerfilCandidatoPage() {
  // Estado - Dados do Usuário
  const [dadosPessoais, setDadosPessoais] = useState({
    nome: 'João Silva',
    email: 'joao.silva@email.com',
    telefone: '(11) 98765-4321',
    avatar: '',
  });

  // Estado - Senha
  const [senhas, setSenhas] = useState({
    atual: '',
    nova: '',
    confirmar: '',
  });

  const [mostrarSenhas, setMostrarSenhas] = useState({
    atual: false,
    nova: false,
    confirmar: false,
  });

  // Mock data - Vagas participando
  const vagasParticipando: Vaga[] = [
    {
      id: 1,
      titulo: 'Assistente Odontológico',
      status: 'em_analise',
      dataInscricao: '15/10/2024',
    },
    {
      id: 2,
      titulo: 'Recepcionista',
      status: 'em_teste',
      dataInscricao: '20/09/2024',
    },
    {
      id: 3,
      titulo: 'Auxiliar Administrativo',
      status: 'aprovado',
      dataInscricao: '05/08/2024',
    },
  ];

  // Mock data - Testes realizados
  const testesRealizados: Teste[] = [
    {
      id: 1,
      nome: 'Teste DISC',
      tipo: 'Personalidade',
      dataConclusao: '22/09/2024',
      resultado: 'Dominante',
    },
    {
      id: 2,
      nome: 'Teste Big Five',
      tipo: 'Personalidade',
      dataConclusao: '23/09/2024',
      resultado: 'Extrovertido',
    },
    {
      id: 3,
      nome: 'Matrizes Progressivas de Raven',
      tipo: 'Raciocínio Lógico',
      dataConclusao: '24/09/2024',
      resultado: 'Acima da média',
    },
    {
      id: 4,
      nome: 'Questionário de Cultura',
      tipo: 'Fit Cultural',
      dataConclusao: '25/09/2024',
    },
  ];

  const handleSalvarDados = () => {
    console.log('Salvando dados pessoais:', dadosPessoais);
    // TODO: Implementar chamada à API
  };

  const handleAlterarSenha = () => {
    if (senhas.nova !== senhas.confirmar) {
      alert('As senhas não coincidem!');
      return;
    }
    console.log('Alterando senha...');
    setSenhas({ atual: '', nova: '', confirmar: '' });
    // TODO: Implementar chamada à API
  };

  const handleAlterarFoto = () => {
    console.log('Abrindo seletor de foto...');
    // TODO: Implementar upload de foto
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      em_analise: { label: 'Em Análise', className: 'bg-yellow-500/80 text-white border-0' },
      em_teste: { label: 'Em Teste', className: 'bg-blue-500/80 text-white border-0' },
      aprovado: { label: 'Aprovado', className: 'bg-green-500/80 text-white border-0' },
      reprovado: { label: 'Reprovado', className: 'bg-red-500/80 text-white border-0' },
    };
    return badges[status] || badges.em_analise;
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundImage 
        background="gradient" 
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 space-y-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-6" />
            <div className="flex items-center justify-center gap-3 mb-3">
              <User className="w-8 h-8 text-white drop-shadow-lg" />
              <h1 className="text-white text-5xl drop-shadow-lg">Meu Perfil</h1>
            </div>
            <div className="h-px bg-white/20 mt-4 max-w-2xl mx-auto" />
          </div>

          {/* Avatar e Info Básica */}
          <Glass variant="white" blur="xl" className="p-8 rounded-xl">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <Avatar className="w-[120px] h-[120px] border-4 border-white/20">
                  <AvatarImage src={dadosPessoais.avatar} />
                  <AvatarFallback className="bg-[#35BFAD] text-white text-3xl">
                    {dadosPessoais.nome
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <GlassButton
                  variant="white"
                  hover
                  onClick={handleAlterarFoto}
                  className="flex items-center gap-2 text-sm py-2 px-4 text-white drop-shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  Alterar Foto
                </GlassButton>
              </div>

              {/* Info Básica */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <h2 className="text-white drop-shadow-lg">{dadosPessoais.nome}</h2>
                <p className="text-white/80 drop-shadow-md flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  {dadosPessoais.email}
                </p>
                <p className="text-white/80 drop-shadow-md flex items-center justify-center md:justify-start gap-2">
                  <Phone className="w-4 h-4" />
                  {dadosPessoais.telefone}
                </p>
              </div>
            </div>
          </Glass>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna Esquerda */}
            <div className="space-y-8">
              {/* Dados Pessoais */}
              <Glass variant="white" blur="xl" className="p-8 rounded-xl space-y-6">
                <div>
                  <h3 className="text-white drop-shadow-md">DADOS PESSOAIS</h3>
                  <div className="h-px bg-white/20 mt-3" />
                </div>

                <div className="space-y-6">
                  {/* Nome Completo */}
                  <div className="space-y-2">
                    <Label className="text-white/90 drop-shadow-sm">
                      Nome Completo
                    </Label>
                    <Input
                      value={dadosPessoais.nome}
                      onChange={(e) =>
                        setDadosPessoais({ ...dadosPessoais, nome: e.target.value })
                      }
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 transition-all duration-200"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="text-white/90 drop-shadow-sm">
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={dadosPessoais.email}
                      onChange={(e) =>
                        setDadosPessoais({ ...dadosPessoais, email: e.target.value })
                      }
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 transition-all duration-200"
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label className="text-white/90 drop-shadow-sm">
                      Telefone
                    </Label>
                    <Input
                      type="tel"
                      value={dadosPessoais.telefone}
                      onChange={(e) =>
                        setDadosPessoais({ ...dadosPessoais, telefone: e.target.value })
                      }
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 transition-all duration-200"
                    />
                  </div>
                </div>
              </Glass>

              {/* Alterar Senha */}
              <Glass variant="white" blur="xl" className="p-8 rounded-xl space-y-6">
                <div>
                  <h3 className="text-white drop-shadow-md">ALTERAR SENHA</h3>
                  <div className="h-px bg-white/20 mt-3" />
                </div>

                <div className="space-y-6">
                  {/* Senha Atual */}
                  <div className="space-y-2">
                    <Label className="text-white/90 drop-shadow-sm">
                      Senha Atual
                    </Label>
                    <div className="relative">
                      <Input
                        type={mostrarSenhas.atual ? 'text' : 'password'}
                        value={senhas.atual}
                        onChange={(e) => setSenhas({ ...senhas, atual: e.target.value })}
                        placeholder="Digite sua senha atual"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-12 focus:bg-white/15 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setMostrarSenhas({ ...mostrarSenhas, atual: !mostrarSenhas.atual })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors duration-200"
                      >
                        {mostrarSenhas.atual ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Nova Senha */}
                  <div className="space-y-2">
                    <Label className="text-white/90 drop-shadow-sm">
                      Nova Senha
                    </Label>
                    <div className="relative">
                      <Input
                        type={mostrarSenhas.nova ? 'text' : 'password'}
                        value={senhas.nova}
                        onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })}
                        placeholder="Digite sua nova senha"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-12 focus:bg-white/15 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setMostrarSenhas({ ...mostrarSenhas, nova: !mostrarSenhas.nova })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors duration-200"
                      >
                        {mostrarSenhas.nova ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Nova Senha */}
                  <div className="space-y-2">
                    <Label className="text-white/90 drop-shadow-sm">
                      Confirmar Nova Senha
                    </Label>
                    <div className="relative">
                      <Input
                        type={mostrarSenhas.confirmar ? 'text' : 'password'}
                        value={senhas.confirmar}
                        onChange={(e) => setSenhas({ ...senhas, confirmar: e.target.value })}
                        placeholder="Confirme sua nova senha"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-12 focus:bg-white/15 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setMostrarSenhas({
                            ...mostrarSenhas,
                            confirmar: !mostrarSenhas.confirmar,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors duration-200"
                      >
                        {mostrarSenhas.confirmar ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Validação Visual */}
                  {senhas.nova && senhas.confirmar && (
                    <div
                      className={`text-sm drop-shadow-sm ${
                        senhas.nova === senhas.confirmar
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {senhas.nova === senhas.confirmar
                        ? '✓ As senhas coincidem'
                        : '✗ As senhas não coincidem'}
                    </div>
                  )}
                </div>
              </Glass>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-8">
              {/* Vagas Participando */}
              <Glass variant="white" blur="xl" className="p-8 rounded-xl space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-white drop-shadow-md" />
                    <h3 className="text-white drop-shadow-md">VAGAS PARTICIPANDO</h3>
                  </div>
                  <div className="h-px bg-white/20 mt-3" />
                </div>

                {vagasParticipando.length > 0 ? (
                  <div className="space-y-4">
                    {vagasParticipando.map((vaga) => {
                      const statusBadge = getStatusBadge(vaga.status);
                      return (
                        <Glass key={vaga.id} variant="white" blur="md" className="p-4 rounded-lg">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-white drop-shadow-sm">{vaga.titulo}</h4>
                              <Badge className={statusBadge.className}>
                                {statusBadge.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70 drop-shadow-sm">
                              <Calendar className="w-4 h-4" />
                              <span>Inscrição: {vaga.dataInscricao}</span>
                            </div>
                          </div>
                        </Glass>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-8 h-8 text-white/50" />
                    </div>
                    <p className="text-white/70 drop-shadow-sm">
                      Você ainda não se candidatou a nenhuma vaga
                    </p>
                  </div>
                )}
              </Glass>

              {/* Testes Realizados */}
              <Glass variant="white" blur="xl" className="p-8 rounded-xl space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-white drop-shadow-md" />
                    <h3 className="text-white drop-shadow-md">TESTES REALIZADOS</h3>
                  </div>
                  <div className="h-px bg-white/20 mt-3" />
                </div>

                {testesRealizados.length > 0 ? (
                  <div className="space-y-4">
                    {testesRealizados.map((teste) => (
                      <Glass key={teste.id} variant="white" blur="md" className="p-4 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="text-white drop-shadow-sm">{teste.nome}</h4>
                              <p className="text-sm text-white/70 drop-shadow-sm">{teste.tipo}</p>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 text-sm text-white/70 drop-shadow-sm">
                            <Clock className="w-4 h-4" />
                            <span>Concluído em: {teste.dataConclusao}</span>
                          </div>
                          {teste.resultado && (
                            <div className="pt-2 border-t border-white/10">
                              <p className="text-sm text-white/80 drop-shadow-sm">
                                <span className="text-white/60">Resultado: </span>
                                {teste.resultado}
                              </p>
                            </div>
                          )}
                        </div>
                      </Glass>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-8 h-8 text-white/50" />
                    </div>
                    <p className="text-white/70 drop-shadow-sm">
                      Você ainda não realizou nenhum teste
                    </p>
                  </div>
                )}
              </Glass>
            </div>
          </div>

          {/* Botão Salvar Alterações */}
          <div className="flex justify-center pt-4">
            <GlassButton
              variant="white"
              hover
              onClick={() => {
                handleSalvarDados();
                if (senhas.atual && senhas.nova && senhas.confirmar) {
                  handleAlterarSenha();
                }
              }}
              className="flex items-center gap-2 px-8 py-4 text-white drop-shadow-sm"
            >
              <Save className="w-5 h-5" />
              Salvar Alterações
            </GlassButton>
          </div>
        </div>
      </BackgroundImage>
    </div>
  );
}
