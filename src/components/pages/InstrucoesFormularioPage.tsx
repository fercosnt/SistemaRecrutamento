import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { CheckCircle, Clock, Target } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function InstrucoesFormularioPage() {
  const handleIniciar = () => {
    toast.success('Iniciando formulário...', {
      description: 'Boa sorte! Seja autêntico.',
    });
    console.log('Redirecionar para formulário de candidatura...');
    // window.location.href = '/formulario-candidatura';
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
          <div className="text-center mb-12">
            <h1 className="text-white mb-4 drop-shadow-lg text-[40px] font-bold">
              Antes de Começar
            </h1>
            <p className="text-white/90 drop-shadow-md max-w-2xl mx-auto">
              Assista ao vídeo e entenda por que este formulário é tão importante para nós — e para você.
            </p>
          </div>

          {/* Vídeo */}
          <GlassCard 
            variant="white" 
            blur="lg"
            className="p-6 mb-8"
          >
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/50">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/mgMOtiupGCs"
                title="Instruções do Formulário - Beauty Smile"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </GlassCard>

          {/* Seção: Por que este formulário existe? */}
          <GlassCard 
            variant="white" 
            blur="lg"
            className="p-8 mb-6"
          >
            <h2 className="text-white mb-6 drop-shadow-md font-bold text-[24px] font-normal">
              Por que este formulário existe?
            </h2>
            
            <div className="space-y-4 text-white/90 drop-shadow-sm">
              <p className="text-[rgb(246,248,255)]">
                <strong className="text-white">A verdade é esta:</strong> analisar apenas currículos não nos diz o que realmente importa.
              </p>
              
              <p className="text-[rgb(255,255,255)]">
                Queremos entender <strong className="text-white">como você pensa</strong>. Como você resolve problemas reais. Como você lida com desafios do dia a dia. Como você se conecta com propósito e valores.
              </p>
              
              <p className="text-[rgb(255,255,255)]">
                Este não é um filtro burocrático. É uma conversa estruturada para que possamos conhecer você de verdade — como você aborda situações, como seus valores se alinham aos nossos, e como você contribuiria para transformar vidas através do que a Beauty Smile faz.
              </p>
            </div>
          </GlassCard>

          {/* Seção: O que você ganha */}
          <GlassCard 
            variant="white" 
            blur="lg"
            className="p-8 mb-6"
          >
            <h2 className="text-white mb-6 drop-shadow-md text-[24px] font-bold font-normal">
              O que você ganha investindo 15-20 minutos aqui?
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white drop-shadow-lg" />
                </div>
                <div>
                  <p className="text-white drop-shadow-sm">
                    <strong>Personalização do processo</strong> — suas respostas vão moldar as próximas etapas de acordo com seu perfil
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Clock className="w-6 h-6 text-white drop-shadow-lg" />
                </div>
                <div>
                  <p className="text-white drop-shadow-sm">
                    <strong>Economia de tempo depois</strong> — quanto melhor você se apresentar agora, mais rápido e assertivo será o processo
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Target className="w-6 h-6 text-white drop-shadow-lg" />
                </div>
                <div>
                  <p className="text-white drop-shadow-sm">
                    <strong>Chance real de se destacar</strong> — este é o espaço para mostrar o que um currículo não consegue capturar
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Seção: Como preencher */}
          <GlassCard 
            variant="white" 
            blur="lg"
            className="p-8 mb-8"
          >
            <h2 className="text-white mb-6 drop-shadow-md text-[24px] font-bold font-normal">
              Como preencher
            </h2>
            
            <div className="space-y-4 text-white/90 drop-shadow-sm">
              <p>
                Você pode salvar e continuar mais tarde, mas <strong className="text-white">recomendamos completar em uma única sessão</strong> para manter seu raciocínio fluido e suas respostas mais autênticas.
              </p>
              
              <div className="bg-white/10 border border-white/20 rounded-lg p-6 mt-6 text-[20px]">
                <p className="text-white drop-shadow-md text-center">
                  <strong>Seja você mesmo. Seja honesto. Mostre por que você pertence a esta missão.</strong>
                </p>
              </div>
              
              <p className="text-center mt-6">
                Estamos ansiosos para conhecer você. 🚀
              </p>
            </div>
          </GlassCard>

          {/* Botão Iniciar */}
          <div className="flex justify-center">
            <button
              onClick={handleIniciar}
              className="bg-[#00109E] hover:bg-[#00109E]/90 text-white px-12 py-4 rounded-lg border-2 border-white/50 backdrop-blur-md transition-all duration-300 shadow-2xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:border-white/70 active:scale-95 font-bold"
            >
              Iniciar Formulário
            </button>
          </div>
        </div>
      </div>
    </BackgroundImage>
  );
}
