/**
 * Definição de rotas da aplicação Beauty Smile
 *
 * Este arquivo centraliza todas as rotas do sistema, organizadas por
 * área de funcionalidade: público, candidato, RH/Admin
 */

import { RouteObject } from 'react-router-dom'

// Páginas Públicas
import { LandingPage } from '../components/pages/LandingPage'
import { VagasPublicasPage } from '../components/pages/VagasPublicasPage'
import { VagaDetalhePage } from '../components/pages/VagaDetalhePage'
import { ManifestoPage } from '../components/pages/ManifestoPage'
import { GlassShowcase } from '../components/GlassShowcase'

// Páginas de Autenticação e Cadastro
import { InscricaoPage } from '../components/pages/InscricaoPage'
import { CadastroPage } from '../components/pages/CadastroPage'
import { LoginCandidatoPage } from '../components/pages/LoginCandidatoPage'
import { LoginRHPage } from '../components/pages/LoginRHPage'
import { EsqueciSenhaPage } from '../components/pages/EsqueciSenhaPage'
import { RedefinirSenhaPage } from '../components/pages/RedefinirSenhaPage'

// Páginas do Candidato
import { DashboardCandidatoPage } from '../components/pages/DashboardCandidatoPage'
import { MeuPerfilCandidatoPage } from '../components/pages/MeuPerfilCandidatoPage'
import { InstrucoesFormularioPage } from '../components/pages/InstrucoesFormularioPage'
import { FormularioCandidaturaPage } from '../components/pages/FormularioCandidaturaPage'
import { QuestionarioCulturaPage } from '../components/pages/QuestionarioCulturaPage'

// Protected Route HOCs
import { ProtectedRoute } from '../components/ProtectedRoute'
import { ProtectedAdminRoute } from '../components/ProtectedAdminRoute'

// Error Boundary
import { ErrorBoundary } from '../components/ErrorBoundary'

// Testes Psicométricos
import { InstrucoesBigFivePage } from '../components/pages/InstrucoesBigFivePage'
import { InstrucoesDISCPage } from '../components/pages/InstrucoesDISCPage'
import { InstrucoesRavenPage } from '../components/pages/InstrucoesRavenPage'
import { TesteBigFivePage } from '../components/pages/TesteBigFivePage'
import { TesteDISCPage } from '../components/pages/TesteDISCPage'
import { TesteRavenPage } from '../components/pages/TesteRavenPage'
import { ConclusaoTestesPage } from '../components/pages/ConclusaoTestesPage'
import { QuestionarioPage } from '../components/pages/QuestionarioPage'

// Páginas RH/Admin
import { DashboardRHPage } from '../components/pages/DashboardRHPage'
import { CandidatosRHPage } from '../components/pages/CandidatosRHPage'
import { PerfilCandidatoRHPage } from '../components/pages/PerfilCandidatoRHPage'
import { VagasRHPage } from '../components/pages/VagasRHPage'
import { VagaCandidatosRHPage } from '../components/pages/VagaCandidatosRHPage'
import { CriarEditarVagaPage } from '../components/pages/CriarEditarVagaPage'
import { ConfiguracoesPage } from '../components/pages/ConfiguracoesPage'
import { MeuPerfilPage } from '../components/pages/MeuPerfilPage'
import { SuporteRHPage } from '../components/pages/SuporteRHPage'
import { RelatoriosRHPage } from '../components/pages/RelatoriosRHPage'

/**
 * Configuração de rotas da aplicação
 *
 * Organizadas em categorias:
 * - Rotas públicas (/)
 * - Rotas de autenticação (/auth/*)
 * - Rotas de candidato (/candidato/*)
 * - Rotas de testes (/testes/*)
 * - Rotas RH/Admin (/rh/*)
 */
export const routes: RouteObject[] = [
  // ============================
  // ROTAS PÚBLICAS
  // ============================
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/vagas',
    element: <VagasPublicasPage />,
  },
  {
    path: '/vagas/:id',
    element: <VagaDetalhePage />,
  },
  {
    path: '/manifesto',
    element: <ManifestoPage />,
  },
  {
    path: '/showcase',
    element: <GlassShowcase />,
  },

  // ============================
  // ROTAS DE AUTENTICAÇÃO
  // ============================
  {
    path: '/auth/inscricao',
    element: <InscricaoPage />,
  },
  {
    path: '/cadastro',
    element: <CadastroPage />,
  },
  {
    path: '/auth/login',
    element: <LoginCandidatoPage />,
  },
  {
    path: '/auth/login-rh',
    element: <LoginRHPage />,
  },
  {
    path: '/auth/esqueci-senha',
    element: (
      <ErrorBoundary>
        <EsqueciSenhaPage />
      </ErrorBoundary>
    ),
  },
  {
    path: '/auth/redefinir-senha',
    element: (
      <ErrorBoundary>
        <RedefinirSenhaPage />
      </ErrorBoundary>
    ),
  },

  // ============================
  // ROTAS DO CANDIDATO
  // ============================
  {
    path: '/candidato/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardCandidatoPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/candidato/perfil',
    element: (
      <ProtectedRoute>
        <MeuPerfilCandidatoPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/candidato/candidatura/instrucoes',
    element: (
      <ProtectedRoute>
        <InstrucoesFormularioPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/candidato/candidatura/formulario/:vagaId',
    element: (
      <ProtectedRoute>
        <FormularioCandidaturaPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/candidato/questionario-cultura',
    element: (
      <ProtectedRoute>
        <QuestionarioCulturaPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/candidato/questionario',
    element: (
      <ProtectedRoute>
        <QuestionarioPage />
      </ProtectedRoute>
    ),
  },

  // ============================
  // ROTAS DE TESTES
  // ============================
  {
    path: '/testes/bigfive/instrucoes',
    element: (
      <ProtectedRoute>
        <InstrucoesBigFivePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/testes/bigfive',
    element: (
      <ProtectedRoute>
        <TesteBigFivePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/testes/disc/instrucoes',
    element: (
      <ProtectedRoute>
        <InstrucoesDISCPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/testes/disc',
    element: (
      <ProtectedRoute>
        <TesteDISCPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/testes/raven/instrucoes',
    element: (
      <ProtectedRoute>
        <InstrucoesRavenPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/testes/raven',
    element: (
      <ProtectedRoute>
        <TesteRavenPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/testes/conclusao',
    element: (
      <ProtectedRoute>
        <ConclusaoTestesPage />
      </ProtectedRoute>
    ),
  },

  // ============================
  // ROTAS RH/ADMIN
  // ============================
  {
    path: '/rh/dashboard',
    element: (
      <ProtectedAdminRoute>
        <DashboardRHPage />
      </ProtectedAdminRoute>
    ),
  },
  {
    path: '/rh/candidatos',
    element: (
      <ProtectedAdminRoute>
        <CandidatosRHPage />
      </ProtectedAdminRoute>
    ),
  },
  {
    path: '/rh/candidatos/:id',
    element: (
      <ProtectedAdminRoute>
        <PerfilCandidatoRHPage />
      </ProtectedAdminRoute>
    ),
  },
  {
    path: '/rh/vagas',
    element: (
      <ProtectedAdminRoute>
        <VagasRHPage />
      </ProtectedAdminRoute>
    ),
  },
  {
    path: '/rh/vagas/nova',
    element: (
      <ProtectedAdminRoute>
        <CriarEditarVagaPage />
      </ProtectedAdminRoute>
    ),
  },
  {
    path: '/rh/vagas/:id/editar',
    element: (
      <ProtectedAdminRoute>
        <CriarEditarVagaPage />
      </ProtectedAdminRoute>
    ),
  },
  {
    path: '/rh/vagas/:id/candidatos',
    element: (
      <ProtectedAdminRoute>
        <VagaCandidatosRHPage />
      </ProtectedAdminRoute>
    ),
  },
  {
    path: '/rh/perfil',
    element: (
      <ProtectedAdminRoute>
        <MeuPerfilPage />
      </ProtectedAdminRoute>
    ),
  },
  {
    path: '/rh/configuracoes',
    element: (
      <ProtectedAdminRoute requireRole="administrador">
        <ConfiguracoesPage />
      </ProtectedAdminRoute>
    ),
  },
  {
    path: '/rh/suporte',
    element: (
      <ProtectedAdminRoute>
        <SuporteRHPage />
      </ProtectedAdminRoute>
    ),
  },
  {
    path: '/rh/relatorios',
    element: (
      <ProtectedAdminRoute>
        <RelatoriosRHPage />
      </ProtectedAdminRoute>
    ),
  },
]

/**
 * Mapa de páginas para o menu de navegação de desenvolvimento
 *
 * Este mapa será usado no menu flutuante para facilitar a navegação
 * durante o desenvolvimento
 */
export const devNavigationPages = [
  { path: '/', label: 'Landing Page', icon: '🏠', category: 'Público' },
  { path: '/vagas', label: 'Vagas Públicas', icon: '💼', category: 'Público' },
  { path: '/vagas/1', label: 'LP Divulgação Vaga', icon: '📄', category: 'Público' },
  { path: '/manifesto', label: 'Manifesto Beauty Smile', icon: '🦷', category: 'Público' },
  { path: '/auth/inscricao', label: 'Inscrição Candidato', icon: '📝', category: 'Auth' },
  { path: '/cadastro', label: 'Cadastro Completo (PRD-1)', icon: '📋', category: 'Auth' },
  { path: '/auth/login', label: 'Login Candidato', icon: '🔑', category: 'Auth' },
  { path: '/auth/login-rh', label: 'Login RH', icon: '🔐', category: 'Auth' },
  { path: '/auth/esqueci-senha', label: 'Esqueci Minha Senha', icon: '🔓', category: 'Auth' },
  { path: '/auth/redefinir-senha', label: 'Redefinir Senha', icon: '🔐', category: 'Auth' },
  { path: '/candidato/dashboard', label: 'Dashboard Candidato', icon: '📊', category: 'Candidato' },
  { path: '/candidato/perfil', label: 'Meu Perfil', icon: '👤', category: 'Candidato' },
  { path: '/candidato/candidatura/instrucoes', label: 'Instruções Formulário', icon: '📹', category: 'Candidato' },
  { path: '/candidato/candidatura/formulario/1', label: 'Formulário Candidatura', icon: '📋', category: 'Candidato' },
  { path: '/candidato/questionario-cultura', label: 'Questionário Cultura', icon: '💬', category: 'Candidato' },
  { path: '/candidato/questionario', label: 'Questionário', icon: '🧠', category: 'Candidato' },
  { path: '/testes/bigfive/instrucoes', label: 'Instruções Big Five', icon: '🎨', category: 'Testes' },
  { path: '/testes/bigfive', label: 'Teste Big Five', icon: '✍️', category: 'Testes' },
  { path: '/testes/disc/instrucoes', label: 'Instruções DISC', icon: '🎯', category: 'Testes' },
  { path: '/testes/disc', label: 'Teste DISC', icon: '✍️', category: 'Testes' },
  { path: '/testes/raven/instrucoes', label: 'Instruções Raven', icon: '🧩', category: 'Testes' },
  { path: '/testes/raven', label: 'Teste Raven', icon: '🧩', category: 'Testes' },
  { path: '/testes/conclusao', label: 'Conclusão Testes', icon: '✅', category: 'Testes' },
  { path: '/rh/dashboard', label: 'Dashboard RH', icon: '📊', category: 'RH' },
  { path: '/rh/candidatos', label: 'Candidatos RH', icon: '👥', category: 'RH' },
  { path: '/rh/candidatos/1', label: 'Perfil Candidato RH', icon: '👤', category: 'RH' },
  { path: '/rh/vagas', label: 'Vagas RH', icon: '📋', category: 'RH' },
  { path: '/rh/vagas/nova', label: 'Criar/Editar Vaga', icon: '✨', category: 'RH' },
  { path: '/rh/perfil', label: 'Meu Perfil (RH)', icon: '👤', category: 'RH' },
  { path: '/rh/configuracoes', label: 'Configurações', icon: '⚙️', category: 'RH' },
  { path: '/rh/suporte', label: 'Suporte Técnico', icon: '🛠️', category: 'RH' },
  { path: '/rh/relatorios', label: 'Relatórios', icon: '📊', category: 'RH' },
  { path: '/showcase', label: 'Design Showcase', icon: '🎨', category: 'Dev' },
]
