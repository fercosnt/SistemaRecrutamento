import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface EsqueciSenhaPageProps {
  onVoltarLogin?: () => void;
}

export function EsqueciSenhaPage({ onVoltarLogin }: EsqueciSenhaPageProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Por favor, digite seu email');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('Por favor, digite um email válido');
      return;
    }

    setIsSubmitting(true);

    // Simular chamada de API
    setTimeout(() => {
      setIsSubmitting(false);
      setEmailEnviado(true);
      toast.success('Email enviado com sucesso!', {
        description: 'Verifique sua caixa de entrada e spam.',
      });
    }, 1500);
  };

  const handleVoltarLogin = () => {
    if (onVoltarLogin) {
      onVoltarLogin();
    } else {
      // Fallback: redirecionar para login
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
            {!emailEnviado ? (
              <>
                {/* Título */}
                <div className="text-center mb-6">
                  <h1 className="text-white mb-3 drop-shadow-lg text-[40px] font-bold">
                    Esqueci Minha Senha
                  </h1>
                  <p className="text-white/90 drop-shadow-md">
                    Digite seu email para receber as instruções de recuperação de senha
                  </p>
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Campo Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white drop-shadow-sm">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 w-5 h-5" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Botão Enviar */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white py-3 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-300 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-center"
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
                    >
                      <ArrowLeft size={18} />
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
                    <h2 className="text-white drop-shadow-lg">
                      Email Enviado!
                    </h2>
                    <p className="text-white/90 drop-shadow-md leading-relaxed">
                      Enviamos as instruções de recuperação de senha para:
                    </p>
                    <p className="text-white drop-shadow-md">
                      {email}
                    </p>
                  </div>

                  <div className="bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-white/80 drop-shadow-sm text-sm leading-relaxed">
                      📧 Verifique sua caixa de entrada e também a pasta de spam. 
                      O email pode levar alguns minutos para chegar.
                    </p>
                  </div>

                  {/* Botão Voltar ao Login */}
                  <button
                    type="button"
                    onClick={handleVoltarLogin}
                    className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white py-3 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-300 hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={20} />
                    <span>Voltar ao Login</span>
                  </button>

                  {/* Reenviar Email */}
                  <button
                    type="button"
                    onClick={() => {
                      setEmailEnviado(false);
                      toast.info('Digite seu email novamente para reenviar');
                    }}
                    className="text-white/80 hover:text-white transition-colors duration-200 drop-shadow-sm text-sm"
                  >
                    Não recebeu? Reenviar email
                  </button>
                </div>
              </>
            )}
          </GlassCard>

          {/* Informação Adicional */}
          {!emailEnviado && (
            <div className="mt-6 text-center">
              <p className="text-white/70 drop-shadow-sm text-sm">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  className="text-white hover:text-white/90 underline transition-colors duration-200"
                  onClick={() => toast.info('Redirecionando para criar conta...')}
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
