import React from 'react';
import { GlassCard, GlassButton, Glass } from '../ui/glass';

/**
 * Exemplos de Cards reutilizáveis do Design System
 * Use como referência para criar novos cards
 */

// ============================================
// 1. CARD DE FEATURE COM ÍCONE
// ============================================
export function FeatureCard({ 
  icon, 
  title, 
  description, 
  action 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  action?: { label: string; onClick: () => void };
}) {
  return (
    <GlassCard variant="white" blur="xl" hover className="text-white">
      <div className="space-y-3">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
          <span className="text-3xl">{icon}</span>
        </div>
        <h3 className="text-2xl drop-shadow-md">{title}</h3>
        <p className="text-white/90 drop-shadow-sm">{description}</p>
        {action && (
          <GlassButton 
            variant="white" 
            className="w-full mt-4 text-white drop-shadow-sm"
            onClick={action.onClick}
          >
            {action.label} →
          </GlassButton>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================
// 2. CARD DE ESTATÍSTICA
// ============================================
export function StatCard({ 
  icon, 
  value, 
  label 
}: { 
  icon: string; 
  value: string | number; 
  label: string;
}) {
  return (
    <GlassCard variant="white" blur="xl" hover className="text-white text-center">
      <div className="space-y-2">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
          <span className="text-2xl">{icon}</span>
        </div>
        <p className="text-4xl drop-shadow-md">{value}</p>
        <p className="text-white/80 drop-shadow-sm">{label}</p>
      </div>
    </GlassCard>
  );
}

// ============================================
// 3. CARD DE VAGA COM MATCH
// ============================================
export function VagaCard({ 
  titulo, 
  local, 
  tipo, 
  salario, 
  match,
  onCandidatar 
}: { 
  titulo: string;
  local: string;
  tipo: string;
  salario: string;
  match?: number;
  onCandidatar?: () => void;
}) {
  return (
    <GlassCard variant="white" blur="xl" hover className="text-white">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-3xl drop-shadow-md">{titulo}</h3>
              {match && match >= 70 && (
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm backdrop-blur-md drop-shadow-sm">
                  {match}% match
                </span>
              )}
            </div>
            <div className="flex gap-4 text-white/80 drop-shadow-sm">
              <span>📍 {local}</span>
              <span>⏰ {tipo}</span>
              <span>💰 {salario}</span>
            </div>
          </div>
        </div>

        {/* Ação */}
        <GlassButton 
          variant="white" 
          hover 
          className="w-full text-white drop-shadow-sm"
          onClick={onCandidatar}
        >
          Candidatar-se
        </GlassButton>

        {/* Progress bar de match */}
        {match && match >= 70 && (
          <Glass variant="white" blur="sm" className="p-3">
            <div className="flex items-center gap-3">
              <span className="text-white/80 text-sm drop-shadow-sm">Compatibilidade:</span>
              <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                <div 
                  className="bg-white/60 h-full rounded-full drop-shadow-md transition-all duration-500"
                  style={{ width: `${match}%` }}
                />
              </div>
              <span className="text-white drop-shadow-md">{match}%</span>
            </div>
          </Glass>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================
// 4. CARD DE TESTE COM PROGRESSO
// ============================================
export function TestCard({ 
  icon,
  titulo, 
  subtitulo, 
  progresso,
  status,
  onAction
}: { 
  icon: string;
  titulo: string;
  subtitulo: string;
  progresso: number;
  status: 'concluido' | 'em-progresso' | 'nao-iniciado';
  onAction?: () => void;
}) {
  const statusLabels = {
    'concluido': 'Concluído',
    'em-progresso': 'Em Progresso',
    'nao-iniciado': 'Não Iniciado'
  };

  const actionLabels = {
    'concluido': 'Ver Resultado',
    'em-progresso': 'Continuar Teste →',
    'nao-iniciado': 'Iniciar Teste →'
  };

  return (
    <GlassCard variant="white" blur="xl" hover className="text-white">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl drop-shadow-md">{titulo}</h3>
            <p className="text-white/80 drop-shadow-sm">{subtitulo}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/70 drop-shadow-sm">{statusLabels[status]}</div>
            <div className="text-2xl drop-shadow-md">
              {status === 'concluido' ? '✓' : `${progresso}%`}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
          <div 
            className="bg-white/60 h-full rounded-full drop-shadow-md transition-all duration-500" 
            style={{ width: `${progresso}%` }} 
          />
        </div>

        {/* Ação */}
        {status !== 'concluido' && (
          <GlassButton 
            variant="white" 
            className="w-full text-white drop-shadow-sm"
            onClick={onAction}
          >
            {actionLabels[status]}
          </GlassButton>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================
// 5. CARD DE CANDIDATO (Para RH)
// ============================================
export function CandidatoCard({ 
  nome,
  vaga,
  score,
  status,
  onVerPerfil
}: { 
  nome: string;
  vaga: string;
  score: number;
  status: string;
  onVerPerfil?: () => void;
}) {
  return (
    <Glass variant="white" blur="lg" hover className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
            <span className="text-white text-lg">{nome.charAt(0)}</span>
          </div>
          <div>
            <h3 className="text-white text-xl">{nome}</h3>
            <p className="text-white/70">{vaga}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-white/70 text-sm">Score</p>
            <p className="text-white text-2xl">{score}%</p>
          </div>
          <div className="text-center">
            <p className="text-white/70 text-sm">Status</p>
            <p className="text-white">{status}</p>
          </div>
          <GlassButton 
            variant="white" 
            className="text-white"
            onClick={onVerPerfil}
          >
            Ver Perfil
          </GlassButton>
        </div>
      </div>
    </Glass>
  );
}

// ============================================
// 6. CARD DE INFORMAÇÃO COM ÍCONE LATERAL
// ============================================
export function InfoCard({ 
  icon,
  title,
  description
}: { 
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Glass variant="white" blur="sm" className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md flex-shrink-0">
          <span className="text-xl">{icon}</span>
        </div>
        <div>
          <p className="text-white text-sm mb-1">{title}</p>
          <p className="text-white/70 text-xs">{description}</p>
        </div>
      </div>
    </Glass>
  );
}
