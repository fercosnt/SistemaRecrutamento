---
phase: 04-vagas-candidatura
reviewed: 2026-04-26T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/pages/VagasPublicasPage.tsx
  - src/components/pages/VagaDetalhePage.tsx
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 04 — Plan 04-09 Gap-Closure Code Review

**Reviewed:** 2026-04-26
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found (no blockers)

## Summary

Plan 04-09 acrescenta o canonical D-27 persona shell em `VagasPublicasPage` e `VagaDetalhePage`,
mais expansoes de `className` em GlassButton (workaround surgical para inline-flex). A
implementacao replica fielmente o pattern de `MeuPerfilCandidatoPage:344-389` e usa o guard
correto (`isAuthenticated && role === 'candidato'`) — anon-browse e RH-logged nao vazam PII de
candidato. O redirect anti-open-redirect (VAGA-03) ja era coberto por `LoginCandidatoPage`
(`resolveRedirect`).

**Sem blockers**. Dois warnings substantivos (handleLogout catch unreachable + 4-way duplication
ja sinalizada para Phase 5) e tres info-level (unused import, deliberate-but-debatable UX gaps
em estados pre-render).

Visual smoke 6/6 PASS validado por humano alinha com a leitura estatica.

## Warnings

### WR-01-09: `handleLogout` catch é unreachable — toast de erro nunca dispara

- **Severity:** warning
- **File:** `src/components/pages/VagasPublicasPage.tsx:113-126` e `src/components/pages/VagaDetalhePage.tsx:117-130`
- **Issue:** Ambos `handleLogout` envolvem `await logout()` em try/catch e exibem
  `toast.error('Erro ao sair', ...)` no catch. Mas `useAuthStore.logout` (authStore.ts:342-349)
  ja envolve `supabase.auth.signOut()` em try/catch interno — engole o erro com um
  `console.error` e sempre chama `clearAuth()` em seguida, retornando `Promise<void>` que nunca
  rejeita. A unica forma do catch das pages disparar e se `clearAuth()` em si lancar (nao lanca
  — e um `set(...)` puro).
- **Why it matters:** Em qualquer falha real de signOut (rede caindo durante logout, sessao ja
  invalida no servidor, etc.), o usuario ve `toast.success('Voce saiu...')` mesmo com o erro
  logado no console pelo store. O try/catch da page da uma falsa sensacao de robustez. E pior:
  o usuario fica clear-auth localmente mas pode nao ter sido invalidado server-side, sem
  feedback visual. Esse defeito e herdado do canonical `MeuPerfilCandidatoPage:270-283`, que
  04-09 replicou explicitamente (mesma linha do comentario do plan). Nao e regressao
  introduzida em 04-09, mas as duas pages adicionadas multiplicam o defeito.
- **Fix:** Tres opcoes em ordem de preferencia:
  1. Fix no store (ideal, root cause): em `authStore.logout`, *re-throw* (ou retornar
     `{ error }`) apos `clearAuth()`. Os 4 call-sites (MeuPerfil + Formulario + Vagas +
     VagaDetalhe) entao fazem catch real.
  2. Remover try/catch das pages (honest signal): se a contract do store e "nunca falha", o
     try/catch e dead code — simplifique para `await logout(); toast.success(...); navigate(...)`.
  3. Detectar erro via `console.error` spy (frageis). NAO recomendado.

  Recomendado: opcao 1 em Phase 5 (alinhar com Phase 5 backlog ja proposto). Para esta gap-
  closure ficar internamente consistente, manter como esta e abrir issue separada e aceitavel.

### WR-02-09: Persona shell agora duplicado em 4 sites — extrair `<CandidatoNavbar />`

- **Severity:** warning
- **File:** `src/components/pages/VagasPublicasPage.tsx:222-276` e `src/components/pages/VagaDetalhePage.tsx:255-309`
  (mais MeuPerfilCandidatoPage:344-389 e FormularioCandidaturaPage:494-534 pre-existentes)
- **Issue:** O bloco JSX de ~55 linhas (sticky navbar, Glass wrapper, Logo, Avatar com fallback
  iniciais, nome+email, botoes "Area do candidato" + "Sair") + os helpers `candidatoIniciais` e
  `handleLogout` agora estao copy-paste em 4 paginas. Divergencias ja comecaram a aparecer:
  - MeuPerfilCandidatoPage:350 usa `<BeautySmileLogo type="symbol" ... />` (valor invalido para
    o tipo `'icon' | 'horizontal' | 'vertical'`).
  - VagasPublicasPage:229 e VagaDetalhePage:262 usam `type="icon"` (correto).
  - MeuPerfilCandidatoPage **nao** tem o link "Area do candidato" (porque ela JA E a area);
    Formulario, Vagas e VagaDetalhe tem.
  - Iniciais sao recomputadas inline em MeuPerfil mas extraidas para const em VagasPublicas
    e VagaDetalhe.

  A duplicacao do `handleLogout` (que tem o bug WR-01-09) significa que o fix precisa tocar
  em 4 lugares — exatamente o tipo de propagacao que extracao previne.
- **Why it matters:** Manutencao: qualquer mudanca na navbar (ex.: adicionar notificacao,
  trocar `Avatar` por DropdownMenu, ajustar copy "Sair" para "Sair da conta") exige edicao
  coordenada em 4 arquivos. CLAUDE.md projeto-rules favorece extracao: "src/features/<dominio>"
  com components/ — uma `<CandidatoNavbar />` em `src/features/auth/components/` (ou
  `src/components/layouts/`) seria home logico. O context note do reviewer ja sinaliza
  "Surgical fix decision: ... Phase 5 backlog item" — confirmar esse backlog item.
- **Fix:** Em Phase 5, extrair:
  ```tsx
  // src/components/layouts/CandidatoNavbar.tsx
  export function CandidatoNavbar({ showAreaLink = true }: { showAreaLink?: boolean }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const role = useAuthStore((s) => s.role)
    const candidato = useAuthStore((s) => s.candidato)
    const logout = useAuthStore((s) => s.logout)
    const navigate = useNavigate()
    if (!isAuthenticated || role !== 'candidato') return null
    // ... mesmo JSX ...
  }
  ```
  Pages chamam `<CandidatoNavbar />` (Vagas, VagaDetalhe, Formulario) ou
  `<CandidatoNavbar showAreaLink={false} />` (MeuPerfil). Confirma que esse e o backlog item
  Phase 5 ja registrado.

## Info

### IN-01-09: `import React from 'react'` nao utilizado em VagasPublicasPage

- **Severity:** info
- **File:** `src/components/pages/VagasPublicasPage.tsx:16`
- **Issue:** Projeto usa `tsconfig.app.json` com `"jsx": "react-jsx"` (automatic runtime). Nao
  ha referencias a `React.` no arquivo (verificado via grep). VagaDetalhePage:22 ja imporrta
  apenas `{ useState }` e omite o default, padrao consistente com o resto do codebase.
- **Why it matters:** Cosmetico. Ruido + bytes no bundle (treeshaker remove, mas linter nao
  flag por enquanto).
- **Fix:**
  ```diff
  - import React from 'react'
  ```
  Pode ser feito junto com qualquer toque futuro nesse arquivo.

### IN-02-09: Persona shell ausente em `VagaNotFoundState` para candidato logado

- **Severity:** info
- **File:** `src/components/pages/VagaDetalhePage.tsx:57-88` (componente `VagaNotFoundState`)
  e `:235-237` (early return)
- **Issue:** Quando `vagaData?.success === false || !vaga`, a pagina retorna
  `<VagaNotFoundState />` *antes* do bloco do persona shell (linha 255+). O comment em :251-253
  reconhece isso explicitamente como decisao deliberada ("evita renderizar shell em
  VagaNotFoundState ... ou no loading skeleton"). UX consequence: candidato logado clicando em
  link velho/inativo perde nome/avatar/logout/link "Area do candidato" — fica sem affordance
  de navegacao alem do botao "Voltar para vagas" dentro do card.
- **Why it matters:** Para anon e RH-logged a decisao e correta (anon nao tem PII; RH nao
  pertence a esse persona). Para candidato logado, e degrada continuidade visual: ele estava
  no shell em /vagas, clicou num resultado obsoleto, e agora "perdeu" o header. Nao bloqueia
  navegacao porque o "Voltar para vagas" funciona. Consistente com anti-enumeration (D-09):
  todos os 404 paths renderizam mesmo componente — isso e PRO. Mas o trade-off poderia
  preservar o shell condicionalmente sem violar anti-enumeration (o shell nao revela existencia
  da vaga; apenas que o usuario esta logado, info que ele ja sabe).
- **Fix:** Opcional. Se quiser polir UX:
  ```tsx
  if (!vagaData?.success || !vaga) {
    return (
      <>
        {showCandidatoShell && <CandidatoNavbar />}
        <VagaNotFoundState />
      </>
    )
  }
  ```
  Requer extracao do CandidatoNavbar (WR-02-09) ou copy-paste do bloco — escolher conforme
  prioridade do Phase 5 backlog. Aceitavel deixar como esta enquanto o canonical D-27 usa o
  mesmo trade-off.

### IN-03-09: Persona shell ausente em loading skeleton para candidato logado

- **Severity:** info
- **File:** `src/components/pages/VagaDetalhePage.tsx:213-231` (loading early return)
- **Issue:** Mesmo padrao do IN-02-09: o `if (isLoading) return <skeleton />` em :213-231 esta
  ANTES do bloco do persona shell. Para candidato logado, durante o fetch de `useVaga` ou
  `useVagaBySlug` (mesmo com staleTime 5min, primeiro hit em sessao limpa renderiza o
  skeleton), o header desaparece e reaparece — flash visivel.
- **Why it matters:** Pequeno content-layout-shift / flash. Em conexao boa (Brasil-SP), o
  skeleton pode ser invisivel. Em mobile 3G ou primeira visita, fica perceptivel. Anti-
  enumeration nao se aplica aqui (loading state nao revela existencia).
- **Fix:** Mesma estrategia do IN-02-09 — renderizar shell *antes* do early return:
  ```tsx
  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <BackgroundImage ...>
          {showCandidatoShell && <CandidatoNavbar />}
          <div className="container mx-auto px-4 space-y-8">
            <GlassCard variant="white" blur="xl" className="max-w-4xl mx-auto">
              {/* skeleton */}
            </GlassCard>
          </div>
        </BackgroundImage>
      </div>
    )
  }
  ```
  Aceitavel deixar para Phase 5 junto com a extracao do componente.

## Notes (no findings)

- **Anti-open-redirect verified:** A query `?redirect=` construida em
  `VagaDetalhePage:158-160` e consumida por `LoginCandidatoPage` via `resolveRedirect` (file:52-67),
  que valida same-origin / non-protocol-relative. Nao introduz superficie nova.
- **Guard correctness:** `showCandidatoShell = isAuthenticated && role === 'candidato'`
  rejeita anon (isAuth=false) e RH-logged (role='rh' ou 'administrador'). PII (nome, email,
  avatar) nunca renderiza para usuario errado. Confirmado por inspecao de
  `setSession`/`fetchProfile` em `authStore.ts:284-340` — `role` reflete JWT app_metadata e
  fallback DB-lookup; nao ha caminho onde `role === 'candidato'` sem `candidato` populado
  (exceto durante initialize, que e gated por `isLoading` upstream em `App.tsx`).
- **Console log policy (Pitfall 7):** `console.error('Erro ao fazer logout:', error)` em
  ambos arquivos passa o objeto `error` direto. Em Supabase, esse `error` e um `AuthError` com
  `message` mas sem PII (nao contem nome/email/cpf/celular do candidato logado). Aceitavel
  conforme convencao.
- **GlassButton API correctness:** As 10 expansoes de className (`inline-flex items-center
  justify-center gap-2 whitespace-nowrap`) usam o slot certo (cn merge no GlassButton:184).
  Nao quebram o disabled state nem o active:scale-95.
- **TanStack Query discipline:** Selectors do Zustand sao chamados separadamente (4 calls em
  vez de 1 com selector combinado) — gera 4 subscriptions mas evita re-render dispar quando
  fields nao-relevantes mudam. Pattern OK e alinhado com canonical.

---

_Reviewed: 2026-04-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Scope: 2 files modified by Plan 04-09 gap-closure (commits 84d0290, 1982f9c)_
