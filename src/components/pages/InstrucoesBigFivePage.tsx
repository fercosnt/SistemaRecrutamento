import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { toast } from 'sonner@2.0.3';

export function InstrucoesBigFivePage() {
  const candidatoNome = "Maria Silva"; // Viria do login/sessão
  const [aceitouInstrucoes, setAceitouInstrucoes] = useState(false);

  const handleIniciarTeste = () => {
    if (!aceitouInstrucoes) {
      toast.error('Confirmação necessária', {
        description: 'Por favor, confirme que leu e compreendeu as instruções.',
      });
      return;
    }

    toast.success('Iniciando teste Big Five...', {
      description: 'Boa sorte!',
    });
    console.log('Redirecionar para teste Big Five...');
    // window.location.href = '/teste-bigfive';
  };

  return (
    <BackgroundImage 
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
      className="min-h-screen"
    >
      <div className="min-h-screen py-12 px-4">
        <div className="w-full max-w-5xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <BeautySmileLogo type="vertical" variant="white" size="lg" className="drop-shadow-lg" />
          </div>

          {/* Título Principal */}
          <h1 className="text-white drop-shadow-lg mb-8 text-[36px] text-center">
            🎯 Avaliação de Personalidade - Big Five
          </h1>

          {/* O que é este teste? */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-4 text-[24px] font-bold">
              O que é este teste?
            </h2>
            <p className="text-white/90 drop-shadow-sm">
              Este questionário avalia cinco dimensões fundamentais da personalidade humana, baseado no modelo científico dos "Cinco Grandes Fatores". Essas dimensões são universalmente reconhecidas pela psicologia e ajudam a compreender como você naturalmente se comporta, pensa e interage com o mundo.
            </p>
          </GlassCard>

          {/* As 5 Dimensões Avaliadas */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-6 text-[24px] font-bold">
              As 5 Dimensões Avaliadas:
            </h2>

            <div className="space-y-6">
              {/* Abertura à Experiência */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-white drop-shadow-md mb-3 text-[20px]">
                  🎨 Abertura à Experiência
                </h3>
                <p className="text-white/90 drop-shadow-sm">
                  Sua curiosidade, criatividade e interesse por novas ideias e experiências. Pessoas com alta abertura são imaginativas e apreciam arte, emoções e aventura.
                </p>
              </div>

              {/* Conscienciosidade */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-white drop-shadow-md mb-3 text-[20px]">
                  📋 Conscienciosidade
                </h3>
                <p className="text-white/90 drop-shadow-sm">
                  Seu nível de organização, responsabilidade e disciplina na realização de tarefas. Pessoas conscienciosas são planejadoras, detalhistas e orientadas a objetivos.
                </p>
              </div>

              {/* Extroversão */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-white drop-shadow-md mb-3 text-[20px]">
                  🤝 Extroversão
                </h3>
                <p className="text-white/90 drop-shadow-sm">
                  Sua energia social, entusiasmo e preferência por interação com outras pessoas. Pessoas extrovertidas são assertivas, sociáveis e buscam estimulação externa.
                </p>
              </div>

              {/* Amabilidade */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-white drop-shadow-md mb-3 text-[20px]">
                  ❤️ Amabilidade
                </h3>
                <p className="text-white/90 drop-shadow-sm">
                  Sua tendência à cooperação, empatia e consideração pelos sentimentos dos outros. Pessoas amáveis são altruístas, confiantes e prestativas.
                </p>
              </div>

              {/* Neuroticismo */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-white drop-shadow-md mb-3 text-[20px]">
                  😰 Neuroticismo (Estabilidade Emocional)
                </h3>
                <p className="text-white/90 drop-shadow-sm">
                  Seu padrão de reação ao estresse e tendência a experimentar emoções negativas. Uma pontuação baixa indica maior estabilidade emocional e resiliência.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Informações do Teste */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-6 text-[24px] font-bold">
              ℹ️ Informações do Teste
            </h2>

            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  <strong className="text-white">Duração estimada:</strong> 10 a 15 minutos
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  <strong className="text-white">Número de questões:</strong> 120 afirmações
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  <strong className="text-white">Formato:</strong> Escala de concordância (1 a 5)
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  <strong className="text-white">Salvamento:</strong> Suas respostas são salvas automaticamente
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Como Responder */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-6 text-[24px] font-bold">
              📝 Como Responder
            </h2>

            <h3 className="text-white drop-shadow-md mb-4">
              ✅ Orientações Importantes:
            </h3>

            <div className="space-y-6">
              {/* Orientação 1 */}
              <div>
                <h4 className="text-white drop-shadow-sm mb-2 text-[20px] font-bold">
                  Seja honesto(a) e espontâneo(a)
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • Não há respostas certas ou erradas
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Responda com sinceridade, não como você gostaria de ser
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Pense em como você GERALMENTE se comporta, não em situações específicas
                  </li>
                </ul>
              </div>

              {/* Orientação 2 */}
              <div>
                <h4 className="text-white drop-shadow-sm mb-2 text-[20px] font-bold">
                  Use a escala de 1 a 5:
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • <strong className="text-white">1</strong> = Discordo totalmente
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • <strong className="text-white">2</strong> = Discordo parcialmente
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • <strong className="text-white">3</strong> = Neutro / Nem concordo, nem discordo
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • <strong className="text-white">4</strong> = Concordo parcialmente
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • <strong className="text-white">5</strong> = Concordo totalmente
                  </li>
                </ul>
              </div>

              {/* Orientação 3 */}
              <div>
                <h4 className="text-white drop-shadow-sm mb-2 text-[20px] font-bold">
                  Não pense demais:
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • Responda de forma intuitiva
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Sua primeira impressão costuma ser a mais precisa
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Evite respostas sempre no meio (neutro)
                  </li>
                </ul>
              </div>

              {/* Orientação 4 */}
              <div>
                <h4 className="text-white drop-shadow-sm mb-2 text-[20px] font-bold">
                  Pense no seu comportamento habitual:
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • Como você age na MAIORIA das vezes
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Não situações excepcionais ou momentos específicos
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Considere diferentes contextos (trabalho, lazer, família)
                  </li>
                </ul>
              </div>
            </div>
          </GlassCard>

          {/* Exemplo de Como Funciona */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-6 font-bold text-[24px]">
              💡 Exemplo de Como Funciona
            </h2>

            <p className="text-white/90 drop-shadow-sm mb-4">
              Você verá afirmações como estas:
            </p>

            <div className="bg-white/10 border border-white/20 rounded-lg p-6 mb-4">
              <p className="text-white drop-shadow-sm mb-4">
                <strong>"Eu costumo começar conversas com estranhos facilmente."</strong>
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded">
                  <span className="text-white/90 drop-shadow-sm">⭕</span>
                  <span className="text-white/90 drop-shadow-sm">
                    1 - Discordo totalmente
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded">
                  <span className="text-white/90 drop-shadow-sm">⭕</span>
                  <span className="text-white/90 drop-shadow-sm">
                    2 - Discordo parcialmente
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded">
                  <span className="text-white/90 drop-shadow-sm">⭕</span>
                  <span className="text-white/90 drop-shadow-sm">
                    3 - Neutro
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded">
                  <span className="text-white/90 drop-shadow-sm">⭕</span>
                  <span className="text-white/90 drop-shadow-sm">
                    4 - Concordo parcialmente
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded">
                  <span className="text-white/90 drop-shadow-sm">⭕</span>
                  <span className="text-white/90 drop-shadow-sm">
                    5 - Concordo totalmente
                  </span>
                </div>
              </div>
            </div>

            <p className="text-white drop-shadow-sm text-center font-bold text-[24px]">
              → Selecione o número que melhor representa você
            </p>
          </GlassCard>

          {/* Privacidade */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-4 text-[24px] font-bold">
              🔒 Privacidade
            </h2>
            <p className="text-white/90 drop-shadow-sm">
              Suas respostas são confidenciais e serão analisadas apenas pela equipe de recrutamento. Os resultados ajudarão a entender se há um bom alinhamento entre seu perfil e a cultura da Beauty Smile.
            </p>
          </GlassCard>

          {/* Antes de Começar */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-6 text-[24px] font-bold">
              ✋ Antes de Começar
            </h2>

            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  Escolha um ambiente tranquilo e sem interrupções
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  Reserve pelo menos 15 minutos ininterruptos
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  Leia cada afirmação com atenção
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  Não há limite de tempo, mas evite pausas longas
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Checkbox de Confirmação */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-8">
            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={aceitouInstrucoes}
                onChange={(e) => setAceitouInstrucoes(e.target.checked)}
                className="w-6 h-6 accent-[#35BFAD] mt-1 flex-shrink-0 rounded"
              />
              <span className="text-white drop-shadow-sm">
                <strong>Li e compreendi as instruções acima</strong>
              </span>
            </label>
          </GlassCard>

          {/* Botão Iniciar */}
          <div className="flex justify-center">
            <button
              onClick={handleIniciarTeste}
              disabled={!aceitouInstrucoes}
              className={`
                px-16 py-5 rounded-lg border-2 backdrop-blur-md transition-all duration-300
                ${aceitouInstrucoes 
                  ? 'bg-[#00109E] hover:bg-[#00109E]/90 text-white border-white/50 shadow-2xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:border-white/70 active:scale-95 cursor-pointer'
                  : 'bg-white/10 text-white/40 border-white/20 cursor-not-allowed'
                }
              `}
            >
              Iniciar Teste →
            </button>
          </div>
        </div>
      </div>
    </BackgroundImage>
  );
}
