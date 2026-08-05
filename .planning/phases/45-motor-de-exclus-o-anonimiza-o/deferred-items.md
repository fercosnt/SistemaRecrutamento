# Phase 45 — itens diferidos (fora do escopo do plano que os encontrou)

> Append-only. Cada item nomeia o plano que o encontrou e o plano/fase que o fecha.

---

## Do plano 45-05 (ERASE-01 · bias k=5)

### DI-45-05-01 · A tela de auditoria de viés ainda lê o payload v1

**Encontrado em:** 45-05, Task 2.
**O quê:** `gerar_bias_snapshot` passa a emitir, no `dados jsonb`, células suprimidas **sem**
`applicants`/`selected`/`selection_rate`/`razao_4_5`/`flag`, e **sem** `n_total` quando existe
supressão primária. O consumidor vivo — `src/features/admin/bias-audit/` (`biasMath.ts`,
`biasAuditService.ts`, `BiasAuditPage.tsx`) — tipa `dados` como `AdverseImpactResult` e assume
todos esses campos presentes.

**Consequência se ninguém fechar:** depois do apply (45-11), a tela do administrador renderiza
`undefined` nas células suprimidas — e o modo de falha é o pior possível numa peça probatória:
**parece um zero**. Uma faixa escondida por k-anonimato exibida como "0 candidatos" afirma
exatamente o oposto do que a supressão quer dizer.

**Por que não foi feito aqui:** o 45-05 é SQL-only por desenho — sua própria `<verification>` diz
*"`npm run lint` inalterado (o plano não toca TypeScript)"*. Tocar `src/` aqui sairia do escopo
declarado e colidiria com os planos de UI da fase, que rodam em waves posteriores.

**Fecha em:** um plano de UI da Phase 45 (ou um 45-1x novo). O contrato de saída está escrito no
`COMMENT ON FUNCTION` da `20260805000003`, bloco (5), e as chaves novas estão enumeradas lá.
**Registrado também no `.planning/WINDOWS.md`** como `deviation`.

---

### DI-45-05-02 · `45-VALIDATION.md` roteia ERASE-01 para o smoke errado

**Encontrado em:** 45-05, Task 3.
**O quê:** as duas linhas de ERASE-01 do Per-Task Verification Map (`45-VALIDATION.md:60-61`)
apontam o comando automatizado para `supabase/tests/p45_motor_exclusao_smoke.sql`. O artefato que
o plano 45-05 mandou escrever — e que de fato contém as asserções de SC#5, k=5 e supressão
complementar — é `supabase/tests/p45_bias_k5_smoke.sql`.

**Consequência se ninguém fechar:** a verificação de fase roda o smoke apontado pelo mapa, não
encontra `K1`–`K9`, e marca ERASE-01 como coberto por um arquivo que não o cobre — ou o marca
como pendente tendo a prova pronta ao lado.

**Por que não foi feito aqui:** `45-VALIDATION.md` é artefato de fase, e
`p45_motor_exclusao_smoke.sql` estava sendo editado **concorrentemente** pelo plano 45-04 na mesma
árvore de trabalho. Editar qualquer um dos dois daqui seria escrever por cima de outro executor.

**Fecha em:** o verificador da fase (`/gsd-verify-work 45`) ou o 45-11, atualizando as duas linhas
do mapa para citar **os dois** arquivos.
