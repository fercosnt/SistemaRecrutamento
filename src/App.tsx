import React, { useState } from 'react';
import { Toaster } from 'sonner@2.0.3';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet';
import { LandingPage } from './components/pages/LandingPage';
import { QuestionarioPage } from './components/pages/QuestionarioPage';
import { DashboardCandidatoPage } from './components/pages/DashboardCandidatoPage';
import { LoginRHPage } from './components/pages/LoginRHPage';
import { DashboardRHPage } from './components/pages/DashboardRHPage';
import { VagasPage } from './components/pages/VagasPage';
import { VagaLPPage } from './components/pages/VagaLPPage';
import { GlassShowcase } from './components/GlassShowcase';

type PageType = 'landing' | 'questionario' | 'dashboard-candidato' | 'login-rh' | 'dashboard-rh' | 'vagas' | 'vaga-lp' | 'showcase';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const pages = [
    { id: 'landing' as PageType, label: 'Landing Page', icon: '🏠' },
    { id: 'vagas' as PageType, label: 'Vagas', icon: '💼' },
    { id: 'vaga-lp' as PageType, label: 'LP Divulgação Vaga', icon: '📄' },
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
      case 'vaga-lp':
        return <VagaLPPage />;
      case 'showcase':
        return <GlassShowcase />;
      default:
        return <LandingPage />;
    }
  };

  const handlePageChange = (pageId: PageType) => {
    setCurrentPage(pageId);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Botão flutuante para abrir menu */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#00109E] hover:bg-[#00109E]/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center backdrop-blur-md border-2 border-white/20"
            aria-label="Menu de navegação"
          >
            <Menu size={24} />
          </button>
        </SheetTrigger>

        <SheetContent 
          side="right" 
          className="w-80 bg-[#00109E]/95 backdrop-blur-xl border-l border-white/20 text-white"
        >
          <SheetHeader>
            <SheetTitle className="text-white text-2xl">Navegação</SheetTitle>
            <SheetDescription className="text-white/70">
              Menu provisório para navegar entre as páginas do sistema
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 space-y-2">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => handlePageChange(page.id)}
                className={`
                  w-full text-left px-4 py-3 rounded-lg transition-all duration-200
                  flex items-center gap-3
                  ${currentPage === page.id 
                    ? 'bg-white/20 text-white shadow-md' 
                    : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <span className="text-2xl">{page.icon}</span>
                <span>{page.label}</span>
              </button>
            ))}
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="p-4 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
              <p className="text-white/70 text-sm">
                Menu provisório de navegação entre páginas
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Página atual */}
      <div>
        {renderPage()}
      </div>

      <Toaster position="top-right" />
    </>
  );
}

export default App;
