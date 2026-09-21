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

- COMMENT de `retirar_candidatura` diz «o ÚNICO GRANT é para o papel de servidor» (achado no 48-01)
  status: open
  **What:** desatualizado desde `20260805000009:170-171`, que concedeu `authenticated`. O 48-01 reafirmou o ACL vivo e não reescreveu o COMMENT.
