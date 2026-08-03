# Phase 44: Exportação & Acesso — Pattern Map

**Mapped:** 2026-08-03
**Files analyzed:** 24 (20 novos · 4 editados)
**Analogs found:** 20 / 24 exatos ou role-match · **4 sem análogo** (declarados abaixo, sem análogo falso)

> Este documento responde a **uma** pergunta: de qual arquivo vivo cada arquivo novo copia
> estrutura. Ele **não** re-decide nada travado no 44-CONTEXT nem no 44-UI-SPEC.
> Todo trecho abaixo foi lido do código vivo em 2026-08-03; `arquivo:linha` é literal.

---

## 0 · Verificação das três reutilizações nomeadas pela UI-SPEC

A UI-SPEC §Component Inventory nomeia três reusos que "o plano NÃO pode transformar em cópia".
Os três foram verificados contra o código vivo. **Dois batem; um tem mismatch de contrato.**

### 0.1 `classifyRevisaoSla` — ✅ confere, reuso por alias é viável

`src/features/revisao/constants/slaRevisao.ts:59-83`

```ts
export function classifyRevisaoSla(
  dias: number,
  cfg?: LimiaresSlaRevisao | null,
): FaixaSlaRevisao
```

Exports vivos do módulo (`slaRevisao.ts:38,45,59,93,107`):
`FaixaSlaRevisao` (type) · `LimiaresSlaRevisao` (interface `{ diasAtencao, diasAtraso }`) ·
`classifyRevisaoSla` · `diasEmEspera(desdeIso, now = new Date())` ·
`ROTULOS_FAIXA_SLA_REVISAO: Record<FaixaSlaRevisao, string>`.

`src/features/pedidos-dados/constants/slaDados.ts` é um **arquivo de re-export**, não de lógica:

```ts
export {
  classifyRevisaoSla as classifySlaDados,
  diasEmEspera,
  ROTULOS_FAIXA_SLA_REVISAO as ROTULOS_FAIXA_SLA_DADOS,
} from '@/features/revisao/constants/slaRevisao'
export type { LimiaresSlaRevisao as LimiaresSlaDados, FaixaSlaRevisao } from '@/features/revisao/constants/slaRevisao'
```

A asserção de identidade de referência que a UI-SPEC sugere é executável exatamente como escrita:
`expect(classifySlaDados).toBe(classifyRevisaoSla)`. Uma cópia-e-cola futura a reprova.

⚠ **`LimiaresSlaDados` é um alias de TIPO, não uma interface nova.** Se o plano declarar
`interface LimiaresSlaDados { diasAtencao; diasAtraso }` num arquivo próprio, a asserção de
identidade continua verde (ela é sobre a função) mas o segundo lugar onde o formato do limiar
pode apodrecer volta a existir. Re-export, não redeclaração.

### 0.2 `RevisaoSlaBadge` — ✅ confere, reuso verbatim é viável; **o docblock mente hoje**

`src/features/revisao/components/RevisaoSlaBadge.tsx:43-48` — props públicas:

```ts
export interface RevisaoSlaBadgeProps {
  diasEspera: number
  limiares: LimiaresSlaRevisao | null
}
```

Zero acoplamento a revisão no contrato — é `(dias, limiares) → badge`. Importável de
`@/features/revisao/components/RevisaoSlaBadge` sem qualquer mudança de código.

A frase a emendar está em `RevisaoSlaBadge.tsx:27-28`, verbatim:

```
 * de candidato — nem em `title`, nem em `aria-label`. Este componente é importado
 * exclusivamente pela fila do RH.
```

Depois desta fase há **dois** consumidores. A edição é de docblock apenas (a UI-SPEC §Edições em
arquivos existentes trava "zero mudança de código"). Note que `TIPOGRAFIA_BADGE` (`:60`) é
**privado ao módulo** — o `SituacaoPedidoBadge` não pode importá-lo; ele redeclara a mesma
constante `'text-sm font-semibold'` localmente, como o `VereditoBadge` já faz.

### 0.3 `formatarBadgePendentes` — ⚠ **MISMATCH: devolve `undefined`, não `''`**

`src/features/revisao/services/revisaoService.ts:180-188`:

```ts
export function formatarBadgePendentes(
  n: number | null | undefined,
): string | undefined {
  if (n === null || n === undefined) return undefined
  if (!Number.isFinite(n)) return undefined
  if (n <= 0) return undefined
  if (n > 99) return '99+'
  return String(n)
}
```

A 44-UI-SPEC (§Contador do menu, e de novo em E9/loading) diz **`''` para 0/indefinido**.
O código vivo devolve **`undefined`**, e o teste vivo prende esse contrato:
`revisaoService.test.ts:213` → `expect(formatarBadgePendentes(0)).toBeUndefined()`.

**Consequência para o plano:** a intenção da UI-SPEC ("o badge some, nunca um `0` solto") está
correta e é o que o código faz; apenas o valor citado está errado. O plano deve **importar a
função** (`import { formatarBadgePendentes } from '@/features/revisao/services/revisaoService'`)
e **não** escrever nada que compare com `''`. Um `badge === '' ? …` seria dead code silencioso.

O tipo do campo consumidor confirma: `RHSidebar.tsx:30` → `badge?: string;` e o render em
`:300` é ternário (`{item.badge ? (…) : null}`), não `&&`.

---

## 1 · File Classification

| Arquivo novo/editado | Papel | Fluxo de dados | Análogo mais próximo | Match |
|---|---|---|---|---|
| `src/features/privacidade/components/PedirCopiaBloco.tsx` | component | request-response + file-I/O | `components/GuardaCurriculoBloco.tsx` (molde visual) + `PrivacidadeCandidatoPage.tsx:205-232` (ramos loading/erro de seção) | role-match |
| `src/features/privacidade/components/CurriculosBloco.tsx` | component | list + file-I/O | `hub-candidato/components/CvButton.tsx` (mecanismo) + `GuardaCurriculoBloco.tsx` (moldura) | mecanismo exato, fonte de dados diferente |
| `src/features/privacidade/hooks/useExportarMeusDados.ts` | hook | request-response (mutation) | `privacidade/hooks/useRevogarMarketing.ts` | role-match |
| `src/features/privacidade/hooks/useUltimoPedidoDados.ts` | hook | CRUD (read own-row) | `revisao/hooks/useConfigSlaRevisao.ts` (`retry:false` + degradação) + `privacidade/hooks/usePrivacidade.ts` (keys) | exato |
| `src/features/privacidade/services/exportacaoService.ts` | service | request-response + transform | `privacidade/services/privacidadeService.ts` (classe de erro + allowlist) + `agendamento/services/agendamentoCandidatoService.ts:205-219` (Blob/anchor) | exato |
| `src/features/privacidade/components/PrivacidadeCandidatoPage.tsx` **(editado)** | component | — | ele mesmo, `:200` (a seção 2 é o gabarito da seção 3) | exato |
| `src/features/pedidos-dados/components/PedidosDadosRHPage.tsx` | component | — | `revisao/components/RevisoesRHPage.tsx` | exato (gêmeo único) |
| `src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx` | component | list-collection | `revisao/components/FilaRevisoesTable.tsx` | exato |
| `src/features/pedidos-dados/components/SituacaoPedidoBadge.tsx` | component | static | `revisao/components/VereditoBadge.tsx` + `RevisaoSlaBadge.tsx` (TIPOGRAFIA_BADGE) | role-match |
| `src/features/pedidos-dados/hooks/useFilaPedidosDados.ts` (+ `pedidosDadosKeys`) | hook | CRUD (read) | `revisao/hooks/useFilaRevisoes.ts` | exato |
| `src/features/pedidos-dados/hooks/useConfigSlaDados.ts` | hook | CRUD (read) | `revisao/hooks/useConfigSlaRevisao.ts` | exato |
| `src/features/pedidos-dados/hooks/usePedidosDadosPendentesCount.ts` | hook | CRUD (read) | `revisao/hooks/useRevisoesPendentesCount.ts` | exato |
| `src/features/pedidos-dados/services/pedidosDadosService.ts` | service | CRUD (RPC) | `revisao/services/revisaoService.ts` | exato |
| `src/features/pedidos-dados/constants/slaDados.ts` | constants | — | **re-export** de `revisao/constants/slaRevisao.ts` | reuso, não cópia |
| `src/components/RHSidebar.tsx` **(editado, 3 sítios)** | nav | — | as linhas vivas de `revisoes-rh` (`:97`, `:128-132`, `:176`) | exato |
| `src/router/routes.tsx` **(editado)** | route | — | `:66` + `:461-467` | exato |
| `src/features/revisao/components/RevisaoSlaBadge.tsx` **(editado: docblock)** | component | — | — | — |
| `supabase/functions/exportar-meus-dados/index.ts` | edge function | request-response | `supabase/functions/get-curriculo-url/index.ts` | exato, com 3 desvios |
| `supabase/functions/exportar-meus-dados/index.test.ts` | test (Deno) | — | `supabase/functions/get-curriculo-url/index.test.ts` | exato — ⚠ ver §5.1 sobre o caminho |
| `supabase/migrations/…_p44_config_sla_dados.sql` | migration | — | `20260730000001_p42_revisao_art20.sql:432-513` | exato |
| `supabase/migrations/…_p44_solicitacoes_dados.sql` | migration | — | mesma migration, §RPC + §RLS | role-match |
| `docs/compliance/sql/gen-export-allowlist.cjs` | script | transform | `docs/compliance/sql/gen-pii-md.cjs` | **idioma adjacente**, não análogo (§5.2) |
| `docs/compliance/export-allowlist.json` | artefato | — | `docs/compliance/pii-inventory.yaml` (bloco `meta`) | role-match |
| `docs/compliance/sql/05-export-allowlist-drift.sql` | smoke SQL | — | `04-invent05-blast-radius.sql` (cabeçalho) — **sem análogo de asserção** (§5.3) | parcial |
| snapshot test do SC#3 (Vitest) | test | — | **NENHUM** — zero `toMatchSnapshot*` no repo (§5.4) | ausente |

---

## 2 · Pattern Assignments — lado candidato

### `src/features/privacidade/components/PedirCopiaBloco.tsx`

**Análogo:** `src/features/privacidade/components/GuardaCurriculoBloco.tsx`
**Por quê:** é o outro bloco neutro de leitura da MESMA página, com o MESMO molde de container,
a MESMA disciplina de copy-em-constante-exportada e o mesmo tratamento de caso ausente.

**Molde do container + copy** (`GuardaCurriculoBloco.tsx:44-58,96-99`):

```tsx
/** Copy verbatim da 43-UI-SPEC (linhas 502-507). */
export const COPY_GUARDA_CURRICULO = {
  autorizadoTitulo: 'Currículo guardado.',
  …
} as const

<div
  data-bloco="guarda-curriculo"
  className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4"
>
  <p className="text-sm font-semibold text-white">…</p>
  <p className="text-base leading-relaxed text-white/90">…</p>
```

Copiar: o `data-bloco` (é o gancho que os testes de bloco usam), a classe do container verbatim
(a UI-SPEC §Emenda proíbe padding diferente do dos irmãos), `text-sm font-semibold` para label e
`text-base leading-relaxed` para prosa.

**Molde do estado de loading/erro DE SEÇÃO** (`PrivacidadeCandidatoPage.tsx:205-225`) — este é o
precedente que a UI-SPEC E1/loading e E1/error citam:

```tsx
{guarda.isLoading ? (
  <Glass variant="white" blur="md" className="h-16 animate-pulse p-6">
    <span />
  </Glass>
) : guarda.isError ? (
  <div className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4">
    …
```

**O que DEVE diferir:**
- O `GuardaCurriculoBloco` não tem controle acionável nenhum; este bloco tem o CTA e seus 5
  estados. O botão é `GlassButton variant="white" hover className="min-h-[44px] text-white"`,
  idioma vivo em `PrivacidadeCandidatoPage.tsx:116-123`. O spread de props não-estilo já foi
  corrigido (42-11), então `aria-busy` e `aria-describedby` chegam ao `<button>`.
- **Inverso do análogo no ramo de erro:** aqui a falha de `useUltimoPedidoDados` **não** troca o
  bloco por uma caixa de erro (Invariante 3 — o CTA renderiza assim mesmo e o servidor recusa).
  O ramo `isError` de `guarda` no análogo faz o oposto; copiá-lo literalmente violaria a
  invariante.
- A copy de cooldown vem de **uma** constante compartilhada com o tratamento da recusa 429 do
  servidor (UI-SPEC §Fonte única da copy de cooldown).

### `src/features/privacidade/components/CurriculosBloco.tsx`

**Análogo de MECANISMO:** `src/features/hub-candidato/components/CvButton.tsx`
**Por quê:** é o único lugar do repo que resolve "abrir uma URL efêmera dentro do gesto do
clique" sem guardar a URL. ⚠ **A fonte de dados NÃO é reusável** — `CvButton.tsx:23,49` chama
`getSignedUrl` → EF `get-curriculo-url`, que devolve 403 a candidato
(`get-curriculo-url/index.ts:133-135`). BD-7 substitui a fonte por
`supabase.storage.from('curriculos').createSignedUrl(path, 60)` no client.

**Esqueleto a copiar verbatim** (`CvButton.tsx:31-66`):

```tsx
// ONLY boolean flags — the signed URL is NEVER stored (Pitfall 7).
const [loading, setLoading] = useState(false)
const [error, setError] = useState(false)

async function handleOpen() {
  if (loading) return
  setLoading(true); setError(false)
  const win = window.open('about:blank', '_blank')
  if (win) win.opener = null
  try {
    const url = await getSignedUrl(candidaturaId)
    if (win) { win.location.href = url } else { setError(true) }
  } catch {
    if (win) win.close()
    setError(true)
  } finally { setLoading(false) }
}
```

E o par botão+erro (`CvButton.tsx:70-84`), incluindo `aria-busy={loading}`, `min-h-[44px]` e
`<p className="text-sm text-red-300" aria-live="polite">`.

**O que DEVE diferir:**
1. `getSignedUrl(candidaturaId)` → chamada ao `exportacaoService` que faz
   `createSignedUrl(curriculo_url, 60)` com o client anon (BD-7). O `60` é o mesmo de
   `get-curriculo-url/index.ts:206`.
2. É uma **lista**, não um botão solto: estado `loading`/`error` **por linha** (a UI-SPEC E3/error
   exige que uma vaga que falha não derrube as outras). Um `useState` escalar como o do análogo
   produziria erro global — é o erro mais provável de uma cópia cega.
3. Rótulos: `Abrir meu currículo` / `Abrindo…` (o análogo diz "Abrir currículo").
4. O bloco **não renderiza** com lista vazia (E3/empty).
5. ⚠ M5 mediu n=3 CVs, todos com prefixo `auth.uid()`. O plano trata "o titular lê o próprio CV"
   como asserção testada com falha por linha, nunca como invariante.

### `src/features/privacidade/services/exportacaoService.ts`

**Análogo:** `src/features/privacidade/services/privacidadeService.ts` (classe de erro + allowlist
nomeada + `traduzirErro` total) — mesmo diretório, mesma persona.

Formas vivas a espelhar (`privacidadeService.ts:58,76,107,131`): `export class PrivacidadeError`,
constantes `AUTORIZACOES_ALLOWLIST` / `CANDIDATURA_CURRICULO_ALLOWLIST` como strings nomeadas
passadas a `.select(...)`, e `traduzirErro(erro, mensagem)` privado que nunca vaza a mensagem crua.

**Análogo do download** — `src/features/agendamento/services/agendamentoCandidatoService.ts:205-219`:

```ts
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

Note a separação já viva no análogo: `gerarIcsAgendamento` é **puro** (string-building, testável
sem DOM) e `baixarIcsAgendamento` é o disparo. A UI-SPEC pede exatamente esse corte para
`gerarJson`/`gerarHtml` × `dispararDownloads`.

**O que DEVE diferir:** dois downloads no mesmo gesto, `.json` **primeiro** (UI-SPEC §Ordem de
disparo); nome `beauty-smile-meus-dados-{aaaa-mm-dd}.{ext}` sem PII; `type` `application/json` e
`text/html;charset=utf-8`.

**Molde do HTML hand-rolled:** `supabase/functions/_shared/email-templates.ts` (string-building,
zero npm — o idioma que a UI-SPEC §Registry Safety nomeia).

### `src/features/privacidade/hooks/useUltimoPedidoDados.ts`

**Análogo:** `src/features/revisao/hooks/useConfigSlaRevisao.ts` (arquivo inteiro, 41 linhas)

```ts
return useQuery({
  queryKey: revisoesKeys.configSla(),
  queryFn: () => lerConfigSlaRevisao(),
  staleTime: STALE,
  gcTime: STALE,
  retry: false,
  ...options,
})
```

O docblock daquele arquivo (`:1-15`) é a justificativa literal do `retry: false` + "erro resolve
para `null`, o hook nunca fica em `isError`" — que é exatamente a Invariante 3 desta fase na sua
forma de hook.

**Chaves:** este hook mora na feature `privacidade`, então a chave entra em `privacidadeKeys`
(`usePrivacidade.ts:23-31`), **não** numa fábrica nova:

```ts
export const privacidadeKeys = {
  all: ['privacidade'] as const,
  autorizacoes: (candidatoId: string | undefined) => [...privacidadeKeys.all, 'autorizacoes', candidatoId] as const,
  curriculo: (candidatoId: string | undefined) => [...privacidadeKeys.all, 'curriculo', candidatoId] as const,
}
```

⚠ Note que os hooks de `privacidade` **não** declaram `staleTime`/`gcTime`/`retry` (usam o default
do QueryClient) e usam `enabled: Boolean(candidatoId)`. Ao trazer `retry: false` do análogo da
revisão, mantenha `enabled` — sem ele a query dispara sem candidato hidratado.

### `src/features/privacidade/components/PrivacidadeCandidatoPage.tsx` (editado)

**Análogo:** ele mesmo, `:200`. A seção 3 usa **a mesma classe da seção 2**, copiada, não inventada:

```tsx
<section className="space-y-4 border-t border-white/15 pt-6">
  <h2 className="text-xl font-semibold text-white">{COPY_PRIVACIDADE.secao2}</h2>
```

A chave nova entra em `COPY_PRIVACIDADE` (`:34`), que já é `export const … as const`.

**O que DEVE diferir:** nada além disso. Seções 1 e 2 byte-idênticas. ⚠ O docblock `:15-17` afirma
"A página NÃO tem CTA primário, por desenho" — a UI-SPEC §Emenda declara a alteração; o docblock
tem de ser emendado no mesmo commit, ou o arquivo passa a mentir sobre si (mesma classe do
defeito do `RevisaoSlaBadge`).

---

## 3 · Pattern Assignments — lado RH

### `src/features/pedidos-dados/components/PedidosDadosRHPage.tsx`

**Análogo:** `src/features/revisao/components/RevisoesRHPage.tsx` — arquivo inteiro (95 linhas),
gêmeo estrutural único. Esqueleto (`:56-95`):

```tsx
export function RevisoesRHPage() {
  const [incluirRespondidos, setIncluirRespondidos] = useState(false)
  return (
    <RHLayout>
      <div className="space-y-6">
        <GlassCard variant="dark" blur="lg" className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-white md:text-4xl">{PAGINA_COPY.h1}</h1>
            <p className="text-base text-white/70">{PAGINA_COPY.subtitulo}</p>
          </div>
          <h2 className="text-xl font-semibold text-white">{PAGINA_COPY.tituloSecao}</h2>
          {/* Faixa de controles COMPACTA — secundária à tabela por desenho. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white/50">{PAGINA_COPY.notaOrdenacao}</p>
            <div className="flex items-center gap-2">
              <Switch id={ID_TOGGLE} checked={…} onCheckedChange={…} />
              <Label htmlFor={ID_TOGGLE} className="text-sm font-semibold text-white/80">…</Label>
            </div>
          </div>
          <FilaRevisoesTable incluirRespondidos={incluirRespondidos} />
```

**O que DEVE diferir:**
1. **O default do toggle é INVERTIDO.** Análogo: `useState(false)` para "incluir respondidos" (a
   tela abre no trabalho). Aqui: `useState(false)` para "mostrar só os não atendidos" — ou seja,
   a tela abre na **visão completa**. A UI-SPEC dá o motivo duro (a linha nasce `atendido`; abrir
   filtrado mostraria tela vazia quase sempre). Um copy-paste que mantenha a semântica do análogo
   produz a tela errada com o mesmo `false`.
2. **+1 banner de escopo** entre o subtítulo e o `<h2>`, tratamento neutro
   `rounded-lg border border-white/15 bg-white/5 p-4`, nunca colapsável. O análogo não tem banner
   — é o único elemento estrutural novo, e a UI-SPEC §Âncora avisa que ele não pode empurrar a
   primeira linha para fora da dobra em 1366×768.
3. `PAGINA_COPY` recebe a copy da §Copywriting desta fase, verbatim.

### `src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx`

**Análogo:** `src/features/revisao/components/FilaRevisoesTable.tsx` (348 linhas).

**Constantes a copiar verbatim** (`:59,110-114`):

```ts
const CAP_LEITURA = 200

/** Cabeçalho fixo: o sticky vai nas CÉLULAS (com `border-collapse: collapse` do preflight
 *  do Tailwind, sticky em `<thead>`/`<tr>` não gruda). */
const TH_CLASSES =
  'sticky top-0 z-10 bg-white/10 text-sm font-semibold text-white/80 backdrop-blur-sm'

/** Largura máxima por coluna de texto livre — o par obrigatório do `truncate`. */
const CELULA_TRUNCADA = 'max-w-[220px] truncate'
```

**Scrollport + wrapper, verbatim** (`:174`):

```tsx
<div className="rounded-xl border border-white/10 [&>[data-slot=table-container]]:max-h-[70vh] [&>[data-slot=table-container]]:overflow-y-auto">
```

**`AsyncState` com copy sobrescrita** (`:156-167`):

```tsx
<AsyncState
  isLoading={isLoading} isError={isError} isEmpty={linhas.length === 0}
  onRetry={() => void refetch()} retrying={isRefetching}
  copy={{ empty: { heading: vazio.heading, body: vazio.body },
          error: { heading: FILA_COPY.erro.heading, generic: FILA_COPY.erro.generic } }}
>
```

**Config de SLA fora do carregamento** (`:149-151`) — copiar o comentário junto:

```tsx
// A config de limiar NUNCA vira estado de erro da tela: `null` já é uma apresentação
// completa (a faixa degenerada), então nem `isError` nem `isLoading` dela entram aqui.
const { data: limiares } = useConfigSlaRevisao()
```

**Aviso de corte** (`:334-336`), **`formatarData` com travessão** (`:117-125`) e o **tooltip com
gêmeo `sr-only`** (`:188-206`) — os três verbatim em estrutura.

**O que DEVE diferir:**
1. **Zero coluna de ação.** Sai o `<TableHead className={cn(TH_CLASSES,'text-right')}>` com
   `sr-only` de Ações (`:208-210`), sai a `TableCell` de ação (`:293-326`), sai o
   `ResponderRevisaoDialog` (`:338-344`) e todo o `linhaEmFoco`/`useState`. **Também sai o
   `text-accent`** do botão (`:235`) — a UI-SPEC §Color declara que esta é a primeira tabela do
   projeto sem elemento accent na linha.
2. **5 colunas, todas com cabeçalho visível.** Zero `sr-only` de coluna.
3. **A copy do tooltip é DIFERENTE e a diferença é jurídica.** O análogo (`:72-73`) diz
   `'…O Art. 20 da LGPD não fixa prazo…'`. Copiar isso seria afirmação falsa: o Art. 19, II fixa
   15 dias. Usar a string da 44-UI-SPEC §Tooltip.
4. **Realce de linha âmbar** nas não atendidas (`bg-amber-500/5 hover:bg-amber-500/10`), canal
   redundante — a `TableRow` do análogo é só `hover:bg-white/5` (`:247`).
5. Coluna "O que aconteceu" com vocabulário fechado e fallback total ("Motivo não registrado"),
   no idioma de `rotularDecisao` (`:128-131`), que já resolve desconhecido para o valor cru.
6. `key` da `TableRow`: o análogo usa `candidatura_id`; aqui é o id da solicitação.

### `src/features/pedidos-dados/components/SituacaoPedidoBadge.tsx`

**Análogo:** `src/features/revisao/components/VereditoBadge.tsx` (vocabulário fechado + neutro
para caminho feliz) com a constante tipográfica de `RevisaoSlaBadge.tsx:60`:

```ts
const TIPOGRAFIA_BADGE = 'text-sm font-semibold'
…
<Badge variant="outline" className={cn(TIPOGRAFIA_BADGE, …)}>
```

**O que DEVE diferir:** valor desconhecido cai no tratamento neutro **exibindo o token cru**,
nunca célula vazia (UI-SPEC §Badge de Situação, precedente 42-11). E **sem ícone** — o
`AlertTriangle` pertence à faixa vermelha do `RevisaoSlaBadge` (um ícone por linha, no máximo).

### `src/features/pedidos-dados/hooks/*` + `pedidosDadosKeys`

**Análogos, arquivo a arquivo:**

| Novo | Análogo | Copiar |
|---|---|---|
| `useFilaPedidosDados.ts` | `revisao/hooks/useFilaRevisoes.ts` (59 linhas) | a fábrica de chaves mora **no hook primário**, não em arquivo próprio (`useFilaRevisoes.ts:36-42`); `staleTime/gcTime = 5*60*1000`, `retry: 2`; o filtro participa da `list()` |
| `useConfigSlaDados.ts` | `revisao/hooks/useConfigSlaRevisao.ts` | `retry: false`; `null` é resultado válido |
| `usePedidosDadosPendentesCount.ts` | `revisao/hooks/useRevisoesPendentesCount.ts` (35 linhas) | `retry: 2`; o docblock que proíbe renderizar o número cru |

Fábrica viva a espelhar (`useFilaRevisoes.ts:36-42`):

```ts
export const revisoesKeys = {
  all: ['revisoes'] as const,
  lists: () => [...revisoesKeys.all, 'list'] as const,
  list: (filtros: FiltrosFilaRevisao) => [...revisoesKeys.lists(), filtros] as const,
  pendentesCount: () => [...revisoesKeys.all, 'pendentes-count'] as const,
  configSla: () => [...revisoesKeys.all, 'config-sla'] as const,
}
```

**O que DEVE diferir:** nada estrutural. ⚠ O invariante do BD-8 é de **servidor**: fila e contador
têm de usar o mesmo predicado de escopo dentro das duas RPCs — os hooks não podem impô-lo.

### `src/features/pedidos-dados/services/pedidosDadosService.ts`

**Análogo:** `src/features/revisao/services/revisaoService.ts` (338 linhas). Quatro formas:

1. **Classe de erro** (`:66-75`): `export class RevisaoError extends Error` com `code` de
   vocabulário pequeno + `details?: unknown` + `this.name`.
2. **Classificador total de erro** (`:92-128`): nunca lança, sempre devolve a classe.
3. **Allowlist de colunas + projeção defensiva** (`:152-164,231-237`):

```ts
export const FILA_REVISAO_COLUNAS = [ 'candidatura_id', 'candidato_nome', … ] as const

function projetarLinhaFila(linha: Record<string, unknown>): FilaRevisaoRow {
  const projetada: Record<string, unknown> = {}
  for (const coluna of FILA_REVISAO_COLUNAS) {
    projetada[coluna] = coluna in linha ? linha[coluna] : null
  }
  return projetada as unknown as FilaRevisaoRow
}
```

4. **Leitor de config que não lança** (`:284-297`) — allowlist de 3 colunas + `maybeSingle()` +
   `if (error || !data) return null` + checagem de tipo dos dois números.
5. **Export namespaced** no fim (`:331-338`).

⚠ O tipo da linha é **escrito à mão, não derivado de `database.types.ts`** — o motivo está em
`:193-199` (o gerador declara toda coluna de `RETURNS TABLE` como não-nula). Repetir aqui: o nome
do candidato É nulável e a UI resolve para "Não identificado".

### `src/components/RHSidebar.tsx` e `src/router/routes.tsx` (editados)

Os três sítios vivos, com os comentários que os nomeiam:

- **Sítio 1** (`RHSidebar.tsx:123-132`): `{ id: 'revisoes-rh', label: 'Revisões', icon: <Scale size={24} />, badge: badgeRevisoes }`, precedido do comentário "Sítio 1 de 3 — o item existe."
- **Sítio 2** (`:95-97`): `if (pathname.startsWith('/rh/revisoes')) return 'revisoes-rh';` — "Sem esta linha o item navega mas nunca se acende."
- **Sítio 3** (`:174-176`): `'revisoes-rh': '/rh/revisoes',` — "sem esta entrada o item existe, se acende, e não navega."
- Contador (`:88-89`): `const { data: revisoesPendentes } = useRevisoesPendentesCount(); const badgeRevisoes = formatarBadgePendentes(revisoesPendentes);`

Rota (`routes.tsx:66` + `:461-467`):

```tsx
const RevisoesRHPage = lazyNamed(() => import('../features/revisao/components/RevisoesRHPage'), 'RevisoesRHPage')
…
{ path: '/rh/revisoes', element: (<RoleGuard role={['rh','administrador']}><RevisoesRHPage /></RoleGuard>) },
```

**O que DEVE diferir:** posição do item (após `revisoes-rh`, antes de `vagas-rh`) e ícone
`FileDown`. Não há armadilha de precedência de prefixo aqui (não existe `/rh` genérico).

---

## 4 · Backend

### `supabase/functions/exportar-meus-dados/index.ts`

**Análogo:** `supabase/functions/get-curriculo-url/index.ts` (258 linhas) — clone estrutural.

**Import estático + helpers** (`:49-73`):

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR";
function jsonResponse(body: unknown, status: number): Response { … }
function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
}
```

**`Deps` injetáveis + handler exportável** (`:79-100`):

```ts
export interface Deps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  // deno-lint-ignore no-explicit-any
  supabaseUser: any;
}

export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);
  const { supabaseAdmin, supabaseUser } = deps;
```

**Passo 1 — AUTHENTICATE** (`:102-107`), copiar verbatim:

```ts
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
const user = userRes.user;
```

**Passo 2 — AUTHORIZE, e o tratamento do erro de query** (`:115-135`). O detalhe load-bearing é
`WR-04`: **não engolir o erro da query** (erro transitório vira 500, não um 403 mentiroso).

**Wiring de produção two-client** (`:227-257`), incluindo o short-circuit de OPTIONS **antes** do
guard de `Authorization` (`:229-232`) — sem ele o preflight leva 401 e o browser bloqueia por CORS:

```ts
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL"); …
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
```

**Log redigido** (`:211-219`): só ids + role, **nunca** a signedUrl/path.

**O que DEVE diferir** (os três desvios do RESEARCH §Pattern 3, mais dois de detalhe):

| # | Análogo | Aqui |
|---|---|---|
| 1 | passo 2 lê `usuarios_rh.role` e exige rh/admin | passo 2 resolve `candidatos.id` **de `auth.uid()`**; não-candidato → 403 |
| 2 | valida `{ candidatura_id }` com UUID_RE (`:140-155`) | **corpo não é lido** — "um corpo que não é lido é um corpo que não pode ser forjado" (T-32-03) |
| 3 | 1 leitura de `candidaturas` | N leituras por allowlist + INSERT/UPDATE de `solicitacoes_dados` |
| 4 | `ErrorCode` de 5 valores | **+ `"COOLDOWN"` (429)** — não é 401/403/400 e traduzir para 403 obrigaria a UI a adivinhar |
| 5 | minta signed URL do CV | **não minta URL nenhuma.** BD-7 põe o CV no client; o payload da EF nunca carrega URL (Invariante 4) |

E o invariante que atravessa tudo: **nenhum `select('*')`** — a anotação viva está em `:158-160`
(`[[reference_select_star_leaks_pii]]`).

### `supabase/migrations/…_p44_config_sla_dados.sql`

**Análogo:** `supabase/migrations/20260730000001_p42_revisao_art20.sql:432-513` — a seção 6+7,
copiável quase inteira. Esqueleto vivo:

```sql
CREATE TABLE public.config_sla_revisao (
  chave         text        PRIMARY KEY,
  dias_atencao  integer     NOT NULL CHECK (dias_atencao > 0),
  dias_atraso   integer     NOT NULL CHECK (dias_atraso > 0),
  descricao     text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_config_sla_revisao_ordem CHECK (dias_atraso > dias_atencao)
);

ALTER TABLE public.config_sla_revisao ENABLE ROW LEVEL SECURITY;

CREATE POLICY config_sla_revisao_rh_read ON public.config_sla_revisao
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
```

Mais o seed `ON CONFLICT DO NOTHING` (`:490-499`, jamais upsert — re-seedar sobrescreveria um
número que o operador ajustou) e o trigger herdado (`:503-513`):

```sql
CREATE TRIGGER trg_config_sla_revisao_atualizado_em
  BEFORE UPDATE ON public.config_sla_revisao
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
```

⚠ `public.tocar_atualizado_em()` **já existe** desde a P37 e **não deve ser redefinida** — o
comentário `:497-500` do análogo explica. E `CREATE TRIGGER` puro, sem DROP prévio (falhar alto).

**O que DEVE diferir:** nomes (`config_sla_dados`, `ck_config_sla_dados_ordem`,
`config_sla_dados_rh_read`), a chave do seed, e **os comentários**: a nota do análogo diz que o
Art. 20 não fixa prazo; aqui o Art. 19, II **fixa** 15 dias corridos como **teto**, e os limiares
seedados ficam abaixo dele. Copiar o comentário do análogo produziria documentação falsa —
mesmo defeito do tooltip.

### `supabase/migrations/…_p44_solicitacoes_dados.sql`

**Análogo:** a mesma migration, seções de RPC `SECURITY DEFINER` + RLS. Predicado de escopo vivo
(`20260730000001…:351-357`):

```sql
AND (
     v_role = 'administrador'
     OR (v_role = 'rh'
         AND c.deleted_at IS NULL
         AND c.is_rascunho = false
         AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))
    )
```

E o comentário do contador (`:421-429`) que declara o invariante que o BD-8 repete:
*"com o MESMO guard de papel e o MESMO escopo por vaga de listar_revisoes_decisao — se os dois
divergirem, o badge conta o que a fila nao mostra."*

**O que DEVE diferir:** um pedido de acesso **não tem vaga**. O predicado é a tradução do BD-8:
recrutador vê pedidos de candidatos com candidatura em vaga sua; administrador vê tudo, **inclusive
órfãos**. Mais o filtro `tipo = 'acesso'` no servidor (UI-SPEC §O que esta fase NÃO faz), a
ordenação composta (não atendidos ASC, depois atendidos DESC) e `LIMIT 200`.

⚠ **Procedimento 42601** (CLAUDE.md): `CREATE FUNCTION` com `$$…$$` adjacente a
`COMMENT`/`GRANT`/`REVOKE` falha no pooler. Aplicar pelo SQL Editor +
`supabase migration repair --status applied <version>`, sem wrapper `BEGIN;/COMMIT;`.
A ordem `config_sla_dados` → `solicitacoes_dados` é deliberada: a config é o teste barato do
procedimento antes da tabela que importa. **M3 (pg_policies das duas tabelas) roda depois do
apply**, antes de qualquer asserção de RLS ser declarada satisfeita.

---

## 5 · No Analog Found — onde o repositório não tem precedente

Declarado explicitamente para que o planner não receba um análogo falso.

### 5.1 ⚠ Teste da EF: o caminho decide se ele quebra `npm run test:run`

**Não é ausência de análogo — é uma armadilha de configuração que o plano precisa saber.**

Medido em 2026-08-03: o `include` do Vitest é `**/__tests__/**/*.{test,spec}.{ts,tsx}`
(verificado rodando `npx vitest run supabase/functions/get-curriculo-url/index.test.ts` →
"No test files found", com o `include` impresso). Por isso
`supabase/functions/get-curriculo-url/index.test.ts` **não** aparece na lista de `exclude` do
`vite.config.ts:19-83`, apesar de importar `https://deno.land/std` — ele nunca é coletado, porque
é **irmão** do `index.ts`, não filho de `__tests__/`.

A 44-RESEARCH §Recommended Project Structure propõe
`supabase/functions/exportar-meus-dados/__tests__/index.test.ts`. **Esse caminho seria coletado
pelo Vitest** e produziria falha de CARGA de módulo ESM — exatamente o modo de falha que o
comentário do `vite.config.ts:71-76` registra ter deixado `npm run test:run` vermelho no 42-07.

**Duas saídas, ambas válidas; o plano escolhe uma e declara:**
(a) caminho irmão `supabase/functions/exportar-meus-dados/index.test.ts` (idioma do análogo
direto, zero edição de `vite.config.ts`); ou (b) `__tests__/` **mais** uma linha literal em
`exclude` (`'supabase/functions/exportar-meus-dados/**/*.test.ts'`), no idioma dos comentários
vivos.

**Análogo de harness:** `supabase/functions/get-curriculo-url/index.test.ts:1-70` —
`loadHandler()` por import dinâmico, `makeChainable(result)` (query-builder thenable+chainable),
`makeMockSupabaseUser(user|null)`, `makeMockSupabaseAdmin` roteando por nome de tabela. Roda com:
`deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/<ef>`.

### 5.2 Gerador da allowlist — idioma adjacente, **não** análogo funcional

`docs/compliance/sql/gen-pii-md.cjs` (125 linhas) é o único gerador do repo. O que dele é
reusável é a **casca**, não o miolo:

```js
const fs = require('fs'); const path = require('path'); const yaml = require('js-yaml');
…
if (process.argv.includes('--check')) {
  const disco = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (disco !== out) { console.error('DIVERGENTE: …'); process.exit(1); }
  console.log('OK: …'); process.exit(0);
}
fs.writeFileSync(OUT, out);
```

(`gen-pii-md.cjs:19-21,113-125`)

**Por que NÃO é análogo funcional:** `gen-pii-md.cjs` tem **uma** entrada (o YAML) e faz
render 1-para-1. O gerador desta fase tem **três** (catálogo vivo + `pii-inventory.yaml` +
`export-scope-rules.yaml`) e sua razão de existir é **falhar por não-fechamento** (BD-6: coluna
viva sem classificação = erro de geração, nunca omissão silenciosa). Esse comportamento não
existe em lugar nenhum do repositório. O parente mais próximo desse *espírito* são as regras de
cobertura R1–R5 do `pii-inventory.yaml` — que são documento, não código.

⚠ **Achado #2 confirmado:** `grep -n "js-yaml" package.json` → **0 linhas**. `js-yaml@3.14.2` está
em `node_modules` só por hoisting. O plano promove a `devDependency` explícita e usa `safeLoad`
(em 3.x, `load` usa `DEFAULT_FULL_SCHEMA`) — `gen-pii-md.cjs:110` usa `yaml.load`, e **essa linha
não é para ser copiada**.

### 5.3 Smoke SQL do SC#3 — cabeçalho tem análogo, asserção não tem

**Molde do cabeçalho:** `docs/compliance/sql/04-invent05-blast-radius.sql:1-45` e
`01-pii-catalog.sql:1-33`. Blocos obrigatórios do idioma vivo: `Requirement coberto` ·
`Decisão de origem` · `Milestone` · `Autoria` · **`Natureza: READ-ONLY — seguro em PROD. Zero
statement de escrita.`** · `COMO EXECUTAR` (pelo orquestrador via `execute_sql` do MCP, porque
subagentes GSD não recebem os tools — anthropics/claude-code#13898) · a regra de honestidade de
número (`04-…:30-40`).

**O que NÃO tem análogo:** nenhum arquivo em `docs/compliance/sql/` **falha**. Os quatro
existentes são consultas de *coleta* — devolvem números para um humano ler. O SC#3 exige um
`FULL OUTER JOIN` entre `information_schema.columns` e a allowlist que **falha nos dois sentidos**
(coluna nova no banco / coluna sumida). Nenhum precedente de asserção-em-SQL existe aqui.
O parente mais próximo do *idioma de asserção* está fora deste diretório, nos smokes de migration
(`funil01_pontuar_sjt_smokes.sql`, citado em `revisaoService.ts:90`), que discriminam por SQLSTATE
— referência de forma, não de conteúdo.

### 5.4 Snapshot test (EXPORT-04 / SC#3 asserção 1) — **zero precedente, confirmado**

`grep -rn "toMatchSnapshot|toMatchInlineSnapshot|toMatchFileSnapshot" src supabase scripts docs`
→ **0 ocorrências** (medido 2026-08-03). Nenhum diretório `__snapshots__`. A técnica estreia.

**Idioma adjacente mais próximo, e ele é bom:** as asserções de allowlist de
`revisaoService.test.ts` sobre `FILA_REVISAO_COLUNAS` — lista congelada + **asserções negativas
nomeadas** ("uma por chave proibida"), descritas no docblock `:23-27`. E
`perfilRhService.test.ts:1-18`, que assere "the EXACT 7-column string, NEVER `select('*')`".

O plano escolhe entre `toMatchInlineSnapshot` (o que o EXPORT-04 literalmente pede; o diff aparece
no PR) e `expect(chaves).toEqual([...])` (não estreia técnica). **Qualquer que seja a escolha, ela
não substitui o smoke SQL** — nenhuma asserção Vitest enxerga o catálogo do banco, e detectar a
coluna nova é literalmente o modo de falha que o SC#3 nomeia.

### 5.5 Gerador de HTML autocontido no cliente — sem análogo no `src/`

`supabase/functions/_shared/email-templates.ts` é o idioma de string-building HTML do projeto,
mas vive na **EF**, não no cliente. No `src/`, o parente é `gerarIcsAgendamento`
(`agendamentoCandidatoService.ts`) — mesma disciplina (função pura, string-building, zero npm,
testável sem DOM), formato diferente. O plano copia a **disciplina**, não o conteúdo.

---

## 6 · Shared Patterns (transversais)

### Mock do client Supabase em teste de serviço
**Fonte:** `src/features/revisao/services/__tests__/revisaoService.test.ts:38-70`
**Aplica a:** `exportacaoService`, `pedidosDadosService`

```ts
const { selects, eqs, froms, rpcMock, fromMock, maybeSingleMock } = vi.hoisted(() => ({ … }))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => { selects.push(cols); return q })
    q.eq = vi.fn((col: string, val: unknown) => { eqs.push([col, val]); return q })
    q.maybeSingle = maybeSingleMock
    return q
  }
  fromMock.mockImplementation((tabela: string) => { froms.push(tabela); return makeQuery() })
  return { supabase: { from: fromMock, rpc: rpcMock } }
})
```

O mock **captura a string de `select()`** — é assim que a asserção de allowlist morde. O mock tem
de vir **antes** do import do serviço (o client valida `VITE_SUPABASE_*` no topo do módulo).

### Mock de `supabase.storage` (necessário para o CV client-side / BD-7)
**Fonte:** `src/features/perfil-rh/services/__tests__/perfilRhService.test.ts:47-73`

```ts
storageFromMock.mockImplementation(() => ({
  upload: uploadMock,
  createSignedUrl: createSignedUrlMock,
}))
return { supabase: { from: fromMock, rpc: rpcMock, auth: { … }, storage: { from: storageFromMock } } }
```

Este é o único mold vivo de `createSignedUrl` mockado. Asserir o TTL: `createSignedUrl(path, 60)`.
⚠ `perfilRhService.ts:294` usa 3600 s (foto de perfil) — **não é precedente para PII**.

### Mock de hooks em teste de componente de fila
**Fonte:** `src/features/revisao/components/__tests__/FilaRevisoesTable.test.tsx:27-56`
Mockar `useFila*` e `useConfigSla*` por caminho `@/features/…`, com a fábrica de chaves
**re-declarada dentro do mock** (senão o import da chave quebra). Fábrica `linha(over)` +
`filaState(over)` para os cenários parciais.

### Copy como constante `as const` exportada
Vivo em `RevisoesRHPage.tsx:46-52` (`PAGINA_COPY`), `FilaRevisoesTable.tsx:62-105` (`FILA_COPY`),
`PrivacidadeCandidatoPage.tsx:34-52` (`COPY_PRIVACIDADE`), `GuardaCurriculoBloco.tsx:45-58`.
Sempre com o comentário `/** Copy verbatim da NN-UI-SPEC (§…) — fonte única desta tela. */`.
É o que torna executáveis os greps de ban da §Copywriting — e o que faz o **escopo** desses greps
importar: `GuardaCurriculoBloco.tsx:57` contém legitimamente `'pedir a eliminação do seu currículo'`
(copy aprovada na 43, não editada por esta fase). Um grep de `src/features/privacidade/` inteiro
reprovaria copy aprovada de outra fase.

### Fallback total em toda célula
- Data inválida → `'—'` (`FilaRevisoesTable.tsx:117-125`)
- Sem nome resolvível → `'Não identificado'`, **nunca** o travessão e **nunca** o UUID
  (`:88`, e o docblock `:18-22` explica por que os dois são fatos diferentes)
- Token desconhecido → o valor cru, nunca em branco (`rotularDecisao`, `:128-131`)

---

## 7 · Metadata

**Escopo de busca:** `src/features/{revisao,privacidade,hub-candidato,perfil-rh,agendamento}/` ·
`src/components/` · `src/router/` · `supabase/functions/` · `supabase/migrations/` ·
`docs/compliance/` · `vite.config.ts` · `package.json`
**Arquivos lidos integralmente:** 14 · **lidos por seção:** 8
**Comandos de verificação executados:** `grep` de `formatarBadgePendentes`, `js-yaml`,
`toMatchSnapshot*`; `npx vitest run <ef test>` (para medir o `include` real)
**Data:** 2026-08-03

### Os três fatos deste documento que mudam o plano

1. **`formatarBadgePendentes` devolve `undefined`, não `''`** — a UI-SPEC cita o valor errado.
   Importar a função; nunca comparar com `''`.
2. **O `include` do Vitest é `**/__tests__/**`** — pôr o teste da EF em `__tests__/` quebra
   `npm run test:run` a menos que `vite.config.ts` ganhe uma linha de `exclude`. O irmão
   `index.test.ts` não quebra nada.
3. **`js-yaml` não está no `package.json`** (0 linhas) — dependência-fantasma confirmada.
