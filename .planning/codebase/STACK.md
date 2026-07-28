# Stack Tecnológico

**Data de Análise:** 2026-04-19
**Projeto:** `sistema-recrutamento-beauty-smile` (v0.1.0, privado, ESM)

---

## Linguagens

**Primária:**
- TypeScript 5.3.3 — toda a aplicação (`.ts`/`.tsx`) em modo `strict`, com `noUnusedLocals`/`noUnusedParameters` ativos (`tsconfig.json:17-22`).
- JSX/TSX via `react-jsx` (`tsconfig.json:15`).

**Secundária:**
- SQL (PostgreSQL/Supabase) — `supabase/migrations/*.sql`, `docs/sql/`.
- HTML/TXT — templates de email em `docs/email-templates/`.

---

## Runtime e Package Manager

**Runtime alvo:**
- Node.js 18+ (implícito por `@types/node ^20.10.0` e `vite 6.3.5`).
- Target JS: `ES2020` (`tsconfig.json:3`); build Vite `target: 'esnext'` (`vite.config.ts:71`).

**Package Manager:**
- npm — `package-lock.json` (333 KB) presente na raiz. Não há `pnpm-lock.yaml` nem `yarn.lock`.
- Nenhum `engines` ou `.nvmrc` declarado — **red flag** leve de reprodutibilidade.

---

## Frameworks

**Core Frontend:**
- React `^18.3.1` + React DOM `^18.3.1` — SPA.
- React Router DOM `^6.28.0` — roteamento client-side via `createBrowserRouter` (`src/App.tsx:258-262`) com flag `v7_startTransition`.
- Vite `6.3.5` + `@vitejs/plugin-react-swc ^3.10.2` — build e dev server; porta `3003` (`vite.config.ts:74-77`), output em `build/` (não `dist/`).

**UI / Componentes:**
- Radix UI (29 pacotes `@radix-ui/react-*`) — primitivas acessíveis.
- shadcn/ui — componentes em `src/components/ui/` (48 arquivos: `button.tsx`, `dialog.tsx`, `sheet.tsx`, `select.tsx`, `dropdown-menu.tsx`, `form.tsx`, `sidebar.tsx`, etc.).
- `class-variance-authority ^0.7.1`, `clsx`, `tailwind-merge` — variantes de classes.
- `lucide-react ^0.487.0` — ícones.
- `cmdk ^1.1.1`, `vaul ^1.1.2`, `sonner ^2.0.3` (toasts), `embla-carousel-react ^8.6.0`, `input-otp ^1.4.2`, `react-resizable-panels ^2.1.7`, `react-day-picker ^8.10.1`, `next-themes ^0.4.6`.
- `motion` (Framer Motion) — animações.
- `recharts ^2.15.2` — gráficos (usado em `DashboardRHPage`, `RelatoriosRHPage`).
- `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-text-style` — editor rich text (`src/components/RichTextEditor.tsx`).
- `react-dnd` + `react-dnd-html5-backend` — drag-and-drop (ex.: `KanbanBoard.tsx`).

**Styling:**
- Tailwind CSS `^3.4.0` + `tailwindcss-animate ^1.0.7`.
- Config: `tailwind.config.js` com tema dirigido por variáveis CSS (HSL tokens).
- PostCSS `^8.4.32` + Autoprefixer `^10.4.16` (`postcss.config.js`).

**Formulários e Validação:**
- `react-hook-form ^7.55.0` + `@hookform/resolvers ^5.2.2`.
- `zod ^3.22.4` — schemas em `src/features/cadastro/schemas/candidatoSchema.ts` e `src/schemas/*.ts` (`loginSchema`, `adminLoginSchema`, `passwordRecoverySchema`).

**Estado:**
- `zustand ^4.5.2` — stores em `src/store/` (`authStore.ts`, `adminAuthStore.ts`) e `src/features/vagas/store/`.
- `@tanstack/react-query ^5.90.10` — server state; cliente global configurado em `src/App.tsx:24-33` com `staleTime: 5min`, `gcTime: 10min`, `retry: 2`, `refetchOnWindowFocus: false`.

**Utilidades:**
- `date-fns ^2.30.0` — manipulação de datas.
- `ua-parser-js ^2.0.6` — parsing de User Agent (usado em `src/services/logAccessService.ts:17`).

**Backend as a Service:**
- `@supabase/supabase-js ^2.48.1` — cliente Supabase.
- `@supabase/auth-helpers-react ^0.5.0` — *declarado em `package.json:34` mas listado no `INTEGRATION_GUIDE.md` como útil para Next.js; aplicação é Vite/React puro, pode estar sobrando* (red flag).

---

## Testes

**Unitários:**
- `vitest ^4.0.7` + `@vitest/ui ^4.0.7` + `happy-dom ^20.0.10`.
- Config em `vite.config.ts:8-17`: `globals: true`, environment `happy-dom`, `include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']`, cobertura `v8` (text/json/html).
- Tests existentes em: `src/features/cadastro/components/__tests__/`, `src/features/cadastro/services/__tests__/`.

**E2E:**
- `@playwright/test ^1.56.1` + `@playwright/experimental-ct-react ^1.56.1`.
- Config em `playwright.config.ts`: testDir `./e2e`, timeout 60s, retries 2 em CI, webServer `npm run dev` em `http://localhost:3000` (*red flag: conflita com `vite.config.ts:75` que abre na porta 3003*).
- Projetos: `chromium`, `mobile-chrome` (Pixel 5), `tablet` (iPad Pro).
- Specs: `e2e/cadastro-flow.spec.ts`, `e2e/login-flow.spec.ts`, `e2e/password-recovery-flow.spec.ts`, `e2e/job-application-flow.spec.ts`.

---

## Ferramentas de Build e Dev

**Dev:** `vite` (`npm run dev`) — abre navegador automático (`open: true`).
**Build:** `vite build` → `build/` (não padrão; Vite default é `dist/`).
**Preview:** `vite preview`.
**Lint/Typecheck:** `npm run lint` = `tsc --noEmit` — **não há ESLint/Prettier configurado** (red flag significativo para projeto deste tamanho).
**Ambiente `dotenv ^17.2.3`** (dev) — carregado em `playwright.config.ts:11` para `.env.test`.

---

## Dependências-Chave (com Propósito)

**Críticas (se removidas, app quebra):**
- `react`, `react-dom`, `react-router-dom` — core da SPA.
- `@supabase/supabase-js` — única camada de dados (sem backend próprio).
- `@tanstack/react-query` — cache e estado de servidor.
- `zustand` — auth/session state persistido.
- `react-hook-form` + `zod` + `@hookform/resolvers` — todos os formulários críticos.
- `sonner` — notificações (usadas em auth, upload, candidatura).

**Infraestrutura / Acessórias:**
- `@radix-ui/*` + `tailwindcss` + `tailwind-merge` + `cva` — design system.
- `lucide-react` — ícones.
- `date-fns` — datas em relatórios e dashboard.
- `recharts` — gráficos do RH.
- `ua-parser-js` — auditoria de login.
- `@tiptap/*` — editor de descrição de vaga.
- `react-dnd` — Kanban de candidatos.

**Declaradas mas potencialmente não usadas / sem versão fixa:**
- `@tiptap/core`, `@tiptap/extension-text-style`, `@tiptap/react`, `@tiptap/starter-kit`, `clsx`, `motion`, `react-dnd`, `react-dnd-html5-backend`, `tailwind-merge` estão com versão `"*"` (**red flag** — builds não determinísticos).

---

## Configuração

**Path aliases:**
- `@/*` → `./src/*` (`tsconfig.json:25-27` + `vite.config.ts:67`).
- Vite resolve dezenas de aliases legados `lib@version` (ex.: `vaul@1.1.2`, `sonner@2.0.3`, `@radix-ui/react-*@version`) e `figma:asset/*.png` → arquivos em `src/assets/` (`vite.config.ts:21-66`). **Red flag: resquícios do Figma Make/Code Connect**; alguns arquivos PNG referenciados estão marcados como deletados no `git status` atual.

**Arquivos de ambiente presentes na raiz (conteúdo não inspecionado):**
- `.env.example` — chaves de API de LLMs (Anthropic, Perplexity, OpenAI, Google, Mistral, xAI, Groq, OpenRouter, Azure, Ollama, GitHub) — usadas pelo Task Master AI, **não pelo app**.
- `.env.local.example` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_N8N_WEBHOOK_URL`, `VITE_ENVIRONMENT`.
- `.env.test.example` — `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_NAME`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `.env.local` e `.env.test` existem (não lidos) — ignorados no `.gitignore:27-30`.
- `VITE_SUPABASE_SERVICE_ROLE_KEY` também é lido por `src/lib/supabase/client.ts:14` (**red flag grave — service role exposto no bundle client-side**).

**Variáveis de ambiente consumidas pelo código (`src/`):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

---

## Plataforma

**Desenvolvimento:**
- Node 18+, npm, macOS/Linux/Windows.
- Dev server Vite em `localhost:3003` (abre automaticamente).
- Playwright requer Chromium instalado (`npx playwright install`).

**Produção:**
- Build estático (`build/`) servível por qualquer CDN/hosting (Vercel, Netlify, S3+CloudFront, etc.).
- Backend 100% Supabase (sem servidor Node próprio).
- **Nenhum arquivo de deploy detectado** (`vercel.json`, `netlify.toml`, `Dockerfile` ausentes) — red flag.

---

## Scripts Disponíveis (`package.json:85-99`)

```bash
npm run dev              # Vite dev server (porta 3003)
npm run build            # Produção → build/
npm run preview          # Preview do build
npm run lint             # tsc --noEmit (apenas type-check)

npm run test             # Vitest watch
npm run test:ui          # Vitest com UI
npm run test:run         # Vitest single run
npm run test:coverage    # Vitest + cobertura v8

npm run test:e2e         # Playwright
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:headed  # Playwright com browser visível
npm run test:e2e:debug   # Playwright debug
npm run test:e2e:report  # Abre relatório HTML
```

---

## Red Flags Técnicos Identificados

1. **`VITE_SUPABASE_SERVICE_ROLE_KEY` usada no cliente** (`src/lib/supabase/client.ts:14`, `cadastroService.ts` via `supabaseAdmin`). `VITE_*` vars são expostas no bundle — vaza role de superusuário do Postgres.
2. **Versões soltas (`"*"`)** em 9 dependências críticas (Tiptap, motion, clsx, react-dnd, tailwind-merge).
3. **Sem ESLint/Prettier** — apenas `tsc --noEmit`.
4. **Porta inconsistente** entre Vite (`3003`) e Playwright (`3000`) — E2E falha se `reuseExistingServer` não encontrar nada.
5. **`@supabase/auth-helpers-react`** presente mas sem uso aparente (pacote para Next.js).
6. **Aliases `figma:asset/*`** no `vite.config.ts` referenciam PNGs atualmente deletados (ver `git status`).
7. **Sem `engines` em `package.json`** nem `.nvmrc`.
8. **Build out-dir customizado (`build/`)** — divergente do padrão Vite; quebra integrações que assumem `dist/`.
9. **Sem configuração de CI/CD** na raiz.

---

*Análise do stack gerada em 2026-04-19 a partir de `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `playwright.config.ts`, `src/App.tsx`, `src/lib/supabase/client.ts`.*
