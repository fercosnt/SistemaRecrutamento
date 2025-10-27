import React, { useState } from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { Glass, GlassCard, GlassButton } from '../ui/glass';

export function QuestionarioPage() {
  const [selectedValue, setSelectedValue] = useState<number>(3);

  return (
    <div className="relative min-h-screen">
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

              {/* Escala de resposta */}
              <div className="flex gap-3 justify-center">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSelectedValue(value)}
                    className={`w-14 h-14 rounded-full backdrop-blur-md border-2 transition-all duration-200 drop-shadow-md ${
                      selectedValue === value
                        ? 'bg-white/40 border-white scale-110'
                        : 'bg-white/10 border-white/30 hover:bg-white/20 hover:scale-105'
                    }`}
                  >
                    <span className="text-white">{value}</span>
                  </button>
                ))}
              </div>
            </Glass>

            {/* Progress Bar */}
            <Glass variant="white" blur="md" className="p-4 mb-6">
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                <div 
                  className="bg-white/60 h-full rounded-full transition-all duration-500 drop-shadow-md"
                  style={{ width: '20%' }}
                />
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
    </div>
  );
}
