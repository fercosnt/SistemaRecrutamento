---
tipo: auditoria-de-releitura
fase: 46-purga-automatica-dry-run-live
auditado_em: 2026-09-26
objeto: ".planning/phases/46-purga-autom-tica-dry-run-live/46-VERIFICATION.md (re_verification.gaps_remaining, 4 itens, registrados em 2026-08-23)"
nao_substitui: "46-VERIFICATION.md — aquele arquivo fica INTACTO, com o veredito e o score de 2026-08-23"
escopo: somente leitura — nenhuma escrita em PROD, nenhuma migration, nenhuma fase marcada como completa
via_de_medicao: "node p46apply.cjs sql \"SET TRANSACTION READ ONLY; …\" (Management API, ref isljnozzlvckrgjjbjwp) + Management API /functions + git"
resultado:
  fechado_por_trabalho_posterior: 2      # gaps 1 e 3
  ainda_real: 1                          # gap 4
  fechado_por_decisao_registrada: 1      # gap 2
  nao_medivel_sem_o_operador: 0
achado_que_nao_estava_em_nenhum_gap: >
  O PORTÃO DO FLIP ESTÁ 5/5 VERDE. Medido com as próprias expressões de
  `salvar_config_purga`: 34 dias · 36 execuções · 35 com evidência · allowlist 3 ·
  zero etapa em `seed`. O flip deixou de ser AÇÃO BLOQUEADA e passou a ser DECISÃO DO
  OPERADOR: os critérios não são mais a barreira — a barreira é um argumento
  (`p_confirmo_live`). E o item 3 de `human_verification` da `46-VERIFICATION.md`
  prevê um resultado que não acontece mais, o que conduz o operador na direção
  daquele argumento com um mapa errado. Ver §SEGUNDO.
---

# Phase 46 · Auditoria de releitura dos `gaps_remaining` de 2026-08-23, medida em 2026-09-26

**O que este arquivo é.** Uma releitura dos quatro `gaps_remaining` que a
`46-VERIFICATION.md` registrou em 2026-08-23T11:35-03, cada um remedido contra o sistema
vivo 34 dias depois. **Não substitui a `46-VERIFICATION.md`** e não a corrige: aquele
documento é o registro do que era verdade naquele instante, e continua sendo o veredito
oficial da fase (`status: gaps_found`, `score: 4/5`, portão destrutivo 3.5/5). Este aqui
diz só uma coisa: **quais daqueles quatro gaps ainda são reais hoje.**

**Como medi.** A própria `46-VERIFICATION.md` escreve, sobre si mesma, «*Eu nao acreditei
no documento: como confirmei o smoke pelo catalogo*». Apliquei a mesma regra a ela.
Nenhuma linha abaixo vem de reler uma afirmação: tudo vem de `SET TRANSACTION READ ONLY`
contra PROD, da Management API, ou do git. E antes de cada booleano ou contagem, **medi a
população** — um `false` numa positiva e um `true` numa negativa têm as mesmas duas causas
(critério violado, ou conjunto vazio), e o gap 1 era exatamente essa armadilha.

---

## ⚠ PRIMEIRO — O VEREDITO SOBRE O CRON JOBID 6

O gap 1 era o coração da fase: *uma purga automática que nunca rodou*. A
`46-VERIFICATION.md` fechou com «`cron.job_run_details` para o jobid 6 tem ZERO linhas — a
varredura noturna nunca rodou, as 4 execucoes do ledger sao manuais, e 0 de 14 noites
decorreram», e previu, statement por statement, o que a noite de 2026-08-24 00:00-03 faria.

**Ela rodou. E rodou todas as noites desde então, sem falhar uma vez.**

| Grandeza | Medido 2026-09-26 | Era em 2026-08-23 |
|---|---|---|
| `cron.job` jobid 6 | existe · `active = true` · `0 3 * * *` · user `postgres` · `md5(command) = 381a0edbc8a59b47b23b50dd1eba9a86` | idêntico |
| `cron.job_run_details` **jobid 6** | **34 linhas** | **0 linhas** |
| ↳ `status = 'succeeded'` | **34 de 34** | — |
| ↳ `status <> 'succeeded'` | **0** | — |
| ↳ primeira execução | **2026-08-24 00:00:00.075347-03** — a noite exatamente prevista | — |
| ↳ última execução | **2026-09-26 00:00:00.089913-03** | — |
| ↳ datas distintas × dias de intervalo | **34 × 34** → **nenhuma noite faltando** | — |
| ↳ duração máxima | 00:00:02.129404 | — |
| ↳ `return_message` | `1 row` | — |

**As três causas que a contagem zero não distinguia estão todas excluídas, uma a uma:**

1. *O job não estava armado?* — Estava e está: `active = true`, `schedule` intacto, `md5(command)` idêntico ao que a asserção (a) do smoke pina.
2. *Estava armado e nunca disparou?* — Disparou 34 vezes. `min(start_time)` é a própria noite que a VERIFICATION previu, com ~12,5 h de antecedência.
3. *Disparou sem registro?* — Registrou as 34. E o registro é corroborado do outro lado: **34 das 36 execuções `dry_run` do ledger têm `iniciada_em` dentro dos 5 primeiros segundos de 00:00** (as 2 restantes são as chamadas manuais de 22 e 23/08).

**E a varredura fez, 34 vezes, exatamente o que a fase prometeu que ela faria — nada:**

| Agregado sobre as 36 execuções em `dry_run` | Valor |
|---|---|
| `sum(elegiveis)` | 180 |
| `sum(processados)` | **0** |
| `sum(notificacoes_expurgadas)` | **0** |
| execuções por cron **com** `relato_dry_run` em algum item | **34 de 34** |
| `public.purga_execucoes` com `modo_vigente = 'live'` | **0** |
| `net.http_request_queue` / `net._http_response` | **0 / 0** — o despacho nunca foi alcançado |
| `logs_auditoria` com `acao = 'alterar_config_purga'` | **1 linha**, severidade `aviso`, 2026-08-23 02:06:37.866049-03 — o flip `off → dry_run`, intacto; nenhuma linha `critico` |
| `config_purga` | `modo = dry_run` · `cap = 50` · `janela = 24` · `atualizado_em = 2026-08-23 02:06:37.866049-03` — T0 intacto |

> **«O dado expira sozinho» deixou de ser uma propriedade da CONFIGURAÇÃO e passou a ser uma
> observação do AGENDADOR — 34 noites, 34 sucessos, zero destruição, e evidência do caminho
> do delete em todas as 34.** É o único gap desta fase que fechou sozinho, por passagem do
> tempo, exatamente como a `46-VERIFICATION.md` escreveu que fecharia
> (`fecha_por: "passagem do tempo — nao ha trabalho a fazer"`).

---

## ⚠ SEGUNDO — O ACHADO QUE NÃO ERA UM GAP E MUDA A DECISÃO

Ao remedir o gap 1 eu tive de calcular os cinco critérios do portão do flip, porque três
deles são contagens sobre o mesmo ledger. Reproduzi as expressões **do corpo vivo de
`salvar_config_purga`** (md5 `e10786bd4e21bce3e9dd956f6a479db2` — o corpo NOVO da `…0014`,
inalterado desde o apply), com os mesmos recortes de `modo_vigente` e `veredito`:

| # | Critério | Exigido | Medido 2026-09-26 | Em 2026-08-23 |
|---|---|---|---|---|
| 1 | dias desde a 1ª execução de ensaio | ≥ 14 | **34** ✅ | 0 ❌ |
| 2 | execuções de ensaio no ledger | ≥ 14 | **36** ✅ | 2 ❌ |
| 3 | execuções sobre conjunto não-vazio **com evidência** (`relato_dry_run`) | ≥ 1 | **35** ✅ | 1 ✅ |
| 4 | etapas com `elegivel_purga` | ≥ 1 | **3** ✅ | 3 ✅ |
| 5 | etapas da allowlist em procedência `seed` | = 0 | **0** ✅ | 2 ❌ |

**Os cinco critérios estão verdes. Nenhum deles recusa mais o `live`.**

Isso não é novidade para o repositório — foi registrado em `GUIA-VALIDACAO-FINAL.md` §7.32
(commit `c6453af6`, 2026-09-06 23:40) e em `RETOMAR-AQUI.md` §0.3, ambos com o aviso de que
o bloco de "prova do portão fechado" do runbook **virou o gatilho do flip**. E a proibição
correspondente **já existe e é explícita**: `JORNADA-GUIADA.md:71-73` (regra 3 — «*Não rode
o bloco de `salvar_config_purga(... p_confirmo_live := true)`… o portão está verde desde
06/09, então aquele SQL executa o flip em vez de provar que está fechado*»), replicada em
`49-18-PLAN.md:35`, `49-CONTEXT.md:663`, `48-18-PLAN.md:32,50` e `48-CONTEXT.md:100`. **A
vedação está escrita. O que falta é o item 3 parar de conduzir na direção dela.**

### ⚠ Correção de uma afirmação que eu mesmo escrevi errado — e a forma certa do achado

A primeira versão desta auditoria dizia que a chamada do item 3 «*não recusa: executa o flip
irreversível*». **Isso é falso**, e falso na direção perigosa — seria esta auditoria
produzindo exatamente o registro-com-autoridade-que-envelheceu que ela existe para achar.
Conferi as duas metades:

**(1) O que o item 3 manda fazer** (`46-VERIFICATION.md:257-260`): «*login no app como admin
e chamada da RPC `salvar_config_purga` com `p_modo => 'live'`*». Ele **não** manda passar
`p_confirmo_live := true`.

**(2) A ordem das guardas no corpo VIVO** (lida de `pg_proc.prosrc`, md5
`e10786bd4e21bce3e9dd956f6a479db2`, não do documento — a guarda da confirmação está no
offset 4770 e o bloco dos critérios no 5481, nesta ordem):

```
v_virando_live := (p_modo = 'live' AND v_modo_antes IS DISTINCT FROM 'live');
IF coalesce(v_virando_live, false) THEN
  -- ── (6.a) A CONFIRMACAO EXPLICITA ──
  IF p_confirmo_live IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'VALIDATION: ligar a purga em modo live exige confirmacao EXPLICITA
      — o argumento de confirmacao veio [%] …'  USING ERRCODE = '22023';
  END IF;
  -- ── (6.b) OS TRES CRITERIOS DE D-46-14, MEDIDOS NO LEDGER ──   ← só DEPOIS
```

**A guarda da confirmação PRECEDE o bloco dos critérios.** A chamada exatamente como o item
3 a escreve **recusa com `22023` em (6.a)** e **nunca alcança (6.b)**. O flip não acontece, e
`modo` segue `dry_run`.

**O que está obsoleto é o RESULTADO ESPERADO, não a segurança da chamada.** O item 3 prevê:

> esperado: «*`22023` nomeando exatamente TRES criterios faltantes (dias=0/14 ·
> execucoes=2/14 · 2 etapas em `seed`), `modo` seguindo `dry_run`, zero linha nova em
> `logs_auditoria`*»

Os três critérios que ele previa faltando **estão satisfeitos hoje**, medidos:

| Critério previsto faltando | Previsto | Medido 2026-09-26 |
|---|---|---|
| dias desde o 1º ensaio | 0/14 | **34** — e `cron.job_run_details` jobid 6 = **34 linhas, 34 `succeeded`, 34 datas distintas**, job `active` |
| execuções de ensaio | 2/14 | **36** |
| etapas da allowlist em `seed` | 2 | **0** — `config_retencao_etapa` tem 8 linhas, **todas `origem = 'admin'`**; as 3 elegíveis são `aprovado`/`decisao_final` (24 m) e `rejeitado` (18 m), as três `admin` |

### E o risco real é humano, não de código — este é o mecanismo

O operador que seguir o item 3 recebe uma recusa **com mensagem diferente da prevista**:
não sobre critérios, mas sobre a confirmação ausente — «*exige confirmacao EXPLICITA — o
argumento de confirmacao veio [NULL]*». Quem leu «*deve recusar nomeando três critérios*» e
vê «*esqueceu o argumento*» conclui, de boa-fé, **«ah, faltou um parâmetro»** — acrescenta
`p_confirmo_live := true`, e **nesse ponto os cinco critérios estão verdes e o flip
executa**, irreversível, sem PITR e com o Storage fora de todo caminho de backup.

**O documento não aperta o gatilho. Ele conduz até o gatilho com um mapa errado** — e o
mapa errado é justamente o que faz a correção parecer trivial. Por isso a recomendação não
muda: **o item 3 deve ser retirado ou reescrito, não executado.** Se alguém quiser a prova
que ele pretendia dar, ela precisa de um alvo novo — a recusa por critério não é mais
observável neste banco, porque nenhum critério falha. Não editei a `46-VERIFICATION.md`;
fica aqui, e é o principal motivo para esta auditoria existir.

---

## A tabela: gap × categoria × evidência

| # | Gap registrado em 2026-08-23 | Categoria | Evidência medida hoje |
|---|---|---|---|
| **1** | «`cron.job_run_details` para o jobid 6 continua em ZERO linhas — 0 de 14 noites» | **1 · FECHADO por trabalho posterior** (estritamente: por passagem do tempo, o fechador que a própria VERIFICATION nomeou) | `cron.job_run_details WHERE jobid = 6` → **34 linhas, 34 `succeeded`, 0 falhas**, de 2026-08-24 00:00:00.075347-03 a 2026-09-26 00:00:00.089913-03, **34 datas distintas em 34 dias de intervalo** (nenhuma noite faltando). Corroborado do outro lado: **34 das 36 execuções do ledger em `dry_run` caem em 00:00:0x** e **todas as 34 têm item com `relato_dry_run`**. `sum(processados) = 0`, `sum(notificacoes_expurgadas) = 0`. As três causas alternativas estão excluídas nominalmente — ver §PRIMEIRO |
| **2** | «Criterio 2 do portao destrutivo continua VIOLADO para os applies de 46-05/06/07» | **3 · FECHADO por decisão registrada** | O bloco `overrides:` do próprio frontmatter (`decisao: aceito`, `data: 2026-08-23`, `decidido_por: Fernando (operador)`, razão «desvio CONSUMADO»). **Cobertura conferida commit a commit por `git log -1 --format=%cI`, não lida do texto:** `aa96052f` 00:50:55 (46-05) · `bd30684d` 01:30:39 (46-06) · `0f44e53a` 02:05:24 e `5351bde6` 02:07:45 (46-07) — os quatro anteriores a `13e53026` 02:23:42, cujo assunto é *«code review retroativo de 46-05/06/07»*. São **exatamente** os applies que o gap nomeia, e nenhum outro. A ressalva do override («não cobre nenhum apply futuro desta fase») **não tem sujeito**: o ledger de PROD tem as migrations `20260823000001`..`15` e **nenhuma migration de Phase 46 depois da `…0015`** |
| **3** | «HI-01 e HI-02 da 46-REVIEW-4 continuam abertos» | **1 · FECHADO por trabalho posterior** | Commit **`74ef7c9a`, 2026-08-23T12:23:42-03** (*«HI-01 e HI-02 do 46-REVIEW-4 — a escrita fechada ganha guarda recorrente, e a vigilancia dos 14 dias passa a medir o criterio 3»*), presente em `origin/main`, nada pendente de push. Detalhe de cada um abaixo |
| **4** | «Fixture sintetica de PII residente em PROD sem decisao datada de destino» | **2 · AINDA REAL** | A fixture **está lá, inteira**: `public.candidatos` = 44 linhas, **8** com id `4601b000-%` **e** e-mail `fixture-p46+%@invalido.local` (os dois critérios concordam); `auth.users` = 46, **8** no mesmo namespace. **PII intacta**: 8/8 com `nome_completo`, `cpf`, `celular` e `data_nascimento` preenchidos; **0** com `deleted_at`. Nada foi removido, nada foi anonimizado. E **não há decisão datada**: o destino aparece como **recomendação** (`GUIA-VALIDACAO-FINAL.md:258`, item H6) e como plano (`RETOMAR-AQUI.md:181`), nunca como escolha assinada. O `§Teardown` do `46-07-RUNBOOK-FLIP.md` (`:315-340`) continua oferecendo **as duas saídas**, sem uma delas marcada. Detalhe e o achado novo abaixo |

**Contagem: 2 fechados por trabalho posterior · 1 fechado por decisão registrada · 1 ainda
real · 0 não-medíveis.**

---

## Gap 3, item por item — e a prova de que os dois consertos MORDEM

### HI-02 · a vigilância dos 14 dias nomeia o sinal do critério 3 — **FECHADO**

A `46-VERIFICATION.md` mediu `grep -n "relato_dry_run" 46-07-RUNBOOK-FLIP.md` = **0
linhas**. Hoje o mesmo grep dá **3 linhas**, e são as três que a `46-REVIEW-4` prescreveu:

- `:256` — a linha da tabela, com o texto do review: «`elegiveis > 0` mas NENHUM item com `relato_dry_run`» → «⛔ o motor não foi chamado nesta noite. Ela conta para os critérios 1 e 2 e **NÃO** para o 3 (desde a `…0014`). Investigar o ramo `WHEN OTHERS` do laço (g)».
- `:264` — a coluna **com `relato_dry_run`** no cabeçalho da planilha de acompanhamento.
- `:280` — a consulta `count(i.*) FILTER (WHERE i.relato_dry_run IS NOT NULL) AS com_evidencia`.

E a vigilância que a tabela instala **produziu o número que ela existe para produzir**: das
36 execuções de ensaio, **35 têm evidência** e a única sem é `e3115161` (22/08 20:03), que é
precisamente a execução que a `46-REVIEW-4` apontou como a que a tabela antiga deixaria
passar. O sinal discrimina.

### HI-01 · o invariante de privilégio da `…0015` tem guarda recorrente — **FECHADO, e exercitado**

A `46-VERIFICATION.md` mediu `grep -rn "has_table_privilege\|relacl" supabase/tests/` = **0
linhas**. Hoje o guarda existe em `supabase/tests/p46_purga_smoke.sql:3115-3144`, na forma
exata que o review prescreveu — **condição dentro do bloco `(d)` existente**, não asserção
letrada nova, `aclexplode(c.relacl)` com **allowlist de verbos tolerados**
(`SELECT`/`REFERENCES`/`MAINTAIN`), dono excluído, `grantee = 0` (PUBLIC) incluído, esperado
**conjunto vazio**, e `RAISE EXCEPTION 'P46P FAIL (d): a escrita de aplicacao em
config_purga REABRIU — [%]'`. O contador `(z)` continua em **27**, como o conserto prometeu.

**O guarda não está só escrito — ele roda.** `49-29-SUMMARY.md` registra
`P46P_REG_CONTADOR=27`, `exit 0`, em `run` puro, no commit `7d7ef2d5` de **hoje,
2026-09-26**. Desde o 49-28 o contador **sai da execução como linha**, então o 27 é lido, não
transcrito.

**E o invariante continua verdadeiro em PROD — com a população declarada antes do booleano:**

| Medição | Valor |
|---|---|
| `config_purga.relacl` | `{postgres=arwdDxtm/postgres, anon=rxm/postgres, authenticated=rxm/postgres, service_role=rxm/postgres}` |
| `relacl IS NULL` · entradas · linhas de `aclexplode` | **false** · **4** · **17** ← o guarda **tem sujeito**; o vazio adiante não é vacuidade |
| a consulta do guarda sobre `config_purga` | **conjunto VAZIO** |
| **controle:** a MESMA consulta sobre `public.candidatos` | **15 pares** (`anon:INSERT`, `authenticated:UPDATE`, `service_role:DELETE`, …) ← a forma da consulta **morde** |
| `has_table_privilege` × {`anon`,`authenticated`,`service_role`} × {INSERT,UPDATE,DELETE,TRUNCATE} | **`false` nas 12** |
| RLS em `config_purga` | ligada · **1 policy**, `config_purga_admin_read`, `polcmd = r` (LEITURA), `{authenticated}` |

O par «relacl com 17 linhas» + «controle com 15 pares» é o que separa *«o invariante vale»*
de *«a consulta não olhou para nada»*. Sem esses dois números o `(VAZIO)` seria a mesma
frase com significado oposto.

---

## Gap 4 — a fixture: o que medi, e o que ninguém escreveu

### Ela está lá, inteira

| Medição | Valor |
|---|---|
| `public.candidatos` total | **44** |
| ↳ id `4601b000-%` | **8** |
| ↳ e-mail `fixture-p46+%@invalido.local` | **8** (os dois critérios concordam — nenhum órfão) |
| `auth.users` total · no namespace | **46** · **8** |
| PII: `nome_completo` · `cpf` · `celular` · `data_nascimento` não-nulos | **8 · 8 · 8 · 8** |
| `deleted_at` não-nulo | **0** |
| `user_id` preenchido **e** conta em `auth.users` viva | **8 de 8** |
| `created_at` mais antigo | 2024-02-22 19:00:42-03 (a data retrodatada da fixture) |

34 noites de `dry_run` passaram por cima dela sem tocá-la — que é o comportamento correto e
está provado pelos `sum(processados) = 0`.

### A decisão continua não tomada — e a comparação com o H7 mostra a diferença

O gap pedia, textualmente: «*uma linha escrita no runbook dizendo qual das duas saidas do
§Teardown foi escolhida, e por quem*». O que existe hoje:

- `GUIA-VALIDACAO-FINAL.md:258` (**H6**): «*Recomendação: deixar a primeira noite em `live` destruí-las… **Alternativa**: `p46_teardown_fixture.sql` antes*» — uma recomendação **com a alternativa preservada**, sem autor e sem data.
- `RETOMAR-AQUI.md:181`: «*A primeira noite em `live` destrói as 5 fixtures, e é isso que se quer: a destruição delas é a prova (H6)*» — afirma o plano, mas não é decisão assinada.
- `46-07-RUNBOOK-FLIP.md:315-340` (**o arquivo que o gap nomeia**): **as duas saídas continuam lá**, nenhuma marcada, exatamente como em 23/08.

A linha vizinha mostra que a distinção não é preciosismo: o **H7** (destino dos fictícios)
diz «*Remover antes da divulgação das vagas, **como aprovado em 30/08***» — decisão, autor
implícito e data. O **H6** não tem nada disso. É o mesmo documento, dois itens adjacentes, e
só um deles decidiu.

### ⚠ O achado que muda o item: a saída recomendada **não dá conta de 3 das 8**

Medi titular a titular, e não pela contagem. `public.candidaturas_alem_da_janela()` devolve
hoje **5 elegíveis, todas fixture, zero pessoa real** — e as 5 são `pos1`, `pos2`, `pos3`,
`cap2`, `neg-vaga`. **As outras 3 não são elegíveis, e não por defeito: por construção.**
Cada uma exercita uma exceção distinta do predicado, e medi qual:

| fixture | etapa | `elegivel_purga` da etapa | hold ativo | revisão Art. 20 pendente | elegível |
|---|---|---|---|---|---|
| `neg-etapa` | `entrevista_online` / `triagem` | **false** (fora da allowlist) | 0 | 0 | **não** |
| `neg-hold` | `aprovado` | true | **1** | 0 | **não** |
| `neg-art20` | `aprovado` | true | 0 | **1** | **não** |

Consequência, que não está escrita em lugar nenhum: **a primeira noite em `live` consome 5
das 8 fixtures. As 3 negativas sobrevivem a qualquer flip, indefinidamente** — porque a
razão de existirem é justamente não serem alcançáveis pela purga. E `RETOMAR-AQUI.md:181` e
o H6 estão **corretos sobre as 5 e silenciosos sobre as 3**.

O `§Teardown` do runbook chega perto mas erra o número: diz que, depois do flip, «*o
teardown remove apenas o resíduo (`vagas`, e o que não tiver `user_id`)*» — e **as 3
negativas TÊM `user_id` e conta viva em `auth.users`** (medido: 8 de 8). Então o resíduo
depois de uma noite em `live` é maior do que a frase descreve: **3 registros de PII sintética
em `public.candidatos` + 3 contas em `auth.users`**, alcançáveis só por
`supabase/tests/p46_teardown_fixture.sql`.

Isto é registro, não trabalho: `p46_teardown_fixture.sql` existe, é um único statement
idempotente com verificação de resíduo, e entra pelo namespace do e-mail — foi escrito
**antes** da fixture existir, por D-46-21, exatamente para este dia.

---

## O que falta de verdade na fase 46

### A · Trabalho de código/banco

**Nada.** Não encontrei um único item de implementação em aberto nesta fase.

- As 15 migrations `20260823000001`..`15` estão no ledger de PROD com os md5 que a `46-VERIFICATION.md` pinou (`…0014` = `1937a39c…`, `…0015` = `61dbd3f2…`).
- Os corpos vivos são os mesmos: `salvar_config_purga` = `e10786bd…`, `varrer_purga_retencao` = `72178564…`.
- A EF `purgar-retencao` está **ACTIVE**, versão **1** (nunca reimplantada).
- O smoke fecha **27/27** em `run` puro, exit 0, medido hoje (`49-29-SUMMARY`).
- Nada pendente de push: `git log --oneline origin/main..HEAD` = **vazio**.
- Os dois HIGH que restavam (HI-01, HI-02) foram consertados em `74ef7c9a` e o de banco (HI-01) está **exercitado** por execução verde, não só escrito.

### B · UAT / checkpoint do operador — 3 itens, e um deles mudou de natureza

| Item | Estado hoje |
|---|---|
| **Confirmar as janelas de `aprovado` e `decisao_final` em `/admin/retencao`** | ✅ **FEITO** em 2026-09-06 (§7.32). Medido agora: **0 etapas da allowlist em `seed`**, allowlist com 3 etapas. Era o único item do portão que o tempo não resolvia |
| **Provar `cron.alter_job` por execução** (desarmar e rearmar o jobid 6 num momento controlado) | ⏳ **ABERTO.** É a alavanca de emergência do runbook — corrigida de `UPDATE cron.job` (que levanta `42501`) para `cron.alter_job(job_id := 6, active := false)`, com privilégio, assinatura, `prokind` e `prosecdef` medidos, mas **a execução nunca provada**. Corroborado por ausência: as **34 datas distintas em 34 dias** mostram que ninguém desarmou o job nesse período — ou seja, a alavanca segue sendo a única peça do plano de incidente que não tem prova por execução |
| **Repetir a recusa do flip por sessão de admin real via PostgREST, esperando `22023` nomeando três critérios faltantes** | ⛔ **MORTO POR SUCESSO — o resultado esperado não acontece mais.** A chamada em si **é segura**: sem `p_confirmo_live := true` ela recusa em (6.a), antes do bloco dos critérios, e `modo` segue `dry_run`. Mas os três critérios que ela previa faltando **estão satisfeitos** (34 dias · 36 execuções · 0 etapas em `seed`), então a recusa vem com **mensagem diferente** — sobre o argumento ausente. Quem esperava a mensagem dos critérios lê «faltou um parâmetro» e acrescenta `p_confirmo_live := true`: **aí o flip executa.** Retirar ou reescrever o item, não executá-lo |
| **Decidir e DATAR o destino das 8 fixtures** | ⏳ **ABERTO** — é o gap 4. E, quando for decidido, precisa cobrir **8 e não 5**: a saída recomendada alcança apenas as 5 elegíveis |
| **O flip `dry_run → live` em si** | ⏳ Checkpoint do operador, portão verde desde 06/09, **sem pressa e sem prazo**. O runbook recomenda fazê-lo depois de haver gente real no sistema e **re-medir o conjunto elegível no instante** — medido hoje: **5 elegíveis, as 5 fixtures, zero pessoa real** |

### C · Escrituração — onde os documentos ficaram atrás do sistema

Nenhum destes é defeito de sistema; todos são registro desatualizado, que segundo o próprio
`CLAUDE.md` «custa o mesmo que registro ausente». **Não editei nenhum deles** (fora do
escopo desta auditoria), então ficam nomeados aqui:

1. **`46-VERIFICATION.md` → `re_verification.gaps_remaining`** lista 4 itens; hoje **1 é real**. O item 2 (critério 2 do portão) já estava coberto pelo `overrides:` do mesmo arquivo — o commit do override (`e7118d4c`, 12:26:40) veio **depois** do commit da verificação (`4538dc2f`, 11:41:11), e a lista não foi reescrita. A contradição é de ordem de commits, não de conteúdo.
2. **`46-VERIFICATION.md` → `human_verification` item 3** (`:257-260`) prevê uma recusa por **três critérios faltantes** que hoje estão todos satisfeitos. A chamada como escrita **é segura** (recusa na guarda da confirmação, em (6.a), antes dos critérios), mas devolve **outra mensagem** — e a correção que essa mensagem sugere ao leitor (`p_confirmo_live := true`) é exatamente o gatilho do flip. **É o item mais urgente desta lista**: não porque execute algo, mas porque **conduz** a um efeito irreversível com um resultado esperado obsoleto.
3. **`STATE.md:1284`** ainda lista como pendências herdadas o **HI-01** e o **HI-02** («*nenhum smoke mede `has_table_privilege`/`relacl`*»), fechados em `74ef7c9a` 3 minutos antes do override. Também repete «*o flip para `live` continua sendo 2026-09-06*» — data que passou.
4. **`GUIA-VALIDACAO-FINAL.md` H1/H2/H3** congelam a medição de 06/09 (13 dias, 15 execuções, 15 com evidência); hoje são 34 / 36 / 35. **H6** segue recomendação, não decisão. `:30` diz «35 candidatos — 11 sintéticos»; hoje são **44** com os mesmos **8** de fixture.
5. **`46-07-RUNBOOK-FLIP.md` §Teardown** descreve o resíduo pós-`live` como «`vagas`, e o que não tiver `user_id`» — e **as 3 fixtures que sobrevivem têm `user_id`**. A frase subconta o resíduo.
6. **O flip mudou de natureza, e nenhum documento registra a mudança nesses termos.** Até 2026-09-06 ele era **ação bloqueada**: o servidor recusava por critério, e aquela recusa era ela mesma a prova de que o cerco funcionava. Desde então ele é **decisão do operador**: **os critérios não são mais a barreira — a barreira é um argumento** (`p_confirmo_live`, a guarda (6.a)). E essa guarda protege, deliberadamente, contra *efeito colateral* e não contra *decisão precipitada* — o próprio `RAISE` diz isso: «*o flip nao pode ser efeito colateral de uma chamada que pretendia mudar outro campo*». Todo documento que ainda apresente a recusa por critério como salvaguarda viva está descrevendo um estado que acabou.

### O saldo

**A fase 46 não tem trabalho em aberto.** O que a mantém fora de `passed` é: (a) **uma
decisão de operador não datada** sobre 8 registros de PII sintética em produção — e essa
decisão precisa cobrir 8, não 5; (b) **uma prova por execução** da alavanca de emergência
(`cron.alter_job`); e (c) **escrituração** — cinco documentos que descrevem um sistema de
5 semanas atrás, mais o registro de que o flip trocou de natureza: de **ação que o servidor
bloqueava** para **decisão que só o operador toma**. A salvaguarda que resta é a guarda da
confirmação, e ela foi feita contra descuido, não contra pressa.

E o item que a fase inteira existia para provar está provado por observação, não por
argumento: **34 noites, 34 sucessos, 180 titulares avaliados, evidência do caminho do delete
em todas as 34, e zero linhas destruídas.**
