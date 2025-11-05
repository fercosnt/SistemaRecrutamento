import React, { useState, useEffect } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { ArrowRight } from 'lucide-react';
import { Progress } from '../ui/progress';

interface Question {
  id: number;
  text: string;
}

const questions: Question[] = [
  {
    id: 1,
    text: 'O que significa para você trabalhar em uma empresa que valoriza a beleza e o bem-estar das pessoas?',
  },
  {
    id: 2,
    text: 'Como você demonstra empatia e cuidado no atendimento ao cliente?',
  },
  {
    id: 3,
    text: 'Como você lida com feedback negativo ou críticas construtivas?',
  },
  {
    id: 4,
    text: 'Descreva uma situação onde você trabalhou em equipe para alcançar um objetivo comum.',
  },
  {
    id: 5,
    text: 'O que você faz para se manter atualizado(a) sobre tendências e inovações em sua área?',
  },
  {
    id: 6,
    text: 'Como você equilibra a busca por excelência com a necessidade de cumprir prazos?',
  },
  {
    id: 7,
    text: 'Por que você deseja fazer parte da equipe Beauty Smile?',
  },
];

export function QuestionarioCulturaPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const candidateName = 'Maria Silva'; // Em produção, vem do contexto/autenticação

  // Carregar resposta salva ao mudar de questão
  useEffect(() => {
    const savedAnswer = answers[questions[currentQuestion].id] || '';
    setCurrentAnswer(savedAnswer);
  }, [currentQuestion, answers]);

  const handleNext = () => {
    // Salvar resposta atual
    setAnswers((prev) => ({
      ...prev,
      [questions[currentQuestion].id]: currentAnswer,
    }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      // Finalizar questionário e ir para página de conclusão
      console.log('Questionário finalizado:', answers);
      window.location.href = '#conclusao-testes';
      // Em produção, enviar para API e usar router apropriado
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const charCount = currentAnswer.length;
  const paragraphCount = currentAnswer
    .split('\n\n')
    .filter((p) => p.trim().length > 0).length;

  return (
    <BackgroundImage background="darkBlue" className="min-h-screen">
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-md bg-white/5">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BeautySmileLogo type="horizontal" size="sm" variant="white" />
              <div className="h-8 w-px bg-white/20 hidden md:block" />
              <span className="text-white drop-shadow-md hidden md:inline">
                Olá, {candidateName}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-3xl">
            <GlassCard className="p-8 md:p-12 bg-white/15 border-white/20">
              {/* Progress Info */}
              <div className="mb-8">
                <p className="text-white/60 drop-shadow-sm mb-3 text-center">
                  PERGUNTA {currentQuestion + 1} DE {questions.length}
                </p>
                <div className="relative">
                  <Progress 
                    value={progress} 
                    className="h-2 bg-white/10"
                  />
                  <span className="absolute -right-2 -top-8 text-white/80 drop-shadow-sm">
                    {progress.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Question */}
              <h2 className="text-white drop-shadow-lg mb-8 text-center">
                {questions[currentQuestion].text}
              </h2>

              {/* Answer Textarea */}
              <div className="mb-6">
                <textarea
                  value={currentAnswer}
                  onChange={(e) => {
                    if (e.target.value.length <= 250) {
                      setCurrentAnswer(e.target.value);
                    }
                  }}
                  placeholder="Digite sua resposta aqui..."
                  className="w-full min-h-[240px] px-6 py-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 backdrop-blur-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#35BFAD]/50 focus:border-[#35BFAD]/50 transition-all duration-200 drop-shadow-sm"
                  style={{ fontSize: '16px', lineHeight: '1.6' }}
                />
              </div>

              {/* Character Count */}
              <div className="flex items-center justify-between mb-8 text-white/60 drop-shadow-sm">
                <span>
                  {paragraphCount} parágrafo{paragraphCount !== 1 ? 's' : ''} (máx. 5)
                </span>
                <span>
                  {charCount} / 250 caracteres
                </span>
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  disabled={currentAnswer.trim().length === 0}
                  className="group px-10 py-4 rounded-lg border-2 backdrop-blur-md transition-all duration-300 bg-[#00109E] hover:bg-[#00109E]/90 text-white border-white/50 shadow-2xl hover:shadow-[0_0_30px_rgba(0,16,158,0.5)] hover:border-white/70 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#00109E] disabled:hover:shadow-2xl disabled:active:scale-100 flex items-center gap-3"
                >
                  <span className="drop-shadow-md" style={{ fontSize: '16px' }}>
                    {currentQuestion < questions.length - 1
                      ? 'Próxima'
                      : 'Finalizar'}
                  </span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>

              {/* Navigation Helper */}
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentQuestion
                        ? 'bg-[#35BFAD] scale-125'
                        : answers[questions[index].id]
                        ? 'bg-white/60 hover:bg-white/80'
                        : 'bg-white/20 hover:bg-white/40'
                    }`}
                    aria-label={`Ir para pergunta ${index + 1}`}
                  />
                ))}
              </div>
            </GlassCard>

            {/* Helper Text */}
            <p className="text-center text-white/60 drop-shadow-sm mt-6">
              💡 Dica: Seja específico(a) e use exemplos concretos da sua experiência
            </p>
          </div>
        </main>
      </div>
    </BackgroundImage>
  );
}
