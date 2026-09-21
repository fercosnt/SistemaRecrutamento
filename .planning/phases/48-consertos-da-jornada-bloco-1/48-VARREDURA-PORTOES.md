# Phase 48 — Varredura de portões pela FORMA (D-17)

**Medida em:** 2026-09-21 (plano 48-06) · **PROD:** `isljnozzlvckrgjjbjwp`
**Por quê agora:** esta fase acrescenta dois eventos ao CHECK `notificacoes_enviadas_evento_check`
(`cognitivo_liberado`, plano 48-10 / D-22; `prazo_reabertura_vencido`, plano 48-13 / JORN-19), uma
classe para cada um em `classe_evento_notificacao`, um trigger novo (`trg_notif_cognitivo_liberado`,
em `cognitivo_liberacao`) e um cron novo (`prazo-reabertura-sweep`). D-17 manda varrer **antes**
de o primeiro objeto vigiado entrar, e converter as fotografias para baseline capturada na execução.

---

## 1. Padrão (re-rodável) e contagem

O padrão EXATO do `CLAUDE.md` §«Portões: varra pela FORMA, não pelo sintoma»:

```bash
grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql
```

| Momento | Linhas | Arquivos |
|---|---|---|
| RESEARCH §I (2026-09-20/21, antes dos planos 48-01..04) | 246 | 38 |
| Base deste plano (`f734c31e`, depois de 48-01/03/04) | **254** | 37 |
| Depois deste plano | **250** | 37 |

A diferença 246 → 254 veio de commits de smoke entre a pesquisa e este plano (48-01/03/04). Não
foi investigada linha a linha: não muda a classificação abaixo. O −4 deste plano: `p43` 7 → 5 (saíram
`v_aceitos <> 6` e `v_classe <> 7`), `p37` 11 → 9 (saíram o literal de 4 valores do CHECK de evento
e o `v_n <> 2` da presença das colunas aditivas). O `p42` ficou em 2 → 2: saiu `v_aceitos <> 6`,
entrou um `v_resto <> 0` (resíduo zero da classe efêmera de (b), que é escopo deliberado).

### ⚠ Ponto cego do padrão, medido aqui

**O padrão não viu as duas listas literais que este plano converteu.** Em `p42` (a) e `p43` (c), a
lista era declarada assim: `v_eventos text[] := ARRAY['confirmacao', …]`, com `FOREACH` sobre ela.
Isso não é `= ANY (ARRAY[`, nem `<nome> IN (`. O padrão só pegou o `v_aceitos <> 6` da linha ao lado.
Se o `IF` de contagem não existisse, a lista seria invisível.
Também não viu as contagens do `p37` escritas como `v_n <> (CASE WHEN v_pos_aditiva THEN 18 ELSE 16 END)`.

```bash
grep -rnE 'text\[\] *:= *ARRAY\[' supabase/tests/*.sql | wc -l               # 36 em 2026-09-21
grep -rnE '(<>|!=|IS DISTINCT FROM) *\(CASE' supabase/tests/*.sql | wc -l     # 3  em 2026-09-21
```

Das 36, a maioria é transcrição legítima de escopo deliberado (ex.: `v_cols_notif` do `p37`, as
tuplas de seed). **Não foram classificadas uma a uma aqui.** O ponto cego fica registrado em
`deferred-items.md` com a sugestão de estender o padrão do `CLAUDE.md`. Esta é a mesma classe de
defeito do WINDOWS 43 («um padrão que não enxerga o idioma do arquivo que vigia»).

---

## 2. Achados que esta fase toca: classificação e destino

| Smoke : linha | Asserção | Forma | Classe | Plano | Estado |
|---|---|---|---|---|---|
| `p43_guard_marketing_smoke.sql` (y2), base `:738` | `count(classe_evento_notificacao) <> 7` | contagem × constante | **fotografia**, **vermelha** em PROD (8 classes), com diagnóstico FALSO («o DELETE de (b3) não foi revertido») | 48-06 | **convertido aqui**: md5 do `to_jsonb` de todas as linhas, capturado na FIXTURE desta execução |
| `p43_guard_marketing_smoke.sql` (c), base `:313-346` | `FOREACH` sobre 6 eventos literais + `v_aceitos <> 6` | lista literal | **fotografia** que **não reprovava nada**: o 7º evento não-marketing (`candidatura_encerrada_a_pedido`, P45) **já estava fora** | 48-06 | **convertido aqui**: vocabulário extraído do `pg_get_constraintdef` vivo, sem os eventos de classe `marketing`. Aceite de todos contra o total extraído. Os 6 históricos passam a ser exigidos por pertinência |
| `p42_notif_revisao_smoke.sql` (a), base `:148-183` | idem, 6 eventos + `v_aceitos <> 6` | lista literal | **fotografia** (mesmo modo de falha: `candidatura_encerrada_a_pedido` fora) | 48-06 | **convertido aqui**, no mesmo idioma |
| `p42_notif_revisao_smoke.sql` (b) | evento inventado tem de dar `23514` | comportamento | escopo deliberado, mas **vermelha em PROD desde a P43**: o guard BEFORE INSERT dá `P0003` antes do CHECK | 48-06 | **adaptada** (desvio Rule 3): o evento inventado é classificado dentro da mesma subtransação revertida, e o CHECK volta a ser o que recusa |
| `p37_fidelidade_schema_smoke.sql` (a), base `:217-228` | colunas `= 16/18` + `column_name IN (…)` `<> 2` | contagem × constante | **fotografia**, **vermelha** (PROD tem 20 colunas) | 48-06 | **convertido aqui**: pertinência por NOME das 16 + 2 colunas do P37 |
| `p37_fidelidade_schema_smoke.sql` (c), base `:155` | texto do CHECK de evento com EXATAMENTE 4 valores | literal transcrito | **fotografia**: estaria vermelha logo que (a) passasse | 48-06 | **convertido aqui**: o CHECK existe e CONTÉM `confirmacao`/`avanco`/`convite`/`decisao`. FKs, PK e `uq_notif_dedupe` seguem comparados byte a byte (ainda batem) |
| `p37_fidelidade_schema_smoke.sql` (f), base `:338-343` | triggers `= 0/1` | contagem × constante (forma `<> (CASE …)`, **invisível ao padrão**) | **fotografia**, **vermelha** (PROD tem 2 desde a P43) | 48-06 | **convertido aqui** (desvio: o plano não o citava): pertinência por nome de `trg_notificacoes_atualizado_em` |
| `p37_fidelidade_schema_smoke.sql` toggle `v_pos_aditiva` | `false` = «o de hoje» | modo congelado | **fotografia** (a aditiva 20260722000002 está em PROD desde a P37-03) | 48-06 | passou a `true`. É o modo que o arquivo já previa, não uma constante nova |
| `p37_fidelidade_schema_smoke.sql` (c) contagem `(CASE … 6 ELSE 5)`; (d) `:410` `<> 5`; (g1) `:512` `<> 5`; (g2) `:534` `<> 4`, `:549` `<> 1` | contagens de constraints/índices/colunas | contagem × constante | **fotografia**, **verde hoje** e **nenhum plano da fase a altera** (48-10/48-13 fazem DROP/ADD do CHECK com o MESMO nome, e a contagem não muda) | — | **registrado sem tocar** |
| `p37_fidelidade_schema_smoke.sql` (e) `:435`, (g3) `:570` `<> 1` policy; (j) `:626` `<> 8` seed | exatamente 1 policy (uma 2ª permissiva faria OR); 1 linha de seed por etapa | contagem | **escopo deliberado** | — | não tocado |
| `p43_guard_marketing_smoke.sql:768` (h) (base `:616`) | triggers em `notificacoes_enviadas` `<> 2` | contagem | **escopo deliberado**: nenhum trigger novo **nessa tabela** (o do 48-10 fica em `cognitivo_liberacao`) | — | não tocado |
| `p43_guard_marketing_smoke.sql` (b) `v_ok <> 3`, (g) `v_pols <> 0`, (y1) `v_resto <> 0`, (y2) `v_true <> 0` | ramos do próprio teste; default-deny; resíduo zero | contagem | **escopo deliberado** | — | não tocado |
| `p42_invent05_cron_smoke.sql` (a.iii), `:182-206` | nenhum `jobname` além dos conhecidos (`c_herdados ‖ c_purga`) | allowlist fechada | **escopo deliberado**: detecta job intruso. **Vai reprovar o `prazo-reabertura-sweep` até ser atualizado** | **48-13** | a atualizar **na mesma entrega do cron novo** (lista + `docs/compliance/cron-inventory.md`) |
| `p41_recon_retry_smoke.sql:234` (e) | `notif-retry-sweep` existe exatamente 1 vez, schedule `*/15` | contagem de 1 objeto nomeado | **escopo deliberado** | **48-13** confere | se o 48-13 mexer em `varrer_retry_notificacoes` (excluir o evento do RH da re-postagem), conferir se o smoke pina o corpo |
| `p42_revisao_art20_smoke.sql` (h.2) | chama `responder_revisao_decisao(…,'revertida',…)` numa fixture real | comportamento | **vai mudar de efeito**: com o JORN-19 o veredito passa a mexer em `candidaturas` e no histórico | **48-11** | a atualizar no plano do conserto (etapa `rejeitado` + teardown da candidatura/histórico) |
| `p45_motor_exclusao_smoke.sql` (C6) | esperava encerramento de `triagem/rejeitado` | comportamento | **codificava o Defeito 26** | **48-01** | **já tratado** pelo 48-01: o (C6-neg) foi acrescentado e as fixtures corrigidas |
| `p39_rewire_triggers_smoke.sql:189` (f) | `trg_notif_*` `<> 3` | contagem × constante | **fotografia vermelha**: PROD tem **6**, e o trigger do 48-10 leva a **7** | — | **NÃO tocado, por instrução do operador** (CONTEXT §Deferred). Continua vermelho; não usar como portão |

---

## 3. Sondas de mordida: resultado por execução (2026-09-21)

Cada asserção convertida tem um gancho por GUC. A sonda perturba o estado, roda **a mesma**
comparação e **sempre** termina em exceção. Por isso a requisição da Management API é revertida
inteira e nenhuma perturbação comita. Rodadas por cópia temporária no scratch da sessão (fora do
repositório), com `SELECT set_config('<guc>', '<valor>', false);` como primeira linha.

| Smoke | GUC = valor | Perturbação | Resultado |
|---|---|---|---|
| `p43_guard_marketing_smoke.sql` | `smoke43g.sonda = y2` | apaga uma linha de `classe_evento_notificacao` (subtransação) | `SONDA OK: y2 mordeu — P43G FAIL (y2): classe_evento_notificacao MUDOU durante o smoke (impressão digital 8e9e9079… -> 4da76949…)` |
| `p43_guard_marketing_smoke.sql` | `smoke43g.sonda = c` | exige `evento_sonda_inexistente` entre os históricos | `SONDA OK: c mordeu — P43G FAIL (c): evento(s) histórico(s) AUSENTE(S) do CHECK vivo: evento_sonda_inexistente` |
| `p42_notif_revisao_smoke.sql` | `smoke42n.sonda = a` | idem | `SONDA OK: a mordeu — P42N FAIL (a): evento(s) histórico(s) AUSENTE(S) do CHECK vivo: evento_sonda_inexistente` |
| `p37_fidelidade_schema_smoke.sql` | `smoke37f.sonda = check` | exige `evento_sonda_inexistente` no CHECK | `SONDA OK: check mordeu — P37-FID FAIL (c): o CHECK vivo de evento NÃO contém o(s) evento(s) do P37: evento_sonda_inexistente` |
| `p37_fidelidade_schema_smoke.sql` | `smoke37f.sonda = colunas` | exige `coluna_sonda_inexistente` | `SONDA OK: colunas mordeu — P37-FID FAIL (a): coluna(s) do P37 AUSENTE(S) de notificacoes_enviadas: coluna_sonda_inexistente` |
| `p37_fidelidade_schema_smoke.sql` | `smoke37f.sonda = triggers` | exige `trg_sonda_inexistente` | `SONDA OK: triggers mordeu — P37-FID FAIL (f): trigger(s) do P37 AUSENTE(S) …: trg_sonda_inexistente` |

Valor de sonda desconhecido (`zz`, `xx`) reprova ALTO na entrada (`… é desconhecida`). Assim, uma
sonda com erro de digitação não roda o smoke verde e não parece «não mordeu».

**Nada comitou:** `classe_evento_notificacao` tinha **8 linhas / impressão digital
`8e9e90791305b1a8bfcf3beb7d8c15a5`** antes das sondas e continua com **8 / `8e9e9079…`** depois.

**Runs normais (verdes em PROD, 2026-09-21):** `p43_guard_marketing_smoke.sql` 9/9 (antes: vermelho
em y2) · `p42_notif_revisao_smoke.sql` 4/4 (antes: vermelho em (b)) · `p37_fidelidade_schema_smoke.sql`
12/12 (antes: vermelho em (a)). Hoje (c)/(a) iteram **7** eventos não-marketing. Depois do 48-10
serão 8, depois do 48-13 serão 9, **sem editar os smokes**.

---

## 4. Instrução permanente

**Antes de cada apply que acrescente um objeto vigiado** (valor no CHECK de `evento`, classe, cron,
função, trigger, coluna), re-rodar o padrão da §1 **e** os dois do ponto cego. Para cada achado,
perguntar: *esta lista/contagem codifica um ESCOPO deliberado, ou uma FOTOGRAFIA que vai envelhecer?*

Para os planos desta fase, concretamente:

- **48-10** (`cognitivo_liberado`) e **48-13** (`prazo_reabertura_vencido`): depois do apply, rodar
  `p43_guard_marketing_smoke.sql`, `p42_notif_revisao_smoke.sql` e `p37_fidelidade_schema_smoke.sql`
  com `node p46apply.cjs run`. Eles já veem o evento novo sozinhos: (c)/(a) o inserem e (e) do `p43`
  exige a classe. O evento **precisa** de classe na mesma migration, ou o `p43` (e) e o `p42` (a)
  reprovam com o motivo certo.
- **48-13** (cron): atualizar `p42_invent05_cron_smoke.sql` (a.iii) e `docs/compliance/cron-inventory.md`
  **no mesmo commit** do cron.
- `p39_rewire_triggers_smoke.sql:189` segue vermelho e **não é portão** desta fase.
