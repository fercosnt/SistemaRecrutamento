# Phase 42: Inventário, Gates & Fila Art. 20 — Pattern Map

**Mapped:** 2026-07-29
**Files analyzed:** 23 new/modified artifacts (11 frontend novos · 5 edições · 3 SQL · 1 EF nova + 1 EF editada · 3 famílias de teste)
**Analogs found:** 22 / 23 (1 sem analog direto — `notificar-rh` resolução de destinatário multi-recipiente)

> **Relação com a 42-RESEARCH.md.** A pesquisa já cita analogs com file:line e traz o SQL alvo pronto (§Code Examples E1–E9). Este documento **não os duplica**: ele cobre o lado que a pesquisa toca de leve — os **moldes de frontend vivos** (excertos verbatim), a **forma dos arquivos** (JSDoc, export nomeado, query-keys, classe de erro) e a **estrutura dos testes**. Onde a pesquisa é a fonte melhor, este arquivo aponta para lá em vez de re-citar.

---

## File Classification

| Novo/Modificado | Role | Data Flow | Analog mais próximo | Match |
|---|---|---|---|---|
| `src/features/revisao/components/RevisoesRHPage.tsx` | page | request-response | `src/components/pages/RelatoriosRHPage.tsx` | exact |
| `.../components/FilaRevisoesTable.tsx` | component (table) | CRUD read | `src/features/funil/components/FilaTrabalhoTab.tsx` | **exact (molde verbatim)** |
| `.../components/RevisaoSlaBadge.tsx` | component (presentational) | transform | `src/features/funil/components/SlaBadge.tsx` | exact (comportamento) |
| `.../components/VereditoBadge.tsx` | component (presentational) | transform | `SlaBadge.tsx` (ramo `within`) + `Badge` | role-match |
| `.../components/ResponderRevisaoDialog.tsx` | component (form) | request-response | `src/features/decisao/components/RegistrarDecisaoForm.tsx` | **exact** |
| `.../constants/revisaoSla.ts` (`classifyRevisaoSla`, `diasEmEspera`) | utility (pure) | transform | `src/features/funil/constants/slaThresholds.ts` | exact |
| `.../hooks/useFilaRevisoes.ts` | hook | CRUD read | `src/features/funil/hooks/useFilaTrabalho.ts` | exact |
| `.../hooks/useRevisoesPendentesCount.ts` | hook | CRUD read | idem (mesma fábrica de keys) | exact |
| `.../hooks/useConfigSlaRevisao.ts` | hook | CRUD read | idem + `retry: false` | role-match |
| `.../hooks/useResponderRevisao.ts` | hook (mutation) | request-response | `src/features/decisao/hooks/useRegistrarDecisao.ts` | **exact** |
| `.../services/revisaoService.ts` (+`RevisaoError`) | service | request-response | `src/features/explicacao/services/explicacaoService.ts` + `funilKpisService.ts` | exact |
| `.../schemas/responderRevisaoSchema.ts` | schema | validation | `src/features/decisao/schemas/decisaoSchema.ts` | **exact** |
| `src/components/RHSidebar.tsx` (edição) | nav | — | os 6 `MenuItem` existentes (:83-116) | in-place |
| `src/router/routes.tsx` (edição) | route | — | bloco `/rh/relatorios` (:423-430) | in-place |
| `src/features/explicacao/**` (3 edições) | page/hook/service | CRUD read | o próprio arquivo | in-place |
| `supabase/migrations/…_p42_revisao_art20.sql` | migration | — | `20260625100001` (RPC) + `20260721000002` (config) + `20260722000002` (trigger `atualizado_em`) | exact |
| RPC `responder_revisao_decisao` | rpc (write) | request-response | `solicitar_revisao_decisao` (`20260625100001:174-231`) | **exact** |
| RPC `listar_revisoes_decisao` | rpc (read) | CRUD read | `funil_kpis` (DEFINER, escopo re-implementado) | role-match |
| Tabela `config_sla_revisao` | config table | — | `config_sla_etapa` (padrão sim, **RLS não**) | partial (ver Pitfall 3) |
| Trigger `trg_notif_revisao_solicitada`/`_respondida` | trigger | event-driven | `20260726000001:60-118` + o ancestral `20260706110005:163-211` | exact |
| `supabase/functions/notificar-rh/{index,helpers}.ts` | edge function | event-driven | `notificar-candidato/{index,helpers}.ts` | role-match (destinatário difere) |
| `supabase/functions/notificar-rh/__tests__/*.test.ts` | test (deno) | — | `notificar-candidato/__tests__/notificar-candidato.test.ts` | exact |
| `supabase/tests/p42_revisao_art20_smoke.sql` | test (sql) | — | `p41_recon_retry_smoke.sql` (gate-GUC) + `funil01_pontuar_sjt_smokes.sql:130-155` (impersonação) | exact |

---

## Pattern Assignments — Frontend

### `RevisoesRHPage.tsx` (page, request-response)

**Analog:** `src/components/pages/RelatoriosRHPage.tsx` (que por sua vez clona `AiCostsPage`).

**Cabeçalho + imports do shell RH** (`RelatoriosRHPage.tsx:1-29`):
```tsx
/**
 * /rh/relatorios — the operational KPI dashboard for the RH funnel (KPI-02/04).
 * ...
 * @module components/pages/RelatoriosRHPage
 * @see src/features/admin/ai-costs/components/AiCostsPage.tsx (the structure cloned)
 */
import { RHLayout } from '../RHLayout'
import { GlassCard } from '../ui/glass'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { useFunilKpis } from '@/features/funil/hooks/useFunilKpis'
```
> Copiar: bloco JSDoc pt-BR/en com `@module` + `@see`, export **nomeado**, `RHLayout` + `GlassCard` como casca. **Divergência deliberada desta fase:** o arquivo mora em `src/features/revisao/components/` (feature nova), então os imports do shell usam alias — `import { RHLayout } from '@/components/RHLayout'`, `import { GlassCard } from '@/components/ui/glass'`.

**Rota** — copiar o bloco de `/rh/relatorios` (`src/router/routes.tsx:423-430`), **não** o de `/rh/configuracoes`:
```tsx
{
  path: '/rh/relatorios',
  element: (
    <RoleGuard role={['rh', 'administrador']}>
      <RelatoriosRHPage />
    </RoleGuard>
  ),
},
```
> ⚠ A UI-SPEC diz "`ProtectedAdminRoute`, mesmo gate de `/rh/relatorios`" — as duas metades se contradizem. O código vivo é `RoleGuard role={['rh','administrador']}`. Seguir o código (RESEARCH §Pitfall 4). O lazy import segue `routes.tsx:63`: `const RevisoesRHPage = lazyNamed(() => import('../features/revisao/components/RevisoesRHPage'), 'RevisoesRHPage')`.

---

### `FilaRevisoesTable.tsx` (component, CRUD read)

**Analog:** `src/features/funil/components/FilaTrabalhoTab.tsx` — **molde estrutural verbatim** (106 linhas, ler inteiro).

**Copy congelada num literal único** (`:34-44`):
```tsx
/** Verbatim UI-SPEC copy (§Copywriting §Fila) — single source, no drift. */
const FILA_COPY = {
  empty: { heading: 'Nenhum candidato aguardando ação', body: '…' },
  error: { heading: 'Não foi possível carregar a fila.', generic: 'Verifique sua conexão e tente novamente.' },
} as const
```
> Adaptação P42: **dois** vazios (toggle on/off) — `FILA_COPY.empty.pendentes` e `.todos`, escolhidos por `incluirRespondidos`.

**AsyncState + shell da tabela** (`:46-76, 90-104`):
```tsx
const { data, isLoading, isError, refetch, isRefetching } = useFilaTrabalho()
const rows = data ?? []
return (
  <AsyncState
    isLoading={isLoading} isError={isError} isEmpty={rows.length === 0}
    onRetry={() => void refetch()} retrying={isRefetching}
    copy={{ empty: {…}, error: {…} }}
  >
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-white/10 hover:bg-white/10">
            <TableHead className="text-white/80">Candidato</TableHead>
            …
            <TableHead className="text-right text-white/80">Ações</TableHead>
```
```tsx
        <TableRow key={row.candidatura_id} className="border-white/10 hover:bg-white/5">
          <TableCell className="font-medium text-white">{row.candidato_nome ?? '—'}</TableCell>
          <TableCell className="text-white/80">{row.vaga_titulo ?? '—'}</TableCell>
          …
          <TableCell className="text-right">
            <Link to={…} className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-3 text-sm font-medium text-accent transition-colors hover:bg-white/10">
              Abrir <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
```
> Copiar classe a classe. Deltas P42: (1) header **sticky** dentro de `max-h-[70vh] overflow-y-auto`; (2) a ação é um `<button>` que abre o `ResponderRevisaoDialog`, não um `<Link>` — mantendo `min-h-[44px]` + `text-accent`; (3) `<TableHead className="sr-only">Ações</TableHead>` (UI-SPEC coluna 7); (4) `truncate` + `title={…}` nas colunas de nome/vaga; (5) "quem decidiu" nunca cai para UUID — o fallback é `'Não identificado'`, não `'—'`.

---

### `RevisaoSlaBadge.tsx` + `constants/revisaoSla.ts`

**Analog:** `SlaBadge.tsx` (56 linhas) + `constants/slaThresholds.ts` (61 linhas). **Comportamento** copiado; **thresholds não** (vêm da config).

**Classificador puro e total** (`slaThresholds.ts:45-61`):
```ts
export type SlaLevel = 'within' | 'aging' | 'breach'

export function classifySla(etapa: string, dias: number): SlaLevel {
  const threshold = SLA_POR_ETAPA[etapa as EtapaFunilM2]
  if (threshold === undefined) return 'within'          // ← total: nunca lança
  if (dias > BREACH_FACTOR * threshold) return 'breach'
  if (dias >= threshold) return 'aging'
  return 'within'
}

export function diasNaEtapa(entrouEtapaEm: string, now: Date = new Date()): number {
  const dias = differenceInCalendarDays(now, new Date(entrouEtapaEm))
  return dias < 0 ? 0 : dias                            // ← clamp de clock skew
}
```
> P42: assinatura `classifyRevisaoSla(dias: number, cfg?: { diasAtencao: number; diasAtraso: number } | null): 'em_dia' | 'atencao' | 'atrasado' | 'degenerado'`. `cfg` ausente/nulo, limiar não-positivo ou **ordem invertida** (`diasAtraso <= diasAtencao`) ⇒ `'degenerado'`. `diasEmEspera` é `diasNaEtapa` renomeada, mesmo corpo, mesmo clamp.

**Render colorblind-safe** (`SlaBadge.tsx:29-56`):
```tsx
const AGING_CLASSES = 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'
const BREACH_CLASSES = 'bg-red-500/20 text-red-300 border-red-500/30'

if (level === 'breach') return (
  <Badge variant="outline" className={cn(BREACH_CLASSES)}>
    <AlertTriangle aria-hidden="true" /> Atrasado · {dias}d
  </Badge>
)
…
// within — subtle, still carries the day count (never blank, never color-only).
return <span className="text-sm text-white/50">{dias}d</span>
```
> As duas paletas são reusadas byte-a-byte; a **verde** é nova: `bg-emerald-500/20 text-emerald-200 border-emerald-500/30` (UI-SPEC). O ramo `within` acima **é** o molde exato da faixa **degenerada** da P42 (`text-sm text-white/50`, sem badge). `VereditoBadge` é o mesmo esqueleto com `border-white/20 bg-white/5 text-white/80`.

---

### `ResponderRevisaoDialog.tsx` (component, form)

**Analog:** `src/features/decisao/components/RegistrarDecisaoForm.tsx` (203 linhas) — radio + textarea ≥50 + contador + `alert-dialog`. Ler inteiro.

**Tints do estado selecionado** (`:64-71`):
```tsx
const SELECTED_TINT: Record<Decisao, string> = {
  aprovado: 'border-white/30 bg-white/20 text-white',
  rejeitado: 'border-red-400/30 bg-red-500/15 text-red-300',
  em_espera: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
}
const UNSELECTED_TINT = 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
```
> P42: `mantida` → o tint neutro de `aprovado`; `revertida` → o tint âmbar de `em_espera` (**não** o destructive — a UI-SPEC é explícita: nada é apagado).

**Radio-group como Label-card** (`:105-131`) — copiar verbatim, incluindo `htmlFor`/`id` pareados e `min-h-[44px]`:
```tsx
<RadioGroup value={decisao ?? ''} onValueChange={(v: string) => setDecisao(v as Decisao)} aria-label="Decisão" className="grid gap-3 sm:grid-cols-3">
  {DECISAO_OPTIONS.map((opt) => (
    <Label key={opt.value} htmlFor={`decisao-${opt.value}`}
      className={cn('flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors',
        selected ? SELECTED_TINT[opt.value] : UNSELECTED_TINT)}>
      <RadioGroupItem value={opt.value} id={`decisao-${opt.value}`} className="border-current" />
      {opt.label}
    </Label>
  ))}
</RadioGroup>
```

**Gate + contador + erro de mínimo** (`:81-88, 134-161`):
```tsx
const tooShort = justificativa.length < JUSTIFICATIVA_MIN
const canSubmit = decisao !== null && !tooShort && !submitting
…
<span className={cn('text-sm font-semibold', tooShort ? 'text-white/50' : 'text-white/80')}>
  {justificativa.length} / {JUSTIFICATIVA_MIN} mín.
</span>
<Textarea id="justificativa" rows={4} className="bg-white/5 text-white placeholder:text-white/40 border-white/15" … />
{decisao !== null && tooShort ? (
  <p className="text-sm font-semibold text-red-300">A justificativa precisa de pelo menos 50 caracteres.</p>
) : null}
```
> P42 adiciona `maxLength={2000}` no `Textarea` (UI-SPEC E3/long-text).

**Confirmação terminal via alert-dialog aninhado** (`:165-200`):
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <GlassButton variant="white" hover disabled={!canSubmit} className="text-white min-h-[44px]">
      {submitting ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Registrando…</span>) : 'Registrar decisão'}
    </GlassButton>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{isRejeitado ? 'Rejeitar candidato?' : 'Registrar decisão?'}</AlertDialogTitle>
      <AlertDialogDescription>…</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Voltar</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirm}>{isRejeitado ? 'Registrar rejeição' : 'Registrar decisão'}</AlertDialogAction>
```
> O `AlertDialogCancel` já é rotulado **"Voltar"** — o vocabulário que a UI-SPEC exige. O envelope externo P42 é um `Dialog` (não `alert-dialog`) com `DialogTitle`/`DialogDescription` reais, e o CTA secundário é **"Fechar sem registrar"**. O ramo do `AlertDialogTitle` passa a ser `veredito === 'revertida' ? 'Reverter a decisão?' : 'Registrar resposta?'`.

---

### `useResponderRevisao.ts` (hook, mutation)

**Analog:** `src/features/decisao/hooks/useRegistrarDecisao.ts` (52 linhas — ler inteiro).
```ts
export function useRegistrarDecisao() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, UseRegistrarDecisaoVars>({
    mutationKey: [...decisaoKeys.all, 'registrar'],
    mutationFn: (vars) => registrarDecisao(vars),
    onSuccess: () => {
      toast.success('Decisão registrada e etapa finalizada.')
      queryClient.invalidateQueries({ queryKey: decisaoKeys.all })
      queryClient.invalidateQueries({ queryKey: candidaturasKeys.all })
    },
    onError: () => { toast.error('Não foi possível registrar a decisão. Tente novamente.') },
  })
}
```
> **Delta obrigatório P42:** o `onError` **não pode** ser um toast único. `RevisaoError.code === 'GUARD_DECISOR'` ⇒ **sem toast**, sem retry: o diálogo repassa ao alerta inline destructive (UI-SPEC §Recusa do servidor). Só `VALIDACAO`/`DESCONHECIDO` viram `toast.error`. Invalidations: `revisoesKeys.all` (lista **e** contador da sidebar).

### `useFilaRevisoes.ts` / `useRevisoesPendentesCount.ts` / `useConfigSlaRevisao.ts`

**Analog:** `src/features/funil/hooks/useFilaTrabalho.ts` (37 linhas — ler inteiro).
```ts
export const filaKeys = { all: ['fila-trabalho'] as const, lista: () => [...filaKeys.all, 'lista'] as const }
const STALE = 5 * 60 * 1000

export function useFilaTrabalho(options?: Omit<UseQueryOptions<FilaRow[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({ queryKey: filaKeys.lista(), queryFn: () => listFila(), staleTime: STALE, gcTime: STALE, retry: 2, ...options })
}
```
> P42: `revisoesKeys = { all: ['revisoes'], lists: () => [...all,'list'], list: (f) => [...lists(), f], pendentesCount: () => [...all,'pendentes-count'], configSla: () => [...all,'config-sla'] }` (forma de `vagasKeys`, CONVENTIONS §8.1). `useConfigSlaRevisao` usa **`retry: false`** e o consumidor trata erro como faixa degenerada — nunca erro de tela.

### `revisaoService.ts` (service)

**Analogs:** `explicacaoService.ts` (classe de erro + mapeamento de SQLSTATE) e `funilKpisService.ts:82-99` (chamada de RPC tipada).

**Classe de erro** (`explicacaoService.ts:52-67`):
```ts
/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class ExplicacaoServiceError extends Error {
  constructor(message: string, public code: 'INVALID_INPUT'|'NETWORK_ERROR'|'DATABASE_ERROR'|'FORBIDDEN'|'NOT_FOUND', public details?: unknown) {
    super(message); this.name = 'ExplicacaoServiceError'
  }
}
```
> P42: `RevisaoError` com `code: 'GUARD_DECISOR' | 'VALIDACAO' | 'DESCONHECIDO'` (UI-SPEC).

**Mapeamento de SQLSTATE → outcome** (`explicacaoService.ts:277-289`) — o idioma exato a estender:
```ts
if (error) {
  const code = (error as { code?: string }).code ?? ''
  const status = (error as { status?: number }).status
  if (code === '42501' || status === 403) return 'denied'
  if (code === 'P0002' || code === 'no_data_found') return 'unavailable'
  throw new ExplicacaoServiceError('Não foi possível enviar a solicitação. Tente novamente.', 'NETWORK_ERROR', error)
}
```
> P42: `42501` é **ambíguo** (não-é-RH × é-o-decisor). Discriminar pela mensagem, como a RESEARCH §Pattern 3 estabelece:
> `if (code === '42501') return new RevisaoError(msg, /decisor/i.test(error.message) ? 'GUARD_DECISOR' : 'DESCONHECIDO', error)`.

**Chamada de RPC + erro** (`funilKpisService.ts:82-99`):
```ts
const { data, error } = await supabase.rpc('funil_kpis', { p_vaga_id: vagaId ?? undefined })
if (error) throw new FunilKpisServiceError(`Não foi possível carregar os KPIs: ${error.message}`, 'DATABASE_ERROR', error)
return (data ?? {}) as unknown as FunilKpis
```

**Allowlist explícita como constante nomeada** (`explicacaoService.ts:84-85`) — o idioma para estender a leitura own-row do candidato (REVISAO-04):
```ts
export const DECISAO_EXPLICACAO_ALLOWLIST =
  'decisao, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em'
```
> Estender com `revisao_veredito, revisao_respondida_em`. **Nunca** `revisao_por_usuario` (UI-SPEC §Regra de identidade), **nunca** `justificativa` (a exclusão está documentada em `:69-83` como fix CR-01 — não reverter).

### `responderRevisaoSchema.ts` (schema)

**Analog:** `src/features/decisao/schemas/decisaoSchema.ts` (38 linhas — copiar a forma inteira):
```ts
export const JUSTIFICATIVA_MIN = 50
export const decisaoSchema = z.object({
  decisao: z.enum(['aprovado', 'rejeitado', 'em_espera']),
  justificativa: z.string().min(JUSTIFICATIVA_MIN, 'A justificativa precisa de pelo menos 50 caracteres.'),
})
export type DecisaoFormValues = z.infer<typeof decisaoSchema>
export const DECISAO_OPTIONS: { value: DecisaoFormValues['decisao']; label: string }[] = [
  { value: 'aprovado', label: 'Aprovar' }, …
]
```
> A mensagem de mínimo é **byte-a-byte a mesma** que a UI-SPEC da P42 exige. P42: `z.enum(['mantida','revertida'])` + `.max(2000)`, e `VEREDITO_OPTIONS = [{ value:'mantida', label:'Manter a decisão' }, { value:'revertida', label:'Reverter a decisão' }]`.

### `RHSidebar.tsx` (edição)

**Analog:** os próprios itens (`:83-116`) e o render do badge (`:241-250`).
```tsx
const menuItems: MenuItem[] = [
  { id: 'dashboard-rh',  label: 'Dashboard',  icon: <Home size={24} /> },
  { id: 'candidatos-rh', label: 'Candidatos', icon: <Users size={24} /> },
  { id: 'vagas-rh',      label: 'Vagas',      icon: <Briefcase size={24} /> },
  …
]
// getActivePageFromPath (:70-79)
if (pathname.startsWith('/rh/candidatos')) return 'candidatos-rh';
// handleMenuClick routes map (:124-134)
```
```tsx
{item.badge && item.badge > 0 && (
  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm drop-shadow-md">{item.badge}</Badge>
)}
```
> ⚠ `item.badge && item.badge > 0 &&` com `badge={0}` avalia para `0` e **React renderiza `0`**. O consumidor **tem** de passar `undefined`: `badge={count && count > 0 ? Math.min(count, 100) : undefined}` com o rótulo `99+` derivado no componente ou pré-formatado. Loading e erro ⇒ `undefined`. `MenuItem.badge?: number` já existe (`:16`) e esta fase é o primeiro consumidor.
> Inserir `{ id: 'revisoes-rh', label: 'Revisões', icon: <Scale size={24} /> }` **entre** `candidatos-rh` e `vagas-rh`, + 1 linha em `getActivePageFromPath` + 1 entrada no mapa `routes`. Três sítios, não um.

---

## Pattern Assignments — Database

> A pesquisa já traz o SQL alvo pronto e verificado: **E1** (trigger), **E3** (`responder_revisao_decisao`), **E4** (smoke de impersonação), **E5** (INVENT-05), **E6–E9** (queries de inventário). Aqui ficam só os **moldes de forma** que a pesquisa cita sem transcrever.

### RPC `SECURITY DEFINER` — forma canônica

**Analog:** `solicitar_revisao_decisao` (`supabase/migrations/20260625100001_decisao_final_phase15.sql:174-231`) — o irmão literal desta RPC.
```sql
CREATE OR REPLACE FUNCTION public.solicitar_revisao_decisao(p_candidatura_id uuid)
RETURNS public.decisao_final
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_owns boolean; v_row public.decisao_final;
BEGIN
  -- (1) guard de posse … IF NOT v_owns THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
  -- (2) alcançabilidade … USING ERRCODE = 'no_data_found';
  -- (3) UPDATE idempotente + readback
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_revisao_decisao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_revisao_decisao(uuid) TO authenticated;

COMMENT ON FUNCTION public.solicitar_revisao_decisao(uuid) IS
  'Phase 15 / DECISAO-04 (LGPD Art. 20): … SECURITY DEFINER + search_path=''''; guard: … senao 42501. '
  'Reachability: … senao no_data_found. … RETORNA a row (readback). GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC).';
```
> Copiar os 5 elementos: `SET search_path = ''` · `RETURNS public.decisao_final` (readback) · guards ordenados com `USING errcode` · o par `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated` · o `COMMENT` que descreve o contrato **incluindo os SQLSTATEs**. O corpo dos guards da P42 está pronto em RESEARCH §E3 — inclusive a ordem (guard-do-decisor **antes** do já-respondida).

### Tabela `config_sla_revisao` — padrão sim, RLS **não**

**Analog:** `20260721000002_config_sla_etapa.sql:53-76`.
```sql
CREATE TABLE public.config_sla_etapa (
  etapa            public.etapa_processo NOT NULL PRIMARY KEY,
  prazo_valor      integer               CHECK (prazo_valor IS NULL OR prazo_valor > 0),
  …
  atualizado_em    timestamptz           NOT NULL DEFAULT now(),
  CONSTRAINT ck_sla_prazo_consistente CHECK ((prazo_valor IS NULL) = (prazo_unidade IS NULL))
);
ALTER TABLE public.config_sla_etapa ENABLE ROW LEVEL SECURITY;
CREATE POLICY sla_public_read ON public.config_sla_etapa
  FOR SELECT TO anon, authenticated USING (true);   -- ⛔ NÃO COPIAR (RESEARCH §Pitfall 3)
```
> Copiar: coluna `atualizado_em timestamptz NOT NULL DEFAULT now()`, CHECK nomeado explicitamente para a invariante cruzada (aqui: `CHECK (dias_atraso > dias_atencao)`), seed `ON CONFLICT DO NOTHING`, ausência de policy de escrita. **Não copiar** a policy `TO anon`. `TO anon` em qualquer migration desta fase é sinal de alerta.
> ⚠ O arquivo `20260721000002` é marcado **`⛔ NÃO APLICAR`** (reconstrução por engenharia reversa; a version já está no ledger). É molde de leitura, não migration executável.

### Trigger de `atualizado_em` — trabalho **herdado**, não novo

**Analog / reuso obrigatório:** `20260722000002_p37_notificacoes_lacunas.sql:144-172`.
```sql
CREATE OR REPLACE FUNCTION public.tocar_atualizado_em()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$ BEGIN NEW.atualizado_em := pg_catalog.now(); RETURN NEW; END; $$;
…
-- `CREATE TRIGGER` puro, sem `DROP TRIGGER` prévio: … Falhar alto contra um
-- trigger inesperado é preferível a substituí-lo silenciosamente.
CREATE TRIGGER trg_config_sla_atualizado_em
  BEFORE UPDATE ON public.config_sla_etapa
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
```
> A migration da P42 escreve **apenas**:
> ```sql
> CREATE TRIGGER trg_config_sla_revisao_atualizado_em
>   BEFORE UPDATE ON public.config_sla_revisao
>   FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
> ```
> Sem redefinir a função, sem `DROP TRIGGER IF EXISTS` (idioma P37 deliberado). Note a assimetria com o trigger de `pg_net` do RESEARCH §E1, que **usa** `DROP TRIGGER IF EXISTS` — porque ali recria-se um trigger que já existiu. As duas convenções coexistem por razões diferentes; não uniformizar.

### Migration — invariantes de forma
- Sem wrapper `BEGIN;/COMMIT;` (D-22, CLAUDE.md §Migrations) — o driver envolve cada migration.
- Cabeçalho pt-BR com requisito coberto + nota de proveniência (molde: `20260721000002:1-40`).
- **Proibido `ADD COLUMN IF NOT EXISTS`** nesta fase (CONTEXT + autoconsistência com INVENT-04).
- Aplicação por **Supabase MCP `apply_migration`** + reconcile do ledger (RESEARCH §Pattern 6); `db push` proibido.

---

## Pattern Assignments — Edge Functions

### `supabase/functions/notificar-rh/` (nova)

**Analog:** `notificar-candidato/index.ts` (446 linhas) + `helpers.ts` (107) + `__tests__/` (568).

**Separação `index.ts` × `helpers.ts`** (`helpers.ts:1-8`) — a razão é testabilidade:
```ts
/**
 * `notificar-candidato/helpers.ts` — funções PURAS da EF, extraídas para serem
 * unit-testáveis SEM `Deno.serve` (mesmo padrão de `cost-alerter/messages.ts`: importar
 * `index.ts` num teste dispararia o servidor). O teste importa este módulo; a EF também.
 * Zero rede, zero segredo. `construirCorpoResend` NUNCA carrega a chave da API.
 */
```

**Deps injetáveis + handler testável** (`index.ts:84-100`):
```ts
export interface NotificarDeps {
  supabaseAdmin: any;
  /** `fetch` do envio ao Resend — testes injetam um mock → sem `--allow-net`. */
  fetchImpl: typeof fetch;
  /** Segredo esperado no Bearer (== NOTIFICAR_SECRET / service_role em produção). */
  serviceKey: string;
}
export async function handler(req: Request, deps: NotificarDeps): Promise<Response> {
```
> `Deno.serve` só sob `import.meta.main`. Copiar integralmente — é pré-requisito do teste de CI sem rede.

**Self-auth por Bearer do Vault** (`index.ts:110-120`):
```ts
const authHeader = req.headers.get("Authorization") ?? "";
const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
if (!bearer || bearer !== deps.serviceKey) {
  console.warn("[notificar-candidato] Bearer inválido/ausente");
  return errorResponse("UNAUTHORIZED", "Não autorizado.", 401);
}
```

**Leitura por allowlist de colunas** (`index.ts:182-215`) — nunca `select('*')`:
```ts
const { data: candidatura } = await supabaseAdmin.from("candidaturas")
  .select("candidato_id, vaga_id, etapa_atual, status, opcao_knockout_id").eq("id", candidatura_id).maybeSingle();
if (!candidatura) return jsonResponse({ ok: true, skipped: "dados_ausentes" }, 200);
```
> **Este é o sítio que a `notificar-rh` diverge** (único item sem analog): em vez de `candidatos.email` hard-wired, resolve **N** destinatários:
> ```ts
> const { data: destinatarios } = await supabaseAdmin.from("usuarios_rh")
>   .select("user_id, nome_completo, email")
>   .eq("ativo", true).is("deleted_at", null)
>   .in("role", ["administrador", "recrutador"]);   // ⚠ NUNCA 'rh' — RESEARCH §Pattern 5
> ```

**Idempotência + claim-before-send** (`index.ts:240-282`) — copiar verbatim, incluindo o retorno 200 no duplicate:
```ts
const modo = resolverModo();
const dest = resolverDestinatario(candidato.email, eventoNotif, modo);
const dedupe_key = montarDedupeKey(evento, candidatura_id, agendamento_id);
…
.upsert({ …, dedupe_key, status: "pendente", modo }, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id");
if (!claim || claim.length === 0) return jsonResponse({ ok: true, skipped: "duplicate" }, 200);
```
> `resolverModo`/`resolverDestinatario`/`exigirSinkTeste` de `_shared/email-config.ts` são **importados**, nunca reimplementados. Fire-and-forget: qualquer falha grava `falhou` + `computeProximaTentativa(novasTentativas)` e retorna **200** (`index.ts:285-300`) — `net.http_post` é at-most-once.

**Dedupe key** (`helpers.ts:29-41`) — o `if/else` que a P42 estende (ou não):
```ts
export function montarDedupeKey(e: EventoLedger, candidaturaId: string, agendamentoId?: string): string {
  if (e === "convite") { … return `${agendamentoId}:convite`; }
  return `${candidaturaId}:${e}`;
}
```
> Para `revisao_respondida` o `default` já é a chave correta (`decisao_final.candidatura_id` é UNIQUE). Para a EF **do RH**, a chave precisa ser distinta por destinatário — `${candidaturaId}:revisao_solicitada:${userId}` — senão o 1º RH consome o claim dos demais.

### `notificar-candidato/index.ts` (edição de alto risco)

O checklist dos **10 sítios** do 5º evento está em RESEARCH §Pattern 1 + §E2, com file:line por sítio. Não duplicado aqui. Sítio nº1, verbatim (`index.ts:65-70`):
```ts
const EVENTOS_VALIDOS: ReadonlySet<string> = new Set([
  "confirmacao", "avanco", "convite", "decisao",
]);
```
> `ReadonlySet<string>` — o compilador **não** pega a omissão. Ordem de deploy obrigatória: **EF → CHECK → trigger**.

---

## Pattern Assignments — Tests

### `supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts`

**Analog:** `notificar-candidato/__tests__/notificar-candidato.test.ts:1-46`.
```ts
/**
 * Phase 38 / Plan 38-03 Task 3 — invariantes puros da EF notificar-candidato (COMM-01/04).
 * Testa `helpers.ts` (funções puras) SEM disparar Deno.serve. Sem --allow-net: …
 * Run: deno test supabase/functions/notificar-candidato/__tests__/… --allow-env --allow-read
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeProximaTentativa, construirCorpoResend, type EventoLedger, logSeguro, mapearEvento, montarDedupeKey } from "../helpers.ts";

Deno.test("COMM-01 — dedupe_key: convite usa agendamento_id; demais usam candidatura_id", () => {
  assertEquals(montarDedupeKey("convite", "cand-1", "agd-9"), "agd-9:convite");
  assertEquals(montarDedupeKey("avanco", "cand-1"), "cand-1:avanco");
});

Deno.test("COMM-01 — mapa de evento cobre os 4 (ledger → email-config)", () => {
  const esperado: Record<EventoLedger, string> = { confirmacao: "candidatura_recebida", … };
  for (const e of Object.keys(esperado) as EventoLedger[]) assertEquals(mapearEvento(e), esperado[e]);
});
```
> O 2º teste **é** o molde do teste de paridade `EVENTOS_VALIDOS ⟷ Object.keys(EVENTO_MAP)` que a RESEARCH exige (T-42-V3): trocar `Record<EventoLedger,string>` literal por asserção de conjunto nos dois sentidos, para que o 5º evento não passe por omissão.

### `supabase/tests/p42_revisao_art20_smoke.sql`

**Analog A — gate-GUC** (`p41_recon_retry_smoke.sql`, cabeçalho :1-46 e o resumo final):
```sql
RESET ROLE;
SELECT set_config('smoke41.pass', '0', false);   -- idempotente entre runs
…
PERFORM set_config('smoke41.pass', (coalesce(nullif(current_setting('smoke41.pass', true), ''), '0')::int + 1)::text, false);
RAISE NOTICE 'PASS (e): …';
…
DO $$ DECLARE v_n int; v_esperado int := 5;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke41.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P41 FAIL (z): RESUMO % PASS de % esperadas — run parcial; NÃO tratar como verde', v_n, v_esperado;
  END IF;
END $$;
RESET ROLE;
```
> Copiar: cabeçalho que enumera cada asserção (a)…(z), o contador GUC `smoke42.pass`, o RESUMO com esperado **fixo**, `RESET ROLE` nas trocas, NOTICEs sem PII. Ver também `p37_fidelidade_schema_smoke.sql` para asserções de catálogo.

**Analog B — impersonação real** (`funil01_pontuar_sjt_smokes.sql:133-153`) — a prova exigida pelo critério de sucesso #3:
```sql
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.user'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    PERFORM public.pontuar_sjt(…);
    RAISE EXCEPTION 'FUNIL-01 FAIL (1 dedup): duplicate pergunta_id accepted (expected 22023 …)';
  EXCEPTION WHEN sqlstate '22023' THEN
    IF SQLERRM LIKE '%duplicada%' THEN
      RAISE NOTICE 'PASS (1 dedup): duplicate pergunta_id rejected (22023 resposta duplicada)';
    ELSE RAISE EXCEPTION 'FUNIL-01 FAIL (1 dedup): 22023 but unexpected message: %', SQLERRM; END IF;
  END;
END $$;
```
> Três coisas load-bearing a copiar: (1) `SET ROLE authenticated` + `set_config('request.jwt.claims', …, false)` — é assim que `auth.uid()` fica real dentro do DEFINER; (2) o `RAISE EXCEPTION` **dentro** do bloco de sucesso, para que "não levantou" seja falha e não verde; (3) o `SQLERRM LIKE '%…%'` que discrimina dois usos do mesmo SQLSTATE — exatamente o que a P42 precisa para separar "não é RH" de "é o decisor" em `42501`. O corpo completo da prova P42 está em RESEARCH §E4. A fixture segue o idioma `smoke.ready = 'y'/'n'` com `EXCEPTION WHEN OTHERS` marcando SKIP (`funil01…:120-130`).

**Vitest (frontend):** co-localizado em `__tests__/` ao lado do módulo (CONVENTIONS §2.1); precedente do classificador puro: `src/features/funil/constants/__tests__/slaThresholds.test.ts` — o alvo P42 é a **totalidade** de `classifyRevisaoSla` (config nula, limiares invertidos, data futura).

---

## Shared Patterns

### Estados assíncronos
**Source:** `src/components/ui/AsyncState.tsx`, consumido em `FilaTrabalhoTab.tsx:51-61`
**Apply to:** `FilaRevisoesTable`
Precedência travada `isLoading → slow → isError → isEmpty → children`; copy sobrescrita por `copy={{…}}` a partir de um literal `as const` único no topo do arquivo. Nunca compor loading/erro à mão.

### Classe de erro de serviço
**Source:** `explicacaoService.ts:52-67` (e `CadastroError`, CONVENTIONS §7.2)
**Apply to:** `revisaoService.ts`
`class XError extends Error` com `public code: <union literal>` + `public details?: unknown`, `this.name` setado. O `code` é o contrato com a UI.

### Cabeçalho de arquivo
**Source:** todo arquivo de feature recente (`FilaTrabalhoTab.tsx:1-17`, `explicacaoService.ts:1-49`)
**Apply to:** todos os arquivos novos
JSDoc multilinha explicando o **porquê** + invariantes + `@module` + `@see` apontando para o analog e para a UI-SPEC. Este documento é, ele mesmo, a fonte dos `@see`.

### Nunca `select('*')`
**Source:** allowlist nomeada em `explicacaoService.ts:84`, `notificar-candidato/index.ts:183`
**Apply to:** leitura do candidato, EF nova, e o `RETURNS TABLE(...)` das duas RPCs
`RETURNS SETOF decisao_final` é `select('*')` por outro nome e arrastaria a `justificativa` do recrutador (RESEARCH §Pitfall 8).

### Acionáveis com piso de 44px
**Source:** `FilaTrabalhoTab.tsx:93`, `RegistrarDecisaoForm.tsx:118,171`
**Apply to:** botão de linha, CTAs do diálogo, retry do AsyncState.

### Filtro de RH ativo
**Source:** `custom_access_token_hook` (`20260420000002:45-48`), `is_active_rh_admin()` (`20260713000001:69-73`)
**Apply to:** EF `notificar-rh`, escopo dentro de `listar_revisoes_decisao`
`ativo = true AND deleted_at IS NULL` é o par literal do repo. E `usuarios_rh.role` **nunca** vale `'rh'` — os valores são `administrador | gerente | recrutador | visualizador`.

---

## No Analog Found

| Artefato | Role | Data Flow | Razão |
|---|---|---|---|
| Resolução de destinatário **multi-recipiente** em `notificar-rh` | edge function | event-driven | Toda EF viva envia para **um** endereço resolvido de `candidatos.email`. Um fan-out de N destinatários com dedupe por destinatário não tem precedente. A estrutura (auth, ledger, modo, backoff) tem analog exato; só a resolução + a forma da `dedupe_key` são net-new. Semente: RESEARCH §Pattern 5. |

**Sem analog necessário (fora de código):** os artefatos de `docs/compliance/` (INVENT-01..04, REVISAO-06) são Markdown/YAML/SQL versionado; a pasta é nova e não há precedente de formato no repo. A estrutura recomendada está em RESEARCH §Recommended Project Structure e as queries em §E5–E9. O gate `tsc` de não-regressão do `.husky/pre-commit` copia 6 linhas do `.github/workflows/ci.yml` (RESEARCH §Known Conflict Resolution) — pinar em **97**, o valor real medido.

---

## Metadata

**Escopo da busca:** `src/features/{funil,decisao,explicacao,vagas}/`, `src/components/{pages,ui}/`, `src/router/`, `supabase/{migrations,functions,tests}/`, `.planning/codebase/`
**Arquivos lidos integralmente:** 9 (FilaTrabalhoTab, SlaBadge, slaThresholds, RegistrarDecisaoForm, useRegistrarDecisao, decisaoSchema, useFilaTrabalho, explicacaoService, RevisaoSlaBadge-alvo)
**Arquivos lidos por trecho:** 10 (RelatoriosRHPage, RHSidebar, routes.tsx, funilKpisService, notificar-candidato index+helpers+test, config_sla_etapa, p37 lacunas, p41 smoke, funil01 smoke, 20260625100001)
**Data:** 2026-07-29
