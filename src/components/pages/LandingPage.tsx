import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { GlassPanel, GlassButton, GlassCard } from '../ui/glass';

export function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage 
        background="gradient" 
        className="min-h-screen"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        {/* Hero Section */}
        <div className="flex items-center justify-center min-h-screen py-20">
          <GlassPanel variant="white" blur="xl" className="text-white text-center max-w-4xl mx-4">
            <div className="space-y-6">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
                <BeautySmileLogo size="lg" variant="white" />
              </div>
              <h1 className="text-6xl mb-4 drop-shadow-lg">Beauty Smile</h1>
              <p className="text-2xl text-white/90 mb-8 drop-shadow-md">
                Sistema de Recrutamento Inteligente
              </p>
              <div className="flex gap-4 justify-center">
                <GlassButton variant="white" hover className="px-8 py-4 text-white text-lg drop-shadow-sm">
                  Ver Vagas
                </GlassButton>
                <GlassButton variant="white" hover className="px-8 py-4 text-white text-lg drop-shadow-sm">
                  Área do RH
                </GlassButton>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Features Section */}
        <div className="container mx-auto px-4 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-white mb-4 drop-shadow-lg">Como Funciona</h2>
            <p className="text-white/90 text-xl drop-shadow-md">Processo simples e tecnológico</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard variant="white" blur="xl" hover className="text-white">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <span className="text-3xl">🌊</span>
                </div>
                <h3 className="text-2xl drop-shadow-md text-[rgb(255,255,255)]">Questionários</h3>
                <p className="text-white/90 drop-shadow-sm">
                  Testes psicométricos com design moderno e tecnológico
                </p>
              </div>
            </GlassCard>

            <GlassCard variant="white" blur="xl" hover className="text-white">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <span className="text-3xl">💼</span>
                </div>
                <h3 className="text-2xl drop-shadow-md text-[rgb(255,255,255)]">Vagas</h3>
                <p className="text-white/90 drop-shadow-sm">
                  Explore oportunidades exclusivas na Beauty Smile
                </p>
              </div>
            </GlassCard>

            <GlassCard variant="white" blur="xl" hover className="text-white">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-2xl drop-shadow-md text-[rgb(255,255,255)]">Resultados</h3>
                <p className="text-white/90 drop-shadow-sm">
                  Acompanhe seu progresso e análise de perfil
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </BackgroundImage>
    </div>
  );
}
