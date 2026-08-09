---
phase: 47-transpar-ncia-consolida-o
plan: 01
subsystem: infra
tags: [compliance, lgpd, codegen, js-yaml, ci, github-actions, vitest, retencao]

requires:
  - phase: 43-retencao-configuravel
    provides: "public.config_retencao_etapa — a matriz de retenção por etapa (RETEN-01), editável em produção pela RPC salvar_janela_retencao"
  - phase: 45-motor-de-exclusao
    provides: "gen-recibo-exclusao.cjs — o molde do gerador com --check que reprova nas duas direções, e o teste de portão por mutação de fonte"
  - phase: 44-export-allowlist
    provides: "o precedente WR-08: o check: de artefato invocado no job unit do ci.yml"
  - phase: 42-inventario-pii
    provides: "gen-pii-md.cjs — o quarto gerador, que já implementava --check e nunca teve script"
provides:
  - "docs/compliance/matriz-retencao.yaml — a fonte autorada, versionada e DATADA da matriz de retenção, com as janelas MEDIDAS em produção"
  - "docs/compliance/sql/gen-matriz-retencao.cjs — gerador sem rede e sem banco, com --check que reprova nas duas direções e confere cada artefato separadamente"
  - "src/features/transparencia/constants/matrizRetencao.generated.ts — o consumidor do Bloco 1 de /privacidade (47-06)"
  - "docs/compliance/matriz-retencao.json — o artefato de auditoria"
  - "os quatro portões check:* efetivamente invocados no job unit do ci.yml"
  - "docs/compliance/__tests__/portoesInvocados.test.ts — o detector que reprova o próximo portão órfão, nomeando-o"
affects: [47-06-privacidade, 47-09-consol-04, 47-03-pii-inventory]

actuals:
  tokens: 17470
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Artefato derivado de fonte AUTORADA e DATADA quando o dado vivo é editável em runtime — a data de medição é a ponte honesta, e o carimbo público de vigência é ela, nunca a data do build"
    - "Extração de rótulos e ordem lendo o módulo TypeScript do funil como TEXTO, com âncora `\\s*:` no nome do export — uma fonte de rótulos só no repositório"
    - "Detector anti-portão-órfão: todo script check:* invocado num workflow OU numa lista versionada de exceções com razão escrita, com os comentários do workflow removidos antes da busca"

key-files:
  created:
    - docs/compliance/matriz-retencao.yaml
    - docs/compliance/sql/gen-matriz-retencao.cjs
    - docs/compliance/matriz-retencao.json
    - src/features/transparencia/constants/matrizRetencao.generated.ts
    - docs/compliance/__tests__/genMatrizRetencao.test.ts
    - docs/compliance/__tests__/portoesInvocados.test.ts
  modified:
    - package.json
    - .github/workflows/ci.yml

key-decisions:
  - "A janela de `rejeitado` publicada é 18 (o valor VIGENTE medido em PROD), não 24 (o valor do seed) — o Pitfall 8 do plano estava vivo, não hipotético"
  - "`meta.metodo` declara a medição por execute_sql do MCP feita pelo orquestrador; o gerador não abre conexão, não lê credencial e não usa MCP"
  - "A projeção é mínima e o vocabulário de campos da fonte é FECHADO: `origem`, `alterado_por` e `atualizado_em` reprovam a geração nomeando o campo"
  - "O determinismo é asserido com `gerado_em` neutralizado — asserção byte-a-byte COM o carimbo passaria só pela sorte do milissegundo"
  - "`check:resend-dominio` fica fora do CI como exceção DECLARADA com razão escrita (T-36-03-03), não como omissão"

patterns-established:
  - "Fonte medida + datada: quando o dado vivo é editável em produção e o repositório não tem como observá-lo em build-time, a fonte é autorada com `medido_em` + `metodo`, e o gate reprova quando o carimbo falta"
  - "Gate provado por execução do binário em árvore temporária, com mutação ESTRUTURAL do YAML (robusta a revisão de copy) e mutação TEXTUAL do código (com `patch()` que exige casamento único)"
  - "Guard que busca string num workflow remove os comentários primeiro — a menção em prosa nunca conta como invocação"

requirements-completed: [TRANSP-02]

coverage:
  - id: D1
    description: "A matriz de retenção existe como dado derivado: fonte YAML datada, gerador sem rede/banco, e os dois artefatos gerados na ordem do funil"
    requirement: TRANSP-02
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genMatrizRetencao.test.ts#(1)..(7) — existência, sem cliente de banco, carimbo medido, ordem de funil, campos não-vazios, projeção mínima, cabeçalho de gerado"
        status: pass
      - kind: other
        ref: "node docs/compliance/sql/gen-matriz-retencao.cjs && node docs/compliance/sql/gen-matriz-retencao.cjs --check → exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "O --check reprova nas DUAS direções, confere cada artefato separadamente e trata ausência como divergência"
    requirement: TRANSP-02
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genMatrizRetencao.test.ts#(19)..(22) — determinismo, espelho apagado, espelho editado com .json intacto, fonte suja"
        status: pass
    human_judgment: false
  - id: D3
    description: "Os dez portões de geração reprovam ALTO, nomeando o item que falhou, provados por execução do binário em árvore temporária"
    requirement: TRANSP-02
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genMatrizRetencao.test.ts#(9)..(18)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Os quatro portões check:* de artefato estão invocados no job unit do ci.yml, com a única exceção declarada e com razão"
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/portoesInvocados.test.ts#(1)..(7)"
        status: pass
      - kind: other
        ref: "npm run -s check:matriz-retencao && check:pii-inventory-md && check:recibo-exclusao && check:export-allowlist → todos exit 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "A copy de finalidade e base legal das 8 etapas — o texto jurídico que o candidato lerá em /privacidade"
    requirement: TRANSP-02
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genMatrizRetencao.test.ts#(16) — o gerador reprova termo banido pela 47-UI-SPEC §Bans"
        status: pass
    human_judgment: true
    rationale: "`finalidade` e `base_legal` são fato jurídico AUTORADO — não existem em config_retencao_etapa e não há de onde derivá-los. O gate garante que existam e que não usem vocabulário banido; NÃO garante que a citação do artigo esteja juridicamente correta. É exatamente o item da revisão do Encarregado que o 47-CONTEXT §Área 5 declara como gate de PUBLICAÇÃO."

duration: 12min
completed: 2026-08-09
status: complete
---

# Phase 47 Plan 01: A matriz de retenção como dado derivado com portão

**A matriz de retenção passa a existir como dado derivado, datado e regenerável — fonte YAML medida em produção, gerador sem rede nem banco, dois artefatos determinísticos sob um `--check` que reprova nas duas direções — e os quatro geradores de compliance do repositório deixam de se declarar autoridade sem que ninguém os execute.**

## Proveniência da medição (Task 0 — checkpoint do orquestrador)

⚠ Registrado **verbatim**, antes de qualquer arquivo ter sido escrito. Sem este registro o
`meta.medido_em` da fonte seria uma afirmação sem lastro.

Query executada pelo orquestrador via Supabase MCP `execute_sql`:

```sql
SELECT etapa, janela_meses, origem, atualizado_em
  FROM public.config_retencao_etapa
 ORDER BY etapa;
```

| etapa | janela_meses | origem | atualizado_em |
|---|---|---|---|
| aprovado | 24 | seed | 2026-08-02 14:03:51.054131-03 |
| avaliacao_assincrona | 24 | seed | 2026-08-02 14:03:51.054131-03 |
| decisao_final | 24 | seed | 2026-08-02 14:03:51.054131-03 |
| entrevista_online | 24 | seed | 2026-08-02 14:03:51.054131-03 |
| entrevista_presencial | 24 | seed | 2026-08-02 14:03:51.054131-03 |
| inscricao | 24 | seed | 2026-08-02 14:03:51.054131-03 |
| **rejeitado** | **18** | **admin** | **2026-08-03 01:46:26.345031-03** |
| triagem | 24 | seed | 2026-08-02 14:03:51.054131-03 |

**Data da medição (`meta.medido_em`): 2026-08-09.**

### O Pitfall 8 estava VIVO, não hipotético

`rejeitado` carrega `origem = 'admin'` e **18** meses: a janela vigente **já divergiu** do seed de
24. A fonte YAML carrega **18** para `rejeitado`. Publicar o valor do seed teria posto uma política
de retenção falsa numa página pública de compliance no primeiro dia — que é precisamente o cenário
que a §C2.2 da pesquisa chama de "a armadilha" da opção (b).

### Dois fatos de schema medidos junto, que corrigem uma premissa do plano

1. **A tabela NÃO tem coluna `base_legal`.** As colunas medidas são `etapa`, `janela_meses`,
   `origem`, `alterado_por`, `atualizado_em`. Logo `finalidade` **e** `base_legal` são os DOIS
   fatos jurídicos **autorados** na fonte YAML — nenhum dos dois vem da tabela. O que o gerador
   garante é que nenhuma etapa chegue à página pública sem os dois escritos e não-vazios; ele não
   garante (e não pode) a correção jurídica da citação. Essa é a revisão do Encarregado.
2. **`etapa` é um tipo enum USER-DEFINED**, exigindo `::text` para ordenação/cast em SQL. Irrelevante
   para o gerador (que não fala com o banco) e registrado aqui para quem re-medir.

## Performance

- **Duração:** ~12 min
- **Iniciado:** 2026-08-09T18:26Z
- **Concluído:** 2026-08-09T18:38Z
- **Tarefas:** 3 (mais a Task 0, satisfeita pelo orquestrador)
- **Arquivos criados/modificados:** 8

## Accomplishments

- **A metade "dado" do TRANSP-02 existe.** `matrizRetencao.generated.ts` já está no repositório, com
  as 8 fichas na ordem do funil, prontas para o Bloco 1 de `/privacidade` (47-06). Nenhuma janela é
  digitada dentro de um componente.
- **A fonte é medida e datada, e o carimbo público de vigência é a data da medição.** É a única
  ponte honesta entre um artefato de build-time e uma matriz que um administrador edita em runtime —
  e a medição já provou seu valor: `rejeitado` valia 18, não 24.
- **O `--check` reprova nas duas direções**, confere `.json` e espelho `.ts` **separadamente**, pina
  `gerado_em` do disco (sem o pin o gate divergiria pelo relógio e nunca sairia 0), e trata ausência
  de artefato como **divergência**, nunca como erro de I/O. As quatro propriedades estão provadas por
  execução do binário.
- **Os quatro geradores de compliance passam a ter portão de verdade.** Antes deste plano o `ci.yml`
  invocava UM `check:` e o `.husky/pre-commit` invocava ZERO. `check:recibo-exclusao` era órfão desde
  a 45-02 e `gen-pii-md.cjs` nunca teve script. Agora os quatro rodam no job `unit`, e
  `portoesInvocados.test.ts` reprova o próximo que nascer órfão — **nomeando-o**.
- **A única exceção é declarada com razão escrita.** `check:resend-dominio` fica fora por decisão da
  Phase 36 (reporter opt-in, proibido em CI por docblock — ligá-lo forçaria credencial viva para
  dentro do GitHub Secrets, ameaça T-36-03-03). O teste reprova exceção sem razão.

## Task Commits

Cada tarefa foi commitada atomicamente, com o hook de pre-commit rodando — **zero `--no-verify`**.

1. **Task 1 (tracer, TDD): a fonte, o gerador e os dois artefatos**
   - `6be8bd7` (test) — RED: 8/8 falhando, o contrato da matriz sem gerador nenhum
   - `213ef38` (feat) — GREEN: YAML + gerador + `.json` + `.generated.ts`
2. **Task 2 (TDD): os testes de portão do gerador**
   - `c41c50a` (test) — RED em (17) e (18): a extração do funil aceitava um export renomeado
   - `c5ddaeb` (fix) — GREEN: âncora `\s*:` no nome do export
3. **Task 3 (TDD): os portões invocados e o detector anti-órfão**
   - `38450dd` (test) — RED em (1), (4) e (5): órfão vivo, portões fora do job `unit`
   - `c0fd52d` (feat) — GREEN: dois scripts novos + as três invocações no `ci.yml`

**Metadados do plano:** commit `docs(47-01)` final.

## Files Created/Modified

- `docs/compliance/matriz-retencao.yaml` — a fonte autorada, versionada e datada. Bloco `meta` com
  `medido_em`, `metodo`, `fonte` e a nota de divergência do seed; bloco `etapas` com uma chave por
  valor do enum `etapa_processo`, cada uma com `janela_meses` (medido), `finalidade` e `base_legal`.
- `docs/compliance/sql/gen-matriz-retencao.cjs` — o gerador. `fs`, `path` e `js-yaml` com `safeLoad`;
  zero cliente de banco. Lê `triagemService.ts` como texto para extrair `ETAPA_M2_LABELS` e
  `ETAPA_M2_OPTIONS`. Sete travas, cada uma matando a geração e NOMEANDO o item.
- `docs/compliance/matriz-retencao.json` — artefato de auditoria (serialização determinística).
- `src/features/transparencia/constants/matrizRetencao.generated.ts` — o consumidor da página, com
  cabeçalho `ARQUIVO GERADO`, a proibição de edição à mão, a nota da conferência separada e a linha
  de regeneração. Exporta `MATRIZ_RETENCAO as const` e o tipo `EtapaRetencao`.
- `docs/compliance/__tests__/genMatrizRetencao.test.ts` — 22 casos: 8 de contrato do artefato real,
  10 de portão de geração por mutação, 4 do modo `--check`. **Zero snapshots.**
- `docs/compliance/__tests__/portoesInvocados.test.ts` — 7 casos, incluindo os dois sintéticos que
  provam que o detector morde (órfão nomeado; exceção sem razão detectada).
- `package.json` — `check:matriz-retencao` e `check:pii-inventory-md`. **Zero dependência nova.**
- `.github/workflows/ci.yml` — as três invocações restantes no job `unit`, com o comentário que
  registra o fato medido dos órfãos e a exceção declarada do reporter do Resend com a razão.

## Decisions Made

- **`rejeitado` publica 18, não 24.** O valor vigente medido vence o valor do seed. Sem exceção.
- **`finalidade` e `base_legal` são ambos autorados.** A tabela não tem coluna de base legal (medido
  na Task 0). O gate garante presença e vocabulário, não correção jurídica — a correção é a revisão
  do Encarregado, que o CONTEXT §Área 5 declara como gate de publicação.
- **Vocabulário de campos FECHADO na fonte** (`janela_meses`, `finalidade`, `base_legal`). Campo
  desconhecido reprova nomeando-o. É onde `origem`/`alterado_por`/`atualizado_em` têm de reprovar:
  publicar `alterado_por` trocaria transparência sobre o candidato por exposição de um funcionário.
- **A lista de termos banidos vive no gerador e NÃO é emitida no artefato.** O irmão emite a dele em
  `meta`; aqui isso poria as strings banidas dentro de `src/features/transparencia/`, e o teste de
  copy que o 47-06 vai escrever sobre essa pasta reprovaria por vacuidade invertida.
- **A mutação do YAML nos testes é ESTRUTURAL, não textual.** A copy da finalidade é editável por
  decisão de produto; um patch textual sobre a frase reprovaria numa revisão de copy legítima, e um
  gate que reprova o trabalho correto é treinamento para desligá-lo. A garantia do `patch()` (a
  mutação aplicou de fato) foi preservada, expressa sobre dado em vez de texto.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A extração do módulo do funil aceitava um export RENOMEADO**

- **Encontrado durante:** Task 2 (os casos (17) e (18) ficaram vermelhos)
- **Problema:** o regex `export const ETAPA_M2_LABELS[^=]*=\s*\{` casa também
  `ETAPA_M2_LABELS_QUALQUER_OUTRA_COISA`, porque o `[^=]*` guloso engole o sufixo. O gerador
  extrairia rótulos de um export que **não é o do funil**, em silêncio — o pior modo de falha
  possível para o mapa que dá nome às etapas na página pública.
- **Correção:** âncora `\s*:` logo após o nome, nos dois blocos.
- **Arquivos:** `docs/compliance/sql/gen-matriz-retencao.cjs`
- **Verificação:** (17) e (18) passam; os outros 20 casos continuam verdes; `--check` sai 0.
- **Commit:** `c5ddaeb`

**2. [Rule 2 - Missing Critical] Trava de vocabulário banido na copy da fonte**

- **Encontrado durante:** Task 1
- **Problema:** o plano manda AUTORAR a finalidade sem termo banido pela `47-UI-SPEC.md` §Bans, mas
  não previa gate para isso. Uma instrução de autoria sem executor é exatamente a promessa órfã que
  o CONSOL-04 desta fase existe para achar — e o texto vai para uma página pública de compliance.
- **Correção:** trava 6 do gerador — 24 termos das três famílias (elásticas, engenharia, totalidade),
  reprovando com o termo e a etapa nomeados. A lista fica no gerador, fora do artefato.
- **Verificação:** caso (16) do teste de portão.
- **Commit:** `213ef38`

**3. [Rule 2 - Missing Critical] Trava de vocabulário FECHADO de campos por etapa**

- **Encontrado durante:** Task 1
- **Problema:** o plano exige que `origem`/`alterado_por`/`atualizado_em` não cheguem ao artefato,
  mas listava apenas validações de campos obrigatórios. Um campo administrativo copiado para a fonte
  numa re-medição futura fluiria direto para a página pública.
- **Correção:** vocabulário fechado de três campos por etapa; chave desconhecida mata a geração
  nomeando o campo e a etapa.
- **Verificação:** caso (15) do teste de portão + caso (6) do contrato do artefato.
- **Commit:** `213ef38`

### Desvios de forma (documentados, não auto-fixes)

**4. Determinismo asserido com o carimbo de relógio neutralizado.** O `<behavior>` da Task 1 pede
"artefatos byte-idênticos entre duas gerações". Literalmente, duas execuções consecutivas diferem em
`meta.gerado_em` — o próprio parêntese do plano reconhece que ele é o único campo de relógio e que é
ele que o `--check` pina. Asserir igualdade byte a byte **com** o carimbo produziria um teste que
passa pela sorte do milissegundo: um flake com fantasia de gate. O caso (19) assere a igualdade com
`gerado_em` normalizado, mais o `--check` saindo 0 logo depois — que é a propriedade real.

**5. `genMatrizRetencao.test.ts` nasceu na Task 1 (RED) e cresceu na Task 2.** O plano dá a posse do
arquivo à Task 2, mas a Task 1 é `tdd="true"` e precisa de um RED. O arquivo foi criado com os 8
casos de contrato (vermelhos, sem gerador), e a Task 2 acrescentou os 14 de mutação e `--check`.
Nenhum caso do plano ficou de fora; o arquivo final tem 22.

**6. Portão do funil acrescentado: etapa com rótulo e fora de `ETAPA_M2_OPTIONS`.** Sem ela uma etapa
com rótulo mas ausente da ordem sumiria da página silenciosamente, em vez de reprovar.

---

**Total de desvios:** 3 auto-fixes (1 bug, 2 funcionalidade crítica ausente) + 3 desvios de forma
documentados.
**Impacto no plano:** nenhum scope creep. Os três auto-fixes são travas de correção sobre texto que
vai para uma página pública de compliance; os três desvios de forma existem para não fabricar um
teste flaky nem um gate vacuoso.

## Issues Encountered

- **Nada foi aplicado nem deployado.** Zero migration escrita, zero migration aplicada, zero
  `supabase db push`, zero MCP chamado por este executor. O plano é write-only por desenho.
- O plano assumia uma coluna `base_legal` em `config_retencao_etapa`; a medição mostrou que ela não
  existe. Resolvido registrando a correção acima e autorando os dois campos jurídicos na fonte.

## Verificação final

| Gate | Resultado |
|---|---|
| `npm run test:run` | **1725 passed / 176 files** (baseline 1696 + 29 novos) |
| `npm run -s lint \| grep -c "error TS"` | **97** (baseline congelada 97 — sem regressão) |
| `node gen-matriz-retencao.cjs --check` | exit 0 |
| `npm run -s check:recibo-exclusao` | exit 0 |
| `npm run -s check:pii-inventory-md` | exit 0 |
| `npm run -s check:export-allowlist` | exit 0 |
| Portões órfãos | **0** (4 invocados, 1 exceção declarada com razão) |
| `--no-verify` | **0 usos** — o hook rodou e passou nos 6 commits |

## Known Stubs

Nenhum. Os dois artefatos são gerados e completos; nenhum componente foi criado neste plano (o
consumidor `/privacidade` é o 47-06).

## Threat Flags

Nenhuma superfície de segurança nova. O gerador não abre rede, não lê credencial e não toca o banco;
os dois artefatos são arquivos versionados. O único item de julgamento humano é a correção jurídica
das citações de `base_legal` (D5), já roteada para a revisão do Encarregado.

## User Setup Required

Nenhuma. Nenhum serviço externo, nenhuma variável de ambiente, nenhuma dependência npm.

## Next Phase Readiness

- **47-06 (`/privacidade`) está desbloqueado** na parte de dado: `MATRIZ_RETENCAO` já exporta as 8
  fichas na ordem do funil, com `meta.medido_em` para o carimbo "Política vigente em {data}".
- **47-09 (CONSOL-04)** herda `portoesInvocados.test.ts` como uma das superfícies de promessa órfã já
  fechadas — e o `ci.yml` deixou de ser fonte de promessa órfã.
- **47-03** edita `pii-inventory.yaml`: a partir de agora, editar aquele YAML sem regerar o `.md`
  reprova no CI (`check:pii-inventory-md`). Quem tocar a fonte precisa rodar
  `node docs/compliance/sql/gen-pii-md.cjs`.
- **Pendente de julgamento humano:** a revisão do Encarregado sobre as 8 citações de `base_legal`,
  antes de `/privacidade` ficar alcançável em produção (gate de publicação, não de engenharia).
- **Manutenção:** quando uma janela mudar em PROD, re-medir, atualizar `janela_meses` + `medido_em`
  na fonte e regenerar. O `check:matriz-retencao` no CI é o que garante que ninguém esqueça a
  segunda metade.

## Self-Check: PASSED

Os 6 artefatos declarados existem em disco e os 7 commits existem em `git log`. Verificado por
execução, não por leitura.

---
*Phase: 47-transpar-ncia-consolida-o*
*Completed: 2026-08-09*
