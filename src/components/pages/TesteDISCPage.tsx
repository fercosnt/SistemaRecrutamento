import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

// 28 questões do teste DISC com 4 opções cada
const questoesDISC = [
  {
    id: 1,
    opcoes: [
      "Sou assertivo, decidido e direto",
      "Sou persuasivo, entusiasta e sociável",
      "Sou paciente, estável e relaxado",
      "Sou consciente, preciso e disciplinado"
    ]
  },
  {
    id: 2,
    opcoes: [
      "Gosto de desafios e resultados rápidos",
      "Gosto de interagir e motivar os outros",
      "Gosto de ambientes estáveis e harmônicos",
      "Gosto de analisar e garantir qualidade"
    ]
  },
  {
    id: 3,
    opcoes: [
      "Sou determinado e direto ao ponto",
      "Sou otimista e expressivo",
      "Sou calmo e prestativo",
      "Sou meticuloso e analítico"
    ]
  },
  {
    id: 4,
    opcoes: [
      "Prefiro estar no controle das situações",
      "Prefiro estar no centro das atenções",
      "Prefiro manter a estabilidade e apoiar a equipe",
      "Prefiro seguir processos e padrões estabelecidos"
    ]
  },
  {
    id: 5,
    opcoes: [
      "Sou orientado para resultados",
      "Sou inspirador e animado",
      "Sou paciente e colaborativo",
      "Sou sistemático e detalhista"
    ]
  },
  {
    id: 6,
    opcoes: [
      "Enfrento conflitos diretamente",
      "Uso o charme e otimismo para resolver conflitos",
      "Busco conciliação e paz no grupo",
      "Uso a lógica e análise para resolver conflitos"
    ]
  },
  {
    id: 7,
    opcoes: [
      "Tomo decisões rápidas baseadas em resultados",
      "Tomo decisões baseadas em sentimentos e reações das pessoas",
      "Tomo decisões após considerar o impacto nos outros",
      "Tomo decisões após análise detalhada dos fatos"
    ]
  },
  {
    id: 8,
    opcoes: [
      "Sob pressão, torno-me autoritário",
      "Sob pressão, torno-me emotivo",
      "Sob pressão, torno-me passivo",
      "Sob pressão, torno-me crítico"
    ]
  },
  {
    id: 9,
    opcoes: [
      "Motivo-me por desafios e poder",
      "Motivo-me pelo reconhecimento e aprovação",
      "Motivo-me pela segurança e cooperação",
      "Motivo-me pela perfeição e exatidão"
    ]
  },
  {
    id: 10,
    opcoes: [
      "Meu maior medo é ser aproveitado ou perder o controle",
      "Meu maior medo é ser rejeitado ou ignorado",
      "Meu maior medo é enfrentar mudanças repentinas ou perder estabilidade",
      "Meu maior medo é estar errado ou ser criticado"
    ]
  },
  {
    id: 11,
    opcoes: [
      "Na comunicação, sou direto e vou ao ponto",
      "Na comunicação, sou expressivo e entusiasmado",
      "Na comunicação, sou atencioso e bom ouvinte",
      "Na comunicação, sou preciso e detalhista"
    ]
  },
  {
    id: 12,
    opcoes: [
      "Em equipe, assumo a liderança naturalmente",
      "Em equipe, trago entusiasmo e ideias novas",
      "Em equipe, promovo harmonia e cooperação",
      "Em equipe, garanto qualidade e precisão"
    ]
  },
  {
    id: 13,
    opcoes: [
      "Valorizo autonomia e controle",
      "Valorizo relacionamentos e interações sociais",
      "Valorizo consistência e confiabilidade",
      "Valorizo qualidade e correção"
    ]
  },
  {
    id: 14,
    opcoes: [
      "Acho difícil lidar com a indecisão dos outros",
      "Acho difícil lidar com rejeição ou tédio",
      "Acho difícil lidar com conflitos ou pressão",
      "Acho difícil lidar com imprecisão ou desorganização"
    ]
  },
  {
    id: 15,
    opcoes: [
      "Minha abordagem para resolver problemas é agir rapidamente",
      "Minha abordagem para resolver problemas é buscar soluções criativas em grupo",
      "Minha abordagem para resolver problemas é encontrar soluções estáveis e seguras",
      "Minha abordagem para resolver problemas é analisar todas as alternativas"
    ]
  },
  {
    id: 16,
    opcoes: [
      "Sou considerado por outros como determinado e competitivo",
      "Sou considerado por outros como carismático e divertido",
      "Sou considerado por outros como confiável e prestativo",
      "Sou considerado por outros como organizado e perfeccionista"
    ]
  },
  {
    id: 17,
    opcoes: [
      "Perante regras, questiono-as ou crio minhas próprias",
      "Perante regras, adapto-as de acordo com a situação",
      "Perante regras, sigo-as para manter a ordem",
      "Perante regras, sigo-as à risca e espero o mesmo dos outros"
    ]
  },
  {
    id: 18,
    opcoes: [
      "Ao trabalhar em projetos, foco no resultado final",
      "Ao trabalhar em projetos, foco nas pessoas e na diversão",
      "Ao trabalhar em projetos, foco na cooperação e compromisso",
      "Ao trabalhar em projetos, foco nos processos e qualidade"
    ]
  },
  {
    id: 19,
    opcoes: [
      "Quando contrariado, torno-me autoritário",
      "Quando contrariado, torno-me emocional",
      "Quando contrariado, cedo para evitar confrontos",
      "Quando contrariado, torno-me distante ou crítico"
    ]
  },
  {
    id: 20,
    opcoes: [
      "Em uma nova função, gosto de ter liberdade para definir como será feito",
      "Em uma nova função, gosto de interagir com muitas pessoas",
      "Em uma nova função, gosto de instruções claras e suporte",
      "Em uma nova função, gosto de entender completamente as expectativas e padrões"
    ]
  },
  {
    id: 21,
    opcoes: [
      "Prefiro ambientes de trabalho que ofereçam desafios e autonomia",
      "Prefiro ambientes de trabalho que sejam dinâmicos e estimulantes",
      "Prefiro ambientes de trabalho que sejam harmoniosos e previsíveis",
      "Prefiro ambientes de trabalho que sejam organizados e estruturados"
    ]
  },
  {
    id: 22,
    opcoes: [
      "Ao lidar com mudanças, adapto-me rapidamente e busco oportunidades",
      "Ao lidar com mudanças, entusiasmo-me com novas possibilidades",
      "Ao lidar com mudanças, preciso de tempo para me ajustar",
      "Ao lidar com mudanças, quero entender os motivos e processos"
    ]
  },
  {
    id: 23,
    opcoes: [
      "Meu estilo de liderança é direcionador e focado em resultados",
      "Meu estilo de liderança é inspirador e motivador",
      "Meu estilo de liderança é participativo e apoiador",
      "Meu estilo de liderança é organizado e orientado por padrões"
    ]
  },
  {
    id: 24,
    opcoes: [
      "Acredito que o sucesso vem da determinação e coragem",
      "Acredito que o sucesso vem do entusiasmo e rede de contatos",
      "Acredito que o sucesso vem da lealdade e persistência",
      "Acredito que o sucesso vem da competência e conhecimento"
    ]
  },
  {
    id: 25,
    opcoes: [
      "Quando tenho uma ideia, gosto de implementá-la imediatamente",
      "Quando tenho uma ideia, gosto de compartilhá-la com entusiasmo",
      "Quando tenho uma ideia, gosto de considerá-la cuidadosamente antes de agir",
      "Quando tenho uma ideia, gosto de analisar todos os aspectos dela"
    ]
  },
  {
    id: 26,
    opcoes: [
      "Em uma discussão, defendo meu ponto de vista firmemente",
      "Em uma discussão, sou expressivo e uso gestos para comunicar",
      "Em uma discussão, escuto mais do que falo",
      "Em uma discussão, baseio meus argumentos em fatos e lógica"
    ]
  },
  {
    id: 27,
    opcoes: [
      "Quando estabeleço objetivos, foco em conquistas e resultados",
      "Quando estabeleço objetivos, busco coisas divertidas e estimulantes",
      "Quando estabeleço objetivos, prefiro metas realistas e alcançáveis",
      "Quando estabeleço objetivos, planejo detalhadamente como alcançá-los"
    ]
  },
  {
    id: 28,
    opcoes: [
      "Considero-me uma pessoa competitiva e orientada para ação",
      "Considero-me uma pessoa otimista e sociável",
      "Considero-me uma pessoa paciente e confiável",
      "Considero-me uma pessoa meticulosa e cautelosa"
    ]
  }
];

export function TesteDISCPage() {
  const candidatoNome = "Maria Silva"; // Viria do login/sessão
  const totalQuestoes = 28;
  
  const [questaoAtual, setQuestaoAtual] = useState(1);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [respostaSelecionada, setRespostaSelecionada] = useState<number | null>(null);
  const [direcao, setDirecao] = useState(1); // 1 para frente, -1 para trás

  const progresso = Math.round((questaoAtual / totalQuestoes) * 100);
  const questao = questoesDISC[questaoAtual - 1] || questoesDISC[0];

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
                    Teste de Perfil DISC
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

            {/* Instrução e Respostas com Animação */}
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
                <div className="mb-12 text-center">
                  <p className="text-white drop-shadow-md text-[24px] leading-relaxed">
                    Escolha a afirmação que mais descreve você:
                  </p>
                </div>

                {/* Opções de Resposta - 4 Botões */}
                <div className="mb-8 max-w-2xl mx-auto">
                  <div className="flex flex-col gap-3">
                    {questao.opcoes.map((opcao, indice) => (
                      <button
                        key={indice}
                        onClick={() => handleSelecionarResposta(indice)}
                        className={`
                          w-full px-8 py-5 rounded-xl backdrop-blur-md border-2 transition-all duration-200
                          text-left
                          ${respostaSelecionada === indice
                            ? 'bg-[#00109E] border-white text-white shadow-[0_0_40px_rgba(0,16,158,0.8)] scale-[1.03]'
                            : 'bg-white/10 border-white/50 text-white/90 hover:bg-white/20 hover:border-white/70 hover:scale-[1.01] active:scale-[0.99]'
                          }
                        `}
                      >
                        <span className="drop-shadow-md text-[16px] md:text-[18px]">
                          {opcao}
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
                💡 Dica: Escolha a opção que melhor representa seu comportamento natural
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </BackgroundImage>
  );
}
