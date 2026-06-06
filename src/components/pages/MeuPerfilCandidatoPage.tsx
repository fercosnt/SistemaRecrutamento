import React, { useState, useRef } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { CandidatoNavbar } from '../layouts/CandidatoNavbar';
import { Glass, GlassButton, GlassCard } from '../ui/glass';
import { User, Mail, Phone, Lock, Eye, EyeOff, Save, Camera, Briefcase, FileText, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { useAuthStore, useCandidato } from '@/store/authStore';
import { supabase } from '@/lib/supabase/client';
import { useCandidaturas } from '@/features/vagas/hooks/useCandidaturas';
import { ETAPA_PROCESSO_LABELS, STATUS_CANDIDATURA_LABELS } from '@/features/vagas/types/vagasTypes';
import type { Candidatura } from '@/features/vagas/types/vagasTypes';

export function MeuPerfilCandidatoPage() {
  const candidato = useCandidato();
  const { setCandidato } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar candidaturas do banco de dados
  const { data: candidaturasData, isLoading: isLoadingCandidaturas } = useCandidaturas();
  const candidaturas = candidaturasData?.data || [];

  // Estado - Dados do Usuário (inicializado com dados reais do Zustand)
  const [dadosPessoais, setDadosPessoais] = useState({
    nome: candidato?.nome_completo || '',
    email: candidato?.email || '',
    telefone: candidato?.celular || '',
    avatar: candidato?.avatar_url || '',
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

  /**
   * Salva dados pessoais do candidato no Supabase
   * - Atualiza tabela candidatos com novos dados
   * - Atualiza Zustand store
   * - Mostra feedback ao usuário
   */
  const handleSalvarDados = async () => {
    if (!candidato?.id) {
      toast.error('Erro ao salvar', {
        description: 'Não foi possível identificar o candidato.',
      });
      return;
    }

    try {
      const toastId = toast.loading('Salvando seus dados...', {
        description: 'Aguarde enquanto atualizamos seu perfil.',
      });

      // Atualizar tabela candidatos
      const { data, error } = await supabase
        .from('candidatos')
        .update({
          nome_completo: dadosPessoais.nome,
          email: dadosPessoais.email,
          celular: dadosPessoais.telefone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidato.id)
        .select()
        .single();

      toast.dismiss(toastId);

      if (error) {
        console.error('Erro ao atualizar dados:', error);
        toast.error('Erro ao salvar dados', {
          description: error.message,
        });
        return;
      }

      // Atualizar Zustand store com dados atualizados
      if (data) {
        setCandidato(data);
        toast.success('Dados salvos com sucesso!', {
          description: 'Suas informações foram atualizadas.',
        });
      }
    } catch (error) {
      console.error('Erro inesperado ao salvar dados:', error);
      toast.error('Erro inesperado', {
        description: 'Tente novamente mais tarde.',
      });
    }
  };

  /**
   * Altera senha do usuário no Supabase Auth
   * - Valida se senhas coincidem
   * - Atualiza senha via supabase.auth.updateUser()
   * - Limpa campos após sucesso
   */
  const handleAlterarSenha = async (e?: React.FormEvent) => {
    // HARD-04/D-08 (Plan 05-06): a widget de alterar senha agora vive dentro de
    // um <form> (a11y). Prevenir o submit nativo para manter o fluxo SPA.
    e?.preventDefault();
    if (senhas.nova !== senhas.confirmar) {
      toast.error('Senhas não coincidem', {
        description: 'Verifique se a nova senha e confirmação são iguais.',
      });
      return;
    }

    if (senhas.nova.length < 6) {
      toast.error('Senha muito curta', {
        description: 'A senha deve ter no mínimo 6 caracteres.',
      });
      return;
    }

    try {
      const toastId = toast.loading('Alterando sua senha...', {
        description: 'Aguarde enquanto processamos a alteração.',
      });

      // Atualizar senha no Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: senhas.nova,
      });

      toast.dismiss(toastId);

      if (error) {
        console.error('Erro ao alterar senha:', error);
        toast.error('Erro ao alterar senha', {
          description: error.message,
        });
        return;
      }

      // Limpar campos de senha
      setSenhas({ atual: '', nova: '', confirmar: '' });

      toast.success('Senha alterada com sucesso!', {
        description: 'Sua nova senha já está ativa.',
      });
    } catch (error) {
      console.error('Erro inesperado ao alterar senha:', error);
      toast.error('Erro inesperado', {
        description: 'Tente novamente mais tarde.',
      });
    }
  };

  /**
   * Abre diálogo de seleção de arquivo e faz upload do avatar
   * - Abre input de arquivo (aceita apenas imagens)
   * - Upload para Supabase Storage bucket 'avatars'
   * - Atualiza candidatos.avatar_url
   * - Atualiza estado local e Zustand store
   */
  const handleAlterarFoto = () => {
    fileInputRef.current?.click();
  };

  /**
   * Processa upload do avatar selecionado
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !candidato?.id) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo inválido', {
        description: 'Por favor, selecione uma imagem.',
      });
      return;
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande', {
        description: 'O tamanho máximo é 2MB.',
      });
      return;
    }

    try {
      const toastId = toast.loading('Enviando foto...', {
        description: 'Aguarde enquanto fazemos upload da sua foto.',
      });

      // Nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${candidato.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        toast.dismiss(toastId);
        console.error('Erro ao fazer upload:', uploadError);
        toast.error('Erro ao enviar foto', {
          description: uploadError.message,
        });
        return;
      }

      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar tabela candidatos com nova avatar_url
      const { data, error: updateError } = await supabase
        .from('candidatos')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidato.id)
        .select()
        .single();

      toast.dismiss(toastId);

      if (updateError) {
        console.error('Erro ao atualizar avatar_url:', updateError);
        toast.error('Erro ao salvar foto', {
          description: updateError.message,
        });
        return;
      }

      // Atualizar estado local e Zustand store
      if (data) {
        setDadosPessoais({ ...dadosPessoais, avatar: publicUrl });
        setCandidato(data);
        toast.success('Foto atualizada com sucesso!', {
          description: 'Sua nova foto de perfil está visível.',
        });
      }
    } catch (error) {
      console.error('Erro inesperado ao fazer upload:', error);
      toast.error('Erro inesperado', {
        description: 'Tente novamente mais tarde.',
      });
    }
  };

  // WR-02-09/WR-01-09: logout now lives in the shared <CandidatoNavbar />.

  /**
   * Retorna badge com label e cor para status de candidatura
   */
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      aguardando_resposta: {
        label: STATUS_CANDIDATURA_LABELS.aguardando_resposta,
        className: 'bg-blue-500/80 text-white border-0'
      },
      em_analise: {
        label: STATUS_CANDIDATURA_LABELS.em_analise,
        className: 'bg-yellow-500/80 text-white border-0'
      },
      aprovado_proxima: {
        label: STATUS_CANDIDATURA_LABELS.aprovado_proxima,
        className: 'bg-green-500/80 text-white border-0'
      },
      rejeitado: {
        label: STATUS_CANDIDATURA_LABELS.rejeitado,
        className: 'bg-red-500/80 text-white border-0'
      },
      finalizado: {
        label: STATUS_CANDIDATURA_LABELS.finalizado,
        className: 'bg-gray-500/80 text-white border-0'
      },
    };
    return badges[status] || badges.em_analise;
  };

  /**
   * Formata data para exibição (ISO → DD/MM/YYYY)
   */
  const formatarData = (dataISO: string) => {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="relative min-h-screen">
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        {/* WR-02-09: shared persona navbar. showAreaLink={false} — this page IS the área. */}
        <CandidatoNavbar showAreaLink={false} />

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
                  <AvatarFallback className="bg-accent text-white text-3xl">
                    {(candidato?.nome_completo || 'C')
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
                <h2 className="text-white drop-shadow-lg">{candidato?.nome_completo || 'Candidato'}</h2>
                <p className="text-white/80 drop-shadow-md flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  {candidato?.email || ''}
                </p>
                <p className="text-white/80 drop-shadow-md flex items-center justify-center md:justify-start gap-2">
                  <Phone className="w-4 h-4" />
                  {candidato?.celular || ''}
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

                {/* Botão Salvar Dados */}
                <div className="flex justify-end pt-2">
                  <GlassButton
                    variant="white"
                    hover
                    onClick={handleSalvarDados}
                    className="flex items-center gap-2 text-white drop-shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Dados
                  </GlassButton>
                </div>
              </Glass>

              {/* Alterar Senha */}
              <Glass variant="white" blur="xl" className="p-8 rounded-xl space-y-6">
                <div>
                  <h3 className="text-white drop-shadow-md">ALTERAR SENHA</h3>
                  <div className="h-px bg-white/20 mt-3" />
                </div>

                <form onSubmit={handleAlterarSenha} className="space-y-6">
                  {/* Senha Atual */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="perfil_senha_atual"
                      className="text-white/90 drop-shadow-sm"
                    >
                      Senha Atual
                    </Label>
                    <div className="relative">
                      <Input
                        id="perfil_senha_atual"
                        type={mostrarSenhas.atual ? 'text' : 'password'}
                        value={senhas.atual}
                        onChange={(e) => setSenhas({ ...senhas, atual: e.target.value })}
                        placeholder="Digite sua senha atual"
                        autoComplete="current-password"
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
                    <Label
                      htmlFor="perfil_senha_nova"
                      className="text-white/90 drop-shadow-sm"
                    >
                      Nova Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="perfil_senha_nova"
                        type={mostrarSenhas.nova ? 'text' : 'password'}
                        value={senhas.nova}
                        onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })}
                        placeholder="Digite sua nova senha"
                        autoComplete="new-password"
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
                    <Label
                      htmlFor="perfil_senha_confirmar"
                      className="text-white/90 drop-shadow-sm"
                    >
                      Confirmar Nova Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="perfil_senha_confirmar"
                        type={mostrarSenhas.confirmar ? 'text' : 'password'}
                        value={senhas.confirmar}
                        onChange={(e) => setSenhas({ ...senhas, confirmar: e.target.value })}
                        placeholder="Confirme sua nova senha"
                        autoComplete="new-password"
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

                  {/* Botão Alterar Senha (submit do <form> — a11y HARD-04) */}
                  <div className="flex justify-end pt-2">
                    <GlassButton
                      variant="white"
                      hover
                      type="submit"
                      className="flex items-center gap-2 text-white drop-shadow-sm"
                      disabled={
                        !senhas.atual ||
                        !senhas.nova ||
                        !senhas.confirmar ||
                        senhas.nova !== senhas.confirmar
                      }
                    >
                      <Lock className="w-4 h-4" />
                      Alterar Senha
                    </GlassButton>
                  </div>
                </form>
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

                {isLoadingCandidaturas ? (
                  <div className="text-center py-8">
                    <p className="text-white/70 drop-shadow-sm">
                      Carregando suas candidaturas...
                    </p>
                  </div>
                ) : candidaturas.length > 0 ? (
                  <div className="space-y-4">
                    {candidaturas.map((candidatura) => {
                      const statusBadge = getStatusBadge(candidatura.status);
                      return (
                        <Glass key={candidatura.id} variant="white" blur="md" className="p-4 rounded-lg">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-white drop-shadow-sm">
                                {candidatura.vaga?.titulo || 'Vaga não encontrada'}
                              </h4>
                              <Badge className={statusBadge.className}>
                                {statusBadge.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70 drop-shadow-sm">
                              <Calendar className="w-4 h-4" />
                              <span>Inscrição: {formatarData(candidatura.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70 drop-shadow-sm">
                              <FileText className="w-4 h-4" />
                              <span>
                                Etapa Atual: {ETAPA_PROCESSO_LABELS[candidatura.etapa_atual] || candidatura.etapa_atual}
                              </span>
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

              {/* Etapas do Processo - Baseado na Primeira Candidatura */}
              {candidaturas.length > 0 && (
                <Glass variant="white" blur="xl" className="p-8 rounded-xl space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-white drop-shadow-md" />
                      <h3 className="text-white drop-shadow-md">PROGRESSO NO PROCESSO SELETIVO</h3>
                    </div>
                    <div className="h-px bg-white/20 mt-3" />
                  </div>

                  <div className="space-y-4">
                    {candidaturas.map((candidatura) => (
                      <Glass key={candidatura.id} variant="white" blur="md" className="p-4 rounded-lg">
                        <div className="space-y-3">
                          {/* Vaga */}
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-white drop-shadow-sm text-sm font-semibold">
                              {candidatura.vaga?.titulo || 'Vaga'}
                            </h4>
                            <Badge className={getStatusBadge(candidatura.status).className}>
                              {getStatusBadge(candidatura.status).label}
                            </Badge>
                          </div>

                          {/* Etapa Atual */}
                          <div className="flex items-center gap-2 text-sm text-white/80 drop-shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span>
                              <strong>Etapa Atual:</strong>{' '}
                              {ETAPA_PROCESSO_LABELS[candidatura.etapa_atual] || candidatura.etapa_atual}
                            </span>
                          </div>

                          {/* Data de Última Atualização */}
                          <div className="flex items-center gap-2 text-sm text-white/70 drop-shadow-sm">
                            <Clock className="w-4 h-4" />
                            <span>Atualizado em: {formatarData(candidatura.updated_at)}</span>
                          </div>
                        </div>
                      </Glass>
                    ))}
                  </div>
                </Glass>
              )}
            </div>
          </div>
        </div>
      </BackgroundImage>
    </div>
  );
}
