import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Glass, GlassPanel, GlassCard, GlassButton } from '../ui/glass';

export function DashboardRHPage() {
  const candidatos = [
    { nome: 'Ana Silva', vaga: 'Dentista', score: 92, status: 'Entrevista agendada' },
    { nome: 'Carlos Santos', vaga: 'Recepcionista', score: 88, status: 'Testes concluídos' },
    { nome: 'Mariana Costa', vaga: 'Auxiliar', score: 85, status: 'Em análise' },
  ];

  return (
    <div className="relative min-h-screen">
      <BackgroundImage 
        background="darkBlue" 
        className="min-h-screen py-8"
      >
        {/* Header/Navbar */}
        <Glass 
          variant="white" 
          blur="xl" 
          className="mx-4 mb-8 px-6 py-4"
        >
          <div className="flex items-center justify-between">
            <BeautySmileLogo type="horizontal" size="md" variant="white" />
            <div className="flex items-center gap-6">
              <nav className="flex gap-6 text-white/80">
                <a href="#" className="hover:text-white transition-colors">Dashboard</a>
                <a href="#" className="hover:text-white transition-colors">Candidatos</a>
                <a href="#" className="hover:text-white transition-colors">Vagas</a>
                <a href="#" className="hover:text-white transition-colors">Relatórios</a>
              </nav>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                <span className="text-white">RH</span>
              </div>
            </div>
          </div>
        </Glass>

        <div className="container mx-auto px-4 space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-white text-5xl mb-2">Dashboard RH</h1>
            <p className="text-white/80 text-xl">Gestão de Processos Seletivos</p>
          </div>

          {/* Métricas principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <GlassCard variant="white" blur="xl" hover className="text-white text-center">
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
                  <span className="text-2xl">👥</span>
                </div>
                <p className="text-4xl">142</p>
                <p className="text-white/80">Candidatos Ativos</p>
              </div>
            </GlassCard>

            <GlassCard variant="white" blur="xl" hover className="text-white text-center">
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
                  <span className="text-2xl">💼</span>
                </div>
                <p className="text-4xl">8</p>
                <p className="text-white/80">Vagas Abertas</p>
              </div>
            </GlassCard>

            <GlassCard variant="white" blur="xl" hover className="text-white text-center">
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-4xl">324</p>
                <p className="text-white/80">Testes Realizados</p>
              </div>
            </GlassCard>

            <GlassCard variant="white" blur="xl" hover className="text-white text-center">
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-4xl">23</p>
                <p className="text-white/80">Contratações</p>
              </div>
            </GlassCard>
          </div>

          {/* Candidatos em destaque */}
          <GlassPanel variant="white" blur="xl" className="text-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl">Candidatos em Destaque</h2>
              <GlassButton variant="white" className="text-white">
                Ver Todos →
              </GlassButton>
            </div>

            <div className="space-y-4">
              {candidatos.map((candidato, index) => (
                <Glass key={index} variant="white" blur="lg" hover className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                        <span className="text-white text-lg">{candidato.nome.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="text-white text-xl">{candidato.nome}</h3>
                        <p className="text-white/70">{candidato.vaga}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-white/70 text-sm">Score</p>
                        <p className="text-white text-2xl">{candidato.score}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/70 text-sm">Status</p>
                        <p className="text-white">{candidato.status}</p>
                      </div>
                      <GlassButton variant="white" className="text-white">
                        Ver Perfil
                      </GlassButton>
                    </div>
                  </div>
                </Glass>
              ))}
            </div>
          </GlassPanel>

          {/* Vagas recentes */}
          <GlassPanel variant="white" blur="xl" className="text-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl">Vagas Recentes</h2>
              <GlassButton variant="white" className="text-white">
                Nova Vaga +
              </GlassButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Glass variant="white" blur="lg" hover className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-xl">Dentista Sênior</h3>
                    <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm backdrop-blur-md">
                      12 candidatos
                    </span>
                  </div>
                  <p className="text-white/70">São Paulo, SP • Tempo integral</p>
                  <div className="flex gap-2">
                    <GlassButton variant="white" className="text-white text-sm">Ver candidatos</GlassButton>
                    <GlassButton variant="white" className="text-white text-sm">Editar</GlassButton>
                  </div>
                </div>
              </Glass>

              <Glass variant="white" blur="lg" hover className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-xl">Recepcionista</h3>
                    <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm backdrop-blur-md">
                      28 candidatos
                    </span>
                  </div>
                  <p className="text-white/70">Rio de Janeiro, RJ • Meio período</p>
                  <div className="flex gap-2">
                    <GlassButton variant="white" className="text-white text-sm">Ver candidatos</GlassButton>
                    <GlassButton variant="white" className="text-white text-sm">Editar</GlassButton>
                  </div>
                </div>
              </Glass>
            </div>
          </GlassPanel>
        </div>
      </BackgroundImage>
    </div>
  );
}
