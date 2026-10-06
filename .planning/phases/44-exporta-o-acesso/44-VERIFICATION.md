---
phase: 44-exporta-o-acesso
verified: 2026-10-06T14:40:00Z
status: gaps_found
score: 5/6 must-haves verified
covered_files:
  - ".planning/phases/44-exporta-o-acesso/44-01-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-01-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-02-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-02-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-03-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-03-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-04-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-04-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-05-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-05-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-06-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-06-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-07-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-07-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-08-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-08-SUMMARY.md"
  - ".planning/phases/44-exporta-o-acesso/44-09-PLAN.md"
  - ".planning/phases/44-exporta-o-acesso/44-09-SUMMARY.md"
  - "docs/compliance/__tests__/exportAllowlist.test.ts"
  - "docs/compliance/export-allowlist.json"
  - "docs/compliance/export-scope-rules.yaml"
  - "docs/compliance/sql/05-export-allowlist-drift.sql"
  - "docs/compliance/sql/gen-export-allowlist.cjs"
  - "src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx"
  - "src/features/pedidos-dados/services/pedidosDadosService.ts"
  - "src/features/privacidade/services/exportacaoService.ts"
  - "supabase/functions/_shared/exportAllowlist.ts"
  - "supabase/functions/exportar-meus-dados/index.ts"
  - "supabase/migrations/20260804000001_p44_config_sla_dados.sql"
  - "supabase/migrations/20260804000002_p44_solicitacoes_dados.sql"
  - "supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql"
covered_digest: "v2:sha256:5e33048efacbd3c3a7bfa7832aaae408ff7575b4567d318f43281f0449f21a72"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "O inventário que o export projeta é um artefato nomeado e versionado que a Phase 45 consome como plano de exclusão — a fase irreversível não refaz o levantamento (ROADMAP SC#5, trecho «que a Phase 45 consome»)"
    reason: "A Phase 45 mediu esta fonte (45-RESEARCH §C2: a allowlist cobre 30 de 69 tabelas e exclui ai_call_logs e logs_acesso, 2 das 5 do ERASE-09) e a RECUSOU por escrito em docs/compliance/sql/gen-recibo-exclusao.cjs:12-25; o motor consome pii-inventory.yaml. O requisito EXPORT-06 foi reescrito para refletir isso. A parte do SC#5 que não depende de consumo (artefato nomeado, versionado, gerado) está verificada de forma independente abaixo."
    accepted_by: "operador (Fernando) — resposta «export 06 ok», registrada em 44-PENDENCIAS-2026-10-03.md §Decisões do operador e em REQUIREMENTS.md linha 97. ATENÇÃO: o aceite é sobre o REQUISITO; o texto do SC#5 no ROADMAP.md não foi reescrito e continua afirmando o consumo. Ver advisory."
    accepted_at: "2026-10-04"
re_verification:
  previous_status: gaps_found
  previous_score: "2/6 requisitos fechados de verdade (EXPORT-04 e EXPORT-05 rebaixado a parcial); 2/5 SCs do roadmap"
  previous_report: ".planning/phases/44-exporta-o-acesso/44-VERIFICATION-2026-08-04.md"
  gaps_closed:
    - "G1 — EXPORT-01 sem nenhum exercício ponta a ponta (3 linhas acesso/atendido medidas hoje no banco)"
    - "G1-art — EF exportar-meus-dados na v1 pré-correção (hoje v5, ACTIVE, verify_jwt=true, corpo com os marcadores dos consertos)"
    - "G2 — EXPORT-02 sem payload real projetado (30 coleções, 82.715 B; allowlist 1.3.0 tem 0 colunas inexistentes no banco vivo)"
    - "G3 — EXPORT-03 sem observação do CV por URL assinada (B14/B15 documentados + bucket privado + 18/18 prefixo=owner medido hoje)"
    - "G4-a — UAT da fila nos dois papéis (E12 + §7.6 em 2026-09-06; sessão real do recrutador RH2 na Phase 50)"
    - "G4-b — predicado vagas.created_by = auth.uid() (removido pela Phase 50; confirmado no catálogo vivo hoje)"
    - "EXPORT-06 pendente por redação errada (requisito reescrito com aprovação do operador em 2026-10-04)"
  gaps_remaining:
    - "G5 (NOVO nesta reverificação, não estava na lista de 2026-08-04): drift de export vivo — 9 colunas sem veredito em tabelas em escopo e 6 tabelas inteiras fora da allowlist e do catálogo versionado"
  regressions: []
gaps:
  - truth: "SC#3 — Adicionar uma coluna nova ao banco quebra o teste de snapshot das chaves do export: nenhuma coluna entra no export por acidente e nenhuma sai dele em silêncio"
    status: partial
    reason: >
      O lado «nenhuma entra por acidente» vale (a allowlist é explícita; as colunas novas ficam FORA por fail-safe;
      3 inline snapshots + check:export-allowlist verdes). O lado «nenhuma sai em silêncio» não vale em PROD hoje.
      Medido em 2026-10-06 com o próprio 05-export-allowlist-drift.sql (read-only): 9 linhas «COLUNA NOVA NO BANCO — sem
      veredito» — candidatos.faixa_etaria_materializada, candidaturas.encerrada_a_pedido_em e 7 colunas de
      solicitacoes_dados (executar_em, cancelado_em, plano, storage_concluido_em, postgres_concluido_em,
      auth_concluido_em, recibo_enviado_em), todas das Phases 45/46. Por cima: 6 tabelas base de public
      (cognitivo_liberacao, retencao_hold, purga_execucao_itens, purga_execucoes, config_purga, config_janela_exclusao)
      não existem nem em export-allowlist.json (30 em escopo + 39 excluídas = 69) nem em catalogo-vivo-44.json (69; o banco
      tem 75), porque o fecho de tabela do gerador compara contra um SNAPSHOT versionado de 2026-08-04, não contra o banco, e
      o drift SQL restringe-se por desenho às tabelas que a allowlist declara. Três dessas tabelas ligam-se ao titular
      (cognitivo_liberacao.candidatura_id, retencao_hold.candidatura_id + motivo/detalhe, purga_execucao_itens.candidato_id) e
      nenhuma teve veredito de «é dado do titular sob o Art. 18, II?». Todos os portões AUTOMÁTICOS estão verdes
      (240 testes das features + exportAllowlist; check:export-allowlist «OK»): a única coisa que enxerga a divergência é o
      SQL manual, e o docblock de exportAllowlist.test.ts admite que o Vitest é estruturalmente cego para o banco.
      O drift de 9 colunas já estava escriturado como «open» em 48-consertos/deferred-items.md (2026-09-21), mas nunca foi
      carregado para a lista da Phase 44 (nem para 44-AUDITORIA-GAPS nem 44-PENDENCIAS) e nenhuma fase posterior o cobre
      (Phases 45-50 já foram feitas), então não é «deferred» no sentido do Step 9b.
    artifacts:
      - path: "docs/compliance/export-scope-rules.yaml"
        issue: "sem veredito (export true/false + razão) para as 9 colunas; sem entrada para as 6 tabelas"
      - path: "docs/compliance/catalogo-vivo-44.json"
        issue: "snapshot de 2026-08-04 (69 tabelas); o banco tem 75 — o fecho do gerador nunca vê as 6 tabelas novas"
      - path: "docs/compliance/export-allowlist.json"
        issue: "versão 1.3.0 não decide as 9 colunas nem as 6 tabelas; a cópia do titular omite, por fail-safe e sem aviso, fatos do próprio titular como solicitacoes_dados.cancelado_em/executar_em e candidaturas.encerrada_a_pedido_em"
    missing:
      - "Medir as 9 colunas + as 6 tabelas no banco vivo, acrescentá-las ao catalogo-vivo-44.json e dar veredito a cada uma em export-scope-rules.yaml (deferred-items da 48 já aponta plano = jsonb do motor P45, provável export:false)"
      - "Regenerar a allowlist (provável 1.4.0), regenerar os dois VALUES do drift SQL (asserção (k)) e REDEPLOYAR a EF exportar-meus-dados no mesmo ato"
      - "Decisão do operador/Encarregado para as três tabelas ligadas ao titular (cognitivo_liberacao, retencao_hold, purga_execucao_itens): são dado do titular (entram na cópia) ou telemetria/estado interno (fora, com razão nomeada)?"
      - "Reduzir a dependência de memória: ou o drift SQL passa a rodar de forma recorrente (e a lista de tabelas do predicado passa a ser derivada do banco, não da allowlist), ou o aceite de que o portão é manual fica escrito como override"
advisory:
  - finding: "ROADMAP.md, Phase 44 SC#5 ainda afirma que a Phase 45 CONSOME o inventário do export; o EXPORT-06 reescrito, o meta.consumidores do artefato e gen-recibo-exclusao.cjs:12-25 dizem o contrário. O aceite do operador foi sobre o requisito."
    category: other
    reason: "O texto do roadmap é o contrato de verificação; enquanto não for reescrito, qualquer verificação futura vai reabrir o SC#5. Fora do que este verificador pode editar."
    evidence_status: "lido em ROADMAP.md (Phase 44, SC#5) e REQUIREMENTS.md linha 97"
  - finding: "A asserção (e) de docs/compliance/__tests__/exportAllowlist.test.ts («meta declara a Phase 45 como consumidora… SC#5») passa porque procura a substring 'Phase 45' — que agora aparece na frase que NEGA o consumo"
    category: other
    reason: "Portão oco: o título afirma o contrário do que o artefato diz e continuaria verde se a Phase 45 voltasse a ser declarada consumidora ou continuasse negada. A asserção deveria testar a NEGAÇÃO (ou a presença de 'NÃO consome') agora que ela é o contrato."
    evidence_status: "lido (linhas 597-601) e executado: 73/73 verdes incluindo a (e)"
  - finding: "T2 — src/store/authStore.ts usa .select('*') em candidatos (linhas 180 e 211) e usuarios_rh (166 e 193)"
    category: security
    reason: "Fora do SC#1/EXPORT-02 (ver §T2). Violação real da convenção do projeto, escopo próprio (classe C do 44-PENDENCIAS), não bloqueia a Phase 44."
    evidence_status: "lido; RLS de candidatos lida do banco vivo (SELECT próprio por auth.uid() = user_id; anon sem privilégio de tabela)"
  - finding: "U1 — nenhum pedido de cópia depois da allowlist 1.3.0 (deploy 2026-09-24 05:24Z): 0 linhas acesso posteriores"
    category: other
    reason: "O operador aceitou sem teste («ok mas nao vou testar de como concluido», 2026-10-04). Registrado como aceite, não como prova. Mitigação medida por este verificador: os 408 pares tabela.coluna da 1.3.0 (colunas + chaves do titular) existem TODOS no banco vivo (0 inexistentes), então um select da EF não pode falhar por coluna ausente; 20 testes Deno verdes. Não prova a montagem ponta a ponta com entrevista_analises real."
    evidence_status: "consulta read-only ao information_schema; deno test"
  - finding: "U2 — a faixa âmbar/vermelha de prazo nunca foi renderizada com linha pendente real (0 linhas pendente já existiram)"
    category: other
    reason: "Não é necessária para o SC#4: a classificação é função pura de (dias desde solicitado_em, limiares) e está coberta por testes que rodaram verdes aqui; a fila mostra os pendentes primeiro por ordenação no servidor. Exigiria escrita em PROD — decisão do operador. Anotado, não bloqueia."
    evidence_status: "73 testes de src/features/pedidos-dados verdes; leitura do corpo de listar_pedidos_dados"
deferred: []
human_verification: []
---

# Phase 44: Exportação & Acesso — Relatório de Verificação (re-verificação)

**Objetivo da fase:** O candidato recebe uma cópia honesta dos próprios dados — e o sistema ganha, **exercitado em produção**, o inventário de PII que a fase irreversível vai consumir como plano de exclusão em vez de um palpite novo.
**Verificado em:** 2026-10-06
**Status:** gaps_found
**Re-verificação:** Sim — após as Phases 45-50 e as decisões do operador de 2026-10-04. Relatório anterior preservado em `44-VERIFICATION-2026-08-04.md` (status `gaps_found`, 2/5 SCs).

> Postura: nada abaixo foi aceito porque um documento disse. As afirmações de `44-AUDITORIA-GAPS-2026-09-26.md` e `44-PENDENCIAS-2026-10-03.md` foram tratadas como hipóteses e remedidas hoje. Toda leitura de PROD foi `SET TRANSACTION READ ONLY; SELECT` por `node p46apply.cjs sql` ou `GET` na Management API. Nenhuma escrita, apply, deploy ou commit foi feito por este verificador.

## População medida antes de qualquer booleano (2026-10-06)

| O quê | Valor medido hoje | Por que importa |
|---|---|---|
| `solicitacoes_dados` total / `tipo='acesso'` | 8 / 3 | A frase-âncora do relatório de agosto («0 linhas») deixou de valer |
| `acesso` + `atendido` + `causa NULL` | 3 (último 2026-09-20 20:30 -03) | Prova que a EF rodou, autenticada, 3 vezes |
| `acesso` + `pendente` | **0** | Qualquer afirmação «a fila mostra X pendente» tem população vazia no dado real; ver U2 |
| `acesso` depois do deploy da 1.3.0 | **0** | U1: a versão no ar nunca passou por um titular |
| `usuarios_rh` (não excluídos) | administrador 3 ativos + 3 inativos; recrutador **1 ativo** + 2 inativos | Agora existe um recrutador ativo (RH2), ao contrário de 2026-10-03 |
| `vagas` / `created_by` NULL | 15 / 9 | O predicado antigo continuaria cego a 9 vagas |
| `candidaturas` com `curriculo_url` / delas com `http(s):`/`data:` | 22 / **0** | O JSON carrega só caminho de Storage, nunca URL nem base64 (n = 22, não vácuo) |
| `storage.objects` em `curriculos` com `owner` / prefixo = `owner` | 18 / **18** | Convenção `auth.uid()/` do BD-7 vale para 100% (bucket `public=false`) |
| Pares `tabela.coluna` da allowlist 1.3.0 (colunas + chave do titular) / inexistentes no banco | 408 / **0** | Ver U1 |
| Tabelas base em `public` / conhecidas pela allowlist | 75 / 69 | 6 tabelas sem disposição (G5) |

## Reverificação, gap a gap (relatório de 2026-08-04)

| # | Gap anterior | Hoje | Evidência independente |
|---|---|---|---|
| G1 | EXPORT-01 — zero exercícios ponta a ponta | **FECHADO** | 3 linhas `acesso/atendido/causa NULL` medidas agora. A EF só escreve `tipo='acesso'` e exige JWT (`index.ts` passos 1-4; o candidato não tem policy de INSERT, confirmado em 44-05-EVIDENCIA-DEPLOY §4). Os dois arquivos baixados constam de `GUIA-VALIDACAO-FINAL` §7.22 F1 (documento do operador; não reproduzível por mim). Ressalva mantida: titular = conta de teste do operador, nunca terceiro |
| G1-art | EF deployada na v1 pré-correção | **FECHADO** | `GET /functions/exportar-meus-dados`: **version 5**, ACTIVE, `verify_jwt=true`, `updated_at 2026-09-24T05:24:46Z`. `grep -a` no corpo publicado: «FECHA no ileg…» 2×, «Descartar o erro» 2×, «WR-04» 2×, `falha_geracao` 2×, `1.3.0` 2×, `select("*")` 0×. Leitura de `index.ts`: cooldown falha FECHADO em timestamp ilegível (l.213), `UPDATE`s não descartam erro (l.303-314, 351-364), a cópia corrige o próprio pedido para `atendido` só se a marca deu certo (l.326). Deno: 20/20 |
| G2 | EXPORT-02 — nenhum byte real projetado / CR-01 não exercitado | **FECHADO** | Payloads reais de 06/09 (18 KB + 23 KB) e 20/09 (82.715 B, 30 coleções) nos documentos do operador; mecanismo relido: `.select(def.colunas.join(', '))` nas duas passadas (l.260, 295), nenhum `select('*')` em `exportar-meus-dados`, `exportacaoService`, `pedidosDadosService`; `FORA_DO_ARQUIVO_LEGIVEL` derivado do artefato (`exportacaoService.ts:294`) e o JSON declara `fora_do_arquivo_legivel` para `avatar_url`, `curriculo_url`, `gravacao_url`, `link_videochamada` |
| G3 | EXPORT-03 — ninguém abriu o CV pela URL cunhada no cliente | **FECHADO** | Código: `createSignedUrl(caminho, TTL_CURRICULO_SEGUNDOS)` com `TTL = 60` (`exportacaoService.ts:901, 1033`), sem `service_role` no arquivo. Banco: bucket privado, 18/18 prefixo = `owner`, 0 URL/base64 em `curriculo_url`. Observação de B14 (TTL 60 s, recarga → 400) e B15 (zero chamadas a `get-curriculo-url`) está em `GUIA-VALIDACAO-FINAL` §7 — sessão de teste de agente em conta descartável; é registro documental, não reproduzido aqui |
| G4-a | EXPORT-05 — UAT ao vivo da fila | **FECHADO** | E12 (administrador, 09/2026) + §7.6 (recrutador viu «Nenhum pedido») + sessão real do RH2 na Phase 50 (`pedidos_dados_todos` 3 = 3) |
| G4-b | EXPORT-05 — `vagas.created_by = auth.uid()` torna o ramo `rh` vazio | **FECHADO** | Ver §G4-b abaixo (verificado contra o catálogo vivo, não contra o SUMMARY da Phase 50) |
| itens `human_verification` (3) | Caminho feliz, CV, UAT dos dois papéis | **EXECUTADOS** | Ver G1, G3, G4-a |
| EXPORT-06 | `[ ]` por redação errada | **FECHADO por decisão** | Requisito reescrito com aprovação do operador em 2026-10-04; ver §EXPORT-06 |
| — | — | **G5 NOVO, ABERTO** | Drift de export vivo (SC#3). Ver §Gaps |

### G4-b — verificação contra o código e o catálogo vivo

- **Migration:** `supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql` reescreve `listar_pedidos_dados(boolean)` e `contar_pedidos_dados_pendentes()` com o escopo `v_role = 'administrador' OR (v_role = 'rh' AND public.is_active_rh_user())` — sem `created_by` e sem filtro próprio do ramo `rh` (l.206-300).
- **Banco vivo (`pg_get_functiondef`):** as duas funções: `cita_created_by = false`, `usa_helper = true`, `cita_vagas_associadas = false`. `anon` sem EXECUTE nas duas, `authenticated` com EXECUTE (`has_function_privilege`).
- **Varredura pela forma:** `pg_policies` (public + storage) que citam `created_by`: **0**; policies que citam `is_active_rh_user`: **14**. Funções de `public` cujo corpo cita `created_by`: 4 — `anonimizar_candidato` e `plano_exclusao_titular` (intocadas por decisão D-08 da Phase 50), `criar_preferencias_padrao` e `criar_usuario_rh_com_audit` (apenas gravam autoria). Nenhuma decide escopo de recrutador.
- **Ledger:** as 4 migrations da Phase 50 + as 2 da 44 estão em `schema_migrations`; `md5(statements[1])` da `…20261005000003` é `7372ac4e…`, igual ao md5 do arquivo; as duas da 44 batem com o arquivo sem o `\n` final (`dc51bd9d…`, `b2f9a9f8…`), como o 44-04 documentou.
- **População do «mesmo conjunto»:** hoje há 1 recrutador ATIVO. A igualdade fila-do-RH ≡ fila-do-administrador foi medida pela Phase 50 com impressão digital de conteúdo e sessão real (3 = 3); aqui só reconfirmei a forma da definição e do catálogo, não refiz o login do RH2 (sem credencial, e não devo). O empate `pendentes` 0 = 0 é vácuo (ver `acesso+pendente = 0`) e não sustenta nada por si.
- **Conclusão:** a causa medida do rebaixamento de EXPORT-05 (ramo `rh` estruturalmente vazio) não existe mais. G4-b fechado.

## Verdades observáveis

| # | Verdade (SC do ROADMAP e requisito reescrito) | Status | Evidência |
|---|---|---|---|
| SC1 | O candidato pede cópia pelo painel e recebe JSON por allowlist explícita, nunca `select('*')` | VERIFICADO | EF v5 relida e comparada ao corpo publicado; 3 pedidos reais atendidos em ~4,7 s (banco); 20/20 testes Deno incluindo cooldown fail-closed, ponte sem ids → 500, marca falha → cópia não afirma `atendido`; 408/408 pares da allowlist existem no banco vivo. Cobertura de versão: só a 1.1.0 foi exercitada com titular; a 1.3.0 está no ar sem exercício (U1, aceito pelo operador). O requisito de completude do JSON está atravessado pelo G5 — ver Gaps |
| SC2 | CV por signed URL de TTL curto, nunca inline/base64 | VERIFICADO | `createSignedUrl(…, 60)` no cliente, sem `service_role`; JSON só tem caminho (22 CVs, 0 com `http(s):`/`data:`); bucket privado; 18/18 prefixo = owner; testes de `privacidade` verdes (240 junto com o restante) |
| SC3 | Coluna nova no banco quebra o snapshot das chaves; nenhuma coluna entra por acidente, nenhuma sai em silêncio | **FALHOU (parcial)** | Lado «entra por acidente»: VERIFICADO (3 `toMatchInlineSnapshot`, `check:export-allowlist` OK, e as 9 colunas novas estão FORA da cópia). Lado «sai em silêncio»: o portão automático não vê o banco; o SQL manual hoje devolve 9 linhas e as 6 tabelas novas nem entram no seu universo — G5 |
| SC4 | Prazo do Art. 19, II medido a partir do registro e visível ao RH; pedido perto do prazo distinguível de recém-chegado | VERIFICADO | `solicitado_em` é o marco (migration 44-02 + EF); RPCs servem o `rh` ativo com o mesmo conjunto do administrador (G4-b); `FilaPedidosDadosTable` renderiza `RevisaoSlaBadge` com `diasEmEspera(solicitado_em)` e limiares da `config_sla_dados` (7 d / 12 d) só para não atendidos, ordenação composta no servidor (pendentes primeiro); 73/73 testes da feature passam, incluindo (bx) os dois eixos âmbar/vermelho e (by1)-(by5). Rota `/rh/pedidos-dados` presente em `routes.tsx:513`. U2 (render com linha pendente real) não é necessário para esta verdade |
| SC5 | Inventário nomeado e versionado que a Phase 45 consome como plano de exclusão | PASSOU (override) | Parte de artefato VERIFICADA: `export-allowlist.json` v1.3.0, gerado por `gen-export-allowlist.cjs`, `meta.consumidores`, `medido_em`, `--check` em sincronia com as três fontes. Parte «a Phase 45 consome»: FALSA por decisão medida da Phase 45; aceita via override ancorado no aceite do operador do EXPORT-06 — ver frontmatter e advisory sobre o ROADMAP |
| EX06 | EXPORT-06 (redação nova, 2026-10-04): o inventário do export é a projeção do direito de acesso (Art. 18, II), consumido só por `exportar-meus-dados` e `exportacaoService`; o plano de exclusão do motor vem do `pii-inventory.yaml` | VERIFICADO | Varredura em `src/` e `supabase/functions/`: os únicos importadores de `EXPORT_ALLOWLIST` fora de testes são a EF e `exportacaoService`. `meta.consumidores` diz «Phase 45 — NÃO consome…» e remete a `gen-recibo-exclusao.cjs:12-25`, que existe e dá a razão medida |

**Score:** 5/6 verdades verificadas (4 verificadas + 1 por override); 1 falhou (parcial). 0 verdades presentes-mas-comportamento-não-exercitado.

## Requisitos (todos os IDs dos PLANs, cruzados com REQUIREMENTS.md)

| Requisito | Planos que o declaram | REQUIREMENTS.md hoje | Avaliação | Evidência |
|---|---|---|---|---|
| EXPORT-01 | 44-02, 44-05, 44-06 | `[x]` | SATISFEITO (com a ressalva de titular = conta de teste) | G1; SC1 |
| EXPORT-02 | 44-01, 44-03, 44-05 | `[x]` | SATISFEITO no mecanismo; completude da cópia afetada por G5 | SC1; G2; G5 |
| EXPORT-03 | 44-07 | `[x]` | SATISFEITO | SC2; G3 |
| EXPORT-04 | 44-03 | `[x]` | SATISFEITO no texto do requisito («uma coluna nova não pode VAZAR para o export»): as 9 colunas novas estão fora da cópia. O SC#3 do roadmap vai além («nenhuma SAI em silêncio») e é o G5 | SC3 |
| EXPORT-05 | 44-02, 44-04, 44-08, 44-09 (+ 50-01…50-11) | `[x]` (Phase 44 + Phase 50) | SATISFEITO | SC4; G4-b |
| EXPORT-06 | 44-01, 44-03, 44-06 | `[x]` (redação reescrita) | SATISFEITO pela redação nova | EX06 |

**Órfãos:** nenhum — REQUIREMENTS.md mapeia exatamente EXPORT-01 a EXPORT-06 para a Phase 44 (EXPORT-05 também para a 50). Os 6 IDs estão em pelo menos um PLAN.

## Artefatos

| Artefato | Esperado | Status | Detalhes |
|---|---|---|---|
| `supabase/functions/exportar-meus-dados/index.ts` | EF allowlist-driven, authn→authz→cooldown→registro→projeção | VERIFICADO e igual ao deployado v5 | marcadores do corpo publicado batem com o repo |
| `supabase/functions/_shared/exportAllowlist.ts` + `docs/compliance/export-allowlist.json` | gerado, versionado | VERIFICADO | `--check` OK; v1.3.0; 378 colunas / 30 tabelas |
| `docs/compliance/export-scope-rules.yaml`, `catalogo-vivo-44.json` | vereditos de todo o catálogo | PARCIAL | G5 |
| `docs/compliance/sql/05-export-allowlist-drift.sql` | portão de drift contra o catálogo vivo | EXISTE, MORDE, MAS É MANUAL | executado hoje: 9 linhas |
| `supabase/migrations/20260804000001/2_p44_*.sql` | tabelas + RPCs + RLS | VERIFICADO, APLICADO | ledger 2/2, md5 = arquivo sem `\n` final |
| `src/features/pedidos-dados/*` | fila, badge, classificador, sidebar | VERIFICADO e CONECTADO | 73 testes; rota registrada |
| `src/features/privacidade/services/exportacaoService.ts` | dois arquivos, escape, cunhagem do CV | VERIFICADO | TTL 60; `FORA_DO_ARQUIVO_LEGIVEL` derivado |

## Fluxo de dados (Nível 4)

| Artefato | Variável | Fonte | Dado real? | Status |
|---|---|---|---|---|
| EF `exportar-meus-dados` | `payload[tabela]` | `supabaseAdmin.from(t).select(allowlist).eq/in(chave)` | Sim: 3 execuções reais; 408/408 colunas existem | FLUINDO |
| `FilaPedidosDadosTable` | linhas da fila | `listar_pedidos_dados` (SECURITY DEFINER) sobre `solicitacoes_dados` | Sim para administrador e RH ativo (Phase 50: 3 linhas na sessão real); pendentes = 0 hoje | FLUINDO (sem pendente real) |
| Badge do menu | contagem | `contar_pedidos_dados_pendentes` | Mesmo predicado que a lista (corpo vivo) | FLUINDO (0 = 0 vazio no dado) |

## T2 — `authStore.ts` com `.select('*')`: viola o SC#1?

**Decisão: não viola o SC#1 nem o EXPORT-02; é violação real da convenção do projeto, de escopo próprio, e não bloqueia a Phase 44.** Raciocínio:

1. O SC#1 e o EXPORT-02 definem o JSON do export («montado por allowlist explícita… nunca `select('*')`»). Esse JSON é produzido só por `exportar-meus-dados/index.ts` (leituras `service_role` por allowlist) e montado em arquivos por `exportacaoService.ts`. Verifiquei que nenhum dos dois importa `authStore` nem lê `profile`; a única ligação é `PedirCopiaBloco`/`PrivacidadeCandidatoPage` usando `useCandidato()` apenas para `.id`.
2. A leitura do store é a do **próprio titular**, com o JWT dele: a RLS viva de `candidatos` só permite `SELECT` por `auth.uid() = user_id` (e RH ativo), e `anon` não tem privilégio de tabela (medido). Não há ampliação de superfície entre usuários — o dado que vem no `*` é o que o dono já pode ler. O risco do `*` aqui é o da classe geral (coluna futura sensível chegando ao cache do cliente e ao DevTools), não o de exfiltração do export.
3. O `authStore.ts` é da Phase 3/4 (último commit relevante `465e148a`, Phase 05); a página de privacidade só o herda — o B15 de `GUIA-VALIDACAO-FINAL` registra o `candidatos?select=*` na rede da página de privacidade, e o 44-PENDENCIAS já o localizou no store (classe C).
4. O que **não** acompanha este veredito: o conserto continua devido (as quatro ocorrências, linhas 166/180/193/211), com re-revisão — a memória do projeto registra que o conserto introduziu blocker novo duas vezes. Fica como advisory, fora do score.

## Spot-checks comportamentais e probes

| Comportamento | Comando | Resultado | Status |
|---|---|---|---|
| Allowlist em sincronia com as 3 fontes | `npm run check:export-allowlist` | «OK … em sincronia» | PASSOU |
| Snapshot das chaves + export + fila RH + privacidade | `npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts docs/compliance/__tests__/genExportAllowlist.test.ts src/features/pedidos-dados src/features/privacidade` | 18 arquivos, 240/240 | PASSOU |
| Comportamento da EF (cooldown, ordem, pontes, marca) | `deno test --allow-all supabase/functions/exportar-meus-dados/` | 20 passed, 0 failed | PASSOU |
| Drift de export contra o banco vivo | `05-export-allowlist-drift.sql` (read-only, sem os comentários) | **9 linhas** | **MORDEU — gap G5** |
| Colunas da allowlist existem vivas | CTE de 408 pares contra `information_schema.columns` | 0 inexistentes | PASSOU |
| Tabelas sem disposição | `information_schema.tables` NOT IN (69 conhecidas) | 6 | **gap G5** |

A suíte completa (`npm run test:run`) **não** foi executada aqui; foram rodados apenas os arquivos nomeados acima. A fase não declara `probe-*.sh` (Step 7c: nenhum `MISSING_PROBE`).

## Anti-padrões

| Arquivo | Padrão | Severidade | Impacto |
|---|---|---|---|
| arquivos-chave da fase | `TBD`/`FIXME`/`XXX` | nenhum encontrado | — |
| `docs/compliance/__tests__/exportAllowlist.test.ts` (e) | asserção oca (substring que passa na frase negada) | Aviso | não afeta o score; ver advisory |
| `src/store/authStore.ts` 166/180/193/211 | `.select('*')` | Aviso (fora do escopo, T2) | ver §T2 |
| `.planning/ROADMAP.md` Phase 44 | checkboxes 44-05, 44-07 e 44-09 ainda `[ ]` com anotações «CORRIGIDO 2026-09-26: rodou»; SC#5 desatualizado | Info | escrituração; fora do que posso editar |

## Verificação humana

Nenhum item é necessário para um SC. Registrados por transparência, sem entrar em `human_verification`:

- **U1** — aceito sem teste pelo operador (2026-10-04). Se um dia quiser fechar: entrar como `candidato.funil@teste.com` → `/candidato/privacidade` → «Pedir cópia» → conferir `entrevista_analises` no `.json` e o `.html` (queima o cooldown de 24 h da conta). Se o G5 for fechado (allowlist 1.4.0 + redeploy), faz sentido fazer U1 **depois**, já na versão nova.
- **U2** — exigiria escrita em PROD (semear `solicitado_em` retroativo ou provocar `falha_geracao`); decisão do operador; o SC#4 não depende dela.

## Resumo dos gaps

A Phase 44 entregou o que prometia no mecanismo e, ao contrário de agosto, entregou também o que a cláusula «exercitado em produção» exigia: a EF está na v5 com todos os consertos no ar (o redeploy veio antes do primeiro exercício), houve 3 pedidos reais autenticados, o CV abre por URL assinada de 60 s cunhada no cliente, e o ramo `rh` da fila deixou de ser vazio porque a Phase 50 removeu o predicado `vagas.created_by` das 14 policies e das RPCs (confirmado no catálogo vivo). Os sete itens do relatório de 2026-08-04 estão fechados.

Resta **um** gap, e ele é novo para esta lista: o SC#3 promete que nenhuma coluna sai da cópia em silêncio, e hoje o banco tem 9 colunas das Phases 45/46 sem veredito de export e 6 tabelas inteiras que nem o artefato nem o catálogo versionado conhecem — três delas ligadas ao titular. Todos os portões automáticos estão verdes porque comparam o artefato com um snapshot de 2026-08-04; só o SQL manual enxerga o banco e ele, hoje, aponta as 9 linhas. O drift de 9 colunas já estava como `open` nos `deferred-items` da Phase 48 desde 2026-09-21 e nunca chegou à pauta da 44. É um conserto pequeno e localizado (medir, dar veredito, regenerar a allowlist, redeployar a EF), com uma decisão do operador/Encarregado sobre as três tabelas ligadas ao titular. Se preferir aceitar o portão manual e o drift como estão, o caminho é registrar um override em vez de mudar código.

Dois pontos de escrituração para o orquestrador, sem relação com código: reescrever o SC#5 no `ROADMAP.md` para o que o EXPORT-06 reescrito diz, e atualizar os `[ ]` dos planos 44-05, 44-07 e 44-09.

---

_Verificado: 2026-10-06T14:40:00Z_
_Verificador: Claude (gsd-verifier)_
