---
phase: 51-consertos-da-jornada-bloco-3
plan: 11
subsystem: notifications
tags: [jorn-42, art-20, d-09, notificar-candidato, email-templates, revisao-rejeicao, knockout, retry, deno-test, tracer, onda-b]
status: complete

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-08: public.revisao_rejeicao + trg_notif_revisao_rejeicao_respondida, que manda {evento:'revisao_respondida', candidatura_id, ciclo, pedido_id} (migration 20261008000002, NAO aplicada)"
  - phase: 48
    provides: "48-08 (historico_id/ciclo no corpo, dedupe por ciclo, extrairVersaoDaChave no retry), 48-13 (prazo da reabertura no e-mail), 48-16 (montarUrlLogin + blocoAcessoPainel)"
provides:
  - "notificar-candidato: campo de corpo pedido_id (uuid validado antes de qualquer leitura/claim; null = ausente)"
  - "lerVereditoRevisao(candidatura_id, ciclo, pedido_id): pedido_id -> revisao_rejeicao por id+candidatura_id; sem pedido_id, com ciclo -> pedido cujo epoch ARREDONDADO de solicitada_em casa; senao decisao_final (byte-igual)"
  - "cicloDoInstante(instante) exportada: o mesmo valor de extract(epoch from ts)::bigint::text (Math.round)"
  - "retry de revisao_respondida deriva o ciclo da dedupe_key da linha"
  - "_shared/email-templates.ts: COPY_DIREITO_REVISAO + DadosEmail.urlExplicacao + blocoDireitoRevisao, so na rejeicao"
  - "notificar-candidato: urlExplicacao = montarUrlLogin(appBaseUrl, '/candidato/explicacao/<id>') so em evento decisao com desfecho calculado rejeitado"
  - "ref local refs/gsd/51-11/base = 83c3407d"
affects: [51-16]

actuals:
  tokens: 11500        # chars/4 sobre o diff realizado 83c3407d..6d85d3c3 (46026 octetos)
  tasks: 2
  commits: 2           # MEDIDO: git rev-list --count 83c3407d..HEAD antes do commit deste SUMMARY
plan_head_before: 83c3407d848a25c2257a1da8af33a92e2496e9a3
plan_head_after: 6d85d3c33d3e3accc484a4dd30fca7e5d9b0a032

tech-stack:
  added: []
  patterns:
    - "Fonte do veredito resolvida por identidade explicita (pedido_id) -> identidade do ciclo (epoch) -> fonte legada; erro de leitura ou id nao achado = NEUTRO, nunca a fonte legada (que seria o veredito de outro ciclo)"
    - "Epoch de timestamptz em JS casado com o do PG por Math.round, nao Math.floor (numeric -> bigint arredonda)"
    - "Mock por tabela que APLICA os filtros .eq (revisao_rejeicao) e e thenable para leituras de lista — o teste de pedido de outra candidatura so morde se o filtro existir"
    - "Teste de template com o texto LITERAL (nao so a constante importada), para morder tambem contra a base onde a constante nao existe; constante conferida por import * as + cast"

key-files:
  created: []
  modified:
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
    - supabase/functions/_shared/email-templates.ts
    - supabase/functions/_shared/__tests__/email-templates.test.ts

key-decisions:
  - "cicloDoInstante usa Math.round, nao o Math.floor do plano: extract(epoch)::bigint ARREDONDA no PG 17.6 (medido em PROD, leitura pura: .6 -> +1, .5 -> +1, .4999 -> +0); com floor, todo pedido com fracao >= .5 s ficaria invisivel ao retry"
  - "pedido_id presente mas nao achado (ou de outra candidatura), e erro de leitura de revisao_rejeicao: frase NEUTRA, sem cair em decisao_final — o corpo disse qual pedido e; qualquer outra fonte seria o veredito de outro ciclo (proibicao JORN-42 transparency)"
  - "urlExplicacao so e montada para evento === 'decisao' (alem de desfecho rejeitado): o desfecho default e 'rejeitado' para todos os eventos, e so corpoDecisao le o campo"
  - "COPY_DIREITO_REVISAO = o revisionIntro de ExplicacaoCandidatoPage.tsx, literal; um teste le o .tsx e falha se a pagina mudar o texto"
  - "requirements-completed vazio: JORN-42 e compartilhado na fase (requirements.ready-ids = 0/1); fecha no 51-16"

requirements-completed: []

coverage:
  - id: D1
    description: "A resposta a um pedido de revisao de triagem/knockout le veredito e prazo do PROPRIO pedido (pedido_id), nunca de decisao_final; pedido de outra candidatura/inexistente/erro de leitura = neutro"
    requirement: JORN-42
    verification:
      - kind: unit
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts#51-11 — pedido_id: pedido REVERTIDA / MANTIDA / de OUTRA candidatura / falha na leitura"
        status: pass
    human_judgment: false
  - id: D2
    description: "Sem pedido_id, com ciclo (inclusive o retry, ciclo da dedupe_key): acha o pedido pelo epoch arredondado de solicitada_em; sem pedido do ciclo, decisao_final como hoje"
    requirement: JORN-42
    verification:
      - kind: unit
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts#51-11 — sem pedido_id, com ciclo / RETRY / LEGADO (dois casos); mutacao Math.floor -> 3 vermelhos"
        status: pass
    human_judgment: false
  - id: D3
    description: "Validacao do corpo: pedido_id nao-uuid -> 400 VALIDATION antes de qualquer leitura/claim; null = ausente; dedupe inalterada; outros eventos sem consulta nova"
    requirement: JORN-42
    verification:
      - kind: unit
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts#51-11 — pedido_id nao-uuid / os OUTROS eventos"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-09: e-mail de rejeicao (RH e knockout) diz o direito de pedir revisao e leva a /candidato/explicacao/<id> via montarUrlLogin; COPY_REJEICAO intacta; aprovado byte-igual; grep-guard de vocabulario verde"
    requirement: JORN-42
    verification:
      - kind: unit
        ref: "supabase/functions/_shared/__tests__/email-templates.test.ts#51-11 · D-09 (6 casos)"
        status: pass
      - kind: unit
        ref: "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts#51-11 · D-09 (5 casos)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Leitura humana do e-mail de rejeicao com o paragrafo novo (tom, posicao do botao, coerencia com a pagina de explicacao) e o efeito sobre reenvios de rejeicoes antigas (A5)"
    requirement: JORN-42
    verification: []
    human_judgment: true
    rationale: "Redacao e aparencia do e-mail entregue sao julgamento do operador; o efeito sobre linhas 'falhou' de evento decisao depende da medicao A5 do portao 51-16, antes do deploy"

duration: 15min
completed: 2026-10-09
---

# Phase 51 Plan 11: notificar-candidato le o veredito do proprio pedido e o e-mail de rejeicao anuncia o direito de revisao (D-09) Summary

**A EF `notificar-candidato` resolve o veredito de `revisao_respondida` por `pedido_id` -> ciclo (epoch arredondado, como o PG) -> `decisao_final`. Todo e-mail de rejeição passa a carregar o parágrafo do direito de revisão (LGPD, Art. 20) e um botão para `/candidato/explicacao/<id>`, montado por `montarUrlLogin`. Testado (128/128 deno, 15 casos que mordem a base) e NADA publicado.**

## Performance

- **Duração:** ~15 min (2026-10-09T06:03Z – 06:15Z)
- **Tasks:** 2/2 (Task 1 tracer, Task 2 auto; ambas tdd)
- **Arquivos modificados:** 4

## Accomplishments

- **Tracer (JORN-42, armadilha 2):** `lerVereditoRevisao` com três fontes em ordem. Um pedido de revisão de triagem ou de knockout nunca mais recebe a frase neutra por falta de linha em `decisao_final`, nem o veredito de outro ciclo.
- **Retry coberto:** a varredura só manda `retry_id`. O ciclo agora sai da `dedupe_key` (`{cand}:revisao_respondida:{ciclo}`) e o pedido é achado pelo epoch de `solicitada_em`.
- **D-09:** `COPY_DIREITO_REVISAO` (o mesmo texto da página) entra depois da `COPY_REJEICAO` congelada, que não mudou. Com URL vêm o botão «Ver a explicação e pedir revisão» e o link por extenso; sem URL vai só o texto, nunca `href` vazio. O aprovado sai byte-igual.

## Task Commits

1. **Task 1 (tracer): a resposta de revisão lê o veredito do próprio pedido.** `8f1b94af` (feat)
2. **Task 2: D-09 no e-mail de rejeição.** `6d85d3c3` (feat)

Cada commit traz teste e implementação juntos, como o `<action>` do plano manda. O RED foi executado e registrado antes de cada GREEN, mas não foi commitado à parte.

## TDD / evidência de mordida

| Momento | Comando | Resultado |
|---|---|---|
| Baseline (base 83c3407d) | `deno test --allow-all supabase/functions/notificar-candidato/` | 64 passed |
| Task 1 RED | idem, com os 10 casos novos | **7 FAILED**, 3 ok (guardas de regressão do legado e dos outros eventos) |
| Task 1 GREEN | idem | 74 passed / 0 failed |
| Tracer gate (end-of-phase, `<verify>` só automated) | re-run do `<verify>` | 74/74, expansão liberada |
| Task 2 RED (template) | `deno test … email-templates.test.ts` | **5 FAILED** / 44 passed (o caso do aprovado é guarda) |
| Task 2 RED (EF) | `deno test … notificar-candidato/` | **3 FAILED** / 76 passed (aprovado e outros eventos são guardas) |
| Task 2 GREEN (= `<verify>` do plano) | `deno test --allow-all supabase/functions/_shared/__tests__/email-templates.test.ts supabase/functions/notificar-candidato/` | **128 passed / 0 failed** |
| Mordida contra a base | worktree descartável em `refs/gsd/51-11/base` com os 2 arquivos de teste do HEAD (+ symlink de `node_modules` para o `@types/node`) | deno exit 1, **FAILED, 113 passed / 15 failed**. Os 15 vermelhos são todos casos 51-11 de comportamento; os 5 ok são as guardas (aprovado ×2, outros eventos ×2, legado ×2 menos um que só existe na EF). Worktree removido. |
| Mutação do desvio | `Math.round` -> `Math.floor` em `cicloDoInstante` | **3 FAILED** («ciclo ARREDONDADO», «RETRY», «pedido_id null ⇒ ausente»); restaurado: 128/128 |

`COPY_REJEICAO` intacta, conferida por `git diff refs/gsd/51-11/base -- supabase/functions/_shared/email-templates.ts`. Nenhuma linha da constante muda. A única linha removida é `<p …>${escapeHtml(copy)}</p>`, que passou a terminar em `${direito}` (string vazia no aprovado).

Critérios de aceitação:

| Critério | Medido | Exigido |
|---|---|---|
| `grep -c revisao_rejeicao index.ts` | 7 | ≥ 2 |
| `grep -c pedido_id index.ts` | 13 | ≥ 3 |
| `grep -c COPY_DIREITO_REVISAO email-templates.ts` | 2 | ≥ 2 |
| `grep -c candidato/explicacao index.ts` | 1 | ≥ 1 |

Guardas vizinhos: `npx vitest run src/__tests__/copyPortoesLgpd.test.ts src/__tests__/guards/` deu 143/143. `deno check` passa nos dois arquivos de produção. O hook de commit mediu `tsc errors: 89` (limite D-53: ≤ 89).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] O epoch do ciclo é ARREDONDADO, não truncado**
- **Encontrado durante:** Task 1, antes do RED.
- **Problema:** o `<action>` mandava casar o pedido por `Math.floor(Date.parse(solicitada_em) / 1000)`. O trigger manda `extract(epoch from NEW.solicitada_em)::bigint::text`, e no PG ≥ 14 `extract` é `numeric`, cujo cast para `bigint` arredonda. Medido em PROD (PostgreSQL 17.6, `set transaction read only`): `…56.6` dá `…897`, `…56.5` dá `…897`, `…56.4999` dá `…896`, e `pg_typeof` = `numeric`. Com `floor`, cerca de metade dos pedidos ficaria invisível ao retry, e o e-mail cairia em `decisao_final`.
- **Conserto:** `cicloDoInstante` usa `Math.round(ms / 1000)`. O `Date.parse` trunca µs em ms, e isso preserva o lado do arredondamento. A fixture tem fração `.6` (epoch conferido no PG: 1790856001).
- **Arquivos:** `supabase/functions/notificar-candidato/index.ts`
- **Verificação:** a mutação para `floor` deixa 3 casos vermelhos.
- **Commit:** `8f1b94af`

**2. [Rule 2 - Missing critical] Sem plano B para `decisao_final` quando o pedido não é achado ou a leitura falha**
- **Encontrado durante:** Task 1.
- **Problema:** o `<action>` diz «senão, se há `ciclo`… senão, `decisao_final`» e não trata o `pedido_id` que não acha linha, nem o `error` da leitura. Cair em `decisao_final` nesses casos violaria a proibição JORN-42 (transparency: «never another cycle's verdict»).
- **Conserto:** com `pedido_id`, se não acha (outra candidatura ou inexistente) ou dá erro, a frase sai neutra. Com `ciclo`, erro de leitura também dá neutro. Só a ausência de pedido do ciclo leva a `decisao_final`.
- **Verificação:** os casos «pedido_id de OUTRA candidatura (ou inexistente)» e «falha na leitura» asseguram que `decisao_final` não é lida.
- **Commit:** `8f1b94af`

**3. [Rule 2 - escopo] `urlExplicacao` só no evento `decisao`**
- O `<action>` dizia «quando o desfecho calculado é rejeitado». Só que esse desfecho é `rejeitado` por default em TODOS os eventos, então a guarda `evento === "decisao"` evita montar uma URL que nenhum outro corpo lê.
- Teste «os outros eventos não ganham o link». Commit `6d85d3c3`.

**Total:** 3 auto-fixed (1 Rule 1, 2 Rule 2). **Impacto:** nenhum desvio de escopo. Os três estreitam o comportamento na direção das proibições do plano.

## Nada publicado (regra 7 do orquestrador / proibição prod-safety)

- **Nenhum** apply, `migrate`, deploy de EF nem `git push`.
- Toques em PROD, **só leitura** via `node p46apply.cjs sql` com `set transaction read only`:
  1. A sonda do arredondamento de `extract(epoch)::bigint`, junto com `version()`.
  2. A conferência dos epochs das fixtures.
  3. O ledger, lido no início e no fim.
- **Ledger:** `max(version)` = **`20261008000001`**, no início e no fim (6 versões `202610%`).
- `git log --oneline origin/main..HEAD` = 18 commits à frente. É o esperado na onda B: o push é do portão 51-16.
- **Sequência com dono (D-55):** `notificar-candidato` vai ao ar no 51-16, DEPOIS do apply da `0002` (ela lê `revisao_rejeicao`) e ANTES do cliente. Antes do deploy, a medição A5 (`notificacoes_enviadas` com `status='falhou'` e `evento='decisao'`) decide o que fazer: um reenvio da varredura renderizaria o parágrafo novo numa rejeição antiga. As duas etapas estão nas truths do 51-16-PLAN.

## Issues Encountered

- `supabase/functions/_shared/__tests__/strict-schema.test.ts` falha sob `deno test` com `ReferenceError: __dirname`. É arquivo Vitest, pré-existente (último toque na fase 42) e excluído por convenção dos verifies (`grep -v strict-schema`, ver WINDOWS #46). Fora de escopo, sem entrada nova.
- O worktree descartável precisou de symlink de `node_modules`: o Deno resolve `@types/node` pelo `package.json` da raiz.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>`:
- T-51-49: `pedido_id` validado como uuid antes de tudo, e leitura casada com `candidatura_id`.
- T-51-50: o link só sai por `montarUrlLogin`; base hostil cai no default, testado.
- T-51-51: grep-guard verde sobre o render completo da rejeição.
- T-51-SC: nenhuma instalação.

## Next Phase Readiness

Pronto para o portão 51-16:
1. Apply da `0002`.
2. Medição A5 e a decisão (c).
3. Deploy de `notificar-candidato` por `efdeploy.cjs` + `p51_portao.cjs --modo deploy`.
4. Push do cliente.

Ponto para o operador conferir no review do portão: uma rejeição pelo RH registrada sem ator no histórico. O pedido falha com P0002 (ASSUMPTION da `0002`, nunca medida), e mesmo assim o e-mail diria «Você pode pedir». A página de explicação é quem informa a recusa.

## Self-Check: PASSED

- FOUND: os 4 arquivos de `key-files.modified`.
- FOUND: os commits `8f1b94af` e `6d85d3c3`, ancestrais de HEAD.
- `deno test` do `<verify>` re-executado depois do último commit: 128 passed / 0 failed.
- Ledger PROD `max(version)` = `20261008000001`.
