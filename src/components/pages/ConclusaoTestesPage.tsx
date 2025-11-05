import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { CheckCircle2, Mail, Target, Calendar } from 'lucide-react';

export function ConclusaoTestesPage() {
  const candidatoNome = "Maria Silva"; // Viria do login/sessão

  return (
    <BackgroundImage 
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
      className="min-h-screen"
    >
      <div className="min-h-screen flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-3xl">
          
          {/* Card Principal */}
          <GlassCard variant="white" blur="lg" className="p-8 md:p-12">
            
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <BeautySmileLogo type="horizontal" variant="white" size="lg" className="drop-shadow-lg" />
            </div>

            {/* Nome do Candidato */}
            <div className="text-center mb-10">
              <p className="text-white drop-shadow-md text-[24px] md:text-[28px] mb-2">
                {candidatoNome}
              </p>
              <p className="text-white/70 drop-shadow-sm text-[16px]">
                Processo Seletivo Beauty Smile
              </p>
            </div>

            {/* Ícone de Sucesso */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative bg-white/20 backdrop-blur-md rounded-full p-6 border-2 border-white/50">
                  <CheckCircle2 className="w-16 h-16 text-white drop-shadow-lg" strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Mensagem Principal */}
            <div className="text-center mb-12">
              <h1 className="text-white drop-shadow-lg text-[32px] md:text-[40px] mb-4">
                Concluído com Sucesso!
              </h1>
            </div>

            {/* Divisor */}
            <div className="w-24 h-1 bg-white/30 rounded-full mx-auto mb-10"></div>

            {/* Cards de Informação */}
            <div className="space-y-6 mb-10">
              
              {/* Email */}
              <GlassCard variant="white" blur="md" className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                    <Mail className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white drop-shadow-md text-[18px] mb-2">
                      📧 Você receberá um email com seus resultados em breve
                    </p>
                    <p className="text-white/70 drop-shadow-sm text-[14px]">
                      Verifique sua caixa de entrada e spam nos próximos dias.
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Próximo Passo */}
              <GlassCard variant="white" blur="md" className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                    <Target className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white drop-shadow-md text-[18px] mb-2">
                      🎯 Próximo passo: Aguarde contato do RH
                    </p>
                    <p className="text-white/70 drop-shadow-sm text-[14px]">
                      Nossa equipe analisará seu perfil e entrará em contato sobre as próximas etapas do processo seletivo.
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Prazo */}
              <GlassCard variant="white" blur="md" className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                    <Calendar className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white drop-shadow-md text-[18px] mb-2">
                      📅 Prazo de retorno: Até 15 dias úteis
                    </p>
                    <p className="text-white/70 drop-shadow-sm text-[14px]">
                      Nosso processo de avaliação é cuidadoso para garantir a melhor experiência para todos os candidatos.
                    </p>
                  </div>
                </div>
              </GlassCard>

            </div>

            {/* Mensagem de Agradecimento */}
            <div className="text-center mt-10 pt-8 border-t border-white/20">
              <p className="text-white/80 drop-shadow-sm text-[16px] leading-relaxed">
                Obrigado por participar do processo seletivo da <span className="text-white drop-shadow-md">Beauty Smile</span>! 🌟
              </p>
              <p className="text-white/60 drop-shadow-sm text-[14px] mt-2">
                Estamos ansiosos para conhecê-lo melhor.
              </p>
            </div>

          </GlassCard>

          {/* Info Extra */}
          <GlassCard variant="white" blur="lg" className="p-4 mt-6">
            <div className="flex items-center justify-center gap-2">
              <p className="text-white/70 drop-shadow-sm text-[14px] text-center">
                💼 Acompanhe o status da sua candidatura no seu dashboard
              </p>
            </div>
          </GlassCard>

        </div>
      </div>
    </BackgroundImage>
  );
}
