# Phase 1: Foundation Saneada - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 01-foundation-saneada
**Areas discussed:** Edge Functions, Migrations, Código RH, Route Guard

---

## Edge Functions: Escopo e Estrutura

| Option | Description | Selected |
|--------|-------------|----------|
| Uma por operação (Recomendado) | Edge Functions separadas: `cadastrar-candidato`, `check-duplicate`, etc. Deploy independente, isola falhas. | ✓ (com refinamento) |
| Agrupadas por domínio | Uma Edge Function `candidato-ops` que roteia internamente por action. Menos funções, mais acoplamento. | |
| Você decide | Claude escolhe baseado nos padrões Supabase. | |

**User's choice:** Uma por operação, mas com escopo mínimo: apenas `cadastrar-candidato` como Edge Function. Duplicate check via RPC `SECURITY DEFINER` (zero cold start, custo zero). Critério claro de separação: Edge Function = bypass RLS, RPC = leitura sanitizada, Client = RLS cobre.

**Notes:** Usuário detalhou rationale técnico completo: cold start (~50ms RPC vs ~500ms Edge Function), custo (RPC incluído no plano Supabase), simplicidade (sem boilerplate Deno para operações de leitura). Definiu padrão de response `{ ok, data?, error? }` e estrutura `_shared/` para schemas Zod.

---

## Migrations: Consolidação do Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Baseline fresh | pg_dump do schema atual → 0001_baseline.sql. Scripts antigos viram docs. | |
| Migrar os 29 scripts | Renumerar e mover scripts para supabase/migrations/. | |
| Híbrido | Baseline do estado atual + novas migrations forward. Scripts antigos como referência. | ✓ |

**User's choice:** Híbrido (baseline + forward). pg_dump schema-only do prod, arquivar scripts em `docs/sql/legacy/`, validar com `db reset → db:types → tsc`. Forward migrations numeradas por operação.

**Notes:** Usuário rejeitou migrar os 29 scripts individualmente — não são idempotentes, dependências implícitas, alguns parcialmente aplicados. "O que importa é o ESTADO atual, não o histórico." Detalhou plano de execução com 6 steps incluindo protocolo de aplicação em prod (nunca direto, sempre preview/staging). Adicionou decisão sobre seed.sql para dev local.

---

## Código RH durante Phase 1

| Option | Description | Selected |
|--------|-------------|----------|
| Atualizar tudo agora | Migrar todas as páginas RH para store unificado. Completo mas escopo grande. | |
| Stub mínimo | Deletar adminAuthStore, atualizar imports. Compila mas RH best-effort até M2. | |
| Isolar e não tocar | Re-export de compatibilidade. Zero risco de quebrar o que funciona. | ✓ |

**User's choice:** Isolar via re-export (`export const useAdminAuthStore = useAuthStore`). Limpeza real no M2.

**Notes:** Resposta concisa — selecionou opção 3 sem elaboração adicional. Prioriza zero risco de regressão na área RH durante M1.

---

## Route Guard: Comportamento de Loading e Role

| Option | Description | Selected |
|--------|-------------|----------|
| Tela branca | Flash rápido, simples | |
| Spinner centralizado | Feedback visual claro | ✓ (com delay 200ms) |
| Skeleton da página | Mais polido, mais trabalho | |

**User's choice — Loading:** Spinner centralizado com delay de 200ms. Rationale: verificação em cache ~50-100ms = usuário nunca vê spinner. Rede ruim ~500ms+ = spinner aparece. Skeleton é escopo de Fase 5 (HARD-02).

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect para home do role | Manda para onde deveria estar | ✓ (+ toast) |
| Página 403 | Acesso não autorizado | |
| Redirect para / | Landing page genérica | |

**User's choice — Role errado:** Redirect para home do role + toast informativo (Sonner). Candidato→`/candidato/perfil`, RH→`/rh/dashboard`. Nunca 403 (UX ruim), nunca `/` (descarta contexto).

**Notes:** Usuário forneceu implementação completa do `RoleGuard` com TypeScript, incluindo ordem de verificação em 4 steps, interface `RoleGuardProps`, e lista de testes E2E que precisam passar. Definiu `Role = 'candidato' | 'rh' | 'administrador'`.

---

## Claude's Discretion

- Estrutura interna do RoleGuard
- Naming de migrations (timestamps vs sequencial)
- Organização de `_shared/` em supabase/functions/
- Implementação do LoadingDelay

## Deferred Ideas

None — discussion stayed within phase scope
