import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Glass, GlassCard, GlassButton } from '../ui/glass';

export function VagasPage() {
  const vagas = [
    {
      titulo: 'Dentista Sênior',
      local: 'São Paulo, SP',
      tipo: 'Tempo integral',
      salario: 'R$ 8.000 - R$ 12.000',
      descricao: 'Buscamos dentista experiente para atendimento especializado em estética dental.',
      requisitos: ['CRO ativo', '5+ anos de experiência', 'Especialização em estética'],
      match: 92,
    },
    {
      titulo: 'Recepcionista',
      local: 'Rio de Janeiro, RJ',
      tipo: 'Tempo integral',
      salario: 'R$ 2.500 - R$ 3.500',
      descricao: 'Profissional para atendimento ao cliente e gestão de agendamentos.',
      requisitos: ['Ensino médio completo', 'Experiência em atendimento', 'Conhecimento em sistemas'],
      match: 85,
    },
    {
      titulo: 'Auxiliar de Dentista',
      local: 'Belo Horizonte, MG',
      tipo: 'Tempo integral',
      salario: 'R$ 2.000 - R$ 2.800',
      descricao: 'Auxiliar para apoio em procedimentos odontológicos.',
      requisitos: ['Curso técnico', 'Experiência mínima', 'Boa comunicação'],
      match: 78,
    },
  ];

  return (
    <div className="relative min-h-screen">
      <BackgroundImage 
        background="gradient" 
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 space-y-8">
          {/* Header */}
          <div className="text-center mb-12">
            <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-4" />
            <h1 className="text-white text-5xl mb-2 drop-shadow-lg">Vagas Disponíveis</h1>
            <p className="text-white/90 text-xl drop-shadow-md">Encontre sua próxima oportunidade na Beauty Smile</p>
          </div>

          {/* Filtros */}
          <Glass variant="white" blur="xl" className="p-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                <GlassButton variant="white" className="text-white drop-shadow-sm">
                  Todas as vagas
                </GlassButton>
                <GlassButton variant="white" className="text-white drop-shadow-sm">
                  Melhores matches
                </GlassButton>
                <GlassButton variant="white" className="text-white drop-shadow-sm">
                  Tempo integral
                </GlassButton>
              </div>
              <div className="text-white/80 drop-shadow-sm">
                {vagas.length} vagas encontradas
              </div>
            </div>
          </Glass>

          {/* Lista de vagas */}
          <div className="space-y-6">
            {vagas.map((vaga, index) => (
              <GlassCard key={index} variant="white" blur="xl" hover className="text-white">
                <div className="space-y-4">
                  {/* Header da vaga */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl drop-shadow-md">{vaga.titulo}</h2>
                        {vaga.match >= 80 && (
                          <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm backdrop-blur-md drop-shadow-sm">
                            {vaga.match}% match
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-white/80 drop-shadow-sm">
                        <span>📍 {vaga.local}</span>
                        <span>⏰ {vaga.tipo}</span>
                        <span>💰 {vaga.salario}</span>
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <span className="text-3xl">💼</span>
                    </div>
                  </div>

                  {/* Descrição */}
                  <Glass variant="white" blur="md" className="p-4">
                    <p className="text-white/90 drop-shadow-sm">{vaga.descricao}</p>
                  </Glass>

                  {/* Requisitos */}
                  <div>
                    <h3 className="text-white/80 mb-3 drop-shadow-sm">Requisitos:</h3>
                    <div className="flex flex-wrap gap-2">
                      {vaga.requisitos.map((req, idx) => (
                        <span 
                          key={idx}
                          className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-sm backdrop-blur-md border border-white/20 drop-shadow-sm"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3 pt-4">
                    <GlassButton variant="white" hover className="flex-1 py-3 text-white drop-shadow-sm">
                      Candidatar-se
                    </GlassButton>
                    <GlassButton variant="white" className="px-6 py-3 text-white drop-shadow-sm">
                      Salvar vaga
                    </GlassButton>
                  </div>

                  {/* Progress bar de match */}
                  {vaga.match >= 70 && (
                    <Glass variant="white" blur="sm" className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-white/80 text-sm drop-shadow-sm">Compatibilidade:</span>
                        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                          <div 
                            className="bg-white/60 h-full rounded-full drop-shadow-md transition-all duration-500"
                            style={{ width: `${vaga.match}%` }}
                          />
                        </div>
                        <span className="text-white drop-shadow-md">{vaga.match}%</span>
                      </div>
                    </Glass>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </BackgroundImage>
    </div>
  );
}
