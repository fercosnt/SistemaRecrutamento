import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

// 120 questões do teste Big Five na ordem especificada
const questoesBigFive = [
  { id: 1, texto: "Raramente percebo os aspectos emocionais de pinturas e imagens" },
  { id: 2, texto: "Faço amigos facilmente" },
  { id: 3, texto: "É difícil me conhecer" },
  { id: 4, texto: "Raramente sonho acordado" },
  { id: 5, texto: "Raramente me perco em pensamentos" },
  { id: 6, texto: "Preciso de um canal para expressar minha criatividade" },
  { id: 7, texto: "Vejo beleza em coisas que outros talvez não notem" },
  { id: 8, texto: "Não gosto de poesia" },
  { id: 9, texto: "Fico profundamente imerso na música" },
  { id: 10, texto: "Adoro refletir sobre as coisas" },
  { id: 11, texto: "Acredito na importância da arte" },
  { id: 12, texto: "Aprecio contemplar a beleza da natureza" },
  { id: 13, texto: "Formulo ideias claramente" },
  { id: 14, texto: "Aprendo devagar" },
  { id: 15, texto: "Penso rapidamente" },
  { id: 16, texto: "Tenho um vocabulário rico" },
  { id: 17, texto: "Evito material de leitura difícil" },
  { id: 18, texto: "Evito discussões filosóficas" },
  { id: 19, texto: "Gosto de resolver problemas complexos" },
  { id: 20, texto: "Consigo lidar com muita informação" },
  { id: 21, texto: "Tenho dificuldade em entender ideias abstratas" },
  { id: 22, texto: "Compreendo as coisas rapidamente" },
  { id: 23, texto: "Quero que cada detalhe seja cuidado" },
  { id: 24, texto: "Certifico-me de que as regras sejam seguidas" },
  { id: 25, texto: "Não gosto de rotina" },
  { id: 26, texto: "Não me incomodo com a desordem" },
  { id: 27, texto: "Quero que tudo esteja 'no lugar certo'" },
  { id: 28, texto: "Não me incomodo com pessoas bagunceiras" },
  { id: 29, texto: "Sigo um cronograma" },
  { id: 30, texto: "Mantenho as coisas arrumadas" },
  { id: 31, texto: "Gosto de ordem" },
  { id: 32, texto: "Deixo meus pertences espalhados" },
  { id: 33, texto: "Distraio-me facilmente" },
  { id: 34, texto: "Adio decisões" },
  { id: 35, texto: "Sempre sei o que estou fazendo" },
  { id: 36, texto: "Faço as coisas rapidamente" },
  { id: 37, texto: "Não me concentro na tarefa em questão" },
  { id: 38, texto: "Termino o que começo" },
  { id: 39, texto: "Cometo erros ao realizar tarefas" },
  { id: 40, texto: "Tenho dificuldade para começar a trabalhar" },
  { id: 41, texto: "Desperdiço meu tempo" },
  { id: 42, texto: "Faço com que meus planos sejam realizados" },
  { id: 43, texto: "Só busco meu próprio benefício" },
  { id: 44, texto: "Adoro uma boa briga" },
  { id: 45, texto: "Busco conflito" },
  { id: 46, texto: "Aproveito-me dos outros" },
  { id: 47, texto: "Raramente coloco as pessoas sob pressão" },
  { id: 48, texto: "Evito impor minha vontade aos outros" },
  { id: 49, texto: "Acredito que sou melhor que os outros" },
  { id: 50, texto: "Odeio parecer insistente" },
  { id: 51, texto: "Insulto as pessoas" },
  { id: 52, texto: "Respeito a autoridade" },
  { id: 53, texto: "Gosto de fazer coisas pelos outros" },
  { id: 54, texto: "Não tenho um lado sensível" },
  { id: 55, texto: "Interesso-me pela vida de outras pessoas" },
  { id: 56, texto: "Não dedico tempo aos outros" },
  { id: 57, texto: "Sou indiferente aos sentimentos dos outros" },
  { id: 58, texto: "Simpatizo com os sentimentos dos outros" },
  { id: 59, texto: "Não me preocupo com as necessidades dos outros" },
  { id: 60, texto: "Pergunto se os outros estão se sentindo bem" },
  { id: 61, texto: "Sinto as emoções dos outros" },
  { id: 62, texto: "Não me interesso pelos problemas dos outros" },
  { id: 63, texto: "Tenho medo de muitas coisas" },
  { id: 64, texto: "Sinto-me sobrecarregado pelos eventos" },
  { id: 65, texto: "Não fico envergonhado com facilidade" },
  { id: 66, texto: "Desanimo facilmente" },
  { id: 67, texto: "Preocupo-me com as coisas" },
  { id: 68, texto: "Raramente me sinto deprimido" },
  { id: 69, texto: "Sinto-me ameaçado facilmente" },
  { id: 70, texto: "Sinto-me confortável comigo mesmo" },
  { id: 71, texto: "Sinto-me inseguro sobre muitas coisas" },
  { id: 72, texto: "Raramente me sinto triste" },
  { id: 73, texto: "Posso ser provocado facilmente" },
  { id: 74, texto: "Me exalto com facilidade" },
  { id: 75, texto: "Não me irrito facilmente" },
  { id: 76, texto: "Sou uma pessoa cujo humor oscila facilmente" },
  { id: 77, texto: "Raramente perco a calma" },
  { id: 78, texto: "Meu humor muda com frequência" },
  { id: 79, texto: "Mantenho minhas emoções sob controle" },
  { id: 80, texto: "Fico incomodado facilmente" },
  { id: 81, texto: "Raramente fico irritado" },
  { id: 82, texto: "Fico irritado com facilidade" },
  { id: 83, texto: "Não tenho uma personalidade assertiva" },
  { id: 84, texto: "Sou o primeiro a agir" },
  { id: 85, texto: "Evitar compartilhar minhas opiniões" },
  { id: 86, texto: "Consigo convencer os outros a fazer coisas" },
  { id: 87, texto: "Vejo-me como um bom líder" },
  { id: 88, texto: "Espero que outros liderem o caminho" },
  { id: 89, texto: "Sei como cativar as pessoas" },
  { id: 90, texto: "Falta-me talento para influenciar as pessoas" },
  { id: 91, texto: "Tenho uma personalidade forte" },
  { id: 92, texto: "Tomo a dianteira e assumo o comando" },
  { id: 93, texto: "Rio bastante" },
  { id: 94, texto: "Divirto-me muito" },
  { id: 95, texto: "Demonstro meus sentimentos quando estou feliz" },
  { id: 96, texto: "Não sou uma pessoa muito entusiasmada" },
  { id: 97, texto: "Raramente me deixo levar pela empolgação do momento" },
  { id: 98, texto: "Sente-se rapidamente à vontade e confortável com pessoas que acabou de conhecer" },
  { id: 99, texto: "Revelo pouco sobre mim mesmo" },
  { id: 100, texto: "Mantenho os outros à distância" },
  { id: 101, texto: "É difícil me conhecer" },
  { id: 102, texto: "Faço amigos facilmente" },
  { id: 103, texto: "Não sou uma pessoa muito entusiasmada" },
  { id: 104, texto: "Raramente me deixo levar pela empolgação do momento" },
  { id: 105, texto: "Demonstro meus sentimentos quando estou feliz" },
  { id: 106, texto: "Divirto-me muito" },
  { id: 107, texto: "Rio bastante" },
  { id: 108, texto: "Tomo a dianteira e assumo o comando" },
  { id: 109, texto: "Tenho uma personalidade forte" },
  { id: 110, texto: "Falta-me talento para influenciar as pessoas" },
  { id: 111, texto: "Sei como cativar as pessoas" },
  { id: 112, texto: "Espero que outros liderem o caminho" },
  { id: 113, texto: "Vejo-me como um bom líder" },
  { id: 114, texto: "Consigo convencer os outros a fazer coisas" },
  { id: 115, texto: "Evitar compartilhar minhas opiniões" },
  { id: 116, texto: "Sou o primeiro a agir" },
  { id: 117, texto: "Não tenho uma personalidade assertiva" },
  { id: 118, texto: "Fico irritado com facilidade" },
  { id: 119, texto: "Raramente fico irritado" },
  { id: 120, texto: "Fico incomodado facilmente" },
];

const opcoesResposta = [
  { valor: 1, label: "Discordo Totalmente" },
  { valor: 2, label: "Discordo Parcialmente" },
  { valor: 3, label: "Neutro" },
  { valor: 4, label: "Concordo Parcialmente" },
  { valor: 5, label: "Concordo Totalmente" },
];

export function TesteBigFivePage() {
  const candidatoNome = "Maria Silva"; // Viria do login/sessão
  const totalQuestoes = 120;
  
  const [questaoAtual, setQuestaoAtual] = useState(1);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [respostaSelecionada, setRespostaSelecionada] = useState<number | null>(null);
  const [direcao, setDirecao] = useState(1); // 1 para frente, -1 para trás

  const progresso = Math.round((questaoAtual / totalQuestoes) * 100);
  const questao = questoesBigFive[questaoAtual - 1] || questoesBigFive[0];

  const handleSelecionarResposta = (valor: number) => {
    setRespostaSelecionada(valor);
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
        <div className="w-full max-w-4xl mx-auto">
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
                    Teste de Personalidade Big Five
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
                {/* Pergunta */}
                <div className="mb-12 text-center">
                  <p className="text-white drop-shadow-md text-[24px] leading-relaxed">
                    "{questao.texto}"
                  </p>
                </div>

                {/* Escala de Respostas - Botões Simples */}
                <div className="mb-8 max-w-2xl mx-auto">
                  <div className="flex flex-col gap-3">
                    {opcoesResposta.map((opcao) => (
                      <button
                        key={opcao.valor}
                        onClick={() => handleSelecionarResposta(opcao.valor)}
                        className={`
                          w-full px-8 py-5 rounded-xl backdrop-blur-md border-2 transition-all duration-200
                          ${respostaSelecionada === opcao.valor
                            ? 'bg-[#00109E] border-white text-white shadow-[0_0_40px_rgba(0,16,158,0.8)] scale-[1.03]'
                            : 'bg-white/10 border-white/50 text-white/90 hover:bg-white/20 hover:border-white/70 hover:scale-[1.01] active:scale-[0.99]'
                          }
                        `}
                      >
                        <span className={`
                          drop-shadow-md text-[16px] md:text-[18px]
                          ${respostaSelecionada === opcao.valor ? '' : ''}
                        `}>
                          {opcao.label}
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
                💡 Dica: Responda de forma espontânea, pensando em como você geralmente age
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </BackgroundImage>
  );
}
