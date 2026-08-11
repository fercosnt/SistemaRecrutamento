---
phase: 45-motor-de-exclus-o-anonimiza-o
reviewed: 2026-08-11T00:00:00Z
review_round: 3
supersedes: 45-REVIEW-2.md
depth: deep
scope: motor destrutivo da Phase 45 apos o plano 45-14 (7 migrations + Edge Function + smoke + testes Deno), ANTES do primeiro apply
files_reviewed: 8
files_reviewed_list:
  - supabase/migrations/20260805000005_p45_plano_e_dry_run.sql
  - supabase/migrations/20260805000006_p45_anonimizar_candidato.sql
  - supabase/migrations/20260805000009_p45_claims_do_titular.sql
  - supabase/functions/executar-direito-titular/index.ts
  - supabase/functions/executar-direito-titular/index.test.ts
  - supabase/functions/executar-direito-titular/helpers.ts
  - supabase/tests/p45_motor_exclusao_smoke.sql
  - supabase/migrations/20260805000007_p45_retirada_e_evento.sql
findings:
  critical: 0
  warning: 6
  info: 0
  total: 6
status: findings
gate_verdict: >-
  APROVADO COM CONDIÇÕES. BL-01, BL-02 e BL-03 estão FECHADOS por mecanismo, e CR-01…CR-06
  continuam fechados. Zero BLOCKER. O portão destrutivo PODE ABRIR para o `apply` das sete
  migrations. NÃO abre para a execução REAL (não-dry-run) da Task 3 do 45-11 enquanto WR-A e
  WR-E estiverem de pé — as duas produzem estados terminais DEPOIS do passo 1.
---

# Phase 45 — Code Review BLOQUEANTE nº 3 do motor destrutivo (pós-45-14)

**Reviewed:** 2026-08-11
**Depth:** deep (SQL ↔ Deno ↔ catálogo de origem ↔ smoke, atacando os TRÊS fixes do 45-14)
**Status:** `findings` — **0 BLOCKER**, 6 WARNING (todos NOVOS; os 7 do round 2 continuam abertos à parte)
**Veredito do portão:** **APROVADO COM CONDIÇÕES** — ver a seção final.

---

## Sumário — e o que este relatório tentou quebrar

Eu não encontrei blocker. Digo isso primeiro e digo o que fiz para tentar encontrar um, porque
o valor deste relatório é o formato da garantia, não a conclusão.

**Os três fixes do 45-14 fecham os três blockers por MECANISMO, não por afirmação:**

1. **BL-01 fechado.** A normalização `v_dry_run := coalesce(p_dry_run, true)` mora no `DECLARE` e
   o corpo inteiro a lê. Confirmei por varredura que `p_dry_run` **não é consultado em ponto
   executável nenhum** (as 14 ocorrências restantes são a assinatura, a própria linha do
   `coalesce`, textos de `RAISE` e o `COMMENT`). E — o que importa mais — conferi os **quatro**
   sítios de leitura de `v_dry_run` um a um e `true` é o lado seguro nos quatro, **inclusive
   naquele em que "seguro" significa "pula um guard"**: a metade (c) é pulada sob `v_dry_run =
   true`, e isso só é seguro porque o terminador `:772` lê **a mesma variável**. Os dois estão
   acoplados por construção e não podem divergir. Ver a análise sítio a sítio abaixo.
2. **BL-02 fechado, e a enumeração agora bate EXATAMENTE com a severação.** Verifiquei o par
   `severação ↔ probe` para os dez pares envolvidos, não só para os quatro de autoria. Nem mais
   estreita (falso bloqueador) nem mais larga (falso negativo).
3. **BL-03 fechado, e a prova é executável.** O G13 voltou a medir `ponteiros` crus, a recusa nova
   veio depois da filtragem, e **eu rodei a suíte Deno contra a versão PRÉ-fix**: `(v2)` e `(v3)`
   falham lá e passam aqui, com **exatamente** 2 falhas e nenhuma regressão nas outras 76. Isso é
   mutation testing de verdade, e é a única das três provas do 45-14 que pôde ser executada.

**O que eu procurei e NÃO achei** — dito para o portão saber a forma da garantia:

- **Uma terceira instância do defeito de lógica de três valores.** Procurei em três frentes:
  (a) parâmetros booleanos — `p_dry_run` é o **único** booleano em toda a fase (7 migrations,
  8 funções); (b) colunas booleanas em predicado de guard — as únicas são `IS NULL`/`IS NOT NULL`
  sobre `deleted_at`/`encerrada_a_pedido_em`, que não são de três valores; (c) expressões
  consultadas por `IF` direto — restaram três (`IF v_tem`, `IF NOT v_auth`, `IF v_anon`), e as
  três são alimentadas por `EXISTS`/`has_*_privilege`, que **nunca** devolvem NULL. Registrei a
  terceira como **NW-05** por doutrina, não por alcançabilidade.
- **Um `NOT IN` novo em guard de papel.** Zero. Os três `NOT IN` do repositório (`000002:220`,
  `000007:230,464`) são todos sobre `etapa_atual`, que confirmei ser `NOT NULL DEFAULT 'triagem'`
  (`docs/sql/sql/13-tabela-candidaturas.sql:21`) — WR-07 continua fechado pelo dado, não pelo código.
- **Uma `(C8)` com a forma da `(C7)`.** Não é. A `(C7)` usava uuid sintético, contra o qual a
  versão defeituosa e a corrigida davam o mesmo `P0002`. A `(C8)` cria fixture REAL e discrimina:
  na versão defeituosa a chamada **retorna normalmente** (`v_lev = false`) e a asserção MORDE.
  Tracei os dois caminhos inteiros. O mesmo vale para o caso `(vi.d)`.

**O que reprova a execução real, e não o apply:** os 7 WARNINGs do round 2 continuam abertos
(`DI-45-14-02`). Minha posição sobre os três que o round 2 pediu está na seção própria — mantenho
**WR-A** e **WR-E** como condição, e **reduzo WR-C** com evidência nova de alcançabilidade.

---

## Veredito por blocker

| # | veredito | evidência conferida |
|---|---|---|
| **CR-01** | **FECHADO** | As três metades de pé (`000006:346-449`), agora com a intenção normalizada. Cenário 1 (o titular chamando por PostgREST) exige `p_dry_run := false` explícito **e** o estado que só o motor produz; cenário 2 perdeu o ator `rh` no ramo destrutivo (`:397-403`). A asserção de catálogo do pressuposto (`:982-1006`) mede a capacidade COMPOSTA (privilégio **E** (RLS desligada **OU** policy de UPDATE)) — reli e continua correta. |
| **CR-02** | **fechado, com a mesma ressalva** | `index.ts:828-843` conta em vez de reprovar; `:859-863` mede o pós-estado; `helpers.ts:172-177` lança no marcador de pasta. Ressalva **WR-A** de pé. ⚠ E o BL-03 acrescentou uma tensão nova com este fix — ver **NW-04**. |
| **CR-03** | **fechado** | `index.ts:504-534`, só para `acao='executar'`, comparação refeita em código (`:528`). Rastreei a interação com o BL-03: o reencontro entrega um `plano` que **sempre** tem `caminhos`, então `montarPlano` (e os dois guards novos) nunca re-executa numa retomada — o passo 0 não pode recusar um pedido que já passou por ele. `DI-45-13-02` continua declarado. |
| **CR-04** | **fechado** | `000006:603-610` inalterado pelo 45-14. Asserção de re-identificação por `split_part` em dois lugares, com fixture de valor real. |
| **CR-05** | **FECHADO** (era «parcialmente») | Parte 1 (`preferencias_notificacoes`, `:735-739`) intacta. Parte 2 agora **correta em escopo** — ver BL-02 abaixo. A recusa na EF (`index.ts:1076-1079`) continua ANTES da primeira mutação. Resíduos **WR-B** e **WR-C** permanecem como WARNING. |
| **CR-06** | **fechado** | Igualdade + cinto nos dois sítios (`000006:490-492`, `000005:227-229`). Fixture de intruso intacta. |
| **BL-01** | **FECHADO** | Ver a dissecação abaixo. |
| **BL-02** | **FECHADO** | Ver a tabela de escopo abaixo. |
| **BL-03** | **FECHADO** | Ver a prova por mutação abaixo. |

---

### BL-01 · os quatro sítios, um a um — e por que `true` é o lado seguro em TODOS

O orquestrador já verificou que o parâmetro cru saiu do corpo; não re-litigo isso. O que eu ataquei
foi a pergunta que ele deixou aberta: **algum dos quatro sítios inverte o sentido, de forma que
"seguro" vire "pula uma checagem"?**

| sítio | expressão | `NULL → true` faz o quê | é o lado seguro? |
|---|---|---|---|
| `:390` | `IF v_dry_run` | cai na forma de **LEITURA** da metade (b), que é a mais **frouxa** — aceita `rh` | **Sim.** Não concede nada novo: o `rh` já tinha o dry-run desde a opção B. E o desfecho do ramo é `P45DR`, que reverte. |
| `:436` | `IF NOT v_dry_run` | **pula o guard de INTENÇÃO** | **Sim, mas só por acoplamento.** Isto é o sítio perigoso, e ele é seguro *porque* `:772` lê a MESMA variável. Não há forma de o guard ser pulado e a transação persistir. |
| `:498` | `'dry_run', v_dry_run` | o retorno de `ja_anonimizado` reporta o modo REAL | **Sim.** Reportar o que o chamador digitou seria mentir sobre o modo. |
| `:772` | `IF v_dry_run` | **levanta `P45DR`, reverte** | **Sim.** É o que fecha o `:436`. |

**Enumerei todas as saídas do corpo que NÃO passam pelo terminador**, porque é ali que o
acoplamento poderia furar: `:347` (sem sessão, `42501`), `:394`/`:400` (papel, `42501`), `:446`
(intenção, `42501`), `:464` (`P0002`), e `:493` (`ja_anonimizado`). As cinco primeiras são
`RAISE` — abortam. A sexta é um `RETURN` que, por contrato provado na asserção `(ii)`
(`:1280-1291`), **não muta coluna nenhuma**. Não há saída persistente que escape ao terminador.

**A `(C8)` e o `(vi.d)` discriminam.** Tracei os dois caminhos:
- **versão corrigida:** `v_dry_run = true` → metade (b) na forma de leitura aceita `administrador`
  → metade (c) pulada → corpo executa → `P45DR`. A asserção **passa**.
- **versão defeituosa:** `IF p_dry_run` com NULL → **ELSE** (ramo destrutivo) → `administrador`
  aceito → `IF NOT p_dry_run` não tomado → (c) pulada → corpo executa → `IF p_dry_run` não tomado
  → **`RETURN` normal** → `v_lev = false` → a asserção **MORDE** na primeira linha.

Os dois usam fixture REAL (`v_cand_b` na migration, uma fixture própria na `(C8)`), não uuid
sintético. Conferi que `v_cand_b` **não é tombstone** no ponto em que `(vi.d)` roda — as chamadas
destrutivas anteriores sobre ele (`(v)`, `(vi.a-c)`) todas recusaram com `42501`, e o dry-run de
`(iii)` foi revertido pela subtransação de `EXCEPTION` — logo o ramo `ja_anonimizado` não
curto-circuita a medição em nenhuma das duas versões. **A `(C8)` não repete a forma da `(C7)`.**

Verificações estáticas que eu de fato executei sobre os blocos novos: aridade de `%` em
**194 `RAISE`** nos três arquivos (52 + 13 + 129) → **zero divergência**; contador do smoke:
24 incrementos de `smoke45m.pass` + 1 inicialização em `:273`, contra `v_esperado := 24` no `(z)`
→ **bate**; e a fixture da `(C8)` usa a mesma lista de colunas da fixture «Titular C» já
estabelecida no arquivo (`:1826-1831`), então não introduz risco de `NOT NULL` novo.

### BL-02 · a enumeração e a severação, par a par

Confrontei **cada** par que a enumeração pode produzir contra o `WHERE` do statement que o severa:

| par | severação em `000006` | probe em `000005` | bate? |
|---|---|---|---|
| `candidatos.created_by` | `WHERE c.id = p_candidato_id` (`:571`) | `AND t.id IS DISTINCT FROM $2` (`:305`) | **exato** |
| `candidatos.updated_by` | idem | idem | **exato** |
| `candidaturas.created_by` | `WHERE c.candidato_id = p_candidato_id` (`:610`) | `AND t.candidato_id IS DISTINCT FROM $2` (`:306`) | **exato** |
| `candidaturas.updated_by` | idem | idem | **exato** |
| `historico_candidatura.ator` | `WHERE ... h.ator = v_user_id` (`:721`) — sem escopo | subtraído inteiro (`v_severadas`) | **exato** |
| `logs_acesso.user_id` | `WHERE ... g.user_id = v_user_id` (`:686`) | subtraído inteiro | **exato** |
| `autorizacoes.user_id` | `WHERE a.candidato_id = … OR a.user_id = v_user_id` (`:708-709`) | subtraído inteiro | **exato** (a `OR` torna-a ≥ escopo de `user_id`) |
| `preferencias_notificacoes.created_by/updated_by` | `WHERE v_user_id IS NOT NULL AND (…)` (`:738-739`) — sem escopo | subtraídos inteiros | **exato** |
| `candidatos.user_id` | escopado a `c.id` (`:561`), mas subtraído inteiro | — | **inócuo**: a `000004` a torna `SET NULL` (`confdeltype='n'`), filtrada em `:290`; e a coluna é `UNIQUE` (`02-tabela-candidatos.sql:14`), logo escopo de linha ≡ escopo de `user_id` |
| `decisao_final.por_usuario` | **não severada, por decisão** | enumerada **sem escopo** | **exato** — é bloqueador legítimo, e a recusa é o desfecho certo |

Nenhuma FK nova cai em regime errado: quem não casa `v_esc_candidatos`/`v_esc_candidaturas` vai
para o `ELSE` e é enumerada **sem** recorte, que é enumerar de mais — falha fechada. O
`IS DISTINCT FROM $2` (e não `<>`) está certo pelo motivo escrito. O SQL dinâmico continua com
`%I` nos identificadores e `USING` no valor; o `%s` recebe apenas um de três literais fixos.

Confirmei também a viabilidade da asserção `(vii)`: `v_user_b` é uuid fresco (base zero garantida
mesmo contra dados de PROD), `candidatos.created_by/updated_by` **não têm trigger** que os
sobrescreva (`02-tabela-candidatos.sql:55-56` e `13-tabela-candidaturas.sql:68-69` são colunas
puras), `v_candtr` pertence a `v_cand_a` (≠ `v_cand_b`), e nenhum dos dois `UPDATE` da fixture
dispara os gatilhos de `net.http_post`, que são escopados por coluna. A asserção **discrimina**
contra a versão pré-fix: com os quatro pares subtraídos inteiros, `v_bl_alh = 0` e a `(vii)(b)`
morde. Duas ressalvas nela: **NW-01** e **NW-02**.

### BL-03 · a única prova desta rodada que pôde ser EXECUTADA

Ordem atual em `montarPlano`: G13 sobre `ponteiros` crus (`:1111-1113`) → filtragem de prefixo
(`:1124-1126`) → recusa de descarte integral (`:1133-1135`) → união. Correta.

**A recusa nova não pode disparar num titular que legitimamente tem zero objetos:** os dois guards
são gateados por `ponteiros.length > 0`. Um titular sem candidaturas, ou com `curriculo_url` toda
nula, produz `ponteiros = []`, os dois guards passam, `caminhos = doList` e o passo 1 carimba com
zero — que é o desfecho certo e é exatamente o que o comentário de `:872-874` promete.

**Prova por mutação, executada:** restaurei `index.ts` de `c1a74c6~1` num diretório de trabalho
isolado e rodei a suíte atual contra ele — `(v2)` e `(v3)` **FALHAM**, e apenas elas
(`76 passed | 2 failed`). Contra o `HEAD`: **`78 passed | 0 failed`**. As duas asserções novas
mordem o defeito que declaram e não são decoração.

---

## Os 21 guards — reconferidos contra os arquivos ATUAIS

| # | veredito | onde conferi agora |
|---|---|---|
| G1 | **sobreviveu — e a doutrina foi restaurada** | Zero `NOT IN` em guard de papel; `IS DISTINCT FROM` nas duas formas da metade (b) (`000006:391-402`) e em `000005:248-250`. A metade (c) deixou de ser NULL-aberta: `IF NOT v_dry_run` com `v_dry_run` já normalizado. `000007:230,464` inalterado, fechado pelo `NOT NULL` de `etapa_atual`. |
| G2 | **sobreviveu** | `000005:208-211`, `000006:346-349`. |
| G3 | **sobreviveu** | `(iv)` `:1348-1387` e `(v)` `:1389-1422`; ramo destrutivo mais estrito que o de leitura. |
| G4 | **sobreviveu** | Faixa em `:523-534`, sentinela em `:538-571`; provada por valor em `:1205-1207` (`1991-03-14 → 35-44`). |
| G5 | **sobreviveu** | `decisao_final` `:618`, `decisao_final_historico` `:631`. Reli **todos** os `UPDATE` de `:631` a `:756`: nenhum toca o par. O `UPDATE` de `candidaturas` (`:603`) continua ANTES dos dois. |
| G6 | **sobreviveu** | Varredura de `ALTER TABLE`/`DROP CONSTRAINT`/`DELETE FROM` nas 7 migrations: as únicas ocorrências são `000004` sobre `candidatos.user_id` (a S1, esperada) e `000001` sobre `solicitacoes_dados`. Zero sobre `historico_candidatura`, `decisao_final`, `decisao_final_historico`. |
| G7 | **sobreviveu** | Zero SQL sobre a tabela de objetos do Storage. As 12 ocorrências do token são prosa/`COMMENT`/string explicativa. |
| G8 | **sobreviveu, e o furo fechou** | Terminador `:772-777` ao fim do MESMO corpo, `plano_exclusao_titular` CHAMADA em `:456`. Um corpo só. Com `v_dry_run`, o terminador não pode mais ser pulado. |
| G9 | **sobreviveu** | `index.ts:899-903`; `(C7)` trata `P45DR` como falha; `(C8)` o exige como PASS no seu caso. |
| G10 | **sobreviveu** | `index.ts:968-975`: `try/catch` para a exceção síncrona + `if (retornoDelete?.error) throw`. Hard delete explícito. |
| G11 | **sobreviveu** | `index.ts:952-958` relê `postgres_concluido_em` do banco. |
| G12 | **sobreviveu** | `helpers.ts:157-183`: paginação com `MAX_PAGINAS`, erro de listagem lança, marcador de pasta lança. |
| G13 | **RESTAURADO** | `index.ts:1111-1113` mede `ponteiros` crus, ANTES da filtragem. Provado por mutação (acima). Ressalva **NW-04**. |
| G14 | **sobreviveu** | Divisão do espaço de IDs intacta e as chaves novas a seguem: `preferencias_notificacoes` por `v_user_id`; `candidaturas` por `p_candidato_id`; `logs_acesso`/`historico_candidatura` por `v_user_id`; `ai_call_logs`/`candidate_ai_decisions`/`recruiter_alerts`/`notificacoes_enviadas` por `p_candidato_id`; `autorizacoes` pelos dois. Os probes novos do BL-02 respeitam a mesma divisão (`t.id` em `candidatos`, `t.candidato_id` em `candidaturas`). |
| G15 | **sobreviveu** | `dedupe_key` re-namespaceada com `n.id` (`:754-755`). |
| G16 | **sobreviveu** | `network(set_masklen(...))` em `:684-685` e `:706-707`; provado por valor em `:1244-1250`. |
| G17 | **sobreviveu** | As sete CHECKs vivas exercitadas em `:1209-1237`. |
| G18 | **sobreviveu** | `ai_call_logs` com literal `jsonb` (`:652`); nullability das 4 colunas novas medida no catálogo em `:1017-1035`. |
| G19 | **sobreviveu** | `git log 5e6e2c8~1..HEAD` sobre `000003`, `000004` e `000007`: **zero commits**. |
| G20 | **sobreviveu** | Os quatro commits do 45-14 (`c1a74c6`, `ac0185d`, `0ed00a3`, `ce60dfc`) estão no histórico, sobre os quatro do 45-13. Nenhum bypass. |
| G21 | **sobreviveu, mesma ressalva** | `git diff d322f88..HEAD -- 20260805000009`: **vazio**. O ACL não foi tocado. Ressalva **WR-F** de pé. |

**A `(C2)` continua válida, e conferi a CONSEQUÊNCIA e não o diff.** Ela chama
`anonimizar_candidato(<uuid sintético>, true)` — `true` **literal**, onde `coalesce(true, true)`
é identidade. No contexto «papel candidato», `v_dono` resolve NULL e as três comparações da forma
de LEITURA da metade (b) são TRUE → `42501`; no contexto «sem claim», a metade (a) recusa antes.
**As dez recusas continuam medindo o que declaram.** O bloco não foi tocado desde `d322f88`
(`git diff` do `$c2$`: zero linhas). ⚠ Uma discrepância de contagem de octetos: ver **NW-06**.

**E eu recomputei os dois `md5(prosrc)` por execução, com a receita do próprio smoke:**

| função | `md5` medido agora | octetos | bate a tabela do `45-14-SUMMARY.md`? |
|---|---|---|---|
| `plano_exclusao_titular` | `97634d07ef13447e06741a8c8372fca6` | 21349 | **sim** |
| `anonimizar_candidato` | `8c86e0f040219e7eade47eb587dbf5de` | 34488 | **sim** |

Cada delimitador aparece exatamente **duas** vezes, o corpo extraído começa em `\nDECLARE` e
termina em `);\nEND;\n` nos dois casos. O handoff nº 1 do 45-14 é **verdadeiro**, e a tabela do
`45-13-SUMMARY.md` está de fato invalidada.

---

## WARNINGS NOVOS

### NW-01 · A `(vii)` prova o recorte da PRÓPRIA LINHA só para `candidatos` — a coluna de recorte de `candidaturas` fica sem prova, e errá-la recusaria TODA exclusão legítima

**Arquivos:** `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:1548-1576`;
`supabase/migrations/20260805000005_p45_plano_e_dry_run.sql:304-308`

A `(vii)` tem três medições: base zero, `(a)` autoria na própria linha de `candidatos` → **não**
bloqueia, `(b)` autoria em linha alheia de `candidatos` **e** de `candidaturas` → bloqueia. Falta
a quarta: **autoria na própria candidatura do titular → não bloqueia.**

Isso importa porque as duas tabelas usam **colunas de recorte diferentes** (`t.id` versus
`t.candidato_id`), e a assimetria é justamente onde um erro nasce. Suponha que alguém escreva
`' AND t.id IS DISTINCT FROM $2'` também para `candidaturas` — comparando o id da *candidatura*
com o id do *candidato*, que nunca são iguais:

- a `(vii)(a)` não olha `candidaturas` → passa;
- a `(vii)(b)` usa `v_candtr`, que é de **outro** candidato → passa;
- a asserção de `000005:604-621` («pelo menos um titular vivo vem com a lista vazia») também
  passa, porque a SONDA 6 §6a mediu **0 linhas** nessas quatro colunas em PROD.

**As três asserções da fase passariam com o recorte errado.** O efeito só apareceria no primeiro
pedido real de um titular que tenha `candidaturas.created_by = <o próprio uid>` — e essa é a
gravação NORMAL de quem se candidata por si mesmo. `bloqueadores_deleteuser` viria não-vazia, a EF
recusaria em `index.ts:1077`, e **nenhuma exclusão jamais completaria**. É o falso-POSITIVO que o
comentário de `000005:576-580` diz existir para evitar, no único par que ele não mede.

**O código de hoje está CERTO** — conferi `:306` linha a linha. Isto é um furo de asserção, não um
defeito ativo. Mas é literalmente a forma pela qual o BL-02 passou pela `(C7)` e pela asserção de
`000005`: uma prova que não alcança o par que ela existe para pinar.

**Fix.** Um quarto bloco na `(vii)`, custo ~8 linhas, usando uma candidatura **do próprio**
`v_cand_b`:

```sql
    -- (c) Autoria na PROPRIA candidatura do titular: o tombstone a severa, logo nao bloqueia.
    --     ⚠ A coluna de recorte de `candidaturas` e `candidato_id`, NAO `id` — e essa e a
    --     assimetria com `candidatos` que nenhuma outra assercao da fase mede.
    INSERT INTO public.candidaturas
      (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura, updated_by)
    VALUES (v_cand_b, v_vaga, 'triagem', 'rejeitado', false, now() - interval '31 days', v_user_b);

    SELECT count(*) INTO v_bl_prop_c
      FROM jsonb_array_elements(
             public.plano_exclusao_titular(v_cand_b) -> 'bloqueadores_deleteuser') x
     WHERE x ->> 'tabela' = 'public.candidaturas' AND x ->> 'coluna' = 'updated_by';

    IF v_bl_prop_c <> 0 THEN
      RAISE EXCEPTION 'P45-TOMBSTONE (BL-02/propria candidatura): candidaturas.updated_by numa candidatura DO PROPRIO titular apareceu como bloqueador (%). O recorte de candidaturas e t.candidato_id, nunca t.id — com t.id o probe nunca exclui nada (id de candidatura jamais e igual a id de candidato) e o motor RECUSA TODA exclusao legitima, porque quem se candidata escreve a propria autoria', v_bl_prop_c;
    END IF;
```

⚠ Este bloco tem de vir **antes** de `(vii)(b)`, senão a candidatura nova entra na contagem de
`v_bl_cand`. E como ele cria uma candidatura, o `status = 'rejeitado'` é obrigatório pelo mesmo
motivo já escrito em `:1112-1117` (survivor-guard dos dois `AFTER INSERT` com `net.http_post`).

---

### NW-02 · A `(vii)(b)` ABORTA O APPLY se qualquer um dos quatro pares deixar de ser `NO ACTION` — e a mensagem culparia o BL-02

**Arquivo:** `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:1564-1576`

A `(vii)(b)` exige `v_bl_alh <> 0 AND v_bl_cand <> 0`. Mas o probe só enumera FKs com
`confdeltype IN ('a','r')` (`000005:290`). Se `candidatos.updated_by` ou `candidaturas.updated_by`
estiver com `SET NULL`/`CASCADE` no catálogo vivo no dia do apply, a chave **não** aparece — e a
asserção dispara com a mensagem do BL-02, que descreve um falso-negativo de escopo que **não é o
que aconteceu**. O apply de `20260805000006` para, e quem investigar vai procurar um defeito de
recorte que não existe.

É a classe exata que o prompt deste review nomeia: *uma asserção que falha pelo motivo errado é
pior que nenhuma*. E ela é especialmente cara aqui porque **essas asserções nunca foram
executadas** — a primeira vez que alguém as verá rodar é o apply em PROD.

A evidência atual está a favor (`45-SONDAS-PROD.md:205-212` mede os quatro como `NO ACTION`), mas
a SONDA é de 2026-08-05 e o bloco inteiro existe porque «pressuposto em prosa» não é aceitável
nesta fase — o mesmo argumento que produziu a asserção de catálogo de `:967-1006`.

**Fix.** Uma precondição de catálogo antes da `(vii)`, com diagnóstico próprio:

```sql
    -- ⚠ A (vii) SO mede o escopo se os quatro pares forem enumeraveis. Se um deles deixar de
    --    ser NO ACTION/RESTRICT, a chave nao aparece e a (vii)(b) falharia com a mensagem do
    --    BL-02 — culpando um defeito de recorte que nao aconteceu.
    SELECT count(*) INTO v_fk_bloq
      FROM pg_constraint c
      JOIN pg_class cl    ON cl.oid = c.conrelid
      JOIN unnest(c.conkey) k(attnum) ON true
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
     WHERE c.contype = 'f' AND c.confrelid = 'auth.users'::regclass
       AND c.confdeltype IN ('a','r') AND array_length(c.conkey,1) = 1
       AND (cl.relname, a.attname) IN (('candidatos','updated_by'), ('candidaturas','updated_by'));

    IF v_fk_bloq <> 2 THEN
      RAISE EXCEPTION 'P45-TOMBSTONE (BL-02/precondicao): candidatos.updated_by e/ou candidaturas.updated_by deixaram de ser FK NO ACTION/RESTRICT para auth.users (encontradas %/2). A SONDA 4c as mediu NO ACTION em 2026-08-05. Sem elas o probe nao as enumera, a (vii) mediria vazio e a mensagem seguinte culparia um defeito de escopo que nao aconteceu. Se a mudanca foi deliberada, a lista v_esc_* de 20260805000005 precisa ser revista no mesmo commit', v_fk_bloq;
    END IF;
```

---

### NW-03 · A recusa NOVA do BL-03 vira `causa='falha_storage'` — indistinguível das outras cinco, num pedido que já não tem caminho de operador

**Arquivos:** `supabase/functions/executar-direito-titular/index.ts:1133-1135`, `:787-803`;
`supabase/migrations/20260805000001_p45_pedido_exclusao.sql:301-310`

O vocabulário FECHADO de `causa` tem **quatro** valores, um por SISTEMA
(`falha_storage`, `falha_postgres`, `falha_auth`, `falha_recibo`). A `classe` — que é o que
distingue `todos_os_ponteiros_fora_do_prefixo` de `estrutura_vazia`, `list`,
`leitura_ponteiros`, `remove`, `list_pos_remove` e `residuo_apos_remove` — vai **só para o log
redigido** (`:1030`), nunca para a linha.

O BL-03 acrescentou o **sétimo** membro dessa classe de colisão. Some-se a isso o que já está
declarado: `acao: 'executar'` não tem gatilho agendado nem ação de operador (WR-09,
`deferred-items.md:344`). O desfecho é: o pedido fica em `situacao='executando'` com
`causa='falha_storage'`, respondendo 500 a cada tentativa, **sem nada na linha que diga qual das
sete condições parou o passo 1** e sem ninguém para agir. Os 15 dias do ERASE-06 correm.

Não é destruição — é o lado seguro. Mas é uma recusa opaca e permanente num fluxo cuja
alcançabilidade acabou de aumentar.

**Fix (barato, e não muda o vocabulário fechado).** Persistir a `classe` no `plano`, que já é a
coluna que sobrevive ao pedido:

```ts
    // ⚠ A `causa` nomeia o SISTEMA; a `classe` nomeia a CONDICAO. O vocabulario fechado do
    //   CHECK nao comporta a segunda, e o log redigido nao e consultavel por quem opera o
    //   pedido. Sete classes distintas colapsam hoje em `falha_storage`.
    await supabaseAdmin.from("solicitacoes_dados")
      .update({ causa: causaDaFalha(passo), plano: { ...(estado.plano ?? {}), ultima_classe: classe } })
      .eq("id", pedidoId);
```

Alternativa mais barata ainda: registrar em `deferred-items.md` que `causa='falha_storage'` cobre
sete condições e que o diagnóstico exige o log da invocação — hoje isso não está escrito em lugar
nenhum.

---

### NW-04 · O G13 restaurado torna «TODOS os ponteiros mortos» uma recusa permanente — e a SONDA 3 mediu esse estado como plausível

**Arquivo:** `supabase/functions/executar-direito-titular/index.ts:1111-1113`

A restauração está **certa** e eu a validei. Mas ela tem uma consequência que o round 2 não
nomeou e que vale declarar antes do primeiro pedido real, porque ela está em tensão direta com o
fix do CR-02.

O CR-02 fez, deliberadamente, um `ponteiro_morto` **individual** deixar de travar o passo
(`helpers.ts:227`, `index.ts:828-843`) — a razão escrita é que travar ali destruía CVs reais e
falhava identicamente para sempre. O G13, medindo `ponteiros` crus, faz o caso em que **todos**
os ponteiros estão mortos (`doList = []`) voltar a travar. As duas decisões são coerentes entre si
(um resíduo é ruído; a ausência total é enumeração quebrada), mas o gatilho não é hipotético:

> `45-SONDAS-PROD.md:165-170` — «Existe um único bucket com objetos (`curriculos`), com **5
> objetos** […] note a aritmética: **5 objetos para 9 candidaturas**.»

Ou seja: em PROD já existem `curriculo_url` sem objeto correspondente. Um titular cujas
candidaturas sejam **todas** desse conjunto entra em `estrutura_vazia` e **nunca** completa a
exclusão — sem caminho de operador (WR-09) e sem diagnóstico na linha (**NW-03**).

Não peço a inversão: falhar fechada aqui é a escolha certa, e o round 2 a exigiu. Peço que ela
seja **declarada** com o número da SONDA 3 ao lado, para que a primeira ocorrência não seja lida
como incidente novo. E vale registrar a saída manual (anular `curriculo_url` das linhas mortas,
sob revisão humana) como procedimento, já que é a única existente.

---

### NW-05 · `IF v_tem THEN` é a última expressão do caminho destrutivo decidida por um booleano não-normalizado

**Arquivo:** `supabase/migrations/20260805000005_p45_plano_e_dry_run.sql:327-332`

```sql
      EXECUTE v_sql INTO v_tem USING v_user_id, p_candidato_id;
      ...
      IF v_tem THEN   -- NULL aqui => o bloqueador SOME da lista => falha ABERTA
```

`v_tem` é alimentado por `SELECT EXISTS (...)`, que **nunca** devolve NULL — então isto não é
alcançável hoje, e eu o verifiquei antes de escrever. Registro-o mesmo assim por uma razão: este
arquivo dedica três comentários longos a proibir que qualquer decisão dependa de um valor de três
valores, e esta é a única linha do caminho destrutivo em que essa invariante está garantida por
uma propriedade do `EXISTS` que **não está escrita em lugar nenhum**. Se alguém trocar o
`SELECT EXISTS` por um `SELECT bool_or(...)` ou por um `SELECT <coluna booleana>` — mudanças que
parecem equivalentes — o bloqueador desaparece silenciosamente e o 23503 volta ao passo 3.

**Fix.** Um caractere de intenção e uma linha de razão:

```sql
      -- ⚠ `coalesce` e cinto: EXISTS nunca devolve NULL hoje, mas trocar a consulta por
      --   qualquer outra forma booleana faria `IF v_tem` nao ser tomado e o bloqueador
      --   SUMIR da lista — falha ABERTA na unica chave que impede o 23503 apos o passo 1.
      IF coalesce(v_tem, true) THEN
```

⚠ `true` e não `false`: um probe indeterminado tem de virar bloqueador, não silêncio.

O mesmo padrão, e a mesma inocuidade, em `20260805000009:223` (`IF NOT v_auth`) e `:228`
(`IF v_anon`), alimentados por `has_function_privilege` — que também não devolve NULL para um
`regprocedure` válido, já garantido pelo `IF v_proc IS NULL` de `:216`.

---

### NW-06 · O `45-14-SUMMARY.md` mede o `$c2$` numa convenção e as duas funções noutra — quem reconferir com a receita documentada acha divergência

**Arquivos:** `.planning/phases/45-motor-de-exclus-o-anonimiza-o/45-14-SUMMARY.md:344`, `:373`
(contra `:116-130`)

O SUMMARY afirma que o `$c2$` está «byte a byte idêntico — **2676** octetos antes e depois».
Recomputei com a receita do §PROVENIENCIA do smoke (a mesma que o documento imprime três parágrafos
acima, para os dois `md5`): o corpo entre os delimitadores tem **2668** octetos. A diferença é
exatamente 8 = `len("$c2$") × 2` — o SUMMARY mediu **incluindo** os dois delimitadores, e a receita
dos `md5` os **exclui**.

A afirmação é substantivamente verdadeira (o bloco não mudou, e conferi por `git diff`), mas o
documento usa duas convenções de medição sem dizer, e o consumidor dele é o operador do portão do
45-11, cujo procedimento é *«conferir contra a tabela deste documento»*. Uma divergência de 8
octetos numa asserção de não-divergência é exatamente o tipo de sinal que custa uma hora e que
pode ser lido como «alguém editou a `(C2)`».

**Fix.** Uma linha no `45-14-SUMMARY.md`: `2676 octetos INCLUINDO os dois delimitadores $c2$
(2668 pelo recorte da receita do §PROVENIENCIA, que os exclui)`.

---

## Os 7 WARNINGs do round 2 — minha posição, com evidência nova

Todos continuam **abertos** e estão registrados em `deferred-items.md:391-404` (`DI-45-14-02`).
Confirmei que nenhum foi tocado pelo 45-14: `user_id_presente` só aparece em `index.ts:1281` (a
previsão, não a recusa); não existe normalização de `plano.contagens`/`plano.achados_resumo`; e
`index.ts:859-863` continua reprovando resíduo sem uni-lo ao plano.

| # | posição do round 3 |
|---|---|
| **WR-A** | **MANTENHO como condição da execução real.** `plano.caminhos` congelado + conferência sobre o pós-estado do prefixo inteiro = trava permanente depois de os CVs originais já terem sido destruídos. Gatilho realista e não mitigado. |
| **WR-E** | **MANTENHO como condição da execução real.** `plano.achados_resumo.nao_devolvidos = …` (`:869`) roda **depois** do laço de `remove()`; um `TypeError` ali não é `ErroDePasso` e o `catch` de `:1027` atribui `"postgres"` por default — grava `falha_postgres` para uma execução que parou no **Storage, depois de apagar**. Duas linhas de `??=` fecham. |
| **WR-C** | **REDUZO, com evidência.** O round 2 pediu como condição; eu discordo do peso. Rastreei a alcançabilidade: o estado «`user_id` NULL + conta do Auth viva» só nasce (a) de um `UPDATE` manual, ou (b) do próprio passo 2 seguido de falha no passo 3 — e nesse segundo caso `montarPlano` **não re-executa** (`index.ts:810`, o `plano` já tem `caminhos`), então a enumeração vacuosa não chega a ser consultada. A FK `SET NULL` da `000004` só dispara quando a conta do Auth é **apagada**, e sem conta não há JWT nem reencontro. Continua WARNING legítimo (o contrato da função é frouxo), mas **não** é condição de portão. |
| **WR-B** | mantido. Bloqueadores transitivos não são enumerados e o `COMMENT` afirma mais do que a chave mede. A saída barata continua sendo restringir a afirmação. |
| **WR-D** | mantido. `bloqueadores_deleteuser` não é reavaliado numa retomada. |
| **WR-F** | mantido. `plano_exclusao_titular` sob `rh` é sonda de autoria arbitrária — e o BL-02 **aumentou** o alcance dela: os quatro pares de autoria, que antes eram subtraídos sem sequer serem consultados, agora são **probados** contra `candidatos` e `candidaturas` inteiras. A superfície do WR-F cresceu com este fix; a decisão continua defensável, mas passou a merecer a linha no `COMMENT` que o round 2 pediu. |
| **WR-G** | mantido. `updated_at` idêntico em todas as candidaturas do titular. |

Também mantenho aceito, com a mesma justificativa do round 2, o único fail-open **deliberado** que
resta no caminho destrutivo: `index.ts:1076-1077` — chave `bloqueadores_deleteuser` ausente não é
recusa. A defesa (o pin de `md5(prosrc)` da `(C3)`) é honesta, mas vale dizer com todas as letras
o que ela cobre: a `(C3)` roda **no portão**, não a cada execução. Um rollback da `20260805000005`
em PROD depois do gate desarma a recusa em silêncio. Não é achado novo; é o limite da garantia.

---

## Veredito do portão

**Zero BLOCKER. BL-01, BL-02 e BL-03 estão fechados por mecanismo, e CR-01…CR-06 continuam
fechados. Os 21 guards sobreviveram, e o G13 — o único que o round 2 declarou morto — foi
restaurado e a restauração foi provada por execução.**

**O portão destrutivo PODE ABRIR para o `apply` das sete migrations**, com estas condições:

1. **Antes do apply, fechar NW-02.** É a única das seis que pode **abortar o apply pelo motivo
   errado**, e as asserções nunca rodaram: a `(vii)(b)` acopla o sucesso do apply a um fato de
   catálogo que ela não verifica. Custo: ~10 linhas.
2. **Antes do apply, fechar NW-01.** O par `candidaturas`/`t.candidato_id` é o único recorte do
   BL-02 que nenhuma das três asserções da fase alcança, e errá-lo recusaria **toda** exclusão
   legítima. O código está certo hoje; a asserção é que não o pina. Custo: ~15 linhas, no mesmo
   commit da NW-02.
3. ⚠ **Os dois fixes acima mudam o corpo de `20260805000006`** — logo mudam o
   `md5(prosrc)` de `anonimizar_candidato`. A tabela do handoff nº 1 do `45-14-SUMMARY.md` tem de
   ser recomputada **no mesmo commit**, ou a `(C3)` do 45-11 vira parada imediata por uma edição
   legítima. (O `md5` de `plano_exclusao_titular` **não** muda se as duas correções ficarem só na
   `000006`; a NW-05, se aceita, muda os dois.)

**O portão NÃO abre para a execução REAL (não-dry-run) da Task 3** enquanto **WR-A** e **WR-E**
estiverem de pé. Os dois produzem estados terminais **depois do passo 1** — currículo destruído,
PII intacta, sem retomada — que é o custo exato que esta fase existe para não pagar. Retiro
**WR-C** dessa lista, com o rastreamento de alcançabilidade acima.

NW-03, NW-04, NW-05 e NW-06 **não bloqueiam nada**: são declaração, diagnóstico e cinto.

---

## O limite declarado desta revisão

Digo o que esta revisão **não** pode afirmar, para que o portão saiba a forma da garantia que está
recebendo:

- **As asserções SQL novas nunca foram executadas, e eu também não as executei** — não há Postgres
  local (`psql`/`docker` ausentes). O que fiz foi ler `(vi.d)`, `(vii)` e `(C8)` **como código** e
  tracear os dois caminhos (versão defeituosa × versão corrigida) até o desfecho, mais três
  verificações estáticas por execução: aridade de `%` em 194 `RAISE`, contagem do contador FIXO do
  smoke (24 + 1 init), e recomputação dos dois `md5(prosrc)` com a receita do próprio smoke. As
  três bateram.
- **A única prova por EXECUÇÃO desta rodada é a do BL-03**, e ela é forte: mutação real
  (`index.ts` de `c1a74c6~1`) → `(v2)` e `(v3)` falham e mais nada regride; `HEAD` → 78/78.
- **`EXPORT-03` continua não exercitado em produção**, então o caminho de leitura do Storage de que
  o passo 1 depende segue não-provado. Isso não mudou e não é achado desta fase.
- O primeiro apply será a **primeira execução** de `(vi.d)`, `(vii)`, `(C8)` e do bloco de
  auto-verificação inteiro. Uma falha ali é o gate funcionando; o que este relatório reduz é a
  chance de ela falhar pelo motivo errado (NW-01, NW-02).

---

_Reviewed: 2026-08-11_
_Reviewer: Claude (gsd-code-reviewer), depth=deep, round 3_
_Escopo: motor destrutivo da Phase 45 após o plano 45-14. Phase 47 fora de escopo._
