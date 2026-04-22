import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';
import { ImageWithFallback } from '../figma/ImageWithFallback';

// Estrutura de uma questão Raven
interface QuestaoRaven {
  serie: string; // A, B, C, D, E
  numero: number; // 1 a 12
  imagemCompleta: string; // Caminho da imagem (ex: A1.webp)
  numeroOpcoes: 6 | 8; // Séries A e B têm 6 opções, C, D, E têm 8
}

// Gerar todas as 60 questões do teste Raven
const gerarQuestoesRaven = (): QuestaoRaven[] => {
  const questoes: QuestaoRaven[] = [];
  const series = ['A', 'B', 'C', 'D', 'E'];
  
  series.forEach((serie) => {
    for (let numero = 1; numero <= 12; numero++) {
      questoes.push({
        serie,
        numero,
        imagemCompleta: `/assets/images/raven/${serie}${numero}.webp`,
        numeroOpcoes: (serie === 'A' || serie === 'B') ? 6 : 8
      });
    }
  });
  
  return questoes;
};

const questoesRaven = gerarQuestoesRaven();

export function TesteRavenPage() {
  const candidatoNome = "Maria Silva"; // Viria do login/sessão
  const totalQuestoes = 60; // Teste Raven tem 60 questões
  
  const [questaoAtual, setQuestaoAtual] = useState(1);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [respostaSelecionada, setRespostaSelecionada] = useState<number | null>(null);
  const [direcao, setDirecao] = useState(1); // 1 para frente, -1 para trás

  const progresso = Math.round((questaoAtual / totalQuestoes) * 100);
  const questao = questoesRaven[questaoAtual - 1] || questoesRaven[0];
  const numeroOpcoes = questao?.numeroOpcoes || 6;

  const handleSelecionarResposta = (indice: number) => {
    setRespostaSelecionada(indice);
  };

  const handleProxima = () => {
    if (respostaSelecionada === null) {
      toast.error('Resposta necessária', {
        description: 'Por favor, selecione uma opção antes de continuar.',
      });
      return;
    }

    // Salvar resposta
    setRespostas(prev => ({
      ...prev,
      [questaoAtual]: respostaSelecionada
    }));

    // Verificar se é a última questão
    if (questaoAtual >= totalQuestoes) {
      toast.success('Teste concluído!', {
        description: 'Redirecionando para a página de conclusão...',
      });
      console.log('Respostas completas:', { ...respostas, [questaoAtual]: respostaSelecionada });
      
      // Redirecionar para página de conclusão após 1.5 segundos
      setTimeout(() => {
        window.location.href = '#conclusao-testes';
        // Em produção, use o router apropriado
      }, 1500);
      return;
    }

    // Ir para próxima questão
    setDirecao(1);
    setQuestaoAtual(prev => prev + 1);
    setRespostaSelecionada(null);
  };

  const handleAnterior = () => {
    if (questaoAtual > 1) {
      setDirecao(-1);
      setQuestaoAtual(prev => prev - 1);
      setRespostaSelecionada(respostas[questaoAtual - 1] || null);
    }
  };

  return (
    <BackgroundImage 
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
      className="min-h-screen"
    >
      <div className="min-h-screen py-8 px-4">
        <div className="w-full max-w-5xl mx-auto">
          {/* Header com Logo e Nome */}
          <GlassCard variant="white" blur="lg" className="p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BeautySmileLogo type="icon" variant="white" size="md" className="drop-shadow-lg" />
                <div>
                  <p className="text-white drop-shadow-md text-[20px]">
                    {candidatoNome}
                  </p>
                  <p className="text-white/70 drop-shadow-sm text-[14px]">
                    Teste de Raciocínio Lógico - Matrizes Progressivas de Raven
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Card Principal do Teste */}
          <GlassCard variant="white" blur="lg" className="p-8 md:p-12 overflow-hidden">
            {/* Número da Questão */}
            <div className="text-center mb-6">
              <p className="text-white drop-shadow-md text-[18px]">
                QUESTÃO {questaoAtual} DE {totalQuestoes}
              </p>
            </div>

            {/* Barra de Progresso */}
            <div className="mb-10">
              <Progress 
                value={progresso} 
                className="h-3 bg-white/20"
              />
              <p className="text-white/70 drop-shadow-sm text-center mt-2 text-[14px]">
                {progresso}% concluído
              </p>
            </div>

            {/* Pergunta e Respostas com Animação */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={questaoAtual}
                initial={{ 
                  opacity: 0, 
                  x: direcao * 50,
                }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                }}
                exit={{ 
                  opacity: 0, 
                  x: direcao * -50,
                }}
                transition={{ 
                  duration: 0.3,
                  ease: "easeInOut"
                }}
              >
                {/* Instrução */}
                <div className="mb-8 text-center">
                  <p className="text-white drop-shadow-md text-[20px] md:text-[24px] leading-relaxed">
                    Escolha a opção que completa o padrão
                  </p>
                  <p className="text-white/70 drop-shadow-sm mt-2 text-[16px]">
                    Série {questao.serie} - Questão {questao.numero}
                  </p>
                </div>

                {/* Imagem Completa (Pergunta + Opções) */}
                <div className="mb-10 flex justify-center">
                  <div className="w-full max-w-4xl bg-white/10 backdrop-blur-sm rounded-xl p-6 border-2 border-white/30">
                    <div className="relative">
                      <ImageWithFallback
                        src={questao.imagemCompleta}
                        alt={`Questão ${questao.serie}${questao.numero}`}
                        className="w-full h-auto rounded-lg"
                      />
                      {/* Overlay de instrução se imagem não carregada */}
                      <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-lg backdrop-blur-sm border border-white/20">
                        <div className="text-center p-8">
                          <div className="text-[48px] mb-4">🧩</div>
                          <p className="text-white drop-shadow-md text-[18px] mb-2">
                            Imagem: {questao.serie}{questao.numero}.webp
                          </p>
                          <p className="text-white/70 drop-shadow-sm text-[14px] max-w-md">
                            Copie as imagens do teste Raven para:<br />
                            <code className="bg-black/30 px-2 py-1 rounded text-[#35BFAD]">
                              /assets/images/raven/
                            </code>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões de Resposta Numerados */}
                <div className="mb-8 max-w-3xl mx-auto">
                  <p className="text-white/80 drop-shadow-sm text-center mb-6 text-[16px]">
                    Selecione a alternativa correta:
                  </p>
                  
                  <div className={`
                    grid gap-3
                    ${numeroOpcoes === 6 
                      ? 'grid-cols-3 md:grid-cols-6' 
                      : 'grid-cols-4 md:grid-cols-8'
                    }
                  `}>
                    {Array.from({ length: numeroOpcoes }).map((_, indice) => (
                      <button
                        key={indice}
                        onClick={() => handleSelecionarResposta(indice)}
                        className={`
                          aspect-square rounded-xl backdrop-blur-md border-3 transition-all duration-200
                          flex items-center justify-center
                          ${respostaSelecionada === indice
                            ? 'bg-[#00109E] border-white shadow-[0_0_40px_rgba(0,16,158,0.8)] scale-[1.1]'
                            : 'bg-white/10 border-white/50 hover:bg-white/20 hover:border-white/70 hover:scale-[1.05] active:scale-[0.95]'
                          }
                        `}
                      >
                        <span className={`
                          drop-shadow-lg text-[24px] md:text-[28px] transition-all duration-200
                          ${respostaSelecionada === indice
                            ? 'text-white'
                            : 'text-white/90'
                          }
                        `}>
                          {indice + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Botões de Navegação */}
            <div className="flex justify-between items-center mt-12 gap-4">
              <button
                onClick={handleAnterior}
                disabled={questaoAtual === 1}
                className={`
                  px-8 py-3 rounded-lg border-2 backdrop-blur-md transition-all duration-300
                  ${questaoAtual === 1
                    ? 'bg-white/10 text-white/40 border-white/20 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/50 hover:border-white/70 active:scale-95 cursor-pointer'
                  }
                `}
              >
                ← Anterior
              </button>

              <button
                onClick={handleProxima}
                className={`
                  px-12 py-4 rounded-lg border-2 backdrop-blur-md transition-all duration-300
                  ${respostaSelecionada !== null
                    ? 'bg-[#00109E] hover:bg-[#00109E]/90 text-white border-white/50 shadow-2xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:border-white/70 active:scale-95 cursor-pointer'
                    : 'bg-white/10 text-white/40 border-white/20 cursor-not-allowed'
                  }
                `}
              >
                {questaoAtual >= totalQuestoes ? 'Finalizar' : 'Próxima →'}
              </button>
            </div>
          </GlassCard>

          {/* Info Card */}
          <GlassCard variant="white" blur="lg" className="p-4 mt-6">
            <div className="flex items-center justify-center gap-2">
              <p className="text-white/70 drop-shadow-sm text-[14px] text-center">
                💡 Dica: Observe os padrões e escolha a opção que melhor completa a sequência
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </BackgroundImage>
  );
}
