import React, { useState } from 'react';
import { Toaster } from 'sonner@2.0.3';
import { Glass, GlassButton } from './components/ui/glass';
import { LandingPage } from './components/pages/LandingPage';
import { QuestionarioPage } from './components/pages/QuestionarioPage';
import { DashboardCandidatoPage } from './components/pages/DashboardCandidatoPage';
import { LoginRHPage } from './components/pages/LoginRHPage';
import { DashboardRHPage } from './components/pages/DashboardRHPage';
import { VagasPage } from './components/pages/VagasPage';
import { GlassShowcase } from './components/GlassShowcase';

type PageType = 'landing' | 'questionario' | 'dashboard-candidato' | 'login-rh' | 'dashboard-rh' | 'vagas' | 'showcase';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');

  const pages = [
    { id: 'landing' as PageType, label: 'Landing Page', icon: '🏠' },
    { id: 'vagas' as PageType, label: 'Vagas', icon: '💼' },
    { id: 'questionario' as PageType, label: 'Questionário', icon: '🧠' },
    { id: 'dashboard-candidato' as PageType, label: 'Dashboard Candidato', icon: '📊' },
    { id: 'login-rh' as PageType, label: 'Login RH', icon: '🔐' },
    { id: 'dashboard-rh' as PageType, label: 'Dashboard RH', icon: '👥' },
    { id: 'showcase' as PageType, label: 'Design Showcase', icon: '🎨' },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage />;
      case 'questionario':
        return <QuestionarioPage />;
      case 'dashboard-candidato':
        return <DashboardCandidatoPage />;
      case 'login-rh':
        return <LoginRHPage />;
      case 'dashboard-rh':
        return <DashboardRHPage />;
      case 'vagas':
        return <VagasPage />;
      case 'showcase':
        return <GlassShowcase />;
      default:
        return <LandingPage />;
    }
  };

  return (
    <>
      {/* Navegação flutuante */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <Glass variant="dark" blur="xl" className="px-6 py-3">
          <div className="flex gap-2 flex-wrap justify-center">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setCurrentPage(page.id)}
                className={`
                  px-4 py-2 rounded-lg transition-all duration-200 backdrop-blur-md
                  ${currentPage === page.id 
                    ? 'bg-white/30 text-white shadow-lg scale-105' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                  }
                `}
              >
                <span className="mr-2">{page.icon}</span>
                <span className="hidden md:inline">{page.label}</span>
              </button>
            ))}
          </div>
        </Glass>
      </div>

      {/* Página atual */}
      <div className={currentPage === 'showcase' ? '' : 'pt-24'}>
        {renderPage()}
      </div>

      <Toaster position="top-right" />
    </>
  );
}

export default App;
