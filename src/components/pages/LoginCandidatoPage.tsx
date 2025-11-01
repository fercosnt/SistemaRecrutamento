import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Eye, EyeOff, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function LoginCandidatoPage() {
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: 'email' | 'senha', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    if (!formData.senha || formData.senha.length < 6) {
      toast.error('Por favor, insira sua senha');
      return;
    }

    setIsSubmitting(true);

    // Simular autenticação
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Login realizado com sucesso!', {
        description: 'Redirecionando para o dashboard...',
      });
      
      setTimeout(() => {
        console.log('Redirecionando para dashboard do candidato...');
        // window.location.href = '/dashboard-candidato';
      }, 1500);
    }, 1500);
  };

  const handleForgotPassword = () => {
    toast.info('Recuperação de senha', {
      description: 'Em breve você receberá um email com instruções.',
    });
    console.log('Redirecionar para recuperação de senha...');
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
                <h1 className="text-white mb-3 drop-shadow-lg">
                  Entrar
                </h1>
                <p className="text-white/90 drop-shadow-md">
                  Acesse sua conta de candidato
                </p>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white drop-shadow-sm">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    required
                  />
                </div>

                {/* Senha */}
                <div className="space-y-2">
                  <Label htmlFor="senha" className="text-white drop-shadow-sm">
                    Senha *
                  </Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.senha}
                      onChange={(e) => handleInputChange('senha', e.target.value)}
                      placeholder="Digite sua senha"
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Esqueceu a senha */}
                <div className="flex justify-end">
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
                    disabled={isSubmitting}
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
