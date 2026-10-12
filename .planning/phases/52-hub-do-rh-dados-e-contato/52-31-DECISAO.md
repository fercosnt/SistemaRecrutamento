# 52-31 — Decisão do G-52-7: aplicar a 0006 e empurrar (Task 4)

Aplicar em PROD a migration `20261011000006_p52_vagas_das_minhas_candidaturas.sql` (uma função de leitura,
`public.ler_vagas_das_minhas_candidaturas()`, nenhum dado, nenhuma policy) e empurrar o G-52-7 por push por sha para
`main` (a Vercel publica), levando os três commits só-`.planning/` locais (`de7d5f1f`, `7f46b8ee`, `73976117`). Uma
chave por linha; o segundo `<verify>` da Task 4 lê este arquivo por máquina.

decisao: aplicar
revisao: 52-REVIEW-G7-1.md
warnings: 2
autorizacao: 52-UAT.md

O review de maior N é o `52-REVIEW-G7-1.md` (commit `e6fbeaf9`; `reviewed_head` 133429d103c7e70d589b6068f33dbb76fc3f3d46,
`diff_base` 70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8 = `refs/gsd/52-30/sha`; critical 0 · warning 2 · info 9; «Não achei
nada crítico e nada destrutivo.»). Com `warnings: 2`, o CONTEÚDO publicado vale pela resposta do operador aos dois WR
(abaixo). Como contexto, o conteúdo foi pedido pelo próprio operador (`52-UAT.md`), verbatim:

> Promoção do gap (2026-10-12, `52-UAT.md:723`): «O único item novo é o G-52-7 (vaga inativa → «Vaga não encontrada»), que quero tratado DENTRO da 52, não no backlog.»
>
> Preferência que amarra o desenho (2026-10-12, na invocação `/gsd-plan-phase 52 --gaps`): «Preferência do operador para o G-52-7: RPC SECURITY DEFINER com guarda de posse (só candidaturas do próprio candidato), devolvendo APENAS os campos que o card usa (título e departamento), no molde das leituras da 52 (allowlist, prova por papel, smoke com mordida). Não abrir a linha inteira de vagas por policy. Decidir explicitamente o caso de vaga com deleted_at (minha inclinação: o candidato continua vendo o título da própria candidatura).»

## Disposição dos WARNINGS (52-REVIEW-G7-1.md)

disposicao_WR-01: backlog — WR-01: a varredura «por forma» do POS sobre `v.<coluna>` (`20261011000006_p52_vagas_das_minhas_candidaturas.sql:250-256`, `regexp_matches(v_cod, '\mv\.([a-z_]+)', 'g')`) é sensível a caixa: `v.Titulo` / `v.TITULO` / `v."titulo"` passam pelo POS e só o smoke reprova, pelo valor. Proposta do revisor: `FROM regexp_matches(lower(v_cod), '\mv\.("?)([a-z_]+)\1', 'g') AS m;` usando `m[2]`. Operador: «WR-01: backlog».
disposicao_WR-02: backlog — entra no 52-32 (o capturar() precisa fotografar vagas antes do ensaio da limpeza no 52-20). WR-02: `capturar()` do `scripts/p52_ensaio.cjs` não tem chave para `public.vagas` — um `UPDATE public.vagas` do smoke52p que escapasse do envelope não seria detectado pelo `PERSISTIU` (hoje nada persistiu: impressão digital de `vagas` igual antes/depois, medida pelo revisor). Proposta do revisor: chave estreita `vagas_estado` (contagem + md5 de `id`, `status`, `deleted_at` ordenado por `id`). Operador: atribuída ao plano novo 52-32 (abaixo), não consertada aqui.

## D-52-G7-1

d52_g7_1: confirmada

Vaga com `deleted_at` (e todo `status` não ativo) mostra título e departamento da própria candidatura viva. Operador:
«D-52-G7-1: confirmo».

## Residuais (Task 3, números da §Task 3 da FRONTEIRA)

residual_leitores_embed: plano-novo — 52-32, antes do 52-19: avaliacaoService.ts:118, redacaoService.ts:150 e exportacaoService.ts:1005, mesmo molde do 52-31 — leitura com guarda de posse e allowlist só dos campos que cada leitor usa; regenerar database.types.ts no mesmo plano.
residual_detalhe_vaga: aceitar — a mensagem da página pública é verdadeira; o card do painel é o que importa.
residual_departamento_nulo: backlog
db_types: aceitar — tipos regenerados no 52-32.

- **R1** (`residual_leitores_embed`): caso medido `f73682b6` (`avaliacao_assincrona`, vaga arquivada) vê «Nenhuma
  avaliação pendente» e nunca «Avaliações concluídas — aguardando a equipe»; redação por link direto → «Candidatura não
  encontrada»; 2 das 16 naturais com «Vaga não identificada» no bloco de currículos. → plano novo 52-32.
- **R2** (`residual_detalhe_vaga`): as 16 candidaturas vivas naturais de vaga não pública levam, ao tocar o cartão, a
  «Vaga não encontrada ou não está mais ativa» (`VagaDetalhePage.tsx:88-91`). → aceito como está.
- **R3** (`residual_departamento_nulo`): 4 vagas arquivadas sem departamento, com 11 das 16 candidaturas naturais;
  o cartão mostra «N/A». → backlog.
- **R4** (`db_types`): `database.types.ts` sem `ler_vagas_das_minhas_candidaturas`; cast estreito confinado a
  `lerVagasDasMinhasCandidaturas()` (D-52-G7-5). → aceito neste plano porque o 52-32 regenera os tipos (e retira o cast
  no mesmo commit).

## INFO (52-REVIEW-G7-1.md)

IN-01..IN-09: aceitas pelo operador («INFO: aceitar todos»).

## Janela única

janela_unica: confirmada
decidido_em: 2026-10-12 17:59 -03

Nenhuma outra janela publica — migration, EF ou push — até o fim do 52-31. Operador: «janela única: confirmo».

## Resposta do operador

Resposta escrita (Task 4, sobre o 52-REVIEW-G7-1, recebida 2026-10-12 17:59 -03 = 2026-10-12T20:59Z, verbatim):

```
janela única: confirmo + D-52-G7-1: confirmo + R1: plano-novo (52-32, antes do 52-19: avaliacaoService.ts:118, redacaoService.ts:150 e exportacaoService.ts:1005, mesmo molde do 52-31 — leitura com guarda de posse e allowlist só dos campos que cada leitor usa; regenerar database.types.ts no mesmo plano) + R2: aceitar (a mensagem da página pública é verdadeira; o card do painel é o que importa) + R3: backlog + R4: aceitar (tipos regenerados no 52-32) + WR-01: backlog + WR-02: entra no 52-32 (o capturar() precisa fotografar vagas antes do ensaio da limpeza no 52-20) + INFO: aceitar todos.
```

## Backlog

Para o orquestrador copiar aos «Pending Todos» do STATE.md (nenhum destes muda código neste plano):

1. **R3 — departamento nulo na própria vaga (52-31)** — o cartão do painel do candidato mostra «N/A» quando a vaga da
   candidatura não tem departamento, como já mostra para vaga ativa sem departamento. Medido em 2026-10-12: 4 vagas
   arquivadas sem departamento, com 11 das 16 candidaturas vivas naturais de vaga não pública (fixtures `fixture-p46-*`
   e a `a32fe930` de teste). Opção de conserto levantada: omitir a linha de departamento quando vazio (muda o cartão
   também para vaga ativa).
2. **WR-01 (52-REVIEW-G7-1)** — o POS-PORTAO da `20261011000006` varre `v.<coluna>` com
   `regexp_matches(v_cod, '\mv\.([a-z_]+)', 'g')`, sensível a caixa: `v.Titulo` / `v.TITULO` / `v."titulo"` passam pelo
   POS (provado: `mf4` `'departamento', v.Titulo` → POS passa, só o smoke (a) reprova pelo valor). Conserto proposto:
   `regexp_matches(lower(v_cod), '\mv\.("?)([a-z_]+)\1', 'g')` com `m[2]` — vale para a próxima migration que copiar o
   molde (a 0006 já está no ar; não se reaplica).

## Plano novo (52-32, antes do 52-19)

Para o próximo `/gsd-plan-phase 52 --gaps` (este plano NÃO muda; a ordem pedida é 52-32 antes do 52-19):

1. **R1 — leitores do embed `vaga:vagas` sob a RLS do candidato** — `avaliacaoService.ts:118`
   (`vaga:vagas ( testes_aplicaveis, aplica_cognitivo )` → nulo → cards vazios na página de avaliações e no painel),
   `redacaoService.ts:150` (`vaga:vagas!inner(testes_aplicaveis)` → a linha some → «Candidatura não encontrada») e
   `exportacaoService.ts:1005` (`vaga:vagas ( titulo )` → «Vaga não identificada» / `vagaTitulo: null`). Especificação
   do operador, verbatim: «mesmo molde do 52-31 — leitura com guarda de posse e allowlist só dos campos que cada leitor
   usa; regenerar database.types.ts no mesmo plano». Caso natural medido: `f73682b6`.
2. **WR-02 (52-REVIEW-G7-1)** — `capturar()` do `scripts/p52_ensaio.cjs` passa a fotografar `public.vagas` (chave
   estreita `vagas_estado`: contagem + md5 de `id`, `status`, `deleted_at` ordenado por `id`). Motivo do operador,
   verbatim: «o capturar() precisa fotografar vagas antes do ensaio da limpeza no 52-20».
3. **`database.types.ts` regenerado** (R4) — `npm run db:types < /dev/null` com a 0006 (e as RPCs do 52-32) no ar,
   empurrado pela via da fase; o cast estreito de `lerVagasDasMinhasCandidaturas()` (`candidaturasService.ts`) sai no
   mesmo commit (D-52-G7-5).

Consequência para a D-41 emendada (leitura do executor sobre o mecanismo, não decisão): se o 52-32 aplicar migration
nova, o `p52_backup.cjs` passa a ler o `aplicado_ate` DELE como o maior — o 52-19 espera um backup diário COMPLETED
posterior ao apply do 52-32, não ao da 0006.
