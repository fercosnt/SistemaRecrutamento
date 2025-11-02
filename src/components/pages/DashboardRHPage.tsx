import React, { useState } from 'react';
import { RHLayout } from '../RHLayout';
import { MetricCard } from '../MetricCard';
import { Glass, GlassButton } from '../ui/glass';
import {
  Briefcase,
  Users,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  ArrowRight,
} from 'lucide-react';

export function DashboardRHPage() {
  const [currentPage, setCurrentPage] = useState('dashboard-rh');

  // Mock data
  const vagasRecentes = [
    {
      id: 1,
      titulo: 'Assistente Odontológico',
      icon: '📌',
      localizacao: 'São Paulo, SP',
      tipo: 'CLT',
      diasAtras: 2,
      stats: {
        candidatos: 8,
        emAnalise: 5,
        aprovados: 3,
      },
    },
    {
      id: 2,
      titulo: 'Dentista Clínico Geral',
      icon: '🦷',
      localizacao: 'Rio de Janeiro, RJ',
      tipo: 'PJ',
      diasAtras: 5,
      stats: {
        candidatos: 12,
        emAnalise: 8,
        aprovados: 2,
      },
    },
    {
      id: 3,
      titulo: 'Recepcionista',
      icon: '💼',
      localizacao: 'Belo Horizonte, MG',
      tipo: 'CLT',
      diasAtras: 7,
      stats: {
        candidatos: 15,
        emAnalise: 10,
        aprovados: 4,
      },
    },
  ];

  const candidatosAguardando = [
    {
      id: 1,
      nome: 'Maria Santos',
      vaga: 'Assistente Odontológico',
      avatar: 'MS',
      score: 92,
      diasAguardando: 2,
    },
    {
      id: 2,
      nome: 'João Silva',
      vaga: 'Dentista Clínico Geral',
      avatar: 'JS',
      score: 88,
      diasAguardando: 3,
    },
    {
      id: 3,
      nome: 'Ana Costa',
      vaga: 'Recepcionista',
      avatar: 'AC',
      score: 95,
      diasAguardando: 1,
    },
    {
      id: 4,
      nome: 'Pedro Oliveira',
      vaga: 'Assistente Odontológico',
      avatar: 'PO',
      score: 87,
      diasAguardando: 4,
    },
  ];

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
    console.log('Navegando para:', pageId);
  };

  const handleLogout = () => {
    console.log('Logout');
  };

  return (
    <RHLayout
      activePage={currentPage}
      onNavigate={handleNavigation}
      userName="João Silva"
      userRole="Administrador"
      notificationCount={3}
      onSearch={(query) => console.log('Buscar:', query)}
      onProfileClick={() => console.log('Perfil')}
      onSettingsClick={() => handleNavigation('configuracoes-rh')}
      onLogout={handleLogout}
    >
      <div className="space-y-8">
        {/* Header com saudação */}
        <div className="space-y-2">
          <h1 className="text-white drop-shadow-lg">
            Olá, João Silva 👋
          </h1>
          <p className="text-white/80 text-xl drop-shadow-md">
            Aqui está um resumo do seu recrutamento
          </p>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={<Briefcase size={48} />}
            value="12"
            label="Vagas Ativas"
            trend={{ value: '+2 este mês', direction: 'up' }}
            variant="primary"
          />
          <MetricCard
            icon={<Users size={48} />}
            value="45"
            label="Candidatos"
            trend={{ value: '+12 hoje', direction: 'up' }}
            variant="success"
          />
          <MetricCard
            icon={<CheckCircle size={48} />}
            value="8"
            label="Aprovados"
            trend={{ value: '+3 hoje', direction: 'up' }}
            variant="success"
          />
          <MetricCard
            icon={<Clock size={48} />}
            value="15"
            label="Em Análise"
            trend={{ value: '-4 hoje', direction: 'down' }}
            variant="warning"
          />
        </div>

        {/* Vagas Recentes */}
        <Glass variant="white" blur="xl" className="p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white drop-shadow-md">
              📋 Vagas Recentes
            </h2>
            <button className="text-sm text-white/90 hover:text-white transition-colors duration-200 flex items-center gap-2 drop-shadow-sm">
              Ver Todas
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {vagasRecentes.map((vaga) => (
              <Glass
                key={vaga.id}
                variant="white"
                blur="lg"
                hover
                className="p-6 rounded-xl transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Header da vaga */}
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{vaga.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-white text-xl drop-shadow-sm">
                        {vaga.titulo}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-white/70 text-sm drop-shadow-sm">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {vaga.localizacao}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          💼 {vaga.tipo}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Há {vaga.diasAtras} dias
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats dos candidatos */}
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    <div className="text-center p-2 md:p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                      <div className="text-2xl text-white drop-shadow-sm">
                        {vaga.stats.candidatos}
                      </div>
                      <div className="text-xs md:text-sm text-white/70 mt-1 drop-shadow-sm break-words">
                        Candidatos
                      </div>
                    </div>
                    <div className="text-center p-2 md:p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                      <div className="text-2xl text-white drop-shadow-sm">
                        {vaga.stats.emAnalise}
                      </div>
                      <div className="text-xs md:text-sm text-white/70 mt-1 drop-shadow-sm break-words">
                        Análise
                      </div>
                    </div>
                    <div className="text-center p-2 md:p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                      <div className="text-2xl text-white drop-shadow-sm">
                        {vaga.stats.aprovados}
                      </div>
                      <div className="text-xs md:text-sm text-white/70 mt-1 drop-shadow-sm break-words">
                        Aprovados
                      </div>
                    </div>
                  </div>

                  {/* Botão de ação */}
                  <GlassButton
                    variant="white"
                    className="w-full text-white drop-shadow-sm"
                  >
                    Gerenciar Vaga →
                  </GlassButton>
                </div>
              </Glass>
            ))}
          </div>
        </Glass>

        {/* Candidatos Aguardando Análise */}
        <Glass variant="white" blur="xl" className="p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white drop-shadow-md">
              🎯 Candidatos Aguardando Análise
            </h2>
            <button className="text-sm text-white/90 hover:text-white transition-colors duration-200 flex items-center gap-2 drop-shadow-sm">
              Ver Todos
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidatosAguardando.map((candidato) => (
              <Glass
                key={candidato.id}
                variant="white"
                blur="lg"
                hover
                className="p-5 rounded-xl transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-[#35BFAD] flex items-center justify-center flex-shrink-0 text-white drop-shadow-md">
                    {candidato.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white truncate drop-shadow-sm">
                      {candidato.nome}
                    </h4>
                    <p className="text-sm text-white/70 truncate drop-shadow-sm">
                      {candidato.vaga}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-white/60 drop-shadow-sm">
                        Score: {candidato.score}%
                      </span>
                      <span className="text-xs text-white/60 drop-shadow-sm">
                        • {candidato.diasAguardando}d aguardando
                      </span>
                    </div>
                  </div>

                  {/* Botão de ação */}
                  <button className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-all duration-200 flex-shrink-0 drop-shadow-sm backdrop-blur-sm">
                    Analisar
                  </button>
                </div>
              </Glass>
            ))}
          </div>
        </Glass>
      </div>
    </RHLayout>
  );
}
