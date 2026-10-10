---
phase: 51-consertos-da-jornada-bloco-3
reviewed: 2026-10-09T23:59:52Z
depth: deep
diff_base: bb629816edb031c324b4140ad6899b00065c8b80
reviewed_head: 371c6f75bc3b3d29c3003b131f7edb7bccb845c0
scope: review adversarial bloqueante nº 3 do portão da Onda B do JORN-42 (51-16, rodada de conserto do 51-REVIEW-PORTAO-2). Escopo — o diff de código inteiro `bb629816..371c6f75 -- . ':!.planning'` (70 arquivos) e o `51-16-PLAN.md`, lido como o programa que escreve em PROD; foco na rodada `6dc622da..371c6f75` (9 commits — a 0005 reescrita e renomeada `…_p51_d23_decisor_revertido.sql`, que passa a tocar também `registrar_decisao`; ME1..ME11; a mensagem própria da recusa D-23 no cliente; IN-02, IN-03, IN-05 e IN-06 do -2). Lidos como contexto, fora da lista revisada — 51-REVIEW-PORTAO-2, 51-16-DECISAO-PENDENTE (respostas do operador, commit 686e24d7), CLAUDE.md, p46apply.cjs, p50_enumera.cjs, decisaoService.ts e RegistrarDecisaoForm.tsx (48-15), HubCandidatoRH.tsx, e os corpos VIVOS (só leitura) de rejeitar_candidatura, registrar_decisao, guard_rejeicao_auditada, avancar_etapa e a policy rh_avanca_etapa. PROD só leitura (`set transaction read only`) ou em requisições que abortam. Re-executados — ensaio `--vistas` com 0002..0005 + p51_revisao_rejeicao_smoke (ENSAIO VERDE, vistas=igual, 51b=18/18, `05:rejeitar_candidatura=703e47e67cc8,registrar_decisao=45f65ffc5679,d23=4,outras=igual,anon=false`); os 16 smokes do verify 3 do Task 2 com 0002..0005 prefixadas (16 verdes); `p51_mutacoes.cjs` (controle verde; 44/44 mordem; nada persistiu); `p51_portao.cjs --auto-teste` (68 casos ok); `p51_catalogo_confere.cjs --auto-teste` (11 ok); vitest de triagem, explicacao/services e decisao (19 arquivos, 328 testes verdes); uma sonda do revisor no ensaio que aborta (PATCH direto e a assimetria em_espera/aprovado) e três mutações do revisor no ensaio que aborta (filtros `h.decisao`, `d.decisao` e `h.candidatura_id` do (2c) de rejeitar_candidatura). Medido — md5(prosrc) vivo rejeitar_candidatura 75c0d3d0451a6f8c1e1a4425208daa4a e registrar_decisao 7da195353109938c8e572cb61800de06; `replace(vivo, âncora, âncora || bloco)` = corpo do arquivo, byte a byte, nas DUAS (âncora única em cada); comentários novos começam pelo vivo (1103 → 1891 e 1950 → 2537 caracteres); ACL viva das duas `postgres, authenticated, service_role`, anon sem EXECUTE; ledger de PROD com cabeça 20261008000001, `revisao_rejeicao` ausente; 1 par (candidatura, decisor) real travado pelo ramo decisao_final. Nada foi aplicado, publicado ou empurrado. O único commit é este arquivo.
files_reviewed: 71
files_reviewed_list:
  - docs/compliance/__tests__/exportAllowlist.test.ts
  - docs/compliance/catalogo-vivo-44.json
  - docs/compliance/export-allowlist.json
  - docs/compliance/export-scope-rules.yaml
  - docs/compliance/pii-inventory.md
  - docs/compliance/pii-inventory.yaml
  - docs/compliance/recibo-exclusao.json
  - docs/compliance/sql/05-export-allowlist-drift.sql
  - docs/compliance/sql/gen-recibo-exclusao.cjs
  - e2e/explicacao-flow.spec.ts
  - scripts/p50_desfazer.cjs
  - scripts/p51_catalogo_confere.cjs
  - scripts/p51_ensaio.cjs
  - scripts/p51_mutacoes.cjs
  - scripts/p51_portao.cjs
  - src/__tests__/guards/nomes-instrumentos.grep.test.ts
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.reaberta.test.tsx
  - src/features/avaliacao-cognitiva/__tests__/ravenService.status.test.ts
  - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
  - src/features/avaliacao-cognitiva/components/RavenCandidatoCard.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.conclusao.test.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/RavenCandidatoCard.test.tsx
  - src/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato.ts
  - src/features/avaliacao-cognitiva/services/ravenService.ts
  - src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts
  - src/features/avaliacao/components/AvaliacaoContainer.tsx
  - src/features/avaliacao/services/avaliacaoService.ts
  - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
  - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
  - src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx
  - src/features/explicacao/components/__tests__/SolicitarRevisaoCTA.test.tsx
  - src/features/explicacao/hooks/useExplicacao.ts
  - src/features/explicacao/services/__tests__/explicacaoService.test.ts
  - src/features/explicacao/services/explicacaoService.ts
  - src/features/privacidade/constants/reciboExclusao.generated.ts
  - src/features/privacidade/services/exportacaoService.ts
  - src/features/revisao/components/ContextoKnockoutRevisao.tsx
  - src/features/revisao/components/FilaRevisoesTable.tsx
  - src/features/revisao/components/OrigemRevisaoBadge.tsx
  - src/features/revisao/components/ResponderRevisaoDialog.tsx
  - src/features/revisao/components/__tests__/FilaRevisoesTable.test.tsx
  - src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx
  - src/features/revisao/hooks/__tests__/useResponderRevisao.test.ts
  - src/features/revisao/services/__tests__/revisaoService.test.ts
  - src/features/revisao/services/revisaoService.ts
  - src/features/triagem/hooks/__tests__/useRejeitarCandidatura.test.ts
  - src/features/triagem/hooks/useRejeitarCandidatura.ts
  - src/features/triagem/services/__tests__/triagemService.test.ts
  - src/features/triagem/services/triagemService.ts
  - supabase/functions/_shared/__tests__/email-templates.test.ts
  - supabase/functions/_shared/email-templates.ts
  - supabase/functions/_shared/exportAllowlist.ts
  - supabase/functions/_shared/reciboExclusao.ts
  - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
  - supabase/functions/notificar-candidato/index.ts
  - supabase/migrations/20261008000001_p51_raven_em_avaliacao_status.sql
  - supabase/migrations/20261008000002_p51_revisao_rejeicao.sql
  - supabase/migrations/20261008000003_p51_fila_tres_origens.sql
  - supabase/migrations/20261008000004_p51_motor_revisao_rejeicao.sql
  - supabase/migrations/20261008000005_p51_d23_decisor_revertido.sql
  - supabase/tests/p44_export_drift_smoke.sql
  - supabase/tests/p45_motor_exclusao_smoke.sql
  - supabase/tests/p48_prazo_reabertura_smoke.sql
  - supabase/tests/p50_acesso_recrutador_smoke.sql
  - supabase/tests/p51_catalogo_revisao_rejeicao.sql
  - supabase/tests/p51_raven_status_smoke.sql
  - supabase/tests/p51_revisao_rejeicao_smoke.sql
  - .planning/phases/51-consertos-da-jornada-bloco-3/51-16-PLAN.md
findings:
  critical: 0
  warning: 2
  info: 7
  total: 9
status: issues_found
---

# Phase 51: Code Review Report — portão nº 3 da Onda B (JORN-42), rodada de conserto do review -2

**Reviewed:** 2026-10-09T23:59:52Z
**Depth:** deep
**Files Reviewed:** 71 — os 70 arquivos de código do diff e o `51-16-PLAN.md`
**Status:** issues_found, com 0 crítico

## Summary

Comecei assumindo que esta rodada tinha trazido um blocker novo, como já aconteceu duas vezes neste projeto. O lugar
mais provável era a 0005 reescrita, porque agora ela também reescreve `registrar_decisao`, a função central do ciclo
`decisao_final` da P48. Depois vinham um falso positivo da trava (RH legítimo travado), a tradução de erro no cliente e
o portão.

**Não achei crítico.** O que eu conferi e está certo:

- A 0005 é o corpo vivo das duas funções com um único bloco inserido, byte a byte, e o (2b) da P48 continua intacto.
- A ordem e o desfazer estão corretos.
- A trava não prende quem não deve:
  - nas 16 sondas «aceito» da (q);
  - em 3 mutações do revisor, das quais 2 mordem;
  - na população real de PROD.

Ficaram dois warnings:

- **WR-01** (anterior a esta rodada, provado por execução): o «fechar as 4» fecha as duas **RPCs**, mas o decisor
  revertido ainda rejeita de novo por um PATCH direto em `candidaturas`, pela policy `rh_avanca_etapa`. É um 5º caminho,
  que vem desde a P48.
- **WR-02**: um filtro da trava que o próprio código chama de load-bearing (`h.decisao = 'rejeitado'` no ramo arquivo de
  `rejeitar_candidatura`) pode ser removido sem que o portão perceba: as 44 mutações e a (q) continuam verdes, e o
  plano afirma ter uma mutação por filtro.

### Veredito por item do 51-REVIEW-PORTAO-2

| Item | Veredito | Evidência |
|---|---|---|
| WR-01 (D-23 contornável por `registrar_decisao`) | **resolvido** | O (2c) novo de `registrar_decisao` recusa `rejeitado` de quem tem `revisao_rejeicao` revertida com `rejeitado_por = v_uid`. Na (q), `a_rd_rv` e `a_rd_rvd` dão 42501 (D-23); a ME6 desliga o bloco e morde. Sonda do revisor `esp_rej_z`: o decisor revertido grava `em_espera`, depois tenta `rejeitado` e recebe 42501 (D-23). |
| WR-02 (recusa D-23 chega como «Tente novamente») | **resolvido** | `rejeitarCandidatura` separa `42501` + marca `D-23` → `FORBIDDEN_DECISOR_REVERTIDO`. Um `42501` sem a marca vira `FORBIDDEN`, com cópia própria: nenhum 42501 é engolido como D-23. A marca sem 42501 continua `DATABASE_ERROR`. `GENERICO` é igual byte a byte ao texto antigo, e um teste fixa isso. O hook usa a tradução real (o mock importa o original). Esse hook é o único caminho do cliente até `rejeitar_candidatura` (`RejeitarCandidaturaDialog`). Os 42501 vivos de `rejeitar_candidatura` são só os guardas `forbidden` e o D-23; nenhum trigger de `candidaturas` levanta 42501 (medido). Vitest: 328 verdes. |
| WR-03 (reversão do ciclo `decisao_final` + `rejeitar_candidatura`) | **resolvido** | O (2c) de `rejeitar_candidatura` lê a linha vigente e o arquivo com o predicado do (2b) da P48. `a_rc_dv` e `a_rc_dh` dão 42501 (D-23); ME4 e ME5 mordem. A (j) `rev` trocou A por B: a (j) julga a origem e a elegibilidade (`{origem: humana_triagem, elegivel: true, pedido: null}`), não o ator, então nada ficou mais fraco. |
| IN-01 (`em_espera` reacende alerta de ciclo superado) | **não resolvido; concordo com aceitar e registrar** | O laço 2 marca `alerta_prazo_enviado_em` por pedido, e só dispara com a candidatura não encerrada e na etapa da reabertura. O dano máximo é **um** e-mail interno a mais por pedido, sem efeito para o titular nem para o estado. Mexer agora reabriria a 0003, a (p) e MC9/MC10 às vésperas do apply, com risco maior que o defeito. |
| IN-02 (`42883` de dentro do corpo) | **resolvido** | `RE_RPC_AUSENTE_42883 = /\bfunction\s+(?:public\.)?estado_revisao_rejeicao\(/`, testado com as duas formas (posicional e nomeada, que é a do PostgREST) e com três negativos. Se a mensagem do Postgres/PostgREST mudar (outro idioma, aspas), a falha vai para o lado seguro: `DATABASE_ERROR`, nunca o fluxo antigo. Pela ordem D-55, o fallback só serve na janela «cliente à frente do banco», que o plano não cria. |
| IN-03 (forma do (8) mais estreita que o `p46apply`) | **resolvido** (resíduo no IN-06) | `RE_CITA_P51` recusa `*_p51_*` fora de `RE_MIG_P51`. Caso 58 do auto-teste (`…_p51_D23-fix.sql`), 68/68. |
| IN-04 («EF antes do push» só em prosa) | **não resolvido; concordo com manter como `judgment`** | O dano de inverter é leve e temporário (o -2 mediu). A sequência seco → deploys → push sai de um único executor com a janela concorrente pausada (resposta (b)). Um GET de versão no portão acrescentaria rede ao caminho fail-closed sem fechar dano relevante. |
| IN-05 (passo 1 do «Desfazer» sem alvo) | **resolvido** (resíduo no IN-04) | Alvo `src`/`e2e` = `R-antes`, comando escrito, enumerador com `--assunto '^revert\(51-16\): '` e push por sha em avanço rápido. |
| IN-06 (B administrador na população viva) | **resolvido** | A (q) cria C, `rh` ativo não-admin, e confere a forma dele (vácua = FALHA). ME10 e ME11 mordem; a ME11 só morde por C. Evidência do ensaio: `ok=16(b:administrador,c:rh)`. |

### Medição em PROD: pares (candidatura, decisor) travados assim que a 0005 for aplicada

Só leitura (`set transaction read only`), linhas com `revisao_veredito = 'revertida' AND decisao = 'rejeitado'` em
`decisao_final` e em `decisao_final_historico`, agrupadas por (candidatura, `por_usuario`):

- **Ramo `revisao_rejeicao`: 0 pares.** A tabela ainda não existe em PROD e nasce vazia (D-08).
- **Ramo `decisao_final`: 1 par.** Candidatura `2ce20fbf…`, decisor `4fceff36…` (administrador ativo, não sintético).
  - **Por que o par é legítimo:** a linha está no arquivo e foi decidida antes da resposta da revisão. É o decisor
    original revertido, não alguém que herdou o veredito. O formato pré-P48-11 sem zeragem, em que outra pessoa herdaria
    a linha revertida, não aparece em PROD.
  - **O efeito prático é nulo:**
    - a candidatura está encerrada (`aprovado/finalizado`) e a decisão vigente é de outra pessoa;
    - `rejeitar_candidatura` já a recusava pela trava de encerrada;
    - o (2b) da P48 já impede esse administrador de qualquer decisão nela;
    - o hub não oferece «Rejeitar» em candidatura encerrada (`HubCandidatoRH.tsx`).

    A única mudança observável é a mensagem: o D-23 passa a vir antes de «já encerrada» (IN-01).
- **Veredito:** é o comportamento esperado. Não há população histórica que deixe alguém travado indevidamente.

Os casos de falso positivo pedidos, conferidos:

| Caso | Resultado | Como |
|---|---|---|
| RH que não foi o decisor | aceito | 12 sondas `b_*`/`c_*`, com B administrador e C `rh` |
| Revisão **mantida** | não trava | `a_rc_mt` → 23514 de encerrada, nunca o D-23; ME3 morde |
| Revisão revertida de **outra** candidatura | não trava | `a_rc_sr`/`a_rd_sd`: o mesmo titular, outra vaga, aceito |
| Mesma candidatura, outra etapa | trava para sempre, de propósito | Semântica da P48 («um ciclo antigo continua travando»), escrita no cabeçalho da 0005 e no comentário |
| Outra vaga | não trava | É outra candidatura |

### A 0005 contra os corpos vivos, a ordem e o desfazer

- **Byte a byte:** para cada função, `replace(prosrc vivo, âncora, âncora || bloco)` é idêntico ao corpo do arquivo
  (script do revisor sobre o `prosrc` lido em só-leitura). A âncora ocorre uma vez. Em `registrar_decisao`, a âncora é o
  `RAISE … (D-23)` + `END IF;` do (2b): o (2b) fica **intacto** e o (2c) entra logo depois, antes do upsert. A trava do
  POS (`<> 2` RAISE do D-23, ordem helper < (2b) < (2c) < upsert) prende isso. md5 novos `703e47e6…`/`45f65ffc…` iguais
  às constantes do POS e à evidência do ensaio.
- **ACL e `anon`:** o PRE captura o conjunto (`aclexplode`) e o POS exige igualdade e `anon` sem EXECUTE. Vivo:
  `{postgres, authenticated, service_role}`, anon false nas duas.
- **Ordem:** o PRE recusa sem `revisao_rejeicao` (0002 antes). A 0002 exige no PRE os md5 vivos de hoje das duas funções,
  então a 0005 antes da 0002 faria a 0002 recusar, como o plano diz. A 0003 e a 0004 não tocam as duas funções (só a
  0003 cita `registrar_decisao` num teste de leitura de código). Ensaio na ordem 0002 → 0005: verde.
- **Desfazer:** o Passo 1 do Task 2 captura **as duas** (`rejeitar_candidatura` e `registrar_decisao`) com ACL e
  comentário em `51-16-CORPOS-ANTES.sql`, e o passo 3 do «Desfazer» restaura as duas, mantendo o (2b). Ressalva de ordem
  no IN-05.
- **Nome antigo:** nenhum script nem plano aponta para `…_p51_d23_rejeitar_candidatura.sql`. Ele aparece só em
  comentários (cabeçalho da 0005, `p51_ensaio.cjs`) e na nota do plano que explica por que o nome antigo casa a forma do
  `--caminhos` do push (ele sai num `feat(51-16)`).

### A assimetria do (2c) de `registrar_decisao`: coerente, sem caminho de contorno

O (2c) trava só `rejeitado`. O (2b) da P48 trava qualquer decisão. Provei na sonda do revisor, no ensaio que aborta,
com o decisor revertido R1 (recrutador `rh` sintético) e reversão por `revisao_rejeicao`:

- `em_espera` é **aceito**, e o `rejeitado` seguinte recebe **42501 (D-23)**. O `em_espera` não grava nada que o (2c) leia
  (ele lê `revisao_rejeicao`, imutável fora do motor), então não abre a porta.
- `aprovado` é **aceito** (a candidatura vai a `aprovado/finalizado`), e o `rejeitar_candidatura` seguinte recebe
  **42501 (D-23)**, que vem antes da trava de encerrada.
- O `em_espera` também não silencia o alerta de prazo (WR-06 do -1: o laço 2 ignora `em_espera`).

Não existe sequência de RPCs pela qual o decisor revertido chegue a uma rejeição. Aprovar continua possível, e isso é
favorável ao titular e é exatamente o escopo escrito pelo operador («não re-rejeita»). A diferença em relação à P48 é de
política, não um furo. O único resíduo é de cópia: o formulário da decisão final diz que «a nova decisão» precisa de
outra pessoa (IN-02). O caminho que **contorna** a trava não é a assimetria, é o PATCH direto (WR-01).

### Mutações ME1..ME11 e o resto da rodada

- `p51_mutacoes.cjs`: «controle verde; 44/44 mutacoes mordem; nada persistiu». A leitura só-leitura final é igual à
  baseline (ledger `["20261008000001"]`, funções 9, `revisao_rejeicao` ausente, fixtures 0/0). Cada ME1..ME11 morde na
  letra declarada (ME2 em (f), as outras em (q)).
- **Fixtures trocadas de A para B em (f), (j) e (p):** nenhuma cláusula enfraqueceu.
  - (f) julga o direito novo;
  - (j) julga origem e elegibilidade (o JSON de `estado_revisao_rejeicao` não tem ator);
  - (p) julga o alerta, e o laço 2 não olha o ator;
  - a sonda «outro RH aceito», que existia com B, agora existe com B **e** C, e o «A recusado» passou de 1 combinação
    para 8.
- **Varredura pela forma** (padrão do CLAUDE.md) nas linhas acrescentadas da rodada, em smokes e migrations: 7 achados,
  todos na 0005 e todos escopo deliberado.
  - colunas exigidas (`<> 3`, `<> 8`);
  - lista das 9 «outras» funções capturadas no PRE e comparadas no POS, nos dois lados da mesma migration, para
    «nenhuma outra mudou aqui»;
  - âncora única (`<> 1`);
  - «começa por» do comentário;
  - exatamente dois RAISE do D-23 (`<> 2`).

  As listas `c_d23`/`c_ok` da (q) são as sondas da própria fixture. Nada disso é fotografia da população viva.
- **Portão:** o auto-teste passa em 68 casos, incluindo o novo «fora da forma».
- **Enumerador:** os `--caminhos` de `src/features/triagem/` são 4 arquivos nomeados (serviço, hook e os dois testes),
  sem curinga. Um commit de outra sessão nesses arquivos só passaria com assunto `(…)(51-NN)` **e** contido no
  `reviewed_head` **e** no pin. Medido antes deste commit, com os `--caminhos`/`--assunto` do plano sobre `ls-remote` = `origin/main` =
  `ad2790a3` → `371c6f75`: `enumeracao ok: 61 commit(s)`, todo commit `codigo` ou `planning`, nenhum ALHEIO. Os
  commits da rodada caem em `codigo`, e nada de outra sessão está no intervalo.

## Warnings

### WR-01: o decisor revertido ainda rejeita de novo por PATCH direto em `candidaturas` — o «fechar as 4» fecha as RPCs, não o 5º caminho (anterior a esta rodada)

**File:** policy viva `rh_avanca_etapa` (UPDATE em `public.candidaturas`) · `guard_rejeicao_auditada` (viva) · `supabase/migrations/20261008000005_p51_d23_decisor_revertido.sql:26-28`

**Issue:** O operador decidiu que o decisor revertido «é recusado ao tentar rejeitar de novo». A 0005 faz isso nas duas
RPCs. Mas `authenticated` tem UPDATE de tabela em `candidaturas`, a policy `rh_avanca_etapa` libera qualquer `rh`
ativo ou administrador, e `guard_rejeicao_auditada` aceita a entrada em `rejeitado` quando o mesmo UPDATE muda a
etapa (o histórico é gravado por `avancar_etapa`).

**Provado por execução:** sonda do revisor no `p51_ensaio.cjs` com 0002..0005 prefixadas, requisição abortada, nada
persistiu. R1, decisor revertido nas duas fontes, roda `UPDATE public.candidaturas SET etapa_atual='rejeitado',
status='rejeitado'` sob o próprio JWT, exatamente o PATCH que o PostgREST faria:

- `patch_x` (reversão por `revisao_rejeicao`): `ACEITO:linhas=1:estado=rejeitado/rejeitado:hist_ator_r1=2`;
- `patch_y` (reversão do ciclo `decisao_final`): `ACEITO:linhas=1:estado=rejeitado/rejeitado:hist_ator_r1=2`;
- e, na mesma sonda, `rejeitar_candidatura` por R1 em X e em Y recebe `42501 … (D-23)`.

Esse caminho também não exige justificativa ≥ 50 nem motivo. A UI não o oferece: `updateCandidaturaEtapa` recusa
`'rejeitado'` **no cliente**. A classe é conhecida desde o `M4-SYSTEM-AUDIT.md` (status-only foi fechado; etapa+status
ficou como «transição auditada»), e o D-23 da P48 sempre teve o mesmo furo.

**Severidade:** warning, não crítico.
- Não foi introduzido nesta rodada e não piora com a 0005.
- Não exige mais que um RH autenticado montando uma chamada de API.
- Não fere direito do titular: a nova rejeição tem ator R1, e o titular pode pedir revisão dela de novo.
- Não trava ninguém indevidamente.

Mesmo assim, o operador deve saber que «fechar as 4» descreve as combinações fonte × **RPC**, não todo caminho de
rejeição.

**Fix:** fora do apply deste plano (é um conserto de P31/P48 com review próprio). Em `guard_rejeicao_auditada`, para
`auth.uid() IS NOT NULL`, exigir `app.rejeicao_sancionada = 'on'` em toda entrada em `rejeitado`, e fazer
`rejeitar_candidatura` declarar a sanção, como `registrar_decisao` já faz. Assim o único caminho do RH até `rejeitado`
passa a ser uma das duas RPCs, as que têm o D-23. No mínimo, registrar a ressalva ao lado da decisão «fechar as 4» no
SUMMARY.

### WR-02: o filtro load-bearing `h.decisao = 'rejeitado'` do ramo ARQUIVO de `rejeitar_candidatura` pode sair sem que o portão perceba

**File:** `supabase/migrations/20261008000005_p51_d23_decisor_revertido.sql:242-246` · `supabase/tests/p51_revisao_rejeicao_smoke.sql` (q) · `scripts/p51_mutacoes.cjs` (ME1..ME11) · `51-16-PLAN.md:258`

**Issue:** O comentário do próprio bloco diz que `decisao = 'rejeitado'` é load-bearing. Sem ele, quem registrou um
`em_espera` durante uma reabertura herda `revisao_veredito = 'revertida'` com `por_usuario` = ele mesmo. Quando essa
linha vai para o arquivo, a pessoa fica travada para sempre, sem ter sido revertida. Esse é exatamente o falso positivo
«trava indevidamente o trabalho do RH».

Mutações do revisor, cada uma no ensaio que aborta com 0002..0005 + a mutação + o smoke:

| Mutação do revisor | Resultado |
|---|---|
| remove `AND h.decisao = 'rejeitado'` do ramo arquivo | **ENSAIO VERDE, 51b=18/18 — não morde** |
| remove `AND d.decisao = 'rejeitado'` do ramo vigente | morde: `P51B FAIL (q): b_rc_dh = «42501 … (D-23)»` |
| troca `h.candidatura_id = p_candidatura_id` por `true` | morde, com diagnóstico falso (IN-03) |

Nenhuma fixture põe no **arquivo** uma linha revertida com `decisao <> 'rejeitado'` de alguém que depois é sondado como
«aceito». Em `dh`, o `em_espera` de B fica na linha vigente. O plano (verify 6) diz que as 44 são «one per branch/filter
of the D-23 in the 4 combinations», e esse filtro não tem nem mutação nem sonda que morda. Hoje o filtro está presente e
nada está errado em PROD. O defeito é do portão: uma edição futura que o tire passa verde e trava RH legítimo. É o modo
de falha «portão que não morde» do CLAUDE.md.

**Fix:**
1. Na (q), acrescentar uma fixture `dhe`: A decide `rejeitado`, o titular pede, B reverte, C registra `em_espera` e
   depois B registra `aprovado` ou `rejeitado`, o que arquiva a linha `em_espera:revertida:C`.
2. Acrescentar a sonda `c_rc_dhe` (C rejeitando, esperado ACEITO).
3. Acrescentar as mutações ME12 (`h.decisao` fora, em `rejeitar_candidatura`) e ME13 (`d.decisao` fora), com o
   «44/44» do plano corrigido para o novo N.
4. Conferir se o (2b) de `registrar_decisao` tem a mesma lacuna no `p48_reabertura_smoke`.

Pode ir numa rodada curta antes do apply, ou ser aceito pelo operador e registrado. Não bloqueia `critical: 0`.

## Info

### IN-01: no `rejeitar_candidatura`, o D-23 vem antes da trava de encerrada, então a candidatura encerrada recebe a cópia «peça a outra pessoa»

**File:** `supabase/migrations/20261008000005_p51_d23_decisor_revertido.sql:233-259` · `src/features/triagem/services/triagemService.ts:648-650`

**Issue:** Para uma candidatura encerrada em que o chamador é decisor revertido, a recusa passa de «já encerrada» para
o D-23. O toast diz que «uma nova rejeição deste caso precisa ser registrada por outra pessoa do RH», mas a outra pessoa
também seria recusada, por encerrada. O único par real de PROD é exatamente esse caso. Hoje o efeito é pequeno porque
o hub não oferece «Rejeitar» em encerrada.

**Fix:** mover o (2c) para depois do (3) em uma rodada futura (sem efeito de segurança: as duas recusas são 42501/23514
sem escrita), ou aceitar e registrar.

### IN-02: a cópia do D-23 no formulário de decisão final diz mais do que o (2c) de `registrar_decisao` recusa

**File:** `src/features/decisao/services/decisaoService.ts:203-205` · `src/features/decisao/components/RegistrarDecisaoForm.tsx:88-120`

**Issue:** Quando a recusa vem do (2c) (fonte `revisao_rejeicao`, só `rejeitado`), o formulário mostra «A nova decisão
deste caso precisa ser registrada por outra pessoa do RH». O mesmo decisor ainda pode registrar `aprovado` ou
`em_espera` (sonda `esp_rej_z` e `a_rda_rvd`). O formulário não desabilita nada, então não trava ninguém; só informa
errado o escopo.

**Fix:** uma cópia que caiba nos dois escopos («Você registrou a rejeição que foi revertida na revisão; uma nova
rejeição precisa ser registrada por outra pessoa do RH»), ou aceitar.

### IN-03: com a trava quebrada no filtro de candidatura, a (q) culpa a fixture

**File:** `supabase/tests/p51_revisao_rejeicao_smoke.sql` (envelope da (q), mensagem «o defeito e da FIXTURE, nao do objeto vigiado»)

**Issue:** Na mutação do revisor que tira `h.candidatura_id = p_candidatura_id`, a trava passa a pegar A em todas as
candidaturas, e a fixture da (q) aborta já na montagem. O portão fica vermelho (morde), mas o diagnóstico escrito é
falso. É o mesmo padrão que a memória «sete portões reprovaram… e o diagnóstico escrito de um deles era falso» registra.

**Fix:** quando o erro inesperado da montagem for `42501 … (D-23)`, a mensagem deve dizer «a trava D-23 recusou a
própria fixture — suspeitar do objeto vigiado», em vez de afirmar que o defeito é da fixture.

### IN-04: o passo 1 do «Desfazer» (cliente) não remove os arquivos que o push acrescenta, e reverte o `src/` inteiro

**File:** `51-16-PLAN.md:108-117`

**Issue:** `git checkout <R-antes> -- src e2e` não apaga arquivos que não existem em `R-antes`. Hoje há dois:
`src/features/revisao/components/ContextoKnockoutRevisao.tsx` e `OrigemRevisaoBadge.tsx`. O primeiro importa
`lerContextoKnockout`, que não existe no `revisaoService.ts` de `ad2790a3`. O `vite build` (o da Vercel) passa, porque
ninguém o importa, mas `npm run lint` (tsc) quebra na árvore desfeita. Além disso, se o desfazer acontecer depois do fim
da pausa (b), o checkout da árvore inteira também reverte em silêncio commits de cliente de outras sessões posteriores ao
push. O enumerador do revert só confere que o commit toca `src/`/`e2e/`.

**Fix:** derivar a lista de `git diff --name-status <R-antes> <S-push> -- src e2e`, `git rm` nas entradas `A` e checkout
só das `M`/`D`, e conferir antes que `origin/main` = o `S` do push. Se não for, PARAR e levar ao operador.

### IN-05: no passo 3 do «Desfazer», a restauração das duas funções da 0005 tem de vir antes do `DROP` de `revisao_rejeicao`, ou na mesma transação

**File:** `51-16-PLAN.md:125-130`

**Issue:** PL/pgSQL não registra dependência de tabela. Um `DROP TABLE public.revisao_rejeicao` com os corpos da 0005
ainda vivos é aceito, e daí em diante **toda** chamada de `rejeitar_candidatura` e de `registrar_decisao` falha com
42P01: nenhum RH rejeita nem decide. O texto lista as duas operações nessa ordem, mas não diz que a ordem é obrigatória.

**Fix:** escrever «na MESMA migration corretiva, as restaurações antes do DROP», e um POS que chame (ou leia o `prosrc`
de) as duas funções procurando `revisao_rejeicao` e recuse se ainda a citarem.

### IN-06: resíduo do IN-03 do -2 — `RE_CITA_P51` é sensível a maiúsculas e exige `_p51_`

**File:** `scripts/p51_portao.cjs:291-296`

**Issue:** O `p46apply` aceita `^(\d{14})_(.+)$`. Um `…_P51_fix.sql` ou um `…_fix_p51.sql` ainda escapa ao (8) sem
aviso. A probabilidade é baixa.

**Fix:** `RE_CITA_P51 = /^supabase\/migrations\/[0-9]{14}_.*p51/i`.

### IN-07: o Passo 2 do Task 2 ainda diz «com as três prefixadas»

**File:** `51-16-PLAN.md:238`

**Issue:** São quatro. O `<verify>` 1 já exige `prefixadas=[…0002,…0003,…0004,…0005]`, então a prosa desatualizada não
muda a prova, mas é o tipo de resíduo de instrução atrasada que a memória do projeto registra.

**Fix:** «com as quatro prefixadas».

---

_Reviewed: 2026-10-09T23:59:52Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
