/**
 * Página de Esqueci Minha Senha
 *
 * Suporta recuperação para candidatos e administradores RH
 * Tipo de usuário detectado via query param ?tipo=rh
 * Integração completa com Supabase Auth e rate limiting
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import {
  passwordRecoverySchema,
  type PasswordRecoveryFormData,
} from '@/schemas/passwordRecoverySchema';
import {
  isRateLimited,
  recordAttempt,
  getRemainingTime,
  getRemainingAttempts,
} from '@/services/rateLimitService';
import { logPasswordResetRequest } from '@/services/logAccessService';

export function EsqueciSenhaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emailEnviado, setEmailEnviado] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Detectar tipo de usuário: 'candidato' ou 'rh'
  const tipoUsuario = searchParams.get('tipo') === 'rh' ? 'rh' : 'candidato';
  const isRH = tipoUsuario === 'rh';

  // React Hook Form com Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
  } = useForm<PasswordRecoveryFormData>({
    resolver: zodResolver(passwordRecoverySchema),
    mode: 'onChange', // Validação em tempo real
  });

  const emailValue = watch('email');

  // Auto-focus no campo email (acessibilidade)
  useEffect(() => {
    if (emailInputRef.current && !emailEnviado) {
      emailInputRef.current.focus();
    }
  }, [emailEnviado]);

  /**
   * Submit handler com integração Supabase
   */
  const onSubmit = async (data: PasswordRecoveryFormData) => {
    try {
      // Verificar rate limiting
      if (isRateLimited(data.email)) {
        const minutesRemaining = getRemainingTime(data.email);
        setError('email', {
          type: 'manual',
          message: `Muitas tentativas. Tente novamente em ${minutesRemaining} minuto${minutesRemaining > 1 ? 's' : ''}.`,
        });
        toast.error('Limite de tentativas excedido', {
          description: `Por favor, aguarde ${minutesRemaining} minuto${minutesRemaining > 1 ? 's' : ''} antes de tentar novamente.`,
          duration: 5000,
        });
        return;
      }

      // Registrar tentativa
      recordAttempt(data.email);

      // URL de redirecionamento após reset de senha
      // Incluir tipo de usuário para manter contexto
      const redirectUrl = `${window.location.origin}/auth/redefinir-senha${
        isRH ? '?tipo=rh' : ''
      }`;

      // Chamar Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectUrl,
      });

      // Log da solicitação de recuperação (sempre registrar, independente do erro)
      await logPasswordResetRequest(data.email);

      if (error) {
        console.error('Erro ao solicitar recuperação:', error);

        // Não revelar se email existe ou não (segurança)
        // Sempre mostrar mensagem de sucesso genérica
      }

      // IMPORTANTE: Sempre mostrar sucesso, mesmo se email não existir
      // Isso previne enumeração de usuários
      setEmailEnviado(true);

      toast.success('Email enviado com sucesso!', {
        description: 'Verifique sua caixa de entrada e spam.',
        duration: 5000,
      });
    } catch (error) {
      console.error('Erro inesperado ao solicitar recuperação:', error);

      // Mostrar mensagem genérica mesmo em caso de erro
      setEmailEnviado(true);

      toast.success('Email enviado com sucesso!', {
        description: 'Verifique sua caixa de entrada e spam.',
        duration: 5000,
      });
    }
  };

  const handleVoltarLogin = () => {
    const loginPath = isRH ? '/auth/login-rh' : '/auth/login';
    navigate(loginPath);
  };

  const handleReenviar = () => {
    setEmailEnviado(false);
    // Auto-focus ao voltar ao formulário
    setTimeout(() => {
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    }, 100);
  };

  // Tema condicional baseado no tipo de usuário
  const backgroundGradient = isRH
    ? 'from-[#00109E] via-[#0066CC] to-[#00109E]'
    : 'gradient';

  // Calcular tentativas restantes para feedback visual
  const remainingAttempts = emailValue ? getRemainingAttempts(emailValue) : 3;
  const showRateLimitWarning = remainingAttempts <= 1 && remainingAttempts > 0;

  return (
    <BackgroundImage
      background={backgroundGradient as any}
      overlayColor="bg-black"
      overlayOpacity={15}
      className="min-h-screen"
    >
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <BeautySmileLogo type="vertical" variant="white" size="lg" className="drop-shadow-lg" />
          </div>

          {/* Card Principal */}
          <GlassCard variant="white" blur="lg" className="p-8">
            {!emailEnviado ? (
              <>
                {/* Título */}
                <div className="text-center mb-6">
                  <h1 className="text-white mb-3 drop-shadow-lg text-[40px] font-bold">
                    {isRH ? 'Recuperar Acesso RH' : 'Esqueci Minha Senha'}
                  </h1>
                  <p className="text-white/90 drop-shadow-md">
                    {isRH
                      ? 'Digite seu email corporativo para receber as instruções de recuperação'
                      : 'Digite seu email para receber as instruções de recuperação de senha'}
                  </p>
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  {/* Campo Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white drop-shadow-sm">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 w-5 h-5"
                        aria-hidden="true"
                      />
                      <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        ref={(e) => {
                          register('email').ref(e);
                          (emailInputRef as any).current = e;
                        }}
                        placeholder="seu@email.com"
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pl-10"
                        aria-invalid={errors.email ? 'true' : 'false'}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        autoComplete="email"
                        autoFocus
                        data-testid="email-input"
                      />
                    </div>

                    {/* Mensagem de erro */}
                    {errors.email && (
                      <p
                        id="email-error"
                        className="text-red-300 drop-shadow-sm text-sm flex items-center gap-1"
                        role="alert"
                        data-testid="email-error"
                      >
                        <AlertCircle size={14} aria-hidden="true" />
                        {errors.email.message}
                      </p>
                    )}

                    {/* Aviso de rate limit */}
                    {showRateLimitWarning && !errors.email && (
                      <p
                        className="text-yellow-300 drop-shadow-sm text-sm flex items-center gap-1"
                        role="status"
                        data-testid="rate-limit-warning"
                      >
                        <Clock size={14} aria-hidden="true" />
                        {remainingAttempts} tentativa{remainingAttempts > 1 ? 's' : ''} restante
                        {remainingAttempts > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Botão Enviar */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white py-3 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-300 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-center"
                    aria-busy={isSubmitting}
                    data-testid="submit-button"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </span>
                    ) : (
                      'Enviar Instruções'
                    )}
                  </button>

                  {/* Link Voltar ao Login */}
                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={handleVoltarLogin}
                      className="text-white/80 hover:text-white transition-colors duration-200 drop-shadow-sm flex items-center justify-center gap-2 mx-auto"
                      data-testid="back-button"
                    >
                      <ArrowLeft size={18} aria-hidden="true" />
                      <span>Voltar ao login</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                {/* Mensagem de Sucesso */}
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <CheckCircle2 size={48} className="text-white drop-shadow-lg" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-white drop-shadow-lg text-2xl font-bold" data-testid="success-heading">
                      Email Enviado!
                    </h2>
                    <p className="text-white/90 drop-shadow-md leading-relaxed">
                      Enviamos as instruções de recuperação de senha para:
                    </p>
                    <p className="text-white drop-shadow-md font-medium">{emailValue}</p>
                  </div>

                  <div className="bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-white/80 drop-shadow-sm text-sm leading-relaxed">
                      📧 Verifique sua caixa de entrada e também a pasta de spam. O email pode
                      levar alguns minutos para chegar.
                    </p>
                  </div>

                  {/* Botão Voltar ao Login */}
                  <button
                    type="button"
                    onClick={handleVoltarLogin}
                    className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white py-3 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-300 hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    data-testid="back-to-login-button"
                  >
                    <ArrowLeft size={20} aria-hidden="true" />
                    <span>Voltar ao Login</span>
                  </button>

                  {/* Reenviar Email */}
                  <button
                    type="button"
                    onClick={handleReenviar}
                    className="text-white/80 hover:text-white transition-colors duration-200 drop-shadow-sm text-sm"
                    data-testid="resend-button"
                  >
                    Não recebeu? Reenviar email
                  </button>
                </div>
              </>
            )}
          </GlassCard>

          {/* Informação Adicional */}
          {!emailEnviado && !isRH && (
            <div className="mt-6 text-center">
              <p className="text-white/70 drop-shadow-sm text-sm">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  className="text-white hover:text-white/90 underline transition-colors duration-200"
                  onClick={() => navigate('/auth/inscricao')}
                >
                  Criar conta
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </BackgroundImage>
  );
}
