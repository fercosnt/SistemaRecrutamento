---
phase: 44-exporta-o-acesso
reviewed: 2026-10-07T12:53:34Z
depth: deep
diff_base: dedca1fb
diff_head: 09168e228ac413087f185e93dcd0911a4a21cba0
files_reviewed: 7
files_reviewed_list:
  - docs/compliance/__tests__/exportAllowlist.test.ts
  - docs/compliance/catalogo-vivo-44.json
  - docs/compliance/export-scope-rules.yaml
  - src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts
  - src/features/privacidade/constants/canalPrivacidade.ts
  - src/features/privacidade/services/__tests__/exportacaoService.test.ts
  - src/features/privacidade/services/exportacaoService.ts
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 44: Revisão adversarial independente da rodada do CR-01-bis (44-17..44-20)

**Reviewed:** 2026-10-07T12:53:34Z
**Depth:** deep
**Files Reviewed:** 7 (diff `dedca1fb..09168e22`, fora de `.planning/`; não publicado)
**Status:** issues_found

**Independência:** os achados abaixo foram escritos e commitados sem ler nenhum PLAN nem SUMMARY de
44-17..44-20. A especificação usada foi o 44-CONTEXT (adendo do CR-01-bis, BD-18..BD-22), a 44-UI-SPEC
(Seção 3 e «Os dois arquivos entregues», com as notas datadas), o 44-REVIEW.md (WR-01..WR-06, IN-01,
IN-02), o 44-VERIFICATION.md (gap CR-01-bis e premissas medidas) e o artefato 1.4.0
(`docs/compliance/export-allowlist.json`). Única leitura de texto dos autores antes dos achados: a
entrada de 44-20 em `deferred-items.md`, feita DEPOIS de o achado WR-02 já ter sido reproduzido por
execução própria, e só para classificá-la, como o orquestrador pediu. Os assuntos dos commits da rodada
(`git log`) foram vistos ao derivar o escopo.

## Summary

O diff da rodada muda a frase da fronteira (BD-18/BD-19), acrescenta a fronteira neutra dos arquivos
(`fronteiraDaCopia`, BD-22) e endurece seis portões: (cr4), (cr5), (cr6), `problemasDosValues`,
`BLOCO_GATE_CANONICO`, (cp3)/(cp4).

**O que foi conferido e fica de pé:**
- A frase publicada é, caractere por caractere, a célula da 44-UI-SPEC l.467, e a neutra é a l.548
  (comparação executada; ver Eixo 1).
- Cada «não entra(m)» nomeia algo de fato retido no artefato 1.4.0. Cada «(… entra[m])» nomeia colunas de
  fato exportadas e não vetadas.
- `fronteiraDaCopia` é pura e total, e os dois geradores passam por ela.
- Nada no diff muda o runtime da EF, da allowlist nem do banco.
- `tsc` continua em 89. As três suítes do escopo passam: 103/103.

**O que quebra.** Nenhuma afirmação falsa ao titular na copy publicada hoje, por isso `critical: 0`.
Mas há cinco fraquezas de portão ou de falha-fechada:
1. **A falha-fechada do BD-22 compara a versão, e a versão não identifica o conteúdo (WR-01).** No
   histórico do repositório, a 1.1.0 teve 4 conteúdos e a 1.2.0 teve 2. Nada obriga a subir a versão.
2. **O ramo «ausente» que a rodada desenhou imprime `undefined`/`null` cru no rodapé (WR-02).** Classifica
   o item do 44-20 em `deferred-items.md`.
3. **O smoke ainda se cala por uma rota fora das duas regiões presas (WR-03).** Um segundo `set_config`
   forja `smoke44.r`, e a suíte segue 40/40 verde. Provado por execução, com restauração conferida.
4. **O (cr4) prende «as datas» a um subconjunto escolhido à mão (WR-04).**
5. **O (cr5) define vínculo só pelo nome da coluna (WR-05).**

## Eixo 1 · Verdade da copy

Frase conferida: `COPY_PEDIR_COPIA.oQueNaoEsta` (`exportacaoService.ts:587`) e
`COPY_ARQUIVO.naoEstaVersaoDivergente` (`:187`). A régua é o artefato 1.4.0.

| Afirmação da frase | O que o artefato 1.4.0 diz | Resultado |
|---|---|---|
| não entram «os registros técnicos … tempo e custo de processamento … registros de acesso … controle de envio de mensagens» | `excluidas`: `ai_call_logs`, `ai_cost_daily`, `logs_acesso`, `sessoes_ativas`, `notificacoes_enviadas` (`telemetria_interna`); `solicitacoes_dados.recibo_enviado_em`/`aviso_*` (BD-13 (iv) / telemetria) | verdadeira |
| não entra «a configuração do próprio sistema, como o texto das vagas e das perguntas» | `vagas`, `perguntas*` em `excluidas` (`configuracao_do_produto`). Nenhuma tabela exportada carrega texto de vaga ou de pergunta; só `vaga_id`/`pergunta_id`, conferido em `tabelas[*].colunas` | verdadeira. A oração «que é o mesmo para todos os candidatos» saiu (ver «ban» abaixo) |
| não entra «o roteiro que a equipe monta para conduzir a sua entrevista» | `excluidas.entrevista_guias = configuracao_do_produto` | verdadeira. Ver IN-04 sobre «a equipe monta» |
| não entram «os dados que identificam outras pessoas» | `pii_de_terceiro`: `usuarios_rh`, `comparativo_solicitado`, `vagas_associadas_recrutadores`, `preferencias_notificacoes` e 26 colunas `*_por`/`*_id` de funcionário | verdadeira |
| não entram «as anotações internas … sobre a conservação» **(o motivo e as datas entram)** | `retencao_hold.colunas_excluidas.detalhe` (BD-10). `colunas` ⊇ {`motivo`, `criado_em`, `liberado_em`}, nenhuma vetada | verdadeira |
| não entra «a ficha técnica … pedido de exclusão» **(o andamento e as datas do pedido entram)** | `solicitacoes_dados.colunas_excluidas.plano` (BD-13 (ii)). `colunas` ⊇ {`situacao`, `solicitado_em`, `atendido_em`, `cancelado_em`, `executar_em`, `*_concluido_em`}. Os `*_enviado_em` retidos são controle de envio, nomeado na primeira cláusula | verdadeira |
| não entra «o texto em que a equipe justificou a decisão final» **(a decisão em si entra)** | `decisao_final(.historico).colunas_excluidas.justificativa` (BD-9). `decisao` ∈ `colunas` nas duas | verdadeira |
| convite: «Se quiser saber mais sobre algum desses itens, escreva para …» | BD-19: a oferta «ou pedir algum deles» saiu | verdadeira; não promete entrega |
| neutra: «Esta cópia foi gerada durante uma atualização do sistema …» | ramo «versão diferente»: verdadeira, porque EF e bundle divergem durante a troca de um deles. Ramos «vazia/ausente»: a causa afirmada não é medida | ver WR-02 |

**Mesma frase nos três lugares.** Executei os geradores reais com versões
`1.4.0 | 9.9.9 | '' | undefined | null | ' 1.4.0' | '1.4.0 '`:
- `1.4.0` → a frase da TELA no `.html` e no `.json`.
- Todo o resto → a NEUTRA.
- `spec467 == oQueNaoEsta: true` e `spec548 == neutra: true`, comparando a célula da UI-SPEC com a
  constante.

**Linguagem.** As nove strings do (t), mais «teste psicol», «pessoa natural», «prazo legal», «mesmo para
todos» e «pedir algum», dão `false` nas duas frases. `escapeHtml` é estável nas duas.

**Conclusão:** toda afirmação negativa e positiva da frase publicada é verdadeira sob o artefato 1.4.0.
A frase é a da UI-SPEC caractere a caractere e é a mesma na tela e nos dois arquivos quando as versões
coincidem. A neutra é verdadeira no único ramo alcançável hoje (versão diferente). Não há afirmação de
origem ou derivação além de «a equipe monta» (IN-04). Nenhum achado `critical` neste eixo. O ramo
«ausente/vazia» é o WR-02.

## Eixo 2 · Portões que podem ser calados

Conferido em cada portão novo:
- população vazia;
- lista literal;
- contagem contra constante;
- `continue`/`return`;
- filtro `-t`.

| Portão | População vazia | Lista/contagem literal | Resultado |
|---|---|---|---|
| (cr4) | sanidade `parenteses.length > 0`; mapa vazio com parêntese na frase cai em `semEntrada` | `PARENTESES_QUE_ENTRAM` é escopo deliberado, com igualdade de conjuntos nos dois sentidos. As listas de COLUNAS por entrada são subconjunto escolhido à mão | ver WR-04 |
| (cr5) | sanidade de classe, vínculo, nome no catálogo e bloco medido > 0 | `VEREDITO_POR_TABELA` é escopo, com igualdade de conjuntos. A classe de vínculo é por NOME de coluna | ver WR-05 |
| (cr6) | n/a | versão divergente `'9.9.9'` com sanidade `≠ meta.versao` | morde. O ramo «ausente» não confere o rodapé (WR-02) |
| `problemasDosValues` | cabeçalho ausente vira problema nomeado; saída do gerador vazia ≠ corpo | n/a | cobre as três CTEs de `VALUES`. Não cobre a sequência de comandos fora delas (WR-03) |
| `BLOCO_GATE_CANONICO` | `DO $gate$` ausente reprova pela contagem `nDo` | texto canônico = escopo deliberado (bloco de propósito fixo) | cobre o bloco; `r` é lido de `current_setting`, que pode ser reescrito fora dele (WR-03) |
| (cp3)/(cp4) | sanidade do alcance (4 arquivos-âncora) e meta-teste do detector | `EXTENSOES`/`PULAR` | ver IN-02 |

**Varredura de forma** (padrão do `<interfaces>` do plano, entre aspas duplas). Achou 60 linhas nos três
arquivos de teste. Pelo `git blame dedca1fb..HEAD`, 51 são anteriores à rodada e ficam fora do escopo.
As 9 novas:

| Arquivo:linha | Forma | Classificação |
|---|---|---|
| `exportacaoService.test.ts:956` | `.length === 1` (marcador exclusivo no mapa) | ESCOPO: unicidade, não contagem de população |
| `exportacaoService.test.ts:958` | `split(m).length === 2` (marcador aparece uma vez na frase) | ESCOPO: unicidade do alvo do controle 2 |
| `exportacaoService.test.ts:1056` | `c.length > 0` | ESCOPO: string não vazia |
| `exportacaoService.test.ts:1209-1210` | palavras literais dos dois trechos retirados (BD-18/BD-19) | ESCOPO: decisões do operador, montadas em runtime |
| `exportacaoService.test.ts:1403,1406` | colunas literais por parêntese | ESCOPO na chave. As COLUNAS de «as datas» são FOTOGRAFIA de um subconjunto: WR-04 |
| `canalPrivacidade.test.ts:51` | `EXTENSOES = ['ts','tsx','json','html']` | ESCOPO declarado, mais estreito que a frase do docblock: IN-02 |
| `canalPrivacidade.test.ts:53` | `PULAR = node_modules/build/dist` | ESCOPO: saída de build e dependências |

**Filtro `-t`** (medido, vitest 4.1.9):
- `npx vitest run src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts -t "zzz-nao-existe"`
  responde `Tests  5 skipped (5)` e **sai 0**.
- `-t` é regex: `-t "(cr4)"` é um grupo que casa também «(cr4b)».

Ver IN-01.

**Conclusão:** cada um dos seis portões novos tem sanidade contra população vazia, e as listas literais
novas são escopo deliberado conferido por igualdade de conjuntos. Há uma exceção: as colunas de «as
datas» no (cr4) são fotografia de um subconjunto (WR-04). Dois portões deixam uma rota calada:
- o par `problemasDosValues` + `BLOCO_GATE_CANONICO` não prende a sequência de comandos do smoke. Um
  segundo `set_config` deixa a suíte 40/40 verde (WR-03, provado);
- o (cr5) não vê vínculo por chave de outro nome (WR-05).

Um `-t` que não casa nada sai 0 (IN-01).

## Eixo 3 · Falha fechada e fronteira de versão

- `fronteiraDaCopia(v)` (`exportacaoService.ts:761-765`) é uma comparação estrita
  `v === EXPORT_ALLOWLIST.meta.versao`. É pura e total para qualquer entrada: número, `null`,
  `undefined`, string com espaço. Os dois geradores a chamam (`:496` `.html`, `:780` `.json`). Nenhum
  terceiro consumidor de `oQueNaoEsta` grava arquivo: `git grep` acha só `PedirCopiaBloco.tsx:122`, que
  é a tela, residual T-44-109 aceito.
- A neutra passa no escape sem mudar, e o (cr6) confere isso.
- O (cr6) cobre os quatro casos pedidos: igual, diferente, vazio e ausente. Não cobre `null`, mas o
  ramo é o mesmo.
- O carimbo e a fronteira podem ainda divergir por duas rotas. A primeira: o carimbo `versao_allowlist`
  é a STRING de versão, e a fronteira do bundle é o CONTEÚDO de uma versão. Se o conteúdo muda sem a
  versão mudar, a falha-fechada abre (WR-01, com medição do histórico). A segunda é o ramo
  ausente/vazio (WR-02).

**Conclusão:** a fronteira dos arquivos falha fechada em toda divergência de STRING de versão. Ela não
falha fechada quando o conteúdo da lista muda sob a mesma versão, o que o histórico mostra ter
acontecido 4 vezes (WR-01). No ramo ausente/vazio, inalcançável com a EF de hoje, o carimbo sai cru
(WR-02).

## Eixo 4 · Fronteira «só front»

Cada ponto foi medido:
- `git diff --stat dedca1fb HEAD -- supabase docs/compliance/export-allowlist.json docs/compliance/sql docs/compliance/pii-inventory.yaml`
  sai vazio. A EF, o espelho, a allowlist, o SQL, o smoke e o inventário estão intocados.
- O YAML mudou só em comentário: `js-yaml.load` de `dedca1fb` e de HEAD dão `JSON.stringify` igual
  (`yaml parse equal: true`).
- No catálogo, tudo fora da chave nova `colunas_fora_do_escopo` é igual ao de `dedca1fb`
  (`rest equal old: true`).
- O gerador (`gen-export-allowlist.cjs`) só lê `cat.meta`, `cat.colunas` e `cat.tabelas` (`:109-246`),
  nunca o bloco novo.
- O bloco foi conferido por script:
  - forma `{coluna,nullable,ordem,tabela,tipo}` igual à de `colunas`;
  - `tabelas` igual às 43 chaves de `excluidas`, sem duplicata;
  - toda tabela com ≥ 1 coluna;
  - `query` reprodutível, presente, e `SELECT … FROM information_schema.columns …`;
  - `medido_em` 12:18:09Z, anterior ao commit que o grava (12:19:21Z).
- `npm run -s check:export-allowlist` responde «OK … em sincronia com as três fontes».
- A única mudança de runtime é do front: `exportacaoService.ts`.

**Conclusão:** a rodada é só front. Nada no diff muda o que a EF projeta, o artefato, o espelho, o SQL
ou o banco. O YAML e o catálogo mudaram só em texto que o gerador não lê, e o check de sincronia está
verde.

## Warnings

### WR-01: `fronteiraDaCopia` falha fechada por STRING de versão, mas a versão não identifica o conteúdo da lista — a 1.1.0 teve 4 conteúdos e a 1.2.0 teve 2

**File:** `src/features/privacidade/services/exportacaoService.ts:761-765`;
`docs/compliance/sql/gen-export-allowlist.cjs:518` (`versao: esc.meta.versao`, copiada do YAML à mão);
`docs/compliance/__tests__/exportAllowlist.test.ts:1186` (só confere o formato semver).

**Issue:** o BD-22 parte de uma premissa: «versão igual ⇒ a frase do bundle descreve o que a EF
entregou». Nada a garante. A versão é um campo escrito à mão no YAML (`meta.versao`), e nenhum portão
exige subi-la quando `tabelas`/`excluidas` mudam. Medido no histórico do próprio artefato, com hash de
`{tabelas[*].colunas, excluidas}` por commit:
```
1ebe7e10 1.1.0 48ec2320   d01ca023 1.1.0 8aca89cb   6556539b 1.1.0 80634947   cbd53586 1.1.0 7fcd5ecf
4f524085 1.2.0 d729f559   bab3c0f8 1.2.0 ef9b6083   …   ab98da48 1.4.0 1a216314
```
Seis conteúdos distintos sob duas versões. Num veto futuro regerado sem subir a versão, a EF é
publicada primeiro (canais independentes, CLAUDE.md). A cópia sai então com o carimbo `1.4.0`, o
payload novo e a fronteira do bundle velho. É exatamente o cenário do WR-03 que a rodada diz fechar, por
uma rota que o (cr6) não exercita. Hoje não há defeito publicado: só um conteúdo foi gravado sob 1.4.0.

**Fix:** prender versão ↔ conteúdo, só no front. Exemplo: um ledger versionado
`docs/compliance/export-allowlist-versoes.json` (`{ "1.4.0": "<sha256 de {tabelas[*].colunas, colunas_excluidas, excluidas}>" }`)
e um caso em `exportAllowlist.test.ts`:
```ts
const digest = sha256(JSON.stringify({ t: Object.fromEntries(Object.entries(a.tabelas).map(([k, v]) => [k, [v.colunas, v.colunas_excluidas]])), e: a.excluidas }))
expect(ledger[a.meta.versao], `conteúdo da allowlist mudou sem subir meta.versao (${a.meta.versao}) — a fronteira dos arquivos (BD-22) compara só a versão`).toBe(digest)
```
Uma versão nova entra no ledger no mesmo commit da regeneração. Mudar conteúdo sem subir a versão
reprova.

### WR-02: no ramo «versão ausente/vazia» que o (cr6) desenhou, o rodapé do `.html` imprime `undefined`/`null`/vazio cru, o `.json` perde a chave, e a neutra afirma uma causa que nesse ramo não é medida (classifica o item do 44-20 em `deferred-items.md`)

**File:** `src/features/privacidade/services/exportacaoService.ts:199-200` (`rodape`), `:499`, `:779`;
`:732-747` (`invocarExportMeusDados` aceita `ok: true` sem conferir `versao_allowlist`); gate:
`exportacaoService.test.ts` (cr6) passo 3.

**Issue:** executado com os geradores reais (scratch fora do repositório):
```
undefined → NEUTRA | json.versao_allowlist= undefined | key in json: false | footer: Versão da lista de dados exportados: undefined. …
null      → NEUTRA | json.versao_allowlist= null      | key in json: true  | footer: Versão da lista de dados exportados: null. …
""        → NEUTRA | json.versao_allowlist= ""        | key in json: true  | footer: Versão da lista de dados exportados: . …
```
- A 44-UI-SPEC (E4, «long-text») manda: «A ausência de valor renderiza travessão, nunca `null` cru».
- O (cr6) declara o ramo «ausente» como tratado, mas confere só a fronteira, não o carimbo.
- A neutra diz «Esta cópia foi gerada durante uma atualização do sistema». Nesse ramo, a causa real é
  uma resposta malformada, não medida.

Hoje o ramo é inalcançável: a EF sempre devolve `versao_allowlist: EXPORT_ALLOWLIST.meta.versao`
(`supabase/functions/exportar-meus-dados/index.ts:342`). Fica a dúvida entre `warning` e `critical`,
escrita conforme o plano. Classifiquei como `warning` porque nenhuma cópia real pode hoje sair por
esse ramo. Ele só existe por cast ou por uma EF futura quebrada. Nesse segundo caso, uma EF nova é
literalmente uma atualização do sistema, e a afirmação causal fica defensável. A falha não diz ao
titular nada falso sobre o que ficou de fora.

**Fix:** fechar o ramo onde ele nasce, sem copy nova:
```ts
// invocarExportMeusDados, depois do teste de `ok`
const v = (data as { versao_allowlist?: unknown }).versao_allowlist
if (typeof v !== 'string' || v.trim() === '') throw new ExportacaoError(COPY_PEDIR_COPIA.erroTitulo, 'SERVER_ERROR')
```
Um arquivo sem carimbo de versão não é gerado; a pessoa vê o erro já aprovado, que manda ao canal. A
alternativa do 44-20 («versão não informada» no rodapé) exige linha nova na UI-SPEC e mantém a causa
afirmada pela neutra.

### WR-03: o smoke de drift ainda se cala por um segundo `set_config` que forja `smoke44.r` entre o cálculo e o `DO $gate$` — `exportAllowlist.test.ts` inteiro segue 40/40 verde (provado)

**File:** `supabase/tests/p44_export_drift_smoke.sql:90, 693-695`; portões
`docs/compliance/__tests__/exportAllowlist.test.ts` (`problemasDaEstrutura` e `BLOCO_GATE_CANONICO`
`:491-512, :577-587`; `problemasDosValues` `:335-360`).

**Issue:** o WR-05 da revisão anterior pedia que `r` chegasse à guarda intacto. A rodada prendeu o
TEXTO do bloco, e com isso `r :=` dentro dele reprova (M23). Mas `r` é lido de
`current_setting('smoke44.r')`, que qualquer comando entre o primeiro `set_config` e o `DO $gate$` pode
reescrever. Nenhum portão prende a sequência de comandos do arquivo:
- `problemasDosValues` olha só os corpos das três CTEs;
- o pino olha só o bloco;
- as chaves «construídas» vêm do PRIMEIRO `json_build_object`;
- a mutação não usa `->>`.

Evidência, uma mutação aplicada ao smoke real com backup e restauração:
```
antes=53fbfd452cf9c87e18eb740fe7b9f428
+ SELECT set_config('smoke44.r', '{"n_tabelas_vivas":1,"n_tabelas_com_disposicao":1,"n_tabelas_em_escopo":1,"n_colunas_vivas_em_escopo":1,"n_pares_com_veredito":1,"n_drift":0}', false);   (antes de `DO $gate$`)
mutado=1cee7c733e84ff49fc3bd62f873e3beb
npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts → Test Files 1 passed (1) · Tests 40 passed (40)
depois=53fbfd452cf9c87e18eb740fe7b9f428 · cmp ok · git status --porcelain -- supabase: vazio
```
Em PROD, esse arquivo responde `'pass', true` com qualquer drift. O smoke guarda o SC3, não a frase,
por isso fica em `warning`.

**Fix:** prender o ESQUELETO do arquivo, não só as duas regiões. Sobre `colapsar(semComentarioSql(smoke))`:
- `set_config(` ocorre exatamente 1 vez;
- `smoke44.r` ocorre só no `set_config`, no `DECLARE` do bloco e no `SELECT` final;
- o texto entre o `)::text, false);` do primeiro `set_config` e `DO $gate$` é vazio;
- o texto depois de `$gate$;` é exatamente o `SELECT json_build_object(… ) AS resultado;` canônico.

Acrescentar à (k4) a M25 (`set_config` forjado) e a M26 (`SET smoke44.r = …`).

### WR-04: o (cr4) prende «as datas» a um subconjunto de colunas escolhido à mão, e só deriva parênteses da forma «(… entra|entram)»

**File:** `src/features/privacidade/services/__tests__/exportacaoService.test.ts:1402-1408`
(`PARENTESES_QUE_ENTRAM`), `:1420-1422` (`parentesesDaFrase`).

**Issue:**
- «(o andamento e as datas do pedido entram)» é preso a {`situacao`, `solicitado_em`, `atendido_em`}.
  Mas a tabela exporta hoje outras cinco datas do pedido: `cancelado_em`, `executar_em`,
  `auth_/postgres_/storage_concluido_em`. Um veto futuro de qualquer uma deixa a frase prometendo «as
  datas do pedido», e o (cr4) segue verde. É a mesma classe do WR-02 da revisão anterior, um nível
  abaixo: a lista codifica uma fotografia do que o autor lembrou, não a classe que a frase afirma.
- A derivação só vê parênteses terminados em « entra»/« entram». Uma afirmação positiva nova em outra
  forma («(vêm na cópia)», ou fora de parênteses) não é derivada.

A copy de hoje é verdadeira (Eixo 1).

**Fix:** para entradas que afirmam «as datas», derivar a classe do catálogo:
```ts
const datas = catalogo.colunas.filter((c) => c.tabela === tabela && /^(timestamp|date)/.test(c.tipo)).map((c) => c.coluna)
// toda data da tabela está em `colunas`, ou está retida numa família que a frase nomeia em outra cláusula (ex.: BD-13 (iv))
```
E acrescentar um termo «positivo» ao vocabulário da derivação, por exemplo `/\b(entram?|vêm|vem)\b/`
dentro de parênteses, com controle no (cr4b).

### WR-05: o (cr5) reconhece vínculo ao titular só por NOME de coluna igual a um `chave_titular` — tabela por titular ligada por outra chave (ex.: `agendamento_id`, `analise_id`) fica fora da classe

**File:** `src/features/privacidade/services/__tests__/exportacaoService.test.ts:1052-1058`
(`colunasDeVinculo`), `:1116-1121` (`ligadas`).

**Issue:** a classe é `{tabelas excluídas de família genérica} ∩ {tabelas com coluna chamada
candidatura_id|candidato_id}`. Uma tabela de configuração por titular que aponte para outra tabela do
titular por chave de outro nome é invisível:
- um template preenchido por `agendamento_id`;
- uma rubrica por `redacao_id`.

Ela cairia na cláusula «a configuração do próprio sistema», e o portão ficaria verde. Medido hoje, a
classe está vazia: as colunas `*_id` das 23 tabelas genéricas excluídas são só `vaga_id`,
`pergunta_id`, `opcao_id`, `item_id`, `model_id`, `previous_version_id`, `empresa_id`,
`pergunta_formulario_id` e `biblioteca_pergunta_id`. O residual T-44-102 do BD-21 cobre outro caso:
tabela que ganha coluna de vínculo depois. Este não está declarado.

**Fix:** derivar o vínculo também pelas chaves primárias das tabelas do titular. Toda coluna `<x>_id`
em que `<x>` (ou `<x>s`/`<x>es`) é tabela de `EXPORT_ALLOWLIST.tabelas` conta como vínculo. Ou, mais
firme, medir as FKs de `public` (só leitura) para um bloco `fks` do catálogo e usar o alvo da FK.
Controle no (cr5b): tabela genérica sonda com `agendamento_id`.

## Info

### IN-01: `vitest run … -t "<padrão>"` que não casa nenhum teste sai 0 («N skipped»), e `-t "(cr4)"` é regex que casa também «(cr4b)»

**File:** n/a (forma dos verifies). Medido:
`npx vitest run src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts -t "zzz-nao-existe"`
responde `Test Files 1 skipped (1) · Tests 5 skipped (5)` com `exit=0`.

**Issue:** todo verify que confia no código de saída de um filtro `-t` fica verde se o rótulo for
renomeado ou digitado errado. E um rótulo com parênteses é um GRUPO de regex, não um literal.

**Fix:** nos verifies e nas sondas, conferir a linha `Tests  N passed` com N ≥ 1, ou
`--reporter=json` com `numPassedTests > 0`. Escapar os parênteses: `-t "\(cr4\) WR-02"`.

### IN-02: o (cp3) diz «não está em arquivo nenhum de onde ele pode chegar ao titular», mas não lê `supabase/migrations/*.sql` (nem `.js`/`.md`/`.svg`)

**File:** `src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts:19-23, 51, 84-89`.

**Issue:** uma migration pode semear copy que chega ao titular por e-mail (`templates_email`). Hoje
nenhuma migration toca `templates_email` (`git grep templates_email -- supabase/migrations`: 0), e
`public/` só tem `logos/`. O alcance é escopo declarado, mas a frase do docblock é mais larga que ele.

**Fix:** acrescentar `supabase/migrations` com extensão `sql` ao `ALCANCE_CP3`, ou estreitar a frase do
docblock ao alcance real.

### IN-03: o bloco `colunas_fora_do_escopo` (2026-10-07) mostra colunas em PROD que o `colunas` versionado não tem para as mesmas tabelas

**File:** `docs/compliance/catalogo-vivo-44.json`.

**Issue:** 21 tabelas aparecem nos dois blocos. Duas divergem:
- `ai_call_logs`: só no bloco, `input_hash`;
- `vagas`: só no bloco, `secoes_extras` e `rubrica_ia`.

O gerador lê só `colunas`. Para tabelas inteiramente excluídas não há efeito no export, e o smoke de
drift vigia só as tabelas em escopo. Mas o arquivo passa a ter duas verdades sobre as colunas da mesma
tabela, e o (cr5) usa a união delas.

**Fix:** na próxima remedição do catálogo, reconciliar ou declarar no `finalidade` do bloco que
`colunas` pode estar atrasado para as tabelas excluídas.

### IN-04: «o roteiro que a equipe monta» — o roteiro é gerado pela EF `gerar-guia-entrevista` a pedido do RH e editável pelo RH; «monta» é aproximação aprovada pelo operador (BD-18)

**File:** `src/features/privacidade/services/exportacaoService.ts:587`.

**Issue:** a premissa medida (BD-18) é esta: invocado por RH autenticado, montado pela EF a partir do
scorecard e do perfil da vaga, editado pelo RH em 2 de 6 linhas. «A equipe monta» atribui a autoria à
equipe, e é verdade no sentido de «a equipe, por meio do sistema». Não é derivação nem origem
inventada, por isso não é achado de verdade. Fica aqui para o operador ver no checkpoint do 44-22,
onde a frase é aprovada.

**Fix:** nenhum obrigatório. Se o operador quiser precisão: «o roteiro que a equipe prepara, com
ajuda do sistema, para conduzir a sua entrevista» (pela UI-SPEC).

---

_Reviewed: 2026-10-07T12:53:34Z_
_Reviewer: Claude (gsd-code-reviewer, executado pelo 44-21)_
_Depth: deep_
