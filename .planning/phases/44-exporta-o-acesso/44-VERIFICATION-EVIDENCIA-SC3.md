# Phase 44 — Evidência do SC#3 (asserção 2 + prova de mordida)

**Executado pelo orquestrador** (subagentes GSD não recebem os tools MCP do Supabase).
Projeto `isljnozzlvckrgjjbjwp`. **Tudo READ-ONLY** — zero statement de escrita.

> Este arquivo existe porque a asserção 2 do SC#3 não é automatizável em CI: ela lê o **catálogo
> vivo de PROD**, e o `05-export-allowlist-drift.sql` só tem significado quando executado contra o
> banco real. A prova de mordida é um **experimento**, não uma asserção — por isso a evidência é
> um par antes/depois com carimbo, e não uma linha de teste.

---

## Passo C — o smoke contra PROD

| | |
|---|---|
| Medição das colunas vivas | **2026-08-03T19:58:54Z** |
| Reconfirmação (sem mudança) | **2026-08-04T01:16:18Z** — ainda **392** |
| Colunas vivas nas 29 tabelas do escopo | **392** |
| CTE `allowlist` | **358** |
| CTE `excluidas` | **34** |
| União | **392** |
| Interseção `allowlist ∩ excluidas` | **0** |

**Resultado: 0 linhas.** As três direções, todas zeradas:

```
COLUNA NOVA NO BANCO — sem veredito : 0
COLUNA DA ALLOWLIST SUMIU DO BANCO  : 0
COLUNA EXCLUÍDA SUMIU DO BANCO      : 0
```

**Toda coluna viva das 29 tabelas em escopo tem exatamente um veredito** — 358 na cópia, 34 fora com
razão nomeada, nenhuma sem decisão, nenhuma decidida duas vezes. `358 + 34 = 392` fecha na
identidade, não por aproximação.

### ⚠ O que a primeira execução encontrou, e por que ela importa mais que o verde

A **primeira** execução deste smoke (versão de `75fb231`) devolveu **34 linhas contra um sistema
correto**, e o defeito era do guarda, não do dado.

O predicado era `viva AND NOT IN allowlist`. Mas a allowlist é, **por desenho**, um subconjunto das
colunas vivas: 358 de 392. As 34 restantes não eram drift — cada uma tinha veredito, explícito em
`decisoes_por_coluna` ou derivado da regra R2 de ponteiros (`_by`, `por_usuario`, `ator`,
`agendado_por`, `realizado_por`, `revisada_por`).

O cabeçalho do próprio arquivo afirmava que uma linha significa *"ninguém decidiu ainda — esta linha
quebra o silêncio"*. Era falso para as 34. Num sistema **correto**, o smoke devolveria 34 linhas
**para sempre**.

**Por que isso é a mesma classe de defeito que o P39/CR-02 que o cabeçalho cita.** Lá, uma guarda
que nunca podia falhar. Aqui, uma que falha sempre. As duas são igualmente inúteis, e a segunda é
pior num aspecto: ela **derrota a própria prova de mordida**, porque somar 1 a 34 não se distingue
de ruído. Um relatório que sempre mostra 34 linhas treina todo mundo a fechá-lo, e a linha 35 — o
vazamento real — passa despercebida.

**Correção aplicada (`d0d14fe`):** o universo comparado passou de `allowlist` para
`allowlist ∪ excluidas`, e nasceu uma terceira direção — `COLUNA EXCLUÍDA SUMIU DO BANCO`, o
**veredito órfão**. Ela não denuncia vazamento: denuncia o YAML falando de uma coluna fantasma. E é
esse YAML que a **Phase 45 herda como plano de exclusão**, então um veredito órfão ali é um passo de
exclusão apontando para o nada.

---

## Passo D — a prova de mordida, nas DUAS direções

Executada sobre cópia em `/tmp`, fora do repositório. **O arquivo versionado nunca foi alterado**
(`git status` limpo, confirmado após cada execução).

| # | Mutação | União | Linhas | Coluna denunciada | Veredito |
|---|---|---|---|---|---|
| — | **baseline, arquivo intacto** | 392 | **0** | — | — |
| D1 | remove `('autorizacoes','consent_text_hash')` da CTE **`allowlist`** | 391 | **1** | `autorizacoes.consent_text_hash` | `COLUNA NOVA NO BANCO — sem veredito` |
| D2 | remove `('agendamentos_entrevista','entrevistador')` da CTE **`excluidas`** | 391 | **1** | `agendamentos_entrevista.entrevistador` | `COLUNA NOVA NO BANCO — sem veredito` |

**Por que as duas mutações, e não só a primeira.** D1 sozinha provaria apenas que o smoke lê a
allowlist — que era verdade **antes** da correção também. É **D2** que prova que o universo é a
**união**: remover uma linha do bloco de *exclusões* também acusa. Juntas, elas provam exatamente a
propriedade que o defeito corrigido destruía.

A coluna escolhida em D1 não é arbitrária: `consent_text_hash` é uma das **quatro do BD-6** — as
colunas de consentimento versionado que o `pii-inventory.yaml` não menciona e que motivaram a fase
inteira a ler o catálogo vivo em vez do documento datado.

---

## Cadeia de custódia dos números

Todo número deste arquivo foi medido contra PROD entre `2026-08-03T19:38:03Z` e
`2026-08-04T01:16:18Z`, e nenhum vem de documento datado — a regra herdada de
`04-invent05-blast-radius.sql:30-40`. O `catalogo-vivo-44.json` (`9640093`) carrega
`meta.medido_em` do `now()` do próprio banco, não do relógio da máquina.

Totais de escopo em ambas as pontas da sessão: **67 tabelas / 1013 colunas / 104 FKs**, medidos às
06:09 e às 19:37 UTC. **Delta zero.**
