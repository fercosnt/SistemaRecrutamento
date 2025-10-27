import React from 'react';
import { BackgroundImage } from './BackgroundImage';
import { Glass, GlassCard, GlassPanel, GlassButton, GlassNavbar } from './ui/glass';
import { BeautySmileLogo } from './BeautySmileLogo';

/**
 * Showcase dos componentes Glass com os backgrounds da Beauty Smile
 * Foco em azul escuro e turquesa/gradiente moderno
 */
export function GlassShowcase() {
  return (
    <div className="space-y-0">
      {/* 1. Glass sobre Gradiente Turquesa - Com overlay para melhor legibilidade */}
      <section>
        <BackgroundImage 
          background="gradient" 
          className="min-h-screen py-20"
          overlayColor="bg-black"
          overlayOpacity={15}
        >
          <div className="container mx-auto px-4 space-y-8">
            <div className="text-center mb-12">
              <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-4" />
              <h1 className="text-white text-5xl mb-2 drop-shadow-lg">Liquid Glass Effect</h1>
              <p className="text-white/90 text-xl drop-shadow-md">Gradiente turquesa moderno • Tecnologia e Inovação</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Accent - Background mais opaco para legibilidade */}
              <GlassCard variant="white" blur="xl" hover className="text-white">
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <span className="text-3xl">🌊</span>
                  </div>
                  <h3 className="text-2xl drop-shadow-md">Questionários</h3>
                  <p className="text-white/90 drop-shadow-sm">
                    Testes psicométricos com design moderno e tecnológico
                  </p>
                  <GlassButton variant="white" className="w-full mt-4 text-white drop-shadow-sm">
                    Iniciar Teste →
                  </GlassButton>
                </div>
              </GlassCard>

              {/* Card White - Background mais opaco para legibilidade */}
              <GlassCard variant="white" blur="xl" hover className="text-white">
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <span className="text-3xl">💼</span>
                  </div>
                  <h3 className="text-2xl drop-shadow-md">Vagas</h3>
                  <p className="text-white/90 drop-shadow-sm">
                    Explore oportunidades exclusivas na Beauty Smile
                  </p>
                  <GlassButton variant="white" className="w-full mt-4 text-white drop-shadow-sm">
                    Ver Vagas →
                  </GlassButton>
                </div>
              </GlassCard>

              {/* Card Primary - Background mais opaco para legibilidade */}
              <GlassCard variant="white" blur="xl" hover className="text-white">
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <span className="text-3xl">📊</span>
                  </div>
                  <h3 className="text-2xl drop-shadow-md">Resultados</h3>
                  <p className="text-white/90 drop-shadow-sm">
                    Acompanhe seu progresso e análise de perfil
                  </p>
                  <GlassButton variant="white" className="w-full mt-4 text-white drop-shadow-sm">
                    Ver Perfil →
                  </GlassButton>
                </div>
              </GlassCard>
            </div>

            {/* Panel Example - Background mais opaco para legibilidade */}
            <GlassPanel variant="white" blur="xl" className="text-white">
              <h2 className="text-3xl mb-6 drop-shadow-md">Dashboard de Candidato</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Glass variant="white" blur="lg" className="p-6 text-center">
                  <p className="text-5xl mb-2 drop-shadow-md">85%</p>
                  <p className="text-white/90 drop-shadow-sm">Compatibilidade</p>
                </Glass>
                <Glass variant="white" blur="lg" className="p-6 text-center">
                  <p className="text-5xl mb-2 drop-shadow-md">12</p>
                  <p className="text-white/90 drop-shadow-sm">Testes Concluídos</p>
                </Glass>
                <Glass variant="white" blur="lg" className="p-6 text-center">
                  <p className="text-5xl mb-2 drop-shadow-md">3</p>
                  <p className="text-white/90 drop-shadow-sm">Vagas Match</p>
                </Glass>
              </div>
            </GlassPanel>
          </div>
        </BackgroundImage>
      </section>

      {/* 2. Glass sobre Azul Escuro - Perfeito! */}
      <section>
        <BackgroundImage background="darkBlue" className="min-h-screen py-20">
          <div className="container mx-auto px-4 space-y-8">
            <div className="text-center mb-12">
              <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-4" />
              <h1 className="text-white text-5xl mb-2">Área Administrativa</h1>
              <p className="text-white/90 text-xl">Azul corporativo • Profissionalismo e Confiança</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Login Panel */}
              <GlassPanel variant="white" blur="lg" className="text-white">
                <h2 className="text-3xl mb-6">Login do RH</h2>
                <div className="space-y-4">
                  <Glass variant="white" className="p-4">
                    <input 
                      type="email" 
                      placeholder="Email corporativo" 
                      className="w-full bg-transparent border-none outline-none text-white placeholder:text-white/70"
                    />
                  </Glass>
                  <Glass variant="white" className="p-4">
                    <input 
                      type="password" 
                      placeholder="Senha" 
                      className="w-full bg-transparent border-none outline-none text-white placeholder:text-white/70"
                    />
                  </Glass>
                  <GlassButton variant="accent" className="w-full text-white">
                    Acessar Dashboard →
                  </GlassButton>
                </div>
              </GlassPanel>

              {/* Dashboard Stats */}
              <GlassPanel variant="white" blur="lg" className="text-white">
                <h2 className="text-3xl mb-6">Métricas do RH</h2>
                <div className="space-y-4">
                  <Glass variant="white" className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">Candidatos Ativos</p>
                      <p className="text-3xl">248</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-brand-accent/30 flex items-center justify-center">
                      <span className="text-2xl">👥</span>
                    </div>
                  </Glass>
                  <Glass variant="white" className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">Vagas Abertas</p>
                      <p className="text-3xl">12</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-brand-accent/30 flex items-center justify-center">
                      <span className="text-2xl">💼</span>
                    </div>
                  </Glass>
                  <Glass variant="white" className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">Testes Pendentes</p>
                      <p className="text-3xl">64</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-brand-accent/30 flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                  </Glass>
                </div>
              </GlassPanel>
            </div>

            {/* Lista de candidatos */}
            <GlassCard variant="white" blur="lg" className="text-white max-w-6xl mx-auto">
              <h3 className="text-2xl mb-4">Últimos Candidatos</h3>
              <div className="space-y-3">
                {['Ana Silva - Assistente Odontológico', 'João Santos - Recepcionista', 'Maria Costa - Dentista'].map((name, idx) => (
                  <Glass key={idx} variant="white" className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        {name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white">{name}</p>
                        <p className="text-white/70 text-sm">Cadastro hoje</p>
                      </div>
                    </div>
                    <GlassButton variant="white" className="px-4 py-2 text-white">
                      Ver Perfil
                    </GlassButton>
                  </Glass>
                ))}
              </div>
            </GlassCard>
          </div>
        </BackgroundImage>
      </section>

      {/* 3. Combinação: Navbar Glass + Hero com gradiente turquesa */}
      <section className="relative h-screen">
        <BackgroundImage 
          background="gradient" 
          className="h-full"
          overlayColor="bg-black"
          overlayOpacity={15}
        >
          <GlassNavbar variant="white" blur="xl">
            <div className="container mx-auto flex items-center justify-between">
              <BeautySmileLogo type="horizontal" size="md" variant="white" />
              <div className="flex gap-4">
                <GlassButton variant="white" className="px-6 py-2 text-white">
                  Vagas
                </GlassButton>
                <GlassButton variant="white" className="px-6 py-2 text-white">
                  Login RH →
                </GlassButton>
              </div>
            </div>
          </GlassNavbar>
          
          <div className="flex items-center justify-center h-full">
            <GlassPanel variant="white" blur="xl" className="text-white text-center max-w-4xl">
              <div className="space-y-6">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
                  <BeautySmileLogo size="lg" variant="white" />
                </div>
                <h1 className="text-6xl mb-4 drop-shadow-lg">Beauty Smile</h1>
                <p className="text-2xl text-white/90 mb-8 drop-shadow-md">
                  Sistema de Recrutamento Inteligente
                </p>
                <p className="text-white/90 text-lg mb-8 drop-shadow-sm">
                  Tecnologia de ponta com design moderno em liquid glass.<br/>
                  Encontre os melhores talentos para sua equipe odontológica.
                </p>
                <div className="flex gap-4 justify-center">
                  <GlassButton variant="white" hover className="px-8 py-4 text-white text-lg drop-shadow-sm">
                    Candidatar-se a uma Vaga
                  </GlassButton>
                  <GlassButton variant="white" hover className="px-8 py-4 text-white text-lg drop-shadow-sm">
                    Área do RH
                  </GlassButton>
                </div>
              </div>
            </GlassPanel>
          </div>
        </BackgroundImage>
      </section>

      {/* 4. Exemplo de Questionário com Glass sobre Gradiente */}
      <section>
        <BackgroundImage 
          background="gradient" 
          className="min-h-screen py-20"
          overlayColor="bg-black"
          overlayOpacity={15}
        >
          <div className="container mx-auto px-4 max-w-3xl">
            <GlassCard variant="white" blur="xl" className="text-white">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                  <span className="text-3xl">🧠</span>
                </div>
                <h2 className="text-3xl mb-2 drop-shadow-md">Teste de Personalidade Big Five</h2>
                <p className="text-white/90 drop-shadow-sm">Questão 24 de 120</p>
              </div>

              <Glass variant="white" blur="lg" className="p-8 mb-6">
                <p className="text-xl text-white text-center mb-8 drop-shadow-sm">
                  "Eu gosto de conhecer pessoas novas e fazer amizades facilmente"
                </p>

                <div className="flex items-center justify-between mb-4 text-sm text-white/80 drop-shadow-sm">
                  <span>Discordo Totalmente</span>
                  <span>Concordo Totalmente</span>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      className="p-4 rounded-lg border-2 border-white/30 hover:border-white hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
                    >
                      <div className="w-12 h-12 rounded-full border-2 border-white/50 flex items-center justify-center mx-auto text-white text-xl">
                        {value}
                      </div>
                    </button>
                  ))}
                </div>
              </Glass>

              <div className="flex justify-between items-center">
                <GlassButton variant="white" className="px-6 py-3 text-white drop-shadow-sm">
                  ← Anterior
                </GlassButton>
                <p className="text-white/80 text-sm drop-shadow-sm">20% concluído</p>
                <GlassButton variant="white" className="px-6 py-3 text-white drop-shadow-sm">
                  Próxima →
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        </BackgroundImage>
      </section>
    </div>
  );
}
