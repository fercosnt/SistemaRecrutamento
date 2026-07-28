/**
 * Definição de rotas da aplicação Beauty Smile
 *
 * Este arquivo centraliza todas as rotas do sistema, organizadas por
 * área de funcionalidade: público, candidato, RH/Admin
 */

import { Navigate, RouteObject, useParams } from 'react-router-dom'

// Páginas Públicas
import { LandingPage } from '../components/pages/LandingPage'
import { VagasPublicasPage } from '../components/pages/VagasPublicasPage'
import { VagaDetalhePage } from '../components/pages/VagaDetalhePage'
import { ManifestoPage } from '../components/pages/ManifestoPage'

// Páginas de Autenticação e Cadastro
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

// Protected Route HOC (unified role-aware guard)
import { RoleGuard } from '../components/RoleGuard'

// Error Boundary
import { ErrorBoundary } from '../components/ErrorBoundary'

// PERF-03 (Plan 19-02): named-export → React.lazy adapter. Every /rh/* + /admin/*
// page below is lazy-loaded via lazyNamed so the candidate first-paint never
// downloads the RH/admin code. RoleGuard stays OUTSIDE the lazy element (the
// access-control invariant). Candidate/auth/public/avaliação imports stay STATIC.
import { lazyNamed } from './lazyNamed'

// Avaliação Assíncrona (candidato — Phase 11 / AVAL-01·02·03·09)
import {
  AvaliacaoContainer,
  SjtMultiplaEscolhaScreen,
  SjtCasoAbertoScreen,
  BigFiveQuestionnaireScreen,
  DevolutivaBigFiveView,
  RedacaoEditorScreen,
} from '../features/avaliacao/components'

// Páginas RH/Admin — LAZY (PERF-03 / Plan 19-02). One dynamic import() per page →
// Rollup emits one chunk per page; the candidate never downloads any of them.
const DashboardRHPage = lazyNamed(() => import('../components/pages/DashboardRHPage'), 'DashboardRHPage')
const CandidatosRHPage = lazyNamed(() => import('../components/pages/CandidatosRHPage'), 'CandidatosRHPage')
const PerfilCandidatoRHPage = lazyNamed(() => import('../components/pages/PerfilCandidatoRHPage'), 'PerfilCandidatoRHPage')
const VagasRHPage = lazyNamed(() => import('../components/pages/VagasRHPage'), 'VagasRHPage')
const VagaCandidatosRHPage = lazyNamed(() => import('../components/pages/VagaCandidatosRHPage'), 'VagaCandidatosRHPage')
const ComparativoCandidatosPage = lazyNamed(() => import('../components/pages/ComparativoCandidatosPage'), 'ComparativoCandidatosPage')
const CriarEditarVagaPage = lazyNamed(() => import('../components/pages/CriarEditarVagaPage'), 'CriarEditarVagaPage')
const ConfiguracoesPage = lazyNamed(() => import('../components/pages/ConfiguracoesPage'), 'ConfiguracoesPage')
const MeuPerfilPage = lazyNamed(() => import('../components/pages/MeuPerfilPage'), 'MeuPerfilPage')
const SuporteRHPage = lazyNamed(() => import('../components/pages/SuporteRHPage'), 'SuporteRHPage')
const RelatoriosRHPage = lazyNamed(() => import('../components/pages/RelatoriosRHPage'), 'RelatoriosRHPage')

// Revisão de redações (Phase 13 / AVAL-07 — RH human-review queue, role-gated)
const RedacaoReviewPanel = lazyNamed(() => import('../features/triagem/components/RedacaoReviewPanel'), 'RedacaoReviewPanel')

// Workspace de entrevista (Phase 14 / ENTREV-01..05 — RH/gestor, role-gated)
const EntrevistaWorkspace = lazyNamed(() => import('../features/entrevista/components/EntrevistaWorkspace'), 'EntrevistaWorkspace')

// Prova cognitiva (Phase 14 / ENTREV-05 — candidato, opt-in via vaga.aplica_cognitivo).
// EAGER — candidate-facing route, stays in the first-paint graph.
import { ProvaCognitivaScreen } from '../features/avaliacao-cognitiva/components/ProvaCognitivaScreen'

// Páginas Admin (compliance / AI infra — read-only, role administrador only) — LAZY
const AiLogsPage = lazyNamed(() => import('../features/admin/ai-logs/components/AiLogsPage'), 'AiLogsPage')
const PromptVersionsPage = lazyNamed(() => import('../features/admin/prompt-versions/components/PromptVersionsPage'), 'PromptVersionsPage')
const AiCostsPage = lazyNamed(() => import('../features/admin/ai-costs/components/AiCostsPage'), 'AiCostsPage')
// Decisão Final auditável + LGPD Art. 20 (Phase 15 / DECISAO-01..04, LGPD-03) — LAZY (RH)
const DecisaoFinalPage = lazyNamed(() => import('../features/decisao/components/DecisaoFinalPage'), 'DecisaoFinalPage')
// Explicação ao candidato — EAGER (candidate-facing route, stays in first-paint graph).
import { ExplicacaoCandidatoPage } from '../features/explicacao/components/ExplicacaoCandidatoPage'
const BiasAuditPage = lazyNamed(() => import('../features/admin/bias-audit/components/BiasAuditPage'), 'BiasAuditPage')

// 404 catch-all (Phase 17 / D-14) — Beauty Smile glass NotFound, role-aware back-link
import { NotFoundPage } from '../components/pages/NotFoundPage'

/**
 * Phase 17 / D-08 — route normalization wrapper.
 *
 * Canonical funnel id pattern (RESEARCH Open Q1 / Pitfall 1): the RH candidate HUB mounts
 * at `/rh/candidatos/:id` (PLURAL) and the per-stage WORKSPACES at `/rh/candidato/:id/{...}`
 * (SINGULAR) — in BOTH, `:id` is a **candidaturaId** (aligns with TriagemRow.id and every
 * workspace `useParams`). The hub plural mount stays canonical because TriagemTable already
 * links to it (D-04 — the link stays, only the destination CONTENT changes in 17-03).
 *
 * This bridges a likely user/typo guess: a BARE singular `/rh/candidato/:id` (no sub-segment)
 * → the canonical plural hub, param-preserving. It is NOT a literal `<Navigate to="...:id">`
 * (Pitfall 5 — React Router does not interpolate `:id` inside `to`); the param is resolved
 * via `useParams` and interpolated into a fixed internal template (no open-redirect — the
 * target is never user-supplied; T-17-02-OR mitigate).
 */
function RedirectToHub() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/rh/candidatos/${id}`} replace />
}

/**
 * Configuração de rotas da aplicação
 *
 * Organizadas em categorias:
 * - Rotas públicas (/)
 * - Rotas de autenticação (/auth/*)
 * - Rotas de candidato (/candidato/*)
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
  // Param matches both UUIDs and slugs; VagaDetalhePage branches via isUuid() at runtime (D-01)
  {
    path: '/vagas/:identifier',
    element: <VagaDetalhePage />,
  },
  {
    path: '/manifesto',
    element: <ManifestoPage />,
  },

  // ============================
  // ROTAS DE AUTENTICAÇÃO
  // ============================
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
      <RoleGuard role="candidato">
        <DashboardCandidatoPage />
      </RoleGuard>
    ),
  },
  {
    path: '/candidato/perfil',
    element: (
      <RoleGuard role="candidato">
        <MeuPerfilCandidatoPage />
      </RoleGuard>
    ),
  },
  {
    path: '/candidato/candidatura/instrucoes',
    element: (
      <RoleGuard role="candidato">
        <InstrucoesFormularioPage />
      </RoleGuard>
    ),
  },
  // Param is a slug per Phase 4 D-04 (FormularioCandidaturaPage rewrite uses useVagaBySlug)
  {
    path: '/candidato/candidatura/formulario/:vagaSlug',
    element: (
      <RoleGuard role="candidato">
        <FormularioCandidaturaPage />
      </RoleGuard>
    ),
  },
  // Avaliação Assíncrona (Etapa 3) — Phase 11. The etapa gate is server-enforced
  // by RLS; the container mirrors it neutrally (wrong-etapa lock, RNF-07a).
  {
    path: '/candidato/avaliacao/:candidaturaId',
    element: (
      <RoleGuard role="candidato">
        <AvaliacaoContainer />
      </RoleGuard>
    ),
  },
  {
    path: '/candidato/avaliacao/:candidaturaId/mc',
    element: (
      <RoleGuard role="candidato">
        <SjtMultiplaEscolhaScreen />
      </RoleGuard>
    ),
  },
  {
    path: '/candidato/avaliacao/:candidaturaId/caso',
    element: (
      <RoleGuard role="candidato">
        <SjtCasoAbertoScreen />
      </RoleGuard>
    ),
  },
  // Big Five (Phase 12 / AVAL-04 · AVAL-08). Production flow under the avaliação
  // container — distinct from the legacy DEV `/testes/bigfive` page below.
  {
    path: '/candidato/avaliacao/:candidaturaId/bigfive',
    element: (
      <RoleGuard role="candidato">
        <BigFiveQuestionnaireScreen />
      </RoleGuard>
    ),
  },
  {
    path: '/candidato/avaliacao/:candidaturaId/bigfive/devolutiva',
    element: (
      <RoleGuard role="candidato">
        <DevolutivaBigFiveView />
      </RoleGuard>
    ),
  },
  // Redação cultural (Phase 13 / AVAL-05 · AVAL-06). The essay editor opens from
  // the AvaliacaoContainer as one more teste card; it lives on its own candidate
  // route. The candidate NEVER sees a score/color/threshold (RNF-07a).
  {
    path: '/candidato/redacao/:candidaturaId',
    element: (
      <RoleGuard role="candidato">
        <RedacaoEditorScreen />
      </RoleGuard>
    ),
  },
  // Prova cognitiva (Phase 14 / ENTREV-05). Opt-in only via vaga.aplica_cognitivo
  // (default false): the screen mounts the "Esta etapa não está disponível" empty
  // state when off. One CC0 item at a time + light proctoring (soft timer, tab-blur
  // logging, paste-block); the candidate posts ONLY raw picks → the server re-scores
  // and the candidate NEVER sees a score/band (RNF-07a). Product language is
  // "prova de raciocínio lógico" (LGPD-04), never the clinical framing.
  {
    path: '/candidato/prova-cognitiva/:candidaturaId',
    element: (
      <RoleGuard role="candidato">
        <ProvaCognitivaScreen />
      </RoleGuard>
    ),
  },
  // Explicação ao candidato rejeitado (Phase 15 / DECISAO-04 — LGPD Art. 20):
  // motivo não-clínico + resultado de alto nível (NUNCA score/banda — RNF-07a) +
  // "Solicitar revisão por pessoa natural". Own-row RLS; só após decisão rejeitada.
  {
    path: '/candidato/explicacao/:id',
    element: (
      <RoleGuard role="candidato">
        <ExplicacaoCandidatoPage />
      </RoleGuard>
    ),
  },

  // ============================
  // ROTAS RH/ADMIN
  // ============================
  {
    path: '/rh/dashboard',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <DashboardRHPage />
      </RoleGuard>
    ),
  },
  {
    path: '/rh/candidatos',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <CandidatosRHPage />
      </RoleGuard>
    ),
  },
  {
    // CANONICAL hub mount (D-08): plural + candidaturaId. TriagemTable links here
    // (D-04). The destination CONTENT becomes the real hub in 17-03; the route stays.
    path: '/rh/candidatos/:id',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <PerfilCandidatoRHPage />
      </RoleGuard>
    ),
  },
  {
    // D-08 normalization: bare SINGULAR `/rh/candidato/:id` (no sub-segment) →
    // canonical plural hub, param-preserving (Pitfall 5 — via RedirectToHub wrapper,
    // never a literal `<Navigate to="...:id">`). The singular workspace sub-routes
    // (/rh/candidato/:id/{redacao,entrevista,decisao}) keep their form + RoleGuard.
    path: '/rh/candidato/:id',
    element: <RedirectToHub />,
  },
  // Revisão de redações (Phase 13 / AVAL-07) — RH human-review queue, role-gated.
  // 1-redação-por-vez, severity-sorted color sidebar, BARS override, decisão+notas≥50.
  // The candidate NEVER reaches this surface (RoleGuard + RLS deny).
  {
    path: '/rh/candidato/:id/redacao',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <RedacaoReviewPanel />
      </RoleGuard>
    ),
  },
  // Workspace de entrevista (Phase 14 / ENTREV-01..05) — RH/gestor interview
  // workspace: Painel do candidato (24h marker) / Guia STAR-PEI / Análise da
  // transcrição (flag-block on avancar_etapa) / Avaliação (inline scorecard) +
  // RH-only CONTEXTUAL cognitive band. Candidate NEVER reaches it (RoleGuard + RLS).
  {
    path: '/rh/candidato/:id/entrevista',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <EntrevistaWorkspace />
      </RoleGuard>
    ),
  },
  // Decisão final consolidada (Phase 15 / DECISAO-01..03): dashboard de scorecards
  // agregados (não re-pontua) + recomendação advisory + Comparativo de finalistas +
  // captura da decisão (≥50 chars, por_usuario NOT NULL) que dispara avancar_etapa.
  {
    path: '/rh/candidato/:id/decisao',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <DecisaoFinalPage />
      </RoleGuard>
    ),
  },
  {
    path: '/rh/vagas',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <VagasRHPage />
      </RoleGuard>
    ),
  },
  {
    path: '/rh/vagas/nova',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <CriarEditarVagaPage />
      </RoleGuard>
    ),
  },
  {
    path: '/rh/vagas/:id/editar',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <CriarEditarVagaPage />
      </RoleGuard>
    ),
  },
  {
    path: '/rh/vagas/:id/candidatos',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <VagaCandidatosRHPage />
      </RoleGuard>
    ),
  },
  {
    path: '/rh/vagas/:id/comparativo',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <ComparativoCandidatosPage />
      </RoleGuard>
    ),
  },
  {
    path: '/rh/perfil',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <MeuPerfilPage />
      </RoleGuard>
    ),
  },
  {
    path: '/rh/configuracoes',
    element: (
      <RoleGuard role="administrador">
        <ConfiguracoesPage />
      </RoleGuard>
    ),
  },
  {
    path: '/rh/suporte',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <SuporteRHPage />
      </RoleGuard>
    ),
  },
  {
    path: '/rh/relatorios',
    element: (
      <RoleGuard role={['rh', 'administrador']}>
        <RelatoriosRHPage />
      </RoleGuard>
    ),
  },

  // ============================
  // ROTAS ADMIN (AI infra / compliance — administrador only)
  // ============================
  {
    path: '/admin/ai-logs',
    element: (
      <RoleGuard role="administrador">
        <AiLogsPage />
      </RoleGuard>
    ),
  },
  {
    path: '/admin/prompt-versions',
    element: (
      <RoleGuard role="administrador">
        <PromptVersionsPage />
      </RoleGuard>
    ),
  },
  {
    path: '/admin/ai-costs',
    element: (
      <RoleGuard role="administrador">
        <AiCostsPage />
      </RoleGuard>
    ),
  },
  // Bias audit (Phase 15 / LGPD-03): adverse-impact por faixa etária (4/5 EEOC) +
  // banner honesto AGE-only (raça/gênero não coletados) + export CSV. Admin-only.
  {
    path: '/admin/bias-audit',
    element: (
      <RoleGuard role="administrador">
        <BiasAuditPage />
      </RoleGuard>
    ),
  },

  // ============================
  // CATCH-ALL 404 (Phase 17 / D-14) — MUST stay LAST
  // ============================
  // No RoleGuard: renders for any/unknown role (incl. unauthenticated). A '*' route
  // placed before specific routes would shadow them, so it is appended last.
  {
    path: '*',
    element: <NotFoundPage />,
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
  { path: '/cadastro', label: 'Cadastro Completo (PRD-1)', icon: '📋', category: 'Auth' },
  { path: '/auth/login', label: 'Login Candidato', icon: '🔑', category: 'Auth' },
  { path: '/auth/login-rh', label: 'Login RH', icon: '🔐', category: 'Auth' },
  { path: '/auth/esqueci-senha', label: 'Esqueci Minha Senha', icon: '🔓', category: 'Auth' },
  { path: '/auth/redefinir-senha', label: 'Redefinir Senha', icon: '🔐', category: 'Auth' },
  { path: '/candidato/dashboard', label: 'Dashboard Candidato', icon: '📊', category: 'Candidato' },
  { path: '/candidato/perfil', label: 'Meu Perfil', icon: '👤', category: 'Candidato' },
  { path: '/candidato/candidatura/instrucoes', label: 'Instruções Formulário', icon: '📹', category: 'Candidato' },
  { path: '/candidato/candidatura/formulario/1', label: 'Formulário Candidatura', icon: '📋', category: 'Candidato' },
  { path: '/rh/dashboard', label: 'Dashboard RH', icon: '📊', category: 'RH' },
  { path: '/rh/candidatos', label: 'Candidatos RH', icon: '👥', category: 'RH' },
  { path: '/rh/candidatos/1', label: 'Perfil Candidato RH', icon: '👤', category: 'RH' },
  { path: '/rh/vagas', label: 'Vagas RH', icon: '📋', category: 'RH' },
  { path: '/rh/vagas/nova', label: 'Criar/Editar Vaga', icon: '✨', category: 'RH' },
  { path: '/rh/perfil', label: 'Meu Perfil (RH)', icon: '👤', category: 'RH' },
  { path: '/rh/configuracoes', label: 'Configurações', icon: '⚙️', category: 'RH' },
  { path: '/rh/suporte', label: 'Suporte Técnico', icon: '🛠️', category: 'RH' },
  { path: '/rh/relatorios', label: 'Relatórios', icon: '📊', category: 'RH' },
]
