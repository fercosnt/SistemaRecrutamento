import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Eye, EyeOff, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { logPasswordResetCompleted, logPasswordResetFailed } from '@/services/logAccessService';
import { detectUserType } from '@/services/userTypeDetectionService';
import {
  sendPasswordChangeConfirmation,
  formatDataHora,
  detectDeviceType,
  extractBrowserInfo,
} from '@/services/passwordChangeConfirmationService';
import {
  processError,
  isAuthError,
  isPasswordError,
  formatErrorForLogging,
} from '@/services/errorHandlingService';
import { validatePassword } from '@/services/securityValidationService';

/**
 * Página de Redefinir Senha
 *
 * Suporta redefinição para candidatos e administradores RH
 * Token de recuperação extraído da URL via query params
 * Tipo de usuário detectado via query param ?tipo=rh
 */

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senhaRedefinida, setSenhaRedefinida] = useState(false);
  const [countdown, setCountdown] = useState(3); // PRD pede 3 segundos
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string>('/auth/login');

  // Extrair token da URL
  const token = searchParams.get('token') || searchParams.get('access_token') || '';

  // Detectar tipo de usuário: 'candidato' ou 'rh' (via query param para UI apenas)
  const tipoUsuario = searchParams.get('tipo') === 'rh' ? 'rh' : 'candidato';
  const isRH = tipoUsuario === 'rh';

  // Obter email do usuário para validação de senha
  const [userEmail, setUserEmail] = useState<string>('');

  // Buscar email ao montar (se sessão válida)
  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    };
    if (hasValidSession) {
      fetchUserEmail();
    }
  }, [hasValidSession]);

  // Validação de força da senha com securityValidationService
  const passwordValidation = validatePassword(novaSenha, userEmail);

  // Adaptar para formato PasswordStrength (compatibilidade)
  const passwordStrength: PasswordStrength = {
    score: passwordValidation.strength,
    label:
      passwordValidation.strength === 0
        ? ''
        : passwordValidation.strength <= 2
          ? 'Fraca'
          : passwordValidation.strength <= 3
            ? 'Média'
            : passwordValidation.strength <= 4
              ? 'Forte'
              : 'Muito Forte',
    color:
      passwordValidation.strength === 0
        ? ''
        : passwordValidation.strength <= 2
          ? 'bg-red-500'
          : passwordValidation.strength <= 3
            ? 'bg-yellow-500'
            : passwordValidation.strength <= 4
              ? 'bg-green-500'
              : 'bg-emerald-500',
    requirements: passwordValidation.requirements,
  };

  // Verificar sessão de recuperação ao montar o componente
  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        // Verificar se há uma sessão ativa
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          const processedError = processError(error, 'RedefinirSenhaPage.checkRecoverySession');
          console.error('[RedefinirSenhaPage] Erro ao verificar sessão:', processedError);

          // Determinar mensagem baseado no tipo de erro
          if (isAuthError(error)) {
            setTokenError(processedError.description);
          } else {
            setTokenError('Link de recuperação inválido ou expirado.');
          }

          setHasValidSession(false);
          return;
        }

        if (!session) {
          setTokenError('Link de recuperação inválido ou expirado. Solicite um novo link.');
          setHasValidSession(false);
          return;
        }

        // Sessão válida - usuário pode redefinir a senha
        setHasValidSession(true);
      } catch (error) {
        const processedError = processError(error, 'RedefinirSenhaPage.checkRecoverySession.catch');
        console.error('[RedefinirSenhaPage] Erro inesperado ao verificar sessão:', processedError);

        setTokenError(processedError.description || 'Erro ao validar link de recuperação. Tente novamente.');
        setHasValidSession(false);
      }
    };

    checkRecoverySession();
  }, []);

  // Countdown para redirect
  useEffect(() => {
    if (senhaRedefinida && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (senhaRedefinida && countdown === 0) {
      // Redirecionar usando o caminho detectado (inteligente)
      navigate(redirectPath);
    }
  }, [senhaRedefinida, countdown, navigate, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!novaSenha.trim()) {
      toast.error('Por favor, digite sua nova senha');
      return;
    }

    // Validar senha com securityValidationService
    if (!passwordValidation.isValid) {
      toast.error('Senha inválida', {
        description: passwordValidation.errors[0] || 'A senha não atende aos requisitos de segurança',
        duration: 5000,
      });
      return;
    }

    // Avisos de segurança (não bloqueiam, mas alertam)
    if (passwordValidation.warnings.length > 0) {
      toast.warning('Aviso de Segurança', {
        description: passwordValidation.warnings[0],
        duration: 4000,
      });
      // Continua mesmo com avisos
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);

    try {
      // Obter dados do usuário da sessão atual
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;

      // Atualizar senha usando Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (error) {
        // Processar erro com errorHandlingService
        const processedError = processError(error, 'RedefinirSenhaPage.handleSubmit');

        // Log de falha na redefinição (com mensagem sanitizada)
        if (currentUser?.email) {
          await logPasswordResetFailed(
            currentUser.email,
            formatErrorForLogging(error)
          );
        }

        // Exibir mensagem amigável ao usuário
        toast.error(processedError.title, {
          description: processedError.description,
          duration: 5000,
        });

        // Se for erro de autenticação, sugerir ação específica
        if (isAuthError(error) && processedError.suggestedAction) {
          setTimeout(() => {
            toast.info('Dica', {
              description: processedError.suggestedAction,
              duration: 7000,
            });
          }, 1000);
        }

        // Se for erro de senha fraca, focar no campo de senha
        if (isPasswordError(error)) {
          setNovaSenha('');
          setConfirmarSenha('');
        }

        setIsSubmitting(false);
        return;
      }

      // Log de sucesso na redefinição
      if (currentUser?.id) {
        await logPasswordResetCompleted(currentUser.id, currentUser.email);
      }

      // Detectar tipo de usuário para redirecionamento inteligente
      let loginPath = '/auth/login'; // Default: candidato
      let nomeCompleto = 'Usuário'; // Default
      if (currentUser?.id) {
        const userTypeResult = await detectUserType(currentUser.id);
        loginPath = userTypeResult.loginPath;
        console.log(`Usuário detectado como: ${userTypeResult.type}, redirecionando para: ${loginPath}`);

        // Obter nome completo do usuário para o email
        if (userTypeResult.type === 'candidato') {
          const { data: candidato } = await supabase
            .from('candidatos')
            .select('nome_completo')
            .eq('user_id', currentUser.id)
            .single();
          if (candidato?.nome_completo) {
            nomeCompleto = candidato.nome_completo;
          }
        } else if (userTypeResult.type === 'rh') {
          const { data: adminUser } = await (supabase as any)
            .from('usuarios_rh')
            .select('nome_completo')
            .eq('user_id', currentUser.id)
            .single();
          if (adminUser?.nome_completo) {
            nomeCompleto = adminUser.nome_completo;
          }
        }
      }

      // Armazenar caminho de redirecionamento
      setRedirectPath(loginPath);

      // Enviar email de confirmação de alteração de senha
      if (currentUser?.email) {
        try {
          const userAgent = navigator.userAgent;
          await sendPasswordChangeConfirmation({
            nomeCompleto,
            email: currentUser.email,
            dataHora: formatDataHora(),
            dispositivo: detectDeviceType(userAgent),
            navegador: extractBrowserInfo(userAgent),
            ipAddress: 'N/A', // IP será capturado pelo N8N
          });
          console.log('[RedefinirSenha] Email de confirmação enviado com sucesso');
        } catch (emailError) {
          // Não bloquear o fluxo se email falhar
          console.error('[RedefinirSenha] Erro ao enviar email de confirmação:', emailError);
        }
      }

      // Sucesso - fazer logout para forçar novo login com a nova senha
      await supabase.auth.signOut();

      setIsSubmitting(false);
      setSenhaRedefinida(true);

      toast.success('Senha redefinida com sucesso!', {
        description: 'Você será redirecionado para o login.',
        duration: 5000,
      });
    } catch (error) {
      // Processar erro inesperado
      const processedError = processError(error, 'RedefinirSenhaPage.handleSubmit.catch');

      setIsSubmitting(false);

      // Tentar logar o erro se possível
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.email) {
          await logPasswordResetFailed(
            sessionData.session.user.email,
            formatErrorForLogging(error)
          );
        }
      } catch (logError) {
        console.error('[RedefinirSenhaPage] Erro ao logar falha:', logError);
      }

      // Exibir mensagem ao usuário
      toast.error(processedError.title, {
        description: processedError.description,
        duration: 5000,
      });

      // Se houver ação sugerida, mostrar
      if (processedError.suggestedAction) {
        setTimeout(() => {
          toast.info('Sugestão', {
            description: processedError.suggestedAction,
            duration: 7000,
          });
        }, 1000);
      }
    }
  };

  const handleVoltarLogin = () => {
    // Redirecionar para o login apropriado baseado no tipo de usuário
    const loginPath = isRH ? '/auth/login-rh' : '/auth/login';
    navigate(loginPath);
  };

  // Tema condicional baseado no tipo de usuário
  const backgroundGradient = isRH
    ? "from-[#00109E] via-[#0066CC] to-[#00109E]" // RH: gradiente azul profundo
    : "gradient"; // Candidato: gradiente padrão

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
          <GlassCard
            variant="white"
            blur="lg"
            className="p-8"
          >
            {/* Loading State - Verificando sessão */}
            {hasValidSession === null ? (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-white drop-shadow-lg text-2xl font-bold">
                    Validando link...
                  </h2>
                  <p className="text-white/90 drop-shadow-md">
                    Aguarde enquanto verificamos seu link de recuperação.
                  </p>
                </div>
              </div>
            ) : hasValidSession === false ? (
              /* Error State - Token inválido */
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center backdrop-blur-md">
                    <AlertCircle size={48} className="text-red-300 drop-shadow-lg" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-white drop-shadow-lg text-2xl font-bold">
                    Link Inválido
                  </h2>
                  <p className="text-white/90 drop-shadow-md leading-relaxed">
                    {tokenError || 'Este link de recuperação não é válido ou já expirou.'}
                  </p>
                </div>

                <div className="bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-white/80 drop-shadow-sm text-sm leading-relaxed">
                    💡 Links de recuperação expiram em 24 horas por segurança.
                  </p>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/auth/esqueci-senha${isRH ? '?tipo=rh' : ''}`)}
                    className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white py-3 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-300 hover:shadow-xl active:scale-95"
                  >
                    Solicitar Novo Link
                  </button>

                  <button
                    type="button"
                    onClick={handleVoltarLogin}
                    className="text-white/80 hover:text-white transition-colors duration-200 drop-shadow-sm text-sm"
                  >
                    Voltar ao Login
                  </button>
                </div>
              </div>
            ) : !senhaRedefinida ? (
              <>
                {/* Título */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Lock size={32} className="text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <h1 className="text-white mb-3 drop-shadow-lg">
                    {isRH ? 'Nova Senha - Painel RH' : 'Redefinir Senha'}
                  </h1>
                  <p className="text-white/90 drop-shadow-md">
                    {isRH
                      ? 'Crie uma senha forte para seu acesso administrativo'
                      : 'Crie uma nova senha forte e segura'
                    }
                  </p>
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nova Senha */}
                  <div className="space-y-2">
                    <Label htmlFor="novaSenha" className="text-white drop-shadow-sm">
                      Nova Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="novaSenha"
                        type={showNovaSenha ? 'text' : 'password'}
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Digite sua nova senha"
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNovaSenha(!showNovaSenha)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                      >
                        {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Indicador de Força */}
                    {novaSenha && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white/80 drop-shadow-sm text-sm">
                            Força da senha:
                          </span>
                          <span className={`text-sm drop-shadow-sm ${
                            passwordStrength.score <= 2 ? 'text-red-300' :
                            passwordStrength.score <= 3 ? 'text-yellow-300' :
                            passwordStrength.score <= 4 ? 'text-green-300' :
                            'text-emerald-300'
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                                level <= passwordStrength.score
                                  ? passwordStrength.color
                                  : 'bg-white/20'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Requisitos de Senha */}
                  {novaSenha && (
                    <div className="bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm space-y-2">
                      <p className="text-white/90 drop-shadow-sm text-sm mb-2">
                        Requisitos de senha:
                      </p>
                      <div className="space-y-1 text-sm">
                        {[
                          { key: 'minLength', label: 'Mínimo de 8 caracteres' },
                          { key: 'hasUpperCase', label: 'Pelo menos uma letra maiúscula' },
                          { key: 'hasLowerCase', label: 'Pelo menos uma letra minúscula' },
                          { key: 'hasNumber', label: 'Pelo menos um número' },
                          { key: 'hasSpecialChar', label: 'Pelo menos um caractere especial (!@#$...)' },
                        ].map((req) => {
                          const isValid = passwordStrength.requirements[req.key as keyof typeof passwordStrength.requirements];
                          return (
                            <div key={req.key} className="flex items-center gap-2">
                              {isValid ? (
                                <CheckCircle2 size={16} className="text-green-300 drop-shadow-sm flex-shrink-0" />
                              ) : (
                                <AlertCircle size={16} className="text-white/50 drop-shadow-sm flex-shrink-0" />
                              )}
                              <span className={`drop-shadow-sm ${isValid ? 'text-white/90' : 'text-white/60'}`}>
                                {req.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Confirmar Senha */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha" className="text-white drop-shadow-sm">
                      Confirmar Nova Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmarSenha"
                        type={showConfirmarSenha ? 'text' : 'password'}
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        placeholder="Digite novamente sua senha"
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                      >
                        {showConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmarSenha && novaSenha !== confirmarSenha && (
                      <p className="text-red-300 drop-shadow-sm text-sm flex items-center gap-1">
                        <AlertCircle size={14} />
                        As senhas não coincidem
                      </p>
                    )}
                    {confirmarSenha && novaSenha === confirmarSenha && (
                      <p className="text-green-300 drop-shadow-sm text-sm flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        As senhas coincidem
                      </p>
                    )}
                  </div>

                  {/* Botão Redefinir */}
                  <button
                    type="submit"
                    disabled={isSubmitting || passwordStrength.score < 4 || novaSenha !== confirmarSenha}
                    className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white py-3 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-300 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-center"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Redefinindo...
                      </span>
                    ) : (
                      'Redefinir Senha'
                    )}
                  </button>
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
                    <h2 className="text-white drop-shadow-lg">
                      Senha Redefinida!
                    </h2>
                    <p className="text-white/90 drop-shadow-md leading-relaxed">
                      Sua senha foi redefinida com sucesso.
                    </p>
                  </div>

                  <div className="bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-white/80 drop-shadow-sm text-sm leading-relaxed">
                      ✅ Você já pode fazer login com sua nova senha.
                    </p>
                  </div>

                  {/* Contador de Redirect */}
                  <div className="space-y-4">
                    <div className="bg-white/10 border border-white/20 rounded-lg p-6 backdrop-blur-sm">
                      <p className="text-white/90 drop-shadow-sm mb-2">
                        Redirecionando para login em
                      </p>
                      <div className="text-white drop-shadow-lg text-4xl">
                        {countdown}
                      </div>
                      <p className="text-white/70 drop-shadow-sm text-sm mt-2">
                        segundo{countdown !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Botão Manual */}
                    <button
                      type="button"
                      onClick={() => navigate(redirectPath)}
                      className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white py-3 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-300 hover:shadow-xl active:scale-95"
                    >
                      Ir para Login Agora
                    </button>
                  </div>
                </div>
              </>
            )}
          </GlassCard>

          {/* Token Info (Debug - remover em produção) */}
          {token && !senhaRedefinida && (
            <div className="mt-4 text-center">
              <p className="text-white/50 drop-shadow-sm text-xs">
                Token: {token.substring(0, 20)}...
              </p>
            </div>
          )}
        </div>
      </div>
    </BackgroundImage>
  );
}
