import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { toast } from 'sonner';

export function InstrucoesRavenPage() {
  const candidatoNome = "Maria Silva"; // Viria do login/sessão
  const [aceitouInstrucoes, setAceitouInstrucoes] = useState(false);

  const handleIniciarTeste = () => {
    if (!aceitouInstrucoes) {
      toast.error('Confirmação necessária', {
        description: 'Por favor, confirme que leu e compreendeu as instruções.',
      });
      return;
    }

    toast.success('Iniciando teste Raven...', {
      description: 'Boa sorte!',
    });
    console.log('Redirecionar para teste Raven...');
    // window.location.href = '/teste-raven';
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
            🎯 Avaliação de Raciocínio Lógico e Abstrato
          </h1>

          {/* O que é este teste? */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-4 text-[24px] font-bold">
              O que é este teste?
            </h2>
            <p className="text-white/90 drop-shadow-sm">
              Esta avaliação mede sua capacidade de raciocínio lógico e percepção de padrões. Você resolverá diferentes tipos de desafios que avaliam como você processa informações, identifica padrões e chega a conclusões.
            </p>
          </GlassCard>

          {/* Tipos de Questões */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-6 text-[24px] font-bold">
              Tipos de Questões:
            </h2>

            <p className="text-white/90 drop-shadow-sm mb-6">
              Imagine uma sequência de formas que seguem um padrão lógico. Sua tarefa é identificar qual das opções dadas completa corretamente esse padrão.
            </p>

            <div className="bg-white/10 border border-white/20 rounded-lg p-6">
              <p className="text-white drop-shadow-md">
                <strong>💡 Dica:</strong>
              </p>
              <p className="text-white/90 drop-shadow-sm mt-2">
                Observe atentamente as relações entre as formas, considerando direção, tamanho, quantidade e posicionamento.
              </p>
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
                  <strong className="text-white">Duração estimada:</strong> 20 a 30 minutos
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  <strong className="text-white">Número de questões:</strong> 60 questões
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  <strong className="text-white">Formato:</strong> Múltipla escolha (5 alternativas)
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  <strong className="text-white">Dificuldade:</strong> Progressiva (começa fácil e fica mais desafiador)
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
                  Leia com atenção:
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • Observe cuidadosamente cada questão
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Analise todas as alternativas antes de responder
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Procure padrões, regras ou relações lógicas
                  </li>
                </ul>
              </div>

              {/* Orientação 2 */}
              <div>
                <h4 className="text-white drop-shadow-sm mb-2 text-[20px] font-bold">
                  Gerencie seu tempo:
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • Você tem tempo livre, mas evite pausas muito longas
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • As questões ficam progressivamente mais desafiadoras
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Não fique muito tempo em uma única questão
                  </li>
                </ul>
              </div>

              {/* Orientação 3 */}
              <div>
                <h4 className="text-white drop-shadow-sm mb-2 text-[20px] font-bold">
                  Mantenha a concentração:
                </h4>
                <ul className="space-y-2 ml-4">
                  <li className="text-white/90 drop-shadow-sm">
                    • Escolha um ambiente silencioso
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Evite distrações durante o teste
                  </li>
                  <li className="text-white/90 drop-shadow-sm">
                    • Faça pausas breves se necessário (suas respostas são salvas)
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
              Você verá uma matriz com um padrão visual. Uma das posições estará vazia e você deverá identificar qual das alternativas completa o padrão.
            </p>

            <div className="bg-white/10 border border-white/20 rounded-lg p-6 mb-4">
              <p className="text-white drop-shadow-sm mb-4 text-center">
                <strong>Complete o padrão abaixo:</strong>
              </p>
              
              <div className="grid grid-cols-3 gap-3 mb-6 max-w-md mx-auto">
                <div className="aspect-square bg-white/5 border border-white/30 rounded flex items-center justify-center">
                  <span className="text-white/90 drop-shadow-sm text-[32px]">●</span>
                </div>
                <div className="aspect-square bg-white/5 border border-white/30 rounded flex items-center justify-center">
                  <span className="text-white/90 drop-shadow-sm text-[32px]">●●</span>
                </div>
                <div className="aspect-square bg-white/5 border border-white/30 rounded flex items-center justify-center">
                  <span className="text-white/90 drop-shadow-sm text-[32px]">●●●</span>
                </div>
                <div className="aspect-square bg-white/5 border border-white/30 rounded flex items-center justify-center">
                  <span className="text-white/90 drop-shadow-sm text-[32px]">■</span>
                </div>
                <div className="aspect-square bg-white/5 border border-white/30 rounded flex items-center justify-center">
                  <span className="text-white/90 drop-shadow-sm text-[32px]">■■</span>
                </div>
                <div className="aspect-square bg-white/5 border border-white/30 rounded flex items-center justify-center">
                  <span className="text-white/90 drop-shadow-sm text-[32px]">■■■</span>
                </div>
                <div className="aspect-square bg-white/5 border border-white/30 rounded flex items-center justify-center">
                  <span className="text-white/90 drop-shadow-sm text-[32px]">▲</span>
                </div>
                <div className="aspect-square bg-white/5 border border-white/30 rounded flex items-center justify-center">
                  <span className="text-white/90 drop-shadow-sm text-[32px]">▲▲</span>
                </div>
                <div className="aspect-square bg-[#35BFAD]/20 border-2 border-[#35BFAD] rounded flex items-center justify-center">
                  <span className="text-white drop-shadow-md text-[24px]">?</span>
                </div>
              </div>

              <p className="text-white/90 drop-shadow-sm mb-3 text-center">
                <strong>Escolha a alternativa correta:</strong>
              </p>

              <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
                {['▲▲▲', '●●●●', '■■■■', '▲', '▲▲▲▲'].map((option, idx) => (
                  <div 
                    key={idx}
                    className="aspect-square bg-white/5 border border-white/30 rounded flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all duration-200"
                  >
                    <span className="text-white/90 drop-shadow-sm text-[20px]">{option}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-white drop-shadow-sm text-center font-bold text-[24px]">
              → Selecione a opção que completa o padrão
            </p>
          </GlassCard>

          {/* Privacidade */}
          <GlassCard variant="white" blur="lg" className="p-8 mb-6">
            <h2 className="text-white drop-shadow-md mb-4 text-[24px] font-bold">
              🔒 Privacidade
            </h2>
            <p className="text-white/90 drop-shadow-sm">
              Seus resultados são confidenciais e serão analisados apenas pela equipe de recrutamento. Esta avaliação ajuda a compreender suas habilidades de raciocínio lógico e resolução de problemas.
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
                  Reserve de 20 a 30 minutos ininterruptos
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  Escolha um ambiente tranquilo e bem iluminado
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  Descanse bem antes de fazer o teste
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-white/90 drop-shadow-sm">•</span>
                <p className="text-white/90 drop-shadow-sm">
                  Mantenha o foco e evite se apressar
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
