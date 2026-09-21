# Phase 48 — Varredura pela FORMA: `etapa_atual` decidindo «acabou / em andamento» (D-11)

**Medida em:** 2026-09-21 (sessão de pesquisa, só leitura) · **PROD:** `isljnozzlvckrgjjbjwp`
**Alimenta:** JORN-26 (e JORN-22 por tabela) · **Regra:** o knockout mantém
`etapa_atual='inscricao'` com `status='rejeitado'` **por desenho** — todo predicado de «encerrada»
que olhe só `etapa_atual` erra exatamente ali. E há um segundo caso que ninguém nomeou: **4 linhas
com `status='finalizado'` em etapa de trabalho** (legado sem histórico, ver §4).

---

## 1. Padrões de busca (re-rodáveis, nesta ordem)

```bash
# (P1) código — toda menção à coluna
grep -rnE "etapa_atual|etapaAtual" src supabase/functions --include='*.ts' --include='*.tsx' \
  | grep -vE "database\.types|\.test\.|__tests__|_test\.ts"
# → 135 linhas em 27 arquivos (2026-09-21)

# (P2) código — predicados sobre variável DERIVADA (ex.: `const etapa = c.etapa_atual; etapa === 'rejeitado'`)
grep -rnE "['\"](rejeitado|aprovado|finalizado)['\"]" src supabase/functions --include='*.ts' --include='*.tsx' \
  | grep -vE "database\.types|\.test\.|__tests__|_test\.ts"

# (P3) smokes que codificam a mesma suposição
grep -rnE "etapa_atual *(NOT IN|<>|!=|IN|=)" supabase/tests/*.sql
```

```sql
-- (P4) definições VIVAS em PROD (não o histórico de migrations). Rodar via:
--   node p46apply.cjs sql "SET TRANSACTION READ ONLY; <query>"
select p.oid::regprocedure::text, (select count(*) from regexp_matches(p.prosrc,'etapa_atual','g')) n
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where p.prosrc ~ 'etapa_atual' and n.nspname not in ('pg_catalog','information_schema');
select schemaname||'.'||viewname, definition from pg_views where definition ~ 'etapa_atual';
select schemaname||'.'||matviewname from pg_matviews where definition ~ 'etapa_atual';   -- 0
select tablename, policyname, cmd, qual, with_check from pg_policies
 where coalesce(qual,'')||coalesce(with_check,'') ~ 'etapa_atual';
-- corpo inteiro de cada função: select pg_get_functiondef(oid) ...
```

**Ponto cego conhecido do padrão:** um predicado de «encerrada» escrito sobre outra coluna que
*deriva* de `etapa` (ex.: `historico_candidatura.etapa_para`, ou um `JOIN ... ON m.etapa = c.etapa_atual`)
só aparece se a linha também contiver `etapa_atual`. O JOIN da purga foi pego por isso; um
predicado futuro sobre `etapa_para` não seria. P2 cobre o lado TS; no SQL, estender com
`prosrc ~ 'etapa_para'` se o conserto tocar histórico.

---

## 2. Vocabulário (lido do catálogo vivo, 2026-09-21)

`etapa_processo` (ordem do enum = ordem de comparação `<`/`>` usada por `avancar_etapa()`):
`inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final, aprovado, rejeitado`

`status_candidatura`: `aguardando_resposta, em_analise, aprovado_proxima, rejeitado, finalizado`

Distribuição real (33 candidaturas, `deleted_at` nulo em todas):

| etapa_atual | status | n | o que é |
|---|---|---|---|
| aprovado | finalizado | 6 | decisão final aprovada |
| rejeitado | rejeitado | 2 | 1 rejeição na triagem (Marina) + 1 rejeição na decisão final |
| rejeitado | finalizado | 1 | legado sem histórico |
| **inscricao** | **rejeitado** | **3** | **knockout** (3 contas `+claude` de teste) |
| triagem / entrevista_online / decisao_final | **finalizado** | 1 / 1 / 1 | **legado sem histórico** — status terminal em etapa de trabalho |
| triagem | aguardando_resposta / em_analise | 9 / 6 | em andamento |
| avaliacao_assincrona / entrevista_online / decisao_final | em_analise | 1 / 1 / 1 | em andamento |

⚠ CONTEXT diz «32 candidaturas reais»; o banco tem **33** (a 33ª é a candidatura de knockout da
Marina, de 2026-09-20 13:58). Não é defeito — é registro envelhecido.

---

## 3. Predicado canônico — já existe um correto, e NÃO é o PURGA-07

| Candidato a canônico | Onde | Serve? |
|---|---|---|
| `STATUS_TERMINAIS = {'rejeitado','finalizado'}` + `candidaturaEncerrada(status)` | `src/components/pages/DashboardCandidatoPage.tsx:65-67` | ✅ É o critério certo e já está em produção no painel do candidato |
| `emAndamento = etapa ∉ {aprovado,rejeitado} ∧ status ∉ {rejeitado,finalizado}` | `DashboardCandidatoPage.tsx:459-464` | ✅ Mesma regra, forma conjuntiva |
| `getTerminalBadge`: `etapa === 'aprovado'` ou `etapa === 'rejeitado' ∨ status === 'rejeitado'` | `src/components/KanbanBoard.tsx:97-116` | ⚠ Quase — não trata `finalizado` em etapa de trabalho |
| PURGA-07 (`config_retencao_etapa.elegivel_purga`) | `20260823000001_p46_config_purga.sql:151-158` + `candidaturas_alem_da_janela()` | ❌ **É ele mesmo uma ocorrência do defeito**: a allowlist é **por etapa** (`JOIN ... ON m.etapa = c.etapa_atual`), então o knockout (`inscricao`) nunca é elegível. Serve como *doutrina* («allowlist de estados terminais, com COALESCE»), não como código reutilizável |

**Recomendação:** uma única função SQL, e um único helper TS espelho, ambos por **allowlist de
estados terminais**, NULL-safe:

```sql
-- forma recomendada (nome e local ficam com o planejador)
CREATE OR REPLACE FUNCTION public.candidatura_encerrada(p_etapa public.etapa_processo, p_status public.status_candidatura)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT COALESCE(p_etapa IN ('aprovado','rejeitado'), false)
      OR COALESCE(p_status IN ('rejeitado','finalizado'), false)
$$;
```

`encerrada_a_pedido_em` **não** entra: a retirada tem idempotência própria (`IS NULL`) e a
Invariante 9 da 45-UI-SPEC exige que a candidatura retirada **continue visível** ao RH.

---

## 4. Classificação — CÓDIGO (`src/` + `supabase/functions/`, 135 linhas)

Classes: **(i) DEFEITO** — lê `etapa_atual` para decidir se acabou/está em andamento, ignorando
`status`; **(L) latente** — decide desfecho por etapa, correto hoje por acaso; **(ii) escopo
deliberado** — lógica POSICIONAL (qual etapa), não «acabou?»; ou já combina com `status`;
**(iii) não-predicado** — tipo, projeção de coluna, rótulo, comentário, passthrough, escrita.

### (i) Defeitos e (L) latente — 4 linhas

| # | Onde | O quê | Efeito medido / previsto |
|---|---|---|---|
| C1 | `src/features/hub-candidato/components/HubCandidatoRH.tsx:137-138` | `proximaEtapa` = próxima de `WORKING_STAGES` a partir **só** de `etapaAtual` | Para o knockout (`inscricao`) o hub oferece **«Avançar» → `triagem`**. `avancar_etapa()` aceita (é avanço) e a candidata eliminada volta ao funil com `status='rejeitado'` |
| C1b | `HubCandidatoRH.tsx:232` (e o `RejeitarCandidaturaDialog` em `:271`) | a linha de ações renderiza sempre que há `etapaAtual` | **«Rejeitar»** oferecido para knockout e para `finalizado`; a RPC aceita (ver D3) e **reescreve** `motivo_rejeicao='knockout_automatico'` pelo motivo do RH |
| C2 | `src/components/pages/CandidatosRHPage.tsx:258` | contagem do funil por `etapa_atual` | knockout conta como «Inscrição» pendente (baixo — relatório) |
| L1 | `supabase/functions/notificar-candidato/index.ts:369` | `desfecho = etapa_atual === 'aprovado' ? 'aprovado' : 'rejeitado'`, lido **na hora do envio** | Correto hoje. Mas o retry (`notif-retry-sweep`, até 24 h depois) relê o estado **atual**: com a reabertura (JORN-19), o retry de um e-mail de rejeição antigo, feito depois de uma nova aprovação, sairia com a **cópia de aprovação**. Consertar junto com JORN-18 (derivar o desfecho da linha de histórico da chave) |

### (ii) Escopo deliberado — 33 linhas

| Arquivo | Linhas | Por quê |
|---|---|---|
| `HubCandidatoRH.tsx` | 86, 90, 128, 144, 310, 312, 364, 376, 400, 424, 435, 442 | posição na timeline/seções, CTA do workspace da etapa, retroceder (FUNNEL_ORDER) |
| `features/funil/components/FilaTrabalhoTab.tsx` | 88 | SLA por etapa — **correto dado a linha**; o erro é a linha estar na view (D4) |
| `features/agendamento/components/AgendamentoBlock.tsx` | 206, 619 | modalidade padrão e gate das duas etapas de entrevista |
| `features/triagem/components/RetrocederCandidaturaDialog.tsx` | 93, 104 | destinos anteriores na ordem do funil |
| `features/triagem/services/triagemService.ts` | 200 | filtro escolhido pelo usuário |
| `features/avaliacao/components/AvaliacaoContainer.tsx` | 507 | gate posicional (espelha RLS) |
| `features/vagas/services/candidaturasService.ts` | 329, 579, 708 | filtros escolhidos pelo usuário |
| `components/KanbanBoard.tsx` | 100, 477 | selo terminal **com** `status` (referência) e coluna por etapa (card terminal não arrasta) |
| `components/pages/DashboardCandidatoPage.tsx` | 113, 154, 313, 371, 372 | CTA/entrevista/SLA **guardados** por `candidaturaEncerrada(status)`; `hasDecisaoFinal` **com** `status` (§7.18) |
| `components/pages/DashboardRHPage.tsx` | 75 | conta aprovados — `aprovado` implica encerrada |
| `supabase/functions/submit-bigfive-final/index.ts` | 178 | gate posicional `avaliacao_assincrona` |
| `supabase/functions/avaliar-redacao-cultural/index.ts` | 191 | idem |
| `supabase/functions/avaliar-redacao/index.ts` | 214 | idem |

### (iii) Não-predicado — 98 linhas

`cognitivoService.ts` 85,124,140,146 · `HubCandidatoRH.tsx` 11,78,104,125,201,215,257 ·
`filaTrabalhoService.ts` 36,39,57 · `FilaTrabalhoTab.tsx` 82 · `AgendamentoBlock.tsx`
5,92,190,197,368,371,458,618,622 · `funilKpisService.ts` 68 · `RetrocederCandidaturaDialog.tsx`
5,9,70,84 · `TriagemTable.tsx` 83,308 · `triagemService.ts` 50,79,186,242,350,377,381,453,457,481 ·
`EntrevistaDashboard.tsx` 129 · `entrevistaService.ts` 181,234,251,276 · `avaliacaoService.ts`
71,101,117,138,220 · `vagasTypes.ts` 197,347,405,435,466 · `candidaturasService.ts`
140,165,287,416,443,452,457,803,806,811,826,921 · `KanbanBoard.tsx` 12,94,161,327 ·
`DashboardCandidatoPage.tsx` 57,101,129,137,346,354,355 · `CandidatosRHPage.tsx` 381,770 ·
`submit-bigfive-final` 11,157 · `submit-candidatura` 291,294,300,305,315 · `notificar-candidato`
188,367 · `_shared/email-templates.ts` 94 · `executar-direito-titular` 591 ·
`_shared/exportAllowlist.ts` 410,457 · `avaliar-redacao-cultural` 12,172 · `avaliar-redacao` 10,193.

**Soma:** 4 (i/L) + 33 (ii) + 98 (iii) = **135** ✔

---

## 5. Classificação — OBJETOS VIVOS DO BANCO (17)

Funções com `etapa_atual` no corpo (12), views (2), policies (3). Matviews: 0.

### (i) Defeitos — 6 objetos

| # | Objeto (definição VIVA; migration de origem) | Predicado errado | Efeito medido |
|---|---|---|---|
| **D1** | `registrar_pedido_exclusao(uuid)` — `20260805000002:216-220` | `AND c.etapa_atual NOT IN ('aprovado','rejeitado')` | **Defeito 26.** Marcou `encerrada_a_pedido_em` em **2** candidaturas de knockout (`92522073…`, `25a4231c…`, ambas `+claude`), e o trigger `trg_candidatura_encerrada_a_pedido` mandou `candidatura_encerrada_a_pedido` aos 3 RH |
| **D2** | `retirar_candidatura(uuid)` — `20260805000007:230` (guard em `v_etapa IN (...)` + `UPDATE ... NOT IN`) | idem, nos dois pontos | UI esconde a ação (o front usa `status`), mas o **caminho não-UI** (EF `executar-direito-titular` acao=`retirar_candidatura`) retira uma candidatura de knockout e dispara o aviso ao RH |
| **D3** | `rejeitar_candidatura(uuid,motivo_rejeicao_rh,text)` — `20260714100001:135` | guard terminal `IF v_etapa IN ('aprovado','rejeitado')` | Aceita rejeitar de novo um knockout (C1b): reescreve `motivo_rejeicao`, grava histórico `inscricao→rejeitado` e, **depois de JORN-18**, geraria um **segundo e-mail de rejeição** (chave nova por linha de histórico) |
| **D4** | view `v_fila_trabalho` | `WHERE c.etapa_atual <> ALL (ARRAY['aprovado','rejeitado'])` | A fila de trabalho do RH mostra hoje **3 knockouts + 3 `finalizado`** como trabalho pendente, com selo de SLA vencido |
| **D5** | `candidaturas_alem_da_janela()` (PURGA-02/07) — `20260823000003` | allowlist `elegivel_purga` **por etapa** (`JOIN config_retencao_etapa m ON m.etapa = c.etapa_atual`) | Candidatura de knockout **nunca** fica elegível à purga: **retenção indefinida não declarada** (o COMMENT da coluna declara rascunho e funil ativo — não o knockout). Mecanismo destrutivo, `modo='dry_run'` hoje → **consertar exige decisão do operador**, não é conserto autônomo |
| D6 | `funil_kpis(uuid)` CTE `volume` | `GROUP BY c.etapa_atual` como «volume atual por etapa» | knockout soma em «inscrição» (baixo — relatório; mesma natureza de C2) |

### (ii) Escopo deliberado — 8 objetos

| Objeto | Por quê |
|---|---|
| `submit_candidatura_atomic(...)` | **O desenho do knockout**: insere em `inscricao`, e o knockout grava `status='rejeitado'` **sem** mudar a etapa, para `avancar_etapa()` não disparar (`20260709000014:138-150`) |
| `avancar_etapa()` (trigger) | lógica de transição/regressão (`NEW.etapa_atual < OLD.etapa_atual` exige justificativa) |
| `guard_rejeicao_auditada()` | detecta se o mesmo UPDATE move a etapa |
| `pontuar_cognitivo(...)`, `pontuar_sjt(...)` | gates posicionais |
| policies `cand_escreve_respostas_aval` (respostas_avaliacao), `em_progresso_candidato_own` (redacoes_candidato_em_progresso), `cand_escreve_cognitivo_respostas` (cognitivo_respostas) | gates posicionais de escrita do candidato |

### (iii) Não-predicado — 3 objetos

`anonimizar_candidato` (só comentário), `registrar_decisao` (só escreve etapa; ⚠ **não tem guard
terminal nenhum** — decide sobre knockout também; ver RESEARCH §J), view `v_triagem_panel` (projeção).

**Soma:** 6 + 8 + 3 = **17** ✔

---

## 6. Smokes que codificam a suposição errada

| Smoke | Onde | Consequência do conserto de D1/D2 |
|---|---|---|
| `supabase/tests/p45_motor_exclusao_smoke.sql` | fixtures em `:853-864` e `:2238-2245` | Usa `etapa_atual='triagem', status='rejeitado'` e **espera** que a candidatura seja «em andamento» («as duas colunas são independentes»). O `status='rejeitado'` é um truque para desarmar `trg_notif_confirmacao`. **Com o predicado canônico, (C6) reprova.** Refazer a fixture: INSERT com `status='rejeitado'` (desarma o dispatch do INSERT) e em seguida `UPDATE ... SET status='em_analise'` (nenhum trigger de dispatch dispara em mudança de status; `guard_rejeicao_auditada` só olha a entrada EM `rejeitado`) |
| `funil01_pontuar_sjt_smokes.sql`, `funil08_pontuar_cognitivo_smokes.sql`, `oper31_rejeitar_candidatura_smokes.sql:176`, `submit_candidatura_atomic_smokes.sql:11` | — | posicionais / por desenho — não mudam |

As **migrations** `20260805000002:220`, `20260805000007:230,464` contêm o predicado errado também
nos blocos de auto-verificação — **são histórico, não se editam**.

---

## 7. O que a varredura muda no escopo da fase

1. JORN-26 não é «um filtro»: são **D1 + D2 + D3 + D4** (mesma forma), mais **C1/C1b** no hub.
   D3 é pré-requisito de JORN-18 (senão a chave nova transforma a re-rejeição de um knockout num
   segundo e-mail).
2. **D5 (purga) é defeito da mesma forma, mas é mecanismo destrutivo** → `checkpoint:decision` do
   operador: consertar nesta fase (o knockout passa a ser purgável após a janela de `rejeitado`)
   ou registrar como retenção declarada. Recomendação: **registrar e não consertar aqui** — mexer na
   elegibilidade da purga arrasta `p46_purga_smoke.sql` (102 `IS DISTINCT FROM`) e o flip `dry_run→live`.
3. D6 e C2 (relatórios): baixo; consertar só se couber na mesma task do predicado canônico.
4. Retroativo: as **2** marcas `encerrada_a_pedido_em` erradas (ambas contas de teste) só se
   corrigem com `UPDATE` retroativo → checkpoint (D-18). Os 3 e-mails ao RH já saíram.
