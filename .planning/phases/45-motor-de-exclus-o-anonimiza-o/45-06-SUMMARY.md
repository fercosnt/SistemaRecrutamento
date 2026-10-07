---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 06
subsystem: database
tags: [supabase, prod-apply, edge-function, lgpd, exclusao, tracer, uat-navegador]

requires:
  - phase: 45-03
    provides: "as migrations `20260805000001`/`000002`, a RPC `registrar_pedido_exclusao`/`cancelar_pedido_exclusao` e o esqueleto da EF `executar-direito-titular`"
provides:
  - "O tracer NÃO-destrutivo aplicado em PROD: `solicitacoes_dados` com as 7 colunas de exclusão, `config_janela_exclusao`, as duas RPCs de estado — md5 byte-perfeito, ledger reconciliado"
  - "`database.types.ts` regenerado (5820 → 5969 linhas), fechando de carona a dívida dos objetos da Phase 44"
  - "A prova ponta a ponta do pedido no navegador, na conta descartável: 1 linha `exclusao`/`agendado` com EXATAMENTE 15 dias, cancelável pela própria página, nada apagado"
affects: [45-07, 45-10, 45-11]

actuals:
  tasks: 3
  commits: 3

key-files:
  created:
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-06-EVIDENCIA-APPLY.md
    - .planning/45-CONTA-DESCARTAVEL.md
  modified:
    - database.types.ts

key-decisions:
  - "O md5 do critério de aceitação, comparado como estava escrito, NÃO passaria — a correção do critério está registrada em `45-06-EVIDENCIA-APPLY.md` § «Correção ao critério de aceitação»"
  - "Os tipos foram gerados para arquivo TEMPORÁRIO primeiro: `npm run db:types` usa `>`, que trunca antes de executar"
  - "A sonda de fronteira discrimina pela DIFERENÇA entre os corpos dos dois 401 (gateway × handler), não pelo status"

requirements-completed: [ERASE-05, ERASE-06]
---

# 45-06 — Apply do tracer, tipos e a prova ponta a ponta do pedido

> **SUMMARY de escrituração, escrito em 2026-10-07.** O plano foi executado entre 2026-08-05 e
> 2026-08-22, mas o par canônico `PLAN`/`SUMMARY` nunca foi fechado. A evidência sempre existiu,
> com outros nomes. Este documento **não acrescenta medição nenhuma**: ele aponta para o que já
> foi medido e repete os números que estão lá. Se divergir de uma das fontes abaixo, vale a fonte.

## As três tasks

| Task | Quando | Evidência | Resultado |
|---|---|---|---|
| 1 — apply de `20260805000001`/`000002` + ledger + md5 | 2026-08-05 | `45-06-EVIDENCIA-APPLY.md` · `71e99234` | ✅ as duas aplicadas, md5 bate, zero 42601, 3 FKs `NO ACTION` em `a`, contagens inalteradas, auto-verificação executou **e reverteu** |
| 3 — regenerar `database.types.ts` | 2026-08-05 | `c9745bdd` | ✅ +149 linhas, tsc 97 = baseline, suíte 1632/1633, build verde |
| 2 — deploy da EF + prova no navegador | 2026-08-22 | `.planning/RUNBOOK-45-06-T2-E-45-11-T3.md` (FASE 1) · `.planning/45-CONTA-DESCARTAVEL.md` · `1aac20ce` | ✅ com as duas ressalvas abaixo |

A Task 2 rodou só em 2026-08-22, junto com a execução real do `45-11`, porque as duas são metades
do mesmo fluxo sobre a mesma conta descartável (o runbook explica por que a ordem foi corrigida).

## O que a Task 2 mediu (FASE 1 do runbook)

- **1 linha** `tipo='exclusao'`, `situacao='agendado'`, `executar_em − solicitado_em` = **exatamente
  15 dias**; `cancelado_em`/`atendido_em`/`causa` nulos.
- 2 candidaturas com `encerrada_a_pedido_em` preenchida e `deleted_at` NULL (o RH continua vendo);
  `historico` inalterado em 7; **zero** `auto_rejeitado`; **zero** notificação `evento='decisao'`.
- Storage intacto em 3 objetos, `auth.users` intacto em 30 — **nada foi apagado**.
- Idempotência: a segunda invocação devolve 200 com a **mesma** `executar_em`, e o total segue 1.
- CTA medido: 50px de altura, não full-bleed, glass-branco; confirmação em duas etapas, só o botão
  final em vermelho.
- Tela: «Exclusão agendada» com «Cancelar a exclusão», persistindo após recarregar.

## ⚠ O que NÃO passou, e segue registrado como tal

1. **320px não foi testado.** O `resize_window` não alterou o viewport (`clientWidth` seguiu 1425).
   Não há overflow no viewport real, mas essa **não** é a mesma afirmação. Continua aberto.
2. **Divergência de redação sobre a data.** O critério deste plano pede a data «por extenso»; a tela
   renderiza `06/09/2026`. Fato que reduz o alcance da divergência: o `45-08-PLAN.md:276`, que
   especificou o Estado B, **define** «por extenso» como `dd/mm/aaaa` via `toLocaleDateString`. O
   código cumpre o 45-08; quem diverge é a palavra no critério do 45-06. A decisão de copy (manter
   o numérico ou passar ao extenso de verdade) **não foi tomada aqui** e fica com o operador.

## Achado de carona (já roteado)

O guard de `listar_pedidos_dados()` aceita `'administrador'` **ou** `'rh'`, e `usuarios_rh` nunca
atribui `'rh'`. Isso corrobora o BD-8 por outro ângulo. Hoje está no G3 / EXPORT-05 e na Phase 50.
