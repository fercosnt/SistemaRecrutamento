import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface FormData {
  nomeCompleto: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  linkedin: string;
  instagram: string;
  cep: string;
  senha: string;
  confirmarSenha: string;
}

export function InscricaoPage() {
  const [formData, setFormData] = useState<FormData>({
    nomeCompleto: '',
    email: '',
    telefone: '',
    cidade: '',
    estado: '',
    linkedin: '',
    instagram: '',
    cep: '',
    senha: '',
    confirmarSenha: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    // Validar campos obrigatórios
    if (!formData.nomeCompleto.trim()) {
      toast.error('Por favor, preencha o nome completo');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Por favor, preencha um email válido');
      return false;
    }
    if (!formData.telefone.trim()) {
      toast.error('Por favor, preencha o telefone');
      return false;
    }
    if (!formData.cidade.trim()) {
      toast.error('Por favor, preencha a cidade');
      return false;
    }
    if (!formData.estado) {
      toast.error('Por favor, selecione o estado');
      return false;
    }
    if (!formData.cep.trim()) {
      toast.error('Por favor, preencha o CEP');
      return false;
    }
    if (!formData.senha || formData.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    if (formData.senha !== formData.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simular chamada de API
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Cadastro realizado com sucesso! Redirecionando...', {
        description: 'Você será redirecionado para o formulário de candidatura.',
      });
      
      // Aqui seria o redirecionamento real
      setTimeout(() => {
        console.log('Redirecionando para formulário de candidatura...');
        // window.location.href = '/formulario-candidatura';
      }, 2000);
    }, 1500);
  };

  const passwordsMatch = formData.senha && formData.confirmarSenha && formData.senha === formData.confirmarSenha;
  const passwordsDontMatch = formData.senha && formData.confirmarSenha && formData.senha !== formData.confirmarSenha;

  const estadosBrasileiros = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  return (
    <BackgroundImage 
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
      className="min-h-screen"
    >
      <div className="min-h-screen py-12 px-4">
        {/* Header com Logo */}
        <div className="w-full max-w-6xl mx-auto mb-8">
          <div className="flex justify-center">
            <BeautySmileLogo type="vertical" variant="white" size="lg" className="drop-shadow-lg" />
          </div>
        </div>

        {/* Formulário de Inscrição */}
        <div className="w-full max-w-6xl mx-auto">
          <GlassCard 
            variant="white" 
            blur="lg"
            className="p-8 md:p-12"
          >
            {/* Título */}
            <div className="text-center mb-8">
              <h1 className="text-white mb-3 drop-shadow-lg">
                Criar Conta
              </h1>
              <p className="text-white/90 drop-shadow-md">
                Preencha seus dados para se candidatar às vagas da Beauty Smile
              </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome Completo */}
              <div className="space-y-2">
                <Label htmlFor="nomeCompleto" className="text-white drop-shadow-sm">
                  Nome Completo *
                </Label>
                <Input
                  id="nomeCompleto"
                  type="text"
                  value={formData.nomeCompleto}
                  onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  required
                />
              </div>

              {/* Email e Telefone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-white drop-shadow-sm">
                    Telefone *
                  </Label>
                  <Input
                    id="telefone"
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    required
                  />
                </div>
              </div>

              {/* Cidade, Estado e CEP */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cidade" className="text-white drop-shadow-sm">
                    Cidade *
                  </Label>
                  <Input
                    id="cidade"
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => handleInputChange('cidade', e.target.value)}
                    placeholder="Sua cidade"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-white drop-shadow-sm">
                    Estado *
                  </Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => handleInputChange('estado', value)}
                    required
                  >
                    <SelectTrigger 
                      id="estado"
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    >
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosBrasileiros.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep" className="text-white drop-shadow-sm">
                    CEP *
                  </Label>
                  <Input
                    id="cep"
                    type="text"
                    value={formData.cep}
                    onChange={(e) => handleInputChange('cep', e.target.value)}
                    placeholder="00000-000"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    maxLength={9}
                    required
                  />
                </div>
              </div>

              {/* LinkedIn e Instagram */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="text-white drop-shadow-sm">
                    LinkedIn (opcional)
                  </Label>
                  <Input
                    id="linkedin"
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => handleInputChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/seu-perfil"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram" className="text-white drop-shadow-sm">
                    Instagram (opcional)
                  </Label>
                  <Input
                    id="instagram"
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => handleInputChange('instagram', e.target.value)}
                    placeholder="@seu_usuario"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  />
                </div>
              </div>

              {/* Senha e Confirmar Senha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      placeholder="Mínimo 6 caracteres"
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
                      required
                      minLength={6}
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

                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha" className="text-white drop-shadow-sm">
                    Confirmar Senha *
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmarSenha"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmarSenha}
                      onChange={(e) => handleInputChange('confirmarSenha', e.target.value)}
                      placeholder="Digite a senha novamente"
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Indicador de senha */}
                  {formData.confirmarSenha && (
                    <div className="flex items-center gap-2 mt-2">
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 drop-shadow-sm">
                            As senhas coincidem
                          </span>
                        </>
                      ) : passwordsDontMatch ? (
                        <>
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 drop-shadow-sm">
                            As senhas não coincidem
                          </span>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Submissão */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white py-3 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-300 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-center"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Criando conta...
                    </span>
                  ) : (
                    'Criar Conta e Continuar'
                  )}
                </button>
              </div>

              {/* Link para Login */}
              <div className="text-center pt-4">
                <p className="text-white/80 drop-shadow-sm">
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    className="text-white hover:text-white/90 underline transition-colors duration-200"
                    onClick={() => toast.info('Redirecionando para login...')}
                  >
                    Fazer login
                  </button>
                </p>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </BackgroundImage>
  );
}
