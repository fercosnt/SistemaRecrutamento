import React from 'react';
import { BackgroundImage } from './BackgroundImage';
import { Glass, GlassCard, GlassPanel, GlassButton, GlassNavbar } from './ui/glass';
import { BeautySmileLogo } from './BeautySmileLogo';

/**
 * Showcase dos componentes Glass com os backgrounds da Beauty Smile
 * Demonstra todas as variantes e casos de uso
 */
export function GlassShowcase() {
  return (
    <div className="space-y-20">
      {/* 1. Glass sobre Gradiente Moderno */}
      <section>
        <BackgroundImage background="gradient" className="min-h-screen py-20">
          <div className="container mx-auto px-4 space-y-8">
            <div className="text-center mb-12">
              <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-4" />
              <h1 className="text-white text-4xl mb-2">Liquid Glass Effect</h1>
              <p className="text-white/80">Efeito glassmorphism sobre gradiente moderno</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Accent */}
              <GlassCard variant="accent" blur="lg" hover className="text-white">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-brand-accent/30 flex items-center justify-center">
                    <span className="text-2xl">🌊</span>
                  </div>
                  <h3 className="text-xl">Questionários</h3>
                  <p className="text-white/80 text-sm">
                    Testes psicométricos com design moderno e tecnológico
                  </p>
                  <GlassButton variant="white" className="w-full mt-4">
                    Iniciar Teste
                  </GlassButton>
                </div>
              </GlassCard>

              {/* Card White */}
              <GlassCard variant="white" blur="lg" hover className="text-white">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-2xl">💼</span>
                  </div>
                  <h3 className="text-xl">Vagas</h3>
                  <p className="text-white/80 text-sm">
                    Explore oportunidades exclusivas na Beauty Smile
                  </p>
                  <GlassButton variant="accent" className="w-full mt-4">
                    Ver Vagas
                  </GlassButton>
                </div>
              </GlassCard>

              {/* Card Primary */}
              <GlassCard variant="primary" blur="lg" hover className="text-white">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-brand-primary/30 flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-xl">Resultados</h3>
                  <p className="text-white/80 text-sm">
                    Acompanhe seu progresso e análise de perfil
                  </p>
                  <GlassButton variant="white" className="w-full mt-4">
                    Ver Perfil
                  </GlassButton>
                </div>
              </GlassCard>
            </div>

            {/* Panel Example */}
            <GlassPanel variant="white" className="text-white">
              <h2 className="text-2xl mb-4">Dashboard de Candidato</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Glass variant="accent" className="p-4 text-center">
                  <p className="text-3xl mb-2">85%</p>
                  <p className="text-sm text-white/80">Compatibilidade</p>
                </Glass>
                <Glass variant="accent" className="p-4 text-center">
                  <p className="text-3xl mb-2">12</p>
                  <p className="text-sm text-white/80">Testes Concluídos</p>
                </Glass>
                <Glass variant="accent" className="p-4 text-center">
                  <p className="text-3xl mb-2">3</p>
                  <p className="text-sm text-white/80">Vagas Match</p>
                </Glass>
              </div>
            </GlassPanel>
          </div>
        </BackgroundImage>
      </section>

      {/* 2. Glass sobre Azul Escuro */}
      <section>
        <BackgroundImage background="darkBlue" className="min-h-screen py-20">
          <div className="container mx-auto px-4">
            <GlassPanel variant="white" className="text-white max-w-2xl mx-auto">
              <h2 className="text-3xl mb-6">Login Administrativo</h2>
              <div className="space-y-4">
                <Glass variant="white" className="p-4">
                  <input 
                    type="email" 
                    placeholder="Email" 
                    className="w-full bg-transparent border-none outline-none text-white placeholder:text-white/60"
                  />
                </Glass>
                <Glass variant="white" className="p-4">
                  <input 
                    type="password" 
                    placeholder="Senha" 
                    className="w-full bg-transparent border-none outline-none text-white placeholder:text-white/60"
                  />
                </Glass>
                <GlassButton variant="accent" className="w-full">
                  Entrar
                </GlassButton>
              </div>
            </GlassPanel>
          </div>
        </BackgroundImage>
      </section>

      {/* 3. Glass sobre Dourado */}
      <section>
        <BackgroundImage background="gold" className="min-h-screen py-20">
          <div className="container mx-auto px-4">
            <GlassCard variant="dark" blur="xl" className="max-w-4xl mx-auto text-white">
              <div className="text-center space-y-6">
                <h2 className="text-4xl">Manifesto Cultural</h2>
                <p className="text-xl text-white/90">
                  Nossos valores e princípios que guiam cada decisão
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <Glass variant="white" blur="lg" className="p-6 text-left">
                    <h3 className="text-xl mb-2">🎯 Excelência</h3>
                    <p className="text-white/80 text-sm">
                      Buscamos a perfeição em cada sorriso transformado
                    </p>
                  </Glass>
                  <Glass variant="white" blur="lg" className="p-6 text-left">
                    <h3 className="text-xl mb-2">🤝 Confiança</h3>
                    <p className="text-white/80 text-sm">
                      Construímos relacionamentos baseados em transparência
                    </p>
                  </Glass>
                  <Glass variant="white" blur="lg" className="p-6 text-left">
                    <h3 className="text-xl mb-2">💡 Inovação</h3>
                    <p className="text-white/80 text-sm">
                      Tecnologia de ponta para resultados extraordinários
                    </p>
                  </Glass>
                  <Glass variant="white" blur="lg" className="p-6 text-left">
                    <h3 className="text-xl mb-2">❤️ Cuidado</h3>
                    <p className="text-white/80 text-sm">
                      Cada paciente recebe atenção personalizada
                    </p>
                  </Glass>
                </div>
              </div>
            </GlassCard>
          </div>
        </BackgroundImage>
      </section>

      {/* 4. Glass Navbar Example */}
      <section className="relative h-screen">
        <BackgroundImage background="gradient" className="h-full">
          <GlassNavbar variant="white">
            <div className="container mx-auto flex items-center justify-between">
              <BeautySmileLogo type="horizontal" size="md" variant="white" />
              <div className="flex gap-4">
                <GlassButton variant="accent" className="px-4 py-2">
                  Login
                </GlassButton>
              </div>
            </div>
          </GlassNavbar>
          
          <div className="flex items-center justify-center h-full">
            <GlassPanel variant="white" className="text-white text-center">
              <h1 className="text-5xl mb-4">Beauty Smile</h1>
              <p className="text-xl text-white/80">
                Sistema de Recrutamento com Liquid Glass Design
              </p>
            </GlassPanel>
          </div>
        </BackgroundImage>
      </section>
    </div>
  );
}
