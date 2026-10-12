# Phase 52 — decisão do operador de 2026-10-11 (depois do bloco C): gaps antes do UAT e PITR recusado

Registro verbatim da mensagem do operador no /gsd-execute-phase 52, depois do 52-18 (bloco C no ar).

## Texto do operador (verbatim)

«Antes do UAT: /gsd-plan-phase 52 --gaps para o WR-04 (pontuar_sjt: duplicata e completude comparadas como uuid, não
texto) e, no mesmo plano, o F13 (o servidor recusa salvar a avaliação de entrevista sem todas as competências
pontuadas). O5 e o bug text[] do p49_12 vão para o backlog. Assim o UAT da 52 testa a pontuar_sjt final. Suba os 2
commits de .planning junto com o próximo push.
DECISÃO (2026-10-11): NÃO vou ligar o PITR (custo ~US$100/mês). Emende a D-41 no 52-CONTEXT.md e nos planos
52-19/52-21, trocando «pitr_enabled = true» por: (1) backup diário COMPLETED posterior ao último apply da fase,
conferido pela Management API (walg_enabled = true; 8 backups físicos diários por volta de 06:28 UTC); (2) export
prévio, em arquivo local fora do git, exatamente das linhas e objetos de Storage da população aprovada, com md5
registrado no SUMMARY, para restauração cirúrgica; (3) o apply do 52-21 roda na manhã seguinte a um backup diário.
Registre também no checklist de fecho do M8 que o PITR foi recusado.»

## O que isso cria

1. **Plano de gap (gap_closure) ANTES do UAT da 52**, um só plano com:
   - **WR-04** (52-REVIEW-BANCO-1; `52-18-DECISAO-OPERADOR.md`): `public.pontuar_sjt` compara `pergunta_id` como
     **uuid**, não texto, tanto na checagem de duplicata quanto na de completude
     (`count(DISTINCT (r->>'pergunta_id')::uuid)`), recusando o payload com pergunta repetida em caixa diferente.
     Migration própria, depois da 0003, **sem tocar a 0003**.
   - **F13** (52-07; 52-REVIEW-PORTAO-1 IN-03): `salvar_avaliacao_entrevista` recusa no **servidor** salvar sem
     **todas** as competências pontuadas (1–5); hoje só o cliente exige.
   - O push desse plano leva junto os 2 commits só-`.planning/` deixados locais pelo 52-18
     (`8fa8193a` SUMMARY, `e9dfc369` STATE/ROADMAP) — e quaisquer outros só-`.planning/` acumulados até lá.
2. **Backlog** (`.planning/todos/pending/`): **O5** (`getScores` ainda manda `metadata.dimensoes[].percentil` pela
   rede — T-52-33/F15) e **WR-05** (`supabase/tests/p49_12_pos_estado.sql:126,135`, `text[] || 'literal'` → 22P02).
3. **Emenda da D-41** (52-CONTEXT.md, 52-19-PLAN.md, 52-21-PLAN.md): sai «`pitr_enabled = true`»; entra:
   1. backup diário **COMPLETED** posterior ao último apply da fase, conferido pela Management API (só leitura;
      `walg_enabled = true`; 8 backups físicos diários por volta de 06:28 UTC);
   2. **export prévio**, em arquivo local **fora do git**, exatamente das linhas e dos objetos de Storage da
      população aprovada, com **md5 registrado no SUMMARY**, para restauração cirúrgica;
   3. o apply do 52-21 roda **na manhã seguinte a um backup diário**.
4. **Checklist de fecho do M8** (STATE.md): o PITR foi **recusado** pelo operador em 2026-10-11 (custo ~US$100/mês).
5. Mantém-se (de `52-18-DECISAO-OPERADOR.md`): a varredura do 52-19 usa a lista da D-30 (`+claudeN`, `+cand1`,
   `@teste.com`, `@invalido.local`) MAIS a entrada por vaga de teste; a candidatura `3a9254c3` tem que aparecer na
   população medida.

## Segunda emenda da D-41 (operador, 2026-10-12 21:28Z) — ver `52-DECISAO-2026-10-12-bloco-d-hoje.md`

Supera os itens 3.1 e 3.3 acima: o ponto de restauração do bloco D é o backup físico COMPLETED
`2026-10-12T06:31:59Z` (id 1941159569) + reaplicação das migrations do git aplicadas depois dele
(`20261011000006` e as do 52-32) + o export prévio (3.2, inalterado); pré-condição medida antes do 52-21:
nenhuma escrita em PROD fora de «migrations do git + contas de teste da população exportada» desde
06:31:59Z (0 vagas criadas/alteradas, 0 candidaturas criadas) — escrita fora da lista = PARAR. Tudo hoje,
na ordem 52-32 → `/gsd-verify-work 52` → 52-19 → 52-21 → 52-22. Texto do operador verbatim e a medição
independente desta janela estão no arquivo citado.
