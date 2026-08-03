---
phase: 42-invent-rio-gates-fila-art-20
plan: 06
subsystem: compliance
tags: [lgpd, art20, rpc, security-definer, authz, fail-closed, rls, default-acl, smoke]

requires:
  - phase: 42-02
    provides: "docs/compliance/ criada e indexada"
  - phase: 42-03
    provides: "p42_revisao_art20_smoke.sql — a espec executável RED do write-path"
provides:
  - "20260730000001_p42_revisao_art20 aplicada em PROD e reconciliada no ledger"
  - "20260730000002_p42_revisao_art20_authz_fail_closed — correção do guard NULL-cego + REVOKE de anon"
  - "Smoke 9/9 VERDE — a prova nominada do critério de sucesso #3 do ROADMAP (D-P42-10)"
  - "database.types.ts regenerado (94 inserções, ZERO deleções)"
  - "Slot de candidatura de fixture (origem_candidatura='p42-06-smoke-slot') que torna o smoke re-executável"
affects: [42-07, 42-08, 42-09, 42-10, 42-11, 45-motor-exclusao]

tech-stack:
  added: []
  patterns:
    - "Guard de papel em SECURITY DEFINER usa coalesce(role,'') — `NULL NOT IN (…)` avalia NULL e o IF não é tomado, então a forma ingênua falha ABERTO"
    - "Identidade de função em asserção de catálogo resolvida por to_regprocedure (tipos), nunca por igualdade de string com pg_get_function_identity_arguments (que preserva NOMES de parâmetro)"
    - "Readback que verifica um write feito sob papel restrito é lido com RESET ROLE — sob RLS o SELECT devolve vazio SEM erro, e um gate assim afere a RLS em vez da escrita"

key-files:
  created:
    - supabase/migrations/20260730000002_p42_revisao_art20_authz_fail_closed.sql
  modified:
    - supabase/tests/p42_revisao_art20_smoke.sql
    - database.types.ts

key-decisions:
  - "As 3 reprovações do smoke foram classificadas UMA A UMA em defeito-de-espec vs defeito-de-implementação, em vez de tratadas em bloco — a regra do plano ('corrige-se a implementação, não o smoke') vale para divergência de comportamento, e as 3 primeiras não eram isso"
  - "O REVOKE de anon foi aplicado como migration nova, nunca por edição da 20260730000001 já aplicada em PROD"
  - "service_role MANTÉM EXECUTE: é o papel de servidor confiável do projeto, o smoke não assere nada sobre ele, e revogar quebraria 42-07/42-08 sem requirement que o peça"
  - "O smoke subiu de 8 para 9 asserções — a lacuna de cobertura (nenhuma asserção exercitava o caminho SEM claim de JWT) foi o que deixou o defeito de autorização passar"
  - "database.types.ts: o output do MCP omite o schema graphql_public, então o bloco foi re-inserido do arquivo trackeado e o resultado tem ZERO deleções, em vez de sobrescrever e perder tipos vivos"

patterns-established:
  - "Um gate que só testa o caminho autenticado não pode detectar um guard que falha ABERTO — todo guard de autorização ganha asserção de ausência-de-claim"
  - "Um filtro de RLS num readback de teste é o modo de falha mais perigoso de um gate: não levanta erro, devolve vazio, e o teste escrito ao contrário passaria em verde sem verificar nada"

requirements-completed: [REVISAO-02, REVISAO-03, REVISAO-05]

coverage:
  - id: D1
    description: "Quem registrou a decisão original é barrado PELO SERVIDOR ao responder à revisão dela, provado por impersonação real de dois RH distintos com SQLSTATE e mensagem asseridos"
    requirement: "REVISAO-05"
    verification:
      - kind: other
        ref: "smoke asserção (f): decisor (e2e.admin, administrador) -> 42501 com SQLERRM contendo '(decisor)'; depois o 2º RH (recrutador.rh@teste.com, 'rh') ACEITO com revisao_por_usuario gravado = fba9bc0f-… e revisao_respondida_em não-nulo"
        status: pass
    human_judgment: false
  - id: D2
    description: "A recusa não escreveu nada na linha e não disparou notificação (asserção negativa medida ENTRE a tentativa barrada e a bem-sucedida)"
    requirement: "REVISAO-05"
    verification:
      - kind: other
        ref: "smoke asserção (g): revisao_veredito/revisao_por_usuario/revisao_respondida_em TODOS NULL após a recusa; notificacoes_enviadas inalterado contra o baseline capturado no fixture"
        status: pass
    human_judgment: false
  - id: D3
    description: "Fronteira exata do guardrail de substância (49 recusado / 50 aceito) e idempotência (2ª resposta recusada com erro próprio)"
    requirement: "REVISAO-03"
    verification:
      - kind: other
        ref: "smoke asserção (h): 49 chars -> 22023; 50 chars -> aceito (provado pelo RETURNING do próprio write-path); 2ª resposta -> 22023 com SQLERRM contendo 'respondida'"
        status: pass
    human_judgment: false
  - id: D4
    description: "A fila é lida por RPC que projeta colunas nomeadas e nunca a justificativa interna do recrutador"
    requirement: "REVISAO-02"
    verification:
      - kind: other
        ref: "smoke asserção (d): listar_revisoes_decisao é DEFINER+STABLE, pg_get_function_result devolve TABLE de 11 colunas nomeadas e a asserção negativa sobre 'justificativa' não casa"
        status: pass
    human_judgment: false
  - id: D5
    description: "O limiar do badge vive em tabela de configuração alterável sem deploy e não é legível pelo papel anônimo"
    requirement: "REVISAO-02"
    verification:
      - kind: other
        ref: "smoke asserção (e): config_sla_revisao com RLS ligada, ZERO policy citando anon/public, seed coerente (dias_atencao < dias_atraso)"
        status: pass
    human_judgment: false
  - id: D6
    description: "O guard de autorização FALHA FECHADO — chamador sem claim de JWT é recusado pelos três RPCs"
    requirement: "REVISAO-03"
    verification:
      - kind: other
        ref: "smoke asserção (i), adicionada nesta rodada: papel authenticated sem request.jwt.claims -> 42501 nos 3 RPCs. Antes da migration 20260730000002 os 3 caíam no corpo"
        status: pass
    human_judgment: false
  - id: D7
    description: "anon não tem EXECUTE em nenhum dos 3 RPCs"
    requirement: "REVISAO-03"
    verification:
      - kind: other
        ref: "smoke asserção (c) + proacl vivo: {postgres=X,authenticated=X,service_role=X} — anon=X removido; has_function_privilege('anon',…,'EXECUTE')=false nos 3"
        status: pass
    human_judgment: false

duration: ~90min
completed: 2026-07-30
status: complete
---

# Phase 42 / Plan 06: Write-path e fila da revisão Art. 20 — Summary

**O tracer da fase passou, mas só depois de o gate reprovar quatro vezes — e a quarta reprovação era um defeito de autorização real na migration que já estava viva em PROD. O smoke nunca havia sido executado; executá-lo é o que produziu todo o valor deste plano.**

## O estado herdado: apply já feito, registro nunca escrito

A Task 1 (escrever a migration) estava commitada em `cdb5ca8`, sem SUMMARY. O `safe_resume_gate`
do execute-phase acusou a anomalia clássica — commits de produção sem SUMMARY — e a investigação
mostrou que **a Task 2 também já havia sido parcialmente executada** por uma sessão anterior:

| Item | Estado encontrado |
|------|-------------------|
| Migration `20260730000001` | já aplicada em PROD |
| Ledger `schema_migrations` | **já reconciliado** — `version=20260730000001` casando o prefixo do arquivo, em sequência após a P41. Zero drift |
| 3 colunas de `decisao_final` + 3 RPCs + `config_sla_revisao` | todos vivos e conformes |
| 12 invariantes estáticas da migration | 12/12 |
| Smoke 8/8 | **nunca rodado** |
| `database.types.ts` | **não regenerado** |

Ou seja: o alarme de drift era falso, mas o gate de prova estava inteiramente aberto. O passo 1 da
Task 2 (confirmar que as colunas *não* existem) disparou seu STOP corretamente — só que a causa era
o próprio apply anterior, não drift de origem desconhecida.

## As quatro reprovações, classificadas uma a uma

O plano manda "corrigir a implementação, não o smoke", e abre a exceção de que divergência genuína
de spec vira nova rodada do checkpoint com justificativa registrada. As quatro reprovações caíram
em lados diferentes dessa linha, e tratá-las em bloco teria escondido a única que importava.

### (1) DEFEITO DE ESPEC — asserção (c), identidade da função

```
P42 FAIL (c): responder_revisao_decisao(uuid,text,text) NAO existe
```

A asserção comparava `pg_get_function_identity_arguments(oid) = 'uuid, text, text'`. Essa função
**omite defaults mas preserva os NOMES dos parâmetros**, então em PG 17.6 ela devolve
`'p_candidatura_id uuid, p_veredito text, p_justificativa text'`. A igualdade era **insatisfazível
para qualquer implementação correta** — só passaria com parâmetros anônimos, impossível em PL/pgSQL.
Provado contra o catálogo, não por leitura de doc: o builtin `has_function_privilege` devolve
`'text, text'` (args de função C são anônimos) enquanto toda função PL/pgSQL nomeada devolve nomes.

Corrigido para `to_regprocedure('public.responder_revisao_decisao(uuid,text,text)')` — resolução por
schema + nome + tipos exatos. Estritamente **mais forte**: uma sobrecarga de aridade ou tipos
diferentes não casa, e renomear um parâmetro não quebra o gate.

### (2) DEFEITO DE IMPLEMENTAÇÃO — o achado real

```
P42 FAIL (c): anon tem EXECUTE — write-path aberto ao papel anonimo
```

Dois defeitos independentes por baixo desse:

**2a. `anon` com EXECUTE nos 3 RPCs.** A migration fez `REVOKE ALL … FROM PUBLIC`, que não remove
`anon`. Medido em `pg_default_acl`: o schema `public` deste projeto concede EXECUTE a
`anon`/`authenticated`/`service_role` como grants **diretos e nomeados** em todo `CREATE FUNCTION`.
`REVOKE … FROM PUBLIC` remove um grant que nunca existiu. **Não era conhecimento novo no repo** — a
migration da P41 já revoga de `anon` nominalmente (`ler_resend_webhook_secret`); a 42-06 regrediu
contra um padrão vivo.

**2b. O guard de papel era NULL-cego.** Os três RPCs abriam com
`IF v_role NOT IN ('rh','administrador') THEN RAISE 42501`. Sob lógica de três valores, com `v_role`
NULL (chamador sem JWT), `NULL NOT IN (…)` avalia **NULL**, e um `IF` com condição NULL **não é
tomado**. O guard só recusava quando a claim existia e estava errada; ausente, era no-op. O guard do
decisor tinha o mesmo vício (`NULL = uuid` → NULL).

**O que foi medido em PROD antes da correção, como `anon` sem JWT:**

| RPC | Resultado | O que de fato barrou |
|-----|-----------|----------------------|
| `contar_revisoes_pendentes()` | EXECUTOU → 0 | predicado de escopo (`v_role='administrador'` → NULL) |
| `listar_revisoes_decisao(false)` | EXECUTOU → 0 linhas | mesmo predicado no WHERE |
| `responder_revisao_decisao(…)` | chegou ao UPDATE | CHECK `revisao_resposta_completa` (`23514`) |

**Severidade honesta:** não havia escrita indevida possível e **nenhum PII vazou** — verificado por
tentativa real contra fixture, com a linha lida depois (veredito/autoria/respondida_em todos NULL).
Mas em todos os três casos o que fechou o caminho foi um mecanismo **a jusante**, não o controle de
autorização. Isso contraria a doutrina que a STATE.md já registra ("policy PERMISSIVE mal escrita
abre acesso; a ausência nunca abre"): um controle que só funciona porque outra coisa o socorre não é
um controle, e qualquer relaxamento futuro do CHECK ou do predicado converteria isto em falha real.

**O resíduo que ERA exposição:** `responder_revisao_decisao` devolvia SQLSTATEs distinguíveis ao
chamador anônimo — `P0002` (decisão inexistente) · `22023` (sem pedido) · `22023 revisao ja
respondida` · `23514` (respondível). **Oráculo de estado** sobre o pedido Art. 20 de um titular,
alcançável com a anon key pública e um `candidatura_id` válido.

Corrigido pela migration **`20260730000002_p42_revisao_art20_authz_fail_closed`**: `coalesce(v_role,'')`
nos 3, `v_uid IS NULL` → 42501, recusa quando `por_usuario IS NULL` (guard inverificável barra, não
libera — o key_link do plano nomeia esse risco), e `REVOKE … FROM anon` nos 3. Após a correção, os
7 caminhos não-autorizados retornam **`42501` uniforme**: zero informação diferencial.

### (3) DEFEITO DE ESPEC — readback de (f) parte 2 sob RLS

```
P42 FAIL (f): autoria errada
```

O readback vivia dentro do mesmo bloco `SET ROLE authenticated` da chamada, logo lia `decisao_final`
**sob RLS**. A tabela tem RLS ligada com `rh_le_decisao_final [SELECT]` escopada por vaga, e a
candidatura de fixture pertence a uma vaga criada por `bbbbbbbb-…`, não pelo revisor. O SELECT
devolvia zero linhas, `v_por` ficava NULL, e a asserção acusava a implementação por um efeito da
própria espec. A asserção (g) já fazia certo (`RESET ROLE` antes de ler) — (f) parte 2 não.

**É o modo de falha mais perigoso possível para um gate:** RLS filtrando um readback não levanta
erro, devolve vazio. Escrito ao contrário (esperando NULL), o teste passaria em verde sem nada ter
sido verificado.

### (4) DEFEITO DE ESPEC — mesmo vício em (h.2)

A prova de aceitação dos 50 caracteres era um readback sob o mesmo `SET ROLE authenticated`.
Corrigida para ler a row do **`RETURNING` do próprio write-path**, que vem de dentro do DEFINER e é
imune a RLS.

## A lacuna de cobertura que deixou o defeito passar

As 8 asserções originais **todas injetam uma claim válida antes de chamar**. Nenhuma exercitava o
caminho sem claim — que é exatamente onde o guard falhava aberto. Um gate que só testa o caminho
autenticado não pode detectar um guard que falha ABERTO.

Adicionada a asserção **(i) FAIL-CLOSED** e o RESUMO (z) subiu de 8 para **9**. A asserção usa
`authenticated` sem claim, **não** `anon`: após o REVOKE, `anon` é barrado no portão de privilégio e
o 42501 que retorna provaria o grant, não o guard.

## Task 3 — `database.types.ts`

O CLI (`npx supabase gen types typescript --linked`) exige `supabase login` e não há token no
ambiente, então a geração foi feita pelo MCP. **O output do MCP omite o schema `graphql_public`** —
um diff direto acusava 28 deleções, todas daquele bloco. O plano manda parar em qualquer deleção, e
sobrescrever teria apagado tipos vivos em silêncio.

Confirmado que a divergência é de **seleção de schema, não de versão de gerador**: `Args: never`,
`SetofOptions` e `ler_resend_api_key: { Args: never; Returns: string }` são byte-idênticos nos dois.
Então o bloco `graphql_public` foi re-inserido do arquivo trackeado, e o resultado tem **94 inserções
e ZERO deleções**, `tsc` em **97 → 97** e `.husky/pre-commit` exit 0.

**Achado fora da lista esperada — defasagem da P41:** 8 das linhas adicionadas não pertencem à 42-06.
São `bounce_em`/`reclamado_em` de `notificacoes_enviadas` (3 blocos) e os RPCs
`ler_resend_webhook_secret` / `varrer_retry_notificacoes` — todos da migration `20260727000001` da
P41. **`database.types.ts` estava defasado por um milestone inteiro.** Incluí-los é o correto:
refletem objetos vivos em PROD.

## Efeitos colaterais em PROD, e o que foi desfeito

O smoke exige uma candidatura de `candidato.funil@teste.com` **sem** `decisao_final`, e a única que
existia já tinha uma (o pedido de revisão pendente de conta de teste do `4425c9e`). Foi criada uma 2ª
candidatura numa vaga `[TESTE]` distinta, marcada `origem_candidatura='p42-06-smoke-slot'`.

| Efeito | Estado final |
|--------|--------------|
| Candidatura-slot `a802bc05` | **MANTIDA** deliberadamente — sem ela o smoke não é re-executável |
| Linha em `notificacoes_enviadas` (do `trg_notif_confirmacao`) | **REMOVIDA** — o `dedupe_key` barraria uma confirmação futura legítima daquela candidatura (precedente do UAT da P41-05) |
| Fixture de `decisao_final` + histórico | removidas pelo teardown; `decisao_final` de volta a 1 linha (a real), `decisao_final_historico` a 0 |
| Linha real de PROD (`a1dd4c42`) | **intacta** — veredito/autoria/respondida_em todos NULL, verificado ao fim |

**Descoberta operacional:** o `modo` gravado no ledger pela EF veio **`producao`**, não `teste`, e o
destinatário foi o endereço real. `NOTIFICACOES_MODO` foi flipado para `producao` em algum ponto após
o último update da STATE.md, que ainda registrava UAT-36-3 / `m7-ativar-modo-producao` como "falta o
flip". Endereço de conta de teste, nenhum candidato real contatado — mas **envio real**, e a partir
daqui todo INSERT de candidatura ou avanço de funil em PROD dispara e-mail de verdade. Isso muda o
cálculo dos planos 42-07/42-08, que adicionam justamente o 5º evento de notificação.

Verificado que o smoke em si **não envia e-mail**: `decisao_final` tem só
`trg_decisao_final_snapshot` (AFTER UPDATE → arquiva histórico); as notificações nascem de
`historico_candidatura` INSERT via `trg_notif_transicao`, que o smoke nunca toca.

## Deviations from Plan

- **Task 2 executada como 2ª rodada do checkpoint**, não como 1ª. O apply e o reconcile já estavam
  feitos; o que faltava era a prova. As 3 correções de espec estão registradas inline no próprio
  smoke, com a justificativa, conforme o plano exige.
- **Migration extra não prevista** (`20260730000002`). O plano previa uma migration; a segunda existe
  porque a primeira já estava aplicada em PROD e editá-la seria drift. Restritiva: só reescreve
  corpos de função e revoga privilégio — zero DDL de tabela, zero DML.
- **Smoke com 9 asserções, não 8.** O critério de sucesso #3 do ROADMAP fala da prova nominada, que é
  a (f)/(g) e passou; a 9ª é cobertura adicional do mesmo requirement.
- **Task 3 pelo MCP, não pelo CLI**, por ausência de `supabase login`. Resultado equivalente e
  verificado com o critério vinculante (zero deleções).

## Follow-ups criados

- `database.types.ts` esteve defasado desde a P41 — a regeneração pós-migration não é confiável no
  fluxo atual. Vale um gate.
- `NOTIFICACOES_MODO=producao` precisa ser refletido na STATE.md e considerado no planejamento de
  42-07/42-08.
- O CLI do Supabase não está autenticado (`supabase login` pendente) — `npm run db:types` não roda.
