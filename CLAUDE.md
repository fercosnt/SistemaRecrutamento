# CLAUDE.md — Sistema de Recrutamento Beauty Smile

## Project Overview

ATS (Applicant Tracking System) para a Beauty Smile. React 18 + Vite + TypeScript strict + Supabase (Auth, DB, Storage, Edge Functions). Duas personas: Candidato (publico, mobile-first) e RH/Admin (interno, desktop-first).

**Milestone atual:** M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS) · Phase 46
**M1–M7:** SHIPPED, 201 requirements validados. Não há M9 planejado — fechar o M8 fecha o
projeto como está escopado hoje.
**Branch base:** `main`
**Planning:** `.planning/` (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md)
**PRD-Master:** `docs/prds/PRD-MASTER-sistema-recrutamento.md`

> ⚠ Até 2026-08-25 estas linhas diziam «M1 — MVP Candidato (Fases 1-5)» e apontavam uma branch
> base que não é mais a de trabalho. Era a **primeira coisa** que qualquer sessão lia, e estava
> sete milestones atrás. Registro desatualizado custa o mesmo que registro ausente — e este
> custava mais, porque vinha com autoridade de documento oficial do repositório.

## Commands

```bash
npm run dev              # Vite dev server (porta 3003)
npm run build            # Producao → build/
npm run lint             # tsc --noEmit (type-check only)
npm run db:types         # Regenerar database.types.ts (requer Supabase CLI)

npm run test             # Vitest watch
npm run test:run         # Vitest single run
npm run test:e2e         # Playwright
npm run test:e2e:headed  # Playwright com browser visivel
```

### Migrations + db push — workaround conhecido (PL/pgSQL)

Migrations contendo `CREATE FUNCTION` ou `DO` blocks com corpo `$$ ... $$`
combinados com statements adjacentes (`COMMENT` / `REVOKE` / `GRANT`) podem
falhar via `supabase db push --linked` no transaction pooler com:

```
ERROR: cannot insert multiple commands into a prepared statement (SQLSTATE 42601)
```

**Workaround** (estabelecido em Phase 4 / Plan 04-01 / migrations 03 + 04):

1. Abrir Supabase SQL Editor → colar SQL do arquivo de migration → executar manualmente.
2. Sincronizar estado local: `supabase migration repair --status applied <version>`.
3. Confirmar: `supabase db push --linked` deve responder "Remote database is up to date".
4. Remover wrappers `BEGIN; ... COMMIT;` do topo do arquivo e adicionar nota inline
   explicando o motivo — o driver do Supabase CLI já envolve cada migration em
   sua própria transação implícita; o BEGIN/COMMIT externo é o gatilho do erro.

Esse padrão deve recorrer em Phase 4+ e Phase 5 (mais migrations PL/pgSQL).

### ✅ Via de apply ATUAL (estabelecida na Phase 46, 2026-08-22) — leia antes das duas seções acima

As duas vias anteriores continuam funcionando, mas **ambas têm um defeito que esta não tem**:
elas dependem de o SQL ser **transcrito** (colado no SQL Editor, ou passado como string pelo
tool MCP `apply_migration`). Foi por aí que **duas das cinco migrations do M8 chegaram a PROD
com os comentários descartados** — e é por isso que o cross-check de `md5(statements[1])` existe.

**Via atual: Management API do Supabase, com o SQL LIDO DO ARQUIVO.**

```
POST https://api.supabase.com/v1/projects/{ref}/database/query
Authorization: Bearer <token>          # Keychain: serviço "Supabase CLI", conta "supabase"
Content-Type: application/json
{"query": "<conteúdo do arquivo, byte a byte>"}
```

É o mesmo transporte que o MCP usa por baixo, mas o corpo vem de `fs.readFileSync` em vez de
uma transcrição. Três propriedades medidas em 2026-08-22:

1. **Atomicidade.** O endpoint roda o corpo INTEIRO da requisição numa única transação — sonda
   com `CREATE TABLE; SELECT 1/0;` deixou a tabela inexistente. Por isso a migration e a linha
   de `supabase_migrations.schema_migrations` podem ir na MESMA requisição: um apply que roda
   mas não se registra é indistinguível de um que não rodou.
2. **⚠ A `version` nasce CORRETA — não há reparo a fazer.** O `apply_migration` do MCP carimba
   o instante do apply em vez da versão do nome do arquivo, e por isso as migrations antigas
   deste repositório mandam rodar um `UPDATE ... SET version` depois.
   **Essa instrução está OBSOLETA e continua escrita dentro do banco**, nos cabeçalhos das
   migrations `20260823000001`..`4` (o `statements[1]` guarda o arquivo literal, comentários
   inclusive). Corrigir aqueles arquivos faria o md5 divergir do ledger e quebraria a própria
   prova — por isso a correção vive aqui, e não lá.
3. **O md5 bate por construção, e ainda assim é conferido** por leitura de volta do ledger.

**Não é necessária a senha do banco** — ela não é recuperável no painel do Supabase (mostrada
uma única vez, na criação) e não é preciso resetá-la.

Aplicador: `p46apply.cjs` (`migrate` / `run` / `sql`). Se ele não estiver mais disponível, o
contrato acima é suficiente para reescrevê-lo em ~100 linhas.

#### ⚠ Esta via NÃO passa pelo git — e o código do front SAI POR OUTRO CANAL

`p46apply.cjs` fala direto com o Supabase. O front-end é publicado pela **Vercel, a partir de um
push no `main`**. São dois canais independentes, e foi por aí que, em 2026-09-06, a migration
`20260906000007` ficou horas em PROD com o código que a chama **parado no disco local** — três
commits feitos e não enviados (§7.27 do `GUIA-VALIDACAO-FINAL`).

O que isso produz é pior que um deploy faltando: **o sintoma na tela é idêntico ao de um conserto
que não funciona**, e leva a acusar um commit correto. Depois de todo apply cujo efeito é visível
na interface:

```bash
git log --oneline origin/main..HEAD    # tem de sair VAZIO
```

E, para conferir que um marcador chegou mesmo ao ar, procure-o **no chunk certo**: rotas `/rh/*`
e `/admin/*` viram chunks lazy, então buscar no índice eager dá **falso negativo**.
`grep -rl "<marcador>" build/assets/` diz em qual arquivo ele mora.

### Portões: varra pela FORMA, não pelo sintoma

A Phase 46 encontrou **três** asserções de smoke que congelavam um **instantâneo** e se
apresentavam como **invariante**. Os dois modos de falha são assimétricos e o segundo é pior:

| Forma | Exemplo | Falha |
|---|---|---|
| Contagem contra constante | `p42_invent05_cron_smoke` (a): `count(*) <> 3` · `p43_matriz_retencao_smoke` (j): matriz `= seed` | **Reprova trabalho correto, com diagnóstico FALSO.** A (j) acusava "a política de retenção de PROD ficou com valor de teste" quando um admin havia legitimamente editado a janela |
| Iteração sobre lista literal | `p43_previa_smoke` (f)/(g): `proname IN ('a','b')` | **Não reprova nada.** O objeto novo fica fora da vigilância e o portão segue **verde** |

Antes de acrescentar um objeto que um smoke vigia, **varra pela forma** (`grep -nE "v_[a-z_]* (<>|!=) [0-9]+|= ANY \(ARRAY\['"`), e para cada achado pergunte: *esta lista/contagem codifica um ESCOPO deliberado, ou uma FOTOGRAFIA que vai envelhecer?* As duas coisas parecem iguais no código e são opostas.
Conserto: comparar com **baseline capturada na própria execução** (impressão digital via
`to_jsonb` da linha inteira, que não envelhece quando nasce coluna nova), nunca com constante.
E depois do conserto, **prove por execução que o portão ainda MORDE** — um portão que você
tornou incapaz de falhar é pior que o quebrado.

## Architecture

- **Frontend:** SPA React com Vite, alias `@/` → `src/`
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions). Sem servidor Node proprio.
- **Auth:** 1 store Zustand unificado com `role` (candidato | rh | admin). Role via JWT Custom Access Token Hook.
- **Estado servidor:** TanStack Query v5 (staleTime 5min, retry 2)
- **Forms:** React Hook Form + Zod (schemas pt-BR, validacao por step)
- **UI:** Tailwind CSS + shadcn/ui (Radix) + glass UI Beauty Smile
- **Types:** `database.types.ts` gerado pelo Supabase CLI (NUNCA editar manualmente)

## Key Conventions

- **Idioma:** dominio em pt-BR (tabelas, enums, mensagens), codigo tecnico em en
- **Componentes:** PascalCase.tsx, export nomeado (nunca default)
- **Hooks:** useCamelCase.ts
- **Services:** camelCaseService.ts com classes de erro customizadas
- **Features:** `src/features/<dominio>/` com components/, hooks/, services/, schemas/, types/
- **Imports:** `@/` para absolutos, relativos dentro da mesma feature
- **Enums DB:** snake_case pt-BR (`status_vaga`, `etapa_processo`)
- **Query keys:** hierarquicas (`vagasKeys.list(filters, orderBy, pagination)`)

## Security Rules

- **NUNCA** usar `supabaseAdmin` ou service_role key no client-side
- Operacoes privilegiadas vao para Edge Functions (`supabase/functions/`)
- RLS habilitado em 100% das tabelas com dados de usuario
- Duplicate check via RPC SECURITY DEFINER (nao anon SELECT)
- DevNavigationMenu gateado por `import.meta.env.DEV`
- Linguagem de produto: "avaliacao comportamental/cognitiva" (nunca "teste psicologico")
- Sistema NUNCA rejeita candidato automaticamente por score (RNF-07a)

## File Structure

```
src/
├── features/          # Organizacao por dominio (auth, cadastro, vagas)
├── components/
│   ├── pages/         # Paginas (legado, migrar para features/)
│   └── ui/            # shadcn/ui primitives
├── store/authStore.ts # Auth unificado (1 store)
├── lib/supabase/      # Client anon APENAS
├── router/routes.tsx  # Todas as rotas
└── hooks/             # Hooks compartilhados
```

## GSD Workflow

Este projeto usa o framework GSD para execucao faseada:
- `/gsd-plan-phase N` — planeja fase N
- `/gsd-execute-phase N` — executa fase N
- `/gsd-progress` — verifica progresso
- `/gsd-verify-work` — valida features via UAT

**Estado atual:** `.planning/STATE.md`
**Roadmap:** `.planning/ROADMAP.md` (5 fases, 38 requirements)
