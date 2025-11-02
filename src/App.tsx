import React, { useState } from 'react';
import { Toaster } from 'sonner@2.0.3';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet';
import { ScrollArea } from './components/ui/scroll-area';
import { LandingPage } from './components/pages/LandingPage';
import { QuestionarioPage } from './components/pages/QuestionarioPage';
import { DashboardCandidatoPage } from './components/pages/DashboardCandidatoPage';
import { LoginRHPage } from './components/pages/LoginRHPage';
import { DashboardRHPage } from './components/pages/DashboardRHPage';
import { CandidatosRHPage } from './components/pages/CandidatosRHPage';
import { PerfilCandidatoRHPage } from './components/pages/PerfilCandidatoRHPage';
import { VagasRHPage } from './components/pages/VagasRHPage';
import { CriarEditarVagaPage } from './components/pages/CriarEditarVagaPage';
import { VagaLPPage } from './components/pages/VagaLPPage';
import { InscricaoPage } from './components/pages/InscricaoPage';
import { LoginCandidatoPage } from './components/pages/LoginCandidatoPage';
import { InstrucoesFormularioPage } from './components/pages/InstrucoesFormularioPage';
import { FormularioCandidaturaPage } from './components/pages/FormularioCandidaturaPage';
import { InstrucoesDISCPage } from './components/pages/InstrucoesDISCPage';
import { InstrucoesBigFivePage } from './components/pages/InstrucoesBigFivePage';
import { InstrucoesRavenPage } from './components/pages/InstrucoesRavenPage';
import { TesteBigFivePage } from './components/pages/TesteBigFivePage';
import { TesteDISCPage } from './components/pages/TesteDISCPage';
import { TesteRavenPage } from './components/pages/TesteRavenPage';
import { ConclusaoTestesPage } from './components/pages/ConclusaoTestesPage';
import { ManifestoPage } from './components/pages/ManifestoPage';
import { QuestionarioCulturaPage } from './components/pages/QuestionarioCulturaPage';
import { EsqueciSenhaPage } from './components/pages/EsqueciSenhaPage';
import { RedefinirSenhaPage } from './components/pages/RedefinirSenhaPage';
import { GlassShowcase } from './components/GlassShowcase';
import { ConfiguracoesPage } from './components/pages/ConfiguracoesPage';
import { MeuPerfilPage } from './components/pages/MeuPerfilPage';
import { MeuPerfilCandidatoPage } from './components/pages/MeuPerfilCandidatoPage';
import { VagasPublicasPage } from './components/pages/VagasPublicasPage';

type PageType = 'landing' | 'questionario' | 'dashboard-candidato' | 'login-rh' | 'dashboard-rh' | 'candidatos-rh' | 'perfil-candidato-rh' | 'vagas-publicas' | 'vagas-rh' | 'criar-vaga' | 'vaga-lp' | 'inscricao' | 'login-candidato' | 'esqueci-senha' | 'redefinir-senha' | 'instrucoes-formulario' | 'formulario-candidatura' | 'manifesto' | 'questionario-cultura' | 'instrucoes-disc' | 'instrucoes-bigfive' | 'instrucoes-raven' | 'teste-bigfive' | 'teste-disc' | 'teste-raven' | 'conclusao-testes' | 'showcase' | 'configuracoes' | 'meu-perfil' | 'meu-perfil-candidato';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const pages = [
    { id: 'landing' as PageType, label: 'Landing Page', icon: '🏠' },
    { id: 'vagas-publicas' as PageType, label: 'Vagas Públicas', icon: '💼' },
    { id: 'vaga-lp' as PageType, label: 'LP Divulgação Vaga', icon: '📄' },
    { id: 'inscricao' as PageType, label: 'Inscrição Candidato', icon: '📝' },
    { id: 'login-candidato' as PageType, label: 'Login Candidato', icon: '🔑' },
    { id: 'esqueci-senha' as PageType, label: 'Esqueci Minha Senha', icon: '🔓' },
    { id: 'redefinir-senha' as PageType, label: 'Redefinir Senha', icon: '🔐' },
    { id: 'instrucoes-formulario' as PageType, label: 'Instruções Formulário', icon: '📹' },
    { id: 'formulario-candidatura' as PageType, label: 'Formulário Candidatura', icon: '📋' },
    { id: 'manifesto' as PageType, label: 'Manifesto Beauty Smile', icon: '🦷' },
    { id: 'questionario-cultura' as PageType, label: 'Questionário Cultura', icon: '💬' },
    { id: 'instrucoes-disc' as PageType, label: 'Instruções Teste DISC', icon: '🎯' },
    { id: 'instrucoes-bigfive' as PageType, label: 'Instruções Teste Big Five', icon: '🎨' },
    { id: 'instrucoes-raven' as PageType, label: 'Instruções Teste Raven', icon: '🧩' },
    { id: 'teste-bigfive' as PageType, label: 'Teste Big Five', icon: '✍️' },
    { id: 'teste-disc' as PageType, label: 'Teste DISC', icon: '����' },
    { id: 'teste-raven' as PageType, label: 'Teste Raven', icon: '🧩' },
    { id: 'conclusao-testes' as PageType, label: 'Conclusão Testes', icon: '✅' },
    { id: 'questionario' as PageType, label: 'Questionário', icon: '🧠' },
    { id: 'dashboard-candidato' as PageType, label: 'Dashboard Candidato', icon: '📊' },
    { id: 'login-rh' as PageType, label: 'Login RH', icon: '🔐' },
    { id: 'dashboard-rh' as PageType, label: 'Dashboard RH', icon: '📊' },
    { id: 'vagas-rh' as PageType, label: 'Vagas RH', icon: '📋' },
    { id: 'criar-vaga' as PageType, label: 'Criar/Editar Vaga', icon: '✨' },
    { id: 'candidatos-rh' as PageType, label: 'Candidatos RH', icon: '👥' },
    { id: 'perfil-candidato-rh' as PageType, label: 'Perfil Candidato RH', icon: '👤' },
    { id: 'configuracoes' as PageType, label: 'Configurações', icon: '⚙️' },
    { id: 'meu-perfil' as PageType, label: 'Meu Perfil (RH)', icon: '👤' },
    { id: 'meu-perfil-candidato' as PageType, label: 'Meu Perfil (Candidato)', icon: '👤' },
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
      case 'candidatos-rh':
        return <CandidatosRHPage />;
      case 'perfil-candidato-rh':
        return <PerfilCandidatoRHPage />;
      case 'vagas-publicas':
        return <VagasPublicasPage />;
      case 'vagas-rh':
        return <VagasRHPage onNovaVaga={() => setCurrentPage('criar-vaga')} />;
      case 'criar-vaga':
        return <CriarEditarVagaPage onVoltar={() => setCurrentPage('vagas-rh')} />;
      case 'vaga-lp':
        return <VagaLPPage onCandidatar={() => setCurrentPage('inscricao')} />;
      case 'inscricao':
        return <InscricaoPage />;
      case 'login-candidato':
        return <LoginCandidatoPage onEsqueciSenha={() => setCurrentPage('esqueci-senha')} />;
      case 'esqueci-senha':
        return <EsqueciSenhaPage onVoltarLogin={() => setCurrentPage('login-candidato')} />;
      case 'redefinir-senha':
        return <RedefinirSenhaPage onVoltarLogin={() => setCurrentPage('login-candidato')} token="abc123xyz456" />;
      case 'instrucoes-formulario':
        return <InstrucoesFormularioPage />;
      case 'formulario-candidatura':
        return <FormularioCandidaturaPage />;
      case 'manifesto':
        return <ManifestoPage />;
      case 'questionario-cultura':
        return <QuestionarioCulturaPage />;
      case 'instrucoes-disc':
        return <InstrucoesDISCPage />;
      case 'instrucoes-bigfive':
        return <InstrucoesBigFivePage />;
      case 'instrucoes-raven':
        return <InstrucoesRavenPage />;
      case 'teste-bigfive':
        return <TesteBigFivePage />;
      case 'teste-disc':
        return <TesteDISCPage />;
      case 'teste-raven':
        return <TesteRavenPage />;
      case 'conclusao-testes':
        return <ConclusaoTestesPage />;
      case 'configuracoes':
        return <ConfiguracoesPage />;
      case 'meu-perfil':
        return <MeuPerfilPage />;
      case 'meu-perfil-candidato':
        return <MeuPerfilCandidatoPage />;
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

          <ScrollArea className="h-[calc(100vh-220px)] mt-8 pr-4">
            <div className="space-y-2">
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
          </ScrollArea>

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
