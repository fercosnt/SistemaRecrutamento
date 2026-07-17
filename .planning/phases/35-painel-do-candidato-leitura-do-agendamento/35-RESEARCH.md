# Phase 35: Painel do Candidato — Leitura do Agendamento - Research

**Researched:** 2026-07-17
**Domain:** Frontend-only (React 18 + Vite + TS strict + TanStack Query v5 + Supabase JS) — candidate-facing read of a scheduled interview + client-side `.ics` + ≤24h badge
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Surface (LOCKED):** card monta em `src/components/pages/DashboardCandidatoPage.tsx` (rota `/candidato/dashboard`), **NÃO** em `HubCandidatoRH.tsx` (RH-only). A menção da ROADMAP 35-01 a "HubCandidatoRH" é erro/shorthand; AGEND-04 é candidate-facing.
- **Card inline, sem rota nova.** Renderiza inline no footer "Próximo passo" do `GlassCard` por-candidatura, apenas para candidaturas em etapa `entrevista_online`/`entrevista_presencial` com agendamento retornado por `get_meu_agendamento`. Nenhuma rota `/candidato/entrevista/*` nova.
- **Visual:** seguir a linguagem `GlassCard` do `DashboardCandidatoPage` (público, mobile-first). NÃO importar `HubSection`/`Badge`/`Tooltip` dark-glass do hub RH.
- **Timezone (LOCKED):** reusar o idioma SP-pinned de `EntrevistaDashboard.tsx:44-73` (`Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).formatToParts()` → `dd/mm/aaaa às hh:mm`), **extraindo-o para um util compartilhado** que ambos importam. NÃO usar o formatter `date-fns` browser-local do `AgendamentoBlock` (TZ errada para AGEND-04).
- **Campos exibidos (allowlist 7 cols):** `data_hora` (formatada SP), `tipo` (online/presencial), `local_ou_link`, `status`. Nunca exibir campos fora do allowlist.
- **`local_ou_link`:** se `tipo='online'` e URL → link clicável (`<a target="_blank" rel="noopener noreferrer">`); se `presencial` → texto do local (nunca link).
- **Status:** linhas `cancelada`/`reagendada` permanecem visíveis. Card sempre renderiza; `cancelada` visivelmente marcada.
- **`.ics` hand-rolled client-side** (VCALENDAR string + `Blob({type:'text/calendar'})` + `URL.createObjectURL`), espelhando `biasAuditService.ts:147-148`. **Zero npm novo.**
- **Conteúdo do `.ics`:** `SUMMARY` genérico ("Entrevista Beauty Smile" — `vaga_id` fora do allowlist), `DTSTART`=`data_hora` em UTC/`Z`, `DTEND`=+1h default, `LOCATION`=`local_ou_link`. Sem PII interna.
- **`.ics` + badge SÓ para entrevistas upcoming não-canceladas** (`data_hora` futura E `status ≠ 'cancelada'`). Badge de lembrete: `0 < (data_hora − now) ≤ 24h`.
- **Zero mudança de schema/migration** — frontend puro. Depende inteiramente da tabela/RLS/RPC provadas seguras na Phase 33.

### Claude's Discretion
- Nome/local exato do util compartilhado (sugerido `formatDataHoraSP`), formato preciso do card, cópia pt-BR dos labels/badges, duração default do `.ics` (1h), detalhes de layout.
- Se a RPC deve ser chamada por candidatura (a página itera candidaturas) ou uma vez — respeitando staleTime/TanStack.

### Deferred Ideas (OUT OF SCOPE)
- Notificação por e-mail/push do agendamento (painel é o canal único; `.ics` + badge são os substitutos client-side). Não implementar.
- Rota/tela dedicada de entrevista do candidato — descartada em favor do card inline.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **AGEND-04** | Candidato vê a entrevista agendada num card no painel — data/hora em `America/Sao_Paulo` + link/local — painel como canal único; leitura restrita à própria linha por allowlist explícita (nunca expõe observações internas do RH). | RPC `get_meu_agendamento` já live em PROD + já tipada em `database.types.ts` (§Standard Stack). Shared TZ util extraída de `EntrevistaDashboard` (§Pattern 1). Mount + gating em `DashboardCandidatoPage` (§Pattern 3). |
| **AGEND-05** | Candidato baixa `.ics` do agendamento + vê badge de lembrete quando a entrevista está a ≤24h. | `.ics` hand-rolled RFC 5545 (§Pattern 4 + §Code Examples). Blob-download idiom de `biasAuditService` (§Don't Hand-Roll). Predicado ≤24h puro (§Pattern 5). |
</phase_requirements>

## Summary

Phase 35 é **frontend puro, zero schema, zero npm novo**. Toda a camada de dados e segurança já foi entregue e provada na Phase 33: a tabela `agendamentos_entrevista`, a RLS `rh_gerencia_agendamento` (WR-04 join-through), e a **RPC DEFINER `get_meu_agendamento(p_candidatura_id)`** — cujo `RETURNS TABLE` de 7 colunas (`id, candidatura_id, tipo, data_hora, local_ou_link, status, compareceu`) **exclui fisicamente** `observacoes_rh`/`entrevistador`/`agendado_por`/`updated_by`/`vaga_id` (SEG-03 por construção). O trabalho desta fase é 100% cliente: um service que chama a RPC, um hook TanStack, e um componente-card inline no `DashboardCandidatoPage`, mais duas funções puras (`.ics` builder + predicado ≤24h) e a extração de um util de timezone compartilhado.

Três descobertas mudam o plano em relação ao que o scout assumiu: (1) **a RPC `get_meu_agendamento` JÁ ESTÁ na `database.types.ts` gerada** (linha 4792) — diferente de `get_minha_redacao`, então o service pode chamar `supabase.rpc('get_meu_agendamento', …)` **totalmente tipado, sem o cast confinado `as never`/`as unknown`** que `redacaoService` precisou. (2) O gerador do Supabase marca as colunas de `RETURNS TABLE` como **não-nulas** (`local_ou_link: string`, `compareceu: boolean`), mas as colunas reais são **nullable** — o domínio Row do service deve declarar `local_ou_link: string | null` e tratar link ausente defensivamente. (3) Extrair o TZ util é **seguro**: `formatDataHora`/`compute24hMarker` são exportados de `EntrevistaDashboard.tsx` mas **nenhum outro módulo os importa** (só `EntrevistaWorkspace` importa o componente), então mover a lógica de formatação para `src/lib/datetime/` e re-importá-la de volta não quebra nenhum caller.

**Primary recommendation:** Criar `src/lib/datetime/formatDataHoraSP.ts` (extração), `src/features/agendamento/services/agendamentoCandidatoService.ts` (RPC read tipada + `gerarIcsAgendamento` puro + predicados puros), `src/features/agendamento/hooks/useMeuAgendamento.ts` (mirror de `useAgendamento`), e `src/features/agendamento/components/AgendamentoCandidatoCard.tsx` (child component montado por-candidatura no `DashboardCandidatoPage` só para as 2 etapas de entrevista — isso evita hook condicional dentro do `.map`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Own-row read do agendamento (allowlist) | **Database / RPC DEFINER** (`get_meu_agendamento`, já live) | Client service (`.rpc` call + map) | Isolamento de coluna + posse é responsabilidade do servidor; o cliente só projeta o que a RPC devolve. RLS é row-level, não column-level — a assinatura da RPC é o allowlist. |
| Formatação data/hora em `America/Sao_Paulo` | **Browser / Client** (`Intl.DateTimeFormat`) | — | `timestamptz` chega como ISO UTC; a fixação de TZ para display é puramente client-side (`Intl`), nunca server-formatted. |
| `.ics` generation + download | **Browser / Client** | — | Zero e-mail, zero servidor: string VCALENDAR + `Blob` + `URL.createObjectURL` — 100% no navegador. |
| Badge ≤24h "upcoming" | **Browser / Client** (função pura de `data_hora` vs `now`) | — | Computado client-side, sem coluna nova, sem round-trip (CONTEXT/UI-SPEC LOCKED). |
| Gating por etapa (entrevista_online/presencial) | **Browser / Client** (render condition) | — | O `DashboardCandidatoPage` já itera candidaturas e conhece `etapa_atual`; só renderiza o card+dispara a RPC para as 2 etapas. |

## Standard Stack

Nenhum pacote novo. Tudo já instalado e em uso no projeto.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | ^5.90.10 [VERIFIED: package.json] | Server-state (read do agendamento, staleTime 5min, retry 2, `enabled`) | Padrão do projeto em toda feature candidate-facing; `useAgendamento`/`useEntrevistaScorecard` são os análogos diretos. |
| `@supabase/supabase-js` | (client em `@/lib/supabase/client`) [VERIFIED: codebase] | `.rpc('get_meu_agendamento', …)` — anon/authenticated client APENAS (nunca service_role no cliente) | Único caminho de dados; RPC DEFINER já tipada na `database.types.ts`. |
| `lucide-react` | (já dependência) [CITED: 35-UI-SPEC.md] | Ícones (`CalendarCheck`, `Video`, `MapPin`, `Download`, `RefreshCw`, `CalendarClock`, `AlertCircle`, `CheckCircle2`, `Clock`) | Todos já importados neste arquivo ou standard; zero novo import externo. |
| `Intl.DateTimeFormat` (Web API) | nativo | Formatação `dd/mm/aaaa às hh:mm` pinada a `America/Sao_Paulo` | Nativo, zero dep, DST-robusto (Brasil aboliu DST em 2019; SP é UTC-3 fixo — mas `Intl` acerta independente disso). |

### Supporting (existing, reused)
| Asset | Location | Purpose | When to Use |
|-------|----------|---------|-------------|
| `Glass`/`GlassCard`/`GlassButton` | `src/components/ui/glass.tsx` | Camada visual glass candidate-público | Todo o card — variante `white`, mobile-first. |
| Blob-download idiom | `biasAuditService.ts:147-148` | `Blob` + `createObjectURL` + `<a download>` + `revokeObjectURL` | Espelhar VERBATIM para o `.ics`. |
| SP-timezone idiom | `EntrevistaDashboard.tsx:44-73` (`saoPauloParts`/`formatDataHora`) | Formatação TZ-pinada | Extrair para shared util, ambos importam. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Intl.DateTimeFormat` SP-pinned | `date-fns` (v2.30.0, já instalado) / `date-fns-tz` | ❌ `date-fns` `format()` é **browser-local** (o bug que o `AgendamentoBlock` tem — TZ errada para AGEND-04). `date-fns-tz` seria npm novo (proibido). Intl nativo é a escolha LOCKED. |
| `.ics` hand-rolled | `ics` / `ical-generator` npm | ❌ Zero npm novo (LOCKED). O formato é RFC 5545 estável e minúsculo — hand-roll é correto aqui. |
| Cast confinado `as unknown` na RPC (como `redacaoService`) | Chamada tipada direta | ✅ `get_meu_agendamento` **já está** na `database.types.ts` — chamada direta tipada, sem cast. |

**Installation:** Nenhuma. `npm install` não é executado nesta fase.

## Package Legitimacy Audit

**Não aplicável.** Esta fase instala **zero** pacotes externos (LOCKED: "Zero npm novo", confirmado em ROADMAP L15 + AGEND-05 + 35-UI-SPEC §Registry Safety). Todos os assets (`@tanstack/react-query`, `@supabase/supabase-js`, `lucide-react`, glass UI) já estão no `package.json` e em uso. slopcheck/registry-verification não executados por ausência de superfície de risco. Se o planner descobrir necessidade de um pacote, disparar o Package Legitimacy Gate antes.

## Architecture Patterns

### System Architecture Diagram

```
DashboardCandidatoPage (/candidato/dashboard)
  │  useCandidaturas() → lista de candidaturas (já existe)
  │
  └─ .map(candidatura) → GlassCard por-candidatura
        │
        ├─ [etapa_atual ∈ {entrevista_online, entrevista_presencial}] ?
        │        │  SIM → renderiza <AgendamentoCandidatoCard candidaturaId etapa/>   ← substitui o footer "Próximo passo"
        │        │  NÃO → footer "Próximo passo" existente (inalterado)
        │        ▼
        │   AgendamentoCandidatoCard  (child component — dono do hook)
        │        │
        │        └─ useMeuAgendamento(candidaturaId)   [enabled só p/ etapa de entrevista]
        │                │  queryFn
        │                ▼
        │           agendamentoCandidatoService.getMeuAgendamento(candidaturaId)
        │                │  supabase.rpc('get_meu_agendamento', { p_candidatura_id })   [TIPADO]
        │                ▼
        │        ┌──────────────────────────────────────────────┐
        │        │  Supabase Postgres (PROD, já deployado P33)   │
        │        │  get_meu_agendamento  SECURITY DEFINER         │
        │        │   WHERE candidatura_id=$1 AND ca.user_id=auth.uid()  ← posse
        │        │   RETURNS 7-col allowlist (sem observacoes_rh) │  ← SEG-03
        │        │   ORDER BY data_hora DESC                       │
        │        └──────────────────────────────────────────────┘
        │                │  rows[]  → rows[0] (mais recente)
        │                ▼
        │        MeuAgendamentoRow  { id, candidatura_id, tipo, data_hora, local_ou_link|null, status, compareceu|null }
        │                │
        │   ┌────────────┼──────────────────────────────┐
        │   ▼            ▼                                ▼
        │  formatDataHoraSP()   estaDentroDe24h()      gerarIcsAgendamento()   ← 3 funções PURAS
        │  (shared lib)         + upcoming/non-cancel   (Blob+createObjectURL, RFC 5545)
        │       │                gate                        │
        │       ▼                ▼                            ▼
        │   texto SP          badge âmbar / botão .ics    download entrevista-beauty-smile.ics
        │   dd/mm às hh:mm    (só upcoming não-cancelada)
        │
        └─ Estados: loading (skeleton) · no-agendamento (0 rows) · has · cancelada-visible · error(refetch)
```

### Recommended Project Structure
```
src/
├── lib/datetime/
│   └── formatDataHoraSP.ts          # NOVO — saoPauloParts + formatDataHoraSP (extraído de EntrevistaDashboard)
├── features/agendamento/            # já existe (RH-side)
│   ├── services/
│   │   ├── agendamentoService.ts     # existe (RH — expõe observacoes_rh; NÃO tocar/reusar p/ candidato)
│   │   └── agendamentoCandidatoService.ts   # NOVO — getMeuAgendamento (RPC) + gerarIcsAgendamento + predicados
│   ├── hooks/
│   │   ├── useAgendamento.ts         # existe (RH); mirror de shape
│   │   └── useMeuAgendamento.ts      # NOVO — TanStack read via RPC, enabled por etapa
│   └── components/
│       └── AgendamentoCandidatoCard.tsx     # NOVO — card inline candidate-público
└── components/pages/
    └── DashboardCandidatoPage.tsx    # EDIT — montar o card no map, só p/ etapas de entrevista
```

### Pattern 1: Extrair o TZ util compartilhado (sem quebrar EntrevistaDashboard)
**What:** Mover `saoPauloParts` + `formatDataHora` de `EntrevistaDashboard.tsx` para `src/lib/datetime/formatDataHoraSP.ts`, exportando como `formatDataHoraSP`. `EntrevistaDashboard` re-importa e usa no lugar do local. `formatCurto` (tooltip-only) e `compute24hMarker` (label RH) **ficam locais** em `EntrevistaDashboard` — o candidato não precisa da forma curta nem do label; usa seu próprio predicado booleano.
**When to use:** Antes de qualquer código do card (o card e o EntrevistaDashboard dependem dele).
**Why safe:** grep confirma que `formatDataHora`/`compute24hMarker` exportados de `EntrevistaDashboard` **não são importados por nenhum outro módulo** (`EntrevistaWorkspace` importa só o componente). `AgendamentoBlock` tem seu PRÓPRIO `formatDataHora` local (date-fns, browser-local) — fora de escopo, é RH-surface.
**Example:**
```typescript
// Source: src/features/entrevista/components/EntrevistaDashboard.tsx:44-73 (extraído verbatim)
// src/lib/datetime/formatDataHoraSP.ts
const DISPLAY_TIME_ZONE = 'America/Sao_Paulo'

export function saoPauloParts(iso: string):
  { dd: string; mm: string; yyyy: string; hh: string; min: string } | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: DISPLAY_TIME_ZONE, day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const hh = pick('hour') === '24' ? '00' : pick('hour')  // engine edge: midnight → '00'
  return { dd: pick('day'), mm: pick('month'), yyyy: pick('year'), hh, min: pick('minute') }
}

/** `dd/mm/aaaa às hh:mm` pinado a America/Sao_Paulo. */
export function formatDataHoraSP(iso: string | null): string | null {
  if (!iso) return null
  const p = saoPauloParts(iso)
  return p ? `${p.dd}/${p.mm}/${p.yyyy} às ${p.hh}:${p.min}` : null
}
```

### Pattern 2: RPC read TIPADA (sem cast — difere de redacaoService)
**What:** `get_meu_agendamento` já está na `database.types.ts` gerada (linha 4792) → chamada `.rpc` diretamente tipada. **Não** replicar o cast confinado `as unknown as (...)` que `redacaoService` usou (aquele existe só porque `get_minha_redacao` NÃO estava nos types).
**Gotcha crítico:** o gerador marca `local_ou_link` e `compareceu` como **não-nulos** no `Returns`, mas as colunas reais são **nullable**. Declarar o domínio Row com `| null` e tratar `local_ou_link` ausente.
**Example:**
```typescript
// Source: database.types.ts:4792-4803 (Functions['get_meu_agendamento']) + get_minha_redacao service shape
// src/features/agendamento/services/agendamentoCandidatoService.ts
import { supabase } from '@/lib/supabase/client'
import type { TipoAgendamento, StatusAgendamento } from './agendamentoService' // reusar os union types

export class MeuAgendamentoServiceError extends Error {
  constructor(message: string, public code: 'INVALID_INPUT'|'DATABASE_ERROR'|'NOT_FOUND', public details?: unknown) {
    super(message); this.name = 'MeuAgendamentoServiceError'
  }
}

/** Row do candidato — allowlist de 7 cols. local_ou_link/compareceu são nullable no runtime
 *  (o gerador do Supabase marca RETURNS TABLE como não-nulo — NÃO confiar). */
export interface MeuAgendamentoRow {
  id: string
  candidatura_id: string
  tipo: TipoAgendamento
  data_hora: string            // ISO timestamptz
  local_ou_link: string | null // ⚠ generated diz `string`; coluna é nullable
  status: StatusAgendamento
  compareceu: boolean | null   // não renderizado no card, mas nullable
}

export async function getMeuAgendamento(candidaturaId: string): Promise<MeuAgendamentoRow | null> {
  if (!candidaturaId) throw new MeuAgendamentoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  const { data, error } = await supabase.rpc('get_meu_agendamento', { p_candidatura_id: candidaturaId })
  if (error) {
    throw new MeuAgendamentoServiceError(
      `Não foi possível carregar sua entrevista: ${error.message}`, 'DATABASE_ERROR', error)
  }
  const rows = (data ?? []) as MeuAgendamentoRow[]  // RPC já ordena data_hora DESC
  return rows[0] ?? null                            // a mais recente
}
```
**Anti-pattern:** NUNCA `supabase.from('agendamentos_entrevista').select('*')` no caminho do candidato — não existe policy SELECT de base-table para candidato (a leitura retornaria 0 rows), e `select('*')` reintroduziria o vazamento de coluna que a RPC previne por construção ([[reference_select_star_leaks_pii]]).

### Pattern 3: Child component por-candidatura (evita hook condicional no `.map`)
**What:** O `DashboardCandidatoPage` renderiza candidaturas num `.map`. React **proíbe** chamar hooks condicionalmente dentro de um loop. Solução: um child component `AgendamentoCandidatoCard` que é renderizado no map só para as 2 etapas de entrevista; o hook `useMeuAgendamento` vive dentro dele com `enabled` próprio.
**When to use:** No `.map` do footer (L379-398), substituir o footer "Próximo passo" quando `etapa_atual ∈ {entrevista_online, entrevista_presencial}`.
**Example:**
```tsx
// dentro do .map de DashboardCandidatoPage.tsx, no lugar do footer "Próximo passo":
const etapa = candidatura.etapa_atual as EtapaFunilM2  // mesma cast-idiom já usada na página (D-09 drift guard)
const ehEntrevista = etapa === 'entrevista_online' || etapa === 'entrevista_presencial'
// ...
{ehEntrevista
  ? <AgendamentoCandidatoCard candidaturaId={candidatura.id} tipoEtapa={etapa} />
  : (/* footer "Próximo passo" existente, inalterado */)}
```
```tsx
// useMeuAgendamento.ts — mirror de useAgendamento (staleTime 5min, retry 2, enabled)
export const meuAgendamentoKeys = {
  all: ['meu-agendamento'] as const,
  byCandidatura: (id: string) => [...meuAgendamentoKeys.all, id] as const,
}
export function useMeuAgendamento(candidaturaId: string | undefined) {
  return useQuery({
    queryKey: meuAgendamentoKeys.byCandidatura(candidaturaId || ''),
    queryFn: () => getMeuAgendamento(candidaturaId!),
    enabled: !!candidaturaId,     // o pai só monta o card p/ etapas de entrevista
    staleTime: 5 * 60 * 1000, gcTime: 5 * 60 * 1000, retry: 2,
  })
}
```

### Pattern 4: `.ics` builder puro (RFC 5545, hand-rolled)
**What:** Gerar uma string VCALENDAR mínima válida. Campos obrigatórios: VCALENDAR→`VERSION:2.0`+`PRODID`; VEVENT→`UID`+`DTSTAMP`+`DTSTART`. Adicionar `DTEND`(+1h), `SUMMARY`, `LOCATION`. **CRLF (`\r\n`)** obrigatório (RFC 5545; Outlook rejeita `\n`). `timestamptz`→forma UTC básica (`Z`). **Escapar TEXT** (RFC 5545 §3.3.11): `\`, `,`, `;`, `\n` em SUMMARY/LOCATION (endereço com vírgula quebra o arquivo).
**When to use:** No `onClick` do botão `.ics` — síncrono, sem loading state.
**Example:** ver §Code Examples abaixo.

### Pattern 5: Predicados puros (upcoming + ≤24h)
**What:** Duas condições LOCKED. Gate comum (botão `.ics` E badge): `data_hora > now && status !== 'cancelada'`. Badge adicional: `0 < (data_hora − now) ≤ 24h`.
**Example:**
```typescript
const H24 = 24 * 60 * 60 * 1000
export function ehUpcomingNaoCancelada(iso: string, status: StatusAgendamento, now = new Date()): boolean {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return t > now.getTime() && status !== 'cancelada'
}
export function estaDentroDe24h(iso: string, now = new Date()): boolean {
  const diff = new Date(iso).getTime() - now.getTime()
  return diff > 0 && diff <= H24   // 0 < diff ≤ 24h
}
```

### Anti-Patterns to Avoid
- **`select('*')` ou base-table read no caminho do candidato:** reintroduz vazamento de coluna + retorna 0 rows (sem policy candidato). Só a RPC.
- **`date-fns format()` para a data do card:** browser-local, TZ errada (é o bug do `AgendamentoBlock`). Usar `formatDataHoraSP`.
- **Hook dentro de `.map` condicional:** extrair child component.
- **Confiar no `local_ou_link: string` gerado:** é nullable no runtime — tratar `null`.
- **`.ics` com `\n`:** usar `\r\n`.
- **`LOCATION`/`SUMMARY` não-escapados:** vírgula no endereço quebra o VEVENT.
- **Renderizar `presencial` como link:** LOCKED — presencial é sempre texto, mesmo se parecer URL.
- **Adicionar coluna nova / migration:** fase é frontend puro.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Formatação TZ São Paulo | Aritmética manual de offset UTC-3 | `Intl.DateTimeFormat` SP-pinned (extração de `EntrevistaDashboard`) | Offset manual quebra em edge cases; `Intl` é nativo e correto. |
| Download de arquivo no browser | FileSaver/npm de download | Blob+`createObjectURL`+`<a download>`+`revokeObjectURL` de `biasAuditService.ts:147-148` | Idiom já provado no repo; zero dep. |
| Tipagem da RPC | Escrever tipos à mão / `as any` | `Functions['get_meu_agendamento']` da `database.types.ts` (já gerado) | Já tipado — chamada `.rpc` direta é tipada. |
| Server-state / cache / refetch | `useState` + `useEffect` + fetch manual | TanStack Query (mirror de `useAgendamento`) | staleTime/retry/enabled/refetch já é o padrão do projeto. |

**Do hand-roll (deliberadamente):** o `.ics`. É RFC 5545 estável, ~15 linhas, e a restrição LOCKED é zero npm. É o único caso onde construir é a decisão certa — mantê-lo mínimo e escapar TEXT.

**Key insight:** quase tudo desta fase é **reuso de idioms existentes**; o único código genuinamente novo é o `.ics` builder (pequeno, puro, testável) e a fiação do card.

## Runtime State Inventory

Não aplicável — não é fase de rename/refactor/migração. É feature-work greenfield frontend, read-only, sobre infraestrutura já deployada. Nenhum estado runtime armazenado é renomeado ou migrado.

## Common Pitfalls

### Pitfall 1: Gerador do Supabase marca `RETURNS TABLE` como não-nulo
**What goes wrong:** `database.types.ts:4799` declara `local_ou_link: string` e `compareceu: boolean` (não-nulos), mas as colunas reais (`agendamentos_entrevista.local_ou_link text`, `compareceu boolean`) são **nullable**. Confiar no tipo gerado → crash de runtime quando `local_ou_link` é `null` (agendamento criado sem link/local ainda).
**Why it happens:** o gerador de types do Supabase não infere nullability de colunas dentro de `RETURNS TABLE` — assume não-nulo.
**How to avoid:** declarar o domínio `MeuAgendamentoRow` com `local_ou_link: string | null` (e `compareceu: boolean | null`); renderizar link/local só quando presente.
**Warning signs:** `.toString()`/`.startsWith()` em `local_ou_link` sem guard de null.

### Pitfall 2: TZ errada (date-fns browser-local)
**What goes wrong:** usar `date-fns format()` (como `AgendamentoBlock.tsx:108-111`) mostra a hora no fuso do navegador do candidato, não em Brasília — um candidato viajando vê hora errada (AGEND-04 exige `America/Sao_Paulo`).
**How to avoid:** `formatDataHoraSP` (Intl SP-pinned). LOCKED.
**Warning signs:** import de `date-fns`/`date-fns/locale` no card.

### Pitfall 3: `.ics` inválido (CRLF, escaping, timezone)
**What goes wrong:** (a) line endings `\n` → Outlook desktop rejeita/corrompe; (b) `LOCATION:Av. Paulista, 1000, sala 4` com vírgulas não-escapadas → parser quebra o campo; (c) `DTSTART` sem `Z` e sem `TZID` → hora ambígua no calendário do usuário.
**How to avoid:** juntar linhas com `\r\n`; escapar `\ , ; \n` em TEXT; emitir `DTSTART`/`DTEND`/`DTSTAMP` na forma UTC básica (`YYYYMMDDTHHMMSSZ`) derivada de `new Date(iso).toISOString()`.
**Warning signs:** arquivo abre no Google Calendar mas falha no Outlook; evento no horário errado.

### Pitfall 4: Hook condicional no `.map`
**What goes wrong:** chamar `useMeuAgendamento` dentro do `.map` só para etapas de entrevista viola as Rules of Hooks (contagem de hooks varia entre renders) → crash.
**How to avoid:** child component `AgendamentoCandidatoCard` — o hook vive nele, sempre chamado; o pai decide se **monta** o child.

### Pitfall 5: `etapa_atual` typed como enum M1 legado
**What goes wrong:** `Candidatura.etapa_atual` é tipado `EtapaProcesso` (M1, `vagasTypes.ts:347`) mas o valor runtime é o enum M2 (`entrevista_online`, …). Comparar direto pode não type-check ou não bater.
**How to avoid:** usar a MESMA cast-idiom que a página já usa: `candidatura.etapa_atual as EtapaFunilM2` (D-09 drift guard, `DashboardCandidatoPage.tsx:110,138`).

### Pitfall 6: Card deve sempre renderizar quando há row (cancelada visível)
**What goes wrong:** esconder `cancelada` — o candidato PRECISA ver o cancelamento.
**How to avoid:** card sempre renderiza uma vez que a RPC devolve ≥1 row; `.ics`+badge são gated OUT para `cancelada`/passado, mas a linha (status chip + data) permanece visível (dimmed). LOCKED.

## Code Examples

### `.ics` builder (RFC 5545 mínimo, hand-rolled, escaped, CRLF)
```typescript
// Source: RFC 5545 §3.4/§3.6.1/§3.3.11 (icalendar.org) + biasAuditService.ts:147-148 (blob idiom)
// src/features/agendamento/services/agendamentoCandidatoService.ts

/** timestamptz ISO → forma UTC básica do iCalendar: 2026-07-20T14:30:00.000Z → 20260720T143000Z */
function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Escapa TEXT do iCalendar (RFC 5545 §3.3.11): \ , ; e newline. */
function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Gera a string VCALENDAR/VEVENT do agendamento (SUMMARY genérico — sem PII interna). */
export function gerarIcsAgendamento(row: MeuAgendamentoRow): string {
  const dtStart = toIcsUtc(row.data_hora)
  const dtEnd = toIcsUtc(new Date(new Date(row.data_hora).getTime() + 60 * 60 * 1000).toISOString()) // +1h
  const dtStamp = toIcsUtc(new Date().toISOString())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Beauty Smile//Recrutamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${row.id}@recrutamento.beautysmile`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText('Entrevista Beauty Smile')}`,
    ...(row.local_ou_link ? [`LOCATION:${escapeIcsText(row.local_ou_link)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')  // CRLF obrigatório (Outlook)
}

/** Dispara o download (síncrono) — espelha o idiom de biasAuditService.ts:147-148. */
export function baixarIcsAgendamento(row: MeuAgendamentoRow): void {
  const blob = new Blob([gerarIcsAgendamento(row)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'entrevista-beauty-smile.ics'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
```

### Chamada `.rpc` tipada (verified shape)
```typescript
// database.types.ts:4792-4803 — Functions['get_meu_agendamento'] (VERIFIED)
// Args: { p_candidatura_id: string }
// Returns: { candidatura_id, compareceu, data_hora, id, local_ou_link, status, tipo }[]
//   status: Enums['status_entrevista'] = agendada|em_andamento|concluida|cancelada|reagendada|nao_compareceu
//   tipo:   Enums['tipo_entrevista_avaliacao'] = online|presencial
const { data, error } = await supabase.rpc('get_meu_agendamento', { p_candidatura_id: candidaturaId })
// data é tipado — SEM cast confinado (difere de get_minha_redacao, que não estava nos types)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `redacaoService` precisa cast confinado `as unknown as (...)` porque `get_minha_redacao` não estava nos types | `get_meu_agendamento` **está** na `database.types.ts` (regen pós-P33) | 2026-07-16 (types regenerados, `Jul 16 13:10`) | Chamada `.rpc` tipada direta; menos débito de cast; não precisa `db:types` regen nesta fase. |
| Notificação de entrevista por e-mail (padrão de mercado) | Painel in-app + `.ics` download + badge ≤24h (client-side) | M6 design (no-email invariant) | Zero pipeline COMM; tudo client-side. |

**Deprecated/outdated para esta fase:**
- `AgendamentoBlock.formatDataHora` (date-fns browser-local): correto para a superfície RH, **errado** para AGEND-04 candidate-facing. Não reusar.
- `formatarData` de `DashboardCandidatoPage.tsx:86-93` (date-only, browser-local): grão e TZ errados. Não reusar.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `local_ou_link` e `compareceu` são nullable no runtime apesar do type gerado dizer não-nulo | Pitfall 1 / Pattern 2 | Baixo — confirmado pelo DDL da migration (`local_ou_link text` sem NOT NULL, `compareceu boolean` sem NOT NULL, L29/L33). Tratar como nullable é o lado seguro de qualquer forma. |
| A2 | DST não afeta a formatação SP (Brasil aboliu horário de verão em 2019; `Intl` acerta independente) | Standard Stack | Nenhum — `Intl.DateTimeFormat` com `timeZone` é correto com ou sem DST. |
| A3 | Extrair `formatDataHora` de `EntrevistaDashboard` não quebra callers | Pattern 1 | Baixo — grep confirmou zero importadores externos da função; só o componente é importado (por `EntrevistaWorkspace`). |

**Nota:** Nenhuma assumption de compliance/segurança/retenção. O isolamento SEG-03 já é enforced e testado no servidor (P33, 9/9 smokes a–i GREEN por MEMORY).

## Open Questions

1. **Home/nome exato do shared util** (`formatDataHoraSP.ts` em `src/lib/datetime/`?)
   - What we know: não existe `src/lib/datetime/` hoje; `src/lib/` já hospeda utils cross-feature (`navegacao`, `opcoes`, `utils.ts`). CONTEXT sugere `formatDataHoraSP`.
   - What's unclear: nome do arquivo/export final (discrição do executor).
   - Recommendation: `src/lib/datetime/formatDataHoraSP.ts`, export `formatDataHoraSP` + `saoPauloParts`. `EntrevistaDashboard` re-importa.

2. **`AgendamentoBlock` (RH surface) continua com date-fns browser-local?**
   - What we know: é RH-facing, fora do escopo de AGEND-04 (candidate-only). Tem TZ potencialmente inconsistente com o card do candidato para a MESMA entrevista.
   - What's unclear: se o RH deve ver a mesma hora SP-pinada.
   - Recommendation: **fora de escopo desta fase** (candidate-only). Registrar como tech-debt opcional; não bloquear P35. Se trivial, o executor pode migrar `AgendamentoBlock` para o mesmo util (discrição), mas não é requisito.

3. **Query por-candidatura vs. batch**
   - What we know: a página itera candidaturas; poucas terão etapa de entrevista simultaneamente.
   - Recommendation: por-candidatura via child component + `enabled` (Pattern 3) — mais simples, respeita TanStack; o volume de entrevistas ativas por candidato é baixo. Discrição LOCKED permite.

## Environment Availability

Não aplicável — mudança code-only, sem dependências externas de tooling/serviço em runtime de build. A única dependência de runtime (a RPC `get_meu_agendamento`) **já está deployada em PROD** (verificado: presente na migration aplicada P33 + presente na `database.types.ts` gerada 2026-07-16). Toolchain (Node/npm/Vite/Vitest) já provado pelo projeto em execução.

## Validation Architecture

`workflow.nyquist_validation: true` → seção incluída.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 [VERIFIED: package.json] (+ `@vitest/ui`); Playwright 1.56.1 p/ e2e |
| Config file | (vite-integrated; sem `vitest.config.*` standalone — config vive no Vite config) |
| Quick run command | `npm run test:run` (vitest single run) |
| Full suite command | `npm run test:run` + `npm run lint` (tsc --noEmit) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGEND-04 | `formatDataHoraSP` produz `dd/mm/aaaa às hh:mm` em SP para um instante UTC conhecido (+ edge midnight '24'→'00') | unit (pura) | `npm run test:run -- formatDataHoraSP` | ❌ Wave 0 |
| AGEND-04 | Read do candidato vai por `.rpc('get_meu_agendamento')`, NUNCA base-table; shape sem `observacoes_rh`/`entrevistador` | unit (guard, mirror `redacaoService.rpc.test.ts`) | `npm run test:run -- agendamentoCandidatoService` | ❌ Wave 0 |
| AGEND-05 | `gerarIcsAgendamento` emite VCALENDAR/VEVENT válido: `DTSTART` UTC `Z`, `DTEND`=+1h, `LOCATION` escapado (vírgula), CRLF, SUMMARY genérico (sem vaga) | unit (pura) | `npm run test:run -- agendamentoCandidatoService` | ❌ Wave 0 |
| AGEND-05 | Gate `ehUpcomingNaoCancelada` + `estaDentroDe24h`: boundary (exatamente 24h, sob, sobre, passado, cancelada) | unit (pura) | `npm run test:run -- predicados` | ❌ Wave 0 |
| AGEND-04/05 | Card states (loading/no-agendamento/has/cancelada-visible/error) renderizam corretos | component (RTL) — opcional | `npm run test:run -- AgendamentoCandidatoCard` | ❌ Wave 0 (opcional) |

**Sampling rate:** per-task commit → `npm run test:run -- <arquivo alvo>`; per-wave → `npm run test:run` completo; phase gate → suíte verde + `npm run lint` (tsc ≤104 baseline, atualmente 97) antes de `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/lib/datetime/__tests__/formatDataHoraSP.test.ts` — cobre AGEND-04 (TZ + edge midnight)
- [ ] `src/features/agendamento/services/__tests__/agendamentoCandidatoService.test.ts` — RPC guard + `.ics` builder + predicados (AGEND-04/05); mirror do harness `rpcCalls`/`fromTables` de `redacaoService.rpc.test.ts` (via `vi.hoisted` + `vi.mock('@/lib/supabase/client')`)
- [ ] (opcional) `src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx` — states
- Framework install: **nenhum** — Vitest + Testing Library já presentes.

**Test seams de maior valor (funções puras):** `formatDataHoraSP`, `gerarIcsAgendamento`, `ehUpcomingNaoCancelada`, `estaDentroDe24h` — todas puras, determinísticas com `now` injetável. O guard de RPC (assert `.rpc` chamada + shape sem colunas RH) é o teste de segurança de maior valor (padrão SEC do repo — testar a chamada de rede + o shape, não o JSX).

## Security Domain

`security_enforcement` ausente na config → tratado como habilitado. O grosso do enforcement de SEG-03 já foi entregue e provado no servidor na **Phase 33** (9/9 smokes a–i GREEN, por MEMORY); esta fase é o **consumidor cliente** e não deve enfraquecer nada.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | Own-row read APENAS via `get_meu_agendamento` DEFINER (posse `ca.user_id=auth.uid()` dentro da fn). Nenhuma policy SELECT base-table candidato existe → base-table read = 0 rows. Cliente nunca faz `.from(agendamentos_entrevista)`. |
| V5 Input Validation / Output Encoding | yes | `local_ou_link` renderizado como link **só** quando `tipo='online'` (`rel="noopener noreferrer" target="_blank"`); `presencial` sempre texto. `.ics` escapa TEXT (RFC 5545 §3.3.11). React escapa conteúdo textual por padrão. |
| V6 Cryptography | no | Nenhum crypto; sem segredos no cliente. |
| V2/V3 Auth/Session | no | Herda a sessão Supabase existente; nada novo. |

### Known Threat Patterns for {React client + Supabase RPC}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Vazamento de coluna RH-interna (`observacoes_rh`/`entrevistador`) na projeção candidato | Information Disclosure | RPC allowlist de 7 cols (exclui por construção). Cliente NUNCA adiciona fallback de base-table nem `select('*')` ([[reference_select_star_leaks_pii]]). |
| Cross-candidate read (candidato A lê agendamento de B) | Information Disclosure / Elevation | Posse enforced DENTRO da RPC (`user_id=auth.uid()`); já smoke-provado P33. O cliente só passa `candidatura_id` — a RPC nega se não for dono. |
| `javascript:`/`data:` URL em `local_ou_link` renderizado como `href` | Tampering / XSS-ish | `local_ou_link` é RH-authored (baixo risco), mas renderizar como link só p/ `tipo='online'` + considerar validar prefixo `http(s)://` antes de virar `<a href>`. |
| `.ics` injection via campo não-escapado (CRLF/`;`/`,` em `local_ou_link`) | Tampering | `escapeIcsText` em SUMMARY/LOCATION; join com `\r\n` controlado pelo builder, não pelo conteúdo. |

## Project Constraints (from CLAUDE.md)

- **Segurança:** NUNCA `supabaseAdmin`/service_role no cliente. RLS em 100% das tabelas com dados de usuário. Leituras own-row do candidato via allowlist explícita, **nunca `select('*')`** — usar a RPC DEFINER.
- **Idioma:** domínio em pt-BR (labels, mensagens); código técnico em en.
- **Componentes:** PascalCase.tsx, **export nomeado** (nunca default). Hooks `useCamelCase.ts`. Services `camelCaseService.ts` com classe de erro customizada (`XServiceError`).
- **Features:** `src/features/<dominio>/` com `components/`, `hooks/`, `services/`. Imports `@/` para absolutos.
- **Estado servidor:** TanStack Query v5 (staleTime 5min, retry 2). Query keys hierárquicas.
- **Types:** `database.types.ts` gerado (na RAIZ) — NUNCA editar manualmente. Nesta fase não precisa `db:types` regen (a RPC já está lá).
- **tsc baseline:** `npm run lint` = `tsc --noEmit`; baseline ≤104 (atualmente 97). Novo código não deve ADICIONAR erros. Husky pre-commit strict tsc; `--no-verify` sancionado só quando bloqueado pelo débito pré-existente de cadastro/vagas.
- **Linguagem de produto:** "avaliação comportamental/cognitiva" / "entrevista" — nunca "teste psicológico" (RNF-12a; invariante mantida mesmo não diretamente acionada aqui).
- **DevNavigationMenu** gateado por `import.meta.env.DEV` (não relevante aqui).
- **No-email (M6 invariant):** nenhum wiring de notificação/e-mail; `.ics`+badge são os substitutos client-side.

## Sources

### Primary (HIGH confidence)
- Codebase (VERIFIED via Read/grep):
  - `supabase/migrations/20260716000001_agendamentos_entrevista.sql:133-168` — RPC `get_meu_agendamento` (7-col allowlist, posse interna, ORDER BY data_hora DESC).
  - `database.types.ts:4792-4803` — `Functions['get_meu_agendamento']` tipado (Args + Returns + Enums).
  - `src/features/entrevista/components/EntrevistaDashboard.tsx:44-73` — idiom SP-timezone (`saoPauloParts`/`formatDataHora`).
  - `src/features/admin/bias-audit/services/biasAuditService.ts:147-155` — blob-download idiom.
  - `src/features/agendamento/services/agendamentoService.ts` + `hooks/useAgendamento.ts` — service/hook shape + enums (`TipoAgendamento`/`StatusAgendamento`).
  - `src/features/avaliacao/services/redacaoService.ts:158-234` + `__tests__/redacaoService.rpc.test.ts` — candidate DEFINER-RPC read pattern + test harness (`rpcCalls`/`fromTables` via `vi.hoisted`).
  - `src/components/pages/DashboardCandidatoPage.tsx:86-93,110,138,379-398` — mount surface, `formatarData` (a evitar), cast-idiom `as EtapaFunilM2`.
  - `src/lib/navegacao/funilNavMap.ts:93-106` — `rotaCandidato: () => null` p/ etapas de entrevista.
  - `package.json` — `@tanstack/react-query ^5.90.10`, `vitest ^4.1.9`, `date-fns ^2.30.0` (a evitar p/ TZ).
  - `.planning/config.json` — `nyquist_validation: true`, `security_enforcement` ausente (=habilitado).
- RFC 5545 (iCalendar) — [CITED: icalendar.org/iCalendar-RFC-5545/3-6-1-event-component.html] — VEVENT required fields (UID/DTSTAMP/DTSTART), TEXT escaping (§3.3.11).

### Secondary (MEDIUM confidence)
- ICS minimal-file structure + CRLF/PRODID/VERSION requirement — cross-verified em múltiplas fontes (text-2-ics, spreadevent, calen.events) contra RFC 5545.

### Tertiary (LOW confidence)
- Nenhum. Todos os claims técnicos verificados no codebase ou na RFC.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — tudo já instalado e em uso; RPC verificada na migration + types gerados.
- Architecture: HIGH — reuso de idioms provados no repo; padrões de service/hook/component idênticos aos existentes.
- Pitfalls: HIGH — os 6 pitfalls derivam de fatos verificados (type nullability, TZ, RFC 5545, Rules of Hooks, enum drift).

**Research date:** 2026-07-17
**Valid until:** ~2026-08-16 (30 dias — stack estável; único risco de invalidação é um regen de `database.types.ts` que remova a RPC, improvável).

Sources:
- [iCalendar.org RFC 5545 §3.6.1 Event Component](https://icalendar.org/iCalendar-RFC-5545/3-6-1-event-component.html)
- [ICS File Format Structure Guide](https://www.text-2-ics.com/blog/ics-file-format-structure-guide)
- [The complete ICS file guide — SpreadEvent](https://www.spreadevent.com/blog/ics-file-complete-guide)
</content>
</invoke>
