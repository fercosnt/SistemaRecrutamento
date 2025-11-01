import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function InstrucoesDISCPage() {
  const candidatoNome = "Maria Silva"; // Viria do login/sessão
  const [aceitouInstrucoes, setAceitouInstrucoes] = useState(false);

  const handleIniciarTeste = () => {
    if (!aceitouInstrucoes) {
      toast.error('Confirmação necessária', {
        description: 'Por favor, confirme que leu e compreendeu as instruções.',
      });
      return;
    }

    toast.success('Iniciando teste DISC...', {
      description: 'Boa sorte!',
    });
    console.log('Redirecionar para teste DISC...');
    // window.location.href = '/teste-disc';
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
            🎯 Análise de Perfil Comportamental - DISC
          </h1>

          {/* O que é este teste? */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-4 text-[24px] font-bold">
              O que é este teste?
            </h2>
            <p className="text-white/90 drop-shadow-sm">
              O DISC é uma ferramenta que identifica seu estilo comportamental predominante em situações de trabalho. Ele avalia como você naturalmente tende a agir em diferentes circunstâncias profissionais, sem julgar se um estilo é melhor que outro.
            </p>
          </GlassCard>

          {/* Os 4 Estilos Comportamentais */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-6 text-[24px] font-bold">
              Os 4 Estilos Comportamentais:
            </h2>

            <div className="space-y-6">
              {/* D - Dominância */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-white drop-shadow-md mb-3 text-[20px]">
                  🔴 D - Dominância (Executor)
                </h3>
                <p className="text-white/90 drop-shadow-sm">
                  Pessoas diretas, orientadas a resultados, decisivas e que gostam de desafios. Focam em "o quê" precisa ser feito.
                </p>
              </div>

              {/* I - Influência */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-white drop-shadow-md mb-3 text-[20px]">
                  🟡 I - Influência (Comunicador)
                </h3>
                <p className="text-white/90 drop-shadow-sm">
                  Pessoas entusiastas, persuasivas, otimistas e sociáveis. Focam em "quem" está envolvido e em influenciar pessoas.
                </p>
              </div>

              {/* S - Estabilidade */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-white drop-shadow-md mb-3 text-[20px] font-bold font-normal">
                  🟢 S - Estabilidade (Apoiador)
                </h3>
                <p className="text-white/90 drop-shadow-sm">
                  Pessoas pacientes, leais, confiáveis e colaborativas. Focam em "como" as coisas devem ser feitas e valorizam harmonia.
                </p>
              </div>

              {/* C - Conformidade */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-white drop-shadow-md mb-3 text-[20px]">
                  🔵 C - Conformidade (Analista)
                </h3>
                <p className="text-white/90 drop-shadow-sm">
                  Pessoas precisas, analíticas, sistemáticas e detalhistas. Focam em "por quê" e na qualidade dos processos.
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
                  <strong className="text-white">Duração estimada:</strong> 5 a 10 minutos
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  <strong className="text-white">Número de grupos:</strong> 24 conjuntos de afirmações
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  <strong className="text-white">Formato:</strong> Escolha forçada (1 opção por grupo)
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
                  Escolha UMA afirmação por grupo
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • Em cada tela, você verá 4 frases diferentes
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Escolha aquela que MAIS descreve como você naturalmente age
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Pense no seu comportamento típico no trabalho
                  </li>
                </ul>
              </div>

              {/* Orientação 2 */}
              <div>
                <h4 className="text-white drop-shadow-sm mb-2 text-[20px] font-bold">
                  Seja autêntico(a):
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • Escolha como você REALMENTE é, não como deveria ser
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Considere seu comportamento natural e espontâneo
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Não há perfil "ideal" ou "melhor"
                  </li>
                </ul>
              </div>

              {/* Orientação 3 */}
              <div>
                <h4 className="text-white drop-shadow-sm mb-2 text-[20px] font-bold">
                  Pense em situações profissionais:
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • Como você age no ambiente de trabalho
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Seu estilo de comunicação com colegas
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Como você toma decisões e resolve problemas
                  </li>
                </ul>
              </div>

              {/* Orientação 4 */}
              <div>
                <h4 className="text-white drop-shadow-sm mb-2 text-[20px] font-bold">
                  Não analise demais:
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • Confie na sua primeira impressão
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Se duas opções parecem adequadas, escolha a mais intensa
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Não há tempo limite, mas evite pensar excessivamente
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
              Você verá grupos como este:
            </p>

            <div className="bg-white/10 border border-white/20 rounded-lg p-6 mb-4">
              <p className="text-white drop-shadow-sm mb-4">
                <strong>Escolha a afirmação que mais descreve você:</strong>
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded">
                  <span className="text-white/90 drop-shadow-sm">⭕</span>
                  <span className="text-white/90 drop-shadow-sm">
                    Sou decidido(a) e gosto de assumir o controle das situações
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded">
                  <span className="text-white/90 drop-shadow-sm">⭕</span>
                  <span className="text-white/90 drop-shadow-sm">
                    Sou comunicativo(a) e adoro trabalhar em equipe
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded">
                  <span className="text-white/90 drop-shadow-sm">⭕</span>
                  <span className="text-white/90 drop-shadow-sm">
                    Sou paciente e prefiro ambientes estáveis e harmoniosos
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded">
                  <span className="text-white/90 drop-shadow-sm">⭕</span>
                  <span className="text-white/90 drop-shadow-sm">
                    Sou detalhista e valorizo precisão e qualidade
                  </span>
                </div>
              </div>
            </div>

            <p className="text-white drop-shadow-sm text-center font-bold text-[24px]">
              → Selecione apenas UMA opção
            </p>
          </GlassCard>

          {/* Privacidade */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-4 text-[24px] font-bold">
              🔒 Privacidade
            </h2>
            <p className="text-white/90 drop-shadow-sm">
              Seus resultados são confidenciais e ajudarão a entender seu estilo de trabalho, facilitando uma melhor integração com a equipe da Beauty Smile.
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
                  Reserve cerca de 10 minutos sem interrupções
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  Responda pensando em como você age NO TRABALHO
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  Lembre-se: não há respostas certas ou erradas
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  Todos os estilos têm pontos fortes valiosos
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
