# 52-30 — Decisão de publicação dos consertos do UAT da 52 (Task 1)

Publicar, por push por sha para `main` (a Vercel publica), os consertos dos gaps G-52-2, G-52-4, G-52-4b e G-52-6
(planos 52-28 e 52-29) mais a rodada de conserto «consertar agora» dos chips e notas do cartão de entrevista
(`a0f24b76`, decidida pelo operador na primeira parada desta task). Uma chave por linha; o `<verify>` da Task 1 lê
este arquivo por máquina.

decisao: publicar
revisao: 52-REVIEW-UAT-2.md
warnings: 0
autorizacao: 52-UAT.md

Com `warnings: 0` no review de maior N, o CONTEÚDO publicado é o que o operador decidiu no UAT, verbatim em
`52-UAT.md` § «Decisões do operador sobre o escopo dos consertos (2026-10-12, AskUserQuestion, verbatim)»:

> - G-52-4 — linha de prazo no estado concluído: «Esconder (Recommended)» — usar `concluidas`; carregando/erro mantém a linha; nenhum prazo novo inventado.
> - G-52-6 — escopo dos selos: «Todos os selos (Recommended)» — um conserto em getStatusInfo para todos os selos (inclui «Aguardando a equipe»; concluidas.test:210-211 muda junto).
> - «Cancelada» em AgendamentoCandidatoCard.tsx:62 (mesmo card, mesmo defeito): «Entra junto (Recommended)».

O único código além dessas três decisões é a rodada «consertar agora» dos chips e notas (abaixo), decidida pelo
operador por escrito na rodada 1 desta task e revisada no `52-REVIEW-UAT-2.md` (critical 0, warning 0, info 5,
`reviewed_head` a0f24b760fa81d7d7da5ee92e962c09a9a6a6fa5, `diff_base` 87cfe0ea503f5b7e3c16f91ff53cff5c5f680342 =
`refs/gsd/52-26/sha`). O review 1 (`52-REVIEW-UAT-1.md`, critical 0, warning 1, info 7, `reviewed_head` 8010006e) foi
superado por ele; a disposição do seu único WR fica registrada abaixo.

## Disposição do review 1 (52-REVIEW-UAT-1.md, rodada 1)

disposicao_WR-01: backlog — WR-01 do 52-REVIEW-UAT-1: o teste de contraste do Raven (`AvaliacaoRavenScreen.shell.test.tsx:364-367`) compara cores pela `contraste()` do medidor SEM compor o alfa, então um ladrilho ou borda translúcidos (`bg-white/60`) passariam com 13,39:1; hoje as seis classes lidas do DOM são opacas e o indicador tem 13,39:1 de verdade. Proposta do revisor: trocar `contrasteEntre` por `medidor.contrasteDeClasses` nos quatro pares (borda/fundo, borda/anel, glifo/fundoSelo, foco/fundo), ou afirmar `corDeClasse(t).a === 1` nos seis tokens — só o teste muda, nenhum componente. Operador (rodada 1): backlog.

## Residuais (cada item com o pior caso medido)

residual_chips_agendamento: consertado

Consertado em `a0f24b76` (`fix(52-30): chips e notas do cartao de entrevista opacos e legiveis — o mesmo par dos selos (G-52-6); medidor com os sete cenarios em alvo`; 3 arquivos: `AgendamentoCandidatoCard.tsx`, `AgendamentoCandidatoCard.test.tsx`, `scripts/p52_contraste.cjs`), revisado em `52-REVIEW-UAT-2.md` (critical 0, warning 0). Cobre os cinco chips do `STATUS_CONFIG`, o descritor de reserva (status fora do mapa — IN-01 do review 2: mesmo cartão, mesmo defeito, declarado no commit, inalcançável pelo tipo de hoje) e as duas notas coloridas do mesmo cartão. Antes (52-28, INFORMATIVO, pior caso sobre o vidro branco): Agendada 1,33 · Em andamento 1,14 · Concluída 1,46 · Reagendada 1,44 · Não compareceu 1,46 · nota reagendada 1,45 · nota cancelada 1,18. Depois (medidor em `a0f24b76`, os sete cenários passados de `informativo` a `alvo` 4,5:1 no MESMO commit): `ALVO agendamento-chip-agendada: min=6.49 … OK` · `ALVO agendamento-chip-em_andamento: min=7.15 … OK` · `ALVO agendamento-chip-concluida: min=9.37 … OK` · `ALVO agendamento-chip-reagendada: min=6.38 … OK` · `ALVO agendamento-chip-nao_compareceu: min=9.37 … OK` · `ALVO agendamento-nota-reagendada: min=6.38 … OK` · `ALVO agendamento-nota-cancelada: min=6.80 … OK`; `CONTRASTE OK: 8 cenario(s) no alvo; 1 controle(s) mordem; amostras=480x286`; `--auto-teste` 24/24.

residual_contraste_cartao: backlog

Nota de backlog pedida pelo operador (rodada 1): o texto do cartão de vidro branco do painel herda o contraste do vidro; a AMOSTRA de cinco estilos do 52-29 mediu o PIOR CASO sobre o gradiente de fundo, através da pilha real de vidro, sem superfície local: título 1,78 (texto grande, limiar 3:1); departamento/data 1,57; etapa 1,48; eyebrow «Próximo passo» 1,39; frase do «Próximo passo» 1,67 (limiar 4,5:1). É uma AMOSTRA: a `PrazoEstimadoLinha` (texto e chip «Estimativa»), o rótulo do «Retirar minha candidatura» e o eyebrow «Sua entrevista» usam a mesma pilha e NÃO foram medidos. Consertar é um plano novo (não este); os cinco cenários `INFORMATIVO painel-*` do medidor seguem vigiando as âncoras.

## Disposição dos INFO do review 2 (52-REVIEW-UAT-2.md)

disposicao_IN-01: aceitar — o descritor de reserva mudou junto dos chips; registrado acima como coberto por `residual_chips_agendamento: consertado`.
disposicao_IN-02: aceitar — duas células da 52-UI-SPEC (:585, :822) ainda chamam os chips e as notas de residual translúcido; emenda datada planning-only, fora do portão de código, a fazer no fecho da fase.
disposicao_IN-03: aceitar — completude da guarda ancorada só em `icon:`; tsc e medidor são as duas defesas que o Passo 0b roda antes do push.
disposicao_IN-04: backlog — a lista literal de cinco chips do medidor é a forma «iteração sobre lista literal» do CLAUDE.md: um chip novo fica fora da vigilância com o teste verde; trocar por derivação do mapa de status.
disposicao_IN-05: aceitar — a mensagem `CENARIO DESCOLADO DO FONTE` de um `informativo` não aponta «passe o cenário a alvo»; conveniência, a regra está escrita no `<action>` da Task 1.

## Janela única

janela_unica: confirmada
decidido_em: 2026-10-12 12:01 -03

Confirmada por escrito pelo operador três vezes neste plano (abaixo, verbatim): ao iniciar a execução, na rodada 1 e
na rodada 2. Nenhuma outra janela publica — migration, EF ou push — até o fim do 52-30.

## Resposta do operador

Confirmação escrita inicial (ao iniciar a execução do 52-30, 2026-10-12, verbatim):

```
Confirmo: nenhuma outra janela publica (push, apply ou deploy) até o fim do 52-30.
```

Rodada 1 (Task 1, sobre o 52-REVIEW-UAT-1, 2026-10-12, verbatim):

```
janela única: confirmo + WR-01: backlog + residual_chips_agendamento: consertar agora + residual_contraste_cartao: backlog
Motivo dos chips: mesmo defeito e mesmo par opaco dos selos (G-52-6); com os selos consertados, os chips e as notas do card de entrevista (1,14–1,46; nota de cancelada 1,18) ficariam os únicos ilegíveis do painel, e a nota de cancelada é justamente a que o candidato mais precisa ler. No residual do cartão, registre no backlog que a amostra mediu o pior caso sobre o gradiente e que PrazoEstimadoLinha, «Retirar minha candidatura» e o eyebrow «Sua entrevista» ficaram sem medir.
```

Rodada 2 (Task 1, sobre o 52-REVIEW-UAT-2, 2026-10-12 12:01 -03, verbatim):

```
janela única: confirmo + publicar. IN-04: backlog (a lista literal de cinco chips do medidor é a forma «iteração sobre lista literal» do CLAUDE.md: um chip novo fica fora da vigilância com o teste verde; trocar por derivação do mapa de status). Demais INFO: aceitar.
```

## Backlog

Para o orquestrador copiar aos «Pending Todos» do STATE.md (nenhum destes muda código neste plano):

1. **residual_contraste_cartao** — texto do cartão de vidro branco do painel do candidato sem superfície local; amostra de cinco estilos mediu o pior caso sobre o gradiente: título 1,78 (vs 3:1), departamento/data 1,57, etapa 1,48, eyebrow «Próximo passo» 1,39, frase 1,67 (vs 4,5:1). Não medidos, mesma pilha: `PrazoEstimadoLinha` (texto e chip «Estimativa»), rótulo «Retirar minha candidatura», eyebrow «Sua entrevista». Plano novo; os cinco `INFORMATIVO painel-*` do `p52_contraste.cjs` passam a `alvo` no mesmo commit do conserto.
2. **IN-04 (52-REVIEW-UAT-2)** — `CHIPS_AGENDAMENTO` em `scripts/p52_contraste.cjs:291-297` é lista literal de 5 dos 6 status (omite `cancelada` sem razão de hoje): forma «iteração sobre lista literal» do CLAUDE.md; derivar do `STATUS_CONFIG` pela mesma forma do teste (ou, no mínimo, acrescentar `cancelada`: 9 cenários no alvo).
3. **WR-01 (52-REVIEW-UAT-1)** — `AvaliacaoRavenScreen.shell.test.tsx:364-367`: trocar `contrasteEntre` por `medidor.contrasteDeClasses` nos quatro pares (ou afirmar `corDeClasse(t).a === 1` nos seis tokens) para que `bg-white` → `bg-white/60` no fonte deixe o caso vermelho. Só o teste muda.
