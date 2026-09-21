## Deferred Items

- Smokes de regressão que COMMITAM fixture de `candidaturas` para um candidato REAL (achado no 48-01)
  status: open
  **What:** `oper31_rejeitar_candidatura_smokes.sql`, `funil34_kpis_smokes.sql` e `seg32_smokes.sql` são «ROLLBACK-free»: inserem candidaturas com `status='aguardando_resposta'` ligadas a um candidato real (`candidatos LIMIT 1` / `ORDER BY id`), e o `oper31` ainda as rejeita. Rodados com `node p46apply.cjs run`, o arquivo inteiro vira UMA transação que COMMITA — e os `net.http_post` enfileirados por `trg_notif_confirmacao`, `trg_candidatura_analise` (sem survivor-guard no vivo) e `trg_notif_transicao` (evento `decisao`) vão junto. As linhas somem no DELETE do fim, então a EF provavelmente não acha a candidatura quando o worker do `pg_net` entrega — mas «provavelmente» não é a postura que o D-18 pede para e-mail a candidato real.
  **Como o 48-01 rodou:** num envelope que termina em `RAISE EXCEPTION` com o resultado no texto (a transação aborta; fila do `pg_net` descartada; zero resíduo). Script: `scratchpad/envelope.sh` da sessão — trivial de reescrever: `cat <smoke>; DO $$ BEGIN RAISE EXCEPTION 'RESULT %', current_setting('smoke.ready', true); END $$;`.
  **Conserto sugerido:** converter os três para o idioma do `p45_motor_exclusao_smoke.sql` (subtransação revertida + INSERT com `status='rejeitado'` que desarma o dispatch), ou documentar no cabeçalho que só rodam em envelope.
  **Fora do escopo do 48-01:** não tocam objeto novo deste plano; são pré-existentes.

- `oper31` e `seg32` engolem falha de fixture como SKIP silencioso (achado no 48-01)
  status: open
  **What:** o bloco de setup do `oper31` tem `EXCEPTION WHEN OTHERS THEN ... smoke.ready='n'`, e toda asserção depois faz `RETURN` com NOTICE. Pela Management API os NOTICEs não voltam — um run que não construiu a fixture termina VERDE. O 48-01 contornou lendo `smoke.ready` no envelope (`ready=y` nos três).

- `rejeitar_candidatura` e `funil_kpis` concedem EXECUTE a `anon` (achado no 48-01)
  status: open
  **What:** ACL vivo `anon=X/postgres` nas duas. Os guards de corpo fecham o acesso (papel em rh/administrador; escopo `created_by = auth.uid()`), então não é vazamento — mas é o `pg_default_acl` que o projeto inteiro nomeia no REVOKE. O 48-01 preservou o ACL (CREATE OR REPLACE) por não ser escopo dele.

- Cabeçalho do `p45_motor_exclusao_smoke.sql` afirma que `trg_candidaturas_analise` tem o survivor-guard `status='rejeitado'` (achado no 48-01)
  status: open
  **What:** a definição viva de `trg_candidatura_analise()` NÃO tem guard nenhum — é o JORN-24 (IA analisa quem o knockout eliminou). O smoke continua seguro porque toda escrita dele é revertida por subtransação, mas a frase do cabeçalho está falsa. Corrigir quando o plano do JORN-24 tocar o trigger.
  **Atualização 48-04:** o 48-04 NÃO tocou o trigger — e não deve: a guarda do knockout foi para a EF `analise-candidato-individual` (v29, `skipped:"knockout"`), porque o trigger AFTER INSERT nunca vê o knockout. O trigger segue sem guard **por desenho**. A frase do cabeçalho do `p45` continua falsa (atribui ao trigger o que agora mora na EF); corrigir o texto é edição de comentário num smoke que o 48-04 não usa — fica aqui.

- COMMENT de `retirar_candidatura` diz «o ÚNICO GRANT é para o papel de servidor» (achado no 48-01)
  status: open
  **What:** desatualizado desde `20260805000009:170-171`, que concedeu `authenticated`. O 48-01 reafirmou o ACL vivo e não reescreveu o COMMENT.

- `seg33_agendamento_smokes.sql` também COMMITA fixture ligada a candidato REAL (achado no 48-03)
  status: open
  **What:** mesma forma do item do oper31/funil34/seg32: insere `candidaturas` (`status='aguardando_resposta'`) para `candidatos ORDER BY id LIMIT 1` e agendamentos que disparam `trg_notif_convite` — rodado com `p46apply run` puro, COMMITA os `net.http_post`. O 48-03 o rodou em envelope que aborta (resultado `ready=y` lido do texto do erro). O gate final novo (reprova SKIP silencioso) é do 48-03; a conversão para subtransação revertida não é.

- `p39_rewire_triggers_smoke.sql` (i) e `funil34_kpis_smokes.sql`: fixtures de agendamento ganharam `local_ou_link` (48-03)
  status: resolved
  **What:** o trigger `validar_local_ou_link_agendamento` (20260921000003) recusaria os INSERTs sem link/local. `funil34` medido 8/8 PASS em envelope depois do apply. `p39` segue vermelho pela fotografia `:189` (não tocada, instrução do operador) — só a fixture da (i) mudou.

- Divergência deliberada JS × SQL na regra de URL (48-03)
  status: open (informativo)
  **What:** `new URL('http:host')` é aceito pelo `isSafeHttpUrl` (o parser completa as barras), o trigger exige `^https?://host`. O formulário deixaria passar e o banco recusaria com 23514 — falha fechada, mensagem genérica de erro. Nenhum RH digita isso na prática; registrar se aparecer.

- O padrão de varredura de portões do `CLAUDE.md` não vê lista literal DECLARADA nem contagem escrita como `<> (CASE …)` (achado no 48-06)
  status: open
  **What:** as duas listas literais que o 48-06 converteu (`p42_notif_revisao_smoke.sql` (a), `p43_guard_marketing_smoke.sql` (c)) eram `v_eventos text[] := ARRAY[...]` + `FOREACH`. O padrão só as achou por acaso, pelo `v_aceitos <> 6` da linha ao lado. As contagens do `p37` em `v_n <> (CASE WHEN … THEN 18 ELSE 16 END)` também ficaram invisíveis. Medido em 2026-09-21: `grep -rnE 'text\[\] *:= *ARRAY\[' supabase/tests/*.sql` → 36; `grep -rnE '(<>|!=|IS DISTINCT FROM) *\(CASE' supabase/tests/*.sql` → 3. Não foram classificados um a um.
  **Sugestão:** acrescentar as duas alternativas ao padrão do `CLAUDE.md` §«Portões» e classificar os 39 achados. Editar o `CLAUDE.md` e classificar 36 listas fica fora do escopo do 48-06. Ver `48-VARREDURA-PORTOES.md` §1.

- `p42_notif_revisao_smoke.sql` (y) compara o ledger INTEIRO nos dois sentidos (`v_agora <> v_antes`) (achado no 48-06)
  status: open
  **What:** a baseline é da própria execução, então não é fotografia. Mas um envio transacional legítimo que chegue ao ledger durante o run faria o smoke reprovar trabalho correto. O `p43` (y1) já corrigiu isso pelo WR-05 (só a PERDA reprova). O 48-06 não tocou (y).

- `deno test supabase/functions/_shared/` reprova por um arquivo VITEST dentro do diretório Deno (achado no 48-07)
  status: open
  **What:** `supabase/functions/_shared/__tests__/strict-schema.test.ts` usa `expect(...)` (vitest). Sob `deno test` o type-check falha (TS7053, linha 88) e, com `--no-check`, o arquivo lança «Uncaught error» — 167 passam, 1 falha. Pré-existente ao 48-07. Os `<verify>` do 48-07 que rodam `deno test ... supabase/functions/_shared/` herdam essa falha; o 48-07 rodou os arquivos que toca (`email-config.test.ts`, `email-templates.test.ts`: 46/46) e o diretório inteiro com `--no-check` (a única falha é esse arquivo).
  **Conserto sugerido:** mover o arquivo para a suíte vitest (`src/`) ou excluí-lo do glob do Deno (`deno.json` `test.exclude`).

- Colunas `solicitacoes_dados.aviso_pedido_enviado_em` / `aviso_cancelamento_enviado_em` sem veredito de export (achado no 48-07)
  status: open (informativo)
  **What:** a cópia LGPD exporta por allowlist, então as duas colunas NÃO entram na cópia (fail-safe) — o mesmo estado das sete colunas de estado do P45 (`executar_em` … `recibo_enviado_em`). `docs/compliance/sql/05-export-allowlist-drift.sql` rodado contra PROD passa a acusá-las como sem veredito. O veredito de export é do 48-17 (compliance da fase).
