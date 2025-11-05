import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Upload, FileText, CheckCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface FormData {
  // Bloco 1
  experiencia: string;
  habilidades: string[];
  motivacao: string;
  
  // Bloco 2
  ferramentas: string;
  inovacao: string[];
  aprendizado: string;
  
  // Bloco 3
  valores: string;
  situacao: string[];
  essencia: string;
  
  // Upload
  curriculo: File | null;
}

export function FormularioCandidaturaPage() {
  const candidatoNome = "Maria Silva"; // Viria do login/sessão
  
  const [formData, setFormData] = useState<FormData>({
    experiencia: '',
    habilidades: [],
    motivacao: '',
    ferramentas: '',
    inovacao: [],
    aprendizado: '',
    valores: '',
    situacao: [],
    essencia: '',
    curriculo: null,
  });

  const [isDragging, setIsDragging] = useState(false);

  // Handlers para múltipla escolha
  const handleMultipleChoice = (field: keyof FormData, value: string) => {
    const currentValues = formData[field] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    setFormData({ ...formData, [field]: newValues });
  };

  // Handler para escolha única (radio)
  const handleSingleChoice = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  // Handler para texto
  const handleTextChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  // Handler para upload
  const handleFileUpload = (file: File) => {
    // Validar tipo de arquivo
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido', {
        description: 'Por favor, envie apenas arquivos PDF ou Word.',
      });
      return;
    }

    // Validar tamanho (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB em bytes
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande', {
        description: 'O arquivo deve ter no máximo 5MB.',
      });
      return;
    }

    setFormData({ ...formData, curriculo: file });
    toast.success('Currículo carregado!', {
      description: file.name,
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.curriculo) {
      toast.error('Currículo obrigatório', {
        description: 'Por favor, faça o upload do seu currículo.',
      });
      return;
    }

    toast.success('Formulário enviado!', {
      description: 'Agradecemos sua candidatura.',
    });
    
    console.log('Dados do formulário:', formData);
  };

  return (
    <BackgroundImage 
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
      className="min-h-screen"
    >
      <div className="min-h-screen py-12 px-4">
        <div className="w-full max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <BeautySmileLogo type="vertical" variant="white" size="lg" className="drop-shadow-lg" />
          </div>

          {/* Nome do Candidato */}
          <GlassCard variant="white" blur="lg" className="p-6 mb-8 text-center">
            <p className="text-white/80 drop-shadow-sm mb-2">Bem-vindo(a),</p>
            <h1 className="text-white drop-shadow-lg text-[32px]">{candidatoNome}</h1>
          </GlassCard>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* BLOCO 1: Sua Jornada Profissional */}
            <GlassCard variant="white" blur="lg" className="p-8">
              <h2 className="text-white drop-shadow-md mb-6 text-[24px]">
                Bloco 1: Sua Jornada Profissional
              </h2>

              {/* Pergunta 1: Escolha única (Radio) */}
              <div className="mb-8">
                <label className="block text-white drop-shadow-sm mb-2">
                  Qual seu nível de experiência profissional? *
                </label>
                <p className="text-white/70 drop-shadow-sm mb-4 text-sm">
                  Considere sua experiência geral no mercado de trabalho
                </p>
                <div className="space-y-3">
                  {[
                    { value: 'iniciante', label: 'Iniciante (0-2 anos)' },
                    { value: 'intermediario', label: 'Intermediário (3-5 anos)' },
                    { value: 'avancado', label: 'Avançado (6-10 anos)' },
                    { value: 'senior', label: 'Sênior (10+ anos)' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-all duration-300 border border-white/20"
                    >
                      <input
                        type="radio"
                        name="experiencia"
                        value={option.value}
                        checked={formData.experiencia === option.value}
                        onChange={(e) => handleSingleChoice('experiencia', e.target.value)}
                        className="w-5 h-5 accent-[#35BFAD]"
                      />
                      <span className="text-white drop-shadow-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pergunta 2: Múltipla escolha (Checkbox) */}
              <div className="mb-8">
                <label className="block text-white drop-shadow-sm mb-2">
                  Quais habilidades você mais desenvolveu? *
                </label>
                <p className="text-white/70 drop-shadow-sm mb-4 text-sm">
                  Selecione todas que se aplicam
                </p>
                <div className="space-y-3">
                  {[
                    { value: 'comunicacao', label: 'Comunicação eficaz' },
                    { value: 'lideranca', label: 'Liderança de equipes' },
                    { value: 'resolucao', label: 'Resolução de problemas' },
                    { value: 'adaptabilidade', label: 'Adaptabilidade' },
                    { value: 'criatividade', label: 'Criatividade e inovação' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-all duration-300 border border-white/20"
                    >
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={formData.habilidades.includes(option.value)}
                        onChange={() => handleMultipleChoice('habilidades', option.value)}
                        className="w-5 h-5 accent-[#35BFAD] rounded"
                      />
                      <span className="text-white drop-shadow-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pergunta 3: Caixa de texto */}
              <div>
                <label className="block text-white drop-shadow-sm mb-2">
                  O que te motiva a fazer parte da Beauty Smile? *
                </label>
                <p className="text-white/70 drop-shadow-sm mb-4 text-sm">
                  Compartilhe sua motivação de forma autêntica
                </p>
                <textarea
                  value={formData.motivacao}
                  onChange={(e) => handleTextChange('motivacao', e.target.value)}
                  rows={5}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-300"
                  placeholder="Digite sua resposta aqui..."
                />
              </div>
            </GlassCard>

            {/* BLOCO 2: Tecnologia e Inovação */}
            <GlassCard variant="white" blur="lg" className="p-8">
              <h2 className="text-white drop-shadow-md mb-6">
                Bloco 2: Tecnologia e Inovação
              </h2>

              {/* Pergunta 1: Escolha única (Radio) */}
              <div className="mb-8">
                <label className="block text-white drop-shadow-sm mb-2">
                  Como você classificaria sua familiaridade com ferramentas digitais? *
                </label>
                <p className="text-white/70 drop-shadow-sm mb-4 text-sm">
                  Seja honesto sobre seu nível atual
                </p>
                <div className="space-y-3">
                  {[
                    { value: 'basico', label: 'Básico - Uso ferramentas essenciais do dia a dia' },
                    { value: 'intermediario', label: 'Intermediário - Confortável com diversas plataformas' },
                    { value: 'avancado', label: 'Avançado - Aprendo novas ferramentas rapidamente' },
                    { value: 'expert', label: 'Expert - Ensino e implemento soluções tecnológicas' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-all duration-300 border border-white/20"
                    >
                      <input
                        type="radio"
                        name="ferramentas"
                        value={option.value}
                        checked={formData.ferramentas === option.value}
                        onChange={(e) => handleSingleChoice('ferramentas', e.target.value)}
                        className="w-5 h-5 accent-[#35BFAD]"
                      />
                      <span className="text-white drop-shadow-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pergunta 2: Múltipla escolha (Checkbox) */}
              <div className="mb-8">
                <label className="block text-white drop-shadow-sm mb-2">
                  Quais áreas de inovação mais te interessam? *
                </label>
                <p className="text-white/70 drop-shadow-sm mb-4 text-sm">
                  Selecione até 3 opções
                </p>
                <div className="space-y-3">
                  {[
                    { value: 'ia', label: 'Inteligência Artificial' },
                    { value: 'automacao', label: 'Automação de processos' },
                    { value: 'experiencia', label: 'Experiência do cliente digital' },
                    { value: 'dados', label: 'Análise de dados' },
                    { value: 'sustentabilidade', label: 'Tecnologia sustentável' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-all duration-300 border border-white/20"
                    >
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={formData.inovacao.includes(option.value)}
                        onChange={() => handleMultipleChoice('inovacao', option.value)}
                        className="w-5 h-5 accent-[#35BFAD] rounded"
                      />
                      <span className="text-white drop-shadow-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pergunta 3: Caixa de texto */}
              <div>
                <label className="block text-white drop-shadow-sm mb-2">
                  Conte sobre uma vez que você aprendeu algo novo e aplicou rapidamente *
                </label>
                <p className="text-white/70 drop-shadow-sm mb-4 text-sm">
                  Pode ser tecnologia, processo ou qualquer habilidade
                </p>
                <textarea
                  value={formData.aprendizado}
                  onChange={(e) => handleTextChange('aprendizado', e.target.value)}
                  rows={5}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-300"
                  placeholder="Digite sua resposta aqui..."
                />
              </div>
            </GlassCard>

            {/* BLOCO 3: Nossos Valores, Sua Essência */}
            <GlassCard variant="white" blur="lg" className="p-8">
              <h2 className="text-white drop-shadow-md mb-6">
                Bloco 3: Nossos Valores, Sua Essência
              </h2>

              {/* Pergunta 1: Escolha única (Radio) */}
              <div className="mb-8">
                <label className="block text-white drop-shadow-sm mb-2">
                  Qual valor mais ressoa com você? *
                </label>
                <p className="text-white/70 drop-shadow-sm mb-4 text-sm">
                  Escolha aquele que mais se conecta com sua essência
                </p>
                <div className="space-y-3">
                  {[
                    { value: 'excelencia', label: 'Excelência - Fazer sempre o melhor possível' },
                    { value: 'empatia', label: 'Empatia - Colocar-se no lugar do outro' },
                    { value: 'inovacao', label: 'Inovação - Buscar constantemente novas soluções' },
                    { value: 'integridade', label: 'Integridade - Agir com ética e transparência' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-all duration-300 border border-white/20"
                    >
                      <input
                        type="radio"
                        name="valores"
                        value={option.value}
                        checked={formData.valores === option.value}
                        onChange={(e) => handleSingleChoice('valores', e.target.value)}
                        className="w-5 h-5 accent-[#35BFAD]"
                      />
                      <span className="text-white drop-shadow-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pergunta 2: Múltipla escolha (Checkbox) */}
              <div className="mb-8">
                <label className="block text-white drop-shadow-sm mb-2">
                  Como você reagiria nestas situações? *
                </label>
                <p className="text-white/70 drop-shadow-sm mb-4 text-sm">
                  Selecione as ações que você tomaria
                </p>
                <div className="space-y-3">
                  {[
                    { value: 'ouvir', label: 'Cliente insatisfeito: Ouvir atentamente e entender a frustração' },
                    { value: 'colaborar', label: 'Conflito na equipe: Mediar e buscar solução colaborativa' },
                    { value: 'assumir', label: 'Erro no processo: Assumir e propor correção imediata' },
                    { value: 'sugerir', label: 'Melhoria possível: Sugerir implementação mesmo que trabalhosa' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-all duration-300 border border-white/20"
                    >
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={formData.situacao.includes(option.value)}
                        onChange={() => handleMultipleChoice('situacao', option.value)}
                        className="w-5 h-5 accent-[#35BFAD] rounded"
                      />
                      <span className="text-white drop-shadow-sm text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pergunta 3: Caixa de texto */}
              <div>
                <label className="block text-white drop-shadow-sm mb-2">
                  Em uma frase, como você definiria sua essência profissional? *
                </label>
                <p className="text-white/70 drop-shadow-sm mb-4 text-sm">
                  Seja autêntico e direto
                </p>
                <textarea
                  value={formData.essencia}
                  onChange={(e) => handleTextChange('essencia', e.target.value)}
                  rows={3}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-300"
                  placeholder="Digite sua resposta aqui..."
                />
              </div>
            </GlassCard>

            {/* UPLOAD DE CURRÍCULO */}
            <GlassCard variant="white" blur="lg" className="p-8">
              <h2 className="text-white drop-shadow-md mb-6">
                Upload do Currículo
              </h2>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300
                  ${isDragging 
                    ? 'border-white bg-white/20' 
                    : 'border-white/40 bg-white/5 hover:bg-white/10'
                  }
                `}
              >
                {formData.curriculo ? (
                  <div className="space-y-4">
                    <CheckCircle className="w-16 h-16 text-white mx-auto drop-shadow-lg" />
                    <div>
                      <p className="text-white drop-shadow-md mb-2">
                        Arquivo carregado com sucesso!
                      </p>
                      <p className="text-white/80 drop-shadow-sm text-sm">
                        {formData.curriculo.name}
                      </p>
                      <p className="text-white/60 drop-shadow-sm text-xs mt-1">
                        {(formData.curriculo.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, curriculo: null })}
                      className="text-white/80 hover:text-white underline text-sm transition-colors duration-200"
                    >
                      Remover arquivo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-16 h-16 text-white/80 mx-auto drop-shadow-md" />
                    <div>
                      <p className="text-white drop-shadow-md mb-2">
                        Arraste seu currículo aqui
                      </p>
                      <p className="text-white/70 drop-shadow-sm text-sm mb-4">
                        ou clique para selecionar
                      </p>
                      <input
                        type="file"
                        id="curriculo-input"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="curriculo-input"
                        className="inline-block bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg cursor-pointer transition-all duration-300 border border-white/40"
                      >
                        Selecionar arquivo
                      </label>
                    </div>
                    <p className="text-white/60 drop-shadow-sm text-xs">
                      PDF ou Word • Máximo 5MB
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* BOTÃO DE ENVIAR */}
            <div className="flex justify-center pt-4">
              <button
                type="submit"
                className="bg-[#00109E] hover:bg-[#00109E]/90 text-white px-16 py-5 rounded-lg border-2 border-white/50 backdrop-blur-md transition-all duration-300 shadow-2xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:border-white/70 active:scale-95"
              >
                Enviar Candidatura
              </button>
            </div>
          </form>
        </div>
      </div>
    </BackgroundImage>
  );
}
