---
phase: 44
plan: 03
subsystem: compliance
status: complete
tags: [lgpd, export, allowlist, bd-6, fecho, snapshot, smoke-sql, sc3, art-18-ii]

requires:
  - "docs/compliance/export-scope-rules.yaml + gen-export-allowlist.cjs (44-01) — o escopo do titular e o gerador de 3 entradas"
  - "docs/compliance/pii-inventory.yaml (Phase 42 / 42-04) — fonte de CLASSIFICAÇÃO"
  - "docs/compliance/catalogo-vivo-44.json — medição M2 contra PROD, escrita pelo orquestrador (9640093)"
  - "Phase 43 aplicada em PROD — provada pelas 4 colunas de consentimento versionado no catálogo"
provides:
  - "docs/compliance/export-allowlist.json — o artefato do SC#5, 29 tabelas / 358 colunas, meta.consumidores citando a Phase 45"
  - "supabase/functions/_shared/exportAllowlist.ts — espelho gerado, import estático para a EF do 44-05"
  - "docs/compliance/sql/05-export-allowlist-drift.sql — o guarda que lê o CATÁLOGO (SC#3 asserção 2)"
  - "docs/compliance/__tests__/exportAllowlist.test.ts — 11 asserções, 3 snapshots inline (SC#3 asserção 1)"
  - "gen-export-allowlist.cjs --sql-values-excluidas — o segundo conjunto que o smoke consome"
  - "42 vereditos de coluna em decisoes_por_coluna (24 true / 18 false), cada um com razão nomeada"
affects:
  - "44-04 — cria solicitacoes_dados; a allowlist TEM de ser regerada depois, e os dois VALUES do smoke junto"
  - "44-05 — a EF exportar-meus-dados projeta por EXPORT_ALLOWLIST do espelho .ts"
  - "44-07 — o arquivo legível ao titular; a copy de 'O que não está nesta cópia' tem de bater com colunas_excluidas"
  - "Phase 45 — consome allowlist + colunas_excluidas como plano de exclusão (ERASE-02, ERASE-06)"

tech-stack:
  patterns:
    - "toMatchInlineSnapshot — ESTREIA no repositório (zero ocorrências antes deste plano)"
    - "asserção negativa nomeada com token montado em runtime (join('_')) — sobrevive a `vitest -u`"
    - "META-TEST dentro da asserção negativa: o token TEM de ser encontrável, senão a rede é no-op"
    - "guarda de compliance que compara catálogo vivo contra a UNIÃO allowlist ∪ excluídas"

key-files:
  created:
    - docs/compliance/export-allowlist.json
    - supabase/functions/_shared/exportAllowlist.ts
    - docs/compliance/__tests__/exportAllowlist.test.ts
    - docs/compliance/sql/05-export-allowlist-drift.sql
  modified:
    - docs/compliance/export-scope-rules.yaml
    - docs/compliance/sql/gen-export-allowlist.cjs

decisions:
  - "O fecho de TABELA passou a correr sobre `cat.tabelas` (67) e não sobre as tabelas com colunas colhidas (50) — antes ele perguntava uma tautologia e a tabela nova escaparia calada."
  - "`decisao_final.justificativa` FICA FORA da cópia: a Phase-24/CR-01 a removeu de superfície de candidato e o inventário a marca BD-9 EM ABERTO (decisão do operador). Assimetria HISTÓRICA, não de princípio — as 38 outras colunas de texto livre do RH ficam dentro."
  - "Scores, bandas e percentis ENTRAM nos arquivos entregues. O ban da UI-SPEC é de TELA (apresentação); o Art. 18, II governa o direito à cópia."
  - "O smoke compara contra `allowlist ∪ excluídas`, nunca contra a allowlist sozinha: um guarda que grita 34 vezes por desenho é a imagem espelhada do dead code do P39/CR-02."
  - "`redacoes_candidato.referencia_match` é PII de terceiro e a regra R2 não o pegaria — o nome não termina em `_id`. Segunda evasão do mesmo tipo na fase (a outra foi `agendamentos_entrevista.entrevistador`)."
  - "O aviso de prosa 'toda regeração obriga a regerar os dois VALUES' virou a asserção (k). Aviso que depende de alguém lembrar é promessa sem código que a execute."

metrics:
  duration: ~2h
  completed: 2026-08-03
  tasks: 3
  commits: 10
  files: 7

actuals:
  tokens: 80056
  tasks: 3
  commits: 10
---

# Phase 44 Plan 03: O inventário do export como artefato gerado, com os dois guardas do SC#3 — Summary

A allowlist do export nasceu **gerada, nunca digitada**, do catálogo vivo de PROD; ganhou os dois
guardas que o SC#3 exige — o snapshot inline que pega alteração do artefato e o smoke SQL que pega a
coluna nova no banco — e **os dois foram vistos mordendo**. O caminho até lá encontrou seis colunas
que sairiam na cópia de um candidato sem que ninguém tivesse decidido isso, incluindo uma que
reabriria uma correção de segurança já embarcada e outra que entregaria ao titular a lista de
candidaturas de outras pessoas.

## Os números medidos

| | Valor | Origem |
|---|---|---|
| `medido_em` do catálogo | **2026-08-03T19:38:03Z** | `now()` do banco, nunca o relógio local |
| Tabelas base em `public` | **67** | consulta (d) de `01-pii-catalog.sql` |
| Colunas em `public` | **1013** | idem |
| FKs em `public` | **104** | idem |
| **Delta contra o M1 (06:09)** | **ZERO nos três** | schema não se moveu na sessão |
| Tabelas em escopo do titular | 29 (+1 declarada não-viva) | `escopo_titular` |
| Tabelas excluídas com razão nomeada | 38 | 29 + 38 = 67 ✓ |
| **Colunas na cópia** | **358** | `meta.totais.colunas_exportadas` |
| **Colunas excluídas com veredito** | **34** | `meta.totais.colunas_excluidas_em_escopo` |
| **União = colunas vivas do escopo** | **392** | identidade verificada contra PROD |

Toda coluna viva das 29 tabelas tem **exatamente um** veredito. Nenhuma sem decisão, nenhuma
decidida duas vezes — e isso não é afirmação, é o que o smoke mede.

Evidência de execução contra PROD (C, D1, D2, cadeia de custódia dos carimbos e o registro da
primeira execução defeituosa): **`44-VERIFICATION-EVIDENCIA-SC3.md`** (`19d3da2`). Os números não
são reproduzidos aqui de propósito — um número copiado é um número que envelhece em dois lugares.

## O fecho: 30 vereditos que a geração exigiu

`node gen-export-allowlist.cjs` reprovou com **30 erros de fechamento** — colunas vivas de tabela em
escopo que nenhuma fonte resolvia. Isso é o mecanismo do BD-6 funcionando: uma coluna sem veredito
nunca sai em silêncio. **O gerador não foi afrouxado em nenhum momento.**

Três critérios decidiram os 30, e cada linha do YAML diz qual aplicou:

1. **Resultado e explicação entram; prompt e telemetria não.** `prompt_version`, `model_version`,
   `input_hash`, `modelo_ia` descrevem *como o sistema rodou*, não a pessoa — mesma família de
   `ai_call_logs`, fora por decisão travada na 44-CONTEXT §Área 2.
2. **Estado de processo é R3 em espírito; `text` no DDL é acidente.** `scores_candidato.status` sai
   por R3 porque é enum; `analise_candidato_vaga.status` é o mesmo fato tipado `text`. Exportar um e
   não o outro seria incoerência de tipagem virando decisão de compliance. Resolvido com veredito
   explícito **por coluna** — relaxar a R3 para aceitar `text` abriria a porta por onde texto livre
   não classificado sairia calado.
3. **Se o RH enxerga sobre a pessoa, entra** — inclusive o desconfortável. `redacoes_candidato.flags`
   carrega `possivel_plagio_intercandidato`; é precisamente o julgamento sobre o qual o Art. 20 dá
   direito de saber.

**21 entraram, 9 ficaram de fora.** O achado do fecho está na seção própria abaixo.

## O achado que a Phase 45 precisa encontrar: `referencia_match`

`redacoes_candidato.referencia_match` é `uuid[] NOT NULL`. O DDL
(`20260623100003_redacoes_candidato.sql:70`) é literal:

```sql
referencia_match uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],  -- candidatura_ids match no hash
```

São os identificadores das candidaturas de **outras pessoas** cuja redação bateu no mesmo hash
anti-plágio (RF-R-18). **Exportá-lo entregaria ao titular uma lista de candidaturas alheias.**

O que torna este achado estrutural, e não um descuido pontual: **a regra R2 de `ponteiros` não o
pegaria — o nome não termina em `_id`.** Uma allowlist "gerada por regra" o teria produzido em
silêncio. Foi o erro de fechamento que o trouxe à mesa, e ele é a justificativa viva do fecho coluna
a coluna.

O titular não perde o fato: `flags` **entra** e carrega `possivel_plagio_intercandidato` — ele fica
sabendo da suspeita levantada sobre ele **sem receber a identidade de quem mais foi apanhado**.

⚠ **Mesma classe, segunda ocorrência:** `agendamentos_entrevista.entrevistador` é `text` com a nota
do inventário `"Funcionário"` — o **nome** de quem conduziu a entrevista. A R2 também não o pegaria,
pela mesma razão. Excluir `agendado_por` (o UUID) e exportar o nome seria exclusão em forma, não em
efeito. **A Phase 45 deve tratar "ponteiro de pessoa" como conceito semântico, não como sufixo `_id`.**

## Os quatro achados que o fecho NÃO pegou

O fecho pergunta *"esta coluna tem veredito?"*. A leitura da lista gerada pergunta *"o veredito está
certo?"* — e é outra pergunta. Quatro colunas tinham veredito e o veredito estava errado.

| Coluna | Como entrou | Por que saiu |
|---|---|---|
| `candidate_ai_decisions.ai_call_log_ids` | inventário `preservar` | `uuid[]` de ponteiros para `ai_call_logs`, tabela excluída por decisão travada. Exportar os ponteiros é exportar a tabela pela porta dos fundos. **Pego pela asserção (c)**, não pelo fecho. |
| `redacoes_candidato.cost_tokens_input` / `_output` | **R3** (são `integer`) | Custo de LLM. Três irmãs da mesma família saíram só por serem `text`. Duas entrando e três saindo por tipagem de DDL. |
| `decisao_final.justificativa` (+ `_historico`) | inventário | Reabriria a Phase-24/CR-01 — ver seção própria. |
| `agendamentos_entrevista.entrevistador` | inventário `preservar` | Nome de funcionário; nota do inventário é literalmente `"Funcionário"`. |

`ai_call_log_ids` merece nota: **o `preservar` do inventário responde à pergunta da EXCLUSÃO, não à
do ACESSO.** É a ortogonalidade dos dois eixos — que o cabeçalho do `export-scope-rules.yaml`
descreve em prosa desde o 44-01 — produzindo o erro **ao vivo**, e a asserção negativa nomeada
pegando-o na primeira execução contra o artefato real. É a prova de que ela é rede, não enfeite.

## A assimetria do BD-9 — por que, não só o quê

**`decisao_final.justificativa` fica FORA da cópia. As outras 38 colunas de texto livre digitado pelo
RH ficam DENTRO** (`observacoes_rh`, `notas_durante`, `primeira_impressao`, `motivo_rejeicao`,
`human_notes`, `criterio_texto`, `feedback_rejeicao`, `notas_revisor`…).

Duas colunas quase idênticas em natureza com tratamentos opostos é exatamente o tipo de coisa que
alguém uniformiza daqui a seis meses sem saber por quê. **Então: a assimetria é HISTÓRICA, não de
princípio.**

Não existe um princípio "texto livre do RH não entra" — se existisse, as 38 sairiam junto. O que
existe é **um fato sobre uma coluna específica**:

- O `explicacaoService.ts` projeta para o candidato exatamente
  `decisao, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em, revisao_veredito,
  revisao_respondida_em`. `justificativa` **está fora por uma correção que embarcou**: a
  **Phase-24/CR-01** removeu-a da projeção porque a RLS é row-level e não esconde coluna, e o texto
  interno cru do RH estava atravessando a rede até o navegador do candidato. O docblock do serviço
  diz, verbatim, que a exclusão *"must not"* ser desfeita.
- O `pii-inventory.yaml` a marca `⚠ BD-9 EM ABERTO — … simultaneamente prova de não-discriminação
  (Art. 7º, VI) e vetor de PII de terceiro. **Decisão do operador, não da engenharia**`.

Pô-la na allowlist reabriria o mesmo vazamento **por uma porta nova**, sem que ninguém assinasse.
Sendo decisão declaradamente do operador, a engenharia escolheu o lado que não vaza e deixou a linha
reversível: trocar `false` por `true` no YAML e regerar devolve o par.

**Confirmado pelo operador em 2026-08-03: manter como está, e registrar o porquê.** Este parágrafo é
esse registro. `decisao_final_historico.justificativa` acompanha — um veredito só para a linha
corrente deixaria o histórico entregando o que a corrente esconde.

## Ban de tela × direito de arquivo

A cópia entrega **scores, bandas e percentis**: `percentil`, `percentual_acerto`,
`score_ponderado_0_100`, `classificacao_cor`, `perfil_primario`, os quatro scores DISC, os cinco
Big Five.

A 44-UI-SPEC proíbe score, banda e percentil **em superfície de candidato**. A distinção, confirmada
pelo operador: **a UI-SPEC governa APRESENTAÇÃO; o Art. 18, II governa o DIREITO À CÓPIA.** O ban é
de tela. O arquivo entregue é o exercício do direito — e um export que sonegasse o resultado da
avaliação sobre a pessoa entregaria menos do que a lei manda, para proteger uma regra de UX.

Consequência para o 44-07: os arquivos **contêm** os números; a tela do candidato **continua** sem
eles. Um plano futuro que "harmonize" os dois estará quebrando um dos dois contratos.

## Os dois guardas do SC#3, e por que são disjuntos

**Asserção 1 — Vitest** (`docs/compliance/__tests__/exportAllowlist.test.ts`, 11 asserções):

- **(a)(b)(j) três snapshots inline** — tabelas, colunas da cópia, e **colunas excluídas**.
  `toMatchInlineSnapshot` **estreia neste repositório**. Os três foram gerados com `-u` e **lidos por
  um humano antes do commit** (checkpoint da Task 3, quatro perguntas respondidas por escrito).
- **(c) negativa nomeada, um `expect` por token**, montados em runtime (`join('_')`) no idioma do
  42-11 — o literal proibido não passa a existir dentro do arquivo que o proíbe. **É a única
  asserção que não é snapshot, e é de propósito: sobrevive a um `-u` distraído.** Carrega
  **META-TEST**: dois tokens *têm* de ser encontráveis no artefato, senão um token com grafia errada
  passaria verde para sempre — verde nos dois mundos é o no-op perfeito.
- **(d) positiva nomeada, uma por coluna do BD-6** — a dependência Phase 44 → Phase 43 falha com o
  nome da coluna no output, nunca dentro de um diff de 358 linhas.
- **(k)** os dois `VALUES` do smoke são extraídos do `.sql` e comparados ao artefato.

**Asserção 2 — smoke SQL** (`05-export-allowlist-drift.sql`): `FULL OUTER JOIN` do catálogo vivo
contra `allowlist ∪ excluídas`, três direções, `0 linhas = aprovado`.

**Por que nenhum substitui o outro:** o Vitest lê o **artefato commitado**; o smoke lê o **catálogo
do banco**. Uma coluna nova em PROD não move um byte do JSON, logo *nenhuma* asserção do Vitest pode
falhar por causa dela — e é literalmente o modo de falha que o SC#3 nomeia.

## O defeito do smoke: uma guarda que gritava sempre

**Este é o achado de execução mais importante do plano, e ele custou uma reprovação de checkpoint.**

A primeira versão (`75fb231`) definia drift como `viva AND NOT IN allowlist`. Executada contra PROD,
devolveu **34 linhas** onde o esperado era 0.

**E as 34 estavam certas de existirem.** A allowlist é, por desenho, um subconjunto próprio das
colunas vivas — 358 de 392. As 34 eram exatamente as exclusões com veredito. Nenhuma era drift.

Num sistema **correto** aquele predicado devolveria 34 linhas **para sempre**. E um relatório que
sempre mostra 34 treina todo mundo a ignorá-lo: a linha 35 — o vazamento real — passa despercebida,
e a própria prova de mordida deixa de provar coisa alguma, porque **somar 1 a 34 não se distingue de
ruído**.

O cabeçalho do arquivo citava P39/CR-02, a guarda que era dead code. **O arquivo era a imagem
espelhada do mesmo defeito.** Uma guarda que grita sempre é tão inútil quanto uma que nunca grita — e
consideravelmente mais difícil de flagrar, porque parece estar trabalhando.

**Correção (`d0d14fe`):** o universo comparado passou a ser `allowlist ∪ excluídas`. Sobra dos dois
lados é o que ninguém decidiu. Três direções, cada uma com razão escrita:

| Veredito | Significa |
|---|---|
| `COLUNA NOVA NO BANCO — sem veredito` | vazamento em potencial: ninguém decidiu |
| `COLUNA DA ALLOWLIST SUMIU DO BANCO` | o export entrega menos do que declara — a mentira por omissão do EXPORT-06 |
| `COLUNA EXCLUÍDA SUMIU DO BANCO` | veredito órfão: o YAML fala de coluna fantasma, e a Phase 45 herdaria esse YAML |

**Premissa do checkpoint corrigida, porque mudava o trabalho:** o operador diagnosticou que faltava
registro de exclusão legível por máquina. **Não faltava.** `tabelas.<t>.colunas_excluidas`
(coluna → motivo) existe no artefato desde o 44-01; o bloco `excluidas` de nível de tabela (38) é
outro. O que faltava era **o smoke lê-lo**. O EXPORT-06 já estava servido — o guarda é que não
estava. Correção aceita e registrada pelo operador.

**O aviso virou asserção.** O cabeçalho avisava que toda regeração obriga a regerar os dois blocos.
Um aviso que depende de alguém lembrar de obedecê-lo é promessa sem código que a execute — o defeito
que esta fase inteira existe para não repetir. A asserção **(k)** extrai os dois `VALUES` do `.sql` e
os compara ao artefato. **Provada mordendo:** removida uma linha ⇒ falha nomeando o bloco envelhecido
(357 ≠ 358); restaurada ⇒ 11/11.

## Verificação

| Critério | Resultado |
|---|---|
| `node gen-export-allowlist.cjs` | **exit 0** (era exit 1 com 30 pendências) |
| `node gen-export-allowlist.cjs --check` | **exit 0**; **exit 1** com o `.json` adulterado (coluna intrusa injetada e desfeita) |
| `npx vitest run …/exportAllowlist.test.ts` | **11/11 verdes** |
| `npm run test:run` | **157 arquivos / 1442 testes verdes** |
| `npm run lint` (`tsc --noEmit`) | **97** — baseline congelada, zero regressão |
| `.husky/pre-commit` | rodou e passou nos **8 commits do executor**. **Zero `--no-verify`** |
| Smoke contra PROD (C) | **0 linhas** · reconfirmado — ver `44-VERIFICATION-EVIDENCIA-SC3.md` |
| Prova de mordida (D1 + D2) | **1 linha cada, nas duas direções** — ver evidência |
| Prova de mordida da asserção (k) | **falha nomeando o bloco envelhecido**; restaurada ⇒ verde |
| `grep -c 'toMatchInlineSnapshot(\`'` | **3** |
| Tokens proibidos literais no teste | **0** — todos montados em runtime |
| Smoke READ-ONLY | **0** statements de escrita fora de comentário |
| `meta.medido_em` = `catalogo.meta.medido_em` | ✓ (T-44-13) |

**D1 sozinha não bastaria**, e o ponto é do operador: ela provaria apenas que o smoke lê a
allowlist — o que era verdade *antes* da correção também. **É D2 que prova que o universo é a
união.** Juntas provam exatamente a propriedade que o defeito destruía.

## Desvios do plano

### 1. [Regra 1] O fecho de TABELA perguntava uma tautologia (`59c74c7`)

O `regra_de_fecho` promete *"TODA tabela viva do schema public"*. O gerador derivava o universo de
`cat.colunas`, e a medição colhe colunas só das tabelas do escopo: **50 checadas, 17 nunca vistas**.
A pergunta efetiva era *"toda tabela que eu já sabia que existia tem disposição?"* — e a **tabela
nova**, que é o caso literal do BD-6, jamais teria coluna colhida e escaparia calada.

Universo passou a ser `cat.tabelas` (67), com degradação documentada para catálogos sem o campo.
Tabela em escopo presente em `tabelas` e sem coluna colhida virou erro de fechamento — gerar assim
produziria projeção vazia com cara de cópia honesta. Efeito: excluídas 21 → 38; **29 + 38 = 67**.

Também: `meta.totais.tabelas_vivas: 50` afirmava que `public` tem 50 tabelas quando a medição
registrou 67. **Número falso em arquivo de compliance é pior que número ausente.** Renomeado para
nomes literais, mais `totais_medidos_em_public` (copiado do catálogo, nunca recontado).

### 2. [Regra 2] Três asserções não previstas pelo plano

O plano pedia oito; o arquivo tem onze.

- **(i)** `solicitacoes_dados` tem de estar na cópia **ou** em `meta.escopo_declarado_nao_vivo`.
  Estável nos dois lados do 44-04 de propósito.
- **(j)** terceiro snapshot inline (conjunto excluído) + disjunção + razão não-vazia. Sem ele, uma
  coluna nova que recebesse veredito `false` não moveria snapshot nenhum e o smoke ficaria verde: a
  superfície de compliance cresceria em silêncio **pelo lado da exclusão**.
- **(k)** os dois `VALUES` do smoke em sincronia com o artefato.

### 3. [Regra 2] META-TEST dentro da asserção (c)

Um token de segredo com grafia errada passaria verde para sempre. Dois tokens agora têm de ser
*encontráveis* no artefato.

### 4. Asserção (c) reescrita depois de falhar contra prosa

A primeira versão varria `JSON.stringify(tabelas)` e reprovava porque as razões de
`colunas_excluidas` **citam as tabelas proibidas de propósito**. Um guarda que reprova a documentação
da própria exclusão ensina a silenciá-lo — o defeito do grep repo-wide que a 43 pagou duas vezes. O
alvo passou a ser a **superfície projetada** (nomes de tabela + `tabela.coluna`).

### 5. Task 3 executada em duas metades

O plano trata a Task 3 como um checkpoint único. Steps **C** e **D** exigem os tools MCP do Supabase,
que subagentes GSD não recebem (anthropics/claude-code#13898). O executor escreveu o arquivo (step
**B**) e devolveu o checkpoint; o operador executou **A**, **C** e **D**. A primeira devolução
reprovou em C — e é por isso que o plano tem dez commits em vez de seis.

## `solicitacoes_dados` — pendente por desenho, em três registros

Declarada em `escopo_titular`, nasce no **44-04**, ausente do catálogo de hoje. **Nenhuma coluna dela
entra nesta geração.** O risco não é vazamento (tabela ausente não vaza nada) — é **esquecimento na
regeração pós-44-04**. Três mecanismos independentes impedem o silêncio:

1. `meta.escopo_declarado_nao_vivo` no artefato + AVISO no stderr do gerador;
2. `meta.pendentes_por_desenho` no `export-scope-rules.yaml`, com o efeito e o motivo por escrito;
3. asserção **(i)** do Vitest, estável nos dois lados do 44-04.

⚠ **O 44-04 obriga a regerar**: allowlist, espelho `.ts`, os três snapshots e os **dois** `VALUES` do
smoke. A asserção (k) reprova se qualquer bloco ficar para trás.

## Requirements — o que este plano torna observável

| Req | Marcado | Por quê |
|---|---|---|
| **EXPORT-04** | ✅ **Complete** | *"Chaves do export cobertas por snapshot test — uma coluna nova no banco não pode vazar silenciosamente"*. As duas asserções disjuntas existem, e **ambas foram vistas mordendo** (o smoke contra PROD nas duas direções; (k) contra bloco envelhecido). |
| EXPORT-02 | ❌ **não marcado** | *"Export em JSON por allowlist explícita"*. A allowlist existe; **o export não**. A EF `exportar-meus-dados` nasce no 44-05, e nada projeta por ela hoje. |
| EXPORT-06 | ❌ **não marcado** | *"O inventário é o artefato consumido pelo motor de exclusão"*. O artefato existe e declara a Phase 45 — mas ele **ainda será regerado depois do 44-04**, e a copy "O que não está nesta cópia" (44-07) faz parte do requirement. |

O 44-01 teve de **reverter** uma marcação falsa nesta fase e o 44-02 **recusou-se** a fazer uma.
Marcar EXPORT-02 hoje seria a terceira tentativa da mesma mentira.

⚠ **Limitação honesta do EXPORT-04:** o smoke SQL **não roda em CI** — exigiria credencial de PROD no
CI, o que a 44-RESEARCH rejeitou explicitamente como *"trocar um guarda por um vazamento"*. Ele é
executado pelo operador via MCP. O que **é** estrutural: a coluna nova **não vaza**, porque a
projeção é allowlist e não `select('*')`. O que depende de alguém rodar o smoke é **descobrir que
falta uma decisão** — não impedir o vazamento.

## Known Stubs

Nenhum. Zero `TODO`/`FIXME`/placeholder nos arquivos criados, zero `t.skip`/`test.todo`, zero
`<verify>` não executado. Os dois artefatos gerados são saída de máquina e não contêm valor
hardcoded.

## Threat Flags

Nenhuma superfície nova além da registrada no `<threat_model>` do plano. As seis mitigações foram
implementadas e testadas:

| Threat | Mitigação | Prova |
|---|---|---|
| T-44-08 | drift PROD→artefato | smoke contra PROD **0 linhas** + mordida nas duas direções (evidência `19d3da2`) |
| T-44-07 | segredo atravessando a allowlist | asserção (c) + META-TEST; **mordeu de verdade** em `ai_call_log_ids` |
| T-44-19 | snapshot aprovado sem leitura | checkpoint bloqueante, quatro perguntas respondidas por escrito pelo operador |
| T-44-13 | artefato gerado de catálogo diferente | asserção (f): `medido_em` idêntico ao do catálogo commitado |
| T-44-20 | omissão da dependência Phase 43 | asserção (d), uma por coluna do BD-6; as quatro presentes no catálogo e na cópia |
| T-44-14 | espelho `.ts` fora de sincronia | asserção (h) + `--check` cobrindo os dois artefatos |

## Commits

| Hash | O quê |
|---|---|
| `9640093` | catálogo vivo — medição M2 do orquestrador |
| `26aa9c4` | 30 vereditos do fecho |
| `59c74c7` | fecho de tabela deixou de ser tautológico |
| `1b5dd2c` | RED — 9 asserções com os artefatos inexistentes |
| `1ebe7e1` | GREEN — artefatos + snapshots; `ai_call_log_ids` fora |
| `d01ca02` | custo de LLM saía na cópia |
| `6556539` | `justificativa` (CR-01) e `entrevistador` (funcionário) fora |
| `75fb231` | smoke SQL — primeira versão |
| `d0d14fe` | smoke corrigido: união dos vereditos, + (j) e (k) |
| `19d3da2` | evidência do SC#3 contra PROD (orquestrador) |

## Self-Check: PASSED

- Arquivos criados/modificados: **6/6 FOUND** (+ catálogo do orquestrador)
- Commits: **10/10 FOUND** no histórico
- `gen-export-allowlist.cjs` exit 0 · `--check` exit 0 · 11/11 · 1442 testes verdes · tsc 97
- Smoke contra PROD: 0 linhas, com mordida provada nas duas direções
