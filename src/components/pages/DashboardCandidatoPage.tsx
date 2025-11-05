import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Glass, GlassPanel, GlassCard, GlassButton } from '../ui/glass';

export function DashboardCandidatoPage() {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage 
        background="gradient" 
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 space-y-8">
          <div className="text-center mb-12">
            <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-4" />
            <h1 className="text-white text-5xl mb-2 drop-shadow-lg">Dashboard de Candidato</h1>
            <p className="text-white/90 text-xl drop-shadow-md">Acompanhe seu progresso no processo seletivo</p>
          </div>

          {/* Estatísticas principais */}
          <GlassPanel variant="white" blur="xl" className="text-white">
            <h2 className="text-3xl mb-6 drop-shadow-md">Suas Estatísticas</h2>
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

          {/* Testes disponíveis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard variant="white" blur="xl" hover className="text-white">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl drop-shadow-md">Big Five</h3>
                    <p className="text-white/80 drop-shadow-sm">Teste de Personalidade</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/70 drop-shadow-sm">Concluído</div>
                    <div className="text-2xl drop-shadow-md">✓</div>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                  <div className="bg-white/60 h-full rounded-full drop-shadow-md" style={{ width: '100%' }} />
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="white" blur="xl" hover className="text-white">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <span className="text-2xl">💎</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl drop-shadow-md">DISC</h3>
                    <p className="text-white/80 drop-shadow-sm">Perfil Comportamental</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/70 drop-shadow-sm">Em Progresso</div>
                    <div className="text-2xl drop-shadow-md">45%</div>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                  <div className="bg-white/60 h-full rounded-full drop-shadow-md transition-all duration-500" style={{ width: '45%' }} />
                </div>
                <GlassButton variant="white" className="w-full text-white drop-shadow-sm">
                  Continuar Teste →
                </GlassButton>
              </div>
            </GlassCard>

            <GlassCard variant="white" blur="xl" hover className="text-white">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl drop-shadow-md">Inteligência</h3>
                    <p className="text-white/80 drop-shadow-sm">Raciocínio Lógico</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/70 drop-shadow-sm">Não Iniciado</div>
                    <div className="text-2xl drop-shadow-md">0%</div>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                  <div className="bg-white/60 h-full rounded-full drop-shadow-md" style={{ width: '0%' }} />
                </div>
                <GlassButton variant="white" className="w-full text-white drop-shadow-sm">
                  Iniciar Teste →
                </GlassButton>
              </div>
            </GlassCard>

            <GlassCard variant="white" blur="xl" hover className="text-white">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <span className="text-2xl">💼</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl drop-shadow-md">Vagas Compatíveis</h3>
                    <p className="text-white/80 drop-shadow-sm">Encontre sua posição ideal</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl drop-shadow-md">3</div>
                    <div className="text-sm text-white/70 drop-shadow-sm">Vagas</div>
                  </div>
                </div>
                <GlassButton variant="white" className="w-full text-white drop-shadow-sm">
                  Ver Vagas →
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        </div>
      </BackgroundImage>
    </div>
  );
}
