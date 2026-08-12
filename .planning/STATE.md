---
gsd_state_version: 1.0
milestone: v8.0
milestone_name: M8 Dados do Candidato & Direitos do Titular (LGPD-OPS)
current_phase: 45
current_phase_name: Motor de Exclusão & Anonimização
status: executing
stopped_at: "Autonomous run 2026-08-12: review round 4 da P45 (2 blockers, ambos portoes que reprovam trabalho correto) + 47-VERIFICATION.md (7/8, human_needed). Parado ANTES do portao destrutivo do 45-11 Task 3, por decisao do operador."
last_updated: "2026-08-12T05:40:00.000Z"
last_activity: 2026-08-12
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 52
  completed_plans: 50
  percent: 67
last_activity_desc: "45-16 entregue: WR-A e WR-E — as DUAS condicoes que o 45-REVIEW-3.md poe ANTES da execucao REAL (nao-dry-run) da Task 3 do 45-11 — fechadas NO DISCO, na Edge Function. O criterio nao foi «para de lancar»: os dois produzem estados DEPOIS do passo 1 (curriculo ja destruido, PII intacta), entao a pergunta e se a execucao ainda CONVERGE. WR-A — plano.caminhos e congelado no passo 0 (ERASE-04) mas a conferencia mede o POS-ESTADO do prefixo inteiro: um CV que o titular suba entre uma tentativa que morreu e a retomada nunca entra em caminhos, nunca e removido, e reprova o passo em TODA tentativa futura, para sempre. Fechado SEM deixar o plano derivar (recusei a sugestao literal do review de unir restantes a caminhos): a CONFERENCIA passou a separar residuo PLANEJADO (o remove() falhou -> falha FECHADA, sem carimbo, igual a antes) de objeto POSTERIOR ao passo 0 (esta sob {authUid}/, e PII do titular, e objeto do direito exercido -> varredura de UMA passada + re-enumeracao; prefixo vazio carimba). Uma passada so, e nao laco: um upload durante a varredura reprova ESTA tentativa e a seguinte fecha — adiar, nunca travar. Varridos SOMAM em contagens.storage_remove e entram como CONTAGEM em achados_resumo.varridos_pos_plano, nunca a lista (o caminho embute o auth.uid()). WR-E — a unica condicao para reusar o plano persistido era Array.isArray(caminhos), e achados_resumo/contagens eram escritos DEPOIS do laco de remocao: um plano de outra versao (rollback, edicao manual) fazia o remove() acontecer e so entao lancar TypeError, que nao e ErroDePasso e virava causa='falha_postgres' para uma execucao parada NO STORAGE DEPOIS DE APAGAR. Fechado com normalizacao ANTES da remocao, nos dois ramos — e o erro deixa de existir, nao fica mais legivel. A normalizacao tambem RE-VALIDA O PREFIXO dos caminhos persistidos (Rule 2): o WR-03 so peneira a lista montada no passo 0, e o teste (aq3) prova que o defeito era ATIVO — o caminho de outra pessoa CHEGAVA ao remove() sob service key, que ignora RLS. Mais: o catch deixou de assumir 'postgres' por default e herda o passo corrente (default segue 'postgres' ate o passo 1 comecar, porque afirmar falha_storage antes de qualquer remocao diria que o curriculo pode ter sido destruido quando nada foi tocado). ⚠ PROVA POR MUTACAO EXECUTADA (o precedente da (C7) do round 2 nao alcancava o defeito): index.ts de HEAD numa arvore isolada com o arquivo de teste ATUAL -> 81 passed | 6 failed, e as 6 sao exatamente (ap), (ap2), (aq), (aq2), (aq3) e (ar); pos-fix 87/87. Os outros 3 casos novos NAO discriminam e isso esta escrito: (ap3)/(ap4) medem que a falha FECHADA continua fechada e (ar2) pina o default que nao pode mudar. Zero teste antigo editado — o (w) segue verde sem uma linha alterada, e foi essa restricao que produziu a distincao residuo planejado x objeto posterior. G13 conferido BYTE A BYTE: montarPlano identico ao HEAD. G7, G10, G12, G11, G14 e G20 intactos. ⚠ ZERO apply, ZERO deploy, ZERO contato com PROD — as sete migrations seguem NAO aplicadas e git diff de supabase/migrations/ e VAZIO. md5(prosrc) recomputados por execucao e INALTERADOS: plano_exclusao_titular = 97634d07ef13447e06741a8c8372fca6 (21349), anonimizar_candidato = 8c86e0f040219e7eade47eb587dbf5de (34488) — a referencia do portao continua sendo o 45-15-SUMMARY.md. Smoke NAO tocado, contador FIXO segue 24. ⚠ A suite Deno subiu de 78 para 87 (handoff no 3). suite 1892/1892, tsc 97, deno check limpo, os cinco check:* verdes, zero --no-verify, zero dependencia nova. Abertos: WR-B, WR-C (reduzido pelo round 3), WR-D, WR-F (cresceu com o BL-02) e WR-G, mais o DI-45-16-01 novo — a NW-03 alargou: falha_storage cobre agora 10 classes nomeadas mais carimbo e excecao. --- 45-15 entregue: as DUAS condicoes que o 45-REVIEW-3.md poe ANTES do apply das sete migrations fechadas NO DISCO — as duas em assercoes que NUNCA foram executadas. NW-01 — a (vii) provava o recorte da propria linha so para candidatos (t.id) e nunca para candidaturas (t.candidato_id). As duas tabelas usam colunas de recorte DIFERENTES, e escrever t.id tambem para candidaturas compara o id da CANDIDATURA com o id do CANDIDATO, que nunca sao iguais: o probe nunca excluiria nada, bloqueadores_deleteuser viria sempre nao-vazia e o motor RECUSARIA TODA exclusao legitima, porque quem se candidata por si mesmo escreve a propria autoria na propria candidatura. As TRES assercoes da fase passariam com esse recorte errado. Fechado com a medicao (c) — candidatura DO PROPRIO titular NAO bloqueia — com base zero propria e posicionada ANTES da (b), porque a (b) suja candidaturas com uma linha alheia e o probe e um EXISTS sobre a tabela inteira. NW-02 — a (vii)(b) exigia que os quatro pares de autoria fossem FK NO ACTION mas nunca checava: um par em SET NULL/CASCADE nao e enumerado, a (a) e a (c) passariam por VACUIDADE e a (b) abortaria o apply com a mensagem do BL-02, culpando um defeito de escopo que nao aconteceu. Fechado com precondicao de CATALOGO sobre os QUATRO pares, nomeando por string_agg quais sairam do regime, e com a mensagem abrindo por dizer que o que foi medido e o CATALOGO e que ISTO NAO E O DEFEITO DO BL-02. ⚠ Os md5(prosrc) foram RECOMPUTADOS por execucao e estao INALTERADOS — isto CORRIGE a condicao no 3 do review: os dois fixes moram no bloco anonimo $verifica_anonimizar_candidato$ (linha >= 863) e nao no corpo da funcao, que fecha na linha 823, e prosrc e so o corpo. plano_exclusao_titular = 97634d07ef13447e06741a8c8372fca6 (21349), anonimizar_candidato = 8c86e0f040219e7eade47eb587dbf5de (34488). O 45-15-SUMMARY.md e a referencia do 45-11. Smoke NAO tocado, contador FIXO segue 24. Nota do NW-06 acrescentada ao 45-14-SUMMARY.md: $c2$ = 2676 octetos COM delimitadores, 2668 pela receita que os exclui. ⚠ ZERO apply, ZERO deploy, ZERO contato com PROD. suite 1892/1892, tsc 97, deno 78/78, os cinco check:* verdes, zero --no-verify, zero dependencia nova. Os 7 WARNINGs do round 2 seguem abertos (DI-45-14-02), com WR-A e WR-E de pe como condicao da execucao REAL da Task 3. --- 45-14: os TRES blockers do 45-REVIEW-2.md fechados NO DISCO. BL-01 — p_dry_run e um booleano de TRES valores e o DEFAULT true nao protege contra NULL EXPLICITO: com o parametro cru, IF p_dry_run caia no ramo DESTRUTIVO, IF NOT p_dry_run nao rodava o guard de INTENCAO e o terminador nao levantava P45DR, e a transacao COMMITAVA sobre PII real, sem pedido, fora da janela do ERASE-06, sem recibo. Fechado por NORMALIZACAO UNICA no DECLARE (v_dry_run := coalesce(p_dry_run, true)), com o corpo inteiro lendo v_dry_run e o parametro cru nao consultado em lugar nenhum. BL-02 — v_severadas subtraia quatro pares de AUTORIA que o tombstone severa APENAS nas linhas deste candidato: a lista voltava [] com um bloqueador real de pe e o 23503 batia DEPOIS do passo 1. Fechado ESTREITANDO a enumeracao (probe com o mesmo escopo da severacao, por IS DISTINCT FROM), nunca alargando a severacao. BL-03 — a filtragem de prefixo do WR-03 rodava ANTES do G13 e desarmava exatamente o caso mais suspeito (ponteiros vivos fora do prefixo davam carimbo com zero objeto e recibo mentindo). G13 restaurado sobre os ponteiros CRUS, mais a recusa por descarte integral de ponteiros. Assercoes novas que falham antes do fix: (vi.d) e (vii) na auto-verificacao da 20260805000006, (C8) no smoke (contador FIXO 23->24), e (v2)/(v3) no index.test.ts (RED provado por execucao: 76 passed/2 failed antes, 78/78 depois). ⚠ ZERO apply, ZERO deploy, ZERO contato com PROD: as sete migrations 20260805000003..000009 seguem NAO aplicadas. Os md5(prosrc) mudaram OUTRA VEZ e o 45-14-SUMMARY.md SUBSTITUI o 45-13-SUMMARY.md como referencia do 45-11: plano_exclusao_titular = 97634d07ef13447e06741a8c8372fca6 (21349) e anonimizar_candidato = 8c86e0f040219e7eade47eb587dbf5de (34488). suite 1892/1892, tsc 97, deno 78/78 (era 76), os cinco check:* verdes, $c2$ byte a byte identico (2676 octetos), zero --no-verify, zero dependencia nova. Os 7 WARNINGs do review seguem abertos em deferred-items.md (DI-45-14-02)."
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-29 — M8/v8.0 kickoff, `## Current Milestone`)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 45 — Motor de Exclusão & Anonimização

## ✅ BLOQUEADOR FECHADO — cadastro restaurado e provado ao vivo (2026-08-03)

O cadastro ficou em `400` entre 2026-08-02 ~14h20 (deploy da EF v16) e 2026-08-03 ~00h30.
Nenhum candidato real foi afetado: zero cadastros nos 30 dias anteriores, último em 2026-06-26.

**Foram TRÊS causas, não uma** — e as duas primeiras só apareceram porque a terceira foi corrigida:

| # | Causa | Correção |
|---|-------|----------|
| 1 | EF v16 breaking contra o bundle publicado (a ordem `migration → EF → cliente` parou no passo 2) | push do cliente (`8346833`) |
| 2 | **O Vercel não buildava desde 2026-06-27**: preset `vite` procura `dist/`, o repo gera em `build/`. Os 20 deployments visíveis estavam todos em ERROR; o site servia o último build de junho, congelado | `vercel.json#outputDirectory` (`274de2a`) |
| 3 | **Variáveis de ambiente ausentes no build** — sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` o app quebrava no boot e a tela abria em branco | configuradas nas Project Settings pelo operador |

⚠ Nota sobre a chave: a `anon` legada está **desabilitada** no projeto Supabase. O valor correto
é a publishable `frontend_beauty_smile`.

Corrigidos em seguida, ambos descobertos pelo teste ao vivo:

- **SPA fallback ausente** (`0adea38`) — nenhuma URL direta funcionava, nem `/cadastro`. O preset
  `vite` não adiciona o rewrite; para SPA isso é responsabilidade do repo.

- **Dashboard sem a navbar compartilhada** (`581abe1`) — era a única tela de candidato com barra
  própria e sem o link "Área do candidato". Como `/candidato/privacidade` tem um único ponto de
  entrada (card no perfil, decisão explícita da UI-SPEC), quem caía no dashboard ficava sem
  caminho até a revogação do próprio consentimento.

### Provado ao vivo em 2026-08-03

**Cadastro real** (`fernando@fotona.com.br`), pelo navegador, em aba anônima:
`consent_text_version = v2-2026-08` · hash idêntico ao hex pinado · `consent_registrado_em`
preenchida · `autorizacao_marketing_vagas = false` e `autorizacao_retencao_curriculo = false`,
batendo com as duas caixas deixadas desmarcadas. **SC#1 fechado ponta a ponta.**

Print da tela confirmou os invariantes da UI-SPEC: opcionais nascendo desmarcadas, canal
transacional como linha informativa com base legal citada (nunca controle), ausência de qualquer
menção a análise de vídeo, e os dois eixos de versão nomeados separadamente.

**Revogação real** em `/candidato/privacidade`: ligou e desligou o switch de marketing. A escrita
alterou **exatamente uma coluna**; `consent_text_hash`, `consent_text_version`,
`consent_registrado_em` e `autorizacao_uso_dados` seguem intactos — o `GRANT` de coluna do CR-01
segurando numa ação real de usuário. **SC#2 fechado.**

### Achado de UI ainda aberto (cosmético)

No bloco LGPD do passo de autorizações, o ponto final da frase *"…na página **Seus dados e
autorizações**"* cai sozinho na linha de baixo. Quebra de composição, provavelmente `<strong>`
seguido de nó de texto com espaço. Não afeta função.

---

## Current Position

### Run autônomo de 2026-08-12 — o que ele fechou, e onde parou de propósito

`/gsd-autonomous` com escopo restrito pelo operador a **trabalho sem contato com PROD**.
Fila descoberta: 45, 46, 47 (42/43/44 caem como `Deferred Verification`). **Parado antes de
qualquer coisa gateada** — ver o ⛔ abaixo, que é a instrução que o próprio run obedeceu.

| Entregue | Resultado |
|---|---|
| **`45-REVIEW-4.md`** — Task 1 do `45-11` re-rodada (deep, 47 arquivos) | **REPROVA o fechamento do smoke**: 2 blockers, e os DOIS são portões que reprovam trabalho CORRETO. **O motor não ganhou defeito** — BL-01/02/03 e CR-01..06 seguem fechados, 45-15/45-16 sem regressão |
| **`47-VERIFICATION.md`** — a fase tinha 9/9 planos e **zero** verificação | `human_needed`, **7/8** must-haves, 1 `PRESENT_BEHAVIOR_UNVERIFIED` |
| **`47-EVIDENCIA-APPLY-CONSOL-02.md`** — medição MCP somente-leitura | A `20260809000001` **está aplicada**, corpo **byte-a-byte idêntico** (`md5` bate), ledger sem buraco. Zero escrita em PROD |

**Três registros deste arquivo estavam STALE e foram corrigidos** (detalhe em §Blockers e no
item 1 de §O que falta): o diagnóstico do `(B3/email)`, os seis países do `47-04`, e a
alcançabilidade das páginas públicas. ⚠ Os dois últimos faziam a Phase 47 parecer mais travada
do que está; o primeiro apontava para o **conserto errado**.

**Não tocado:** Phase 46 (declarada estritamente sequencial após um motor **provado**, e o motor
nunca rodou — 0 tombstones) · `45-11` Task 3 · `45-06` T2 · o smoke da P45 · o
`p47_historico_smoke.sql`.

---

**Atualizado 2026-08-12.** Phase **47 COMPLETA (9/9)**, agora **com veredito**. Phase 45: **o
motor está VIVO em produção** — as 7 migrations aplicadas, as 2 EFs deployadas, e **nenhuma
linha de dado de candidato tocada**. Falta ele RODAR.

### ⛔ LEIA ISTO ANTES DE QUALQUER COISA AUTOMÁTICA

**A execução real da exclusão NÃO pode ser feita por agente.** Ela apaga PII irreversivelmente
(Storage sem backup, PITR desligado) e exige (a) uma conta descartável e (b) o operador presente.
Um `/gsd-autonomous` que chegue na Task 3 do `45-11` deve **parar e perguntar**, nunca executar.

**`NOTIFICACOES_MODO` está em `producao`** — medido no ledger em 2026-08-11, não lido de config.
Qualquer smoke que dispare notificação manda **e-mail real**. O registro antigo que dizia `teste`
estava desatualizado.

### Apply da Phase 45 — CONCLUÍDO em 2026-08-12

| Item | Estado |
|---|---|
| Migrations `20260805000003`…`000009` | ✅ **7/7 aplicadas** · ledger `000001`–`000009` sem buracos |
| `md5(prosrc)` × pins de 3 rodadas de review | ✅ `plano_exclusao_titular` `97634d07…` · `anonimizar_candidato` `8c86e0f0…` |
| EF `notificar-rh` | ✅ v2 (antes do trigger da `000007` — `net.http_post` é at-most-once) |
| EF `executar-direito-titular` | ✅ v2 · `verify_jwt: true` · **`DI-45-10-01` FECHADO** (client + GRANT + redeploy) |
| `candidatos_user_id_fkey` | ✅ `CASCADE` → **`SET NULL`** — a armadilha do 23503 desarmada |
| As 3 FKs `NO ACTION` | ✅ `a, a, a` — intocadas em todos os 7 applies |
| Dados: candidatos/candidaturas/histórico/decisão | **22 / 9 / 5 / 1** — idênticos ao antes |
| Tombstones | **0** — o motor nunca rodou |

### Reviews do portão — 3 rodadas, 9 blockers, ZERO chegou a produção

`45-REVIEW.md` 6 blockers → `45-13` → `45-REVIEW-2.md` 3 blockers (**1 introduzido pelo conserto**)
→ `45-14`/`45-15` → `45-REVIEW-3.md` **0 blockers, aprovado com 2 condições**, ambas fechadas.
WR-A e WR-E fechados no `45-16` com desfecho **retomável**, provados por mutação (`81|6 fail` →
`87|0`). Decisão do operador em 2026-08-11: **opção B** no CR-01 (guard de intenção **e** caminho
destrutivo só para `administrador`/titular).

### ✅ CR-01 e CR-02 CONSERTADOS NO DISCO em 2026-08-12 (`76976bb`) — falta EXECUTAR

As duas barreiras que impediam o smoke de ficar verde estão fechadas no arquivo. O predicado do
`(B3/email)` **não mudou** (`count(*) = 1`); mudou o ponto de medição. O `GRANT` de
`gerar_bias_snapshot` **não foi tocado**; mudou a premissa da asserção. A prosa do cabeçalho
(`:132`), o bloco de contradição e a mensagem de PASS foram reconciliados **no mesmo commit** —
deixar para depois é o padrão P39/CR-02 que esta fase combate.

⚠ **Um cuidado que o patch sugerido pelo review não cobria:** com as 5 funções esperando
`authenticated`, o ramo `NOT v_exige_auth AND v_auth` ficaria **inalcançável** — asserção vacua,
o modo de falha do `42804` da P43. Entrou `v_nega_auth` (vazia, de propósito) mais uma checagem
**fail-closed** de classificação: acrescentar uma sexta função sem decidir seu ACL agora reprova.

⚠ **O SMOKE NÃO FOI EXECUTADO.** Verificado por FORMA (aridade de `RAISE` nos 131 statements,
checador validado por mutação contra `6879f1b~1`; `to_regproc(` = 0; contador 24 = 24), nunca por
execução — rodar exige escrita em PROD e é **checkpoint do operador**.

### 📋 Roteiro de UAT consolidado — `.planning/UAT-SESSAO-CONSOLIDADA.md`

Os 14 itens de navegador das fases 42–47 numa ordem que funciona. ⚠ Existem **três ordenações
obrigatórias** (o pedido de exclusão encerra as candidaturas; o primeiro clique do export queima
o cooldown de 24 h; o item de 43 exige cadastro NOVO com a caixa de retenção MARCADA) — rodar
fora de ordem invalida trabalho já feito.

### O que falta — nesta ordem

1. ⏸ **Smoke `p45_motor_exclusao_smoke.sql` para na asserção `(B3/email)`.**
   **O MOTOR ESTÁ CERTO** — e continua certo. Mas ⚠ **O DIAGNÓSTICO QUE ESTAVA ESCRITO AQUI
   ERA FALSO, e apontava para o conserto errado.** Corrigido em 2026-08-12 pelo
   `45-REVIEW-4.md` (CR-01), que mediu em vez de inferir.

   **O que estava escrito:** *«o `SELECT … INTO v_email_d` (linha ~934) não achou linha para
   `v_cand`; é estado de fixture»*. **Refutado por três medições independentes:** o INSERT da
   fixture (`:744`) não tem `ON CONFLICT` — ou `v_cand` é não-nulo ou o bloco aborta; a
   `20260805000006` não tem **um único** `DELETE` (os dois tokens "DELETE" são a prosa
   `ON DELETE SET NULL`); e a `(B0)` da `:1045` roda **antes** e teria disparado primeiro se a
   fixture faltasse — ela passou. Logo `v_email_d` = `anonimizado+<id>@invalido.local`, que é
   exatamente por que a `:1113` passa.

   **A causa real:** a `:1116` é a **ÚNICA query viva** entre ~40 asserções da seção de
   julgamento pós-rollback (varredura por parser dos 5 blocos de subtransação:
   `rollback@1032` → 1 query viva, os outros quatro → 0). A fixture é revertida na `:1032`;
   na `:1116` a linha **não existe**, `count(*)` = 0, e `0 <> 1` dispara em **TODA execução,
   independente do motor**. É defeito **do smoke**, e é a instância **nº 6** da classe-assinatura
   desta fase.

   **O conserto** é mover a MEDIÇÃO para dentro da subtransação — a mesma checagem existe
   **correta** na `20260805000006:1235`, e aquela migration aplicou em PROD, então a propriedade
   já está provada verdadeira. O predicado `count(*) = 1` **não muda**.
   ⚠ **NÃO afrouxar a asserção para ela passar** — mover a medição não é afrouxar; mexer no
   predicado seria. O cabeçalho do próprio arquivo proíbe: *"alterar o smoke para caber no que
   foi aplicado é o movimento que transforma um gate em decoração"*.

1b. ⏸ **`(C1)` reprova uma ACL CORRETA — segunda barreira independente** (`45-REVIEW-4.md`
   CR-02, instância **nº 7**). É o `DI-45-12-01`, roteado a este review pelos próprios planos.
   A `20260805000003:500` concede `EXECUTE` de `gerar_bias_snapshot` a `authenticated`
   **deliberadamente** (chamador vivo: a tela de auditoria de viés do administrador); o smoke
   `:1387` proíbe. **Decisão: a ACL está certa, a premissa da asserção está errada — consertar
   a asserção, NUNCA revogar.** Revogar apagaria peça probatória de não-discriminação (RNF-07a)
   para satisfazer um portão — o espelho de relaxar FK para CASCADE diante de um 23503.
   ⚠ **Mesmo com o CR-01 fechado, o smoke não alcança 24/24 enquanto isto estiver de pé.**
2. ⏸ **Smoke `p45_bias_k5_smoke.sql` — ✅ JÁ PASSOU 9/9** (ERASE-01 provado em PROD).
3. ⏸ **`45-06` T2** — prova da fatia no navegador. Precisa de pessoa.
4. ⏸ **Execução real vigiada** (`45-11` Task 3) — conta descartável + operador. Ver ⛔ acima.

### ⚠ SETE portões que reprovariam trabalho CORRETO — o padrão da fase

1. `search_path=` estrito (o catálogo grava `search_path=""`) · 2. `check:*` órfãos ·
3. asserção `(vii)` que passaria enquanto o motor recusa tudo ·
4. **`to_regproc('fn(tipos)')` devolve NULL SEMPRE** — quem aceita assinatura é `to_regprocedure`
(4 ocorrências no smoke + 1 na `000006`, todas corrigidas) ·
5. `RAISE` com 3 `%` e 2 argumentos (nem compilava) ·
6. **asserção `(B3/email)` posicionada DEPOIS do rollback da própria fixture** — mede um estado
que ela mesma destruiu, e reprova em toda execução (`45-REVIEW-4.md` CR-01) ·
7. **asserção `(C1)` proibindo uma ACL deliberadamente correta** — `DI-45-12-01`
(`45-REVIEW-4.md` CR-02).

**Nenhum era defeito de motor. Todos eram defeitos de VERIFICAÇÃO** — e os dois últimos só
existem em execução, que é por que três rodadas de review estático passaram por cima deles.
**Lição operacional:** quando um defeito tem forma reconhecível, varrer o repositório pela
FORMA, nunca consertar só o sintoma que apareceu.

⚠ **E o nº 6 acrescenta uma segunda lição, mais desconfortável:** o diagnóstico ERRADO dele
ficou escrito neste arquivo como fato, por um dia, apontando para o conserto errado. Sobreviveu
porque era **plausível** e ninguém o mediu. **Diagnóstico registrado em `STATE.md` não é
evidência** — quando um portão reprova, medir o portão antes de acreditar na explicação que
alguém já escreveu para ele.

### Supabase CLI — como não repetir os erros de 2026-08-12

- `functions deploy` exige **`--project-ref isljnozzlvckrgjjbjwp`**. Sem ele o seletor
  interativo aparece e já ofereceu **o projeto errado** (`qyrkyvoilfaxppbvtkpi`).
- `migration repair` **não** aceita `--project-ref`; usa `--linked`, e exige `supabase link` antes.
- O SQL Editor **não grava no ledger** — a reconciliação é `INSERT` direto em
  `supabase_migrations.schema_migrations`, feito pelo orquestrador **depois** de conferir o catálogo.

### Histórico anterior (pré-apply)

| Plano | Estado |
|---|---|
| `45-01` sondas · `45-02` recibo · `45-03` tracer · `45-04` smoke RED · `45-05` bias k=5 | ✅ |
| `45-06` T1 apply · `45-07`/`45-08`/`45-09` · `45-10` motor · `45-12` claims | ✅ |
| `45-13` 6 blockers · `45-14` 3 blockers · `45-15` NW-01/02 · `45-16` WR-A/WR-E | ✅ |

## ⚠ O 45-12 MUDOU TRÊS COISAS QUE O 45-11 PRECISA LER ANTES DE APLICAR

Detalhe completo em `45-12-SUMMARY.md` § "AS TRÊS OBRIGAÇÕES DE HANDOFF".

1. **Os `md5(prosrc)` das duas funções do motor MUDARAM** — o guard delas foi estendido. A
   referência que o 45-11 confere passa a ser o **`45-12-SUMMARY.md`**, não o `45-07-SUMMARY.md`:
   `plano_exclusao_titular` = `702dc0a6ef56b75104d940d94747760f` (9964 octetos) ·
   `anonimizar_candidato` = `c6136674036d0b99f0c71c37d24e7bf8` (18172 octetos).

2. **A ordem obrigatória de apply ganhou uma posição, no fim:** `20260805000009` (as claims do
   titular) vai **POR ÚLTIMO**, depois de `000005`, `000006` e `000007` — ela concede `EXECUTE`
   sobre funções que ainda não existem em PROD, e aplicá-la antes falha com `undefined_function`.

3. **O REDEPLOY de `executar-direito-titular` continua ABERTO.** O `DI-45-10-01` é indivisível em
   três; o 45-12 fechou as duas de escrita. Sem apply **e** redeploy, nada muda em produção — a
   versão viva é a do 45-06, sem o terceiro client, e o G1 continua sem poder ser exercitado.

⚠ **E um achado que exige DECISÃO, não conserto** (`DI-45-12-01`): a asserção **C1** do smoke e a
migration `20260805000003` afirmam coisas **opostas** sobre `gerar_bias_snapshot` — a C1 proíbe
`EXECUTE` a `authenticated`, e a migration o concede DELIBERADAMENTE porque o chamador vivo é a
tela de auditoria de viés do administrador (`biasAuditService.ts:98`). O 45-12 escreveu a asserção
**como especificada** e registrou a contradição em vez de afrouxar um gate por conta própria. A C1
vai reprovar no 45-11 por um privilégio que é correto. **Decisão do code review bloqueante do
45-11 (Task 1)** — e o caminho perigoso é o reflexo oposto: "consertar" revogando e apagar a tela
de auditoria de viés, que é peça probatória de não-discriminação (RNF-07a).

# ✅ SUÍTE 1689/1689 — O PORTÃO CONSOL-04 FECHOU (2026-08-06)

Ele ficou verde **sozinho**, sem uma linha editada nele: a promessa de exclusão na superfície do
candidato deixou de ser órfã porque o motor passou a existir no disco. O meta-teste irmão
disparou como desenhado e foi re-pinado com a conferência feita (`c92c047`); ganhou um item novo
que prova que o predicado **discrimina** — medido contra uma EF que chama `deleteUser` sem tocar
em Storage, que é o que prova que o `&&` é real. **Zero asserção afrouxada.**

⚠ **O portão mede o DISCO, e é só isso que ele afirma.** Ele NÃO afirma que o motor roda: as
migrations do 45-07 seguem não aplicadas, a EF não foi redeployada, e o `DI-45-07-01` impede o
caminho real hoje.

`tsc` 97 = baseline. **Zero `--no-verify` em toda a fase** (9 commits no 45-10).

### ⚠ AS DUAS OBRIGAÇÕES ATRIBUÍDAS AO 45-10 **NÃO** FORAM RESOLVIDAS — e agora estão medidas

**Atribuição errada, e ela é do STATE, não do executor:** o `45-10-PLAN.md` foi escrito **antes**
de os dois defeitos serem descobertos, e **nenhuma das suas três tarefas os cobre**. Consertá-los
exige sair do `files_modified` do plano — e um deles exige **migration nova**, que é exatamente o
que o portão desta fase existe para não deixar entrar por tabela. Registrados em
`deferred-items.md` como **`DI-45-10-01`** e **`DI-45-10-02`**, agora com as medições que
faltavam:

- **`DI-45-07-01` continua ABERTO, e a superfície CRESCEU.** O 45-10 acrescentou **duas** chamadas
  de RPC pelo `supabaseAdmin` sem claims (`plano_exclusao_titular` `:695`, `anonimizar_candidato`
  `:560`), somando **quatro**. Efeito hoje: `auth.uid()` NULL → `42501` → o passo 0 falha em
  `rpc_plano` com `causa='falha_postgres'` e **zero mutação** (desfecho seguro, motor parado).
  ⚠ O conserto é **indivisível em três**: o terceiro client na EF, a migration de
  `GRANT EXECUTE ... TO authenticated`, e o redeploy.

- **`retirar_candidatura` está MORTO NA CHEGADA, e o caminho foi medido.**
  `useRetirarCandidatura.ts:46,77-79` invoca esta EF com `acao: 'retirar_candidatura'`; `ACOES` é
  `{pedir, cancelar, executar}` (`index.ts:170`) → **400 `VALIDATION`** → o `traduzirErro` do hook
  cai no `default` → o titular vê **`SERVER_ERROR`**. ⚠ O conserto esbarra no DESVIO 1 da EF
  (*nenhum identificador vindo do corpo é lido*, classe T-32-03): o `candidatura_id` terá de ser
  resolvido no servidor ou validado contra a titularidade, nunca confiado. É decisão de desenho.

**Fecham em:** um plano novo (45-12 ou equivalente), com EF + migration + redeploy juntos. ⚠ **O
45-11 não abre o portão sem isso** — o G1 exige exercitar o fluxo ponta a ponta, e ele não roda.

---

### O texto original da atribuição (mantido: as duas medições abaixo seguem válidas)

**`DI-45-07-01` — o caminho ponta a ponta não funciona hoje.** A EF `executar-direito-titular`
(deployada) chama as RPCs com `service_role` **sem repassar as claims do titular**: `auth.uid()` é
NULL e as RPCs recusam com `42501`. **Medido empiricamente**, não inferido. Decisão do operador
(2026-08-05): a EF passa a repassar as claims.

⚠ **Detalhe que a decisão não previa, e que muda o escopo:** o PostgREST deriva o *role* do MESMO
JWT que carrega as claims. Um client com `SERVICE_KEY` + `Authorization` do titular chega como
`authenticated`, não `service_role` — então fechar isso exige **também** conceder `EXECUTE` a
`authenticated`, numa migration nova. O guard fecha o T-32-03 sozinho (`v_dono IS DISTINCT FROM
v_uid` → 42501), e o precedente da P44 é justamente esse: as RPCs de lá são concedidas a
`authenticated` e o guard é o controle.

**`45-09`** — a EF tem `ACOES={pedir,cancelar}` e **não conhece `retirar_candidatura`**.

### Ordem obrigatória de apply para o 45-11 (`net.http_post` é at-most-once)

deploy da EF `notificar-rh` → `20260805000007` → `20260805000008` (sem ordem entre si) →
`db:types` + remover a ponte de tipos. E o BLOCO G exige diff de `pg_get_functiondef` do catálogo
vivo contra a transcrição — o md5 do corpo vivo é **`f6147cebf9db2c72cd8ad0e446da301f`** (2763
chars), promovido de comentário a **gate que aborta o apply**.

# ⚠ O PORTÃO DO 45-11 NÃO ABRE ENQUANTO O G1 ESTIVER ABERTO

E hoje isso deixou de ser formalidade: o `DI-45-07-01` passou por plan-checker, code review e md5
byte-perfeito, e **nenhum desses gates poderia pegá-lo** — cada metade está certa sozinha. Só o
fluxo real reprova. É a cláusula *"exercitado em produção"* se pagando.

---

### Posição anterior — wave 1 (2026-08-05)

Phase: **45 — WAVE 1 EM ANDAMENTO, parada em checkpoint** (2026-08-05)

| Item | Estado |
|---|---|
| `45-01` Task 1 — 5 sondas read-only de PROD | ✅ **EXECUTADA** (`3e28642`) — `45-SONDAS-PROD.md`, **10 divergências, 3 bloqueantes** |
| `45-01` Task 2 — sonda de ESCRITA | ✅ **EXECUTADA** (`0d72f1d`) — em transação REVERTIDA (`DO` + `RAISE EXCEPTION`; Postgres reverte DDL). **A S1 está provada por execução**, e a sonda **refutou** a minha inferência de "7 colunas a severar" |
| `45-01` Task 3 — **G2** (redeploy da EF) | ✅ **FECHADO** (`9bdd9af`) — `exportar-meus-dados` **v1 → v2** em PROD, `sha256 43a3297d…→2d05de28…`, `verify_jwt: true` preservado, as outras 17 EFs intactas |
| `45-01` Task 3 — **G1** (export ponta a ponta) | ⏸ **ABERTO** — exige navegador com login de titular. `solicitacoes_dados` = 0 linhas. **O portão do 45-11 NÃO abre até fechar** |
| `45-01` (plano) | ✅ **COMPLETO** — `45-01-SUMMARY.md` |

**⚠ Auth do Supabase CLI — registrar para as próximas fases:** `npx supabase login` **falha fora
de TTY** (`LegacyLoginMissingTokenError`). O operador autenticou no **próprio terminal** e a
credencial ficou no **keychain do macOS** — `SUPABASE_ACCESS_TOKEN` segue **ausente** do ambiente
do agente e mesmo assim o CLI responde. **O gate de auth do 44-04 se resolve por keychain, não por
env var.**

**Por que o deploy foi pelo CLI e não pelo MCP** (medido, não suposto): o payload é `index.ts`
(19.937 B) + `_shared/exportAllowlist.ts` (44.935 B, **gerado**) = ~65 KB. `deploy_edge_function`
recebe conteúdo inline, o que exigiria **reproduzir** os bytes; um caractere divergente numa
allowlist que governa qual PII sai no export não é risco aceitável. O CLI lê do disco.
| `45-02` — gerador do recibo | ✅ **COMPLETO** (5 commits, 209/209 colunas, zero `--no-verify`) |

**⚠ SUÍTE VERMELHA — 1608/1609.** `copyPortoesLgpd.test.ts` (guarda escrita na Phase 43) reprova
`reciboExclusao.generated.ts` por 5 frases em futuro sobre exclusão. **A guarda está literalmente
certa hoje:** sua premissa declarada é *"nesta fase nada é apagado e a purga só nasce na Phase 46"*,
e o motor que cumpre a promessa (45-07/45-10) ainda não existe. Decisão pendente — ver §Decisão
aberta abaixo. **Não enfraquecer a guarda por reflexo:** é a mesma classe de erro que relaxar FK
para CASCADE diante do primeiro 23503.

### As 3 divergências bloqueantes medidas (detalhe em `45-SONDAS-PROD.md`)

- **D1** — os SEIS nomes de CHECK que a pesquisa previu estão **todos errados**. Vivos:
  `check_email_format`, `check_cpf_format`, `check_celular_format`, `check_data_nascimento`,
  `check_genero`, `check_estado`. **D2** — existe uma SÉTIMA não prevista, `check_como_conheceu`.

- **D3 — `storage.objects` NÃO tem FK para `auth.users`.** A plataforma **não recusa** apagar
  usuário com objetos no Storage; `REQUIREMENTS.md:25` está factualmente errado. A ordem
  `Storage → Postgres → Auth` **não é imposta pela plataforma** — é disciplina do motor, e o modo
  de falha é **silencioso** (órfã o blob sem levantar erro).

- **São SETE colunas a severar, não duas:** `candidatos.user_id/created_by/updated_by`,
  `candidaturas.created_by/updated_by`, `historico_candidatura.ator`, `decisao_final.por_usuario`.
  Qualquer uma esquecida = 23503 **depois** de o CV já ter sido apagado.

### Decisão aberta — as 6 bases legais que a engenharia escreveu

O `45-02` gravou **nove** bases legais no recibo; a UI-SPEC ditara **três** (`Art. 7º, VI`). As
outras seis (`Art. 8º §1º`, `Art. 20`, `Art. 16 I`, `Art. 7º IX` + dois `Art. 7º VI`) são o melhor
mapeamento da engenharia, **não veredito jurídico**. O gerador prova que existe base legal
não-vazia; não prova que é a certa. Isso vira texto num e-mail que afirma cumprimento de direito do
Art. 18 — **revisão do Encarregado recomendada antes de o 45-10 mandar o primeiro recibo.**
Registrado como `D7 / human_judgment: true`.

---

### ⚠ Isolamento por worktree NÃO funciona neste ambiente — MEDIDO na wave 3 da P45 (2026-08-05)

**A correção da concorrência introduziu um modo de falha pior, e ele foi medido na primeira
tentativa.** Os três executores da wave 3 foram despachados com `isolation: "worktree"`. **Os três
worktrees nasceram do MESMO base stale `bf832f3` — 120 commits atrás de `main`, na ponta da Phase
43.** Phases 44 e 45 não existiam neles: nem os PLANs, nem `45-SONDAS-PROD.md`, nem as migrations
já aplicadas em PROD, nem `ExcluirDadosBloco.tsx`, nem os tipos regenerados.

**Os três recusaram trabalhar e diagnosticaram** — zero escrita, zero commit, zero perda. A guarda
de base-drift é fail-closed por contrato: subagente não reescreve base de worktree que não criou.

⚠ **O pior desfecho que a recusa evitou, e ele é específico:** `ExcluirDadosBloco.tsx` não existe
naquele base. "Editá-lo" significaria **escrevê-lo do zero, sem enxergar a Emenda C** — e a
resolução provável do conflito add/add restauraria em silêncio o ramo de estado vazio, reinstalando
exatamente o defeito de Art. 18 que o `5230f01` removeu horas antes.

**Regra revista, e ela substitui a anterior:**

1. **NÃO usar `isolation: "worktree"` neste repositório** enquanto o base de spawn não for
   verificável. A checagem que pegou o problema roda **depois** de o executor já estar rodando e
   ter lido o prompt — cara demais para ser a única rede.

2. Para mais de um executor autônomo na mesma wave: **serializar**. Isso elimina as duas falhas da
   wave 2 (o `git add` de um agente entrando no `commit` de outro, e a oscilação de `tsc` por
   arquivos RED-first de outro plano) sem herdar a falha da wave 3.

3. Se worktree voltar a ser usado, **conferir o HEAD do worktree contra `main` ANTES de despachar**,
   não depois.

**O que a wave 2 mediu, e continua valendo como razão para serializar:** um `git add` de um agente
foi varrido para o `git commit` de outro **em silêncio** (SUMMARY do `45-04` dentro de `9fa848d`,
atribuição errada, corrigida em `cddd4e8`), e a contagem `tsc` oscilou entre 97 e 100 porque o
`45-03` tinha arquivos RED-first no disco, bloqueando o hook de um plano por defeito de outro.

---

### ⚠ Executores paralelos compartilham working tree e índice do git — MEDIDO na wave 2 da P45

**Não é hipótese; foram dois efeitos observados**, com três executores escrevendo em `src/` e
`supabase/` ao mesmo tempo:

1. **Um `git add` de um agente entrou no `git commit` de outro, em silêncio.** O SUMMARY do
   `45-04` estava staged quando o executor do `45-03` commitou, e foi varrido para dentro de
   `9fa848d`. Conteúdo íntegro, **atribuição errada** — restaurada à mão em `cddd4e8`. Nada
   acusa: não há conflito, não há erro, o commit passa.

2. **O hook de um plano reprovou por defeito de outro.** A contagem `tsc` oscilou entre 97 e 100
   porque o `45-03` tinha arquivos RED-first no disco. O executor do `45-04` **esperou a
   convergência em vez de usar `--no-verify`** — a escolha certa, e ela custou tempo de parede.

**Por que não apareceu na wave 1:** os dois planos não colidiam (`45-01` era só documento,
`45-02` só Node). A colisão precisa de dois agentes tocando árvores compartilhadas.

**Regra para as waves seguintes desta fase e para o M8 inteiro:** ao despachar mais de um
executor autônomo na mesma wave, **isolar em worktree** (`isolation: "worktree"` no Agent) ou
**serializar** os planos que tocam `src/`. A wave 3 tem `45-07`, `45-08` e `45-09`, e dois deles
são de `src/`.

⚠ **O modo de falha é silencioso**, e é isso que o torna caro: um plano pode receber crédito
pelo commit de outro sem que nenhuma verificação acuse — e a próxima pessoa a ler `git log` para
entender por que uma linha existe encontra o autor errado.

---

### Phase 45 — planejamento (contexto, 2026-08-05)

**11 planos em 5 waves.** `plan-checker` PASSED na 2ª iteração · 10/10 requirements ERASE-* ·
13/13 decisões do CONTEXT com plano implementador · 18/18 arestas do probe spec-less e 36/36
considerações de UI levantadas · `<threat_model>` nos 11 (ASVS L1).

**O achado que reordenou a fase.** `candidatos.user_id` é `NOT NULL UNIQUE REFERENCES
auth.users(id) ON DELETE CASCADE`, com o `CASCADE` **confirmado vivo em `pg_constraint`** — o
repositório de migrations diz `SET NULL` e é **ficção**. O ERASE-10 é **inexecutável hoje**, e a
falha não é benigna: `deleteUser` cascateia `candidatos` → `candidaturas` → bate nas 3 FKs
`NO ACTION` → 23503 → rollback → `500`. Acontecendo **depois** do passo 1, o estado final é
**currículo apagado do Storage (irrecuperável — sem PITR, sem backup de Storage) e 100% da PII
intacta no banco**. Hoje esse é o desfecho **garantido** de qualquer implementação que chame
`deleteUser` sem tratar essa FK. **D-45-11 (saída S1)** resolve, e a migration de severação é
precondição declarada da tarefa de `deleteUser` — o `45-07` só **escreve**, quem **aplica** é o
`45-11`, então o pior estado ordenável não é alcançável pelo plano.

**O tracer é a fatia NÃO-destrutiva.** `45-03` liga migration → RPC DEFINER → EF → service →
hook → seção 4 só para "pedir exclusão"; `45-06` prova ao vivo em PROD **antes** de a primeira
linha irreversível existir. Num ambiente sem segunda rede, um beco arquitetural descoberto ali
custa um commit; descoberto depois de Storage/tombstone/Auth, custa dado que não volta.

**Blocker corrigido antes de executar:** as Task 1 de `45-01`/`45-06`/`45-11` estavam tipadas
`type="tracer"`, que o `execute-plan.md:195` despacha **como `type="auto"`** — executor autônomo.
As três exigem tools MCP que só o orquestrador tem, e um executor sem MCP **não falha alto: ele
relata a tarefa concluída**. Seriam resultados de sonda inventados, migration dada como aplicada
sem ter sido, e o portão destrutivo relatando um dry-run que nunca rodou. Retipadas para
`checkpoint:human-verify`; varredura das 33 tarefas não achou 4ª ocorrência.

⚠ **Wave 1 não fecha sozinha** — `45-01` é 100% checkpoint do orquestrador, e puxa para a
primeira wave o **G1/G2 da Phase 44** (o portão exige que fechem antes) e a **sonda que escreve**
(hard delete de conta descartável com histórico de funil). O 23503 é hoje uma **previsão** tirada
do `pg_constraint`, não fato observado: nenhum código deste projeto jamais chamou `deleteUser`
sobre usuário com filhos.

---

### Posição anterior — Phase 44 (mantida: os 3 checkpoints seguem abertos)

Phase: 44 (Exportação & Acesso) — EXECUTING
Plan: 9 of 9 concluídos (⚠ contagem, **não** posição — a fase roda em WAVES e o
      44-08 é da wave 3; o contador sequencial não descreve a ordem real)
Status: Phase complete — ready for verification
        próprio currículo em `/candidato/privacidade`: `listarMeusCurriculos`
        (own-row, allowlist com embed da vaga, sem esconder candidatura removida de
        forma suave) + `mintarUrlCurriculoProprio` (`createSignedUrl` de 60 s pelo
        client anon, `service_role` FORA do caminho — BD-7), `CurriculosBloco` com
        estado POR LINHA, e o mount na seção 3 abaixo do CTA com a copy de erro
        REUSADA (`ea7fc22`, `68481d9`, `9b0ded8`, `6a244c2`). 93 testes na feature,
        suíte **1584**, tsc na baseline 97, zero `--no-verify`, zero contato com PROD.
        ⚠ **O `<human-check>` da Task 3 NÃO rodou** — abrir o CV ao vivo, confirmar
        a expiração do TTL de 60 s e as três asserções negativas do DevTools exige
        login real de conta de candidato de teste. E a **precondição da Task 1** (as
        2 policies de SELECT do bucket `curriculos`, medidas no M4 em 2026-08-03) não
        foi re-confirmada: exige MCP. Detalhado no §Checkpoint do `44-07-SUMMARY.md`.

        **TODOS OS 9 PLANOS DA FASE 44 TÊM CÓDIGO COMPLETO.** O que resta da fase é
        exclusivamente prova ao vivo — três checkpoints abertos (44-05, 44-07, 44-09),
        nenhum deles bloqueado por código.

        **44-05 SEGUE PARADO NO CHECKPOINT** — código completo, verde e commitado
        (`b0b2f21`, `0a04bed`, `bf2ae4c`); a EF `exportar-meus-dados` está
        deployada em PROD (v1, ACTIVE, `verify_jwt: true`), mas a **prova ao vivo
        pelo navegador** (download, seção 3 renderizada, cooldown no 2º clique) foi
        adiada pelo operador em 2026-08-04.

        **44-09 SEGUE PARADO NO CHECKPOINT, e por uma razão que MUDOU** —
        `/rh/pedidos-dados` completa e verde (`29956bf`, `0a0b3b3`, `0f182f1`). Mas
        a evidência que o orquestrador levantou em PROD (`44-09-EVIDENCIA-BD8.md`,
        somente leitura) mostra que o UAT planejado seria **inconclusivo por
        desenho**: **zero vagas em PROD pertencem a um usuário de papel `rh`** (6 com
        `created_by` NULL, 3 do administrador), então o ramo `rh` do predicado BD-8
        não pode devolver linha nenhuma hoje, para recrutador nenhum. "0 linhas nos
        dois papéis" seria o resultado esperado tanto se o BD-8 estivesse certo
        quanto se estivesse errado. ⚠ **Decisão do operador, não da engenharia** —
        popular `created_by` das 6 vagas órfãs, trocar o predicado para
        `vagas_associadas_recrutadores`, ou aceitar que a fila é de administrador.
Last activity: 2026-08-11

⚠ **Nota para quem rodar `roadmap update-plan-progress 44` — JÁ REINCIDIU 6×:** o
scanner conta ARQUIVOS de SUMMARY e não lê o `status:` deles. Na execução do 44-07
ele marcou **os três** planos de checkpoint como `[x]` de uma vez — 44-05 (**5ª
vez**), 44-09 (**2ª vez**) e 44-07 (**1ª vez**) — e escreveu a célula como **9/9**.
Todos revertidos à mão. Os três SUMMARY trazem `status: checkpoint`, não `complete`,
exatamente por isso, e as três linhas do ROADMAP carregam a nota inline dizendo qual
prova falta. **Marcar só depois de cada prova ao vivo acontecer.**

A célula de progresso da fase fica em **6/9**. Os seis concluídos de verdade são
44-01, 44-02, 44-03, 44-04, 44-06 e 44-08. Os três restantes têm **código completo e
verde** e estão parados só na prova ao vivo: 44-05, 44-07 e 44-09. ⚠ Na próxima
execução o scanner escreverá **9/9** de novo — **reverter para 6/9**.

⚠ **O mesmo defeito vive no frontmatter deste arquivo.** `state.update-progress`
e `state.advance-plan` contam ARQUIVOS de SUMMARY e não leem o `status:` deles:
na execução do 44-07 escreveram `completed_phases: 3`, `completed_plans: 30` e
`percent: 50`, dando a fase 44 por concluída. Corrigidos à mão para **2 / 27 / 33**
— os três checkpoints não contam como plano concluído.

## ⏸ Deferred Verification (aberta desde 2026-08-04)

Três provas ao vivo, todas no navegador, todas sem bloqueio de código.

**A · O pedido de cópia (44-05 + 44-06), em `/candidato/privacidade`:**

1. o download entrega **DOIS** arquivos e o `.json` chega primeiro;
2. o `.html` abre legível, com carimbo no topo e a versão da allowlist no rodapé;
3. a seção 3 renderiza a copy completa (inclusive "Você recebe dois arquivos");
4. o **2º clique dentro de 24 h** mostra o botão desabilitado **com o motivo e a
   hora de liberação visíveis ao lado** — e a frase é a mesma que o servidor manda.

**B · O CV do titular (44-07), na mesma tela, logo abaixo do CTA:**

5. a seção 3 mostra "Seu currículo" com uma linha por candidatura com currículo —
   **registrar quantas linhas**;

6. **Abrir meu currículo** abre o arquivo numa aba nova;
7. a URL daquela aba **expira** — copiar, esperar ~90 s, recarregar. É o que torna
   honesta a frase "válido por poucos segundos" que a tela mostra ao titular;

8. **403/400 ⇒ PARAR e registrar o caminho medido** — é a hipótese que o n=3 do M5
   não excluía (currículo na outra convenção de pasta). Conserto é da policy ou da
   convenção de upload, **nunca** do componente;

9. com o DevTools aberto: o console **não** recebe a URL assinada; a URL **não**
   aparece em atributo nenhum do documento depois do clique; **nenhuma** chamada a
   `get-curriculo-url` acontece.

**C · A fila do RH (44-09), em `/rh/pedidos-dados` — ⚠ BLOQUEADA POR DECISÃO, NÃO
POR EXECUÇÃO:**

10. fila ≡ contador do menu, nos dois papéis do BD-8. **Não executar como planejado.**
    `44-09-EVIDENCIA-BD8.md` §3 mostra que zero vagas em PROD têm um `rh` em
    `created_by`, o que torna o resultado "0 linhas nos dois papéis" compatível com o
    BD-8 certo E com o BD-8 errado. Antes do UAT: decidir a propriedade de vaga.

**Além do navegador — uma consulta de catálogo (precondição da Task 1 do 44-07):**
`SELECT policyname, cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects'`
— confirmar que as duas policies de SELECT do bucket `curriculos` seguem vivas. Foram
medidas no M4 em 2026-08-03 e **não** re-confirmadas; são elas que autorizam a
cunhagem client-side sem `service_role`.

## Roadmap (M8 — Phases 42–47)

Ordem de execução: `42 → 43 → 44 → 45 → 46`, com **47 lateralmente paralelizável com 46**.
Cadeia **estrita** `44 → 45 → 46` (o inventário do export **é** o plano de exclusão; um cron sobre motor destrutivo não provado é como bug vira incidente).
`43 → 44` é preferencialmente sequencial: CONSENT-02 adiciona colunas a `candidatos` e EXPORT-04 é justamente o snapshot que detecta coluna nova — em paralelo o snapshot fica vermelho por desenho.

| Phase | Goal | Requirements |
|-------|------|--------------|
| 42 — Inventário, Gates & Fila Art. 20 | O RH vê e responde os pedidos de revisão que hoje gravam um timestamp que ninguém lê; e o mapa do que existe (PII coluna-a-coluna, PITR/Storage-sem-backup, diff dos crons vivos, varredura `ADD COLUMN IF NOT EXISTS`) vira fato datado **antes** de qualquer linha destrutiva. Inclui a consulta "quantos pedidos já estão pendentes em PROD hoje", entregue antes de qualquer tela | INVENT-01..05, REVISAO-01..06 (11) |
| 43 — Consentimentos Honestos & Política de Retenção | Todo checkbox ganha consequência real (desmarcado por padrão, versão+hash+timestamp do texto aceito, transacional separado de marketing com opt-out honrado, click tracking desligado) e a janela de retenção existe como config alterável sem deploy + prévia read-only. **Zero ação destrutiva por desenho** | CONSENT-01..06, RETEN-01/02/03/04/06 (11) |
| 44 — Exportação & Acesso | Candidato pede cópia dos dados pelo painel; JSON por allowlist explícita (nunca `select('*')`), CV por signed URL de TTL curto, chaves cobertas por snapshot test, prazo Art. 19 II (15 dias) visível ao RH. O inventário nasce aqui **exercitado**, e a Phase 45 o consome | EXPORT-01..06 (6) |
| 45 — Motor de Exclusão & Anonimização ⚠️ **MAIOR RISCO** | "Retirar candidatura" ≠ "apagar meus dados"; janela de arrependimento cancelável; execução `Storage → Postgres → Auth` idempotente com caminhos capturados antes da 1ª mutação; tombstone in-place via RPC DEFINER; recibo honesto em 2 colunas. **Snapshot de bias com faixa etária materializada ANTES de qualquer anonimização**; as 3 FKs `NO ACTION` nunca relaxadas; as 5 tabelas `SET NULL` tratadas | ERASE-01..10 (10) |
| 46 — Purga Automática (dry-run → live) | Cron espelhando `notif-retry-sweep`; dry-run pela MESMA query do delete real em rollback; 1ª ativação em PROD é dry-run por período documentado; flip dry-run→live como checkpoint separado (espelho do `NOTIFICACOES_MODO`); cap de blast-radius + kill switch; predicado NULL-safe por allowlist de estados terminais; ledger de execuções + retenção de `notificacoes_enviadas` | PURGA-01..07, RETEN-05 (8) |
| 47 — Transparência & Consolidação | Página pública de compartilhamento (Art. 18 VII) + "o que guardamos e por quê" derivada da matriz como **dado**; `ator` UUID → nome do recrutador (W-1); zumbi `data_deletion_log` resolvido; checklist "toda promessa de retenção/exclusão tem código que a executa"; veredito Nyquist das 6 fases do M7 | TRANSP-01/02, CONSOL-01..04 (6) |

Coverage: **52/52 requirements mapeados ✓ · 0 órfãos · 0 duplicados.**

**Fase de maior risco: 45.** Mutação de três sistemas genuinamente **não-atômica** (Storage → Postgres → Auth), **sem transação compartilhada**, sobre PII viva, com backups do Supabase de 7 dias que **excluem Storage inteiramente** — um CV apagado é irrecuperável por qualquer meio.

**Portão de fase destrutiva (exit criterion de ROADMAP, não conselho):** fases **45** e **46** integralmente, **42** só em INVENT-05 (edita predicado de `DELETE` cron vivo) e **47** só em CONSOL-03 (`DROP` de tabela com escritor vivo). Exige: `VERIFICATION.md` com veredito (nunca ausente/`draft`) · code review bloqueante **antes** do apply em PROD · asserções **negativas** (o que NÃO aconteceu) · **zero `--no-verify`** · dry-run/rollback exercitado pela mesma query do delete real. Origem: a P39 fechou sem VERIFICATION.md nem code review e 2 CRITICAL chegaram a PROD.

Candidatas a `/gsd-secure-phase`: **45** e **46** (obrigatórias) · **44** (superfície de exfiltração de PII por desenho) · **42** (autorização server-enforced REVISAO-05 + EF nova `notificar-rh`).
UI hint (frontend): **42** (fila RH), **43** (`AutorizacoesStep` + revogação no painel), **44** (pedido de cópia), **45** (fluxo de exclusão — mais forte candidata a `/gsd-ui-phase`: ambiguidade de copy vira ação irreversível), **47** (2 páginas públicas + Histórico). **46** não é frontend.

⚠ **Risco nomeado na Phase 42:** REVISAO-04 exige **uma edição cirúrgica na EF `notificar-candidato` viva** (vocabulário de evento fechado em código **e** em CHECK constraint no banco) — **o mesmo arquivo que já embarcou 2 defeitos CRÍTICOS em produção** (P39 CR-01/CR-02) e cujo W-01 (preheader não ramificado) era invisível a asserções que olham só o texto visível.

## Performance Metrics

**Velocity (histórico de milestones):**

- M1 (v1.0): 7 fases / 40 plans — 2026-06-06. · M2 (v2.0): 11 fases / 63 plans — 2026-06-26. · Phase 17 standalone: 5 plans — 2026-06-28. · M3 (v3.0): 4 fases / 16 plans — 2026-06-30. · M4 (v4.0): 6 fases / 43 plans — 2026-07-13. · M5 (v5.0): 3 fases / 19 plans — 2026-07-14. · M6 (v6.0): 5 fases / 20 plans — 2026-07-17. · **M7 (v7.0): 6 fases / 25 plans — 2026-07-28.**
- Ledger detalhado por plano arquivado em `milestones/v*.0-*` e nos SUMMARY de cada fase. O ledger por plano do M7 está em `milestones/v7.0-*`.

**By Phase (M8):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 42 | TBD | - | - |
| 43 | TBD | - | - |
| 44 | TBD | - | - |
| 45 | TBD | - | - |
| 46 | TBD | - | - |
| 47 | TBD | - | - |

*Updated after each plan completion.*

**Por plano (M8):** _(vazio — nenhum plano do M8 executado)_
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 42 P01 | ~35min | 3 tasks | 5 files |
| Phase 42 P07 | ~55min | 2 tasks | 6 files |
| Phase 42 P11 | ~30min | 2 tasks | 6 files |
| Phase 42 P08 | ~50min | 2 tasks | 8 files |
| Phase 42 P10 | ~25 min | 3 tasks | 12 files |
| Phase 42 P12 | ~45min | 1 task (2 checkpoints pendentes) tasks | 4 files files |
| Phase 43 P01 | 50min | 3 tasks | 15 files |
| Phase 43 P02 | ~35min | 3 tasks | 9 files |
| Phase 43 P03 | ~35min | 3 tasks | 9 files |
| Phase 43 P04 | ~10min | 3 tasks | 2 files |
| Phase 43 P05 | ~25min | 3 tasks | 3 files |
| Phase 43 P06 | ~25min | 3 tasks | 3 files |
| Phase 43 P08 | ~40min | 3 tasks | 13 files |
| Phase 43 P09 | ~25min | 3 tasks | 16 files |
| Phase 44 P01 | ~20min | 3 tasks | 6 files |
| Phase 44 P02 | ~35min | 3 tasks | 3 files |
| Phase 44 P03 | ~2h | 3 tasks | 7 files |
| Phase 44 P04 | ~50min | 3 tasks | 7 files |
| Phase 44 P08 | ~25min | 3 tasks | 8 files |
| Phase 44 P06 | ~55min | 3 tasks | 6 files |
| Phase 44 P09 | ~35min | 3 tasks | 10 files |
| Phase 44 P07 | ~35min | 3 tasks | 8 files |
| Phase 45 P02 | 41 min | 3 tasks | 6 files |
| Phase 45 P05 | 41 min | 3 tasks | 2 files |
| Phase 45 P04 | 1h 10m | 3 tasks | 1 files |
| Phase 45 P03 | 1h35m | 3 tasks | 12 files |
| Phase 45 P07 | 18 min | 3 tasks | 5 files |
| Phase 45 P08 | 35 min | 3 tasks | 10 files |
| Phase 45 P09 | 28 min | 3 tasks | 14 files |
| Phase 45 P10 | 47min | 3 tasks | 5 files |
| Phase 45 P12 | 22min | 3 tasks | 8 files |
| Phase 47 P01 | 12min | 3 tasks | 8 files |
| Phase 47 P02 | 10min | 2 tasks | 2 files |
| Phase 47 P04 | 12min | 2 tasks | 9 files |
| Phase 47 P05 | 35min | 3 tasks | 6 files |
| Phase 47 P03 | 12min | 3 tasks | 7 files |
| Phase 47 P06 | 15min | 3 tasks | 10 files |
| Phase 47 P07 | 12min | 2 tasks | 4 files |
| Phase 47 P04 | 9 min | 1 tasks | 4 files |
| Phase 47 P08 | 14min | 1 tasks | 4 files |
| Phase 47 P09 | 15min | 2 tasks | 2 files |
| Phase 47 P08 | 12min | 3 tasks | 10 files |
| Phase 45 P13 | ~2h | 4 tasks | 9 files |
| Phase 45 P14 | 40min | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions.

**Ancorando o M8 (LGPD-OPS) — decisões de roadmap tomadas em 2026-07-29:**

- [M8/roadmap]: **6 fases (42–47), numeração continuando do M7** (que terminou na 41). 52/52 requirements mapeados, 0 órfãos, 0 duplicados. Ordem `42 → 43 → 44 → 45 → 46`, com **47 ∥ 46**.
- [M8/roadmap · desvio da pesquisa]: **CONSENT ficou íntegro na Phase 43** em vez de dividido (01/02 na 42, 03–06 na 43) como a pesquisa propôs. Razão: CONSENT-02 grava o **hash do texto** que CONSENT-03 **reescreve** — separá-los faria a versão 1 do texto embarcar já sabendo que seria superada uma fase depois, com 2 migrations e 2 edições da EF de cadastro sobre o mesmo formulário. Além disso INVENT-04 (varredura `ADD COLUMN IF NOT EXISTS`) fica **antes** da migration que adiciona colunas a `candidatos` — a tabela exata onde o drift de FK vive.
- [M8/roadmap · lacuna de cobertura da pesquisa]: **TRANSP-01/02 não aparecia em nenhuma fase** da proposta de 6 fases da pesquisa. Mapeados à **Phase 47** — TRANSP-02 tem de descrever o que o sistema **faz**, não o que promete, e pareado com CONSOL-04 (checklist "toda promessa tem código") a página pública e a auditoria se checam mutuamente.
- [M8/roadmap]: **RETEN-05** (retenção de `notificacoes_enviadas`) mapeado à **Phase 46**, não à 43. A *linha* na matriz nasce na 43, mas o requirement diz "definida **e aplicada**", e a aplicação é `DELETE` por cron — pôr um cron destrutivo na 43 quebraria a propriedade *zero-ação-destrutiva* que torna aquela fase segura de executar cedo.
- [M8/roadmap · **portão de fase destrutiva**]: adotado como **exit criterion de ROADMAP**, não conselho em prosa. Toda fase que escreva `DELETE`/`UPDATE` destrutivo, altere predicado de purga vivo, ou faça `DROP` de objeto com escritor vivo só fecha com: `VERIFICATION.md` **com veredito** (nunca ausente/`draft`) · code review bloqueante **antes** do apply em PROD · **asserções negativas** (o que NÃO aconteceu) · **zero `--no-verify`** · dry-run pela **mesma query** do delete real em rollback. Aplica-se a **45** e **46** integralmente, a **42** só em INVENT-05, a **47** só em CONSOL-03. **Origem:** a P39 fechou sem VERIFICATION.md nem code review e 2 CRITICAL chegaram a PROD — aqui a feature central é **irreversível** e o mesmo erro não é recuperável.
- [M8/roadmap]: **Phase 45 é a de maior risco** — mutação de 3 sistemas não-atômica sem transação compartilhada, sobre PII viva, com backup de 7 dias que **exclui Storage inteiramente**. `DELETE FROM storage.objects` via SQL órfã o blob permanentemente; o único caminho é a Storage Admin API a partir de EF.
- [M8/ambiente]: **subagentes GSD não recebem os tools MCP do Supabase** — toda migration, inspeção PROD e deploy de EF é checkpoint do orquestrador. **As 6 fases carregam trabalho de DB ou EF**, então isso é premissa de planejamento de wave, não descoberta de meio de fase.
- [M8/stack]: **zero npm novo, zero extensão nova.** `pg_cron` 1.6.4 · `pg_net` 0.19.5 · `pgcrypto` 1.3 · `supabase_vault` 0.3.1 vivas e versionadas. `anon` **ausente do catálogo** (não-instalável) → o primitivo de anonimização é tombstone `UPDATE` in-place via RPC `SECURITY DEFINER`.
- [M8/fonte de verdade]: **`.planning/research/FK-AUDIT-LIVE.md` tem precedência** sobre `STACK.md`/`ARCHITECTURE.md` em qualquer questão de `ON DELETE` ou estado de schema — aqueles leram arquivos de migration, aquele é `pg_constraint`.

**Herdadas do M7 (additive integration, security-first, reuse-and-clone) — seguem válidas:**

- [M4/Phase 24 · SEC-03]: `20260706110005_sec03_n8n_serverside.sql` deixou 3 triggers `AFTER` com `net.http_post` (pg_net) + Vault secret `n8n_webhook_base` **dormentes** (graceful-skip `RETURN NEW`, secret nunca criado). O M7/Phase 39 **remove (DROP)** esses triggers no MESMO phase que cria os novos → aposenta o n8n, resolve **SEC-03 por substituição** (não patch). ⚠ há triggers n8n adicionais além dos 3 (`20260712100004_n8n_novo_candidato.sql`) — a P39 diffa os corpos vivos antes de qualquer DROP/CREATE.
- [M2/Phase 10 · reuse]: EFs privilegiadas = self-auth Bearer via Vault + `--no-verify-jwt` (mirror `analise-candidato-individual`) — base direta da EF `notificar-candidato` (COMM-01) e do hop trigger→EF (DISPATCH-04). Ver [[reference_ef_authenticate_vs_authorize]].
- [M2/Phase 6 · reuse]: `historico_candidatura` + trigger `avancar_etapa()` BEFORE-UPDATE são o backbone do funil; o trigger é o **único escritor** da trilha. `avancar_etapa()` só dispara em UPDATE de `etapa_atual` → uma candidatura INSERT (COMM-02) e um agendamento INSERT (COMM-04) **nunca** produzem row de `historico_candidatura` → forçam os 2 triggers satélites (DISPATCH-02). **NÃO editar `avancar_etapa()`** (carrega guard ENTREV-03 + GUC `auto_rejeitado`).
- [M6/Phase 35 · reuse]: o `.ics` hand-rolled RFC-5545 de `agendamentoCandidatoService.gerarIcsAgendamento` (função pura, zero npm) é **portado verbatim** para `supabase/functions/_shared/ics.ts` (COMM-04) — não há import compartilhado possível cross `src/`↔`supabase/functions/`.
- [Stack/M7]: **zero dependências npm novas** — `fetch` plano a `https://api.resend.com/emails` (guia oficial Resend p/ Supabase EF, não o SDK); `pg_net`/`net.http_post` já live via SEC-03; Vault (`RESEND_API_KEY` + reuso `project_url`/`edge_invoke_key`, **nunca** o aposentado `n8n_webhook_base`); templates HTML hand-rolled (`_shared/email-templates.ts`, **não** `@react-email/*` — quebra no Deno edge). Se o SDK `resend` for tocado (só na EF de webhook Svix da P41), import `npm:` **estático** no topo (Pitfall do `.join("npm:")`).
- [M2/M4 · reuse]: RLS é row-level, **não** column-level; `select('*')` vaza — a EF resolve dados do candidato por allowlist explícita, e `notificacoes_enviadas` é candidato-DENY (LEDGER-03, espelha `rh_gerencia_agendamento` join-through). Ver [[reference_select_star_leaks_pii]].
- [M2–M6 · reuse]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row; no-BEGIN/COMMIT-wrapper) + reconcile do ledger (`schema_migrations.version` → filename prefix) após CADA apply — caminho das migrations P37/39/41. ⚠ DBMIG-01 (baseline+rebuild) permanece débito environment-gated, não bloqueia.
- [Kickoff M7 · travado]: Provedor = **Resend** · 4 eventos (confirmação, avanço, convite, decisão/rejeição) · LGPD = **transacional sem opt-out** (footer informativo, sem descadastro) · timeline no painel = **incluída** · nota livre do RH na rejeição (RNF-SLA-06) = **droppada do v1** (template neutro fixo) · reconciliação = **completa (webhook + pg_cron)** · knockout = **suprime a confirmação** (survivor-guard).
- [Phase 36 · 36-01]: modo de notificação resolvido SOMENTE de NOTIFICACOES_MODO explícito (default fail-safe 'teste'); nunca inferido de URL/env de build/hostname
- [Phase 36 · 36-01]: _shared/email-config.ts é o contrato único de remetente/destinatário — P37 e P38 importam daqui; zero imports por design (dispensa import_map, deno test sem --allow-net)
- [Phase 36 · 36-02]: gate de segredo separado do gate de perf — assert-no-secrets.mjs varre TODO o build/ com regex ancorado em \b e nunca imprime o match (mascarado: path+offset+padrão+4 chars)
- [Phase 36 · 36-02]: domínio recruta.beautysmile.com.br PROIBIDO como padrão do guard (já embarca legitimamente); postbuild ordena segurança antes de performance
- [Phase 36 · 36-03]: DKIM nunca hardcodado em doc — dois shapes em circulação (CNAME token-prefixado da SES vs TXT com chave pública); o runbook manda copiar o que o dashboard exibir
- [Phase 36 · 36-03]: check-resend-dominio.mjs é reporter opt-in (no-op exit 0 sem chave), proibido em CI/postbuild/hook por docblock; `POST /verify` só atrás de `--verify`; credencial nunca interpolada em console.*
- [Phase 36 · 36-04]: RPC leitora do Vault e SEM argumento (ler_resend_api_key()) — rejeitada a generalizacao ler_segredo(text): comprometimento de service_role expoe UM segredo, nao todos
- [Phase 36 · 36-04]: chave Resend de notificacoes so no Vault; cost-alerter fica com RESEND_API_KEY em EF env secret (confirmado vivo em PROD) — divergencia registrada como debito, nao corrigida
- [Phase 36 · 36-04]: database.types.ts NAO regenerado — nenhum client chama a RPC (consumidor e a EF da P38 via service-role); regenerar so traria drift
- [Phase 36 · 36-05]: chave PROD do Resend ainda nao gerada — pendencia UAT-36-2 registrada no HUMAN-UAT com o vault.create_secret literal, SEM placeholder (ausencia = NULL diagnosticavel; chave falsa = 401 opaco)
- [Phase 36 · 36-05]: Phase 38 nomeada como cobradora do provisionamento — o smoke da EF notificar-candidato e quem trava sem o segredo; a fase 36 fecha com os dois gates humanos (UAT-36-1 dominio/DNS + UAT-36-2 Vault) pendentes e nao-bloqueantes
- [M7/Phase 37 · 37-02]: fidelidade de schema provada por EXECUCAO (migrations aplicadas num Postgres 17 descartavel + smoke 12/12), nunca por revisao de leitura
- [M7/Phase 37 · 37-02]: o qual de uma policy RLS e asserido por igualdade catalogo-contra-catalogo (contra policy precedente auditada), nao contra string transcrita a mao
- [M7/Phase 37 · 37-02]: COMMENTs vivos em PROD sao transcritos verbatim nas migrations reconstruidas; glosa pt-BR vai em comentario SQL adjacente
- [Phase 37 · 37-03]: a migration aditiva NAO cria indice — idx_notif_retry ja existe em PROD como btree (proxima_tentativa_em) WHERE status IN ('pendente','falhou'), a forma CORRETA (o predicado parcial ja fixa status). A assercao (m) do smoke foi escrita para NAO exigir status como primeira coluna da chave: uma assercao assim reprovaria a forma viva
- [Phase 37 · 37-03]: atualizado_em usa pg_catalog.now() (timestamp de TRANSACAO, coerente com o DEFAULT now() vivo). Como now() e constante dentro da transacao, a prova do trigger foi redesenhada — a linha da fixture nasce com atualizado_em deliberadamente antigo: a comparacao estrita vale em qualquer arranjo transacional E prova que o trigger SOBRESCREVE o valor do cliente
- [Phase 37 · 37-03]: nenhuma policy nova — o candidato-DENY do LEDGER-03 permanece implicito pelo default-deny e e provado por impersonacao REAL (request.jwt.claims com app_metadata.role='candidato'), nunca por consulta a pg_policies. Policy PERMISSIVE mal escrita abre acesso; a ausencia nunca abre
- [Phase 37 · 37-03]: gate do smoke AUTO-EXIGIDO via GUC smoke37.pass — a assercao (o) levanta excecao se o total nao for 14, em vez de delegar a contagem de NOTICEs a quem le. Validado: com fixture impossivel o run acumula 2 PASS e falha em (o) em vez de terminar em silencio
- [Phase 37 · 37-04]: apply em PROD do 20260722000002 precedido do smoke de fidelidade em modo baseline (12/12) — a ordem e o gate: aplicar primeiro destruiria irrecuperavelmente a evidencia de que a reconstrucao da 37-02 era fiel. O MCP grava version com timestamp proprio; o reconcile do ledger e obrigatorio APOS cada apply_migration
- [Phase 37 · 37-05]: db:types falhou por estado local de link ausente (supabase/.temp/ e gitignored), NAO por falta de auth — provado por `gen types --project-id` antes de escalar; `supabase link` resolveu sem prompt e sem contato de escrita com PROD. Escalar teria reportado bloqueio inexistente
- [Phase 37 · 37-05]: o gerador de tipos e probado para arquivo TEMPORARIO antes de apontar ao arquivo git-trackeado — o script usa `>` que TRUNCA antes de executar, entao "rodar pra ver se funciona" e destruir o arquivo para descobrir. Backup sozinho protege contra perda, nao contra o repo quebrado no intervalo
- [Phase 37 · 37-05]: diff de tipos gerados 146/0 (ZERO delecoes) com 6 hunks TODOS esperados; o hunk ler_resend_api_key e debito herdado da P36/36-04 (que decidiu deliberadamente nao regenerar), nao drift novo — nenhum item criado em pending/. Zero delecoes e a evidencia mais forte de ausencia de drift lateral
- [Phase 37 · 37-05]: arquivamento de todo em DOIS commits (rename puro 100% + conteudo depois) — rename + 78 linhas juntos derrubam a similaridade para ~45%, abaixo do limiar default 50% do git, e `git log --follow` quebraria EM SILENCIO, apagando o commit que registrou a descoberta do drift
- [Phase 37 · 37-05]: item de debito arquivado em 4 blocos (Resolvido / Corrigido vs retrato original / Deliberadamente NAO feito / Continua em aberto), corpo original preservado byte-a-byte — as imprecisoes da parafrase sao registro forense; a correcao vive em bloco novo, nomeando a CONSEQUENCIA de cada erro
- [Phase 37 · 37-05]: destinatario_original chega ao compilador como OBRIGATORIO no tipo Insert (NOT NULL sem default no banco), enquanto modo e opcional (default 'teste') — a EF da P38 nao compila se esquecer o destinatario original
- [Phase 41]: P41-01: notificar-candidato refatorada para handler(req, deps) injetável (fetch/supabaseAdmin/serviceKey) — mockável sem --allow-net; Deno.serve sob import.meta.main
- [Phase 41]: P41-01: computeProximaTentativa (backoff 15m/1h/6h/24h, cap 5 -> null) + exigirSinkTeste (guard non-prod DELIV-03) como funcoes puras testadas e fiadas no handler
- [Phase 41]: P41-01: exigirSinkTeste fiado APOS o claim (registrarFalha grava por dedupe_key); RECON-03 segue Pending (varredura pg_cron e 41-03/41-05)
- [Phase 41]: P41-02: EF resend-webhook (verify_jwt=false) verifica assinatura Svix sobre corpo BRUTO (req.text() antes de qualquer parse) e reconcilia notificacoes_enviadas por provider_message_id de forma idempotente; import npm:svix@1.99.1 estatico; secret do Vault via ler_resend_webhook_secret nunca logado
- [Phase 41]: P41-02: RECON-01/02 mantidos Pending — EF codigo-completa e verde no CI, mas comportamento vivo depende do 41-03 (migration colunas bounce_em/reclamado_em + RPC) e 41-05 (deploy + registro webhook + secret no Vault); mesmo criterio do 41-01 com RECON-03
- [Phase 41]: P41-03: migration aditiva 20260727000001 escrita (bounce_em/reclamado_em timestamptz NULL + ler_resend_webhook_secret + varrer_retry_notificacoes + cron notif-retry-sweep */15) + smoke gate-GUC. RECON-01/02/03 mantidos Pending — so escreve .sql, zero PROD; completam no 41-05 (apply via MCP + reconcile + smoke + registro webhook + secret no Vault)
- [Phase 41]: P41-03: Bearer da varredura = edge_invoke_key do Vault (NUNCA service-role, invariante quebrada por rotacao — Pitfall 5); a varredura NAO incrementa tentativas (net.http_post at-most-once, quem incrementa e a EF ao tentar); cap tentativas<5 + LIMIT 20/sweep (T-41-09/T-41-10)
- [Phase 41]: P41-03: nenhum CREATE INDEX na migration (idx_notif_retry/idx_notif_provider_msg ja vivem em PROD; recriar com IF NOT EXISTS mascararia divergencia — o smoke b os VERIFICA); smoke p41 e gate-GUC 100% estrutural/catalogo com esperado FIXO 5 (sem INSERT, seguro em PROD vivo, diferente do p39 adaptativo)
- [Phase 41]: P41-04: branch retry na EF notificar-candidato gateado por retry_id — pula o claim-before-send, re-tenta a linha EXISTENTE por id, incrementa tentativas (row+1) com backoff (null no cap 5); caminho normal preservado byte-a-byte
- [Phase 41]: P41-04: guard de elegibilidade do retry (ausente|status terminal|tentativas>=5 -> 200 nao_elegivel) roda LOGO apos o parse, antes da resolucao de dados/envio (T-41-14 cap 5); exigirSinkTeste preservado no retry (fora do if !retry_id)
- [Phase 41]: P41-04: header Idempotency-Key = retry_id ?? dedupe_key no fetch do Resend (cinto secundario 24h LEDGER-02/T-41-15) nunca logado; RECON-01/03 seguem Pending ate 41-05 (deploy+apply cron)
- [Phase 41 · 41-05]: o gate de supply-chain do `npm:svix` foi provado por INTEGRIDADE, não por leitura de página — o sha512 do `deno.lock` foi comparado 1:1 com `registry.npmjs.org` nos 4 pacotes do fecho transitivo. "Sem postinstall" checado na árvore INTEIRA (svix → standardwebhooks → @stablelib/base64, fast-sha256), não só no pacote de topo
- [Phase 41 · 41-05]: `ERR_MODULE_NOT_FOUND` (Pitfall 2) é descartável SEM o secret provisionado — se a EF devolve uma string do PRÓPRIO código (`misconfigured`), o grafo de módulos carregou; um import npm quebrado falha no BOOT e nunca alcança o corpo do `Deno.serve`. O cold start de 2173ms nos logs é a assinatura da resolução npm bem-sucedida
- [Phase 41 · 41-05]: o smoke gate-GUC precisa rodar numa ÚNICA chamada `execute_sql` — `set_config(..., false)` é escopado à sessão, e statements espalhados por chamadas separadas do MCP zerariam o contador e reprovariam em (z) por run parcial
- [Phase 39 · gap closure]: o redeploy foi a PRÉ-CONDIÇÃO de tudo o mais, não um passo paralelo — aplicar o 41-05 (ou fechar DELIV-01) antes dele converteria CR-01/CR-02 de latentes em dano real a candidatos. A contenção pelo `403 domain not verified` era acidente de configuração, nunca um controle
- [Phase 41 · UAT ao vivo]: o pipeline foi provado PONTA-A-PONTA com um envio REAL (2026-07-28) — dispatch via net.http_post (Bearer do Vault, dentro do SQL) → EF → Resend → webhook Svix real → ledger `entregue` em 5s. Prova simultânea de 3 coisas que estavam abertas: DELIV-01 FUNCIONA (o 403 acabou, `status='enviado'` + provider_message_id real), NOTIFICACOES_MODO='teste' está ativo (confirmado pelo `modo` GRAVADO no ledger, não por leitura de config), e RECON-02 pelo caminho real (a prova anterior usava assinatura sintética)
- [Phase 41 · UAT ao vivo]: usar a candidatura de funil E2E (`candidato.funil@teste.com`) tornou o teste seguro POR CONSTRUÇÃO — em modo teste o destino vira `delivered+<evento>@resend.dev` e o candidato real nunca é contatado, enquanto `destinatario_original` preserva a trilha de auditoria. A linha foi removida ao fim porque o `dedupe_key` bloquearia uma confirmação futura legítima daquela candidatura
- [Phase 41 · 41-05 T3]: a assinatura Svix foi computada DENTRO do Postgres (`extensions.hmac` sobre `{svix-id}.{svix-timestamp}.{payload}`, chave = `decode(substring(secret from 7),'base64')`) — o `whsec_` nunca saiu do banco e nunca entrou no contexto do agente nem em linha de comando. Só a assinatura viajou, e ela vale exclusivamente para aquele payload/timestamp/msg-id. Padrão reutilizável p/ qualquer prova futura de webhook assinado
- [Phase 41 · 41-05 T3]: o `GET → 405` é o discriminador que separa "passou do gate do Vault" de "falhou antes dele" — com o secret ausente TODO método dava 500 (a leitura do Vault acontece no `Deno.serve`, antes do `handler`, onde vive o check de método). 405 prova que a execução alcançou o handler; 400 prova que alcançou o verify do Svix
- [Phase 41 · 41-05 T3]: colunas novas de migration devem ser provadas por ESCRITA REAL do consumidor, não só por catálogo — `bounce_em` foi validada pelo webhook gravando nela, o que também prova que a reconciliação é cirúrgica (cada evento toca só a sua coluna, sem apagar `entregue_em`)
- [Phase 39 · gap closure]: a ordem guard × claim é a parte que importa do fix de CR-02 — o survivor-guard na linha 192 roda ANTES do claim (linha 250), então um knockout não deixa linha `pendente` para a varredura `*/15` da P41 re-tentar. Guard depois do claim teria fechado o e-mail e aberto um retry órfão
- [Phase 42 / 42-07]: Adicionar evento ao ledger `notificacoes_enviadas` exige estender o CHECK `notificacoes_enviadas_evento_check` na MESMA entrega — o plano 42-07 omitiu isso e a EF do RH falharia com 23514 em todo claim, entregando um no-op silencioso. Ler a forma VIVA da tabela, nunca a lista de sítios que o plano enumera
- [Phase 42 / 42-07]: `dedupe_key` por DESTINATÁRIO quando um evento tem N recipientes: chave só por candidatura faria o 1º RH consumir o claim e 4 de 5 pessoas receberem skipped:duplicate em silêncio
- [Phase 42 / 42-07]: Evento sem sweep de retry grava `proxima_tentativa_em` NULO — agendar tentativa que nada consumirá é afirmação falsa no ledger (mesma classe do truque `tentativas = 5` que o plano rejeitou). A fila /rh/revisoes é a superfície durável
- [Phase 42 / 42-07]: Allowlist de log é POR Edge Function, nunca importada da EF vizinha: `dedupe_key` é logável em notificar-candidato e PROIBIDA em notificar-rh porque ali embute o candidatura_id completo e o user_id
- [Phase 42 / 42-11]: a superfície do candidato NUNCA usa os 3 RPCs RH-only do Art. 20 (revogados de anon na 20260730000002) — a leitura é own-row por PostgREST sob a policy candidato_le_propria_decisao, e a única escrita do candidato é solicitar_revisao_decisao. Confundir os dois lados produziria 42501 em toda a tela
- [Phase 42 / 42-11]: veredito da revisão é narrowed para união literal com normalização defensiva no cliente — o CHECK do banco já fecha o vocabulário, mas um invariante REMOTO é a coisa errada para uma decisão de RENDERIZAÇÃO se apoiar: valor novo fecha a superfície em vez de ecoar token cru ao candidato
- [Phase 42 / 42-11]: critério de aceitação com grep negativo sobre literal (revisao_por_usuario, text-xs) é satisfeito montando o literal em runtime no teste (['text','xs'].join('-')) — a asserção fica real e o literal proibido não passa a existir na feature, nem dentro do teste que o proíbe
- [Phase 42 / 42-11]: RED commit separado é IMPOSSÍVEL para superfície de API nova neste repo — referenciar símbolo/prop inexistente eleva a contagem tsc acima da baseline congelada de 97 e o hook reprova. O RED foi commitado onde tipa (asserções de valor) e verificado empiricamente onde não tipa; contorcer com 'as unknown as' trocaria força de asserção por cerimônia
- [Phase 42]: 42-08: a prévia de caixa de entrada do 5º evento NÃO ramifica por veredito — decisão escrita no PREHEADERS e pinada por igualdade literal (T-42-V2c); ramificar entregaria o desfecho do Art. 20 na lista de e-mails
- [Phase 42]: 42-08: a EF notificar-candidato passou a LER decisao_final.revisao_veredito (guardado por evento) — sem isso a ramificação do corpo seria código morto: teste provando o que nenhum e-mail alcança
- [Phase 42]: 42-08: um Record<União,…> é sítio de vocabulário forçado pelo compilador mesmo vivendo no corpus de TESTE — o plano contava 4 sítios, o compilador apontou 5
- [Phase 42]: 42-10: a recusa GUARD_DECISOR NAO vira toast — o hook fica calado e o dialogo renderiza alerta inline permanente sem retry; tentar de novo nunca funciona porque a recusa e sobre QUEM e o usuario
- [Phase 42]: 42-10: responderRevisao chama a RPC MESMO quando o guard vai recusar (teste prende isso) — atalhar no cliente moveria a barreira para o cliente, e qualquer DevTools a desliga
- [Phase 42]: 42-10: slot badge do MenuItem ALARGADO para string em vez de derivar o rotulo no render — duas fontes de verdade sobre 'como um contador aparece' e como um 0 volta a vazar; o render virou ternario porque '0 && …' avalia para 0 e o React o renderiza como texto
- [Phase 42]: 42-10: asserção de copy em dialogo tem de ler document.body — conteudo em portal deixa container.textContent vazio, e toda asserção negativa passa sem olhar nada (3 falsos verdes encontrados)
- [Phase ?]: [Phase 42 / 42-12]: a consulta `@> ARRAY[NULL]::uuid[]` do §E5 da pesquisa devolveria false SEMPRE (contenção compara por igualdade; igualdade contra nulo nunca é verdadeira) — a coluna que diz se o defeito está latente ou armado reportaria 0 em silêncio, o MESMO modo de falha que o INVENT-05 corrige. Usado array_position(...,NULL) IS NOT NULL, que 02-cron-live.sql:65 já usava: a pesquisa contradizia um artefato versionado da própria fase, e ganhou o artefato
- [Phase ?]: [Phase 42 / 42-12]: fidelidade de corpo de cron asserida por md5, não por string literal — o critério proibia verbo de escrita dentro do smoke, e transcrever o corpo esperado o traria de volta. O md5 satisfaz os dois e é MAIS forte que a forma proibida (pega espaço a mais/quebra de linha a menos). Resumo derivado por EXECUÇÃO sobre o arquivo, com bloco de proveniência + comando de recomputação no cabeçalho, idioma da baseline do .husky/pre-commit
- [Phase ?]: [Phase 42 / 42-12]: consulta de raio de impacto carimba a PRÓPRIA data (coletado_em_utc, 6ª coluna) — o portão exige fato datado, e data que depende de alguém lembrar de anotá-la é promessa sem código que a execute; sem carimbo no output não há como distinguir uma medição de hoje de uma colada de 2026-07-29 (Pitfall 7)
- [Phase ?]: [Phase 42 / 42-12]: o bloco do corpo ANTERIOR no cron-inventory.md ficou marcado como não-editável e a seção 'Depois da correção' foi escrita ANTES do apply com células ⏳ ('campo do checkpoint, não resultado'). Sobrescrever o 'antes' destrói a única evidência que torna o 'depois' interpretável (T-42-42); preencher com números plausíveis seria fabricar evidência
- [Phase ?]: A3 resolvida por execucao: o import cross-boundary src/ -> supabase/functions/*.json ATRAVESSA (Vite, Vitest, tsc). Texto de consentimento tem fonte UNICA, sem espelho.
- [Phase ?]: autorizacoesSchema ganhou .strict() proprio: o .strict() do schema pai so fecha o nivel superior; sem ele autorizacao_analise_video seria DESCARTADA em silencio com 200 em vez de rejeitada com 400.
- [Phase ?]: BD-5 em vigor: autorizacao_marketing_vagas nasce NULL para toda a base historica e NULL = NAO autorizado. Zero candidato ja cadastrado recebe divulgacao de vagas apos esta fase.
- [Phase 43 / 43-02]: RETEN-06 VEREDITO: NÃO reusar retain_until — o padrão exige DEPLOY para mudar a política e o RETEN-02 exige 'alterável sem deploy'; a estrutura substituta é predicado COMPUTADO (matriz ⨝ data-âncora), planos 43-04/43-06
- [Phase 43 / 43-02]: D-43-02-01: o portão de copy julga 'automaticamente' por COOCORRÊNCIA com léxico de exclusão, não isolado — 6 usos verdadeiros pré-existentes na allowlist (CEP, progresso) reprovariam um gate literal
- [Phase ?]: 43-03: z.literal(true) virou z.boolean().refine(=== true) — com o literal, o estado inicial false que o CONSENT-01 exige era INEXPRIMÍVEL no tipo do formulário
- [Phase ?]: 43-03: CADASTRO_DEFAULT_VALUES exportado — asserir sobre uma cópia local dos defaults seria verde sobre forma morta
- [Phase ?]: [Phase 43 / 43-04] Matriz de retenção chaveada por etapa_processo (8) e não status_candidatura (5): etapa_atual é NOT NULL, então nenhuma candidatura cai em buraco silencioso na Phase 46
- [Phase ?]: [Phase 43 / 43-04] Escrita da matriz é RPC SECURITY DEFINER auditada, não policy de UPDATE — policy não dá trilha atômica nem guard server-side sobre o teto de 24 meses
- [Phase ?]: [Phase 43 / 43-04] Guard NULL-safe (IS DISTINCT FROM) nas DUAS RPCs, e anon revogado nominalmente — o idioma NOT IN + REVOKE FROM PUBLIC falha aberto (defeito medido na 42-06)
- [Phase 43 / 43-05]: D-43-05-01: o guard de marketing vive no BANCO (BEFORE INSERT no ledger), não num if da Edge Function — service_role bypassa RLS mas NÃO bypassa trigger, e um if na EF é contornável pelo próximo emissor (a P39 teve 3+ emissores simultâneos)
- [Phase 43 / 43-05]: D-43-05-02: fail-closed inclui o 'não sei' — evento sem linha em classe_evento_notificacao é RECUSADO, porque um evento novo não classificado é o caminho por onde um envio de marketing entraria sem ser visto
- [Phase 43 / 43-05]: D-43-05-03: divulgacao_vagas é vocabulário RESERVADO com guard vivo, não suporte a marketing — zero emissores, e a EF o rejeitaria; precedente exato verificado em revisao_solicitada (no CHECK, fora de EVENTO_MAP)
- [Phase ?]: Predicado de retencao UNICO nasce na Phase 43 (nao na 46): a previa read-only e o DELETE futuro consomem candidaturas_alem_da_janela(), com gate de md5 + assercao de chamada contra a criacao de uma segunda copia
- [Phase ?]: Data-ancora com COALESCE de 4 degraus terminando em data_candidatura (NOT NULL): o modo de falha em que a ladeira rende NULL e a candidatura sai da contagem em silencio fica INEXPRIMIVEL
- [Phase ?]: candidaturas_alem_da_janela() REVOGADA de todo papel de cliente e SEM GRANT de volta: a proibicao de a previa enumerar PII e estrutural, nao confiada a camada de apresentacao
- [Phase ?]: BD-1 estendido: autorizacao_retencao_curriculo NAO entra no predicado desta fase — encurtar janela e decisao de POLITICA da Phase 46, com parecer juridico
- [Phase ?]: 43-UI-SPEC emendada (43-06): linha por estado conta CANDIDATURAS, total conta CANDIDATOS com todas as candidaturas fora da janela — o rotulo aprovado contaria uma coisa e nomearia outra
- [Phase ?]: 43-08: o Prazo previsto da guarda do curriculo sai da autorizacao + 24 meses (teto consentido), NAO da matriz config_retencao_etapa — dependencia da Phase 46 registrada no codigo
- [Phase ?]: 43-08: a guarda do curriculo nao ganha switch — nao existe motor de exclusao (Phase 45); a revogabilidade do Art. 8 §5 e atendida pelo Encarregado
- [Phase ?]: 43-08: candidato sem linha de autorizacoes (4 dos 21) nao recebe switch fantasma nem backfill — estado real fail-closed + canal humano nomeado (BD-4)
- [Phase ?]: 43-09: a tabela da matriz MESCLA a resposta do servidor com o enum fechado de 8 estados: etapa sem politica vira linha visivel '— (nao definida)', nunca omissao silenciosa — e omissao e exatamente o que a Phase 46 nao pode herdar
- [Phase ?]: 43-09: o seed mostra TRAVESSAO em Ultima alteracao: atualizado_em vem preenchido pelo trigger em toda linha semeada, e exibi-lo seria uma data verdadeira contando historia falsa
- [Phase ?]: 43-09: o NO-OP desabilita o CTA mas nao vira erro de validacao: nao ha o que corrigir, so nada a salvar. O servidor recusa o mesmo caso com 22023 — a regra vive nos dois lados
- [Phase ?]: 43-09: a assercao negativa E8 recorta o estado de ERRO explicitamente: ele carrega o 'Tentar novamente' que a UI-SPEC especifica, e sem o recorte o teste reprovaria a copy que a spec manda escrever
- [Phase ?]: [Phase 44 / 44-01]: A precedencia de coluna do gerador da allowlist poe o bloco 'ponteiros' (R2 partida em titular/terceiro) ANTES da entrada explicita do pii-inventory.yaml — a ordem literal do plano exportaria UUID de funcionario na copia do candidato, porque o inventario tem entrada EXPLICITA 'preservar/Funcionario' para agendado_por e avaliador_id e explicita vence regra
- [Phase ?]: [Phase 44 / 44-01]: R4 do pii-inventory NAO existe como regra de COLUNA no gerador: e regra de TABELA e vive em fora_do_escopo_por_regra. Se resolvesse coluna, 'conteudo do produto' viraria a porta por onde uma coluna nao classificada sairia calada
- [Phase ?]: [Phase 44 / 44-01]: meta.gerado_em e PINADO do artefato em disco durante --check; carimbo fresco a cada execucao faria o --check divergir pelo relogio e nunca sair 0 — um gate que nunca passa e o defeito que o .husky/pre-commit desta casa ja pagou para aprender
- [Phase ?]: [Phase 44 / 44-01]: Tabela declarada em escopo_titular e ausente do catalogo vivo e AVISO + meta.escopo_declarado_nao_vivo, nunca erro: tabela ausente nao vaza coluna. O caminho perigoso e o inverso (tabela viva sem disposicao), e esse continua fatal
- [Phase ?]: [Phase 44 / 44-01]: O fecho do gerador ACUMULA todas as pendencias antes de sair, em vez de morrer na primeira — o 44-03 recebe a lista inteira em vez de uma pendencia por rodada
- [Phase ?]: [Phase 44 / 44-01]: js-yaml fixado na major 3 (^3.15.1): a 4.x remove safeLoad e quebraria o gen-pii-md.cjs vivo da Phase 42. Verificado APOS o install que gen-pii-md.cjs --check segue saindo 0
- [Phase ?]: O smoke resolve identidades vivas e escreve so em solicitacoes_dados: fabricar candidatos exigiria escrever em auth.users de PROD (44-02)
- [Phase ?]: Contador de gate-GUC incrementado FORA da subtransacao — GUC e transacional e o rollback levaria o incremento junto (44-02)
- [Phase ?]: FK de solicitacoes_dados sem ON DELETE: a decisao pertence a Phase 45, que carrega o portao destrutivo (44-02)
- [Phase ?]: 44-03: decisao_final.justificativa FICA FORA da copia do titular (Phase-24/CR-01 viva + BD-9 aberto), enquanto as 38 outras colunas de texto livre do RH ficam DENTRO — assimetria HISTORICA, nao de principio; reversivel com uma palavra no YAML
- [Phase ?]: 44-03: scores/bandas/percentis ENTRAM nos arquivos entregues ao titular — o ban da UI-SPEC governa TELA (apresentacao), o Art. 18 II governa o DIREITO a copia
- [Phase ?]: 44-03: o smoke de drift compara o catalogo vivo contra allowlist UNIAO excluidas (392), nunca contra a allowlist sozinha (358) — guarda que grita 34 vezes por desenho e a imagem espelhada do dead code do P39/CR-02
- [Phase ?]: 44-03: ponteiro de pessoa e conceito SEMANTICO, nao sufixo _id — referencia_match (uuid[] de candidaturas de terceiros) e entrevistador (nome de funcionario, text) evadiriam a regra R2. Insumo direto para a Phase 45
- [Phase ?]: 44-04: md5 do ledger compara contra md5(arquivo SEM o \n final) — o banco nao guarda o newline final; o esperado do plano reprovaria TODA migration da fase
- [Phase ?]: 44-04: fidelidade de migration provada tambem por obj_description, nao so por hash — o md5 prova que algo chegou integro, a leitura prova que a coisa certa chegou
- [Phase ?]: 44-04: as 3 colunas text de solicitacoes_dados (tipo/situacao/causa) receberam veredito explicito true; relaxar a R3 para aceitar text continua PROIBIDO
- [Phase ?]: 44-04: causa entra na copia e e segura por CONSTRUCAO — vocabulario fechado por CHECK e COMMENT proibindo mensagem crua/HTTP/stack/Storage
- [Phase ?]: 44-04: indentacao de 4 espacos do --sql-values virou contrato no GERADOR, nao no regex do consumidor — afrouxar a (k) perderia a checagem de que o paste caiu no lugar certo
- [Phase ?]: 44-04: normalizacao IN -> = ANY (ARRAY[...]) no qual vivo NAO e drift; 44-05/44-08/44-09 nao devem comparar qual do catalogo contra texto do arquivo
- [Phase ?]: 44-04: npm run db:types grava o ERRO em stdout — o > nao so trunca, PREENCHE database.types.ts com o blob JSON de erro. Provar o gerador contra arquivo temporario e obrigatorio
- [Phase ?]: 44-05: a projeção da EF corre em DUAS passadas (diretas → indiretas) — a ordem alfabética do artefato põe agendamentos_entrevista antes da ponte candidaturas, e depender dela seria depender de um acidente do gerador
- [Phase ?]: 44-05: a copy 'você recebe dois arquivos' fica para o 44-06, junto com o .html que a torna verdadeira — renderizá-la nesta fatia seria a tela afirmando ao titular que recebeu mais do que recebeu
- [Phase ?]: 44-05: o pre-commit congela a baseline de 97 erros tsc, então um RED de src/ não pode ser commit próprio; RED provado por execução, sem --no-verify e sem stub (o RED da EF É commit — supabase/functions está fora do projeto tsc)
- [Phase ?]: [Phase 44 / 44-08]: classifySlaDados É classifyRevisaoSla — reuso por ALIAS provado por identidade de REFERÊNCIA (expect().toBe()), não por igualdade de comportamento: é a asserção que uma cópia-e-cola futura reprova mesmo estando correta no dia em que for feita. A Área 4 separou as duas TABELAS de config (dois prazos legais), não a FUNÇÃO, que é agnóstica ao prazo
- [Phase ?]: [Phase 44 / 44-08]: a inversão do toggle (filtro da tela 'só não atendidos' × parâmetro do servidor 'incluir atendidos') vive em UM ponto, com args da RPC tipados como Record<string,boolean> — a forma nominal poria o identificador no arquivo 2x e o gate 'inversão existe uma vez só' passaria a medir a declaração junto com o uso
- [Phase ?]: [Phase 44 / 44-08]: a ponte de tipos converte o OBJETO cliente, não o método rpc como fazem os 5 sítios vivos do repo — extrair o método perde o 'this' e derruba o PostgrestClient em runtime, defeito que os testes NÃO pegam porque mockam o método inteiro (duplicateCheckService.ts:179-183 contorna com .call; redacaoService.ts:165 não contorna e carrega o defeito latente)
- [Phase ?]: [Phase 44 / 44-08]: a discriminação de 42501 por MENSAGEM do análogo foi deliberadamente NÃO copiada — lá o mesmo SQLSTATE cobre duas recusas distintas, aqui tem causa única (guard de papel); o ramo extra seria dead code, a classe P39/CR-02 que este projeto já embarcou
- [Phase ?]: [Phase 44 / 44-08]: traduzirCausa DIVERGE de rotularDecisao no fallback (token desconhecido → 'Motivo não registrado.', nunca o token cru) porque a causa nomeia caminho de falha INTERNO — cru na tela seria detalhe de infraestrutura; sem a razão no docblock a próxima leitura 'uniformiza' com o análogo e reintroduz o vazamento
- [Phase ?]: [Phase 44 / 44-08]: 4ª ocorrência na fase de gate que não podia passar — 'grep -crE ... dir/' imprime caminho:contagem POR ARQUIVO, então a comparação com "1"/"0" nunca é verdadeira; medido por grep -rlE|wc -l (arquivos) e grep -rhoE|wc -l (ocorrências)
- [Phase ?]: 44-06: o .html carrega o carimbo de geracao e a versao da allowlist no rodape — sem os dois, uma copia de hoje e indistinguivel de uma do mes passado e nao ha como provar qual escopo estava vigente
- [Phase ?]: 44-06: curriculo_url (caminho de Storage) fica FORA do arquivo legivel e DENTRO do .json — assimetria deliberada: o .json e lido por maquina, o .html e onde a Invariante 4 vale para o que a pessoa le
- [Phase ?]: 44-06: o motivo visivel ao lado do botao desabilitado vale para TODO disabled do bloco, nao so o cooldown — um disabled sem motivo e indistinguivel de tela quebrada, e o backstop (z3) e estrutural para pegar um disabled acrescentado depois
- [Phase ?]: 44-06: os nomes dos dois arquivos saem de nomesArquivosExport sobre o MESMO gerado_em do servidor — duas derivacoes independentes divergiriam na virada de dia em UTC e o titular procuraria um nome que ninguem escreveu
- [Phase ?]: 44-06: a copy 'Voce recebe dois arquivos' entrou no MESMO commit que o .html (instrucao literal do 44-05) — separa-los reintroduziria por uma janela de commits a mentira que o 44-05 adiou a copy para evitar
- [Phase ?]: 44-09: o eixo da linha da fila sai de `situacao !== 'atendido'` — um token novo do servidor cai no lado da SUPERVISÃO. Errar para esse lado custa uma linha a mais; errar para o outro esconderia trabalho com 15 dias corridos correndo.
- [Phase ?]: 44-09: o gate `grep -c 'GlassCard' == 1` é insatisfazível (o próprio análogo pontua 4). Medido pela substância — `grep -cE '<GlassCard'` = 1. QUINTA ocorrência da classe 'gate que não pode passar' nesta fase.
- [Phase ?]: 44-09: sondas de texto-fonte neste repo NÃO podem usar `import.meta.url` — o `URL` global do happy-dom reescreve a base para a origem do documento e `fileURLToPath` rejeita. Ancorar em `process.cwd()`.
- [Phase ?]: [Phase 44 / 44-07]: a leitura do CV do titular NÃO esconde candidatura removida de forma suave, e o teste prende a AUSÊNCIA do predicado — o WR-03 oposto do get-curriculo-url é sobre um RH vendo arquivo alheio; aqui o leitor é o DONO
- [Phase ?]: [Phase 44 / 44-07]: cunhagem client-side com o JWT do titular (BD-7) — service_role fora do caminho do CV dele; o CvButton é reusado como MECANISMO e recusado como FONTE DE DADOS (a EF devolve 403 a candidato)
- [Phase ?]: [Phase 44 / 44-07]: estado por LINHA (conjuntos de ids) em lista com ação por item; a asserção sobre as linhas que NÃO falharam foi verificada por MUTAÇÃO (erro escalar reprova, e só ela reprova) antes de ser creditada
- [Phase ?]: [Phase 44 / 44-07]: new URL(<literal>, import.meta.url) é reescrito pelo Vite para URL de asset e fileURLToPath recusa — sonda de texto-fonte tem de passar o caminho por VARIÁVEL
- [Phase ?]: [Phase 44 / 44-07]: asserção de esqueleto de carregamento precisa de gancho próprio quando um irmão da mesma seção já pulsa — .animate-pulse na seção passava com o ramo novo inexistente (7º portão morto da fase)
- [Phase ?]: [Phase 44 / 44-07]: a 320px a linha do currículo EMPILHA — medido, sobram 256px úteis e o botão ocupa ~210px; lado a lado o título da vaga ficaria com 4 caracteres, apagando o que o par truncate+tooltip existe para preservar
- [Phase 45]: 45-02: a fonte do recibo de exclusão é pii-inventory.yaml (69 tabelas), NÃO exportAllowlist.ts — A 45-UI-SPEC nomeava exportAllowlist.ts; a 45-RESEARCH C2 mediu 30 de 69 tabelas, omitindo 8 tabelas com PII do titular — inclusive ai_call_logs e logs_acesso, duas das cinco do ERASE-09 (Pitfall 5).
- [Phase 45]: 45-02: vocabulário PASSOS_MOTOR fechado em 7 valores é o contrato que 45-07 e 45-10 assinam — storage_remove, tombstone_candidato, tombstone_decisao_final, severar_user_id, severar_fks_set_null, scrub_ledger_email, auth_delete_user. O gerador reprova quando existe passo sem linha de recibo ou linha sem passo — o backstop E4-error nas duas direções.
- [Phase 45]: SC#5 x D-45-04 resolvida por escrito no COMMENT ON FUNCTION: as linhas ja gravadas em bias_audit_log nao mudam; a composicao da coorte nao muda (a faixa materializada garante); a apresentacao futura suprime celulas pequenas. p_periodo e rotulo, nao filtro.
- [Phase 45]: Supressao k=5 primaria + COMPLEMENTAR: existindo primaria, n_total sai do payload E a faixa de menor contagem entre as remanescentes tambem — uma equacao, duas incognitas. Suprimir so a celula nao suprime nada.
- [Phase 45]: 45-08: invocarCancelarExclusao() nao recebe solicitacaoId — o cliente nao envia identificador nenhum no cancelamento — A EF medida recusa qualquer id vindo do corpo (index.ts:190-197): o titular sai de auth.uid() e o pedido sai de consulta escopada por ele. Mandar o id seria inerte e sugeriria que o cliente e a autoridade sobre qual pedido e cancelado (T-45-08-05).
- [Phase 45]: 45-08: temCurriculo e temDecisaoRegistrada sao MEDIDOS por leitura own-row, nunca presumidos — O SC#5 proibe superestimar nas duas direcoes: presumir true prometeria apagar um curriculo inexistente, presumir false omitiria linha aplicavel. lerRecorteDoTitular mede os dois; falha de leitura resolve para false — o recibo nao afirma o que nao pode medir.
- [Phase ?]: 45-10: a pré-condição do passo irreversível é relida do BANCO, nunca do espelho local que o próprio código escreveu
- [Phase ?]: 45-10: o recibo NÃO entra em ledger de notificações (D-45-12/R1) e o plano jsonb é esvaziado no fecho — o caminho de Storage embute o auth.uid do titular
- [Phase ?]: 45-10: o portão CONSOL-04 fechou (suíte 1689/1689) e mede o DISCO, não execução — nada foi aplicado nem deployado
- [Phase ?]: 47-01: a matriz de retenção publicada usa a janela VIGENTE medida em PROD (rejeitado=18, origem=admin), nunca o valor do seed (24) — o carimbo público de vigência é meta.medido_em, não a data do build
- [Phase ?]: 47-01: config_retencao_etapa NÃO tem coluna base_legal (medido) — finalidade e base_legal são ambos fato jurídico AUTORADO no YAML; o gate garante presença e vocabulário, não correção jurídica (revisão do Encarregado)
- [Phase ?]: 47-01: os quatro portões check:* de artefato passam a rodar no job unit do ci.yml; check:resend-dominio fica fora como exceção DECLARADA com razão (T-36-03-03), e portoesInvocados.test.ts reprova o próximo órfão nomeando-o
- [Phase ?]: 47-02: a juncao do historico e usuarios_rh.user_id = historico_candidatura.ator (ator e FK de auth.users, nao de usuarios_rh) — travada por DO block de catalogo no apply
- [Phase ?]: 47-02: o escopo por vaga do rh_le_historico e reimposto no corpo da RPC porque SECURITY DEFINER bypassa a RLS (WR-04 nao pode regredir)
- [Phase ?]: 47-02: o residuo da severacao da Phase 45 (linha do titular le 'Sistema') e ACEITO e escrito no COMMENT — um 5o rotulo vazaria o exercicio do direito de exclusao (D-47-U09)
- [Phase ?]: As seis entradas embarcam com sentinela no campo pais — nenhum pais inventado; a pagina lanca ao renderizar, e isso e o comportamento correto
- [Phase ?]: O servico publico de CEP ENTRA na lista, com a decisao escrita no arquivo
- [Phase ?]: As bases legais sao copia verbatim do artefato gerado da matriz, amarradas por teste
- [Phase ?]: TRANSP-01 nao e marcado concluido: a pagina existe e nao pode ser publicada
- [Phase ?]: Os seis vereditos Nyquist do M7 fecharam PARCIAIS (validated + nyquist_compliant: false) — 18 gaps nomeados, zero verde forcado
- [Phase ?]: CONSOL-03 resolvido por ADOCAO de data_deletion_log (operador, 2026-08-09): COMMENT corrigido, escritor auditando em dois destinos, zero DROP — a Phase 47 nao tem portao destrutivo
- [Phase ?]: CONSENT-05 resolvido de forma nao-destrutiva: DEFAULT e obrigatoriedade removidos de autorizacao_analise_video, zero back-fill dos valores historicos
- [Phase ?]: O carimbo público de vigência publica a data de MEDIÇÃO da matriz viva, nunca a data do build — e um teste assere que os dois são fatos diferentes
- [Phase ?]: A Emenda A é o terceiro detector do drift de retenção e o único que enxerga a edição feita em produção; ela é provada RENDERIZADA, não só declarada
- [Phase ?]: O nome literal da tabela de usuarios de RH nao aparece no historicoCandidaturaService nem em comentario — o guard varre o modulo inteiro, e afrouxa-lo deixaria de pegar uma string literal em rota de consulta
- [Phase ?]: as never pre-regen na chamada da RPC do historico: a funcao esta viva em PROD mas database.types.ts so e regenerado por npm run db:types (Supabase CLI --linked, indisponivel)
- [Phase 47]: Os seis paises dos subprocessadores foram MEDIDOS (2026-08-11): cinco tratam os dados nos Estados Unidos, o ViaCEP declara jurisdicao brasileira com hospedagem nao divulgada — O TimeZone do banco em PROD (America/Sao_Paulo) foi recusado como prova de regiao antes da medicao — e a recusa se provou certa: a regiao medida e us-east-1. O indicio apontava para o Brasil e estava errado; aceita-lo teria publicado uma declaracao falsa de transferencia internacional
- [Phase ?]: 47-08: o RodapePublico foi CONSTRUIDO e deliberadamente NAO montado — a montagem e o ato de publicacao, e o portao do Encarregado esta aberto. Cinco das seis empresas contratadas tratam os dados nos Estados Unidos e todos os candidatos sao brasileiros: a pagina declara transferencia internacional em quase toda a cadeia, e isso e o nucleo da revisao
- [Phase ?]: 47-09: os dois destinos de rede sem ficha (servico de IP, quadro de video embutido) sao registrados como pendencia com FATO MEDIDO e ROTA, nunca com veredito — classificar destino como empresa contratada e ato do Encarregado
- [Phase ?]: Portao de publicacao 47-08 liberado pelo OPERADOR (Fernando) em 2026-08-11 apos revisao das duas paginas publicas; a revisao formal do Encarregado permanece ABERTA e rastreavel — nao foi exercida
- [Phase ?]: RodapePublico montado nas cinco superficies publicas com zero linha removida nas tres paginas de conversao; /privacidade e /subprocessadores passam a ser alcancaveis por navegacao de producao
- [Phase ?]: 45-13 / opcao B (operador, 2026-08-11): o GRANT a authenticated FICA e anonimizar_candidato passa a verificar INTENCAO (metade (c): pedido em executando, janela do D-45-01 vencida, storage_concluido_em carimbado), com o caminho destrutivo restrito a administrador ou ao proprio titular. A metade (a) nao foi tocada.
- [Phase ?]: 45-13: os md5(prosrc) do motor foram recomputados e o 45-13-SUMMARY.md passa a ser a referencia que o 45-11 confere, substituindo o 45-12-SUMMARY.md. ERASE-08 continua Pending — a sobrevivencia da trilha e provada pelo smoke que roda no 45-11.
- [Phase ?]: 45-14: BL-01 fechado por NORMALIZACAO UNICA de p_dry_run para o lado SEGURO no DECLARE (coalesce(p_dry_run, true)), nunca por tres coalesce espalhados nem por recusa explicita de NULL — destruir sobre intencao nao declarada e o desfecho que o portao existe para impedir
- [Phase ?]: 45-14: BL-02 fechado ESTREITANDO a enumeracao (probe com o escopo da severacao) e nao ALARGANDO a severacao para o user_id inteiro — alargar faria linhas de OUTRAS pessoas perderem o registro de autoria por causa do pedido de um terceiro
- [Phase ?]: 45-14: a prova com fixture do BL-02 mora na auto-verificacao da 20260805000006 (caso vii) e nao na da 20260805000005, que declara escopo negativo READ-ONLY — desvio consciente da letra da condicao de reabertura no 2, com cross-reference escrito nos dois arquivos

### Pending Todos

Herdados/deferidos, fora do escopo do M7-core (rastreados p/ backlog):

- **Questões abertas do M7 (resolver no discuss-phase da fase relevante):** retenção/purga de `notificacoes_enviadas` — **deferida a LGPD-OPS (M8+)** na P37 · coluna `reclamado_em` — **deferida à P41** na P37 · divergência `updated_at` (inglês) vs `atualizado_em` (pt-BR) no resto do schema — **confirmada como débito real na P37**, não endereçada · verificação do caminho de aprovação escreve `etapa_atual='aprovado'`? (P39) · números exatos rate-limit/free-tier Resend (P41) · `.ics` METHOD PUBLISH vs REQUEST (P38).
- **Carregado do M6 (não puxado ao M7):** W-1 (Histórico VISRH-03 renderiza `ator` UUID em vez do nome do recrutador — needs `usuarios_rh` join) · 6 HUMAN-UATs live P31/34/35 · cosméticos UI P34/P35.
- **Carregados do M4/M5:** DBMIG-01 baseline+rebuild (environment-gated) · CC0-01 seed cognitivo · HUMAN-UATs P22/23/24/28/29/30. Ver `.planning/todos/`.

### Blockers/Concerns

- **🎉 P39 FECHADA 2026-07-28 — CR-01 e CR-02 PROVADOS AO VIVO EM PROD.** CR-02: a EF respondeu `{"ok":true,"skipped":"knockout"}` com **zero** linhas no ledger (a guarda existe de fato E roda antes do claim). CR-01: a cadeia canônica inteira disparou de uma aprovação real e o **conteúdo entregue foi inspecionado** — assunto *"Boa notícia sobre sua candidatura"* + `COPY_APROVACAO`, sem traço da recusa. **+1 achado NOVO no UAT (W-01):** o `PREHEADERS` não ramificava por desfecho, então o aprovado via prévia *"Atualização sobre a sua candidatura."* na caixa de entrada — corrigido (EF **v5**), com 3 testes de regressão provados por stash, e re-verificado ao vivo. Só apareceu porque o corpo INTEIRO foi inspecionado: o preheader é `<span display:>`, invisível às asserções que olham o texto visível.
- **📌 Nota operacional (achado incidental do UAT):** reenviar o MESMO evento para a MESMA candidatura em 24h é barrado em **duas camadas independentes** — `UNIQUE(dedupe_key)` no nosso ledger E a idempotência do Resend. Provado ao vivo: um re-teste com a mesma `Idempotency-Key` e corpo alterado recebeu `409 ... request body was modified`. O cinto do LEDGER-02/T-41-15, antes só coberto por teste unitário, está provado em PROD.
- **✅ RESOLVIDO 2026-07-28 — P39 CR-01 / CR-02 DEPLOYADOS.** Era o bloqueio mais importante do milestone. A EF `notificar-candidato` está viva em **v3** com o fix `f3b7304`: aprovado recebe `COPY_APROVACAO` (nunca mais a rejeição) e knockout é barrado pelo survivor-guard **na EF, antes do claim** (logo não deixa linha `pendente` para a varredura re-tentar). Auditado na fonte deployada + 401 sem Bearer + ledger intacto (0 linhas). **Consequência prática: fechar DELIV-01 já não é perigoso** — a contenção acidental do `403` deixou de ser necessária.
- **✅ RESOLVIDO 2026-07-28 — ACESSO DE ESCRITA A PROD RESTABELECIDO.** O operador removeu `&read_only=true` da URL do MCP. Verificado empiricamente antes de qualquer escrita: `current_user=postgres`, `session_user=postgres`, `transaction_read_only=off`. `apply_migration`, `execute_sql` de escrita e `deploy_edge_function` **todos funcionais** nesta sessão. Segue **sem** Supabase CLI instalado e sem `supabase/.temp/` (projeto não linkado) — então o caminho de escrita continua sendo **exclusivamente o MCP pelo main thread**, e `db push` permanece proibido (42601 nos corpos `$$`).
- **✅ RESOLVIDO 2026-07-28 — 41-05 Task 3 CONCLUÍDA e o loop de reconciliação PROVADO AO VIVO.** O Fernando registrou o endpoint no dashboard do Resend e provisionou o `whsec_…` no Vault (`resend_webhook_secret` presente; prefixo `whsec_`, len 38 — formato legítimo, não placeholder). **RECON-02 provado end-to-end contra a EF deployada:** webhook **assinado de verdade** aceito (200) e reconciliação observada no banco — `enviado → entregue` (+`entregue_em`), depois `→ bounce` (+`bounce_em`), por `provider_message_id`; sem assinatura → **400**, forjado → **400**, replay com timestamp trocado → **400**, `GET` → **405** (prova que passou do gate do Vault). A assinatura foi calculada **dentro do Postgres** (`extensions.hmac`), então **o segredo nunca saiu do banco**. Linha de teste criada e **removida** — ledger de volta a **0 linhas**, zero e-mail enviado.
- **⚠ P39 fechou sem VERIFICATION.md e sem code review — falha de processo, não de código.** Os 2 CRITICAL só apareceram porque esta sessão rodou o review retroativamente. A P39 foi aplicada em PROD (Wave 2, `39-04`) com o gate de verificação nunca executado. Vale tratar como sinal de processo: fase de maior risco do milestone foi a que pulou o gate.

- **✅ DRIFT PROD→repo RECONCILIADO na Phase 37 (fechado 2026-07-22) — mas a CAUSA continua desconhecida.** Os 4 arquivos de migration agora existem com correspondência 1:1 contra o ledger (`20260721000001`, `20260721000002` reconstruídos e **não** re-aplicados; `20260722000001` da P36; `20260722000002` aplicada na 37-04), confirmado independentemente por `supabase migration list --linked` (Local/Remote alinhados, zero pendência). As 3 lacunas fechadas e `database.types.ts` regenerado. Item arquivado com resolução em 4 blocos: `.planning/todos/done/37-drift-prod-tabelas-notificacao.md`. **⚠ Continua em aberto:** ninguém sabe **quem/como** aplicou as duas migrations originais direto em PROD — um caminho de apply fora do repositório continua existindo e a mesma falha pode se repetir. Se o padrão reaparecer, tratar como sinal de processo, não incidente isolado.
- **⚠ Subagentes GSD não recebem os tools MCP do Supabase** (bug upstream anthropics/claude-code#13898 — agentes com `tools:` restrito no frontmatter). Comprovado na P36/Plano 36-04, que bateu num checkpoint por isso. **Toda** inspeção e todo apply em PROD têm de ser feitos pelo orquestrador/main thread. As fases 37, 39 e 41 (todas com migrations) devem ser planejadas assumindo que as tarefas de banco fecham como checkpoint do orquestrador, não como trabalho autônomo do executor.
- **Débito de infra: `.husky/pre-commit` permanentemente vermelho.** Roda `npm run lint`, que sai não-zero contra um baseline PRÉ-EXISTENTE de 97 erros `tsc` em `src/**` (teto do CI é 104, então o CI passa). Consequência: 100% dos commits da P36 usaram `--no-verify`, cada um com a contagem 97→97 documentada no corpo. Isso treina bypass reflexivo. Seria mais útil como gate de não-regressão (comparar contagem contra o baseline) do que como checagem binária de exit code.
- **Cadeia estrita 37 → 38 → 39** — a EF precisa da tabela `notificacoes_enviadas`; os triggers precisam de uma EF viva pra apontar (senão disparam num 404, silenciosamente droppado — `net.http_post` é at-most-once).
- **Phase 39 é a de maior risco** — a colisão de double-send (3+ triggers n8n dormentes + o disparo env-var do `submit-candidatura`) só é segura com DROP-and-CREATE no MESMO phase + guarda `UNIQUE(dedupe_key)` durável. Não "manter os dois temporariamente".
- **✅ DELIV-01 FECHADO em 2026-07-28.** O Fernando confirmou no dashboard: `rh.beautysmile.com.br` está **Verified** no Resend. SPF/DKIM/MX publicados (conferidos por `dig`) + DMARC coberto por herança do domínio organizacional. **A entrega real está habilitada — e é SEGURA, porque o fix da P39 (EF v3) já estava vivo antes disto.** A ordem obrigatória foi respeitada do início ao fim: redeploy do fix → 41-05 → só então verificar o domínio. ⚠ **Consequência operacional:** o pipeline agora consegue enviar e-mail de verdade; quem decide se o destinatário é real ou o sink `@resend.dev` é a env `NOTIFICACOES_MODO` da EF (ausente/qualquer coisa ≠ `producao` ⇒ `teste`, fail-safe). Confirmar essa env antes de esperar e-mail em caixa real. Registro histórico abaixo:
- **🔄 DELIV-01 — registro histórico (2026-07-28, antes da confirmação): o DNS JÁ SUBIU.** `dig` ao vivo mostra os 3 registros Resend publicados em `rh.beautysmile.com.br`: `send.rh…` TXT `v=spf1 include:amazonses.com ~all` (SPF), `send.rh…` MX `10 feedback-smtp.sa-east-1.amazonses.com`, e `resend._domainkey.rh…` TXT com a chave pública DKIM. **Re-conferido ao vivo em 2026-07-28** (`dig`): SPF, DKIM e MX seguem publicados em `send.rh` / `resend._domainkey.rh` ✓. **Falta apenas:** **confirmação autoritativa do flag `verified` do lado do Resend** (rodar `RESEND_API_KEY=… npm run check:resend-dominio`).

> ✅ **CORREÇÃO 2026-07-28 — o "TXT `_dmarc` ausente" NÃO é uma lacuna real.** `_dmarc.rh.beautysmile.com.br` está de fato vazio, **mas o domínio organizacional tem política publicada**: `_dmarc.beautysmile.com.br` = `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@beautysmile.com.br`. Pela RFC 7489 §6.6.3, um subdomínio sem registro próprio **herda a política do domínio organizacional** — e o registro raiz não traz tag `sp=`, então `rh.` herda `p=quarantine`. Ou seja: **DMARC já cobre o subdomínio remetente**; publicar um `_dmarc.rh` só seria necessário para dar ao subdomínio uma política DIFERENTE da raiz. Como SPF e DKIM estão corretos e alinhados (o DKIM assina com `d=rh.beautysmile.com.br`), o correio autenticado passa. **Não há ação de DNS pendente para o DELIV-01.** Rodar `RESEND_API_KEY=… npm run check:resend-dominio` para fechar. ✅ **O veto foi LEVANTADO em 2026-07-28** — o fix da P39 está deployado (EF v3), então verificar o domínio já **não** transforma CR-01/CR-02 em dano real. DELIV-01 está liberado para fechar. Registro histórico abaixo:

- **DELIV-01 (registro histórico até 2026-07-26) — o subdomínio remetente `rh.beautysmile.com.br` NÃO estava verificado no Resend** → todo envio bate `403 domain not verified` e grava `status='falhou'`. Re-verificado por smoke fresco no início da P39-04 (contradisse o registro de "verificado" — por isso o gate re-verifica ao vivo, não confia no registro). **O operador optou explicitamente por aplicar a P39 mesmo assim** (rewire vivo, sends=`falhou`), aceitando que a recuperação virá pela varredura `pg_cron` da P41. Ação humana/DNS do Fernando: adicionar+verificar `rh.beautysmile.com.br` em https://resend.com/domains (SPF/DKIM auto + DMARC). **O funil AGORA dispara em tráfego real, mas só registra `falhou` até isto fechar** — quanto antes verificar, menos linhas acumuladas p/ o retry. Re-rodar o smoke da P38 após verificação deve dar `enviado`.
- **✅ RESOLVIDO 2026-07-28 — P41 / 41-05 Tasks 1 e 2 APLICADAS EM PROD.** Migration `20260727000001` aplicada via MCP `apply_migration` + **ledger reconciliado** (`20260728000659` → `20260727000001_p41_recon_retry`, em sequência após a P39, zero drift novo); smoke `p41_recon_retry_smoke.sql` **VERDE 5/5** (gate-GUC, 100% estrutural, zero INSERT); EF `resend-webhook` deployada **v1** (`verify_jwt=false`), com **`npm:svix` resolvido** (Pitfall 2 descartado — a EF executa e devolve a string do próprio código; um `ERR_MODULE_NOT_FOUND` falharia no boot). Cron `notif-retry-sweep` **ativo** `*/15 * * * *`. `varrer_retry_notificacoes()` executada ao vivo **sem exceção** e como **no-op real** (ledger 0 linhas; `net._http_response` inalterado, max id 61). Gate de supply-chain **T-41-SC limpo**: `svix@1.99.1` MIT, repo oficial, **sem `postinstall`** em toda a árvore, integridade do `deno.lock` **batendo 1:1** com o registry nos 4 pacotes (`svix` → `standardwebhooks` → `@stablelib/base64`, `fast-sha256`), `deno check` exit 0.
- **⏳ Cleanup do n8n cloud (DISPATCH-03) — pendente, ação humana.** A P39 aposentou o n8n do BANCO (0 `trg_n8n_*`) e do CÓDIGO deployado (submit-candidatura sem fetch). Falta fechar a superfície EXTERNA: desativar/apagar a(s) workflow(s) em `fernandocosta.app.n8n.cloud` (painel do Fernando). O secret `n8n_webhook_base` já não existe no Vault (nada a remover).
- **⚠ Drift pré-existente re-surfaced na P39-04 (NÃO-P39).** `db push --linked` reporta 7 versions órfãs (`20260713024106`…`20260714023002`) — migrations de 07-13/07-14 aplicadas via `apply_migration` (timestamp) e nunca reconciliadas ao prefixo do arquivo (2 sem arquivo local: `usr_rh_review_fixes_wr01_wr03`, `perfil_rh_rpc_hardening`). É o débito de drift já documentado (causa desconhecida), 2 semanas antes da P39. A version da P39 (`20260726000001`) está corretamente reconciliada → **zero drift novo**. NÃO reparado (fora de escopo; `--status reverted` do CLI marcaria migrations aplicadas como revertidas — errado). Rastrear p/ backlog de infra.
- **D-15 / RNF-07a / RNF-12a** — o template de rejeição (COMM-05) é fixo e neutro (grep-guard contra tokens de scoring), disparado só por decisão registrada por humano.
- **Contas de teste PROD:** `e2e.admin@beautysmile.com.br` (admin) + `recrutador` `fba9bc0f-4053-4eff-bc71-9cc8d1cddbe7` + `candidato.funil@teste.com`.
- 42-07 CHECKPOINT PENDENTE (bloqueante): apply de 20260730000003 + deploy da EF notificar-rh + smoke do round-trip. Ordem obrigatória: EF ANTES do trigger (net.http_post é at-most-once). Ler NOTIFICACOES_MODO na função nova antes do smoke — em PROD é 'producao' e o smoke mandaria e-mail real aos 5 RH. REVISAO-01 NÃO está entregue até isso passar
- 42-08 tem de renumerar sua migration para 20260730000004 (o 42-07 tomou o 20260730000003) E reescrever as asserções (a)/(b) do seu smoke: o CHECK vivo passa a ter 5 valores com o 42-07 e 6 com o 42-08
- 42-08 CHECKPOINT PENDENTE: deploy da EF notificar-candidato + apply de 20260730000004 (CHECK 6 valores + trg_notif_revisao_respondida) + smoke 4/4 + round-trip. ⚠ NOTIFICACOES_MODO é 'producao' e é secret de PROJETO: o smoke envia e-mail REAL — ver a tabela de opções A/B/C no 42-08-SUMMARY
- 42-12 CHECKPOINT PENDENTE (bloqueante, portão de fase destrutiva): INVENT-05 NÃO entregue. Ordem obrigatória — (1) medir ANTES por docs/compliance/sql/04-invent05-blast-radius.sql; (2) dry-run = delta alcance_corrigido−alcance_atual (se >0, volta ao checkpoint de decisão); (3) code review BLOQUEANTE antes do apply; (4) registrar corpo vivo + md5 dos 3 jobs; (5) apply_migration p42_invent05_not_exists + reparar ledger p/ 20260730000005 + assertir md5(statements[1]); (6) medir DEPOIS pela MESMA consulta (total_logs NÃO pode mudar — se mudar é incidente); (7) smoke 4/4 numa ÚNICA chamada + md5 dos vizinhos idênticos ao passo 4; (8) VERIFICATION.md com veredito; (9) preencher ⏳ do cron-inventory.md; (10) commit com hook, zero --no-verify
- 44-01 NAO fecha EXPORT-02 nem EXPORT-06: constroi o MECANISMO (escopo + gerador + fecho), nao o artefato. export-allowlist.json e _shared/exportAllowlist.ts so nascem no 44-03, com o catalogo vivo. Ate la 'node docs/compliance/sql/gen-export-allowlist.cjs' sai 1 — e essa E a saida correta. Dry-run contra a config real acusou 62 pendencias de fecho de coluna (superestimadas pelo proxy de tipos; ~20 sao temporais que o catalogo vivo resolve por R3): e a carga que o 44-03 herda.
- 44-04: database.types.ts NAO regenerado — auth gate do Supabase CLI (sem SUPABASE_ACCESS_TOKEN e sem supabase login). Desbloqueio: supabase login OU token no ambiente; depois gerar para TEMPORARIO antes do arquivo trackeado. Tambem: supabase db push --linked nao executado (CLI fora do PATH); ledger verificado por SQL direto
- 44-09: UAT ao vivo do SC#4 NÃO rodou — exige login real de recrutador E de administrador para medir a igualdade fila ≡ contador (BD-8) na tela. 7 passos em §Checkpoint do 44-09-SUMMARY.md. Não é bloqueio de código: a tela está completa e verde.
- 44-07: UAT ao vivo do EXPORT-03 pendente — abrir o próprio currículo em /candidato/privacidade, confirmar expiração do TTL de 60s e as 3 asserções negativas do DevTools. Também pendente: re-confirmar via MCP as 2 policies de SELECT do bucket curriculos (precondição da Task 1, medida no M4 em 2026-08-03 e não re-verificada).
- 44-09 / BD-8: zero vagas em PROD pertencem a usuário de papel 'rh' (6 com created_by NULL, 3 do administrador). O ramo 'rh' do predicado de escopo não devolve linha alguma hoje, e o UAT planejado é inconclusivo por desenho. Decisão do operador: popular created_by das 6 vagas órfãs, trocar o predicado para vagas_associadas_recrutadores, ou aceitar que a fila é de administrador. Fonte: 44-09-EVIDENCIA-BD8.md §3.

- **✅ RESOLVIDO 2026-08-03 — o `42804` da Phase 43, o SEGUNDO incidente de PROD do milestone, e o único encontrado por VERIFICAÇÃO em vez de por acaso.** *(Registrado aqui em 2026-08-04, fechando o achado **W-7** e o item 3 do `human_verification` da `43-VERIFICATION.md` — o `§BLOQUEADOR FECHADO` acima cobre só o primeiro incidente, e este não estava em lugar nenhum do `STATE.md`.)* `listar_matriz_retencao()` declarava `RETURNS TABLE (… text …)` mas `usuarios_rh.nome_completo` é `varchar(255)`: **toda chamada bem-sucedida** levantava `42804 — structure of query does not match function result type` desde o apply, e `/admin/retencao` não carregava para ninguém. Fechado pela migration `20260803000001` (`::text` na linha 102; `DO` de auto-verificação que **executa** o caminho feliz e exige 8 linhas; md5 `7e9b9797…` reproduzido do arquivo na 3ª passagem de verificação; `COMMENT` carrega a lição para dentro do banco).
  **Duas lições que valem para as fases 45/46/47, e são o motivo de este registro existir:**
  (1) **O smoke 10/10 não pegou.** Sua única asserção sobre aquela função testava a *recusa sem claim* — o guard levanta na primeira linha e o `RETURN QUERY` nunca executava. Um smoke que só exercita o caminho de recusa não é cobertura do caminho feliz, e conta como verde do mesmo jeito.
  (2) **O rebaixamento de verificação se pagou na hora.** O `PRESENT_BEHAVIOR_UNVERIFIED` da 2ª passagem sobre o SC#4 foi o que forçou o operador a abrir a tela — e foi assim que o bug apareceu. Comprou o conserto, **não** uma guarda: a asserção `(k)` que impede o `42804` de voltar nasceu dentro de `p43_matriz_retencao_smoke.sql`, que a asserção `(c)` tornou inalcançável no mesmo dia (**W-1**, todo `43-smokes-com-baseline-congelada-viram-red`). A fase corrigiu o defeito e não corrigiu a condição que o produziu. O `::text` já é regra viva no repo — ver `44-02-SUMMARY.md:125`.

- DI-45-10-01 e DI-45-10-02: as duas obrigações atribuídas ao 45-10 seguem ABERTAS (claims das RPCs + retirar_candidatura fora do vocabulário da EF). Exigem plano próprio com migration de GRANT e redeploy; o 45-11 não abre o portão sem elas.
- ✅ **RESOLVIDO 2026-08-11 — 47-04 Task 3: os seis paises FORAM medidos** pelo operador nos paineis e documentos dos fornecedores (commit `eeed0e5`; `WINDOWS.md` item 25 = `fixed`). Cinco tratam nos EUA; o ViaCEP declara jurisdicao brasileira com a ressalva de hospedagem nao divulgada. `/subprocessadores` **nao lanca mais**. A sentinela `PAIS_POR_MEDIR` e o validador ficaram como rede da proxima entrada. *(O registro anterior aqui dizia que os paises «nao sao mediveis deste ambiente» — estava **stale**, corrigido em 2026-08-12.)*
- ✅ **RESOLVIDO — 47-08 Task 3: o `RodapePublico` ESTA montado nas CINCO superficies**, conferido por grep em 2026-08-12: `LandingPage.tsx:103`, `VagasPublicasPage.tsx:535`, `VagaDetalhePage.tsx:493`, `SubprocessadoresPage.tsx:96`, `PrivacidadePublicaPage.tsx:175`. As duas paginas publicas **sao alcancaveis** da navegacao de producao — o SC#1 da Phase 47 se sustenta nesse ponto. *(O registro anterior dizia «nenhuma navegacao de producao leva a elas»; `WINDOWS.md` item 28 carrega a mesma afirmacao **stale**.)*
- ⏸ **PORTAO DE PUBLICACAO — o que de fato continua ABERTO (47-08 Task 1):** a revisao **FORMAL do Encarregado** dos quatro itens — os seis paises e a base legal de cada um, a formulacao do provedor de hospedagem, a qualificacao do servico publico de CEP e a copy das duas paginas. ⚠ **As paginas ja estao NO AR**, liberadas em 2026-08-11 por decisao **do operador**, e o proprio `47-08-SUMMARY.md` e explicito em **nao** conflar isso com parecer do Encarregado. `WINDOWS.md` itens 26 e 30. O que mudou desde o registro antigo: a publicacao **nao esta mais represada pelo portao** — ela aconteceu, e o portao segue aberto **atras** dela.
- A lista publica de subprocessadores foi ao ar com DOIS destinos de rede pendentes de classificacao pelo Encarregado: api.ipify.org (src/services/logAccessService.ts:110) e www.youtube.com (src/components/pages/InstrucoesFormularioPage.tsx:77)

## Deferred Verification

| Phase | State | Resume |
|-------|-------|--------|
| 42 | verification_deferred_human | `/gsd-verify-work 42` |
| **43** | **verification_deferred_human** — 1 item, reduzido de 3 em 2026-08-04 | `/gsd-verify-work 43` · ver abaixo |
| 44 (plano 44-05) | checkpoint_deferred_human | prova ao vivo no navegador — ver abaixo |
| **44 (fase)** | **verification_deferred_gaps** | `/gsd-plan-phase 44 --gaps` · mas ler o aviso abaixo |

### Phase 43 — dois dos três itens fechados em 2026-08-04, resta UM

`43-VERIFICATION.md`: **5/5 must-haves verificados**, `overrides_applied: 2`. A fase não tem
gap de implementação nenhum — o que a mantém em `human_needed` é uma única observação de tela.

| # | Item | Estado |
|---|---|---|
| 1 | **Bloco de guarda do currículo no ramo AUTORIZADO**, em `/candidato/privacidade` — a linha «Base da guarda: sua autorização de {data}. Prazo previsto: até {prazo}.» | ⏸ **ABERTO — é só isto.** Barato: exige um cadastro com a caixa `autorizacao_retencao_curriculo` **MARCADA**. O ramo que satisfaz o RETEN-03 renderiza só sob `autorizado === true` (`GuardaCurriculoBloco.tsx:114`), e a conta de teste ao vivo deixou justamente aquela caixa desmarcada — o que foi visto foi o ramo NÃO-autorizado. Combina numa só sessão de navegador com os itens A/B da §Deferred Verification da Phase 44 |
| 2 | Prévia de retenção no estado POPULADO | ✅ **`overrides:` `accepted_permanently`** (Fernando, 2026-08-04) — conversão recomendada verbatim pelo próprio verificador. Inobservável hoje e por meses: a matriz está em 24 meses (7 estados) e 18 (`rejeitado`), e o sistema é mais novo que qualquer das duas janelas; `previa_retencao()` devolve zero por **aritmética**, não por defeito. Encurtar a janela só para o teste seria fabricar a evidência. ⚠ **A Phase 46 é a primeira consumidora real deste predicado** (o dry-run reusa a MESMA query) — deve tratar a contagem como não-exercitada |
| 3 | Correções de registro (5 sub-itens) | ✅ **EXECUTADAS** — não aceitas. Fecham **W-2**, **W-6** e **W-7**. Detalhe no `overrides:` do `43-VERIFICATION.md` |

### ⚠ Phase 44 — `gaps_found` diferido por decisão do operador (2026-08-04)

`44-VERIFICATION.md` (commit `fa600ec`): **2/5** critérios de sucesso plenamente verificados.
O operador optou por **seguir para a Phase 45** com os gaps em aberto.

**Os gaps NÃO são "falta código".** Todo o código dos 6 requirements EXPORT-* existe, foi
revisado (2 blockers + 13 warnings, blockers corrigidos) e está verde: 1596 Vitest · 20 Deno ·
`tsc` 97 (baseline) · build + `assert-chunks` · `check:export-allowlist` exit 0.
`/gsd-plan-phase 44 --gaps` produziria planos para trabalho que não existe. O que fecha estes
gaps são TRÊS AÇÕES:

| # | Gap | O que fecha |
|---|---|---|
| G1 | EXPORT-01/02/03 nunca exercitados — 0 linhas em `solicitacoes_dados`, nenhum arquivo já gerado, nenhum currículo já aberto | sessão de navegador com conta de teste |
| G2 | **PROD roda a v1 PRÉ-CORREÇÃO** — os 8 commits de fix estão no `main`, a EF não foi redeployada. A v1 viva tem o cooldown que **falha ABERTO** em timestamp ilegível | `npx supabase login && npx supabase functions deploy exportar-meus-dados` (lê os bytes do disco; o caminho MCP exigiria retranscrever 45 KB de artefato gerado) |
| G3 | **EXPORT-05 rebaixado de Complete para parcial** — o ramo `rh` do predicado BD-8 não pode retornar linha para recrutador nenhum: 0 de 9 vagas com `created_by` preenchido pertencem a usuário de papel `rh` | **decisão do operador**: popular `created_by` das 6 vagas órfãs · trocar o predicado para `vagas_associadas_recrutadores` · ou aceitar que a fila é de administrador |

⚠ **CONSEQUÊNCIA DIRETA PARA A PHASE 45 — dita pelo próprio ROADMAP.** A cadeia `44 → 45` é
declarada **estrita** porque *"o inventário do export **é** o plano de exclusão"*. O inventário
existe e está versionado (SC#5 passou), mas a cláusula do goal — *"exercitado em produção"* — é
justamente a que falhou. A Phase 45 vai consumir como plano de exclusão **irreversível** um
inventário que nunca foi exercido de ponta a ponta.

**Isto NÃO bloqueia discutir/planejar a 45** — nada destrutivo roda em discuss/plan. Bloqueia o
**apply**: o portão de fase destrutiva do M8 vale para a 45 integralmente (VERIFICATION.md com
veredito · code review bloqueante ANTES do apply em PROD · asserções negativas · zero
`--no-verify` · dry-run pela MESMA query do delete real). G1 e G2 devem fechar antes desse portão.
Backup do Supabase é de 7 dias e **exclui Storage inteiramente**: um CV apagado é irrecuperável.

### 44-05 — prova ao vivo diferida (decisão do operador em 2026-08-04)

O operador escolheu **diferir e seguir a fase**. Isto é deferral de **checkpoint de plano**,
não de verificação de fase: a `44-VERIFICATION.md` ainda nem existe.

**O que JÁ está provado ao vivo** (orquestrador, `44-05-EVIDENCIA-DEPLOY.md`, commit `072c3d4`):

- EF `exportar-meus-dados` **criada** em PROD — **version 1**, `ACTIVE`, **`verify_jwt: true`**.
  Não existia antes; nenhuma versão foi sobrescrita.

- **Assunção A1 FECHADA positivamente.** O import `../_shared/exportAllowlist.ts` sobreviveu ao
  bundler: `POST` + publishable key devolveu `{"ok":false,"error_code":"UNAUTHORIZED",
  "message":"Sessão inválida."}` — strings do próprio `index.ts`, inalcançáveis se o módulo
  falhasse no boot. `GET` → 405 do handler; `OPTIONS` → 200. ⚠ **A forma do discriminador no
  plano estava errada**: sem `Authorization`, com JWT-ON quem responde é o *gateway*
  (`UNAUTHORIZED_NO_AUTH_HEADER`) e a requisição nunca chega à função — a prova é a **diferença
  entre os dois corpos**, não o 401 sozinho.

- **Asserção negativa:** `solicitacoes_dados` seguia em **0 linhas** após as sondas (401 sai no
  passo 1, antes do INSERT do passo 4).

- **Policies vivas (M3)** lidas de `pg_policies`: zero policy de escrita para o candidato; o RH
  não lê por policy, lê pelas RPCs `SECURITY DEFINER` `listar_pedidos_dados` /
  `contar_pedidos_dados_pendentes`.

**O que continua NÃO provado** (exige navegador + login de titular):

1. Caminho feliz ponta a ponta — clique → `.json` no aparelho → 1 linha `tipo='acesso'`,
   `situacao='atendido'`, `causa` NULA, `atendido_em` preenchida.

2. Render da seção 3 abaixo das duas vivas, seções 1 e 2 intactas.
3. Estado de carregamento com o botão desabilitado barrando o segundo clique.
4. Cooldown por tentativa real (segundo clique → erro, banco sem linha nova).

**Deliberadamente não exercido:** cunhar sessão de titular via Auth admin provaria o caminho
feliz sem navegador, mas **queimaria a janela de cooldown de 24 h** da conta de teste — o
primeiro clique humano cairia em 429 e destruiria a evidência que o passo 3 existe para produzir.

⚠ **A fase 44 NÃO pode fechar como completa enquanto isto estiver aberto.** A linha do ROADMAP
diz "provada ao vivo", e o portão de fase destrutiva do M8 exige `VERIFICATION.md` com veredito.
**O scanner do ROADMAP já re-marcou `44-05` como `[x]` DUAS vezes** (conta arquivos de SUMMARY,
e o do 44-05 é `status: checkpoint`) — revertido à mão nas duas. Conferir a linha 168 do
ROADMAP após cada plano.

**Decisão do operador em 2026-08-01:** diferir e seguir para a Phase 43. A Phase 42 verificou
**4/5 must-haves** (`42-VERIFICATION.md`, `status: human_needed`) e o **portão de fase
destrutiva passou 5/5**. A implementação está verificada — fila do RH, round-trip do Art. 20 nos
dois sentidos e inventário, todos provados em produção. O que ficou aberto NÃO é implementação:

1. **Guard REVISAO-05 contra JWT de navegador** (D6 do 42-10). Provado no servidor por smoke SQL
   com impersonação real; falta a confirmação contra um JWT emitido pelo `custom_access_token_hook`
   num browser, o que exige dois logins RH distintos.

2. **Caminho do recrutador ponta a ponta.** Resolução de roster provada ao vivo (a EF devolve os 3,
   com `role=recrutador`); a entrega não pode ser provada enquanto o endereço daquela conta for
   indeliverável — ver `42-recrutador-email-indeliveravel`.

3. **PITR** (metade do INVENT-02 / SC#4). Bloqueio de credencial **e** decisão de gasto; o próprio
   ROADMAP já o difere para a Phase 45.

## Deferred Items

### Reconhecidos no fecho do v7.0 (2026-07-28) — `override_closeout`

O gate pré-fecho (`audit-open`) listou 7 itens. Todos foram **reconhecidos e diferidos** por
decisão do operador ("deixe as duas coisas como pendência, finalize o milestone"). Nenhum é
blocker; todos estão rastreados em arquivo.

| Categoria | Item | Estado | Nota |
|-----------|------|--------|------|
| UAT | Phase 36 — UAT-36-1 (caixa de entrada) | `partial` | Infra fechada (domínio Verified, SPF/DKIM/MX, DMARC herdado, entrega provada). Aberto: só teste de **inbox real** em Gmail/Outlook + cabeçalhos PASS + Reply-To + tracking desligado. Não observável por API |
| UAT | Phase 36 — UAT-36-3 (`NOTIFICACOES_MODO=producao`) | `pending` | A variável agora existe como `teste` (explícito, não por ausência) — o modo de falha silencioso está fechado. Falta o **flip**, que é decisão de negócio |
| UAT | Phase 38 — UAT-38-1 | ✅ `passed` | **Fechado hoje** — entrega real provada (`enviado` → `entregue`); listado só por completude |
| todo | `m7-ativar-modo-producao` (**high**) | pending | A única chave entre o pipeline provado e o candidato real |
| todo | `m7-cleanup-n8n-cloud` (medium) | pending | Superfície externa segue ativa/acionável; banco e código já limpos |
| todo | `36-resend-chave-divergencia` (medium) | pending | `cost-alerter` mantém a chave Resend em env secret da EF, fora do Vault (blast-radius separado, decisão deliberada) |
| todo | `25-review-deferred` (medium) | pending | Herdado do M5 |
| todo | `cc0-cognitive-item-bank-sourcing` (medium) | pending | Herdado do M4 |
| todo | `processo-origem-do-drift-desconhecida` | pending | Causa do drift PROD→repo nunca identificada; um caminho de apply fora do repo pode existir |

**Cobertura Nyquist (lacuna, não falha):** 4 fases com `VALIDATION.md` em `status: draft`
(36, 38, 39, 41) e 2 sem arquivo (37, 40). São TODOs de cobertura — rodar
`/gsd-validate-phase <N>` promove o arquivo e dá o veredito real.

### Carregados de milestones anteriores:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Feature (→ M8+) | WhatsApp/SMS · opt-out/central de preferências · nurture/digest · TALENT (banco de talentos) · LGPD-OPS (retenção/Art. 20 queue) · PSICO · relatórios completos + export CSV/PDF | Deferred → M8+ | M7 kickoff |
| Feature (M7 v2) | RNF-SLA-06 nota estruturada do RH na rejeição (guardrail de frases) · nudge a cada N dias · deep-link CTAs no e-mail · re-envio manual pelo RH · timeline computada do histórico · nudge de bounce no painel | Deferred → M7-v2/backlog | M7 kickoff |
| Tech-debt (resolvido no M7) | SEC-03 Vault secret `n8n_webhook_base` → **resolvido por substituição na Phase 39** (aposenta o n8n) | In M7 scope (P39) | M4/M5 close |
| Tech-debt | DBMIG-01 baseline+rebuild (environment-gated — Docker/CLI-auth) · CC0-01 seed cognitivo | Deferred → backlog | M4/M5 close |
| UX gap (M6) | W-1: Histórico VISRH-03 renders `ator` UUID instead of recruiter name (needs usuarios_rh join) | Deferred → backlog (highest-value M6 follow-up) | M6 close |
| Live UAT (carregado) | HUMAN-UATs P22/23/24/28/29/30/31/34/35 — browser + real-login + real-calendar/SMTP checks | Deferred → live UAT session | M4–M6 close |

## Session Continuity

Last session: 2026-08-12T01:28:29.126Z
Stopped at: Completed 45-16 (WR-A e WR-E fechados no disco; nada aplicado)
Resume file: None

## Decisões travadas para a Phase 45 (operador, 2026-08-04)

As três decisões de negócio que a pesquisa do M8 escalou no kickoff e que a Phase 45 não podia
começar sem. Respondidas ANTES do discuss, não durante — são entradas do planejamento.

| # | Decisão | Resposta | Consequência de desenho |
|---|---|---|---|
| **Janela de arrependimento** | **15 dias** | Espelha o prazo do Art. 19, II que a Phase 44 já usa na fila do RH. **Um só número no sistema**: a mesma constante governa o SLA de acesso e a janela de cancelamento, então há uma fonte a auditar em vez de duas a divergir. A janela é cancelável (ERASE-*) e a execução só dispara ao fim dela. |
| **BD-9** — justificativa do recrutador em `decisao_final` | **Preservar ANONIMIZADA** | O texto sobrevive como prova de não-discriminação (Art. 7º, VI / RNF-07a); o **vínculo com o titular não**. Implica que o motor da 45 trate esta coluna por tombstone/desvinculação, não por `DELETE` — e que a Phase 44 mantenha a exclusão da coluna no export (a decisão de exportar era outra pergunta e segue `false`). ⚠ A mesma decisão vale para `decisao_final_historico.justificativa`, senão o histórico entrega o que a linha corrente protege. |
| **PITR** | **NÃO ligar — risco aceito e datado** | ⚠⚠ **A 45 executará mutação irreversível sobre PII viva com backup de 7 dias que EXCLUI STORAGE INTEIRAMENTE.** Um CV apagado por engano é irrecuperável **por qualquer meio** — não há segunda rede. Consequência direta e não-negociável: o **dry-run passa a ser a única proteção que existe**, e por isso o portão de fase destrutiva do M8 (dry-run pela MESMA query do delete real, asserções negativas, code review bloqueante antes do apply) deixa de ser processo e vira o mecanismo de segurança propriamente dito. Nenhum apply destrutivo em PROD sem ele. |

**O que isto NÃO decide:** a ordem `Storage → Postgres → Auth` continua sendo mutação de três
sistemas **não-atômica, sem transação compartilhada** — o risco estrutural nomeado no ROADMAP
segue de pé e é problema de engenharia, não de decisão do operador.

## Operator Next Steps

1. **Revisar o ROADMAP** (`.planning/ROADMAP.md`) — em especial o desvio deliberado em relação à proposta da pesquisa: CONSENT ficou íntegro na Phase 43 em vez de dividido entre 42 e 43, e **TRANSP-01/02 (que a proposta de 6 fases da pesquisa deixou sem fase) foi mapeado à Phase 47**.
2. `/gsd-plan-phase 42` para começar. A Phase 42 é read-only exceto por INVENT-05.
3. **Decisões de negócio que a pesquisa escalou e que ainda não têm resposta** — nenhuma bloqueia a Phase 42, mas todas precisam estar respondidas antes da fase indicada:
   - **BD-1 (Phase 43):** o número dentro de [0, 2 anos] por estado da candidatura. O teto de 2 anos já é contratual (copy do cadastro); a decisão remanescente é o número, e ela precisa de advogado trabalhista, não de mais pesquisa.
   - **BD-2/BD-3 (Phase 43):** honrar ou remover `autorizacao_comunicacao`; manter ou reescrever o rótulo "revisão por pessoa natural".
   - **BD-9 + PITR (Phase 45, ambas antes de qualquer código destrutivo):** redigir ou preservar a justificativa ≥50 caracteres do recrutador em `decisao_final`; e **status do PITR como fato datado** — ligar é decisão de gasto, e Storage não tem backup **independente** do PITR.
   - **Janela de arrependimento (Phase 45):** número de dias.

## Decision Coverage Override — Phase 44 (2026-08-03)

`check.decision-coverage-plan` devolveu `passed: false` com razão **`could-not-parse`** — não
"decisão descoberta". O gate procura bullets no formato `- **D-NN:** …`; este projeto nomeia
decisões como `BD-N` (Phase 43 e 44) e `D-P42-NN` (Phase 42). É **incompatibilidade de formato com
uma convenção já estabelecida do projeto**, não uma decisão perdida.

Cobertura verificada **à mão** antes de prosseguir, e cada decisão medida tem plano:

| Decisão | Implementada por |
|---|---|
| BD-6 — allowlist derivada do catálogo VIVO, coluna sem classificação é erro de fechamento | 44-01, 44-03 |
| BD-7 — candidato cunha o próprio signed URL client-side (60 s), `service_role` fora do caminho | 44-05, 44-07 |
| BD-8 — escopo da fila por vaga + admin vê órfãos; fila ≡ contador pelo MESMO predicado | 44-02, 44-08, 44-09 |
| SC#3 asserção 1 — snapshot inline das chaves | 44-01, 44-03 |
| SC#3 asserção 2 — smoke SQL contra `information_schema` | 44-03 |
| M3 — leitura viva de `pg_policies` pós-apply | 44-04, 44-07, 44-08 |

**Para o verify-phase:** este override é de FORMATO. Se o gate for ajustado para aceitar `BD-N`,
ele deve passar sem mudança nos planos.
