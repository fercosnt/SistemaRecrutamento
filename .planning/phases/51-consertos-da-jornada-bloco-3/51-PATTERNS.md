# Phase 51: Consertos da Jornada — Bloco 3 — Mapa de Padrões

**Mapeado em:** 2026-10-08
**Arquivos analisados:** 46 (criar ou modificar), em 2 ondas (D-27: telas e textos primeiro, banco depois)
**Com análogo:** 44 / 46. Os dois sem análogo direto estão em §«Sem análogo».
**Base:** 51-CONTEXT.md (D-01..D-38; **D-30..D-38 prevalecem**) + 51-RESEARCH.md (mecanismo (b): registro próprio do pedido + RPCs novas)

> Todo análogo citado foi conferido com `git ls-files` (rastreado). Nenhum caminho de espelho
> de instalação/runtime aparece aqui. Os números de linha valem para o disco em 2026-10-08.

> ⚠ **Um detalhe de forma muda de um análogo para outro, e o planner precisa escolher.** Os
> pré-portões da P48/P50 conferem `md5(p.prosrc)`. A tabela de md5 do 51-RESEARCH
> (§«O que o banco faz hoje») foi medida com `md5(pg_get_functiondef(...))`. **Não misture:**
> os dois valores são diferentes para a mesma função. Escolha uma forma por migration, remeça no
> plano com ela e escreva no cabeçalho qual foi usada. Os análogos abaixo usam `prosrc`.

---

## Classificação dos arquivos

### Onda A — cliente, texto e gerador (JORN-43 cliente, 44, 45, 46, 47, 48, 49)

| Arquivo novo ou modificado | Papel | Fluxo de dados | Análogo mais próximo | Qualidade |
|---|---|---|---|---|
| `src/features/hub-candidato/components/HubSection.tsx` | componente | render por estado | ele mesmo (`COPY` + `HubSectionEstado`, linhas 36, 57-70) | exato |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx` | componente (página RH) | request-response (leitura) | ele mesmo, mais `src/features/decisao/components/RespostaCasoAbertoSjt.tsx` (expandir no lugar) | exato |
| `src/features/avaliacao/components/ScorecardAvaliacao.tsx` | componente | leitura + transform (filtro de tipo) | ele mesmo, mais `RespostaCasoAbertoSjt.tsx` (texto ao lado das citações) | exato |
| `src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx` | teste | — | ele mesmo (linhas 62-66 fixam as faixas: D-32 as revoga) | exato |
| `src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx` (+ teste novo do «Ver respostas») | teste | — | `hubEmptyState.test.tsx`, `hubAcoesEncerrada.test.tsx` | exato |
| `src/features/avaliacao/components/AvaliacaoContainer.tsx` | componente | navegação | ele mesmo (`AvaliacaoShell` 154-231, `WrongEtapaState` ~290-312, gate 508) | exato |
| `src/features/avaliacao/components/{RedacaoEditorScreen,SjtCasoAbertoScreen,SjtMultiplaEscolhaScreen,BigFiveQuestionnaireScreen,DevolutivaBigFiveView}.tsx` | componente | navegação (rótulo) | `ProvaCognitivaScreen.tsx` (rótulos num `COPY` `as const`, linhas 66-96) | role-match |
| `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` | componente | navegação + texto | ele mesmo (`COPY` 66-96, `backToPanel` 107) | exato |
| `src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx` | componente | navegação + texto | ele mesmo (`COPY` 35-47, `voltarAoPainel` 52) | exato |
| `LiberacaoCognitivoBlock.tsx:72`, `useLiberacaoCognitivo.ts:88`, `CognitivoBandCard.tsx:106,124,153-173`, `entrevistaService.ts:1026`, `ConsolidacaoDashboard.tsx:69`, `PesosSliders.tsx:42`, `exportacaoService.ts:212-235` | texto (rótulos D-15) | — | inventário do 51-RESEARCH §«Inventário de nomes» | exato (só string) |
| `src/__tests__/guards/rotulos-instrumentos.grep.test.ts` (NOVO) | teste (guarda por forma) | file-I/O | `src/__tests__/guards/forbidden-strings.grep.test.ts` | exato |
| `e2e/prova-cognitiva.spec.ts:62,63,74`, `e2e/explicacao-flow.spec.ts:69` | teste E2E | — | os próprios arquivos (só rótulos) | exato |
| `src/features/entrevista/components/EntrevistaScorecardInline.tsx` | componente (form) | request-response | ele mesmo (`SCORECARD_COPY` 38-42 + `semAnalise` 86, 213-221) | exato |
| `src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx` | teste | — | ele mesmo (`:14`, `:77` mudam) | exato |
| `docs/compliance/pii-inventory.yaml` | config (inventário) | — | ele mesmo (linha 103 `estado`) + precedente 48-17 | exato |
| `docs/compliance/sql/gen-recibo-exclusao.cjs` | utilitário (gerador) | transform | ele mesmo (`dados_de_cadastro` 259-299, `ITENS_MANTEM` 510+) | exato |
| `docs/compliance/recibo-exclusao.json`, `supabase/functions/_shared/reciboExclusao.ts`, `src/features/privacidade/constants/reciboExclusao.generated.ts`, `docs/compliance/pii-inventory.md` | gerados | — | **NUNCA à mão:** `node docs/compliance/sql/gen-recibo-exclusao.cjs` e `gen-pii-md.cjs` | exato |
| `supabase/functions/_shared/email-templates.ts` | utilitário (EF) | transform | ele mesmo (`corpoDecisao` 248-259, `corpoCognitivoLiberado` 321-336, `SUBJECTS` 355, preheader 405) | exato |
| `supabase/functions/_shared/__tests__/email-templates.test.ts` | teste (deno) | — | ele mesmo (grep-guard 75-81, `COPY_REJEICAO` 83-86) | exato |

### Onda B — banco, depois EF, depois cliente (JORN-43 banco, JORN-42; D-55 da 49)

| Arquivo novo ou modificado | Papel | Fluxo de dados | Análogo mais próximo | Qualidade |
|---|---|---|---|---|
| `supabase/tests/p51_revisao_rejeicao_smoke.sql` (NOVO, **antes** da migration, «deliberadamente RED») | teste (smoke SQL) | batch, escrita que reverte | `supabase/tests/p49_44_resposta_caso_aberto_smoke.sql` + cabeçalho RED de `p42_revisao_art20_smoke.sql:23-29` | exato |
| `supabase/tests/p51_raven_status_smoke.sql` (NOVO, ou cláusula no anterior) | teste (smoke SQL) | request-response | `p49_44_resposta_caso_aberto_smoke.sql` (cláusulas de ACL e de titular) | role-match |
| `supabase/migrations/2026100X000001_p51_raven_em_avaliacao_status.sql` (NOVO) | migration (RPC reescrita) | request-response | `20260712100003_funil12_get_avaliacao_status.sql` (corpo) + `20261005000003_p50_rpcs_leitura_filas.sql` (PRE/POS-PORTAO) | exato |
| `src/features/avaliacao/services/avaliacaoService.ts` (`AvaliacaoStatus` + `raven`) | service | request-response | ele mesmo (235-290) | exato |
| `src/features/avaliacao-cognitiva/components/RavenCandidatoCard.tsx` (NOVO) + hook | componente (card do painel) | request-response | `src/features/agendamento/components/AgendamentoCandidatoCard.tsx` | role-match |
| `src/components/pages/DashboardCandidatoPage.tsx` | componente (página) | — | ele mesmo (`map` 334-540, `AgendamentoCandidatoCard` 450-451, `stopPropagation` 469-471) | exato |
| `supabase/migrations/2026100X000002_p51_revisao_rejeicao_tabela_e_rpcs.sql` (NOVO) | migration (tabela + RPCs DEFINER + triggers) | CRUD + event-driven | `20260804000002_p44_solicitacoes_dados.sql` (tabela + RLS) + `20260921000011_p48_reabertura_colunas_e_resposta.sql` (resposta que reabre) + `20260921000007_p48_dedupe_revisao_por_ciclo.sql` (trigger de notificação) | role-match (composição de 3) |
| `supabase/migrations/2026100X000003_p51_fila_revisoes_tres_origens.sql` (NOVO: `listar_revisoes_decisao`, `contar_revisoes_pendentes`, `funil_kpis`) | migration (RPC reescrita, troca de `RETURNS TABLE`) | request-response | `20261005000003_p50_rpcs_leitura_filas.sql` | exato |
| RPC de detalhe do knockout (D-11), na migration 0002 ou 0003 | migration (RPC leitura RH) | request-response | `ler_resposta_caso_aberto_sjt` em `20261005000003` (guarda fail-closed + helper antes da busca) | role-match |
| `supabase/migrations/2026100X000004_p51_motor_raspa_revisao_rejeicao.sql` (NOVO) | migration (função destrutiva) | batch | `20260922000012_p49_motor_logs_e_revisao.sql` (raspar `revisao_resultado`, 755-768) | exato |
| `varrer_prazos_reabertura()` estendida (A3 do RESEARCH) | migration (cron) | batch / event-driven | `20260921000015_p48_prazo_reabertura_alerta.sql:325-386` | exato |
| `scripts/p51_mutacoes.cjs` (NOVO) | utilitário (runner de mutação) | batch | `scripts/p50_mutacoes.cjs` + `scripts/p50_ensaio.cjs` | exato |
| `supabase/tests/p50_acesso_recrutador_smoke.sql` (k) | teste (edição de portão, D-56) | — | ele mesmo, linhas 1852-1857 | exato |
| `supabase/tests/p50_desfazer_expansao.sql` | gerado (rollback) | — | **NÃO editar à mão** (linha 2: «GERADO, NÃO EDITAR À MÃO»): regenerar com `scripts/p50_desfazer.cjs` ou registrar a obsolescência | exato |
| `supabase/functions/notificar-candidato/index.ts` (+ `helpers.ts`) | EF | event-driven | ele mesmo, 392-421 (veredito por evento) e 522-545 (render) | exato |
| `supabase/functions/notificar-rh/` | EF | event-driven | sem mudança, se o corpo do trigger novo for `{evento, candidatura_id, ciclo}` (RESEARCH §JORN-42) | — |
| `src/features/explicacao/services/explicacaoService.ts` | service | request-response | ele mesmo (`origem` 139-157, `getExplicacaoSemDecisaoFinal` 374-414, `solicitarRevisao` 473-504) | exato |
| `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx` | componente | — | ele mesmo, 205-337 | exato |
| `src/features/explicacao/components/SolicitarRevisaoCTA.tsx` | componente | request-response | ele mesmo | exato |
| `src/features/explicacao/{services,components}/__tests__/*` | teste | — | `ExplicacaoCandidatoPage.test.tsx:400-506` (asserem a AUSÊNCIA do CTA: reespecificar) | exato |
| `src/features/revisao/services/revisaoService.ts` | service | request-response | ele mesmo (`FILA_REVISAO_COLUNAS` 152-164, `projetarLinhaFila` 231-237, `responderRevisao` 321-328) | exato |
| `src/features/revisao/components/OrigemRevisaoBadge.tsx` (NOVO) | componente | render | `src/features/revisao/components/VereditoBadge.tsx` | exato |
| `src/features/revisao/components/FilaRevisoesTable.tsx` | componente | — | ele mesmo (`key` 246, `naoIdentificado` 88/265) | exato |
| `src/features/revisao/components/ResponderRevisaoDialog.tsx` | componente | request-response | ele mesmo (`decidido_por_nome` 289) + `RespostaCasoAbertoSjt.tsx` (busca sob demanda) | exato |
| Artefatos D-57 da tabela nova: `docs/compliance/catalogo-vivo-44.json`, `export-scope-rules.yaml`, `pii-inventory.yaml`, `export-allowlist.json`, `supabase/functions/_shared/exportAllowlist.ts`, `docs/compliance/sql/05-export-allowlist-drift.sql`, `docs/compliance/__tests__/exportAllowlist.test.ts`, `exportacaoService.ts` (`rotuloTabela` 202-235) | config + gerados | — | precedente 48-17 (`48-17-SUMMARY.md`) e 49-21 | exato |
| `src/types/database.types.ts` (ou o caminho do repo) | gerado | — | `npm run db:types < /dev/null` (memória «db:types pendura e trunca») | exato |

---

## Atribuição de padrões

### ONDA A

#### `src/features/hub-candidato/components/HubSection.tsx` (componente, render por estado)

**Análogo:** o próprio arquivo. O 4º estado (D-16) entra **no mesmo `COPY`** e no mesmo union. Não crie componente novo.

**União de estado** (linha 36):
```ts
export type HubSectionEstado = 'futuro' | 'sem_dados' | 'com_dados'
```

**Texto fixo numa fonte só** (linhas 57-70). O estado novo vira uma chave irmã:
```ts
const COPY = {
  futuro: {
    heading: 'Etapa ainda não iniciada',
    body: 'Esta etapa será liberada quando o candidato avançar no funil.',
  },
  sem_dados: {
    heading: 'Sem dados nesta etapa',
    body: 'Nenhum registro foi gerado ainda para esta etapa.',
  },
  ...
} as const
```

**Ponto de troca** (linhas 76-77). Hoje é binário, e o estado novo precisa entrar nas duas linhas:
```ts
const isEmpty = estado === 'futuro' || estado === 'sem_dados'
const emptyCopy = estado === 'futuro' ? COPY.futuro : COPY.sem_dados
```
**Restrição:** `hubEmptyState.test.tsx:47` proíbe «Concluído» em estado vazio. O texto «Não se aplica a esta vaga» respeita isso.

---

#### `src/features/hub-candidato/components/HubCandidatoRH.tsx` (componente RH, leitura)

**Análogo principal:** o próprio arquivo. **Análogo do botão que expande no lugar (D-17):** `src/features/decisao/components/RespostaCasoAbertoSjt.tsx`.

**Seção a mudar** (linhas 389-399). A contagem usa `triagemQuery.data?.length` **sem filtro de tipo** (C-8: inclui entrevista e redação):
```tsx
<HubSection
  titulo="Avaliação Assíncrona"
  isLoading={triagemQuery.isLoading}
  isError={triagemQuery.isError}
  estado={estadoDaSecao('avaliacao_assincrona', etapaAtual, (triagemQuery.data?.length ?? 0) > 0)}
>
  <p className="text-sm text-white/80">
    {triagemQuery.data?.length ?? 0} registro(s) de avaliação comportamental disponíveis para revisão.
  </p>
</HubSection>
```
O filtro já tem idioma no mesmo arquivo (linhas 123-124). Siga-o:
```ts
const cognitivoScores = (entrevistaQuery.data ?? []).filter((s) => s.tipo === 'cognitivo')
const entrevistaScores = (entrevistaQuery.data ?? []).filter((s) => s.tipo === 'entrevista')
```

**Botão fora da guarda `com_dados`** (D-17, «em qualquer etapa»). O precedente IN-04 está nas linhas 437-447: o `HubSection` só renderiza filhos com dados, então o botão é IRMÃO da seção:
```tsx
{/* IN-04 — always-visible navigation affordance ... NOT gated on data state. */}
{candidaturaId ? (
  <button type="button" onClick={...} className="inline-flex min-h-[44px] ...">
    Abrir workspace de redação
  </button>
) : null}
```

**Expandir no lugar** (`RespostaCasoAbertoSjt.tsx:99-119`): `useState` no nível de cima, `aria-expanded`/`aria-controls` com `useId`, e o filho que busca **só monta depois do clique**:
```tsx
export function RespostaCasoAbertoSjt({ candidaturaId }: RespostaCasoAbertoSjtProps) {
  const [aberto, setAberto] = useState(false)
  const regiaoId = useId()
  return (
    <div data-testid="decisao-sjt-resposta-caso-aberto" className="space-y-2 pt-1 text-amber-100">
      <button type="button" aria-expanded={aberto} aria-controls={regiaoId}
        onClick={() => setAberto((v) => !v)} ...>
        {aberto ? COPY.botaoOcultar : COPY.botaoAbrir}
      </button>
      <div id={regiaoId}>
        {aberto ? <RespostaCasoAbertoConteudo candidaturaId={candidaturaId} /> : null}
      </div>
    </div>
  )
}
```
Texto exportado como constante para o teste conferir a constante e o render (`COPY_RESPOSTA_CASO_ABERTO`, linhas 27-38). Repita isso para «Ver respostas» / «N avaliações respondidas».

**Renome + D-16** nas linhas 401-411: `titulo="Avaliação Cognitiva"` passa a «Prova cognitiva». Quando a vaga não aplica (`contexto.aplica_cognitivo`, que já vem de `useEntrevistaContexto` via `entrevistaService.ts:278,325`), o estado da seção é o novo `'nao_se_aplica'`. **Não mexa** no comentário das linhas 413-418 sobre o `LiberacaoCognitivoBlock`: ele é a base do D-13.

**Marcador no chunk certo:** a rota `/rh/*` é lazy. Confira com `grep -rl "<marcador>" build/assets/` (CLAUDE.md).

---

#### `src/features/avaliacao/components/ScorecardAvaliacao.tsx` (componente, leitura + filtro)

**Análogo:** o próprio arquivo, mais `RespostaCasoAbertoSjt.tsx` e `getRespostaCasoAbertoSjt` (`scoresRhService.ts:195`).

**Cabeçalho a reescrever** (linhas 14-19). Depois do D-17, o hub é a primeira montagem:
```
 * ⚠ NÃO MONTADO (49-REVIEW-GAPS-3 CR-02, 2026-09-30): este componente só é exportado pelo
 * barril; nenhuma rota nem tela o renderiza, e o build o descarta por tree-shaking. ...
```

**Despacho por linha** (linhas 371-381). Hoje manda tudo que não é Big Five nem `mc` para `CasoAbertoBreakdown`, e por isso uma linha de entrevista ou de redação vira «caso aberto» (C-8). Filtre `tipo IN ('sjt','big_five')` **antes** deste `map`:
```tsx
{rows.map((row) =>
  isBigFiveRow(row) ? (
    <BigFiveBreakdown key={row.id} row={row} />
  ) : row.subtipo === 'mc' ? (
    <McBreakdown key={row.id} row={row} />
  ) : (
    <CasoAbertoBreakdown key={row.id} row={row} />
  ),
)}
```

**Bloco de citações** (linhas 218-230). O texto integral entra **ao lado** dele (D-20), reusando `RespostaCasoAbertoConteudo` / `getRespostaCasoAbertoSjt` (estados `disponivel | sem_resposta_enviada | indisponivel | removida`, `RespostaCasoAbertoSjt.tsx:79-96`). O texto do candidato é **nó de texto React**, nunca HTML.

**Big Five (D-32):** a variante só diz «Concluído» / «Não fez», sem número, sem faixa e sem cor. `BigFiveBreakdown` (linhas 274-336) e os mapas `BIGFIVE_BANDA_LABEL` (258) ficam fora do hub. O teste `ScorecardAvaliacao.test.tsx:62-66` fixa «Muito alto» / «Muito baixo» e muda junto (D-56: mudar portão com mordência provada).

---

#### `src/features/avaliacao/components/AvaliacaoContainer.tsx` (componente, navegação)

**Análogo:** o próprio arquivo.

**A prop prometida que não existe** (docblock 149-153 × assinatura 154-166):
```tsx
/**
 * Presentational shell — pure render, no router/query hooks. Reused by both
 * modes. `onLogout`/`onOpenTeste`/`onBackToPanel` are injected so the bare test
 * mount needs no providers.
 */
function AvaliacaoShell({
  cards, candidatoNome, candidatoEmail, onLogout, onOpenTeste,
}: { ...; onLogout?: () => void; onOpenTeste?: (card: TesteCard) => void }) {
```
Acrescente `onBackToPanel?: () => void` no mesmo molde de `onLogout` e injete-a em ~513-519 com `() => navigate('/candidato/dashboard')`.

**Botão do cabeçalho** (D-26): o «Sair» das linhas 195-201 é o molde visual do «Ir ao painel» ao lado dele:
```tsx
<button onClick={onLogout}
  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 backdrop-blur-md transition-all duration-300 hover:shadow-lg active:scale-95">
  <LogOut className="w-4 h-4" />
  <span className="drop-shadow-sm">Sair</span>
</button>
```

**Estado tudo concluído** (linhas 224-231). **Mantenha a frase canônica** (`wait-state-copy.grep.test.ts` a exige) e ponha o botão ao lado:
```tsx
<p className="text-white/70">
  Você concluiu todas as avaliações desta etapa. Acompanhe o andamento pelo seu painel.
</p>
```

**`WrongEtapaState`** (~303-306) e o gate (~508): o rótulo «Voltar ao painel» passa a «Ir ao painel» (D-37). O destino `/candidato/dashboard` não muda.

**Rótulo do instrumento:** `CONTAINER_TESTE_CONFIG.cognitivo.label` (linha 95) passa a «Prova cognitiva». O teste `AvaliacaoContainer.test.tsx:102` (`COGNITIVO_LABEL`) muda junto.

---

#### Telas de prova: `Redacao`, `SjtCasoAberto`, `SjtMultiplaEscolha`, `BigFiveQuestionnaire`, `DevolutivaBigFiveView`, `ProvaCognitivaScreen`, `AvaliacaoRavenScreen` (componentes, navegação)

**Análogo de forma:** `ProvaCognitivaScreen.tsx:66-96`, com todo rótulo num `COPY` `as const`:
```ts
const COPY = {
  heading: 'Prova de raciocínio lógico',
  intro: 'Esta etapa avalia raciocínio lógico. ...',
  ...
  etapaAdvanced: 'Sua etapa avançou. Esta prova foi encerrada e suas respostas já estão salvas.',
  ...
  backToPanel: 'Voltar ao painel',
} as const
```
e o destino numa função só (linha 107, `const backToPanel = () => navigate('/candidato/dashboard')`).

**As telas do container escrevem o rótulo literal no JSX** (por exemplo `RedacaoEditorScreen.tsx:189` destino, e 249-250, 286-287, 306-307, 319-320 o rótulo). Ao trocar o rótulo, mova-o para um `COPY` local no molde acima. Assim o guarda de rótulos (abaixo) lê uma constante.

**Convenção (D-25, D-37):**
| Tela | Rótulo | Destino |
|---|---|---|
| Redação, SJT MC, caso prático, Big Five, devolutiva, **ProvaCognitivaScreen** (dentro do container) | «Voltar às avaliações» | `/candidato/avaliacao/:id` |
| `AvaliacaoRavenScreen` (`COPY.voltar`, linha 46), `WrongEtapaState` | «Ir ao painel» | `/candidato/dashboard` |
| Estado «Sua etapa avançou» de toda prova | «Ir ao painel» | `/candidato/dashboard` (direto, sem passar pelo bloqueio, C-11) |

**Nomes (D-15):** `ProvaCognitivaScreen` `heading`/`intro` → «Prova cognitiva». O E2E `e2e/prova-cognitiva.spec.ts:62,74` fixa o heading. `AvaliacaoRavenScreen` `COPY.titulo` (linha 36) → «Raciocínio lógico (Matrizes)». Não troque as chaves técnicas (`cognitivo_*`, `avaliacao_cognitiva_liberada`, `tipo='cognitivo'`).

---

#### `src/__tests__/guards/rotulos-instrumentos.grep.test.ts` (NOVO, guarda por forma)

**Análogo:** `src/__tests__/guards/forbidden-strings.grep.test.ts`.

**Esqueleto a copiar** (linhas 48-58 e 81-95). É uma **varredura recursiva** de raízes, não uma lista de arquivos:
```ts
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
const ROOT = resolve(__dirname, '../../..')
const SCAN_ROOTS = ['src', 'supabase/functions', 'supabase/migrations'] as const

function collectFiles(pathRel: string): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return /\.(ts|tsx|sql)$/.test(full) ? [full] : []
  if (!st.isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(full)) {
    if (entry === '__tests__' || entry === 'node_modules') continue
    out.push(...collectFiles(join(pathRel, entry)))
  }
  return out
}
```
Copie também os sub-testes de sanidade: a regex casa os termos-alvo, não casa os aprovados e a varredura alcança ≥ 1 arquivo (linhas 118-136).

**⚠ NÃO copie a forma do `wait-state-copy.grep.test.ts`** (`WAIT_STATE_FILES`, lista literal de 6 arquivos). É a forma «iteração sobre lista literal» que o CLAUDE.md §Portões cataloga como **cega para objeto novo**. Para o D-15/D-25 a pergunta é «existe em algum lugar», e isso pede varredura.

---

#### `src/features/entrevista/components/EntrevistaScorecardInline.tsx` (form, request-response) — D-22

**Análogo:** o próprio arquivo. O bloqueio de Salvar com frase na tela **já existe** para outro motivo (`semAnalise`). Repita a forma.

**Texto em constante exportada** (linhas 38-42). A mensagem nova entra aqui:
```ts
export const SCORECARD_COPY = {
  registradaSobre: 'Esta avaliação será registrada sobre a análise da',
  escolherLegenda: 'Qual análise você está avaliando?',
  semVigente: 'Nenhuma análise vigente: analise a transcrição antes de registrar a avaliação.',
} as const
```

**Bloqueio + frase** (linhas 86 e 213-221):
```tsx
const semAnalise = !analiseId
...
{semAnalise ? (
  <p className="text-sm text-white/75">{SCORECARD_COPY.semVigente}</p>
) : null}
<Button type="button" disabled={saving || semAnalise} onClick={handleSalvar} ...>
  Salvar avaliação
</Button>
```
O espelho do servidor é `notas.trim().length === 0` (o `btrim` do servidor remove só espaços, e o `trim()` do JS remove todo espaço em branco, então o cliente fica igual ou mais estrito: RESEARCH §D-22). Mude também o rótulo `Notas do gestor (opcional)` (linha 200), o placeholder (linha 205), o comentário `{/* Optional gestor notes. */}` (linha 197) e o cabeçalho `+ optional gestor notes` (linha 4).

**Serviço sem mudança obrigatória:** `entrevistaService.ts:~752` (`p_notas: args.notas ?? ''`). A recusa do servidor já mapeia 23514 → `INVALID_INPUT`.

**Teste:** `EntrevistaScorecardInline.test.tsx:77` espera `onSalvar` com `notas: ''` e Salvar habilitado, e o cabeçalho (`:14`) diz «As notas do gestor seguem opcionais aqui». Os dois invertem.

---

#### `docs/compliance/pii-inventory.yaml` + `docs/compliance/sql/gen-recibo-exclusao.cjs` (JORN-49, D-23 + D-34)

**Análogo:** os próprios arquivos e o precedente 48-17/49-21 (o gerador é a fonte, as saídas são artefato).

**Linha a reclassificar** (`pii-inventory.yaml:103`):
```yaml
estado:             { classificacao: anonimizar, tipo: char,    nota: "NOT NULL. Granularidade UF é útil ao bias snapshot" }
```
→ `preservar_com_ressalva`, com nota que cita a preservação pelo motor (P45 (5)). Acrescente `faixa_etaria_materializada` (`preservar_com_ressalva`) na mesma tabela `candidatos`.

**Item a editar** (`gen-recibo-exclusao.cjs:259-299`). Tire `'estado'` de `origens` e troque «endereço» no texto:
```js
item_id: 'dados_de_cadastro',
rotulo: 'Os seus dados de cadastro',
texto_futuro:
  'Nome, e-mail, telefone, CPF, data de nascimento, endereço, redes sociais e disponibilidade vão ser apagados do seu cadastro.',
texto_passado:
  'Nome, e-mail, telefone, CPF, data de nascimento, endereço, redes sociais e disponibilidade foram apagados do seu cadastro.',
aplicavel_quando: 'sempre',
passo_motor: 'tombstone_candidato',
origens: flat(q('candidatos', ['nome_completo', 'email', 'data_nascimento', 'genero', 'cidade', 'estado', ...
```

**Item novo em `ITENS_MANTEM`**: copie a forma de `historico_das_etapas` / `numeros_agregados` (linhas 551-570):
```js
{
  item_id: 'numeros_agregados',
  rotulo: 'Números agregados usados no relatório de não-discriminação',
  texto_futuro: 'Entram só em contagens, junto com outras pessoas. Ninguém consegue chegar a você a partir deles.',
  texto_passado: 'Entraram só em contagens, junto com outras pessoas. Ninguém consegue chegar a você a partir deles.',
  aplicavel_quando: 'sempre',
  base_legal: 'LGPD, Art. 7º, VI — grupos com menos de 5 pessoas são suprimidos do relatório',
  origens: flat(q('candidatos', ['como_conheceu']), q('entrevista_analises', ['bias_flags'])),
},
```
Com `base_legal: 'LGPD, Art. 16, IV'` (D-34) e `origens: q('candidatos', ['estado', 'faixa_etaria_materializada'])`. `base_legal` está em `CAMPOS_DE_TEXTO_DE_TITULAR` (linha 177), então o gerador exige que não seja vazia. As regras DIREÇÃO/COBERTURA (linhas 31-37) reprovam se o YAML e o gerador divergirem.

**Sequência (C-10):** YAML → gerador → `node docs/compliance/sql/gen-recibo-exclusao.cjs` → `node docs/compliance/sql/gen-pii-md.cjs` → `npm run check:recibo-exclusao && npm run check:pii-inventory-md` → `node efdeploy.cjs executar-direito-titular --dry-run` → deploy. Testes: `genReciboExclusao.test.ts:192-218`, `ReciboExclusao.test.tsx:66,120`.

---

#### `supabase/functions/_shared/email-templates.ts` (EF, transform) — D-09 e D-31

**Análogo:** o próprio arquivo.

**D-09: parágrafo novo, `COPY_REJEICAO` intocada.** `corpoDecisao` (linhas 248-259):
```ts
function corpoDecisao(d: DadosEmail): string {
  const aprovado = d.desfecho === "aprovado";
  const copy = aprovado ? COPY_APROVACAO : COPY_REJEICAO;
  return `${saudacao(d)}
<p style="margin:0 0 16px;">Referente à sua candidatura para a vaga <strong>${
    escapeHtml(d.tituloVaga)
  }</strong>:</p>
<p style="margin:0 0 16px;">${escapeHtml(copy)}</p>
<p style="margin:0;">Atenciosamente,<br>Equipe Beauty Smile</p>`;
}
```
O parágrafo do direito de revisão vai **só** quando `!aprovado`, numa constante própria no molde de `COPY_REVISAO_MANTIDA` (linha 297), e o link vem pronto da EF. A forma do bloco de link é `blocoAcessoPainel(url)` (linhas 190-196: `escapeHtml(url.trim())`, botão + «Se o botão não funcionar»). **O texto novo não pode conter** `/score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i` (o grep-guard roda sobre o HTML da decisão, `email-templates.test.ts:75-81`).

**D-31: nomear o Raven.** `corpoCognitivoLiberado` (linhas 321-336), o assunto (linha 355) e o preheader (linha 405). O docblock da linha 325 («NÃO nomeia o instrumento») é reescrito, e «avaliação cognitiva» vira «Raciocínio lógico (Matrizes)». A chave `avaliacao_cognitiva_liberada` **fica** (é vocabulário de dedupe; 3 linhas em `notificacoes_enviadas`).

**Teste (deno), mesma forma das linhas 83-118:**
```ts
Deno.test("COMM-05 — decisão usa a cópia neutra congelada literal", () => {
  const { html } = renderarEmail("decisao_final", DADOS);
  assert(html.includes(COPY_REJEICAO), "deveria conter a COPY_REJEICAO congelada");
});
```
Acrescente: o link aparece em `rejeitado` e não aparece em `aprovado`, e o grep-guard continua verde com o parágrafo novo.

**Deploy:** `node efdeploy.cjs notificar-candidato` (`--dry-run` antes). `notificar-rh/helpers.ts` também importa este arquivo, então redeploy dele só se usar algo alterado. ⚠ Antes do deploy, meça `notificacoes_enviadas` com `status='falhou' AND evento='decisao'` (A5): o `notif-retry-sweep` renderizaria o template novo para uma rejeição antiga.

---

### ONDA B

#### `supabase/tests/p51_revisao_rejeicao_smoke.sql` (NOVO; escrito ANTES da migration, deliberadamente RED)

**Análogo de estrutura:** `supabase/tests/p49_44_resposta_caso_aberto_smoke.sql`. **Análogo do contrato RED:** `p42_revisao_art20_smoke.sql:23-29`:
```sql
-- Ele foi escrito **ANTES** da migration do Plano 42-06, deliberadamente RED: as
-- colunas novas, os dois RPCs e a tabela de configuração ainda NÃO existem. Ele
-- descreve o comportamento que a migration tem de produzir.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se a
-- implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o
-- smoke para caber no que foi implementado é ESCALAR o problema, não resolvê-lo —
```

**Cabeçalho em seções**, na ordem do p49_44: O QUE ELE VIGIA → FIXTURES («NÃO SÃO CANDIDATURAS REAIS», titular sintético `@invalido.local`) → «⚠ ESTE SMOKE ESCREVE» (subtransação com SQLSTATE próprio) → CLÁUSULAS (a)…(z) → O PORTÃO MORDE (tabela de mutações M1..Mn: inversão → letra → rótulo) → Varredura D-56 por forma (população + achados) → COMO RODAR → GATE VERDE = `pass = esperado` (escopo deliberado, não fotografia).

**Atores lidos na execução, nunca constantes** (linhas 162-220). Ausência de ator REPROVA:
```sql
SELECT u.user_id INTO v_ativo
  FROM public.usuarios_rh u
 WHERE u.user_id IS NOT NULL AND u.ativo AND u.deleted_at IS NULL
   AND u.user_id IS DISTINCT FROM v_autor
 ORDER BY (u.role = 'recrutador') DESC, u.created_at, u.user_id
 LIMIT 1;
...
IF v_ativo IS NULL OR v_velho IS NULL THEN
  RAISE EXCEPTION 'P49C FAIL (baseline): falta ator do par ... — ausencia de ator REPROVA, nunca pula', ...;
END IF;
...
PERFORM set_config('smoke4944.n_cand',  (SELECT count(*) FROM public.candidaturas)::text, false);
PERFORM set_config('smoke4944.n_hist',  (SELECT count(*) FROM public.historico_candidatura)::text, false);
PERFORM set_config('smoke4944.n_netq',  (SELECT count(*) FROM net.http_request_queue)::text, false);
```

**Fixture sintética** (linhas 296-316). Para o JORN-42, as candidaturas nascem `rejeitado` e uma delas passa pelo `submit_candidatura_atomic` real (knockout), ou é montada com `motivo_rejeicao='knockout_automatico'` + `opcao_knockout_id` + histórico `inscricao → inscricao`:
```sql
v_user  := gen_random_uuid();
v_email := 'p4944smoke-' || replace(v_user::text, '-', '') || '@invalido.local';
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                        created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        v_email, '', now(), now(),
        '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
INSERT INTO public.candidatos (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
VALUES (v_user, 'SMOKE P49C Titular ' || i, v_email, ..., DATE '1992-03-10', 'Santos', 'SP', 'site')
RETURNING id INTO v_cand;
```

**Cada chamada no seu próprio bloco, com o resultado guardado** (linhas 554-558):
```sql
SET LOCAL ROLE authenticated;
PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
          'app_metadata', json_build_object('role', 'rh'))::text, true);
BEGIN
  v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_f]);  h_sit := v_ret ->> 'situacao';  h_state := 'ACEITO';
EXCEPTION WHEN OTHERS THEN h_state := SQLSTATE || ':' || SQLERRM;
END;
RESET ROLE;
```

**Envelope que reverte + julgamento FORA** (linhas 571-606):
```sql
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P49C1';
  EXCEPTION
    WHEN SQLSTATE 'P49C1' THEN
      NULL;  -- ROLLBACK da subtransação. Os valores medidos estão nas variáveis acima.
    WHEN OTHERS THEN
      v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  ...
  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION 'P49C FAIL (parte 1): a subtransacao abortou por erro INESPERADO (%) — ...', v_err;
  END IF;
```
Use um SQLSTATE próprio (por exemplo `P51R1`) e um prefixo de GUC próprio (`smoke51r.*`).

**ACL sem depender da guarda** (linhas 595-598): `has_function_privilege('anon', to_regprocedure('public.<rpc>(uuid)'), 'EXECUTE')`. Sob `SET LOCAL ROLE anon`, esperar `42501 … permission denied for function` (o ACL), e **não** `forbidden` (a guarda).

**Gate + resultado** (linhas 770-790):
```sql
DO $gate$
BEGIN
  IF current_setting('smoke4944.pass')::int <> 9 THEN
    RAISE EXCEPTION 'P49C FAIL (gate): pass = % de 9 — alguma clausula nao incrementou o contador', ...;
  END IF;
END
$gate$;
SELECT json_build_object('smoke', 'p49_44_resposta_caso_aberto', 'pass', ..., 'esperado', 9, ...) AS resultado;
```

**Cláusulas que o 51-RESEARCH §Validação exige** (cada uma com mutação na tabela do cabeçalho):
- pedido aceito nas 3 origens; um por `historico_rejeicao_id` (D-06); só `status='rejeitado'` (D-07); titular alheio → 42501;
- REVISAO-05 por `rejeitado_por` (NULL no knockout = qualquer RH ativo); token velho de recrutador inativo → 42501;
- procedente reabre em `etapa_rejeitada` ou `triagem` (knockout, D-30), com **+1 linha** em `historico_candidatura`, `em_analise`, prazo SP+10, `feedback_rejeicao = NULL`;
- D-03 por forma: `select proname from pg_proc where prosrc ~ $$motivo_rejeicao\s*=\s*'knockout_automatico'$$` = `{submit_candidatura_atomic}`;
- fila com origem e id, admin = RH ativo (md5 com desempate), `contar` inclui as origens novas;
- `anon` e candidato alheio não alcançam a tabela nova nem a RPC (`SET LOCAL ROLE`), views incluídas;
- (z) nada da fixture sobrevive; contagens globais = baseline da execução.

**Como rodar:** smokes que escrevem passam **só** pelo envelope que aborta (`node scripts/p50_ensaio.cjs …` ou o equivalente `p51`). `node p46apply.cjs run` COMMITA o que não estiver em subtransação revertida (p49_44, linhas 141-146).

---

#### `supabase/migrations/2026100X000001_p51_raven_em_avaliacao_status.sql` (RPC reescrita, request-response) — C-4 / D-38

**Análogo do corpo:** `supabase/migrations/20260712100003_funil12_get_avaliacao_status.sql`. **Análogo de portões:** `20261005000003_p50_rpcs_leitura_filas.sql`.

**Guarda de titular + só booleanos** (funil12, corpo):
```sql
SELECT EXISTS (
  SELECT 1 FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.id = p_candidatura_id
     AND ca.user_id = auth.uid()
) INTO v_owns;
IF NOT v_owns THEN
  RAISE EXCEPTION 'forbidden' USING errcode = '42501';
END IF;

SELECT jsonb_build_object(
  ...
  'cognitivo', jsonb_build_object(
    'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                          WHERE candidatura_id = p_candidatura_id
                            AND tipo = 'cognitivo'))
) INTO r;
RETURN r;   -- NEUTRAL — presence booleans only (RNF-07a).
```
A chave nova vai **irmã** de `cognitivo`: `'raven', jsonb_build_object('liberado', EXISTS(... cognitivo_liberacao ... revogado_em IS NULL), 'registrado', EXISTS(SELECT 1 FROM public.scores_raven WHERE candidatura_id = p_candidatura_id))`. Nunca `percentil`/`classificacao` (RNF-07a). **A RLS de `scores_raven` não muda** (D-38).

**ACL** (funil12, fim): `REVOKE ALL … FROM PUBLIC; GRANT EXECUTE … TO authenticated;`. Acrescente `REVOKE … FROM anon` **nominalmente**: o `pg_default_acl` de `public` concede EXECUTE a `anon` como grant direto (p44, linha 319).

**Cabeçalho da migration** (molde P50-04, linhas 1-98): «O QUE ESTAVA ERRADO» → «O QUE MUDA (e só isso)» → «MEDIDO EM PROD» (tabela de md5) → «LOCK» → «IDEMPOTÊNCIA» → «EVIDÊNCIA» → «Sem wrapper `BEGIN; ... COMMIT;`» → `-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/<arquivo>.sql`. Depois do cabeçalho:
```sql
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';
```

**PRE-PORTÃO com md5 + captura de propriedades/ACL** (P50-04, linhas 110-200). Para uma só função, a forma enxuta da P48-11 (linhas 76-92) basta:
```sql
DO $pre_p48_11a$
DECLARE v_resp text;
BEGIN
  SELECT md5(p.prosrc) INTO v_resp FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.responder_revisao_decisao(uuid,text,text)'::regprocedure;
  IF v_resp IS DISTINCT FROM 'c7fef6254a09b33cbcdbb70966f526cf' THEN
    RAISE EXCEPTION 'P48-11 PRE-PORTAO: responder_revisao_decisao vivo md5 = %, medido = ... — o CREATE OR REPLACE abaixo APAGARIA a divergencia em silencio; reler o vivo e refazer esta migration', v_resp;
  END IF;
END
$pre_p48_11a$;
```

**PÓS-PORTÃO: presença no CÓDIGO, ausência no corpo inteiro** (P50-04, linhas 746-777):
```sql
v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');
IF position('is_active_rh_user' IN v_cod) = 0 THEN RAISE EXCEPTION ...; END IF;
...
IF has_function_privilege('anon', '<sig>'::regprocedure, 'EXECUTE') THEN
  RAISE EXCEPTION 'P50-04 POS-PORTAO: anon tem EXECUTE em % (D-04)', v_sig;
END IF;
```
Aqui: a chave `raven` presente; nenhum `percentil`/`classificacao` no corpo; ACL sem `anon`.

---

#### `src/features/avaliacao/services/avaliacaoService.ts` + `RavenCandidatoCard.tsx` (NOVO) + `DashboardCandidatoPage.tsx` (D-13)

**Serviço:** o próprio arquivo, linhas 235-290. Acrescente `raven` ao `AvaliacaoStatus` e ao coercer (`card(key)`), mantendo «toda folha vira booleano estrito; chave ausente → false»:
```ts
export interface AvaliacaoStatus {
  sjt_mc: AvaliacaoStatusCard
  ...
  cognitivo: AvaliacaoStatusCard
}
...
const raw = (data as Record<string, { registrado?: unknown; iniciado?: unknown }> | null) ?? {}
```
O cast estreito do `rpc` (linhas 262-270) **sai** depois do `db:types` (D-53: `tsc` ≤ 89 na prática; RESEARCH armadilha 7).

**Card:** análogo `src/features/agendamento/components/AgendamentoCandidatoCard.tsx`. É um componente que **é dono do próprio hook** por `candidaturaId` (linhas 87-88) e decide sozinho entre renderizar e `null`:
```tsx
export function AgendamentoCandidatoCard({ candidaturaId }: AgendamentoCandidatoCardProps) {
  const { data: agendamento, isLoading, isError, refetch } = useMeuAgendamento(candidaturaId)
```
Visível só com `raven.liberado && !raven.registrado` **e** candidatura não encerrada (`2ce20fbf` é `finalizado/aprovado` com liberação vigente: RESEARCH armadilha 6). Rota `/candidato/raven/:id` (ou a que `routes.tsx:322` define). O rótulo é «Raciocínio lógico (Matrizes)».

**Inserção no painel** (`DashboardCandidatoPage.tsx:450-484`). Ao lado do bloco «Próximo passo», com o `stopPropagation` obrigatório, porque o `GlassCard` (linha 354) navega para a vaga:
```tsx
{candidaturaEncerrada(candidatura.etapa_atual, candidatura.status) ? null : ehEntrevista ? (
  <AgendamentoCandidatoCard candidaturaId={candidatura.id} />
) : ( ... )}
...
<button type="button" onClick={(e) => { e.stopPropagation(); navigate(stepCTA.destino as string); }} ...>
```
O padrão de «componente que encapsula o próprio `stopPropagation`» é o `RetirarCandidaturaAcao` (comentário nas linhas 486-493).

---

#### `supabase/migrations/2026100X000002_p51_revisao_rejeicao_tabela_e_rpcs.sql` (tabela + RPCs DEFINER + triggers)

Composição de três análogos.

**(1) Tabela nova, RLS, comentário por coluna.** Análogo: `20260804000002_p44_solicitacoes_dados.sql:90-131, 179`:
```sql
CREATE TABLE public.solicitacoes_dados (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id  uuid        NOT NULL,
  ...
  CONSTRAINT fk_solicitacoes_dados_candidato
    FOREIGN KEY (candidato_id) REFERENCES public.candidatos(id),
  CONSTRAINT ck_solicitacoes_dados_situacao
    CHECK (situacao IN ('atendido', 'pendente')),
  ...
);
COMMENT ON TABLE public.solicitacoes_dados IS '...';
COMMENT ON CONSTRAINT fk_solicitacoes_dados_candidato ON public.solicitacoes_dados IS
  '⚠ SEM clausula ON DELETE, deliberadamente (= NO ACTION). ...';
...
ALTER TABLE public.solicitacoes_dados ENABLE ROW LEVEL SECURITY;
```
**Diferença deliberada:** a tabela nova fica **sem policy nenhuma** (acesso só por RPC DEFINER, RESEARCH §JORN-42 forma (b)). Escreva isso no `COMMENT ON TABLE`, no molde do «⚠ ZERO POLICY DE ESCRITA … E A RAZAO NAO E OBVIA» (p44, linhas 193-198). Colunas: `historico_rejeicao_id` **UNIQUE** (D-06), `origem` com CHECK (`humana_triagem|automatica`), `rejeitado_por uuid NULL`, e o CHECK de coerência copiado de `decisao_final_reabertura_prazo_coerente_check` (P48-11, linhas 102-104):
```sql
ALTER TABLE public.decisao_final
  ADD CONSTRAINT decisao_final_reabertura_prazo_coerente_check
  CHECK ((reaberta_em IS NULL) = (prazo_nova_decisao_em IS NULL));
```

**(2) RPC de resposta que reabre.** Análogo: `responder_revisao_decisao` em `20260921000011_p48_reabertura_colunas_e_resposta.sql:200-325`. A ordem dos guards é contrato: papel com `coalesce` → `sub` obrigatório → existe pedido → REVISAO-05 → já respondida (22023) → veredito fechado → justificativa ≥ 50 → (revertida) candidatura `FOR UPDATE` → escrita:
```sql
IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING errcode = '42501';
END IF;
IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
...
IF v_uid = v_row.por_usuario THEN
  RAISE EXCEPTION 'quem registrou a decisao nao pode responder a revisao dela (decisor)'
    USING errcode = '42501';
END IF;
...
v_data_limite := (pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date + 10;
v_prazo       := ((v_data_limite + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo');
```
REVISAO-05 aqui é `v_row.rejeitado_por IS NOT NULL AND v_uid = v_row.rejeitado_por`, e com NULL (knockout) qualquer RH ativo responde (D-10). Acrescente a linha do helper vivo, idioma P50 (`20261005000004:487-491`):
```sql
IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;
```
**A mensagem de 42501 precisa conter «decisor»**: `classificarErroRevisao` (`revisaoService.ts:96-104`) separa o guard por `/decisor/i.test(message)`.

**Reabertura sob a sanção, com reset da GUC.** O idioma vivo é o de `registrar_decisao` (`20261005000004:424-443`) e o do RESEARCH §«Exemplos de código»:
```sql
PERFORM set_config('app.transicao_sancionada', 'reabertura', true);
UPDATE public.candidaturas
   SET etapa_atual = v_etapa_destino,           -- etapa_rejeitada, ou 'triagem' no knockout (D-30)
       status = 'em_analise',
       etapa_justificativa = format('Candidatura reaberta após revisão (Art. 20) — aguardando nova decisão até %s.',
                                    to_char(v_data_limite, 'DD/MM/YYYY')),
       feedback_rejeicao = NULL,
       data_decisao_final = NULL
 WHERE id = p_candidatura_id;
GET DIAGNOSTICS v_n = ROW_COUNT;               -- ANTES de qualquer PERFORM
PERFORM set_config('app.transicao_sancionada', '', true);
IF v_n <> 1 THEN RAISE EXCEPTION 'reabertura nao moveu a candidatura (% linhas)', v_n; END IF;
```
A transição `X → triagem` saindo de `inscricao/rejeitado` passa pelo `avancar_etapa` e grava o histórico (D-30). Confira no smoke que a contagem de `historico_candidatura` sobe 1 (RESEARCH armadilha 1).

**D-36: disparar a análise na procedente de knockout.** Análogo: `reprocessar_analise` (`20261005000004:612-670`). Vault com graceful-skip e `net.http_post` para `analise-candidato-individual` com `{candidatura_id, vaga_id}`:
```sql
SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
SELECT decrypted_secret INTO v_invoke_key  FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
IF v_project_url IS NULL OR v_invoke_key IS NULL THEN RETURN; END IF;
PERFORM net.http_post(
  url := v_project_url || '/functions/v1/analise-candidato-individual',
  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_invoke_key),
  body := jsonb_build_object('candidatura_id', p_candidatura_id, 'vaga_id', v_vaga_id));
```
Nesta RPC o despacho vai num `BEGIN … EXCEPTION WHEN OTHERS THEN RAISE WARNING … END`, porque a reabertura não pode cair por falha de rede.

**RPC de pedido (titular):** guarda de titular no molde de `get_avaliacao_status` (`ca.user_id = auth.uid()`, falha fechada), elegibilidade pela mesma regra de `explicacao_rejeicao_origem` (RESEARCH tabela, md5 `29f63b16…`), e `P0002` quando não há o que pedir. O cliente já mapeia `P0002`/`no_data_found` → `'unavailable'` (`explicacaoService.ts:491`).

**(3) Triggers de notificação.** Análogo: `20260921000007_p48_dedupe_revisao_por_ciclo.sql:86-135`. Guarda de transição, Vault com graceful-skip, despacho fail-open, `ciclo` = epoch do pedido, e REVOKE de PUBLIC **e** de anon:
```sql
CREATE OR REPLACE FUNCTION public.trg_notif_revisao_solicitada()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_project_url text; v_invoke_key text;
BEGIN
  IF NOT (OLD.revisao_solicitada_em IS NULL AND NEW.revisao_solicitada_em IS NOT NULL) THEN
    RETURN NEW;
  END IF;
  SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key  FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- segredos ausentes — dispatch adiado, pedido do titular intacto
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-rh',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_invoke_key),
      body := jsonb_build_object(
        'evento', 'revisao_solicitada',
        'candidatura_id', NEW.candidatura_id,
        'ciclo', extract(epoch from NEW.revisao_solicitada_em)::bigint::text));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_revisao_solicitada: dispatch falhou (%: %) — pedido intacto', SQLSTATE, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_solicitada() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_solicitada() FROM anon;
```
Na tabela nova o pedido é um INSERT, então o trigger de «solicitada» é `AFTER INSERT` e a guarda de transição vira «linha nova». O de «respondida» é `AFTER UPDATE OF respondida_em` com `OLD IS NULL AND NEW IS NOT NULL`. Para a EF ler a fonte certa (RESEARCH armadilha 2), o corpo leva a `origem` ou o id do pedido.

**Pós-portão de tabela** (P48-11, linhas 353-402): colunas presentes e nulidade por `information_schema.columns`, constraint por `pg_constraint.conname`, marcadores de corpo por `position(...)`, `has_function_privilege('anon', …)` = falso.

---

#### `supabase/migrations/2026100X000003_p51_fila_revisoes_tres_origens.sql` (RPCs de leitura reescritas)

**Análogo:** `20261005000003_p50_rpcs_leitura_filas.sql` (cabeçalho 1-98, pré-portão 110-200, corpos 299-393, `funil_kpis` 399-510, `COMMENT`s 681-684, pós-portão 696-885).

**Corpo vivo de hoje** (linhas 299-356). Ele vira `UNION ALL` de `decisao_final` + registro novo, com `origem` e id do pedido:
```sql
CREATE OR REPLACE FUNCTION public.listar_revisoes_decisao(p_incluir_respondidos boolean DEFAULT false)
 RETURNS TABLE(candidatura_id uuid, candidato_nome text, vaga_titulo text, decisao text, decidido_por_nome text, revisao_solicitada_em timestamp with time zone, revisao_respondida_em timestamp with time zone, revisao_veredito text, revisao_resultado text, respondida_por_nome text, pode_responder boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
  RETURN QUERY
  SELECT d.candidatura_id, ca.nome_completo::text, vg.titulo::text, d.decisao::text,
      (SELECT ur.nome_completo::text FROM public.usuarios_rh ur WHERE ur.user_id = d.por_usuario
        ORDER BY ur.deleted_at ASC NULLS FIRST LIMIT 1),
      ...
      (d.revisao_respondida_em IS NULL AND d.por_usuario IS DISTINCT FROM v_uid)
    FROM public.decisao_final d
    JOIN public.candidaturas c  ON c.id  = d.candidatura_id
    JOIN public.candidatos   ca ON ca.id = c.candidato_id
    JOIN public.vagas        vg ON vg.id = c.vaga_id
   WHERE d.revisao_solicitada_em IS NOT NULL
     AND (p_incluir_respondidos OR d.revisao_respondida_em IS NULL)
     AND (v_role = 'administrador' OR (v_role = 'rh' AND public.is_active_rh_user()))
   ORDER BY d.revisao_solicitada_em ASC
   LIMIT 200;
END;
$function$;
```
**Mudança de `RETURNS TABLE` ⇒ `DROP FUNCTION` + `CREATE` + re-GRANT/REVOKE** (o `CREATE OR REPLACE` não troca o tipo de retorno). O pós-portão do P50 compara as propriedades capturadas (`'result=' || pg_get_function_result(p.oid)`, linha 738) e reprovaria a troca. Neste arquivo, a propriedade `result` é a **única** que pode mudar, e só para `listar_revisoes_decisao`. Declare isso como escopo deliberado. O `ORDER BY` precisa de desempate pelo id do pedido (C-12). **Não projete** `justificativa` nem o uuid do revisor (p42 (d); `revisaoService.ts:141-150`). `pode_responder` no ramo novo: `respondida_em IS NULL AND rejeitado_por IS DISTINCT FROM v_uid`.

**Invariante dos dois predicados** (`COMMENT` de `contar_revisoes_pendentes`, linha 684): a contagem e a fila usam **o mesmo** predicado. O `contar` ganha o mesmo `UNION ALL`.

**`funil_kpis` (D-35):** o CTE `ko` (linhas 458-466) passa a contar só knockouts ainda rejeitados:
```sql
ko AS (
  SELECT count(*) FILTER (WHERE c.motivo_rejeicao = 'knockout_automatico') AS knockouts,
         count(*)                                                          AS total
    FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
   WHERE v_ve_tudo AND (p_vaga_id IS NULL OR v.id = p_vaga_id) AND c.deleted_at IS NULL
),
```
→ `FILTER (WHERE c.motivo_rejeicao = 'knockout_automatico' AND c.status = 'rejeitado')`. Preserve `v_ve_tudo` nos 4 CTEs, o `candidatura_encerrada(` e a ACL sem `anon` (linhas 508-510). O pós-portão do P50 assere essas três coisas (linhas 823-834).

**Prova de não-toque do motor** (P50, linhas 179-195 e 861-874): impressão digital `md5(to_jsonb(p)::text)` de `anonimizar_candidato`/`plano_exclusao_titular` antes e depois. **Nesta** migration ela vale. Na migration do motor (abaixo), não.

**Obsolescência:** `supabase/tests/p50_desfazer_expansao.sql` restauraria os corpos pré-P50 destas funções e **apagaria o JORN-42**. Ele é «GERADO, NÃO EDITAR À MÃO» (linha 2). Regenere com `scripts/p50_desfazer.cjs` ou registre a obsolescência no plano.

---

#### RPC de detalhe do knockout (D-11) — leitura RH

**Análogo:** `ler_resposta_caso_aberto_sjt` reescrita no P50-04: guarda fail-closed primeiro, **helper do RH antes da busca**, `P0002` para inexistente, depois a leitura. O pós-portão do P50 assere essa ordem (linhas 841-855):
```sql
IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
-- só então a busca: candidatura → opcao_knockout_id → pergunta_opcao_metadata.opcao_id → perguntas_formulario.texto_pergunta
--                                  + respostas_formulario.resposta_opcoes
```
O retorno é um `jsonb` com estado explícito para o titular anonimizado (o motor faz `DELETE FROM respostas_formulario`): `{situacao: 'disponivel'|'removida', pergunta, resposta, opcao_eliminatoria}`. A tela segue os estados de `RespostaCasoAbertoSjt.tsx:90-96`. `opcao_knockout_id` **nunca** vai ao candidato (D-15 da 48).

---

#### `supabase/migrations/2026100X000004_p51_motor_raspa_revisao_rejeicao.sql` (função destrutiva)

**Análogo:** `20260922000012_p49_motor_logs_e_revisao.sql`. Escopo negativo no topo (linhas 9-12), reversibilidade (21-26), pré-portão com md5 **e** `config_purga.modo = 'dry_run'` (141-181), passo novo, pós-portão por `position(...)` (1544-1547).

**Forma do raspar** (linhas 750-768). Use `CASE WHEN … IS NULL THEN NULL ELSE <sentinela> END`, nunca sentinela seca, para não inventar uma revisão que não houve. Conte antes da escrita:
```sql
SELECT count(*) INTO v_n_df_rev
  FROM public.decisao_final d
 WHERE d.revisao_resultado IS NOT NULL
   AND d.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

UPDATE public.decisao_final d
   SET ...,
       revisao_resultado = CASE WHEN d.revisao_resultado IS NULL THEN NULL
                                ELSE '[resposta do revisor preservada de forma desidentificada ...]' END
 WHERE d.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);
```
⚠ O 49-PATTERNS §K pede que o literal sentinela **não** seja citado em outros arquivos (os portões procuram expressões no disco). No plano, cite por âncora, não por cópia. As contagens entram no jsonb de retorno, no molde de `'revisao_resultado_corrente', v_n_df_rev` (linha 1018). O `p45_motor_exclusao_smoke.sql` ganha a asserção, e o recibo ganha a linha (D-57 passo 6).

---

#### `varrer_prazos_reabertura()` estendida (A3)

**Análogo:** `20260921000015_p48_prazo_reabertura_alerta.sql:325-386`. Varredura com `FOR UPDATE OF d SKIP LOCKED`, `LIMIT 50`, despacho `prazo_reabertura_vencido` com `ciclo` = epoch do prazo, marcação de idempotência depois do despacho e `REVOKE … FROM PUBLIC, anon, authenticated`. O laço sobre o registro novo é irmão do de `decisao_final`. O pós-portão da P48 assere `alerta_prazo_enviado_em IS NULL` no corpo (linha 478).

---

#### `scripts/p51_mutacoes.cjs` (NOVO, runner de mutação)

**Análogo:** `scripts/p50_mutacoes.cjs` + `scripts/p50_ensaio.cjs`.

**Contrato do runner** (`p50_mutacoes.cjs:12-25`): CONTROLE = prefixo + migrations faltantes + smoke + sentinela ⇒ verde. Mn = idem + MUTAÇÃO depois da migration ⇒ reprova na **letra declarada** e não chega ao sentinela.

**Mutação extraída da migration por âncora única** (linhas 113-127), nunca transcrita:
```js
function extrair(texto, inicio, fim, rotulo) {
  const n = texto.split(inicio).length - 1;
  if (n !== 1) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} (inicio «${inicio}» ocorre ${n} vez(es))`);
  ...
}
function trocar(trecho, ancora, novo, rotulo) {
  const n = trecho.split(ancora).length - 1;
  if (n !== 1) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} («${ancora}» ocorre ${n} vez(es) no trecho)`);
  return trecho.replace(ancora, novo);
}
const fn = (mig, nome) => extrair(mig, `CREATE OR REPLACE FUNCTION public.${nome}(`, '$function$;', nome);
```
**Entrada de mutação** (linhas 159-166):
```js
{ id: 'M1', desc: 'helper sempre verdadeiro (mesmo ACL: CREATE OR REPLACE preserva)', letra: 'b',
  requer: ['20261005000001'], sql: trocar(trocar(fnHelper, 'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', 'M1'), 'RETURN coalesce(ok, false);', 'RETURN true;', 'M1') },
```
**Corpo de objeto que a fase não reescreve vem do VIVO**, só leitura (linhas 149-157, `responderVivo()` com `set transaction read only; select pg_get_functiondef(...)`).
**Persistência por baseline capturada na execução** (`E.capturar()` / `E.diferencas()`, linhas 82-110), com leitura em **toda** saída. Os 40001 são separados por `E.classificarSaida()` (linhas 49-59).

Mutações mínimas pedidas pelo RESEARCH: REVISAO-05 desligada (`IF false`, idioma M19 do p50), helper fora, `GRANT EXECUTE … TO anon`, reabertura sem `etapa_atual` (sem histórico), UNIQUE de `historico_rejeicao_id` removida, `pode_responder` sem `rejeitado_por`.

---

#### `supabase/tests/p50_acesso_recrutador_smoke.sql` (k) — edição de portão (D-56)

**Linhas 1852-1857.** O `ORDER BY t.candidatura_id` empata quando uma candidatura tem duas linhas (C-12):
```sql
WHEN 'listar_revisoes_decisao_true' THEN
  SELECT 'n:' || count(*) || ':' || md5(coalesce(jsonb_agg(to_jsonb(t) - 'pode_responder' ORDER BY t.candidatura_id)::text, '[]'))
    INTO v_tok FROM public.listar_revisoes_decisao(true) t;
```
→ desempate pelo id do pedido. Antes de mudar, varra pela forma (CLAUDE.md §Portões, comando literal lá). Depois de mudar, **prove que (k) ainda morde** (mutação que diferencie admin × RH ativo).

---

#### `supabase/functions/notificar-candidato/index.ts` (EF, event-driven)

**Análogo:** o próprio arquivo, linhas 408-421. A leitura do veredito é guardada por evento, com allowlist mínima de colunas:
```ts
let vereditoRevisao: "mantida" | "revertida" | undefined;
let prazoNovaDecisaoFmt: string | undefined;
if (evento === "revisao_respondida") {
  const { data: decisao } = await supabaseAdmin
    .from("decisao_final")
    .select("revisao_veredito, prazo_nova_decisao_em")
    .eq("candidatura_id", candidatura_id)
    .maybeSingle();
  const v = decisao?.revisao_veredito;
  vereditoRevisao = v === "mantida" || v === "revertida" ? v : undefined;
  if (vereditoRevisao === "revertida") {
    prazoNovaDecisaoFmt = formatarDataLimiteReabertura(decisao?.prazo_nova_decisao_em);
  }
}
```
Ramifique pela `origem` (ou pelo id do pedido) do corpo: o registro novo é lido com as **mesmas duas colunas** equivalentes. Sem `origem`, o comportamento de hoje fica byte-idêntico.

**D-09, link da explicação** (linha 544). Hoje é `urlLogin: montarUrlLogin(deps.appBaseUrl)`. O link novo usa a forma com `redirect` (`_shared/email-config.ts:76`, guardas de open-redirect):
```ts
const urlExplicacao = montarUrlLogin(deps.appBaseUrl, `/candidato/explicacao/${candidatura_id}`)
```
Só no `desfecho === 'rejeitado'` (linhas 535-537 decidem o desfecho pela transição). A chave de dedupe (`montarDedupeKey`, linhas 427-440, `eventoPorCiclo`) não muda se o corpo do trigger novo levar o `ciclo`.

---

#### `src/features/explicacao/services/explicacaoService.ts` + `ExplicacaoCandidatoPage.tsx` + `SolicitarRevisaoCTA.tsx`

**Análogo:** os próprios arquivos.

**Comentário a reescrever junto com o código** (decisão do operador, CONTEXT): o docblock de `origem` (linhas 140-156) diz «Único caminho COM pedido de revisão» e «oferecer o CTA fora do caminho `'humana'` seria um botão que o servidor sempre recusa». O de `REASON_KNOCKOUT` (linhas 247-249) diz «E ela NÃO promete revisão». O de `REASON_HUMANA_TRIAGEM` (linha 259) diz «sem pedido de revisão».

**Ponto de troca** (linhas 400-413). Hoje o ciclo é zerado de propósito:
```ts
return {
  origem, decisao: 'rejeitado', reason,
  // Nenhum dos dois caminhos cria linha em `decisao_final`, então NENHUM estado do
  // ciclo de revisão existe — e não existir é o ponto, não uma lacuna a preencher.
  revisao_solicitada_em: null, revisao_resultado: null, explicacao_solicitada_em: null,
  revisao_veredito: null, revisao_respondida_em: null, reaberta_em: null, prazo_nova_decisao_em: null,
}
```
→ preencher a partir de `estado_revisao_rejeicao(id)` (RPC do titular, jsonb com allowlist; nunca a justificativa interna nem o uuid do revisor, linhas 86-96). ⚠ **Armadilha 3 do RESEARCH:** depois de revertida, `status ≠ 'rejeitado'` e `explicacao_rejeicao_origem` devolve NULL. A leitura parte do **registro do pedido**, não do status. E `reaberta` (`ExplicacaoCandidatoPage.tsx:222-224`) hoje só vale para `origem === 'humana'`.

**Escrita** (linhas 473-504): o molde de `solicitarRevisao` (42501 → `'denied'`, P0002 → `'unavailable'`, resto → `ExplicacaoServiceError` `NETWORK_ERROR`) vale para a RPC nova. O CTA recebe a origem para chamar a RPC certa. A origem **vem do servidor**, nunca é derivada no cliente (linhas 361-365; anti-padrão do RESEARCH).

**Página** (linhas 296-326): hoje `semRevisaoBody` desvia `automatica`/`humana_triagem` para o canal de privacidade em vez do CTA. As três origens passam a cair no ramo do `SolicitarRevisaoCTA`, e os textos de **quem decidiu** ficam distintos (`resultLine*`, linhas 225-230). Testes: `ExplicacaoCandidatoPage.test.tsx:400-506` asserem a ausência do CTA e são reespecificados (D-56). **Nenhuma ocorrência literal nova do canal de privacidade** (D-58 da 49): o `CANAL_PRIVACIDADE_EMAIL` existente fica onde está.

---

#### `src/features/revisao/services/revisaoService.ts` + `OrigemRevisaoBadge.tsx` (NOVO) + `FilaRevisoesTable.tsx` + `ResponderRevisaoDialog.tsx`

**Allowlist do cliente** (linhas 152-164). As chaves novas (`origem`, id do pedido) entram **aqui** e no `FilaRevisaoRow` (201-215), e a projeção na fronteira (231-237) descarta o resto:
```ts
export const FILA_REVISAO_COLUNAS = [
  'candidatura_id', 'candidato_nome', 'vaga_titulo', 'decisao', 'decidido_por_nome',
  'revisao_solicitada_em', 'revisao_respondida_em', 'revisao_veredito', 'revisao_resultado',
  'respondida_por_nome', 'pode_responder',
] as const
...
function projetarLinhaFila(linha: Record<string, unknown>): FilaRevisaoRow {
  const projetada: Record<string, unknown> = {}
  for (const coluna of FILA_REVISAO_COLUNAS) {
    projetada[coluna] = coluna in linha ? linha[coluna] : null
  }
  return projetada as unknown as FilaRevisaoRow
}
```
`responderRevisao` (linhas 321-328) ganha a variante para o pedido novo, com a mesma ausência deliberada de decisão de autorização no cliente.

**Selo de origem (D-12, D-33):** análogo `VereditoBadge.tsx`. É um vocabulário fechado, e valor desconhecido não é ecoado:
```tsx
const VEREDITO_CLASSES = 'border-white/20 bg-white/5 text-white/80'
const TIPOGRAFIA_BADGE = 'text-sm font-semibold'
const ROTULOS_VEREDITO: Record<string, string> = { mantida: 'Mantida', revertida: 'Revertida' }
export function VereditoBadge({ veredito }: VereditoBadgeProps) {
  const rotulo = veredito ? ROTULOS_VEREDITO[veredito] : undefined
  if (!rotulo) return null
  return <Badge variant="outline" className={cn(TIPOGRAFIA_BADGE, VEREDITO_CLASSES)}>{rotulo}</Badge>
}
```
Rótulos: «Decisão final», «Rejeição pelo RH», «Knockout». **Nenhum diz «triagem»** (D-33).

**Tabela:** `key={linha.candidatura_id}` (linha 246) vira o id do pedido (C-12). `decidido_por_nome ?? FILA_COPY.naoIdentificado` (linha 265) ganha o caso do knockout, que mostra «Automático (knockout)» e **não** «Não identificado». Este último significa «há um autor e não conseguimos nomeá-lo» (linhas 19-21).

**Diálogo:** `decidido_por_nome ?? DIALOGO_COPY.naoIdentificado` (linha 289) recebe o mesmo tratamento. O contexto do knockout (D-11) é buscado **ao abrir**, no molde de `RespostaCasoAbertoConteudo` (`useQuery` com `staleTime: 0, gcTime: 0, retry: false`, `RespostaCasoAbertoSjt.tsx:48-54`).

---

#### Artefatos D-57 da tabela nova (10 passos — `49-CONTEXT.md:381-398`)

**Precedente:** `48-17-SUMMARY.md` (16 colunas, allowlist 1.2.0) e `49-21-SUMMARY.md`. A lista literal do checklist:
```
1. p46apply.
2. db:types com < /dev/null.
3. meta.acrescimos em catalogo-vivo-44.json.
4. Veredito em export-scope-rules.yaml.
5. Classificação em pii-inventory.yaml e regeneração do .md.
6. Linha ou razão em gen-recibo-exclusao.cjs, e regeneração do recibo e dos dois espelhos TS.
7. Regeneração de export-allowlist.json e _shared/exportAllowlist.ts, com bump da versão (hoje 1.4.0 → 1.5.0, RESEARCH).
8. Os dois blocos VALUES do 05-export-allowlist-drift.sql e os snapshots inline de exportAllowlist.test.ts.
9. Os quatro check: (check:export-allowlist, check:recibo-exclusao, check:matriz-retencao, check:pii-inventory-md).
10. Redeploy de exportar-meus-dados e executar-direito-titular.
```
Regra herdada: **UUID de funcionário** (`rejeitado_por`, revisor) fica **fora do export** e entra como «dado_de_funcionario» no recibo (precedente `revisada_por`). `meta.acrescimos` registra data, query e lista, sem mexer em `medido_em`/`totais` (48-17 §135). E `exportacaoService.ts` `rotuloTabela` (linhas 202-235) ganha o rótulo pt-BR da tabela nova.

---

## Padrões transversais

### Via de apply e ordem (D-52, D-55)
**Fonte:** CLAUDE.md §«Via de apply ATUAL»; cabeçalho de toda migration P48-P50.
**Aplica a:** toda migration da Onda B.
```sql
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com COMMENT
-- adjacente é a forma exata do 42601, e o endpoint já roda a requisição inteira numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/<arquivo>.sql
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';
```
Depois de todo apply visível: `git log --oneline origin/main..HEAD` **vazio**. EFs: `node efdeploy.cjs <slug> --dry-run` antes do deploy.

### Guarda de papel fail-closed + helper vivo (D-02 da 50)
**Fonte:** `20261005000004_p50_rpcs_escrita.sql:464-491`; `20261005000003:310-316`.
**Aplica a:** toda RPC de RH (responder, fila, contar, detalhe do knockout).
```sql
IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING errcode = '42501';
END IF;
IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;
...
IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
  RAISE EXCEPTION 'forbidden' USING errcode = '42501';
END IF;
```
**Nunca** `v_role NOT IN (` sem `coalesce`: falha ABERTO com claim nula. O pós-portão do P50 reprova essa forma (linha 759).

### Guarda de titular (RPCs do candidato)
**Fonte:** `20260712100003_funil12_get_avaliacao_status.sql` (corpo).
**Aplica a:** `get_avaliacao_status`, `solicitar_revisao_rejeicao`, `estado_revisao_rejeicao`.
Titular por `candidatos.user_id = auth.uid()`, **nunca** `candidato_id` (a C-4 é exatamente esse erro na RLS do Raven: `candidatos.id ≠ user_id` em 37/37).

### ACL: REVOKE nominal de anon
**Fonte:** `20260804000002_p44_solicitacoes_dados.sql:295-296, 319-321`.
**Aplica a:** toda função nova (RPC e trigger).
```sql
REVOKE ALL ON FUNCTION public.<fn>(<args>) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.<fn>(<args>) TO authenticated;
```
A justificativa vai no COMMENT: «o pg_default_acl de public concede EXECUTE a anon em todo CREATE FUNCTION, como grant direto: revogar só de PUBLIC remove um grant que nunca existiu».

### Sonda de exposição (D-12 da 50; memória «exposição a anon inclui views»)
**Fonte:** 51-RESEARCH §«Exemplos de código»; p49_44 cláusulas (a)/(f).
**Aplica a:** tabela nova, RPCs novas, e qualquer view que passe a depender delas.
```sql
set transaction read only;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select count(*) from public.<tabela_nova>;   -- esperado: erro 42501 ou 0
```

### Texto de produto (D-58 da 49)
**Fonte:** `src/__tests__/guards/forbidden-strings.grep.test.ts:64-65`; grep-guard dos e-mails `/score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i`.
**Aplica a:** todo texto novo (rótulos D-15, e-mail D-09/D-31, recibo D-23, selos D-33).
Nenhum nome novo («Prova cognitiva», «Raciocínio lógico (Matrizes)») casa o `FORBIDDEN`.

### Constante de texto exportada + teste da constante e do render
**Fonte:** `RespostaCasoAbertoSjt.tsx:27-38` (`COPY_RESPOSTA_CASO_ABERTO`), `EntrevistaScorecardInline.tsx:38-42` (`SCORECARD_COPY`), `ProvaCognitivaScreen.tsx:66-96`.
**Aplica a:** todo componente tocado na Onda A.

### Portões são código (D-56)
**Fonte:** CLAUDE.md §«Portões: varra pela FORMA»; p49_44 cabeçalho «Varredura D-56 (forma)» (linhas 123-139).
**Aplica a:** todo smoke editado (`p50` (k), `ScorecardAvaliacao.test.tsx`, `ExplicacaoCandidatoPage.test.tsx`, `EntrevistaScorecardInline.test.tsx:77`) e todo smoke novo.
Varra com o comando literal do CLAUDE.md, escreva a população e os achados no cabeçalho do smoke, e prove a mordida por mutação.

---

## Sem análogo

| Arquivo | Papel | Fluxo | Motivo |
|---|---|---|---|
| A RPC `estado_revisao_rejeicao(uuid)` (leitura do titular de um registro **sem policy**, jsonb com allowlist) | migration (RPC titular) | request-response | Toda leitura do titular sobre o ciclo de revisão hoje é **por RLS** (`candidato_le_propria_decisao` + `DECISAO_EXPLICACAO_ALLOWLIST`). Componha: a guarda de titular de `get_avaliacao_status` + a allowlist de colunas de `explicacaoService.ts:98-102`, levada para dentro do `jsonb_build_object`. |
| `explicacaoService` lendo a explicação de uma candidatura **reaberta** fora de `decisao_final` | service | request-response | Hoje só `origem === 'humana'` conhece reabertura (`ExplicacaoCandidatoPage.tsx:222-224`). O estado «reaberta» das origens novas vem do registro novo (RESEARCH armadilha 3). Siga o texto e o bloco `ResultadoRevisaoBloco` da 48-14, que já existem. |

---

## Metadados

**Escopo da busca:** `supabase/migrations/` (P42-P50), `supabase/tests/`, `scripts/`, `docs/compliance/`, `supabase/functions/{_shared,notificar-candidato}/`, `src/features/{explicacao,revisao,hub-candidato,avaliacao,avaliacao-cognitiva,entrevista,decisao,agendamento}/`, `src/components/pages/DashboardCandidatoPage.tsx`, `src/__tests__/guards/`, `.planning/phases/{48,49}-*/` (D-57, 48-17, 49-21)
**Arquivos lidos:** 31
**Data da extração:** 2026-10-08
**Rastreamento:** todo análogo citado conferido com `git ls-files` (nenhum espelho de instalação).
