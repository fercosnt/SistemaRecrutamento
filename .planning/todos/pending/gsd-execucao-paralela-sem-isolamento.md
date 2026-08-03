---
id: gsd-execucao-paralela-sem-isolamento
created: 2026-07-29
source: Phase 42 wave 1 — relatado independentemente pelos executores de 42-01 e 42-03
priority: high
resolves_phase: null
tags: [gsd, processo, git, execucao-paralela, worktrees, m8]
---

# Execução paralela de planos GSD compartilha working tree e índice do Git — e agora isso pode induzir bypass do gate

`.planning/config.json` tem `workflow.use_worktrees: false`. Os planos de uma wave rodam em
subagentes **paralelos sobre a mesma working tree e o mesmo índice do Git**. Na wave 1 da Phase 42
(3 planos) isso produziu **três incidentes concretos**, relatados de forma independente por dois
executores:

| # | Incidente | Consequência |
|---|-----------|--------------|
| 1 | Um sibling rodando `git add -A` varreu o `.husky/pre-commit` **staged por outro plano** para dentro do próprio commit (`a990e99 feat(42-03)`) | Atomicidade e registro de medição perdidos. Conteúdo íntegro (verificado por `diff`) — defeito é de **atribuição** |
| 2 | A contagem `tsc` oscilou **97 ⇄ 98** enquanto siblings passavam por janelas TDD RED (um teste importando módulo que nasceria um minuto depois) | Commits **corretos** foram reprovados pelo hook |
| 3 | `fatal: cannot lock ref 'HEAD'` — um sibling moveu HEAD no meio do commit de outro | Commit abortado |

## O risco de segunda ordem (o que realmente importa)

A Phase 42 converteu `.husky/pre-commit` num **gate real** de não-regressão (baseline 97). A partir
daí:

> **Qualquer sibling numa janela RED reprova o commit de todos os outros agentes.**

E a reação natural — humana ou de agente — a um hook que reprova um commit que "obviamente está
certo" é `--no-verify`. Isso **desfaria exatamente** o que o plano 42-01 entregou e o que o plano
42-12 (INVENT-05, o único write destrutivo da fase) depende para satisfazer o portão de fase
destrutiva do milestone, que exige **zero `--no-verify`**.

Ou seja: sem isolamento, o gate que a fase acabou de comprar tende a ser desarmado pelo próprio
processo de execução paralela.

## Mitigação adotada na Phase 42 (a partir da wave 2)

**Serializar os planos autônomos das waves restantes** em vez de habilitar worktrees no meio da fase.
Razões:

- As waves 2 e 5 são 100 % `autonomous: false` (orquestrador executa, sem paralelismo) — hazard zero.
- A exposição real era pequena: **2 planos paralelos na wave 3** (42-09, 42-11) e **1 na wave 4** (42-10).
- Habilitar `use_worktrees` no meio de uma fase muda a semântica de execução para planos que não
  foram escritos com isso em mente — risco maior que o que resolve.
- Custo da serialização: ~15 min de wall-clock por plano. Barato perto de um gate desarmado.

Mitigações complementares, já adotadas pelos executores por conta própria e que devem virar padrão:

- **Nunca `git add -A` / `git add .`** num plano GSD. Sempre pathspec explícito dos arquivos que o
  plano declara em `files_modified`.
- **Diagnosticar antes de contornar.** Uma reprovação do hook é sinal. Antes de qualquer bypass:
  rodar `npm run -s lint 2>&1 | grep "error TS"` e conferir se os erros são **seus**. Se forem de
  módulo que um sibling está criando, a resposta é **esperar**, não `--no-verify`.

## Decisão pendente para as Phases 43–47

Escolher uma das duas, de forma consciente, antes da primeira wave com ≥2 planos autônomos:

1. **`workflow.use_worktrees: true`** — isolamento real. Custo: setup por agente, e planos precisam
   ser escritos sabendo que rodam em worktree.
2. **Serializar planos autônomos por wave** — o que a Phase 42 fez. Simples, sem mudança de
   maquinário, custa wall-clock.

**Recomendação:** (1) para as Phases 43, 44 e 47, que têm mais planos autônomos paralelos; (2) para
a 45 e a 46, onde o trabalho é majoritariamente destrutivo/orquestrado e a serialização já é
desejável por outras razões.

## Achado adjacente, já corrigido

`requirements.mark-complete` marcou **REVISAO-04 como `Complete`** a partir do frontmatter do plano
42-01 — mas o escopo negativo daquele plano diz explicitamente que ele **não** entrega o 5º evento
(quem entrega é o 42-08). O executor reverteu para `Pending`. Vale como alerta: a ferramenta infere
conclusão de requirement a partir do campo `requirements:` do plano, sem checar se o plano de fato o
completa. Em fases onde vários planos compartilham um requirement, isso pode marcar como entregue
algo que ninguém entregou — exatamente o "zumbi de compliance" que o CONSOL-04 da Phase 47 existe
para caçar, aplicado à nossa própria contabilidade.
