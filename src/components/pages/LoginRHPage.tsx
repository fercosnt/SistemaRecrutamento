/**
 * LoginRHPage - Página de Login RH/Admin
 *
 * Sistema de autenticação para usuários RH e Administradores.
 * Inclui validação de domínio corporativo, verificação de role, e logging de acesso.
 *
 * @module components/pages/LoginRHPage
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { GlassCard, GlassButton, Glass } from '../ui/glass';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { adminLoginSchema, type AdminLoginFormData } from '@/schemas/adminLoginSchema';
import { supabase } from '@/lib/supabase/client';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { logLoginSuccess, logLoginFailure, logAccessDenied } from '@/services/logAccessService';

/**
 * Determina a URL de redirecionamento após login bem-sucedido
 *
 * @param adminUserId - ID do usuário RH/Admin
 * @param location - Location do React Router para pegar URL original
 * @returns URL de destino para redirecionamento
 */
async function determineRedirectUrl(adminUserId: string, location: any): Promise<string> {
  // Se o usuário estava tentando acessar uma página específica, redireciona para lá
  if (location.state?.from) {
    return location.state.from;
  }

  // Por padrão, redireciona para dashboard RH
  return '/rh/dashboard';
}

export function LoginRHPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setSession, setAdminUser } = useAdminAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    mode: 'all',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    try {
      // Lembrar-me is handled by Supabase persistSession (FOUND-11)
      // The persistSession: true option in client.ts already keeps the session
      // across browser restarts. The checkbox remains in the UI as a visual
      // affordance; manual sessionStorage/localStorage flags were removed because
      // they conflicted with Supabase's own auth storage and never reliably
      // expired the session on browser close.

      // Autenticação com Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        // Registrar tentativa de login falha
        await logLoginFailure(data.email, authError.message);

        // Tratamento de erros específicos do Supabase
        if (authError.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos', {
            description: 'Verifique suas credenciais e tente novamente.',
            icon: <AlertCircle className="w-5 h-5" />,
          });
        } else if (authError.message.includes('Email not confirmed')) {
          toast.error('Email não verificado', {
            description: 'Verifique seu email para confirmar sua conta.',
            icon: <AlertCircle className="w-5 h-5" />,
          });
        } else if (authError.message.includes('Too many requests')) {
          toast.error('Muitas tentativas de login', {
            description: 'Aguarde alguns minutos antes de tentar novamente.',
            icon: <AlertCircle className="w-5 h-5" />,
          });
        } else {
          toast.error('Erro ao fazer login', {
            description: authError.message,
            icon: <AlertCircle className="w-5 h-5" />,
          });
        }
        return;
      }

      if (!authData.user || !authData.session) {
        toast.error('Erro ao fazer login', {
          description: 'Não foi possível estabelecer a sessão.',
        });
        return;
      }

      // Atualizar Zustand store com dados de autenticação
      setUser(authData.user);
      setSession(authData.session);

      // Buscar perfil RH do usuário
      toast.loading('Verificando permissões...', { id: 'loading-profile' });

      const { data: adminUser, error: adminError } = await supabase
        .from('usuarios_rh')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .single();

      toast.dismiss('loading-profile');

      if (adminError) {
        console.error('Erro ao buscar perfil RH:', adminError);

        // Registrar acesso negado
        await logAccessDenied(data.email, 'Perfil RH não encontrado no banco de dados');

        // Fazer logout automático se perfil não encontrado
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);

        toast.error('Acesso negado', {
          description: 'Você não possui permissão para acessar esta área. Entre em contato com o administrador.',
          icon: <AlertCircle className="w-5 h-5" />,
          duration: 5000,
        });
        return;
      }

      if (!adminUser) {
        // Registrar acesso negado
        await logAccessDenied(data.email, 'Perfil RH não existe');

        // Perfil não existe - fazer logout
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);

        toast.error('Perfil inválido', {
          description: 'Sua conta não possui um perfil RH/Admin válido.',
          icon: <AlertCircle className="w-5 h-5" />,
        });
        return;
      }

      // Verificar se conta está ativa
      if (!adminUser.ativo) {
        // Registrar acesso negado
        await logAccessDenied(data.email, 'Conta RH desativada');

        await supabase.auth.signOut();
        setUser(null);
        setSession(null);

        toast.error('Conta desativada', {
          description: 'Sua conta RH foi desativada. Entre em contato com o administrador.',
          icon: <AlertCircle className="w-5 h-5" />,
          duration: 5000,
        });
        return;
      }

      // Atualizar store com dados do usuário RH
      setAdminUser(adminUser);

      // Atualizar data_ultimo_login no banco de dados
      await supabase
        .from('usuarios_rh')
        .update({
          data_ultimo_login: new Date().toISOString(),
          primeiro_acesso: false,
        })
        .eq('id', adminUser.id);

      // Registrar log de acesso bem-sucedido
      await logLoginSuccess(authData.user.id, data.email);

      toast.success('Login realizado com sucesso!', {
        description: `Bem-vindo, ${adminUser.nome_completo}!`,
        icon: <ShieldCheck className="w-5 h-5" />,
      });

      // Determinar destino do redirecionamento
      const redirectUrl = await determineRedirectUrl(adminUser.id, location);

      setTimeout(() => {
        navigate(redirectUrl, { replace: true });
      }, 1000);

    } catch (error) {
      console.error('Erro inesperado ao fazer login:', error);

      // Registrar log de erro inesperado
      await logLoginFailure(
        data.email,
        error instanceof Error ? error.message : 'Erro desconhecido'
      );

      toast.error('Erro inesperado', {
        description: 'Tente novamente mais tarde.',
        icon: <AlertCircle className="w-5 h-5" />,
      });
    }
  };

  const handleForgotPassword = () => {
    toast.info('Recuperação de senha', {
      description: 'Entre em contato com o administrador do sistema para redefinir sua senha.',
      duration: 6000,
    });
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="darkBlue"
        className="min-h-screen"
      >
        <div className="flex items-center justify-center min-h-screen py-20 px-4">
          <GlassCard variant="white" blur="xl" className="max-w-md w-full">
            <div className="space-y-6">
              {/* Logo e título */}
              <div className="text-center">
                <BeautySmileLogo type="horizontal" size="lg" variant="white" className="mx-auto mb-6" />
                <h1 className="text-white text-3xl mb-2">Área RH</h1>
                <p className="text-white/80">Acesse o sistema de recrutamento</p>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit(onSubmit)}>
                <Glass variant="white" blur="md" className="p-6 space-y-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email Corporativo *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="seu.email@beautysmile.com.br"
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50 backdrop-blur-sm"
                      autoFocus
                    />
                    {errors.email && (
                      <p className="text-red-300 text-sm drop-shadow-sm flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Senha */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">Senha *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        {...register('password')}
                        placeholder="Digite sua senha"
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/50 backdrop-blur-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-300 text-sm drop-shadow-sm flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Lembrar-me e Esqueceu a senha */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="rememberMe"
                        {...register('rememberMe')}
                        className="border-white/30 data-[state=checked]:bg-[#00109E]"
                      />
                      <Label
                        htmlFor="rememberMe"
                        className="text-white/80 drop-shadow-sm cursor-pointer"
                      >
                        Lembrar-me
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      Esqueci a senha
                    </button>
                  </div>
                </Glass>

                {/* Botão de Login */}
                <div className="space-y-3 mt-6">
                  <GlassButton
                    type="submit"
                    variant="white"
                    hover
                    className="w-full py-4 text-white text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || !isValid}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Entrando...
                      </span>
                    ) : (
                      'Entrar'
                    )}
                  </GlassButton>

                  <p className="text-center text-white/60 text-sm">
                    Não tem acesso? <button type="button" onClick={() => toast.info('Entre em contato com o administrador do sistema')} className="text-white/80 hover:text-white transition-colors">Solicitar credenciais</button>
                  </p>
                </div>
              </form>

              {/* Informações de segurança */}
              <Glass variant="white" blur="sm" className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-sm mb-1">Conexão Segura</p>
                    <p className="text-white/70 text-xs">
                      Seus dados estão protegidos com criptografia de ponta a ponta
                    </p>
                  </div>
                </div>
              </Glass>
            </div>
          </GlassCard>
        </div>
      </BackgroundImage>
    </div>
  );
}
