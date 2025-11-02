import React, { useState, useEffect } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Eye, EyeOff, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface RedefinirSenhaPageProps {
  onVoltarLogin?: () => void;
  token?: string;
}

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

export function RedefinirSenhaPage({ onVoltarLogin, token }: RedefinirSenhaPageProps) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senhaRedefinida, setSenhaRedefinida] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Validação de força da senha
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;

    let label = '';
    let color = '';

    if (score === 0) {
      label = '';
      color = '';
    } else if (score <= 2) {
      label = 'Fraca';
      color = 'bg-red-500';
    } else if (score <= 3) {
      label = 'Média';
      color = 'bg-yellow-500';
    } else if (score <= 4) {
      label = 'Forte';
      color = 'bg-green-500';
    } else {
      label = 'Muito Forte';
      color = 'bg-emerald-500';
    }

    return { score, label, color, requirements };
  };

  const passwordStrength = calculatePasswordStrength(novaSenha);

  // Countdown para redirect
  useEffect(() => {
    if (senhaRedefinida && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (senhaRedefinida && countdown === 0) {
      handleVoltarLogin();
    }
  }, [senhaRedefinida, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!novaSenha.trim()) {
      toast.error('Por favor, digite sua nova senha');
      return;
    }

    if (passwordStrength.score < 4) {
      toast.error('A senha não atende aos requisitos mínimos de segurança');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);

    // Simular chamada de API
    setTimeout(() => {
      setIsSubmitting(false);
      setSenhaRedefinida(true);
      toast.success('Senha redefinida com sucesso!', {
        description: 'Você será redirecionado para o login.',
      });
    }, 1500);
  };

  const handleVoltarLogin = () => {
    if (onVoltarLogin) {
      onVoltarLogin();
    } else {
      console.log('Voltando para login...');
    }
  };

  return (
    <BackgroundImage 
      background="gradient"
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
            {!senhaRedefinida ? (
              <>
                {/* Título */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Lock size={32} className="text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <h1 className="text-white mb-3 drop-shadow-lg">
                    Redefinir Senha
                  </h1>
                  <p className="text-white/90 drop-shadow-md">
                    Crie uma nova senha forte e segura
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
                        Redirecionando em
                      </p>
                      <div className="text-white drop-shadow-lg text-4xl">
                        {countdown}
                      </div>
                      <p className="text-white/70 drop-shadow-sm text-sm mt-2">
                        segundos
                      </p>
                    </div>

                    {/* Botão Manual */}
                    <button
                      type="button"
                      onClick={handleVoltarLogin}
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
