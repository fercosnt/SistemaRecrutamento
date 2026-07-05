# Phase 22: Rede de Testes, Destravamento & Varredura de Honestidade - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas, all recommended answers accepted

<domain>
## Phase Boundary

A rede de testes que originou todos os defeitos live roda **verde em CI**, o **typecheck destrava**, e o candidato encontra **copy honesta com login que funciona sem gambiarra** — a fundação de regressão sobre a qual todas as fases seguintes (23–27) se guardam.

Entrega (12 requirements): CI-01/02 (corpus Deno em CI, verde), CI-04/05/14 (gate tsc apertado ao real + imports versionados resolvidos + cobertura e2e/scripts/playwright), CI-08 (credenciais de teste fora do repo), CI-09/11/12 (supply-chain: pinar wildcards, vulns dev-tooling, deps mortas), UX-02 (landing honesta + CTA), UX-04 (botões de login sem `!isValid`), UX-05 (`?redirect` + limpeza de localStorage órfão).

**Fora do escopo:** qualquer mudança de comportamento de produto além de copy/login/redirect; correção de funil/IA/segurança (Phases 23–27). Este phase é fundação de regressão — não expande superfície.

</domain>

<decisions>
## Implementation Decisions

### Rede de Testes Deno + Gate tsc (CI-01/02/04/05/14)
- **Corpus Deno no CI:** novo job `deno-test` dentro do `.github/workflows/ci.yml` existente (pipeline única, `deno test` sobre `supabase/functions`). Não criar workflow separado.
- **Deno é gate bloqueante** desde já — a suíte para de apodrecer (não allow-fail).
- **CI-02:** corrigir casts stale + asserts para o corpus (20 arquivos de teste, ~126 testes) passar verde.
- **Baseline tsc (CI-04) = measure-first:** após resolver os 65 TS2307 (CI-05) e expandir a cobertura para `e2e/`, `scripts/`, `playwright.config` (CI-14), rodar `npm run lint` e **cravar o gate no valor verde medido** (alvo ≤257; hoje `npm run lint` já reporta 257 sobre `src/`). Gate fica **vermelho acima** do baseline medido. Substitui o gate frouxo atual de 290 no `ci.yml`.
- **TS2307 (CI-05):** resolver via `paths` no `tsconfig` mapeando os specifiers versionados (`lucide-react@0.487.0` → `lucide-react`, etc.) — não-invasivo, preserva o `resolve.dedupe` do Vite. Não reescrever os imports no código-fonte.

### Supply-chain & Dependências (CI-09/11/12)
- **Vulns dev-tooling (CI-11):** subir vitest / @vitest/ui (RCE) e happy-dom (code-exec) para a **versão corrigida mais próxima** (major mínimo se necessário) e **rodar a suíte inteira** para confirmar verde após o bump.
- **Wildcards `"*"` (CI-09):** pinar as 8 deps na **versão já resolvida no lockfile** (teto de versão, zero mudança de comportamento) — não subir para latest.
- **Deps mortas (CI-12):** remover `motion` e `@supabase/auth-helpers-react` (verificadas como nunca-importadas).
- **Sem gate `npm audit` permanente** neste phase — corrigir os criticals/highs atuais; não adicionar gate de advisory externo (evita falha flaky por advisory novo).

### Honestidade candidate-facing (UX-02/04/05 + CI-08)
- **Botões de login (UX-04):** remover `!isValid` do `disabled` (candidato, RH, esqueci, redefinir) — **habilitar por padrão e validar no submit** (erros aparecem após tentativa). Elimina o hack `blur()` dos E2E (ver [[reference_e2e_login_helper_onblur]]).
- **Credenciais de teste (CI-08):** mover emails/senhas reais para **env vars** (`.env.test` / secrets CI); specs fazem **skip-if-unset**, sem fallback hardcoded. Commitar `.env.test.example` documentando as chaves.
- **Landing (UX-02):** remover linguagem "testes psicométricos"/"análise de perfil" → "avaliação comportamental/cognitiva" (RNF-12a); adicionar CTA "Já sou candidato" apontando para `/login` (login do candidato). Guard `forbidden-strings.grep.test.ts` já existe — estender se preciso.
- **`?redirect` (UX-05):** propagar o param `?redirect` por login→cadastro→pós-login; **limpar chaves stale de `localStorage`** (auth/draft órfãos) no login bem-sucedido.

### Claude's Discretion
- Deno version no job de CI, estrutura exata do job, e ordem dos steps.
- Quais chaves específicas de `localStorage` são "órfãs" — determinar pela leitura do código de auth/cadastro.
- Versões-alvo exatas dos bumps de vitest/happy-dom (menor bump que zere o advisory).
- Wording exato da copy da landing dentro da restrição RNF-12a.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/ci.yml` — pipeline existente; o gate tsc está no step "Type-check (frozen tsc baseline 290)" (linhas ~48–54, `COUNT > 290`). Alterar aqui para o baseline medido.
- `.github/workflows/prompts-sync.yml` — workflow separado de sync de prompts (não tocar aqui; CI-15 é Phase 27).
- `src/__tests__/guards/forbidden-strings.grep.test.ts` — guard de strings proibidas já existe (base para UX-02).
- `src/components/pages/LandingPage.tsx` — landing a corrigir (UX-02).
- `src/components/pages/LoginRHPage.tsx`, `LoginCandidatoPage.tsx` — logins a corrigir (UX-04). Também `EsqueciSenha`/`RedefinirSenha`.
- Corpus Deno: 20 arquivos `*.test.ts` em `supabase/functions/**` (~126 testes).

### Established Patterns
- tsc gate = "frozen baseline, CI red only on growth" (padrão M1/M2/M3). Manter o padrão, apenas apertar o número para o real.
- RHF + Zod com `mode` configurável; padrão do projeto é validação por step. Login usa `mode:'onBlur'` + `disabled={!isValid}` (origem do hack `blur()`).
- Commits via `git -c core.hooksPath=/dev/null` (husky bypass allowlistado em `settings.local.json`).
- `npm run lint` = `tsc --noEmit` (type-check only); `npm run test:run` = Vitest single run.

### Integration Points
- CI gate (`ci.yml`) — onde o novo job Deno e o gate tsc apertado aterrissam.
- `tsconfig` (`paths`) — resolução dos imports versionados.
- `package.json` — pinagem de deps + remoção de deps mortas + bumps de vuln.
- Login pages + auth store (`src/store/authStore.ts`) — fix `!isValid` + `?redirect`.

</code_context>

<specifics>
## Specific Ideas

- Baseline tsc atual medido nesta sessão: `npm run lint` → **257 erros** (confirma o "baseline real 257" do requirement; o gate no `ci.yml` está frouxo em 290).
- CI-14 (cobrir e2e/scripts/playwright) pode **elevar** o count enquanto CI-05 (resolver 65 TS2307) o **reduz** — por isso measure-first: cravar o valor verde só após ambos.
- Contas de teste conhecidas (a mover para env): `candidato.funil@teste.com`, `e2e.admin@beautysmile.com.br` (hoje em `.env.test` mas possivelmente com fallback hardcoded em specs).

</specifics>

<deferred>
## Deferred Ideas

- Gate `npm audit --audit-level=high` permanente — rejeitado neste phase (advisory flaky); pode ser revisitado em Phase 27 (CI hardening) se desejado.
- pgTAP / e2e real completos (A45/A46) — backlog stretch, não M4.
- CI-15 (teste de `sync-prompts`), CI-13 (`verify_jwt` em config.toml), CI-10 (`assert-chunks.mjs` wired) → Phase 27.

</deferred>
