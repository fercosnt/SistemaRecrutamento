import React, { useState } from 'react';
import { RHLayout } from '../RHLayout';
import { Glass, GlassButton } from '../ui/glass';
import { User, Mail, Phone, Lock, Eye, EyeOff, Save, Camera } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

interface MeuPerfilPageProps {
  onVoltar?: () => void;
}

export function MeuPerfilPage({ onVoltar }: MeuPerfilPageProps) {
  // Estado - Dados do Usuário
  const [dadosPessoais, setDadosPessoais] = useState({
    nome: 'João Silva',
    email: 'joao.silva@beautysmile.com.br',
    telefone: '(11) 98765-4321',
    cargo: 'Administrador',
    nivel: 'admin' as 'admin' | 'gerente' | 'recrutador' | 'visualizador',
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

  const handleSalvarDados = () => {
    // TODO(M5): persistir dados pessoais do usuário RH (stub — sem log de PII, SEC-11)
  };

  const handleAlterarSenha = () => {
    if (senhas.nova !== senhas.confirmar) {
      alert('As senhas não coincidem!');
      return;
    }
    // TODO(M5): persistir alteração de senha (stub — sem log, SEC-11)
    setSenhas({ atual: '', nova: '', confirmar: '' });
  };

  const handleAlterarFoto = () => {
    // TODO(M5): abrir seletor de foto (stub — sem log, SEC-11)
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

  return (
    <RHLayout>
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-white drop-shadow-lg mb-2">👤 Meu Perfil</h1>
            <div className="h-px bg-white/20 mt-4" />
          </div>

          {/* Conteúdo Principal */}
          <div className="space-y-8">
            {/* Seção de Avatar e Info Básica */}
            <Glass variant="white" blur="md" className="p-8 rounded-xl">
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
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <GlassButton
                    variant="white"
                    onClick={handleAlterarFoto}
                    className="flex items-center gap-2 text-sm py-2 px-4"
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
                  <div>
                    <Badge className={`${getNivelBadgeColor(dadosPessoais.nivel)} border-0`}>
                      {dadosPessoais.cargo}
                    </Badge>
                  </div>
                </div>
              </div>
            </Glass>

            {/* Dados Pessoais */}
            <Glass variant="white" blur="md" className="p-8 rounded-xl space-y-6">
              <div>
                <h3 className="text-white drop-shadow-md mb-1">DADOS PESSOAIS</h3>
                <div className="h-px bg-white/20 mt-3" />
              </div>

              <div className="space-y-6">
                {/* Nome Completo */}
                <div className="space-y-2">
                  <Label className="text-white/90 drop-shadow-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nome Completo
                  </Label>
                  <Input
                    value={dadosPessoais.nome}
                    onChange={(e) =>
                      setDadosPessoais({ ...dadosPessoais, nome: e.target.value })
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-white/90 drop-shadow-sm flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={dadosPessoais.email}
                    onChange={(e) =>
                      setDadosPessoais({ ...dadosPessoais, email: e.target.value })
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label className="text-white/90 drop-shadow-sm flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefone
                  </Label>
                  <Input
                    type="tel"
                    value={dadosPessoais.telefone}
                    onChange={(e) =>
                      setDadosPessoais({ ...dadosPessoais, telefone: e.target.value })
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>

              {/* Botão Salvar Dados */}
              <div className="flex justify-end pt-4">
                <GlassButton
                  variant="accent"
                  onClick={handleSalvarDados}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Dados Pessoais
                </GlassButton>
              </div>
            </Glass>

            {/* Alterar Senha */}
            <Glass variant="white" blur="md" className="p-8 rounded-xl space-y-6">
              <div>
                <h3 className="text-white drop-shadow-md mb-1">ALTERAR SENHA</h3>
                <div className="h-px bg-white/20 mt-3" />
              </div>

              <div className="space-y-6">
                {/* Senha Atual */}
                <div className="space-y-2">
                  <Label className="text-white/90 drop-shadow-sm flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Senha Atual
                  </Label>
                  <div className="relative">
                    <Input
                      type={mostrarSenhas.atual ? 'text' : 'password'}
                      value={senhas.atual}
                      onChange={(e) => setSenhas({ ...senhas, atual: e.target.value })}
                      placeholder="Digite sua senha atual"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMostrarSenhas({ ...mostrarSenhas, atual: !mostrarSenhas.atual })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
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
                  <Label className="text-white/90 drop-shadow-sm flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      type={mostrarSenhas.nova ? 'text' : 'password'}
                      value={senhas.nova}
                      onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })}
                      placeholder="Digite sua nova senha"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMostrarSenhas({ ...mostrarSenhas, nova: !mostrarSenhas.nova })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
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
                  <Label className="text-white/90 drop-shadow-sm flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      type={mostrarSenhas.confirmar ? 'text' : 'password'}
                      value={senhas.confirmar}
                      onChange={(e) => setSenhas({ ...senhas, confirmar: e.target.value })}
                      placeholder="Confirme sua nova senha"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMostrarSenhas({
                          ...mostrarSenhas,
                          confirmar: !mostrarSenhas.confirmar,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
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

              {/* Botão Alterar Senha */}
              <div className="flex justify-end pt-4">
                <GlassButton
                  variant="accent"
                  onClick={handleAlterarSenha}
                  disabled={!senhas.atual || !senhas.nova || !senhas.confirmar}
                  className="flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Alterar Senha
                </GlassButton>
              </div>
            </Glass>

            {/* Botão Geral Salvar Alterações */}
            <div className="flex justify-end">
              <GlassButton
                variant="accent"
                onClick={() => {
                  handleSalvarDados();
                  if (senhas.atual && senhas.nova && senhas.confirmar) {
                    handleAlterarSenha();
                  }
                }}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Todas as Alterações
              </GlassButton>
            </div>
          </div>
        </div>
      </div>
    </RHLayout>
  );
}
