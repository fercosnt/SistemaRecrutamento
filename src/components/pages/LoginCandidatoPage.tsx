import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Eye, EyeOff, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { loginSchema, type LoginFormData } from '@/schemas/loginSchema';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';

interface LoginCandidatoPageProps {
  onEsqueciSenha?: () => void;
}

/**
 * Determina a URL de redirecionamento baseado na etapa atual do candidato
 *
 * Lógica de redirecionamento:
 * 1. Se houver URL original tentada (location.state.from), redireciona para lá
 * 2. Caso contrário, redireciona para dashboard padrão
 *
 * TODO: Implementar lógica de redirecionamento por etapa quando tabela candidaturas estiver disponível
 *
 * @param candidatoId - ID do candidato
 * @param location - Location do React Router para pegar URL original
 * @returns URL de destino para redirecionamento
 */
async function determineRedirectUrl(candidatoId: string, location: any): Promise<string> {
  // Se o usuário estava tentando acessar uma página específica, redireciona para lá
  if (location.state?.from) {
    return location.state.from;
  }

  // Por enquanto, sempre redireciona para perfil do candidato
  // A lógica de redirecionamento por etapa será implementada quando
  // a tabela candidaturas estiver disponível no database.types.ts
  return '/candidato/perfil';
}

export function LoginCandidatoPage({ onEsqueciSenha }: LoginCandidatoPageProps = {}) {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setSession } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'all', // Validate on change, blur, and submit
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
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
        // Tratamento de erros específicos do Supabase
        if (authError.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos', {
            description: 'Verifique suas credenciais e tente novamente.',
          });
        } else if (authError.message.includes('Email not confirmed')) {
          toast.error('Email não verificado', {
            description: 'Verifique seu email para confirmar sua conta.',
          });
        } else if (authError.message.includes('Too many requests')) {
          toast.error('Muitas tentativas de login', {
            description: 'Aguarde alguns minutos antes de tentar novamente.',
          });
        } else {
          toast.error('Erro ao fazer login', {
            description: authError.message,
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

      // Atualizar Zustand store
      setUser(authData.user);
      setSession(authData.session);

      // Buscar perfil completo do candidato
      toast.loading('Carregando seu perfil...', { id: 'loading-profile' });

      const { data: candidato, error: candidatoError } = await supabase
        .from('candidatos')
        .select('*')
        .eq('user_id', authData.user.id)
        .is('deleted_at', null)
        .single();

      toast.dismiss('loading-profile');

      if (candidatoError) {
        console.error('Erro ao buscar perfil do candidato:', candidatoError);

        // Fazer logout automático se perfil não encontrado
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);

        toast.error('Perfil não encontrado', {
          description: 'Não foi possível carregar seu perfil. Entre em contato com o suporte.',
        });
        return;
      }

      if (!candidato) {
        // Perfil não existe - fazer logout
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);

        toast.error('Perfil inválido', {
          description: 'Sua conta não possui um perfil de candidato válido.',
        });
        return;
      }

      // Atualizar store com dados do candidato
      useAuthStore.getState().setCandidato(candidato);

      toast.success('Login realizado com sucesso!', {
        description: `Bem-vindo, ${candidato.nome_completo}!`,
      });

      // Determinar destino do redirecionamento baseado na etapa atual
      const redirectUrl = await determineRedirectUrl(candidato.id, location);

      setTimeout(() => {
        navigate(redirectUrl, { replace: true });
      }, 1000);

    } catch (error) {
      console.error('Erro inesperado ao fazer login:', error);
      toast.error('Erro inesperado', {
        description: 'Tente novamente mais tarde.',
      });
    }
  };

  const handleForgotPassword = () => {
    if (onEsqueciSenha) {
      onEsqueciSenha();
    } else {
      toast.info('Recuperação de senha', {
        description: 'Em breve você receberá um email com instruções.',
      });
      console.log('Redirecionar para recuperação de senha...');
    }
  };

  const handleEmailContact = () => {
    const email = 'contato@beautysmile.com.br';
    window.location.href = `mailto:${email}`;
    toast.success('Abrindo seu cliente de email...');
  };

  const handleWhatsAppContact = () => {
    const phone = '5511999999999'; // Formato: código do país + DDD + número
    const message = encodeURIComponent('Olá! Preciso de ajuda com meu cadastro na Beauty Smile.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    toast.success('Abrindo WhatsApp...');
  };

  return (
    <BackgroundImage 
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
      className="min-h-screen"
    >
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="w-full max-w-6xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <BeautySmileLogo type="vertical" variant="white" size="lg" className="drop-shadow-lg" />
          </div>

          {/* Container principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulário de Login */}
            <GlassCard 
              variant="white" 
              blur="lg"
              className="p-8 md:p-12"
            >
              {/* Título */}
              <div className="mb-8">
                <h1 className="text-white mb-3 drop-shadow-lg text-[40px] font-bold">
                  Entrar
                </h1>
                <p className="text-white/90 drop-shadow-md">
                  Acesse sua conta de candidato
                </p>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white drop-shadow-sm">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="seu@email.com"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    autoFocus
                  />
                  {errors.email && (
                    <p className="text-red-300 text-sm drop-shadow-sm">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white drop-shadow-sm">
                    Senha *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      placeholder="Digite sua senha"
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
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
                    <p className="text-red-300 text-sm drop-shadow-sm">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Lembrar-me e Esqueceu a senha */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      {...register('rememberMe')}
                      className="border-white/30 data-[state=checked]:bg-[#00109E]"
                    />
                    <Label
                      htmlFor="rememberMe"
                      className="text-white/90 drop-shadow-sm cursor-pointer"
                    >
                      Lembrar-me
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-white/90 hover:text-white underline transition-colors duration-200 drop-shadow-sm"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                {/* Botão de Login */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white py-3 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-300 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-center"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Entrando...
                      </span>
                    ) : (
                      'Entrar'
                    )}
                  </button>
                </div>
              </form>
            </GlassCard>

            {/* Seção de Contato */}
            <GlassCard 
              variant="white" 
              blur="lg"
              className="p-8 md:p-12 flex flex-col justify-center"
            >
              {/* Título */}
              <div className="mb-8">
                <h2 className="text-white mb-3 drop-shadow-lg">
                  Precisa de Ajuda?
                </h2>
                <p className="text-white/90 drop-shadow-md">
                  Entre em contato conosco através dos canais abaixo
                </p>
              </div>

              {/* Botões de Contato */}
              <div className="space-y-4">
                {/* Email */}
                <button
                  onClick={handleEmailContact}
                  className="w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-lg border border-white/30 backdrop-blur-md transition-all duration-300 hover:shadow-xl active:scale-95 flex items-center justify-center gap-3"
                >
                  <Mail className="w-5 h-5" />
                  <div className="text-left">
                    <div className="drop-shadow-sm">Enviar Email</div>
                    <div className="text-white/80 drop-shadow-sm">
                      contato@beautysmile.com.br
                    </div>
                  </div>
                </button>

                {/* WhatsApp */}
                <button
                  onClick={handleWhatsAppContact}
                  className="w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-lg border border-white/30 backdrop-blur-md transition-all duration-300 hover:shadow-xl active:scale-95 flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-5 h-5" />
                  <div className="text-left">
                    <div className="drop-shadow-sm">Chamar no WhatsApp</div>
                    <div className="text-white/80 drop-shadow-sm">
                      (11) 99999-9999
                    </div>
                  </div>
                </button>
              </div>

              {/* Informação adicional */}
              <div className="mt-8 p-4 bg-white/10 rounded-lg border border-white/20">
                <p className="text-white/80 drop-shadow-sm">
                  <strong className="text-white">Horário de atendimento:</strong>
                  <br />
                  Segunda a Sexta: 9h às 18h
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </BackgroundImage>
  );
}
