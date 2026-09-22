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
  status: resolved
  **Resolvido no 48-17 (`bab3c0f8`):** `export: false` com razão (telemetria de envio) em `export-scope-rules.yaml`, classificadas `preservar` no `pii-inventory.yaml`; o `05-export-allowlist-drift.sql` contra PROD deixou de acusá-las. `recibo_enviado_em` e as outras seis colunas de estado do P45 seguem sem veredito (drift pré-existente, fora da fase).
  **What:** a cópia LGPD exporta por allowlist, então as duas colunas NÃO entram na cópia (fail-safe) — o mesmo estado das sete colunas de estado do P45 (`executar_em` … `recibo_enviado_em`). `docs/compliance/sql/05-export-allowlist-drift.sql` rodado contra PROD passa a acusá-las como sem veredito. O veredito de export é do 48-17 (compliance da fase).

- `explicacao_rejeicao_automatica(uuid)` virou código morto — e segue com EXECUTE para `anon` (achado no 48-09)
  status: open
  **What:** o front publicado pelo 48-09 chama `explicacao_rejeicao_origem` (tri-estado); a booleana ficou no banco sem DROP de propósito (o front anterior a chamava — sem janela de quebra). ACL vivo `anon=X/postgres` (a migration `20260906000007` só fez `REVOKE … FROM PUBLIC`). Sem JWT o corpo devolve `false`, então não vaza; mas é superfície morta. DROP num plano futuro, quando nenhum bundle antigo em cache a chamar mais.

- Texto de ajuda do `UpdateStatusModal` afirma que o motivo da rejeição «será enviado ao candidato» (achado no 48-09)
  status: resolved
  **Resolvido no 48-16 (`6511ef88`, em PROD 2026-09-21 17:28Z):** a ajuda passou a dizer que o motivo fica no registro interno e não é enviado ao candidato, que recebe uma mensagem neutra; o checkbox «Notificar candidato por email» (sem efeito desde a P39) saiu, junto com `notificar_candidato` do payload. Pinado em `UpdateStatusModal.test.tsx`.
  **What:** `src/components/modals/UpdateStatusModal.tsx:250-253` — «este motivo será enviado ao candidato se a notificação estiver ativada». É falso: a rejeição vai por `registrar_decisao`, e o e-mail `decisao` usa a cópia neutra congelada (`COPY_REJEICAO`); a justificativa nunca chega ao candidato. O 48-09 removeu o último caminho que copiava texto livre do RH para `feedback_rejeicao` (`candidaturasService.updateCandidaturaStatus`). O texto do modal é voltado ao RH e induz a escrever para o candidato — corrigir a copy num plano de UI.

- `rejeitar_candidatura` com motivo `desistencia` grava o mesmo texto «não seguiremos com ela» (observação do 48-09, para a revisão da premissa A8 no 48-18)
  status: open (informativo)
  **What:** o texto neutro do `feedback_rejeicao` e a razão `humana_triagem` da página dizem que a equipe decidiu não seguir. Quando o RH registra `desistencia` (o candidato desistiu), a frase é imprecisa — não falsa sobre o motivo (que segue oculto), mas sobre quem tomou a iniciativa. Hoje: 0 linhas com esse motivo em PROD. Decisão de copy do operador (A8), não do executor.

- `p42_revisao_art20_smoke.sql` está VERMELHO na fixture e, quando verde, COMMITA um despacho real (achado no 48-08)
  status: resolved
  **Resolvido no 48-11:** atores lidos do catálogo vivo na execução; titular sintético; (f)/(g)/(h) numa subtransação que reverte (SQLSTATE `P42R1`); (h.2) assere o efeito novo da reabertura (D-01); teardown substituído pela negativa (j) de zero resíduo. 10/10 com `p46apply run` puro; mordida provada por mutação (responder antigo → FAIL (h); subtransação sem reverter → FAIL (j)).
  **What:** (1) a fixture exige `e2e.admin@beautysmile.com.br` e o recrutador `fba9bc0f-…` ATIVOS; os dois estão `ativo=false` desde 2026-09-05 (STATE.md §Correção de registro) — o smoke para em `P42 FAIL (fixture)` antes de qualquer asserção, contra o vivo de antes E de depois do 48-08. (2) Se a fixture resolvesse, o arquivo roda no nível de topo: INSERT em `decisao_final` sobre uma candidatura real de `candidato.funil@teste.com` + `responder_revisao_decisao` real ⇒ `trg_notif_revisao_respondida` enfileira `revisao_respondida` e o `p46apply run` puro COMMITA (NOTIFICACOES_MODO='producao'). Mesma classe do item do oper31/funil34/seg32/seg33.
  **Como o 48-08 rodou:** em envelope que aborta, com uma CÓPIA de rascunho (não commitada) que troca os dois RH fixos por dois administradores ativos lidos na execução — 9/9 antes e depois da migration `20260921000007`. O arquivo do repositório não foi editado.
  **Conserto sugerido:** resolver os RH por papel/ativo na execução (idioma do `p48_dedupe_smoke.sql`) e mover as escritas para subtransação revertida.

- `p39_rewire_triggers_smoke.sql:189` (f) `trg_notif_*` `<> 3` passou de 6 para 7 com o `trg_notif_cognitivo_liberado` (48-10)
  status: open (informativo)
  **What:** medido depois do apply da `20260921000010`: `count(*) FROM pg_trigger WHERE tgname LIKE 'trg\_notif\_%'` = 7. Fotografia vermelha já registrada no CONTEXT §Deferred e na `48-VARREDURA-PORTOES.md` §2; o 48-10 **não** tocou o arquivo (instrução do operador). Conserto sugerido quando alguém o assumir: trocar a contagem por pertinência por nome dos três triggers da P39 (idioma do `p37` (f) convertido no 48-06).

- O `<verify>` do 48-10 roda `deno test --allow-all supabase/functions/notificar-candidato/ supabase/functions/_shared/` e herda a falha pré-existente do `strict-schema.test.ts` (item do 48-07 acima)
  status: open (informativo)
  **What:** o 48-10 rodou o mesmo conjunto de arquivos SEM esse único arquivo vitest (script de rascunho que lista os `*.test.ts` dos dois diretórios e exclui `strict-schema.test.ts`): 222/222 com type-check. O conserto do arquivo continua sendo o sugerido no item do 48-07.

- `registrar_decisao` segue com EXECUTE para `anon` (achado no 48-11)
  status: open
  **What:** ACL vivo `anon=X/postgres` (é o `pg_default_acl`), preservado pelo CREATE OR REPLACE da `20260921000012`, que reafirmou os grants como estavam. Desde o 48-11 o guard de papel é fail-closed e roda ANTES de qualquer leitura, então `anon` recebe 42501 sem aprender nada. Mesmo assim é superfície desnecessária no write-path da decisão final. É a mesma classe do item de `rejeitar_candidatura`/`funil_kpis` do 48-01. Conserto: `REVOKE ALL … FROM PUBLIC, anon` num plano que assuma o ACL das RPCs do RH.

- `anonimizar_candidato` não desidentifica `revisao_resultado`, e o 48-11 passou a arquivá-lo também em `decisao_final_historico` (achado no 48-11)
  status: open
  **What:** o passo `tombstone_decisao_final` do motor da P45 troca `justificativa` em `decisao_final` e em `decisao_final_historico`, mas não toca `decisao_final.revisao_resultado`, que é a justificativa do REVISOR sobre o titular. Isso é PRÉ-EXISTENTE. O 48-11 acrescentou `decisao_final_historico.revisao_resultado`, que o snapshot copia de OLD (inclusive no UPDATE do próprio motor, que roda antes do scrub do arquivo). A categoria de dado não é nova, mas agora há uma segunda cópia fora do alcance do motor. Hoje: 1 linha `mantida` e 0 `revertida` em PROD. Conserto: incluir `revisao_resultado` nos dois UPDATEs do `tombstone_decisao_final`, no `plano_exclusao_titular` e no `recibo-exclusao.json`. É mecanismo destrutivo (motor da P45), por isso fica fora do 48-11.

- Veredito de export/inventário PII das 12 colunas novas do 48-11 (`decisao_final`: 3; `decisao_final_historico`: 9) (achado no 48-11)
  status: resolved
  **Resolvido no 48-17 (`bab3c0f8`):** vereditos escritos (`reaberta_em`/`prazo_nova_decisao_em` entram; `alerta_prazo_enviado_em` fica fora; o histórico herda a homônima), classificação no inventário e linha/razão no recibo. Allowlist 1.2.0 em PROD (`exportar-meus-dados` v3).
  **What:** a cópia LGPD exporta por allowlist, então as colunas NÃO entram na cópia (fail-safe), mas `docs/compliance/sql/05-export-allowlist-drift.sql` rodado contra PROD vai acusá-las como sem veredito. O veredito de export e o `pii-inventory.yaml` são do 48-17 (compliance da fase), como no item do 48-07.

## 48-14 — achado fora de escopo (2026-09-21)

- **anon lê `candidaturas`?** `GET /rest/v1/candidaturas?select=id&limit=1` com a chave pública (anon, tirada do bundle) devolveu **HTTP 200 com um id**. Não investigado (anterior ao 48-14; nenhum arquivo deste plano toca a RLS de `candidaturas`). Triar: qual policy/GRANT expõe a linha ao anon, e quais colunas ela alcança.
- **Causa medida (só metadados, READ ONLY):** policy `"Allow anonymous duplicate check"` em `public.candidaturas`, `FOR SELECT TO anon USING (true)`, e o anon tem SELECT nas **40 de 40** colunas. Nenhuma migration do repositório cria essa policy (foi criada fora do versionamento). Isso contraria o CLAUDE.md («Duplicate check via RPC SECURITY DEFINER (nao anon SELECT)»). Qualquer pessoa com a chave pública, que está no bundle, lê todas as candidaturas, com `motivo_rejeicao`, `observacoes_rh`, `analise_ia_*` e `curriculo_url`. **Não corrigido:** remover a policy é escrita em PROD, e alguém pode depender dela. Precisa de decisão do operador (portão destrutivo).
- **✅ RESOLVIDO 2026-09-21 (orquestrador, aprovado pelo operador) — e era maior do que o achado.**
  - `20260921000016_fecha_leitura_anonima_candidaturas.sql`: `DROP POLICY "Allow anonymous duplicate check"` + `REVOKE ALL ON public.candidaturas FROM anon`. md5 ledger = arquivo `403cb55e…`. Depois: `has_table_privilege('anon', candidaturas, 'SELECT') = false`; `SET LOCAL ROLE anon` → `permission denied`; `authenticated` e as 6 demais policies idênticas à linha de base capturada na transação.
  - **Sete views legado** também liam PII para `anon` E para qualquer `authenticated`: sem `security_invoker`, dono `postgres` (`rolbypassrls = true`), SELECT pelo `pg_default_acl`. Medido com `SET LOCAL ROLE anon`: `v_candidatos_ativos` **42 linhas com CPF, e-mail, celular, nascimento e endereço**; `v_ultimos_acessos` 43; `v_usuarios_rh_ativos` 7; `v_sessoes_ativas_validas` 0 (expunha `session_token`); `security_analysis_view` 6; `v_estatisticas_webhooks` 3; `v_biblioteca_mais_usadas` 0. Nenhuma é usada em `src/` nem em `supabase/functions/`. `20260921000017_fecha_views_legado_pii.sql`: `security_invoker = true` + `REVOKE ALL FROM anon, authenticated` nas sete; `service_role` mantido. md5 ledger = arquivo `c959c1d6…`. Depois: `permission denied` para `anon`.
  - As duas migrations foram ensaiadas antes numa requisição que aborta (`ENSAIO_OK`, estado inalterado depois).
  - `candidatos` tem a policy gêmea (`anon USING (true)`), mas `anon` NÃO tem privilégio na tabela — inerte. Varredura: nenhuma tabela de `public` com RLS desligado é legível por `anon`/`authenticated`.
  - **Acesso de terceiros (logs da API, só leitura):** a retenção alcança ≈ 48 h. Nesse intervalo, toda leitura sem JWT de `candidaturas` foi das nossas Edge Functions (`service_role` via chave `sb_secret_`, sem `Authorization`) ou a sonda `curl` do 48-14 (1 `id`); as sete views não receberam NENHUMA requisição. Antes de 48 h não há log — a exposição existia desde a criação da policy/views, fora do versionamento. **Avaliação de incidente (LGPD Art. 48) é do Encarregado.**
  - Pendência que fica: a origem da policy e das views (apply fora do repositório — mesmo padrão do drift de 2026-07 no STATE); e uma varredura de funções `SECURITY DEFINER` executáveis por `anon` que devolvam PII (não feita).

## 48-17 — contatos não consertados (2026-09-21)

- Drift de export pré-existente: 9 colunas vivas sem veredito, confirmadas pelo `05-export-allowlist-drift.sql` contra PROD em 2026-09-21 (depois do 48-17)
  status: open
  **What:** `candidatos.faixa_etaria_materializada`, `candidaturas.encerrada_a_pedido_em` e 7 de `solicitacoes_dados` (`executar_em`, `cancelado_em`, `plano`, `storage_concluido_em`, `postgres_concluido_em`, `auth_concluido_em`, `recibo_enviado_em`). Fora do catálogo versionado de propósito (não são da Phase 48), por isso a cópia as omite (fail-safe da allowlist). Nenhuma coluna da Phase 48 aparece na lista. O conserto é medir e acrescentar ao `catalogo-vivo-44.json` e dar veredito a cada uma (`plano` é jsonb do motor P45: provável `false`).

- `pii-inventory.yaml`: denominador de cobertura datado — o `.md` passou a dizer «Cobertura de tabelas: 65 / 64» (48-17)
  status: open (informativo)
  **What:** `meta.escopo.tabelas_base_public` = 64 é a coleta de 2026-07-29; `public` tem 69+ tabelas hoje. O 48-17 acrescentou `solicitacoes_dados` (entrada PARCIAL, declarada na `natureza`: só as 2 colunas da fase) e o numerador passou do denominador. Não é número falso, é denominador velho. Conserto: re-coletar `meta.escopo` pela `01-pii-catalog.sql` (d) e decidir a cobertura das tabelas posteriores (`solicitacoes_dados` inteira, `config_sla_dados`, etc.).

- `decisao_final.revisao_veredito` / `revisao_por_usuario` / `revisao_respondida_em` (P42) sem entrada explícita no `pii-inventory.yaml` (achado no 48-17)
  status: open (informativo)
  **What:** as homônimas em `decisao_final_historico`, criadas pelo 48-11, agora TÊM entrada (48-17); as da tabela corrente nunca tiveram. O export não depende disso (vereditos por `decisoes_por_coluna`/R1/R2), mas o recibo e o inventário ficam assimétricos. Conserto: acrescentar as 3 entradas e dar a elas linha/razão no `gen-recibo-exclusao.cjs` (o mesmo destino das do histórico).

- `candidaturas.data_bigfive_enviado` nunca é carimbado (achado no 48-05, 2026-09-21)
  status: open
  **What:** medido em PROD: 3 de 3 candidaturas com score `big_five` têm `data_bigfive_enviado` nulo, inclusive a da submissão de prova `2ce20fbf…` (status `sucesso` no log do `submit-bigfive-final` v12). Anterior à fase; não é o JORN-06. Conferir quem lê a coluna (tela do RH / painel) antes de consertar — [[tela-vazia-nao-e-dado-ausente]].

- Cabeçalho do `efdeploy.cjs` afirma uma checagem que não existe (achado na review do 48-19)
  status: open
  **What:** `efdeploy.cjs:14-18` diz que o script «RECUSA subir se [o fechamento de imports] divergir da lista esperada». Não há lista esperada no código: ele recalcula o fechamento a partir do entrypoint e só morre se um import relativo não existir no disco. Um arquivo `_shared` a menos (import removido) sobe sem aviso. O 48-19 conferiu o fechamento à mão (`--dry-run`: 8 arquivos, os mesmos da v24).
  **Conserto sugerido:** implementar a lista esperada por slug (medida do `get_edge_function` da versão viva) ou corrigir o comentário. Registro com autoridade que afirma uma trava inexistente é o mesmo defeito do CLAUDE.md desatualizado.

- `gerar-devolutiva-bigfive`: a fiação do `Deno.serve` com a IA desligada não tem teste (review do 48-19, LOW)
  status: open
  **What:** o bloco atrás de `import.meta.main` (não resolver o prompt, não construir os SDKs com `PERSONALIZACAO_IA_ATIVA=false`) é garantido por leitura, não por teste. Risco baixo — o mesmo `if` sobre a mesma constante do handler, que É testado.
  **Conserto sugerido:** extrair `resolverPromptSeAtivo(ativo, deps)` e testar que, com `false`, `loadPrompt`/`emitPromptStubAlert` não são chamados.

- Ao RELIGAR a personalização: `modelo_ia`/`prompt_version` gravados são literais (review do 48-19, NIT; pré-existente)
  status: open
  **What:** com a IA ligada a linha grava `"claude-sonnet-4-6"` e `"1.0.0"` fixos, embora o modelo e a versão reais venham do `prompt_versions` (fallback `gpt-4o-mini`). Hoje a IA está desligada e a linha grava `null` / `template_oficial`, que é verdade. Quem religar deve gravar os valores do `resolved`.

- Rodapé da devolutiva: «Conteúdo revisado por psicólogo(a) responsável» e a menção negada a «teste psicológico» (observação do operador na sessão 1 do 48-18)
  status: parcialmente decidido — **2026-09-22, operador: MANTER a frase «não é teste psicológico»** (a forma negada é exigida pelo produto, como o comentário do `_NEG` na EF já dizia). Segue aberto: «Conteúdo revisado por psicólogo(a) responsável» e o placeholder do fallback do front
  **What:** com a IA desligada o texto servido é o template oficial, mas o próprio código diz que os templates estão «pendente revisão final CRP antes do go-live» — a afirmação do rodapé pode não ser verdade para nenhum texto. A menção negada contraria a regra de linguagem de produto do `CLAUDE.md`. O fallback do front ainda tem o placeholder «Dra. [Nome], CRP-XX/XXXXX».
