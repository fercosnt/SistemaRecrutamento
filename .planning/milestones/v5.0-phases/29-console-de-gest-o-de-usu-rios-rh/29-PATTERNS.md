# Phase 29: Console de Gestão de Usuários RH (A14 UI) - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 8 (7 new + 1 modified)
**Analogs found:** 8 / 8 (all exact or role+data-flow match — this is a UI-over-existing-EF phase, everything has a close in-repo precedent)

> **No backend work.** The console consumes the ALREADY-BUILT `gerenciar-usuario-rh` EF (Phase 28) for writes and reads the roster directly from `usuarios_rh` (RLS admin-only). Every pattern below is copy-from-existing; no new SQL, no new EF.

---

## Path-convention note (planner: resolve before Wave 1)

The orchestrator/CONTEXT/UI-SPEC name **flat** paths (`src/features/admin/{services,hooks,schemas,components}/`). The 4 existing admin features are **nested** sub-features instead: `src/features/admin/ai-logs/{components,hooks,services}/`, `.../bias-audit/...`, `.../ai-costs/...`, `.../prompt-versions/...`. Two honest options:

- **Flat (as CONTEXT/UI-SPEC lock it):** `src/features/admin/services/usuariosRhService.ts`, etc. — matches the orchestrator's file list verbatim.
- **Nested (as the 4 precedents do):** `src/features/admin/usuarios-rh/{services,hooks,schemas,components}/` — matches the established admin-feature shape.

This map uses the **flat** paths (CONTEXT is locked), but flags the nesting precedent so the planner can pick. Either way the file *contents* and analogs are identical.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/admin/services/usuariosRhService.ts` | service | CRUD + request-response (invoke) | `src/features/decisao/services/decisaoService.ts` (invoke + allowlist + error class) + `src/features/admin/bias-audit/services/biasAuditService.ts` (allowlist read) | exact |
| `src/features/admin/hooks/useUsuariosRh.ts` | hook | request-response | `src/features/admin/bias-audit/hooks/useBiasAudit.ts` (query+mutation+keys) + `src/features/decisao/hooks/useRegistrarDecisao.ts` (mutation invalidate) | exact |
| `src/features/admin/schemas/novoUsuarioSchema.ts` (+ `editarPapelSchema.ts`) | schema | transform (validation) | `src/features/decisao/schemas/decisaoSchema.ts` (client zod convention) + `supabase/functions/_shared/usuario-rh-schemas.ts` (the EF shape to mirror) | exact |
| `src/features/admin/components/GestaoUsuariosPage.tsx` | component (page host) | request-response | `src/features/admin/bias-audit/components/BiasAuditPage.tsx` (RHLayout + header + states + table) | exact |
| `src/features/admin/components/UsuariosRhTable.tsx` | component (table) | CRUD render | `src/features/triagem/components/TriagemTable.tsx` (glass table shell + avatar disc + tooltip-on-disabled idiom) | exact |
| `src/features/admin/components/NovoUsuarioDialog.tsx` | component (form dialog) | request-response | `src/features/config-vaga/components/BulkMarkDialog.tsx` (Dialog shell) + `src/components/pages/LoginRHPage.tsx` (RHF `register`/`Controller` + zodResolver + field error) | exact |
| `src/features/admin/components/EditarPapelDialog.tsx` + row `AlertDialog`s | component (form dialog + confirm) | request-response | `src/features/decisao/components/RegistrarDecisaoForm.tsx` (AlertDialog confirm + pending spinner) + `src/components/pages/VagasRHPage.tsx` (DropdownMenu row-actions) | exact |
| `src/components/pages/ConfiguracoesPage.tsx` (MODIFIED) | component (route host) | — | current file (keep `RHLayout` + header shell; swap empty-state body) | self |

---

## Pattern Assignments

### `src/features/admin/services/usuariosRhService.ts` (service, CRUD + invoke)

Two responsibilities: (a) **list** the roster via an allowlist `.select()` on `usuarios_rh`; (b) **writes** via `supabase.functions.invoke('gerenciar-usuario-rh', …)`, parsing the `{ ok, error_code, message, field? }` contract.

**Custom error class + code union** — copy shape from `decisaoService.ts:40-54`:
```typescript
export class UsuariosRhServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown,   // carry the EF error_code here (see below)
  ) {
    super(message)
    this.name = 'UsuariosRhServiceError'
  }
}
```

**Allowlist list read** — copy the explicit-columns idiom from `biasAuditService.ts:24` + `aiLogsService.ts:23-24` (NEVER `select('*')` — [[reference_select_star_leaks_pii]]). The CONTEXT-locked allowlist is exactly:
```typescript
// biasAuditService.ts:24-25 — the "const COLUMNS = '…'" idiom to copy verbatim
export const BIAS_AUDIT_COLUMNS = 'id, snapshot_em, periodo, dados, criado_em'
```
For this phase the allowlist is (CONTEXT §Área 1):
```typescript
export const USUARIOS_RH_LIST_COLUMNS =
  'id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso, data_ultimo_login'

export async function listUsuariosRh(): Promise<UsuarioRhRow[]> {
  const { data, error } = await supabase
    .from('usuarios_rh')
    .select(USUARIOS_RH_LIST_COLUMNS)
    .order('nome_completo', { ascending: true })   // biasAuditService.ts:65 .order idiom
  if (error) {
    throw new UsuariosRhServiceError(
      `Não foi possível carregar os usuários: ${error.message}`,
      'DATABASE_ERROR', error,
    )
  }
  return (data ?? []) as unknown as UsuarioRhRow[]
}
```
The `usuarios_rh` Row columns are in `database.types.ts:3606-3624` (`ativo, cargo, data_ultimo_login, email, id, nome_completo, primeiro_acesso, role, user_id` are the ones the allowlist projects). **Do NOT project `avatar_url, telefone, created_by, updated_by, deleted_at`** — not needed by the UI.

**EF write via `functions.invoke` + structured error_code parse** — this is the load-bearing pattern. Copy from `decisaoService.ts:93-122` (invoke + `extractEfErrorCode` + `ok===false` branch) and `triagemService.ts:245-284` (invoke + `!data.ok` + code-specific branch):
```typescript
// decisaoService.ts:93-122 — the exact invoke → extractEfErrorCode → throw shape
const { data, error } = await supabase.functions.invoke('consolidar-decisao-final', {
  body: parsed.data,
})
if (error) {
  const error_code = await extractEfErrorCode(data, error)   // @/lib/efErrors
  throw new DecisaoServiceError('…pt-BR…', 'NETWORK_ERROR', { error_code, raw: error })
}
// A EF devolve { ok:false, error_code } em falha de autorização/validação.
if (data && (data as { ok?: boolean }).ok === false) {
  const error_code = await extractEfErrorCode(data, error)
  throw new DecisaoServiceError('…pt-BR…', 'NETWORK_ERROR', { error_code, raw: data })
}
return data as ConsolidacaoResponse
```
```typescript
// triagemService.ts:270-283 — the code-SPECIFIC branch (mirror for LAST_ADMIN / EMAIL_EXISTS / EMAIL_SEND_FAILED)
if (!data?.ok) {
  if (error_code === 'MIXED_VAGA') {
    throw new TriagemServiceError('…specific pt-BR…', 'MIXED_VAGA', { error_code, raw: data })
  }
  throw new TriagemServiceError('…generic pt-BR…', 'NETWORK_ERROR', { error_code, raw: data })
}
```
For this phase, the service should **return the raw `{ ok, error_code, message, field? }`** (or throw carrying `error_code` on `.details`) so the **hook/component** can branch the toast/field per the UI-SPEC §Feedback table — the service normalizes transport errors, the UI owns the pt-BR copy. `EMAIL_SEND_FAILED` is **success-with-warning**, NOT a throw (CONTEXT §Área 1) — the write function should return an ok-with-warning signal, not raise.

The 5 write actions map 1:1 to the EF discriminated union (`usuario-rh-schemas.ts:55-93`): `criar`, `mudar_papel`, `ativar`, `desativar`, `resetar_senha`. Suggested surface:
```typescript
export async function criarUsuario(input: NovoUsuarioInput): Promise<CriarResult>   // {ok, warning?, error_code?, field?}
export async function mudarPapel(targetId: string, novoPapel: Papel): Promise<WriteResult>
export async function ativarDesativar(targetId: string, ativar: boolean): Promise<WriteResult> // action: ativar|desativar
export async function resetarSenha(targetId: string): Promise<WriteResult>
```
Body shape MUST match the EF contract exactly (`{ action: 'criar', email, nome_completo, cargo, papel }` etc. — `usuario-rh-schemas.ts:55-93`). Validate with the shared client schema BEFORE invoke (the `decisaoService.ts:81-91` `safeParse`-before-invoke discipline — the [[feedback_integration_contract_gap]] guard).

**Namespaced export** — `decisaoService.ts:262-268`: `export const usuariosRhService = { listUsuariosRh, criarUsuario, mudarPapel, ativarDesativar, resetarSenha }`.

**`extractEfErrorCode` reference** (`src/lib/efErrors.ts:38-68`) — reads `error_code` from BOTH the 200 body (`data.error_code`) and a non-2xx `FunctionsHttpError` (`await error.context.json()`); code-only, never throws, never leaks PII. Use it verbatim; do not re-implement.

---

### `src/features/admin/hooks/useUsuariosRh.ts` (hook, request-response)

TanStack Query v5: one `useQuery` for the roster + four `useMutation`s (criar / mudarPapel / ativarDesativar / resetarSenha) that `invalidateQueries` the list on success.

**Hierarchical query keys** — copy from `useConsolidacao.ts:19-25` / `useBiasAudit.ts:21-24`:
```typescript
// useBiasAudit.ts:21-24
export const usuariosRhKeys = {
  all: ['usuarios-rh'] as const,
  list: () => [...usuariosRhKeys.all, 'list'] as const,
} as const
```

**Query hook** — copy `useBiasAudit.ts:27-35` (project defaults: `staleTime 5*60*1000`, `retry: 2`):
```typescript
export function useUsuariosRh() {
  return useQuery<UsuarioRhRow[], Error>({
    queryKey: usuariosRhKeys.list(),
    queryFn: () => listUsuariosRh(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  })
}
```

**Mutation hook (per action)** — copy `useBiasAudit.ts:38-52` (`toast.success` + `invalidateQueries` on success; `toast.error` on failure) and `useRegistrarDecisao.ts:32-52` (invalidate multiple keys on success):
```typescript
// useBiasAudit.ts:38-52 — the mutation → onSuccess(toast + invalidate) → onError(toast) shape
export function useGerarBiasSnapshot() {
  const queryClient = useQueryClient()
  return useMutation<BiasAuditSnapshot, Error, string>({
    mutationKey: [...biasAuditKeys.all, 'gerar'],
    mutationFn: (periodo) => gerarSnapshot(periodo),
    onSuccess: () => {
      toast.success('Snapshot registrado em bias_audit_log.')
      void queryClient.invalidateQueries({ queryKey: biasAuditKeys.latest() })
    },
    onError: (error) => {
      toast.error(error.message || 'Não foi possível gerar o snapshot. Tente novamente.')
    },
  })
}
```
For this phase the mutations map the `error_code` (carried on `err.details.error_code`, or on the returned result) to the **exact UI-SPEC §Copywriting toast copy** — `LAST_ADMIN`, `EMAIL_EXISTS` (→ set field error on the dialog, NOT a toast), `VALIDATION`/`FORBIDDEN`/`SERVER_ERROR`/`NOT_FOUND`, and `EMAIL_SEND_FAILED` (→ `toast.warning` success-with-note + still invalidate). The **default reconcile is on-success `invalidateQueries(usuariosRhKeys.list())`** (UI-SPEC §States "Optimistic vs refetch" — the anti-lockout count must reflect server truth). Note v5 has no `onError` on `useQuery` (`useConsolidacao.ts:27-31` documents this — the component renders the error state, not the query).

---

### `src/features/admin/schemas/novoUsuarioSchema.ts` (+ `editarPapelSchema.ts`) (schema, validation)

Client zod for the create form. **Mirror the EF's `criar` branch** (`supabase/functions/_shared/usuario-rh-schemas.ts:55-67`) so the client↔EF contract cannot drift ([[feedback_integration_contract_gap]]):
```typescript
// usuario-rh-schemas.ts:38, 55-67 — the shape to mirror on the client
const papel = z.enum(["recrutador", "administrador"]);
z.object({
  action: z.literal("criar"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  nome_completo: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(255, "Nome muito longo"),
  cargo: z.string().min(1, "Cargo é obrigatório").max(100, "Cargo muito longo"),
  papel,
}).strict()
```
Client schema convention (zod object + typed `z.infer` export + option list) — copy `decisaoSchema.ts:24-38`:
```typescript
// decisaoSchema.ts:24-38
export const decisaoSchema = z.object({
  decisao: z.enum(['aprovado', 'rejeitado', 'em_espera']),
  justificativa: z.string().min(JUSTIFICATIVA_MIN, 'A justificativa precisa de pelo menos 50 caracteres.'),
})
export type DecisaoFormValues = z.infer<typeof decisaoSchema>
export const DECISAO_OPTIONS: { value: DecisaoFormValues['decisao']; label: string }[] = [ … ]
```
So: `novoUsuarioSchema` = `{ email, nome_completo, cargo, papel }` (NO `action` field on the form; the service adds `action:'criar'`), `PAPEL_OPTIONS = [{value:'recrutador',label:'Recrutador'},{value:'administrador',label:'Administrador'}]`. `editarPapelSchema` = `{ novo_papel: z.enum(['recrutador','administrador']) }`. Use the EXACT pt-BR validation messages so client and server agree.

---

### `src/features/admin/components/GestaoUsuariosPage.tsx` (component, page host)

The console body. **`BiasAuditPage.tsx` is the structural twin** (admin-only, RHLayout + header CTA row + AsyncState-shaped states + glass table). Copy its skeleton:

**Header row** — `BiasAuditPage.tsx:86-104` (`flex flex-wrap items-center justify-between gap-4` header, `<h1 className="text-3xl font-semibold … text-white md:text-4xl">`, right-side primary `<Button … min-h-[44px]>` CTA):
```tsx
// BiasAuditPage.tsx:86-104
<header className="flex flex-wrap items-center justify-between gap-4">
  <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">Auditoria de viés</h1>
  <div className="flex flex-wrap items-center gap-3">
    <Button onClick={handleGerar} disabled={gerar.isPending} className="min-h-[44px]">
      {gerar.isPending ? 'Gerando…' : 'Gerar snapshot'}
    </Button>
  </div>
</header>
```
For this phase the CTA is `"Novo usuário"` with a leading `UserPlus` icon (UI-SPEC §Layout 1); add the subtitle line from the copy contract.

**States (loading / error / empty / success)** — the phase's chosen wrapper is the M3 **`<AsyncState>`** (`src/components/ui/AsyncState.tsx`). `BiasAuditPage.tsx:116-138` shows the older inline branch (skeleton → error+retry → empty → glass table); prefer `<AsyncState>` which encodes the same 5-state contract. Consume it like:
```tsx
<AsyncState
  isLoading={isLoading}
  isError={isError}
  isEmpty={(data?.length ?? 0) === 0}
  onRetry={() => refetch()}
  copy={{
    error:  { heading: 'Não foi possível carregar os usuários.', generic: 'Verifique a conexão e tente novamente.' },
    empty:  { heading: 'Nenhum usuário encontrado.', body: "Crie o primeiro usuário com o botão 'Novo usuário'." },
    retry:  { label: 'Tentar novamente', inflight: 'Tentando…' },
  }}
>
  <UsuariosRhTable rows={data ?? []} … />
</AsyncState>
```
`<AsyncState>` props (`AsyncState.tsx:78-101`): `isLoading|isPending`, `isError`, `isEmpty`, `errorCode`, `onRetry`, `retrying`, `glass`, `copy` (per-slot override), `children`. Precedence is binding: `loading → slow → error → empty → success` (`AsyncState.tsx:127`). The `copy` override lets you inject the UI-SPEC's exact error/empty copy without editing AsyncState. Set `glass` per taste (default wraps in `<Glass variant="dark">`). NOTE: this admin page renders inside `RHLayout` and should use `<div className="space-y-6">` (or `space-y-8` like BiasAuditPage) as the page frame — do NOT re-add the legacy `p-8` wrapper (UI-SPEC §Spacing).

**Host wiring** — `GestaoUsuariosPage` renders inside `ConfiguracoesPage` (below) or replaces its body; it does NOT re-mount `RHLayout` if `ConfiguracoesPage` already provides it (BiasAuditPage mounts its own `RHLayout` because it's route-level; here the route mounts `ConfiguracoesPage` → decide one owner for `RHLayout`, keep exactly one).

---

### `src/features/admin/components/UsuariosRhTable.tsx` (component, table)

The roster `<Table>`. **`TriagemTable.tsx` is the exact idiom** — glass table shell, avatar-initial disc, badges, and the keyboard-safe tooltip-on-disabled wrapper (the anti-lockout hint needs this).

**Glass table shell + header row** — `TriagemTable.tsx:213-231`:
```tsx
// TriagemTable.tsx:213-231
<div className="overflow-x-auto rounded-xl border border-white/10">
  <Table>
    <TableHeader>
      <TableRow className="border-white/10 bg-white/10 hover:bg-white/10">
        <TableHead className="text-xs font-semibold text-white/80">Candidato</TableHead>
        …
      </TableRow>
    </TableHeader>
    <TableBody>{rows.map((row) => ( <TableRow className="min-h-[44px] border-white/10 text-white hover:bg-white/10 …"> … ))}</TableBody>
  </Table>
</div>
```

**Avatar-initial disc** — `TriagemTable.tsx:273-281` (gradient `from-[#35BFAD] to-[#00109E]`, first-letter, two-line name/email cell for this phase):
```tsx
// TriagemTable.tsx:274-281
<div className="flex items-center gap-3">
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-[#35BFAD] to-[#00109E] text-sm font-semibold text-white">
    {candidato?.nome_completo?.charAt(0).toUpperCase() ?? '?'}
  </div>
  <span className="text-sm text-white">{candidato?.nome_completo ?? 'Nome não disponível'}</span>
</div>
```
For this phase stack `nome_completo` (14px white) over `email` (12px `text-white/60`) and append the `text-white/50 text-xs` `"(você)"` marker when `row.user_id === currentUserId`.

**Badges (papel / status)** — `TriagemTable.tsx:300-315` shows the `<Badge className={cn('text-xs font-semibold', COLORS[x] ?? fallback)}>` idiom with a label map. Use the **UI-SPEC §Color / §Status Vocabulary AA tints verbatim** (do not invent alpha pairs): Ativo `bg-green-500/20 text-green-300 border-green-500/30`; Inativo `bg-white/10 text-white/50 border-white/20`; Aguardando 1º acesso `bg-amber-500/15 text-amber-100 border-amber-400/30`; Administrador `bg-[#35BFAD]/20 text-white border-[#35BFAD]/40`; Recrutador `bg-white/10 text-white/80 border-white/20`.

**Tooltip on a DISABLED action (anti-lockout hint, keyboard-reachable)** — THE key idiom, `TriagemTable.tsx:250-263` (the `<span className="inline-flex">` wrapper so Radix wires `aria-describedby` on a disabled control) + `BiasAuditPage.tsx:193-213` (a real focusable `<button>` as trigger):
```tsx
// TriagemTable.tsx:250-263 — disabled control wrapped so its tooltip stays keyboard-reachable
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex">
        <Checkbox checked={isSelected} disabled aria-label="…" />
      </span>
    </TooltipTrigger>
    <TooltipContent>Máximo de 10 candidatos por comparativo.</TooltipContent>
  </Tooltip>
</TooltipProvider>
```
Apply to the last-active-`administrador` row's "Desativar"/"Rebaixar" menu items with the tooltip copy `"Não é possível desativar ou rebaixar o último administrador ativo."` `activeAdminCount` is derived client-side from the loaded roster; the EF `LAST_ADMIN` remains authoritative (UI-SPEC §Anti-Lockout).

**Row actions = DropdownMenu** — copy `VagasRHPage.tsx:459-519`:
```tsx
// VagasRHPage.tsx:459-494 — the row-level DropdownMenu (trigger + glass content + items + separator)
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="w-10 h-10 p-0 … text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl">
      <MoreVertical className="w-5 h-5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white z-50">
    <DropdownMenuItem onClick={() => …} className="cursor-pointer hover:bg-white/10"> <Icon className="w-4 h-4 mr-2" /> Editar papel </DropdownMenuItem>
    <DropdownMenuSeparator className="bg-white/20" />
    <DropdownMenuItem onClick={…} className="cursor-pointer hover:bg-white/10 text-red-400"> Desativar </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```
For this phase: trigger uses `MoreHorizontal` + `aria-label="Ações"` + `min-h-[44px] min-w-[44px]` (UI-SPEC). Items in order: Editar papel · Ativar/Desativar · Resetar senha. Destructive item carries `text-red-300`/`text-red-400`. Every item is a real Radix `DropdownMenuItem` (roving focus) — no bare `onClick` div.

---

### `src/features/admin/components/NovoUsuarioDialog.tsx` (component, form dialog)

Create-user `Dialog` with RHF + zodResolver.

**Dialog shell** — copy `BulkMarkDialog.tsx:56-97` (controlled `open`/`onOpenChange`, glass `DialogContent`, `DialogHeader`/`DialogTitle`/`DialogDescription`, `DialogFooter` with Cancelar + primary):
```tsx
// BulkMarkDialog.tsx:56-73 — Dialog shell + glass content + header
<Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
  <DialogContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/25 text-white">
    <DialogHeader>
      <DialogTitle className="text-white">Novo usuário</DialogTitle>
      <DialogDescription className="text-white/70">…</DialogDescription>
    </DialogHeader>
    …fields…
    <DialogFooter> … </DialogFooter>
  </DialogContent>
</Dialog>
```

**RHF + zodResolver + field wiring** — copy `LoginRHPage.tsx:78-92` (`useForm({ resolver: zodResolver(schema), mode:'onBlur', defaultValues })`) + `LoginRHPage.tsx:248-295` (Label + `Input {...register('email')}` + `aria-invalid` + inline `errors.email.message`). NOTE: the shadcn `<Form>/<FormField>` primitive exists in `ui/form.tsx` but is **NOT consumed anywhere in this repo** — the established pattern is bare RHF `register`/`Controller` + `ui/input.tsx` + `ui/label.tsx`, matching `LoginRHPage`. Mirror that, not `<FormField>`.
```tsx
// LoginRHPage.tsx:78-92 — the useForm shape
const { register, handleSubmit, control, formState: { errors, isSubmitting } } =
  useForm<NovoUsuarioForm>({
    resolver: zodResolver(novoUsuarioSchema) as Resolver<NovoUsuarioForm>,
    mode: 'onBlur',
    defaultValues: { email: '', nome_completo: '', cargo: '', papel: 'recrutador' },
  })
```
```tsx
// LoginRHPage.tsx:272-294 — Input + register + inline error (mirror per field)
<Input id="email" type="email" {...register('email')} placeholder="nome@beautysmile.com.br"
  aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} … />
{errors.email && <p id="email-error" role="alert" aria-live="assertive" className="text-red-400 text-sm …">{errors.email.message}</p>}
```
The **`papel` Select** uses `ui/select.tsx` driven by a `Controller` (`LoginRHPage.tsx:363-376` shows the `Controller` idiom for a non-native control — the Checkbox there; use the same `Controller` wrapper for `<Select value onValueChange>`).

**Submit button pending state** — copy `LoginRHPage.tsx:399-425` / `RegistrarDecisaoForm.tsx:173-179` (`Loader2` spinner + verb-in-progress label + `disabled`):
```tsx
// RegistrarDecisaoForm.tsx:173-179 — pending spinner + label
{submitting ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Criando…</span>) : 'Criar usuário'}
```

**Server → field/toast mapping**: on `EMAIL_EXISTS` set a field error on `email` via RHF `setError('email', { message: 'Já existe um usuário com este e-mail.' })` and keep the dialog open (UI-SPEC §Create feedback). On success/`EMAIL_SEND_FAILED` close + invalidate + toast. Use the EXACT UI-SPEC copy strings.

---

### `src/features/admin/components/EditarPapelDialog.tsx` + row `AlertDialog`s (component, form dialog + confirm)

**Editar papel Dialog** — same `BulkMarkDialog.tsx` shell + a single `ui/select.tsx` (Controller-driven) pre-set to the current role + footer `Cancelar / Salvar papel`. On save → `mudarPapel` mutation → toast + invalidate.

**Destructive confirms (Desativar, Resetar senha) = `AlertDialog`** — copy `RegistrarDecisaoForm.tsx:165-200` (trigger + `AlertDialogContent` + title + description + `AlertDialogCancel`/`AlertDialogAction`, pending spinner in the action):
```tsx
// RegistrarDecisaoForm.tsx:182-200 — AlertDialog confirm body + footer
<AlertDialogContent>
  <AlertDialogHeader>
    <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
    <AlertDialogDescription>{nome} perderá o acesso ao painel imediatamente. Você pode reativar depois.</AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogCancel>Cancelar</AlertDialogCancel>
    <AlertDialogAction onClick={handleConfirm}>Desativar</AlertDialogAction>   {/* destructive/red; pending → "Desativando…" + disabled */}
  </AlertDialogFooter>
</AlertDialogContent>
```
Copy the exact pt-BR titles/bodies from UI-SPEC §Copywriting Contract (Desativar, Resetar senha, Reativar). Resetar senha body must NOT claim the account is locked — the EF only dispatches the email. "Ativar" is a **direct** action (no confirm — non-destructive; UI-SPEC §Row Actions 2).

---

### `src/components/pages/ConfiguracoesPage.tsx` (MODIFIED, route host)

Current file (read: `src/components/pages/ConfiguracoesPage.tsx:21-51`) is an empty-state: `<RHLayout>` → header (`<h1>Configurações</h1>` + subtitle) → `<GlassCard>` "Gestão de usuários ainda não disponível". **Keep the route (`routes.tsx:407-414`, `RoleGuard role="administrador"` OUTSIDE the lazy element — Phase 19 convention), keep `RHLayout`.** Replace ONLY the empty-state `GlassCard` body with `<GestaoUsuariosPage />` (or inline the console). The route import name stays `ConfiguracoesPage` (`routes.tsx:60`). UI-SPEC updates the header copy to `"Gestão de usuários"` + the new subtitle (the sidebar nav label stays "Configurações" — out of scope). Decide a single `RHLayout` owner (either `ConfiguracoesPage` keeps it and `GestaoUsuariosPage` renders bare, or move it — do not nest two `RHLayout`s).

---

## Shared Patterns

### EF invoke → structured error_code
**Source:** `src/features/decisao/services/decisaoService.ts:93-122` + `src/features/triagem/services/triagemService.ts:245-284` + `src/lib/efErrors.ts:38-68`
**Apply to:** `usuariosRhService.ts` (all 4 write functions)
```typescript
const { data, error } = await supabase.functions.invoke('gerenciar-usuario-rh', { body: { action, … } })
const error_code = await extractEfErrorCode(data, error)   // code-only, never throws, never PII
if (error || !data?.ok) { /* branch error_code → pt-BR (LAST_ADMIN / EMAIL_EXISTS / EMAIL_SEND_FAILED / …) */ }
```

### Allowlist projection (never `select('*')`)
**Source:** `src/features/admin/bias-audit/services/biasAuditService.ts:24-25,59-67` + `src/features/admin/ai-logs/services/aiLogsService.ts:23-24` + `src/features/decisao/services/decisaoService.ts:179-198`
**Apply to:** `usuariosRhService.listUsuariosRh` — `const USUARIOS_RH_LIST_COLUMNS = 'id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso, data_ultimo_login'`. RLS is row-level and does NOT hide columns ([[reference_select_star_leaks_pii]]); the roster is internal PII → explicit allowlist only.

### Custom service error class
**Source:** `src/features/decisao/services/decisaoService.ts:40-54` (also `biasAuditService.ts:36-45`)
**Apply to:** `usuariosRhService.ts` — `class UsuariosRhServiceError extends Error` with a `code` union; carry the EF `error_code` on `.details`.

### TanStack Query hooks (keys + query + mutation + invalidate)
**Source:** `src/features/admin/bias-audit/hooks/useBiasAudit.ts:21-52` + `src/features/decisao/hooks/useConsolidacao.ts:19-41` + `src/features/decisao/hooks/useRegistrarDecisao.ts:32-52`
**Apply to:** `useUsuariosRh.ts` — hierarchical `usuariosRhKeys`, `staleTime 5min`/`retry 2`, mutations `onSuccess → toast + invalidateQueries(usuariosRhKeys.list())`, `onError → toast.error`.

### AsyncState 5-state wrapper
**Source:** `src/components/ui/AsyncState.tsx:78-101` (props) + `:127` (precedence) + `src/features/admin/bias-audit/components/BiasAuditPage.tsx:116-138` (the older inline shape it generalizes)
**Apply to:** `GestaoUsuariosPage.tsx` roster region — pass `isLoading/isError/isEmpty/onRetry` from `useUsuariosRh`, override `copy` with the UI-SPEC error/empty strings. Never a blank surface.

### Glass RH table + avatar disc + keyboard-safe disabled-tooltip
**Source:** `src/features/triagem/components/TriagemTable.tsx:213-231` (shell), `:273-281` (avatar), `:250-263` (`<span className="inline-flex">` disabled-tooltip wrapper), `:300-315` (badge+label-map)
**Apply to:** `UsuariosRhTable.tsx` — the roster table, the avatar-initial cell, the anti-lockout tooltip on disabled menu items, the papel/status badges (UI-SPEC AA tints).

### RHF + zodResolver form (bare register/Controller, NOT shadcn FormField)
**Source:** `src/components/pages/LoginRHPage.tsx:78-92` (useForm) + `:272-294` (Input + register + inline error) + `:363-376` (Controller for non-native control)
**Apply to:** `NovoUsuarioDialog.tsx`, `EditarPapelDialog.tsx`. `ui/form.tsx`'s `<FormField>` is unused across the repo — do not introduce it; mirror the established bare-RHF idiom.

### Dialog + AlertDialog shells
**Source:** `src/features/config-vaga/components/BulkMarkDialog.tsx:56-97` (Dialog) + `src/features/decisao/components/RegistrarDecisaoForm.tsx:165-200` (AlertDialog confirm + pending)
**Apply to:** create/edit dialogs (Dialog) and Desativar/Resetar-senha confirms (AlertDialog). Glass `DialogContent`/`AlertDialogContent`, controlled `open`, pending spinner + verb label + `disabled`.

### DropdownMenu row-actions
**Source:** `src/components/pages/VagasRHPage.tsx:459-519`
**Apply to:** `UsuariosRhTable.tsx` per-row Ações menu (glass content, `align="end"`, `DropdownMenuItem` + `DropdownMenuSeparator`, destructive `text-red-*`).

### sonner toast
**Source:** `import { toast } from 'sonner'` — `useBiasAudit.ts:14,45,48`, `useRegistrarDecisao.ts:16,39,49`, `LoginRHPage.tsx:38,131`
**Apply to:** all mutation success/warning/error feedback with the exact UI-SPEC pt-BR strings. `EMAIL_SEND_FAILED` → `toast.warning`/success-with-note (NOT error); `EMAIL_EXISTS` → RHF field error (NOT toast).

### RoleGuard-outside-lazy (unchanged)
**Source:** `src/router/routes.tsx:407-414` + `:60` (lazy import) + `:37` comment (RoleGuard OUTSIDE the lazy element, Phase 19 bundle split)
**Apply to:** DO NOT touch the route or guard. `ConfiguracoesPage` stays lazy under `RoleGuard role="administrador"`; the console is defense-in-depth (EF re-authorizes server-side).

### Current-user id for the "(você)" marker
**Source:** `src/store/authStore.ts:77` (`user: User | null` — Supabase auth user carries `.id`)
**Apply to:** `UsuariosRhTable.tsx` — `const currentUserId = useAuthStore((s) => s.user?.id)`; render `"(você)"` when `row.user_id === currentUserId`. Do NOT hide the self row (CONTEXT §Área 3).

---

## No Analog Found

None. Every file has a close in-repo analog (this is a UI-over-existing-EF phase). The only novelty is composition — a create/edit/deactivate/reset console assembled from the table (TriagemTable), dialog (BulkMarkDialog), form (LoginRHPage), confirm (RegistrarDecisaoForm), dropdown (VagasRHPage), states (AsyncState/BiasAuditPage) and service/hook (decisaoService/biasAuditService + useBiasAudit) idioms already in the codebase.

---

## Metadata

**Analog search scope:** `src/features/admin/{bias-audit,ai-logs,ai-costs,prompt-versions}/`, `src/features/{decisao,triagem,config-vaga,auth}/`, `src/components/pages/`, `src/components/ui/`, `src/router/`, `src/store/`, `supabase/functions/gerenciar-usuario-rh/`, `database.types.ts`
**Files scanned:** ~20 read in full/targeted; roster/service/hook/dialog/table/confirm/dropdown/states/schema/route/auth analogs all confirmed
**EF contract source of truth:** `supabase/functions/_shared/usuario-rh-schemas.ts` (discriminated union `criar|mudar_papel|ativar|desativar|resetar_senha`; error codes `UNAUTHORIZED|FORBIDDEN|VALIDATION|NOT_FOUND|EMAIL_EXISTS|LAST_ADMIN|EMAIL_SEND_FAILED|SERVER_ERROR`)
**Pattern extraction date:** 2026-07-13
