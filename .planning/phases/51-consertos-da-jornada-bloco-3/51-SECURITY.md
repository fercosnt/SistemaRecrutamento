---
phase: "51"
slug: "consertos-da-jornada-bloco-3"
status: open_threats
verdict: OPEN_THREATS
# threats_open = ameaças OPEN com severidade >= block_on (o portão). Abertas abaixo do limiar não contam.
threats_open: 1
threats_open_non_blocking: 1
threats_total: 91          # 74 IDs numerados (T-51-01..T-51-74) + 17 linhas T-51-SC (uma por plano)
threats_closed: 89
asvs_level: 1              # padrão (sem config de segurança em .planning/config.json); as ameaças de controle de acesso foram conferidas com profundidade L2 contra o estado vivo
block_on: high
unregistered_flags: 5
created: "2026-10-10"
auditor: gsd-security-auditor
---

# Phase 51 — Security

> Contrato de segurança da fase: registro de ameaças, riscos aceitos e trilha da auditoria.
> O registro foi montado a partir dos `<threat_model>` dos 17 planos (51-01..51-17) e das seções «Threat Flags»
> dos SUMMARYs. A evidência dos três reviews adversariais bloqueantes da Onda B (`51-REVIEW-PORTAO-1/2/3.md`) e do
> code review da fase (`51-REVIEW.md`) foi reaproveitada. A auditoria foi feita em 2026-10-10.
>
> **PROD foi lido só por leitura.** Toda consulta saiu por `node p46apply.cjs sql "set transaction read only; …"`.
> Nada foi escrito em PROD, nada foi commitado e nenhum arquivo de implementação foi tocado. Este relatório traz só
> ids, booleanos e contagens. Nenhum nome ou e-mail de titular aparece aqui.

## Veredito: **OPEN_THREATS**

| | Contagem |
|---|---|
| Ameaças no registro | 91 linhas: 74 IDs + 17 `T-51-SC`. Severidades dos IDs: 35 high, 28 medium e 11 low; as 17 `SC` são high |
| Disposição | 88 mitigate, 3 accept, 0 transfer |
| CLOSED | 89 (incluídas as 3 aceitas, com registro no Accepted Risks Log abaixo) |
| **OPEN, bloqueante** (high, maior ou igual a `block_on: high`) | **1: T-51-14** |
| OPEN, não bloqueante (abaixo do limiar) | 1: T-51-47 (medium) |
| Flags não registradas (WARNING) | 5, nenhuma conta para `threats_open` |

**O controle de acesso novo da fase está fechado e confere ao vivo.** Isso cobre a tabela `revisao_rejeicao`, as
seis RPCs novas ou recriadas, o aperto de `anon` em `get_avaliacao_status` e o D-23 nas duas RPCs. O único bloqueio
é de **transparência ao titular** (LGPD). O recibo de exclusão publicado promete apagar a disponibilidade, e o motor
não a apaga.

---

## Trust Boundaries

| Boundary | Descrição | O que atravessa |
|---|---|---|
| navegador do candidato → `solicitar_revisao_rejeicao` / `estado_revisao_rejeicao` / `get_avaliacao_status` (DEFINER) | só a guarda de titular separa um candidato do outro | pedido de revisão, estado do pedido (allowlist), booleanos do Raven |
| navegador do RH → `responder_revisao_rejeicao` / `listar_revisoes_decisao` / `contar_revisoes_pendentes` / `ler_contexto_knockout_revisao` (DEFINER) | papel do JWT com `coalesce`, `is_active_rh_user()` e REVISAO-05 | veredito, justificativa ao titular, contexto do knockout |
| navegador do RH → `rejeitar_candidatura` / `registrar_decisao` (D-23) e PATCH em `candidaturas` (policy `rh_avanca_etapa`) | a trava do decisor revertido existe só nas RPCs (ver flag UF-1) | rejeição |
| banco → EFs (`notificar-candidato`, `notificar-rh`, `analise-candidato-individual`) | `net.http_post` com Bearer do Vault; a EF confere o Bearer | ids e evento |
| artefatos de conformidade → EFs `executar-direito-titular` / `exportar-meus-dados` | o recibo e a cópia que o titular recebe | texto legal (Art. 18) |
| checkout → PROD (Management API) / `origin/main` → Vercel | apply, deploy e push amarrados ao portão e ao pin | migrations, EFs, cliente |

---

## Estado vivo conferido nesta auditoria (só leitura, 2026-10-10)

| Conferência | Resultado |
|---|---|
| Ledger `20261008000001..5`: md5(`statements[1]`) = md5 do arquivo | **5/5 iguais**. Nenhuma versão posterior a `20261008000005` |
| md5(`prosrc`) vivo = md5 do corpo no arquivo, nas 15 funções criadas ou reescritas por 0001..0005 | **15/15 iguais**. Inclui `rejeitar_candidatura` `703e47e6…` e `registrar_decisao` `45f65ffc…`, as constantes do POS da 0005. **O código lido no repositório é o código vivo** |
| `revisao_rejeicao` | `relrowsecurity=true`, **0 policy**, ACL `{postgres, service_role}`. `anon` e `authenticated` sem SELECT/INSERT/UPDATE/DELETE/TRUNCATE, nem por coluna (`has_any_column_privilege=false`). **Nenhuma view** a cita. São 4 linhas, todas de contas de teste do operador (conferido por booleano, sem expor endereço), e 0 fixture `p51%smoke` residual |
| Sondas `SET LOCAL ROLE anon` | `SELECT` na tabela → 42501. `listar_revisoes_decisao`, `contar_revisoes_pendentes`, `estado_revisao_rejeicao`, `ler_contexto_knockout_revisao` e `get_avaliacao_status` → `42501 permission denied for function` |
| Sonda `SET LOCAL ROLE authenticated` com claims de **candidato alheio** sobre a candidatura de teste `8e4bb7a0` | `estado_revisao_rejeicao` → **NULL**. `get_avaliacao_status` → 42501. `solicitar_revisao_rejeicao` → 42501. `listar`/`contar`/`ler_contexto`/`responder` → 42501 `forbidden` (guarda de papel) |
| `has_function_privilege('anon', …)` | `false` em todas as funções tocadas pela fase. **Exceção:** `solicitar_revisao_decisao(uuid)` = `true` (anterior à fase, flag UF-2) |
| Invariantes vivas | Pedidos em que quem respondeu é quem rejeitou: 0 em `revisao_rejeicao` e 0 em `decisao_final`. Reaberturas sem linha de histórico do revisor: 0. Re-rejeições pelo decisor revertido depois de `reaberta_em`: 0 |
| `config_purga.modo` | `dry_run` |
| Motor × recibo | `anonimizar_candidato` vivo **não cita `disponibilidade`**. Nenhuma função de `public` faz UPDATE ou DELETE nela. **2 de 2** titulares anonimizados ainda têm a linha (T-51-14) |

Re-executado localmente, sem tocar arquivo nem PROD:
- os quatro `check:` de conformidade (`export-allowlist`, `recibo-exclusao`, `matriz-retencao`, `pii-inventory-md`) deram OK;
- `p51_portao.cjs --auto-teste`: 68 casos ok;
- `p51_catalogo_confere.cjs --auto-teste`: 11 ok;
- `p51_aceite.cjs --auto-teste`: ok.

Os 114 commits de `cd92cf42..origin/main` têm todos o assunto `(51)`/`(51-NN)`, nenhum é alheio. Depois do pin
`87be2703`, só `database.types.ts` e `scripts/p51_aceite.cjs` saíram fora de `.planning/`. `package.json`, os locks
e `deno.json` não mudaram; os únicos specifiers novos são built-ins do Node.

---

## Threat Register

As linhas CLOSED estão agrupadas por plano. Toda linha aberta, aceita ou de controle de acesso novo aparece
individualmente.

### Abertas

| Threat ID | Categoria | Severidade | Disposição | Mitigação esperada | Evidência da ausência | Status |
|---|---|---|---|---|---|---|
| **T-51-14** | Repudiation (LGPD Art. 18 VI / transparência) | **high** | mitigate | «texto derivado do inventário com regras DIREÇÃO/COBERTURA; **prova no banco de que o motor faz o que o texto diz**» | (1) O item `dados_de_cadastro` diz que «… redes sociais e disponibilidade vão ser / foram apagados» (`docs/compliance/sql/gen-recibo-exclusao.cjs:267,269`; propagado para `supabase/functions/_shared/reciboExclusao.ts:363-364`, `docs/compliance/recibo-exclusao.json` e `src/features/privacidade/constants/reciboExclusao.generated.ts`). O texto está no ar em `executar-direito-titular` v14. O inventário classifica as 4 colunas de `disponibilidade` como `apagar` (`pii-inventory.yaml:436-441`), e por isso o gerador aceita. **Ao vivo:** `anonimizar_candidato` (md5 `a68e4a6a…` = arquivo 0004) não cita a tabela; nenhuma função de `public` a escreve; a FK `ON DELETE CASCADE` não dispara porque o motor faz UPDATE em `candidatos`; 2/2 anonimizados mantêm a linha. A prova no banco que a mitigação exige **falhou** no próprio 51-05 (EDGE-PROBE, WINDOWS 89 `unmet-truth`, aberta). O texto foi publicado assim mesmo, e o operador ainda não decidiu. (2) Na mesma família, o WR-02 do `51-REVIEW.md` (disposição `open`): o recibo diz que a UF fica «para relatório agregado» (`gen-recibo-exclusao.cjs:588,590`), e `gerar_bias_snapshot` vivo não lê `estado`. A `51-VERIFICATION.md` (gap 1, `gaps_found`) chegou à mesma conclusão de forma independente | **OPEN — BLOQUEANTE** |
| T-51-47 | Repudiation | medium | mitigate | «D-57 completo; quatro `check:`; drift dentro do ensaio» | Os quatro `check:` estão verdes e o drift ao vivo deu `n_drift: 0`, então a mitigação declarada existe. O resíduo é a WINDOWS 93 (aberta), = IN-01 do review -1: `tem_decisao_registrada` soma só respostas (`executar-direito-titular/index.ts:1369`). Um pedido de `revisao_rejeicao` **não respondido** e sem `decisao_final` sobrevive à exclusão (origem, etapas, `solicitada_em`), e o recibo não mostra a linha `registro_da_decisao`. A linha `sempre` «registro do processo» só o cobre de forma frouxa. O recibo diz menos do que fica sobre a tabela nova | OPEN — não bloqueante (abaixo de `high`) |

**Como fechar o T-51-14** (é decisão do operador; o auditor não corrige): escolher uma de três saídas.
- (a) O motor passa a apagar `disponibilidade`. Isso é migration própria, sobre motor destrutivo e purga com
  portão.
- (b) As 4 colunas saem de `apagar`, e a linha vai para «mantém» com a base legal redigida pelo operador
  (precedente C-10).
- Aceitar o risco formalmente, com uma entrada AR datada neste arquivo.

Em todos os casos, corrigir também a finalidade da UF (WR-02), regenerar os artefatos (`check:recibo-exclusao`) e
redeployar `executar-direito-titular`. Depois, rodar de novo `/gsd-secure-phase 51`.

#### Evidência do conserto (51-18..51-24) — aguardando a re-auditoria

> Anexada pelo 51-24 em 2026-10-10. **Não muda veredito, `status`, `threats_open` nem a linha «OPEN — BLOQUEANTE»
> do T-51-14 acima:** quem fecha é o `/gsd-secure-phase 51`. O operador escolheu a saída (a) + o conserto da UF
> (`51-GAPS-DECISAO.md`: G1a motor + limpeza, G1b razões separadas, G2 só cliente).

**Metade da `disponibilidade` (G1a).**
- 51-22: `20261010000001` aplicada por `p46apply.cjs migrate` com `p51_portao --modo apply` no mesmo comando
  (2026-10-10 03:17:00–03:17:02 -0300, OK do operador `51-22-DECISAO.md`). Lido de volta: `md5(statements[1])` do
  ledger = md5 do arquivo (`7e88599631e1d22666615935ef19477c`); `md5(prosrc)` vivo de `anonimizar_candidato` =
  `9b87e5ee3d072df5f9bf6e99ee1ae7c1` = pin do p45; o corpo vivo sem comentários casa
  `DELETE[[:space:]]+FROM[[:space:]]+public[.]disponibilidade`; ACL e COMMENT iguais aos de antes; `anon` sem EXECUTE.
  p45 e p46 verdes contra o vivo; MD1/MF1/MF2 mordem.
- 51-23: `20261010000002` aplicada (03:25:02–03:25:04 -0300) com a população conferida contra a aprovada no mesmo
  comando (2 titulares / 2 linhas / alvo `6819cb8d…`). Prova (03:25:09): «motor vivo apaga a disponibilidade;
  **2 titular(es) anonimizado(s) examinado(s), 0 com linha**; ledger = arquivo» — população examinada (2) ≥ medida
  (2), o zero não vem de população vazia. As 26 linhas fora do alvo ficaram idênticas. Ledger `20261010000001`
  (`7e885996…`) e `20261010000002` (`6b4a9d59d7da5e4a98cf66f4302dc175`) = arquivos — conferido de novo pela regra (8)
  do portão nos `PORTAO OK` de deploy e push do 51-24. WINDOWS 89 → `fixed` (`db65ccf4`).

**Metade da UF (G1b, = WR-02 do `51-REVIEW.md`).**
- 51-19: o item `estado_e_faixa_etaria` separa as razões — faixa etária «para relatório agregado»; UF «porque o
  cadastro exige uma UF válida». Texto aprovado pelo operador em 2026-10-10 (`51-19-TEXTO-APROVADO.md`) e
  publicação confirmada em 03:15 (`51-22-DECISAO.md`, (d)).
- 51-24: antes do deploy, por máquina, `texto_futuro`/`texto_passado` do aprovado = os do `recibo-exclusao.json` e
  ambos presentes em `supabase/functions/_shared/reciboExclusao.ts`; `check:recibo-exclusao` OK. Deploy pelo portão:
  `efdeploy: OK · version=15 · status=ACTIVE · verify_jwt=true` (2026-10-10 03:31:35 -0300; antes v14 de `87be2703`,
  base de desfazer em `51-24-EF-ANTES.md`). Cliente publicado por sha enumerado (`53cb73ff..3bb9653d`, sem ALHEIO);
  marcador «porque o cadastro exige uma UF» AUSENTE do PROD antes e PRESENTE depois em `/assets/index--Yy-gC6F.js`.

**UF-3 (reenvio da prova cognitiva, = WR-01 do `51-REVIEW.md`).** Cliente consertado no 51-18 (a lista mostra a
prova concluída depois de «Prova registrada»; `4014c299`, `4003bfb1`; publicado no push do 51-24). O servidor
(`pontuar_cognitivo` ainda faz upsert e aceita reenvio por fora do cliente) segue em backlog — entrada `(51-18)` de
`deferred-items.md`. A disposição do UF-3 continua `open` até a re-auditoria decidir.

### Controle de acesso novo da fase (CLOSED, conferido ao vivo)

| Threat ID | Categoria | Sev. | Evidência |
|---|---|---|---|
| T-51-19 | EoP (IDOR em `get_avaliacao_status`) | high | Guarda `ca.user_id = auth.uid()` e 42501 (`20261008000001`, corpo); md5 vivo `91109b66…` = arquivo. A sonda com titular alheio deu 42501 |
| T-51-20 | Info Disclosure (`anon` executando) | high | `REVOKE ALL … FROM anon` (`20261008000001:184`). Vivo: `anon_x=false`, e `SET LOCAL ROLE anon` → `permission denied`. Operador confirmou (pergunta (f) do 51-16) |
| T-51-18 / T-51-24 | Info Disclosure (número do Raven) | high / medium | A chave `raven` só tem `liberado`/`registrado` (`EXISTS`), o corpo vivo não cita `percentil`, e o cliente aceita só `=== true` (`avaliacaoService.ts:314-315`) |
| T-51-28 | EoP (pedido de revisão alheio) | high | `IS DISTINCT FROM v_uid` antes de qualquer leitura de estado (`20261008000002:307-314`). A sonda com titular alheio deu 42501 e devolveu NULL no `estado_` |
| T-51-29 / T-51-39 | Repudiation (REVISAO-05) | high | `rejeitado_por = v_uid` → 42501 (`…0002:517-520`); `pode_responder = respondida_em IS NULL AND rejeitado_por IS DISTINCT FROM v_uid` (`…0003:328`). Vivo: 0 violações. Sessão real: o admin decisor ficou com o botão desabilitado |
| T-51-30 / T-51-38 | EoP (RH inativo, candidato, `anon`) | high | Papel com `coalesce`, `sub` obrigatório e `is_active_rh_user()` antes da busca em `responder`/`ler_contexto` (`…0002:496-505`, `…0003:466-472`). Na fila e na contagem o escopo exige o helper nos dois ramos (`…0003:300-303,336-339,415-429`). REVOKE nominal de `anon`. Vivo: as sondas `anon` e `candidato` dão 42501 |
| T-51-31 | Info Disclosure (tabela/RPCs) | high | `ENABLE RLS` e `REVOKE ALL … FROM PUBLIC, anon, authenticated` (`…0002:216-217`), REVOKE nominal de `anon` nas cinco funções e nos dois triggers (`…0002:365-367,457-459,623-625,741-746`). Vivo: ver «Estado vivo» |
| T-51-32 / T-51-53 | Info Disclosure (justificativa, UUID, opção ao titular) | high | Allowlist dentro do `jsonb_build_object` (`…0002:425-434,450-453`), sem `rejeitado_por`/`respondida_por`/`opcao_knockout_id`/ids/etapas. O cliente faz coerção por chaves exatas (`explicacaoService.ts:323-365`) |
| T-51-33 | Tampering (reabertura sem trilha) | high | `set_config('app.transicao_sancionada','reabertura')`, `etapa_atual` no SET, `GET DIAGNOSTICS` e reset depois dele (`…0002:562-578`). Vivo: 0 reabertas sem linha de histórico do revisor |
| T-51-37 | Info Disclosure (fila) | high | `RETURNS TABLE` vivo sem `justificativa` e sem UUID de funcionário (só nomes) |
| T-51-34 / T-51-40 / T-51-41 | Tampering | medium/low | `uq_revisao_rejeicao_historico` + `ON CONFLICT DO NOTHING`; mesmo predicado na fila e na contagem; marcação `alerta_prazo_enviado_em` depois do despacho (`…0003:906,955`) |

### Demais linhas, por plano (todas CLOSED)

| Threats | Componente | Evidência |
|---|---|---|
| T-51-01, 07, 10, 13, 17, 23, 27, 60, 68 | push / enumeração | 114/114 commits `(51…)` em `cd92cf42..origin/main`; push por sha; `p50_enumera.cjs` com «0 ALHEIO» registrado em cada SUMMARY; depois do pin só os 2 arquivos da allowlist do 51-17 (T-51-68) |
| T-51-02, 03 | navegação 51-01 | Constante única e guarda de rótulos (`rotulos-navegacao-candidato.grep.test.ts`). Resíduo informativo IN-04/IN-05 do `51-REVIEW` (cópia «pelo painel»; o guarda confere o rótulo e não o destino) |
| T-51-04, 56 | XSS | 0 `dangerouslySetInnerHTML` em `RespostaCasoAbertoSjt.tsx`, `ScorecardAvaliacao.tsx`, `ContextoKnockoutRevisao.tsx`, `features/revisao` e `features/explicacao`; testes com marcação literal (`ScorecardAvaliacao.test.tsx:150-154`, `ResponderRevisaoDialog.test.tsx:575-576`) |
| T-51-05 | Big Five no hub | Só «Concluído»/«Não fez» (`ScorecardAvaliacao.tsx:277-278,366`) e teste sem percentil |
| T-51-08 | «não se aplica» | `Aplicabilidade = 'aplica' \| 'nao_aplica' \| 'desconhecido'` (`instrumentosDaVaga.ts:57,108-112`) |
| T-51-11, 12 | notas obrigatórias | `notas.trim()` (`EntrevistaScorecardInline.tsx:115`) e teste só com espaço; o servidor continua recusando |
| T-51-15 | artefatos gerados | Os quatro `check:` deram OK nesta auditoria |
| T-51-16, 27 | deploy de EF | HEAD = pin e `--dry-run` no mesmo comando (SUMMARYs 51-05/07/16); nenhuma mudança em `supabase/functions` depois do pin `87be2703` |
| T-51-21, 22, 35, 36, 64 | ensaios / locks | `SET LOCAL lock_timeout '3s'`/`statement_timeout '5s'` em `p51_ensaio.cjs:119-120` e nas 5 migrations; `capturar()`/`PERSISTIU`; vivo: 0 fixture residual |
| T-51-25, 26, 48–51 | e-mail / EF | Convite do Raven só se `liberado && !registrado` e não encerrada (`RavenCandidatoCard.tsx:67`); a EF confere o Bearer do Vault (`notificar-candidato/index.ts:280-286`); `pedido_id` é validado como uuid antes de ler (`:331-334`) e a leitura é casada com `candidatura_id` (`:228-231`); link só por `montarUrlLogin` (`:682-689`); grep-guard de vocabulário (`email-templates.test.ts:77,160,342`) |
| T-51-42 | desfazer da P50 | `OBSOLETO` em `scripts/p50_desfazer.cjs:49-74` e no cabeçalho da 0003 |
| T-51-43, 44, 45, 72, 73, 74 | motor de exclusão | Passo novo `CASE WHEN r.resultado IS NULL THEN NULL` (corpo vivo = arquivo 0004); o PRE-PORTAO exige `dry_run` (`…0004:138-140`), e o vivo está em `dry_run`; pins `a68e4a6a…`/`0a4996fe…` no `p45_motor_exclusao_smoke.sql` iguais ao vivo; (B25) no smoke; `p46_purga_smoke` verde pelo ensaio (51-16) |
| T-51-46 | export | `revisao_rejeicao.rejeitado_por`/`respondida_por`/`opcao_knockout_id` com `export: false` e razão (`export-scope-rules.yaml:1251-1274`; `exportAllowlist.ts:1169-1171`). **Ressalva** (WINDOWS 92, decisão do operador): o mesmo UUID da opção chega ao titular por `candidaturas.opcao_knockout_id` (`export: true` desde a P44, veredito deliberado «o motivo do desfecho é o que o Art. 20 manda explicar»). Não é mitigação ausente; é uma regra «nunca ao candidato» cuja fonte não foi localizada |
| T-51-52, 55, 57 | cliente da explicação / fila | Origem vinda do servidor; `FILA_REVISAO_COLUNAS` com 13 chaves, sem `justificativa` (`revisaoService.ts:160`); roteamento por origem (`:358-372`), e o servidor recusa pedido inexistente (P0002) |
| T-51-58, 59, 61, 62, 63, 69, 70, 71 | portão / publicação | `p51_portao.cjs` (68/68 no auto-teste) no mesmo comando de cada apply/deploy/push, com leitura do ledger (8); reviews -1/-2/-3 com `critical: 0`; ordem EF → push com horários (51-16); A5 = 0 nas duas medições; mordida com controle (51-15) |
| T-51-65, 66, 67 | aceite 51-17 | O formatador só imprime ids/booleanos/contagens e o auto-teste está ok (resíduo IN-01: um uuid pseudônimo no caminho de erro de uma ferramenta local); `database.types.ts` com 223 315 octetos e as marcas novas; as 3 candidaturas do aceite pertencem a aliases do operador (conferido por booleano, sem expor o endereço) |
| T-51-SC (17 linhas) | supply chain | Nenhuma mudança em `package.json`/locks/`deno.json` em `cd92cf42..origin/main`; só built-ins do Node (`crypto`, `fs`, `os`, `path`, `child_process`) |

---

## Accepted Risks Log

| ID | Threat | Sev. | Risco aceito | Premissa conferida nesta auditoria |
|---|---|---|---|---|
| AR-51-01 | T-51-06 | low | O RH lê o texto do caso aberto do titular pela RPC já revisada no 49-44/P50 | `ler_resposta_caso_aberto_sjt`: `anon_x=false`, papel com `coalesce` e `is_active_rh_user()` no corpo vivo |
| AR-51-02 | T-51-09 | low | `vagas.testes_aplicaveis` entra no select do contexto do hub | É configuração da vaga, não dado de titular. Nenhuma migration p51 toca policy de `vagas` |
| AR-51-03 | T-51-54 | low | O cliente espelha a elegibilidade do pedido | O servidor decide. Ao vivo, titular alheio → 42501 em `solicitar_revisao_rejeicao` e NULL em `estado_revisao_rejeicao` |

Decisões do operador fora do registro, já tomadas (de `51-16-SUMMARY.md`): WR-05 do review -1 (`knockout_rate`) foi
aceito sem conserto; IN-01 e IN-04 do review -2 foram aceitos. Nenhuma delas é ameaça de segurança do registro.

---

## Unregistered Flags (WARNING, não contam para `threats_open`)

| # | Origem | Superfície | Sev. estimada | Mapeamento |
|---|---|---|---|---|
| **UF-1** | WR-01 do `51-REVIEW-PORTAO-3` | **O decisor revertido rejeita de novo por PATCH direto em `candidaturas`.** A policy `rh_avanca_etapa` (UPDATE, `authenticated`, admin ou `rh` ativo) e o privilégio de UPDATE de `authenticated` continuam vivos. A `guard_rejeicao_auditada` viva (md5 `dc695aa4…`) aceita a entrada em `rejeitado` quando o mesmo UPDATE muda a etapa, e `rejeitar_candidatura` não declara `app.rejeicao_sancionada`. Isso contorna o D-23 da 0005 e também a justificativa de 50 caracteres ou mais e o motivo. Provado por execução no review -3 (ensaio que aborta). Ao vivo: 0 ocorrências. A UI não oferece o caminho | medium (EoP interno, com JWT de RH válido; sem vazamento; o titular pode pedir revisão de novo) | **Nenhum T-ID.** A trava D-23 (`20261008000005`) entrou pelas rodadas de review do 51-16 sem linha no registro, então o furo dela não mapeia ameaça existente. Não mapeia T-51-29 (é sobre responder a revisão) nem T-51-33 (a re-rejeição por PATCH grava trilha com o ator). A classe existe desde a P48 para a fonte `decisao_final`. **Recomendação:** registrar como ameaça própria (EoP, medium) e decidir entre mitigar num plano com review (`guard_rejeicao_auditada` exige a sanção para `auth.uid()` não nulo, e `rejeitar_candidatura` a declara) ou aceitar com uma entrada AR |
| UF-2 | IN-16 do `51-REVIEW-PORTAO-1` | `solicitar_revisao_decisao(uuid)` ainda tem EXECUTE para `anon` (vivo `anon=true`, herança do `pg_default_acl`) | low | Fora do T-51-31: a função é anterior à fase, e todas as RPCs **novas** estão sem `anon`. Inofensivo hoje: sob `SET LOCAL ROLE anon` o corpo vivo recusa com 42501 (`ca.user_id = auth.uid()` com uid nulo). Destoa da regra nominal; `REVOKE` numa migration futura |
| UF-3 | WR-01 do `51-REVIEW` (fase) | Depois de «Prova registrada», a lista abre do cache e permite refazer a prova cognitiva. `pontuar_cognitivo` faz `ON CONFLICT … DO UPDATE` e **sobrescreve a banda** que o RH vê (vivo: upsert = true, bloqueia reenvio = false) | medium (integridade da avaliação, pelo próprio candidato) | Nenhum T-ID. O 51-01 tornou o caminho padrão; o defeito do servidor é anterior. Disposição `open` |
| UF-4 | WR-02 do `51-REVIEW-PORTAO-3` | O filtro `h.decisao = 'rejeitado'` do ramo arquivo do D-23 em `rejeitar_candidatura` não tem mutação nem sonda; uma edição futura que o tire passa verde e trava RH legítimo | low | É qualidade do portão do D-23, que também não tem registro (ver UF-1) |
| UF-5 | IN-14 do `51-REVIEW-PORTAO-1` | A resposta `revertida` não confere exclusão ou anonimização do titular: reabre e despacha a análise de IA (D-36) sobre titular excluído | low | Nenhum T-ID. Não corrigido. O efeito é limitado ao dado já anonimizado, mas é processamento depois do pedido de exclusão |

---

## Security Audit Trail

| Data | Evento | Resultado |
|---|---|---|
| 2026-10-09 | Reviews adversariais bloqueantes -1/-2/-3 da Onda B (0 critical em cada); mutações 44/44 mordem contra os objetos vivos (51-16) | evidência reaproveitada |
| 2026-10-09 | Apply 0002..0005, EFs v19/v8/v14, push `ad2790a3..87be2703` (51-16) | ledger = arquivos |
| 2026-10-10 | Sessão real (51-17): D-23 recusou o decisor revertido pela RPC | 6 fases N/N na `8e4bb7a0` |
| 2026-10-10 | Esta auditoria: registro de 91 linhas, conferência viva só leitura, `check:` e auto-testes locais | **OPEN_THREATS: threats_open = 1 (T-51-14)** |

Observação de concorrência: durante a auditoria apareceram commits locais de outra sessão. São `test(51-validacao)`
×3 (só testes) e `docs(51)` da verificação, nenhum empurrado. Não mudam nenhuma superfície auditada.
