# 52-32 — Decisão: aplicar a 0007, regenerar os tipos e empurrar (Task 4)

Aplicar em PROD a migration `20261011000007_p52_testes_das_minhas_candidaturas.sql` (uma função de leitura,
`public.ler_testes_das_minhas_candidaturas()`, nenhum dado, nenhuma policy), regenerar `database.types.ts` do banco vivo
DEPOIS do apply (os dois casts estreitos retirados no mesmo commit, revisados num review próprio — Task 6) e empurrar o
52-32 (Task 7), levando os commits só-`.planning/` locais. Uma chave por linha; o segundo `<verify>` da Task 4 lê este
arquivo por máquina.

decisao: aplicar
revisao: 52-REVIEW-G7B-1.md
warnings: 1

O review de maior N é o `52-REVIEW-G7B-1.md` (commit `a1075813`; `reviewed_head` 31facac937bfc71e34ec282b7d5d21575bb84e92,
`diff_base` 954b3e4b33a6cd290241793bf1df000083a49d81 = `refs/gsd/52-31/sha`; critical 0 · warning 1 · info 8; «Não achei
nada que torne o apply da `20261011000007` ou o push errado ou inseguro»; nenhum achado destrutivo). Portão no modo
revisão: `PORTAO OK … reviewed_head=31facac9… modo=revisao` (FRONTEIRA §Task 4). Com `warnings: 1`, o conteúdo
publicado vale pela resposta do operador ao WR-01 (abaixo); o conteúdo foi pedido pelo próprio operador
(`52-31-DECISAO.md`, R1 → plano novo 52-32; WR-02 → 52-32; R4 → tipos regenerados no 52-32).

## Disposição dos WARNINGS (52-REVIEW-G7B-1.md)

disposicao_WR-01: backlog — WR-01: a varredura de colunas do POS da 0007 (`20261011000007_p52_testes_das_minhas_candidaturas.sql:253-256`, `\mv\.("?)([a-z_]+)\1` + a igualdade; `:237-249` âncora da junção e contagem de `jsonb_build_object(`) não enxerga a linha inteira (`to_jsonb(v)`) nem um segundo alias de `public.vagas` — provado pelo revisor (M3 `'tudo', to_jsonb(v)`; M7 `JOIN public.vagas w … 'titulo', w.titulo`): as duas passam o POS e só morrem em `P52A FAIL (c)` do smoke no ensaio. Proposta do revisor: backlog para o molde das próximas funções p52 (não reescrever a 0007). Operador: «WR-01: backlog».

## D-52-G7B (1, 2 e 5 copiadas da parada da tracer; 6 desta parada)

d52_g7b_1: confirmada
d52_g7b_2: confirmada
d52_g7b_5: confirmada
d52_g7b_6: confirmada
deriva_postgrest: aceitar

- D-52-G7B-1, -2 e -5: confirmadas na parada da tracer (bloco abaixo, copiado byte a byte da FRONTEIRA §Task 2); o
  review G7B-1 não pôs nenhuma das três em causa.
- D-52-G7B-6: os tipos são regenerados DEPOIS do apply, com os dois casts retirados no mesmo commit, revisados num review
  próprio (`52-REVIEW-G7B-<M>`, Task 6) antes do push. Operador: «D-52-G7B-6: confirmo».
- Deriva: o arquivo regenerado leva `PostgrestVersion: "13.0.5"` (hoje `"14.5"`), o valor do banco vivo, sem edição à
  mão; medido `tsc_postgrest: 14.5=89 13.0.5=89` (§Task 1). Operador: «deriva PostgrestVersion: aceitar».

## Residual

residual_curriculo_excluida: aceitar

Candidatura EXCLUÍDA com currículo de vaga não pública segue «Vaga não identificada» no bloco de currículos (a 0006 só
devolve candidaturas vivas); medido 0 candidaturas excluídas em PROD, nenhum escritor de `candidaturas.deleted_at`.
Operador: «R1 (residual_curriculo_excluida): aceitar».

## INFO (52-REVIEW-G7B-1.md)

IN-01..IN-08: aceitas pelo operador («INFO IN-01..08: aceitar»).

## Janela única

janela_unica: confirmada
decidido_em: 2026-10-12 22:05 -03

Nenhuma outra janela publica — migration, EF, push — até o fim do 52-32; a janela de cadastro só cria vagas INATIVAS
pela interface, não publica nem commita até o fim do 52-32. Operador: «janela única: confirmo (…)».

## Resposta do operador — parada da tracer

Recebida 2026-10-12 ~20:40 -03 (≈2026-10-12T23:40Z), repassada pelo orquestrador (`/gsd-execute-phase`) no despacho da sessão B, como bloco `<operator_response verbatim="true">`. Copiada byte a byte, sem paráfrase:

```text
continuar + D-52-G7B-1/-2/-5: confirmo.
Nota do operador sobre a -2: ciente de que o candidato ainda no funil segue fazendo as avaliações de vaga pausada/fechada/apagada (o servidor já permitia; o conserto é de leitura). Encerrar o funil de uma vaga é decisão do RH sobre as candidaturas, não efeito do status da vaga.
```

## Resposta do operador

Resposta escrita (Task 4, sobre o 52-REVIEW-G7B-1, recebida 2026-10-12 ~22:05 -03 ≈ 2026-10-13T01:05Z, repassada pelo
orquestrador no despacho da segunda perna da sessão C, verbatim):

```text
janela única: confirmo (a janela de cadastro só cria vagas INATIVAS pela interface; não publica nem commita até o fim do 52-32) + D-52-G7B-6: confirmo + deriva PostgrestVersion: aceitar + R1 (residual_curriculo_excluida): aceitar + WR-01: backlog + INFO IN-01..08: aceitar.
```

## Backlog

Para o orquestrador copiar aos «Pending Todos» do STATE.md (nada disto muda código neste plano):

1. **WR-01 (52-REVIEW-G7B-1)** — o POS-PORTAO da `20261011000007` (e da 0006 em PROD, mesmo limite) varre só
   `v.<coluna>` (`\mv\.("?)([a-z_]+)\1` + igualdade do conjunto, uma `jsonb_build_object(`, âncora literal da junção):
   não enxerga a linha inteira de `vagas` (`to_jsonb(v)`) nem um segundo alias de `public.vagas` — provado pelo revisor
   (M3 `'tudo', to_jsonb(v)` e M7 `JOIN public.vagas w … 'titulo', w.titulo` passam o POS; só `P52A FAIL (c)` do smoke
   reprova, no ensaio que precede todo pin de apply). Conserto proposto para o molde das próximas funções p52, depois da
   contagem de `jsonb_build_object(`:
   `IF lower(v_cod) ~ '\m(to_jsonb|to_json|row_to_json|jsonb_strip_nulls)\s*\(\s*v\s*\)' OR lower(v_cod) ~ '\mv\.\*' THEN RAISE EXCEPTION 'P52-0N POS-PORTAO: % projeta a linha inteira de vagas', c_sig; END IF;`
   e `IF (length(v_cod) - length(replace(v_cod, 'public.vagas', ''))) / length('public.vagas') <> 1 THEN RAISE EXCEPTION 'P52-0N POS-PORTAO: % cita public.vagas mais de uma vez (segundo alias)', c_sig; END IF;`
   + uma mutação de RECUSA (`A15`-equivalente) no runner que o prove por execução. A 0007 não se reescreve.

## Review dos tipos (Task 6)

revisao_tipos: 52-REVIEW-G7B-2.md
warnings_tipos: 0
tipos_decisao: empurrar
autorizacao_tipos: d52_g7b_6 confirmada em 2026-10-12 22:05 -03

O review de maior N é o `52-REVIEW-G7B-2.md` (commit `2a02c27b`, do orquestrador; `reviewed_head`
913b83a8355f932f2fa2fd00c235c9720ca10965, que contém o commit dos tipos `8a516a94`; `diff_base`
954b3e4b33a6cd290241793bf1df000083a49d81 = `refs/gsd/52-31/sha`; critical 0 · warning 0 · info 7 · `status: approved`;
nenhum achado destrutivo). Portão no modo revisão, 2026-10-13T01:43:04Z: `PORTAO OK:
revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-G7B-2.md reviewed_head=913b83a8355f932f2fa2fd00c235c9720ca10965
pin=- modo=revisao`. Pela regra da Task 6 («o operador só se o review deixar warning ou achar algo destrutivo»), o
operador NÃO foi chamado: a autorização é a D-52-G7B-6 e a `deriva_postgrest: aceitar` da Task 4 (acima, verbatim).
IN-01..IN-07 do G7B-2: o revisor marca todas «Fix: Nenhuma»; não são decisão deste arquivo.
